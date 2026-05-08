/**
 * ProjectFlow Intelligence (per-site) — mock service.
 *
 * Wraps + extends the existing projectTimelineMockService to add:
 *   - materials (with vendor linkage + arrival status)
 *   - vendors (with confirmation + dispatch + follow-up)
 *   - flow map (nodes + edges across approval / vendor / material / stage)
 *   - environmental adjustment (weather)
 *   - execution intelligence alerts
 *   - health score + recalibration timestamp
 *
 * Persists adjustments + alerts to AsyncStorage (key per site_id) so MD edits
 * during a session feel real.
 *
 * TODO(backend):
 *   GET   /api/v1/sites/:id/projectflow         (whole bundle)
 *   POST  /api/v1/sites/:id/materials
 *   PATCH /api/v1/sites/:id/materials/:mid
 *   POST  /api/v1/sites/:id/vendors/:vid/follow-up
 *   POST  /api/v1/sites/:id/projectflow/recalibrate    (manual trigger)
 *   GET   /api/v1/sites/:id/weather/forecast            (proxy to weather API)
 *   AI-driven alert generator for "timeline drift corrected", etc.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getTimeline,
  updateTask as updateTimelineTask,
} from './projectTimelineMockService';
import { sites as seedSites } from '../../mocks/sites';
import { users as seedUsers } from '../../mocks/users';

const K = 'kairox_projectflow_v1';

let _warned = false;
const warn = () => {
  if (_warned) return;
  _warned = true;
  // eslint-disable-next-line no-console
  console.warn(
    '[BACKEND-GAP] sites/:id/projectflow: needs GET /api/v1/sites/:id/projectflow + materials/vendors/weather/alert sub-endpoints'
  );
};

const DAY_MS = 86400000;
const iso = (d) => new Date(d).toISOString().slice(0, 10);
const addDays = (d, days) => new Date(new Date(d).getTime() + days * DAY_MS);
const nowIso = () => new Date().toISOString();

const readStore = async () => {
  try {
    const raw = await AsyncStorage.getItem(K);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};
const writeStore = async (s) => {
  try {
    await AsyncStorage.setItem(K, JSON.stringify(s));
  } catch {
    /* noop */
  }
};

/* ────────────────── Seeds ────────────────── */

// 4 vendors that round-robin per site for deterministic variety
const VENDOR_POOL = [
  { name: 'Sterling Steel Co.', contact: '+91 98400 11221', goods: ['Rebar 12mm', 'Structural beams'] },
  { name: 'Coastal Cement Ltd', contact: '+91 98400 22332', goods: ['OPC 53 cement', 'Concrete mix'] },
  { name: 'BluePulse Electricals', contact: '+91 98400 33443', goods: ['Wiring conduit', 'LED panels', 'DBs'] },
  { name: 'Aqua-Flow Plumbing', contact: '+91 98400 44554', goods: ['PVC piping', 'Fixtures', 'Pumps'] },
];

const PHASE_MATERIALS = {
  'Site survey & safety audit': [
    { name: 'Site survey kit', qty: 1, unit: 'set', vendorIdx: 0 },
  ],
  'Foundation & groundworks': [
    { name: 'OPC 53 cement', qty: 80, unit: 'bags', vendorIdx: 1 },
    { name: 'Rebar 12mm', qty: 1200, unit: 'kg', vendorIdx: 0 },
  ],
  'Structural framing': [
    { name: 'Structural beams', qty: 18, unit: 'units', vendorIdx: 0 },
    { name: 'Concrete mix', qty: 24, unit: 'm³', vendorIdx: 1 },
  ],
  'Electrical rough-in': [
    { name: 'Wiring conduit', qty: 600, unit: 'm', vendorIdx: 2 },
    { name: 'Distribution boards', qty: 4, unit: 'units', vendorIdx: 2 },
  ],
  'HVAC installation': [
    { name: 'AHU units', qty: 2, unit: 'units', vendorIdx: 2 },
  ],
  'Plumbing & fixtures': [
    { name: 'PVC piping', qty: 220, unit: 'm', vendorIdx: 3 },
    { name: 'Sanitary fixtures', qty: 12, unit: 'sets', vendorIdx: 3 },
  ],
  'Interior finish & painting': [
    { name: 'Interior paint', qty: 35, unit: 'L', vendorIdx: 1 },
  ],
  'Handover & commissioning': [
    { name: 'Test & commissioning kit', qty: 1, unit: 'set', vendorIdx: 2 },
  ],
};

