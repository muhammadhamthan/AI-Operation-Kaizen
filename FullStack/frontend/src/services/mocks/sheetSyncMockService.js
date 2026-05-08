/**
 * Mock: Google Sheets live sync (§13 — frontend slice only).
 *
 * Simulates connect → syncing → synced state transitions so the
 * SyncStatusPill + GoogleSheetsSettingsScreen can be exercised without
 * the real Google Sheets API v4 backend.
 *
 * TODO(backend):
 *   POST /api/v1/integrations/google-sheets/connect
 *   GET  /api/v1/integrations/google-sheets/status
 *   POST /api/v1/integrations/google-sheets/disconnect
 *   + Full Sheets webhook + cell-diff + incremental sync worker
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const K = 'kairox_sheets_sync_v1';

let _warned = false;
const warn = () => {
  if (_warned) return;
  _warned = true;
  // eslint-disable-next-line no-console
  console.warn(
    '[BACKEND-GAP] integrations/google-sheets: needs POST/GET/POST /api/v1/integrations/google-sheets/{connect,status,disconnect}'
  );
};

const defaultState = {
  connected: false,
  sheet_name: null,
  last_synced_at: null,
  record_count: 0,
  last_error: null,
  state: 'idle', // 'idle' | 'syncing' | 'synced' | 'error'
};

const read = async () => {
  try {
    const raw = await AsyncStorage.getItem(K);
    return raw ? { ...defaultState, ...JSON.parse(raw) } : { ...defaultState };
  } catch {
    return { ...defaultState };
  }
};
const write = async (s) => {
  try {
    await AsyncStorage.setItem(K, JSON.stringify(s));
  } catch {
    /* noop */
  }
};

export const getSheetsStatus = async () => {
  warn();
  const s = await read();
  // Simulate freshness decay — if connected and last sync was > 45s ago, re-enter 'syncing'
  if (s.connected && s.last_synced_at) {
    const ageSec = (Date.now() - new Date(s.last_synced_at).getTime()) / 1000;
    if (ageSec > 45) {
      s.state = 'syncing';
    }
  }
  return s;
};

export const connectSheets = async () => {
  warn();
  // Simulate OAuth hop
  await new Promise((r) => setTimeout(r, 900));
  const s = {
    connected: true,
    sheet_name: 'Kairox Ops — Issues & Budgets (Live)',
    last_synced_at: new Date().toISOString(),
    record_count: 12486,
    last_error: null,
    state: 'synced',
  };
  await write(s);
  return s;
};

export const disconnectSheets = async () => {
  warn();
  await new Promise((r) => setTimeout(r, 350));
  const s = { ...defaultState };
  await write(s);
  return s;
};

export const triggerManualSync = async () => {
  warn();
  const s = await read();
  if (!s.connected) return s;
  s.state = 'syncing';
  await write(s);
  await new Promise((r) => setTimeout(r, 1100));
  s.state = 'synced';
  s.last_synced_at = new Date().toISOString();
  s.record_count = s.record_count + Math.floor(Math.random() * 4);
  await write(s);
  return s;
};

export const simulateError = async (msg = 'Sheet access revoked by owner') => {
  warn();
  const s = await read();
  s.state = 'error';
  s.last_error = msg;
  await write(s);
  return s;
};
