/**
 * Mock: budget requests service (Kairox §11 — used in Priority 4 fully, but
 * Priority 1+2 needs some data so the Budget destination card / screen
 * render with realistic numbers).
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'kairox:mock:budgets:v1';
let _warned = false;
const warn = () => {
  if (_warned) return;
  _warned = true;
  // eslint-disable-next-line no-console
  console.warn(
    '[BACKEND-GAP] budget/requests: needs CRUD /api/v1/budget/requests'
  );
};

const SEED_BUDGETS = [
  {
    id: 'bud-001',
    title: 'Emergency lift rope replacement',
    site_id: 1,
    site_name: 'Vepery Industrial Complex',
    raised_by: { id: 1, name: 'Rajesh Kumar', role: 'supervisor' },
    amount: 145000,
    currency: 'INR',
    reason: 'Steel rope on lift #2 is frayed beyond threshold; safety risk.',
    status: 'pending_md',
    created_at: '2026-04-20T08:30:00Z',
    updated_at: '2026-04-20T08:30:00Z',
  },
  {
    id: 'bud-002',
    title: 'Fire sensor replacement (Zone C)',
    site_id: 2,
    site_name: 'Ambattur Manufacturing Unit',
    raised_by: { id: 1, name: 'Rajesh Kumar', role: 'supervisor' },
    amount: 62000,
    currency: 'INR',
    reason: 'All 12 ionisation sensors in Zone C have reached EOL.',
    status: 'approved',
    md_decision_at: '2026-04-19T16:10:00Z',
    md_decided_by: { id: 4, name: 'Vikram Singh' },
    created_at: '2026-04-18T10:00:00Z',
    updated_at: '2026-04-19T16:10:00Z',
  },
  {
    id: 'bud-003',
    title: 'AC compressor overhaul, tower 2',
    site_id: 2,
    site_name: 'Ambattur Manufacturing Unit',
    raised_by: { id: 2, name: 'Priya Sharma', role: 'supervisor' },
    amount: 320000,
    currency: 'INR',
    reason: 'Compressor failing under peak load; third incident this quarter.',
    status: 'escalated_customer_md',
    created_at: '2026-04-17T11:20:00Z',
    updated_at: '2026-04-18T09:00:00Z',
  },
  {
    id: 'bud-004',
    title: 'Weekly plumbing consumables',
    site_id: 3,
    site_name: 'Guindy Tech Park',
    raised_by: { id: 3, name: 'Arun Patel', role: 'supervisor' },
    amount: 8500,
    currency: 'INR',
    reason: 'Recurring weekly consumables top-up.',
    status: 'approved',
    md_decision_at: '2026-04-21T09:00:00Z',
    md_decided_by: { id: 4, name: 'Vikram Singh' },
    created_at: '2026-04-21T08:30:00Z',
    updated_at: '2026-04-21T09:00:00Z',
  },
  {
    id: 'bud-005',
    title: 'CCTV upgrade to 4K — gate area',
    site_id: 1,
    site_name: 'Vepery Industrial Complex',
    raised_by: { id: 1, name: 'Rajesh Kumar', role: 'supervisor' },
    amount: 210000,
    currency: 'INR',
    reason: 'Existing 1080p cams insufficient for night-time number-plate capture.',
    status: 'rejected',
    md_decision_at: '2026-04-16T10:00:00Z',
    md_decided_by: { id: 4, name: 'Vikram Singh' },
    rejection_note: 'Defer to next fiscal. Existing cameras still under warranty.',
    created_at: '2026-04-15T09:00:00Z',
    updated_at: '2026-04-16T10:00:00Z',
  },
];

const ensureSeed = async () => {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) {
    await AsyncStorage.setItem(KEY, JSON.stringify(SEED_BUDGETS));
    return SEED_BUDGETS;
  }
  return JSON.parse(raw);
};

/**
 * Fetch budget requests, optionally scoped by the viewing user's role.
 * Supervisor → only their own raised requests.
 * Manager (MD) → all requests.
 * Customer's MD → only escalated_customer_md requests for their sites.
 */
export const getBudgetRequests = async (user) => {
  warn();
  // TODO(backend): GET /api/v1/budget/requests?scope=<role>
  await new Promise((r) => setTimeout(r, 160));
  const all = await ensureSeed();
  if (!user) return all;

  if (user.role === 'supervisor') {
    return all.filter((b) => b.raised_by?.id === user.id);
  }
  if (user.role === 'customer_md') {
    const siteIds = user.sites || [];
    return all.filter(
      (b) => b.status === 'escalated_customer_md' && siteIds.includes(b.site_id)
    );
  }
  // Manager / MD sees everything
  return all;
};

export const getBudgetTotals = async (user) => {
  warn();
  // TODO(backend): GET /api/v1/budget/totals?scope=<role>
  const list = await getBudgetRequests(user);
  const pending = list.filter((b) =>
    ['pending_md', 'escalated_customer_md'].includes(b.status)
  ).length;
  const approvedSum = list
    .filter((b) => b.status === 'approved')
    .reduce((acc, b) => acc + (b.amount || 0), 0);
  const rejectedCount = list.filter((b) => b.status === 'rejected').length;
  return { count: list.length, pending, approvedSum, rejectedCount };
};