const WEATHER_SCENARIOS = [
  {
    forecast: 'Heavy rain forecast Tue–Wed, 80mm expected',
    impact: 'Foundation pour postponed by 1 day',
    recalibrated: true,
  },
  {
    forecast: 'Clear skies through the week',
    impact: 'No environmental adjustment needed',
    recalibrated: false,
  },
  {
    forecast: 'Cyclone watch — high winds Friday',
    impact: 'Crane operations rescheduled to Saturday',
    recalibrated: true,
  },
];

/* ────────────────── Builder ────────────────── */

const buildBundle = (site, timeline) => {
  const stages = timeline.tasks;

  // Vendors — 4 per site, rotation
  const vendors = VENDOR_POOL.map((v, i) => {
    const linked = [];
    return {
      id: `v${site.id}-${i + 1}`,
      name: v.name,
      contact: v.contact,
      goods: v.goods,
      // Status mix for visual variety
      status:
        i === 0 ? 'confirmed'
        : i === 1 ? (site.id % 2 === 0 ? 'delayed' : 'confirmed')
        : i === 2 ? 'follow_up_sent'
        : 'pending',
      dispatch_eta: iso(addDays(new Date(), 3 + i * 2)),
      last_contact_at: nowIso(),
      delay_days: i === 1 && site.id % 2 === 0 ? 2 : 0,
      follow_ups: i === 2 ? [{ at: nowIso(), channel: 'whatsapp' }] : [],
      linked_materials: linked,
    };
  });

  // Materials per stage
  let materials = [];
  let mid = 1;
  stages.forEach((stage) => {
    const list = PHASE_MATERIALS[stage.name] || [];
    list.forEach((m) => {
      // Expected arrival = 2 days before stage start
      const expected = iso(addDays(stage.start_date, -2));
      const today = new Date();
      const expDate = new Date(expected);

      let status;
      if (expDate < today) {
        status = stage.status === 'completed' || stage.status === 'in_progress' ? 'arrived' : 'delayed';
      } else if (vendors[m.vendorIdx].status === 'delayed') {
        status = 'delayed';
      } else if (vendors[m.vendorIdx].status === 'follow_up_sent') {
        status = 'in_transit';
      } else {
        status = 'on_time';
      }

      const matId = `m${site.id}-${mid++}`;
      materials.push({
        id: matId,
        name: m.name,
        qty: m.qty,
        unit: m.unit,
        vendor_id: vendors[m.vendorIdx].id,
        vendor_name: vendors[m.vendorIdx].name,
        expected_arrival: expected,
        actual_arrival: status === 'arrived' ? expected : null,
        status,
        linked_stage_id: stage.id,
        linked_stage_name: stage.name,
        recalibration_triggered: status === 'delayed',
      });
      vendors[m.vendorIdx].linked_materials.push(matId);
    });
  });

  // Flow map: 4 lanes — Approval → Vendor → Material → Stage
  // Approvals (1 per ~3 stages)
  const approvals = [
    { id: `ap${site.id}-1`, label: 'Project Charter', status: 'aligned' },
    { id: `ap${site.id}-2`, label: 'Phase Gate Review', status: 'at_risk' },
    { id: `ap${site.id}-3`, label: 'Final Sign-off', status: 'aligned' },
  ];

  const flowStatus = (s) => {
    if (s === 'completed' || s === 'in_progress' || s === 'aligned' || s === 'confirmed' || s === 'arrived' || s === 'on_time') return 'aligned';
    if (s === 'delayed') return 'delayed';
    if (s === 'at_risk' || s === 'in_transit' || s === 'pending' || s === 'follow_up_sent' || s === 'not_started') return 'at_risk';
    return 'aligned';
  };

  const nodes = [
    ...approvals.map((a, i) => ({
      id: a.id,
      type: 'approval',
      label: a.label,
      status: a.status,
      lane: 0,
      lane_index: i,
    })),
    ...vendors.map((v, i) => ({
      id: v.id,
      type: 'vendor',
      label: v.name.split(' ')[0],
      sub_label: v.name,
      status: flowStatus(v.status),
      lane: 1,
      lane_index: i,
    })),
    ...materials.slice(0, 6).map((m, i) => ({
      id: m.id,
      type: 'material',
      label: m.name,
      status: flowStatus(m.status),
      lane: 2,
      lane_index: i,
    })),
    ...stages.slice(0, 8).map((s, i) => ({
      id: s.id,
      type: 'stage',
      label: s.name,
      status: flowStatus(s.status),
      lane: 3,
      lane_index: i,
    })),
  ];

  // Edges: approval → vendors (gate), vendor → its materials, material → linked stage
  const edges = [];
  // approval[0] → all vendors
  vendors.forEach((v) => edges.push({ from: approvals[0].id, to: v.id }));
  // vendor → materials it supplies (limit to first 6 mats already in nodes)
  materials.slice(0, 6).forEach((m) => edges.push({ from: m.vendor_id, to: m.id }));
  // material → linked stage
  materials.slice(0, 6).forEach((m) => edges.push({ from: m.id, to: m.linked_stage_id }));
  // approval[1] gate before structural framing
  if (stages[2]) edges.push({ from: approvals[1].id, to: stages[2].id });
  // approval[2] before handover
  if (stages[7]) edges.push({ from: approvals[2].id, to: stages[7].id });

  // Weather
  const weather = {
    ...WEATHER_SCENARIOS[site.id % WEATHER_SCENARIOS.length],
    last_check: nowIso(),
  };

  // Alerts
  const alerts = [];
  let aId = 1;
  const pushAlert = (severity, kind, text) =>
    alerts.push({
      id: `al${site.id}-${aId++}`,
      severity,
      kind,
      text,
      at: nowIso(),
      resolved: false,
    });

  if (materials.some((m) => m.status === 'delayed')) {
    const m = materials.find((x) => x.status === 'delayed');
    pushAlert(
      'critical',
      'material_dependency',
      `Material dependency mismatch detected — ${m.name} delayed for "${m.linked_stage_name}".`
    );
  }
  if (vendors.some((v) => v.status === 'delayed')) {
    const v = vendors.find((x) => x.status === 'delayed');
    pushAlert(
      'warning',
      'vendor_delay',
      `Vendor dispatch delay risk — ${v.name} reports +${v.delay_days}d slip.`
    );
  }
  if (weather.recalibrated) {
    pushAlert('info', 'environmental', `${weather.forecast} → ${weather.impact}.`);
  }
  pushAlert('info', 'continuity_restored', 'Execution continuity restored after Foundation phase rebalance.');
  if (stages.some((s) => s.status === 'delayed')) {
    pushAlert('info', 'timeline_drift_corrected', 'Timeline drift corrected automatically across 3 downstream tasks.');
  }

  // Health score
  const total = stages.length + materials.length + vendors.length;
  const aligned =
    stages.filter((s) => s.status === 'completed' || s.status === 'in_progress').length +
    materials.filter((m) => ['arrived', 'on_time'].includes(m.status)).length +
    vendors.filter((v) => v.status === 'confirmed').length;
  const health_score = Math.round((aligned / total) * 100);

  let health_label = 'On track';
  if (health_score < 55) health_label = 'Delayed';
  else if (health_score < 75) health_label = 'At risk';

  // Stages — stitch supervisor name for cleaner UI
  const supervisorById = new Map(seedUsers.map((u) => [u.id, u.name]));
  const stagesEnriched = stages.map((s) => ({
    ...s,
    assigned_to_supervisor_name: supervisorById.get(s.assigned_to_supervisor_id) || null,
  }));

  return {
    site_id: site.id,
    site_name: site.name,
    contract_start_date: timeline.contract_start_date,
    contract_end_date: timeline.contract_end_date,
    health_score,
    health_label,
    recalibrated_at: nowIso(),
    timeline: {
      contract_start_date: timeline.contract_start_date,
      contract_end_date: timeline.contract_end_date,
      stages: stagesEnriched,
    },
    flow_map: { nodes, edges },
    materials,
    vendors,
    weather,
    alerts,
  };
};

