/**
 * Mock: photo timeline service (Kairox §16).
 *
 * Every issue has photos captured at three lifecycle phases:
 *   - BEFORE  (raised by Supervisor when creating the issue)
 *   - DURING  (uploaded by Problem Solver while working)
 *   - AFTER   (uploaded by Problem Solver when marking complete)
 *
 * Real backend will return this structure on GET /api/v1/issues/:id/photos.
 * Until then, we persist to AsyncStorage so uploaded mock photos survive
 * reloads during demos.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'kairox:mock:photos:v1';
let _warned = false;
const warn = () => {
  if (_warned) return;
  _warned = true;
  // eslint-disable-next-line no-console
  console.warn(
    '[BACKEND-GAP] photos/timeline: needs GET/POST /api/v1/issues/:id/photos ' +
      '(payload: {phase: before|during|after, uri, uploaded_by, timestamp})'
  );
};

export const PHASE = {
  BEFORE: 'before',
  DURING: 'during',
  AFTER: 'after',
};

export const PHASE_META = {
  before: { label: 'Before', color: '#6b7280', icon: 'camera-outline' },
  during: { label: 'During', color: '#f59e0b', icon: 'construct-outline' },
  after: { label: 'After', color: '#10a37f', icon: 'checkmark-done-outline' },
};

const loadAll = async () => {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};
const saveAll = async (s) => {
  try { await AsyncStorage.setItem(KEY, JSON.stringify(s)); } catch { /* noop */ }
};

// Seed a couple of photos per issue on first read so demos look lived-in.
const SEED = {
  before: [
    { uri: 'https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?w=600', uploaded_by: 'Supervisor', ts: '2025-10-01T09:10:00Z' },
  ],
  during: [
    { uri: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=600', uploaded_by: 'Problem Solver', ts: '2025-10-01T13:22:00Z' },
  ],
  after: [],
};

/** GET photos for an issue, keyed by phase. */
export const getPhotos = async (issueId) => {
  warn();
  // TODO(backend): GET /api/v1/issues/:id/photos?group_by=phase
  const all = await loadAll();
  const id = String(issueId);
  if (!all[id]) {
    all[id] = JSON.parse(JSON.stringify(SEED));
    await saveAll(all);
  }
  return all[id];
};

/** Add one photo to a phase bucket. */
export const addPhoto = async (issueId, phase, uri, uploader) => {
  warn();
  // TODO(backend): POST /api/v1/issues/:id/photos  body: {phase, uri}
  if (!Object.values(PHASE).includes(phase)) {
    throw new Error(`Unknown phase: ${phase}`);
  }
  const all = await loadAll();
  const id = String(issueId);
  if (!all[id]) all[id] = JSON.parse(JSON.stringify(SEED));
  all[id][phase] = [
    ...(all[id][phase] || []),
    { uri, uploaded_by: uploader || 'Unknown', ts: new Date().toISOString() },
  ];
  await saveAll(all);
  return all[id];
};

/** Flatten phase buckets into a single array (useful for counts). */
export const flattenPhotos = (grouped) => {
  if (!grouped) return [];
  return [
    ...(grouped.before || []).map((p) => ({ ...p, phase: 'before' })),
    ...(grouped.during || []).map((p) => ({ ...p, phase: 'during' })),
    ...(grouped.after || []).map((p) => ({ ...p, phase: 'after' })),
  ];
};
