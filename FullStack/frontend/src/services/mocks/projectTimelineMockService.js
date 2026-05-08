/**
 * Mock: Project Timeline Tracker (§17) — Gantt data with cascade delays.
 *
 * Seeds a believable contract + 6-8 task chain per site, with a few
 * dependency links. Exposes:
 *   getTimeline(siteId)
 *   updateTask(siteId, taskId, patch)  → triggers cascade
 *
 * TODO(backend):
 *   GET    /api/v1/sites/:id/timeline
 *   POST   /api/v1/sites/:id/tasks
 *   PATCH  /api/v1/sites/:id/tasks/:taskId   (cascade on end_date change)
 *   DELETE /api/v1/sites/:id/tasks/:taskId
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { sites as seedSites } from '../../mocks/sites';

const K = 'kairox_timeline_v1';

let _warned = false;
const warn = () => {
  if (_warned) return;
  _warned = true;
  // eslint-disable-next-line no-console
  console.warn(
    '[BACKEND-GAP] sites/:id/timeline: needs GET/POST/PATCH/DELETE /api/v1/sites/:id/timeline|tasks'
  );
};

const DAY_MS = 86400000;
const iso = (d) => new Date(d).toISOString().slice(0, 10);
const addDays = (d, days) => new Date(new Date(d).getTime() + days * DAY_MS);
const daysBetween = (a, b) =>
  Math.round((new Date(b).getTime() - new Date(a).getTime()) / DAY_MS);

/**
 * Seed generator — deterministic per site so demo data is predictable.
 */
const seedForSite = (site) => {
  // Anchor contract around now - 45 days → now + 105 days
  const start = addDays(new Date(), -45);
  const end = addDays(start, 150);

  // Supervisors: we don't import users here to keep coupling low.
  // Just use a supervisor_id from a deterministic rotation.
  const supervisors = [1, 2, 3];
  const pickSup = (i) => supervisors[i % supervisors.length];

  const chain = [
    { name: 'Site survey & safety audit', len: 10, sup: pickSup(0) },
    { name: 'Foundation & groundworks', len: 25, sup: pickSup(1), dep: 0 },
    { name: 'Structural framing', len: 30, sup: pickSup(1), dep: 1 },
    { name: 'Electrical rough-in', len: 20, sup: pickSup(2), dep: 2 },
    { name: 'HVAC installation', len: 22, sup: pickSup(0), dep: 2 },
    { name: 'Plumbing & fixtures', len: 18, sup: pickSup(1), dep: 3 },
    { name: 'Interior finish & painting', len: 15, sup: pickSup(2), dep: 4 },
    { name: 'Handover & commissioning', len: 8, sup: pickSup(0), dep: 6 },
  ];

  let cursor = new Date(start);
  const tasks = chain.map((c, i) => {
    const s = new Date(cursor);
    const e = addDays(s, c.len);
    cursor = e;
    // Deterministic status by position + site id to spread tones
    let status = 'not_started';
    if (i === 0) status = 'completed';
    else if (i === 1) status = 'completed';
    else if (i === 2 && site.id % 2 === 0) status = 'delayed';
    else if (i === 2) status = 'in_progress';
    else if (i === 3 && site.id % 3 === 0) status = 'delayed';
    return {
      id: `t${site.id}-${i + 1}`,
      site_id: site.id,
      name: c.name,
      start_date: iso(s),
      end_date: iso(e),
      assigned_to_supervisor_id: c.sup,
      status,
      depends_on_task_id: c.dep != null ? `t${site.id}-${c.dep + 1}` : null,
    };
  });

  return {
    site_id: site.id,
    contract_start_date: iso(start),
    contract_end_date: iso(end),
    tasks,
  };
};

const readStore = async () => {
  try {
    const raw = await AsyncStorage.getItem(K);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};
const writeStore = async (store) => {
  try {
    await AsyncStorage.setItem(K, JSON.stringify(store));
  } catch {
    /* noop */
  }
};

export const getTimeline = async (siteId) => {
  warn();
  const store = await readStore();
  if (store[siteId]) return store[siteId];
  const site = seedSites.find((s) => s.id === siteId);
  if (!site) return null;
  const seed = seedForSite(site);
  store[siteId] = seed;
  await writeStore(store);
  return seed;
};

/**
 * Cascade dependents: for every task that depends on `triggerId`,
 * shift its start/end by the same delta the trigger moved.
 * Recursively applies.
 */
const cascade = (tasks, triggerId, deltaDays) => {
  const affected = [];
  const stack = [triggerId];
  const seen = new Set();
  while (stack.length) {
    const cur = stack.pop();
    for (const t of tasks) {
      if (t.depends_on_task_id === cur && !seen.has(t.id)) {
        seen.add(t.id);
        t.start_date = iso(addDays(t.start_date, deltaDays));
        t.end_date = iso(addDays(t.end_date, deltaDays));
        if (deltaDays > 0 && t.status === 'not_started') t.status = 'delayed';
        affected.push(t.id);
        stack.push(t.id);
      }
    }
  }
  return affected;
};

/**
 * Update a task. If end_date moves later, cascade the shift to dependents.
 * Returns { timeline, affected: [taskIds...] }
 */
export const updateTask = async (siteId, taskId, patch = {}) => {
  warn();
  const store = await readStore();
  const tl = store[siteId] || (await getTimeline(siteId));
  const idx = tl.tasks.findIndex((t) => t.id === taskId);
  if (idx === -1) return { timeline: tl, affected: [] };

  const prev = { ...tl.tasks[idx] };
  const next = { ...prev, ...patch };

  // Compute shift based on end_date change (positive = later)
  const deltaEnd = patch.end_date ? daysBetween(prev.end_date, patch.end_date) : 0;

  // If start shifted forward, shift end by same amount (preserve duration) unless explicitly overridden.
  if (patch.start_date && !patch.end_date) {
    const deltaStart = daysBetween(prev.start_date, patch.start_date);
    next.end_date = iso(addDays(prev.end_date, deltaStart));
  }

  tl.tasks[idx] = next;

  let affected = [];
  if (deltaEnd > 0) {
    affected = cascade(tl.tasks, taskId, deltaEnd);
    // Update contract end if the final task now extends past it
    const lastEnd = tl.tasks.reduce(
      (acc, t) => (new Date(t.end_date) > new Date(acc) ? t.end_date : acc),
      tl.contract_end_date
    );
    if (new Date(lastEnd) > new Date(tl.contract_end_date)) {
      tl.contract_end_date = lastEnd;
    }
  }

  store[siteId] = tl;
  await writeStore(store);
  return { timeline: tl, affected };
};

export const resetTimeline = async (siteId) => {
  warn();
  const store = await readStore();
  delete store[siteId];
  await writeStore(store);
  return getTimeline(siteId);
};