/* ────────────────── Public API ────────────────── */

export const getProjectFlow = async (siteId) => {
  warn();
  const site = seedSites.find((s) => s.id === siteId);
  if (!site) return null;
  const timeline = await getTimeline(siteId);
  if (!timeline) return null;

  // Persist alerts/dismissals between calls
  const store = await readStore();
  const persisted = store[siteId] || { dismissed_alert_ids: [], extra_alerts: [] };

  const bundle = buildBundle(site, timeline);
  bundle.alerts = [
    ...persisted.extra_alerts,
    ...bundle.alerts,
  ].filter((a) => !persisted.dismissed_alert_ids.includes(a.id));

  return bundle;
};

/**
 * MD-side timeline edit. Wraps the existing cascade engine and additionally:
 *   - inserts an "intelligence" alert
 *   - bumps recalibrated_at
 */
export const updateStage = async (siteId, taskId, patch) => {
  warn();
  const res = await updateTimelineTask(siteId, taskId, patch);
  const store = await readStore();
  const persisted = store[siteId] || { dismissed_alert_ids: [], extra_alerts: [] };
  if (res.affected.length > 0) {
    persisted.extra_alerts.unshift({
      id: `al${siteId}-rt-${Date.now()}`,
      severity: 'info',
      kind: 'timeline_drift_corrected',
      text: `Timeline drift corrected automatically — ${res.affected.length} downstream task(s) recalibrated.`,
      at: nowIso(),
      resolved: false,
    });
    store[siteId] = persisted;
    await writeStore(store);
  }
  return res;
};

