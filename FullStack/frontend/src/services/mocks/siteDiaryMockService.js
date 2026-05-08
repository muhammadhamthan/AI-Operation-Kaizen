/**
 * Mock: digital site diary service (Kairox §15).
 *
 * Problem Solvers log a daily diary entry through the chatbot (or the diary
 * screen). Each entry captures work done, issues noted, weather/safety, and
 * optional photos. MD / Supervisor can browse read-only.
 *
 * TODO(backend): CRUD /api/v1/sites/:id/diary/entries
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'kairox:mock:siteDiary:v1';
let _warned = false;
const warn = () => {
  if (_warned) return;
  _warned = true;
  // eslint-disable-next-line no-console
  console.warn(
    '[BACKEND-GAP] site/diary: needs CRUD /api/v1/sites/:id/diary/entries'
  );
};

const SEED = [
  {
    id: 'diary-1',
    site_id: 1,
    site_name: 'Vepery Industrial Complex',
    author: { id: 6, name: 'Suresh Babu', role: 'problem_solver' },
    date: '2026-04-22',
    work_done: 'Replaced sensor in lift #3, patched water seepage on floor 2.',
    issues_noted: 'Rope check still pending — awaiting MD budget approval.',
    weather: 'Sunny · 34\u00B0C',
    safety_incidents: 'None',
    created_at: '2026-04-22T17:30:00Z',
  },
  {
    id: 'diary-2',
    site_id: 1,
    site_name: 'Vepery Industrial Complex',
    author: { id: 6, name: 'Suresh Babu', role: 'problem_solver' },
    date: '2026-04-21',
    work_done: 'AC unit tripping resolved — replaced contactor MCCB.',
    issues_noted: 'Lift #2 rope still showing wear.',
    weather: 'Cloudy · 29\u00B0C',
    safety_incidents: 'None',
    created_at: '2026-04-21T18:10:00Z',
  },
  {
    id: 'diary-3',
    site_id: 2,
    site_name: 'Ambattur Manufacturing Unit',
    author: { id: 7, name: 'Karthik Rajan', role: 'problem_solver' },
    date: '2026-04-22',
    work_done: 'Replaced 6 ionisation sensors in Zone C, tested fire panel.',
    issues_noted: 'Remaining 6 sensors scheduled for tomorrow.',
    weather: 'Sunny · 36\u00B0C',
    safety_incidents: 'None',
    created_at: '2026-04-22T16:45:00Z',
  },
];

const load = async () => {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) {
      await AsyncStorage.setItem(KEY, JSON.stringify(SEED));
      return [...SEED];
    }
    return JSON.parse(raw);
  } catch { return [...SEED]; }
};
const save = async (s) => {
  try { await AsyncStorage.setItem(KEY, JSON.stringify(s)); } catch { /* noop */ }
};

export const getDiaryEntries = async (filters = {}) => {
  warn();
  const all = await load();
  let list = [...all].sort((a, b) => (a.date < b.date ? 1 : -1));
  if (filters.site_id != null) {
    list = list.filter((e) => e.site_id === filters.site_id);
  }
  if (filters.author_id != null) {
    list = list.filter((e) => e.author?.id === filters.author_id);
  }
  if (filters.customer_md_sites) {
    list = list.filter((e) => filters.customer_md_sites.includes(e.site_id));
  }
  return list;
};

export const addDiaryEntry = async (author, payload) => {
  warn();
  // TODO(backend): POST /api/v1/sites/:id/diary/entries
  if (!payload?.site_id || !payload?.work_done) {
    return { success: false, error: 'Site + work_done required' };
  }
  await new Promise((r) => setTimeout(r, 200));
  const all = await load();
  const entry = {
    id: `diary-${Date.now()}`,
    site_id: payload.site_id,
    site_name: payload.site_name || `Site ${payload.site_id}`,
    author: { id: author.id, name: author.name, role: author.role },
    date: payload.date || new Date().toISOString().slice(0, 10),
    work_done: payload.work_done.trim(),
    issues_noted: (payload.issues_noted || '').trim(),
    weather: payload.weather || '',
    safety_incidents: payload.safety_incidents || 'None',
    created_at: new Date().toISOString(),
  };
  all.unshift(entry);
  await save(all);
  return { success: true, entry };
};
