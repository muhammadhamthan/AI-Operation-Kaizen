/**
 * Mock: MD admin (§12) — sites, users, customer-MD site assignments.
 *
 * Persists additions/edits to AsyncStorage on top of the seed mocks so the
 * app behaves like a real backend within the session.
 *
 * TODO(backend):
 *   POST /api/v1/sites                          (MD)
 *   POST /api/v1/users                          (MD)
 *   GET  /api/v1/users                          (MD)
 *   POST /api/v1/customer-mds/:id/sites         (MD)
 *   Extend GET /api/v1/sites/analytics?customer_md_id=
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { users as seedUsers } from '../../mocks/users';
import { sites as seedSites } from '../../mocks/sites';

const K_SITES = 'kairox_admin_sites_v1';
const K_USERS = 'kairox_admin_users_v1';
const K_CMDMAP = 'kairox_admin_cmd_sites_v1';

let _warned = new Set();
const warn = (feat, ep) => {
  if (_warned.has(feat)) return;
  _warned.add(feat);
  // eslint-disable-next-line no-console
  console.warn(`[BACKEND-GAP] admin/${feat}: needs ${ep}`);
};

const readJson = async (k, fallback) => {
  try {
    const raw = await AsyncStorage.getItem(k);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};
const writeJson = async (k, v) => {
  try {
    await AsyncStorage.setItem(k, JSON.stringify(v));
  } catch {
    /* noop */
  }
};

/* ─────────────────── SITES ─────────────────── */

export const getAllSites = async () => {
  warn('sites/list', 'GET /api/v1/sites');
  const extra = await readJson(K_SITES, []);
  return [...seedSites, ...extra];
};

export const addSite = async ({ name, location, latitude, longitude, initial_budget }) => {
  warn('sites/create', 'POST /api/v1/sites');
  if (!name?.trim() || !location?.trim()) {
    return { success: false, error: 'Name and location are required.' };
  }
  const extra = await readJson(K_SITES, []);
  const nextId =
    Math.max(...seedSites.map((s) => s.id), ...extra.map((s) => s.id), 0) + 1;
  const site = {
    id: nextId,
    name: name.trim(),
    location: location.trim(),
    coordinates: {
      lat: parseFloat(latitude) || null,
      lon: parseFloat(longitude) || null,
    },
    initial_budget: parseInt(initial_budget, 10) || 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  await writeJson(K_SITES, [...extra, site]);
  return { success: true, site };
};

/* ─────────────────── USERS ─────────────────── */

export const getAllUsers = async () => {
  warn('users/list', 'GET /api/v1/users');
  const extra = await readJson(K_USERS, []);
  return [...seedUsers, ...extra];
};

export const addUser = async ({ name, phone, email, role, password, company, sites }) => {
  warn('users/create', 'POST /api/v1/users');
  if (!name?.trim() || !phone?.trim() || !role || !password?.trim()) {
    return { success: false, error: 'Name, phone, role and password are required.' };
  }
  if (!['supervisor', 'problem_solver', 'customer_md'].includes(role)) {
    return { success: false, error: 'Invalid role.' };
  }
  const extra = await readJson(K_USERS, []);
  const nextId =
    Math.max(...seedUsers.map((u) => u.id), ...extra.map((u) => u.id), 0) + 1;
  const user = {
    id: nextId,
    name: name.trim(),
    phone: phone.trim(),
    email: (email || '').trim(),
    role,
    username: phone.replace(/[^\d]/g, '').slice(-10) || `user${nextId}`,
    password,
    avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(
      name
    )}&background=64748b&color=fff&size=128`,
    ...(role === 'customer_md' ? { company: company || '', sites: sites || [] } : {}),
    ...(role === 'supervisor' ? { sites: sites || [] } : {}),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  await writeJson(K_USERS, [...extra, user]);
  return { success: true, user };
};

/* ─────────── CUSTOMER MD → SITES ASSIGNMENT ─────────── */

export const getCustomerMdSites = async (userId) => {
  warn('customer-mds/sites', 'GET /api/v1/customer-mds/:id/sites');
  const map = await readJson(K_CMDMAP, {});
  if (map[userId]) return map[userId];
  const seed = seedUsers.find((u) => u.id === userId);
  return seed?.sites || [];
};

export const setCustomerMdSites = async (userId, siteIds) => {
  warn('customer-mds/assign', 'POST /api/v1/customer-mds/:id/sites');
  const map = await readJson(K_CMDMAP, {});
  map[userId] = [...new Set(siteIds || [])];
  await writeJson(K_CMDMAP, map);
  return { success: true, sites: map[userId] };
};