export const sendVendorFollowUp = async (siteId, vendorId) => {
  warn();
  const store = await readStore();
  const persisted = store[siteId] || { dismissed_alert_ids: [], extra_alerts: [] };
  persisted.extra_alerts.unshift({
    id: `al${siteId}-fu-${Date.now()}`,
    severity: 'info',
    kind: 'vendor_followup_sent',
    text: `Follow-up automation triggered for vendor ${vendorId}.`,
    at: nowIso(),
    resolved: false,
  });
  store[siteId] = persisted;
  await writeStore(store);
  return { success: true };
};

export const dismissAlert = async (siteId, alertId) => {
  warn();
  const store = await readStore();
  const persisted = store[siteId] || { dismissed_alert_ids: [], extra_alerts: [] };
  if (!persisted.dismissed_alert_ids.includes(alertId)) {
    persisted.dismissed_alert_ids.push(alertId);
  }
  store[siteId] = persisted;
  await writeStore(store);
  return { success: true };
};

export const recalibrateProjectFlow = async (siteId) => {
  warn();
  const store = await readStore();
  const persisted = store[siteId] || { dismissed_alert_ids: [], extra_alerts: [] };
  persisted.extra_alerts.unshift({
    id: `al${siteId}-rc-${Date.now()}`,
    severity: 'info',
    kind: 'timeline_drift_corrected',
    text: 'Execution timeline recalibrated.',
    at: nowIso(),
    resolved: false,
  });
  store[siteId] = persisted;
  await writeStore(store);
  return { success: true };
};
