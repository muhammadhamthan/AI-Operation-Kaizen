/**
 * Mock: budget requests service (Kairox §11 — used in Priority 4 fully, but
 * Priority 1+2 needs some data so the Budget destination card / screen
 * render with realistic numbers).
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Per-site monthly budget ceilings (for Kairox §11 burn-rate).
 * Realistic demo numbers — one per mock site id.
 * TODO(backend): GET /api/v1/sites/:id/budget/ceiling
 */
export const SITE_MONTHLY_CEILING = {
  1: 500000,   // Vepery
  2: 1000000,  // Ambattur
  3: 300000,   // Guindy
  4: 250000,   // Perungudi
  5: 400000,   // Taramani
};

/**
 * Kairox §11 approval thresholds:
 *   <= 10,000            → auto-approved (per Ops pinned decision)
 *   10,001 - 100,000     → MD decides
 *   > 100,000            → MD + Customer MD double-approval (MD escalates)
 */
export const APPROVAL_THRESHOLDS = {
  AUTO_LIMIT: 10000,
  MD_LIMIT: 100000,
};

export const classifyBudget = (amount) => {
  if (amount <= APPROVAL_THRESHOLDS.AUTO_LIMIT) return 'auto_approve';
  if (amount <= APPROVAL_THRESHOLDS.MD_LIMIT) return 'md_only';
  return 'md_plus_customer_md';
};

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

/**
 * Site burn-rate — approved spend for the current month vs. monthly ceiling.
 * Returns a per-site array the Budget screen renders as progress bars.
 */
export const getSiteBurnRates = async (user) => {
  warn();
  // TODO(backend): GET /api/v1/budget/burn-rate?scope=<role>&month=YYYY-MM
  const list = await getBudgetRequests(user);
  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const bySite = {};
  for (const b of list) {
    if (b.status !== 'approved') continue;
    const month = (b.md_decision_at || b.updated_at || '').slice(0, 7);
    if (month !== thisMonth) continue;
    const key = b.site_id;
    if (!bySite[key]) {
      bySite[key] = {
        site_id: b.site_id,
        site_name: b.site_name,
        spent: 0,
        ceiling: SITE_MONTHLY_CEILING[b.site_id] || 200000,
      };
    }
    bySite[key].spent += b.amount || 0;
  }
  return Object.values(bySite)
    .map((s) => ({ ...s, ratio: s.ceiling > 0 ? s.spent / s.ceiling : 0 }))
    .sort((a, b) => b.ratio - a.ratio);
};

/**
 * Create a new budget request (Supervisor-only).
 * Applies §11 thresholds: auto-approve <= 10k, else pending_md.
 */
export const createBudgetRequest = async (actor, payload) => {
  warn();
  // TODO(backend): POST /api/v1/budget/requests
  if (actor?.role !== 'supervisor') {
    return { success: false, error: 'Only Supervisors can raise budget requests' };
  }
  if (!payload?.title?.trim() || !payload?.amount || !payload?.reason?.trim()) {
    return { success: false, error: 'Title, amount, and reason required' };
  }
  await new Promise((r) => setTimeout(r, 250));
  const all = await ensureSeed();
  const classification = classifyBudget(payload.amount);
  const auto = classification === 'auto_approve';
  const record = {
    id: `bud-${Date.now()}`,
    title: payload.title.trim(),
    site_id: payload.site_id,
    site_name: payload.site_name || `Site ${payload.site_id}`,
    raised_by: { id: actor.id, name: actor.name, role: actor.role },
    amount: payload.amount,
    currency: 'INR',
    reason: payload.reason.trim(),
    status: auto ? 'approved' : 'pending_md',
    auto_approved: auto || undefined,
    md_decision_at: auto ? new Date().toISOString() : undefined,
    md_decided_by: auto ? { id: 0, name: 'System (auto-approval ≤ ₹10k)' } : undefined,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  all.unshift(record);
  await AsyncStorage.setItem(KEY, JSON.stringify(all));
  return { success: true, budget: record, auto_approved: auto };
};

/** Get a single budget by id (used by inline budget cards in chat). */
export const getBudgetById = async (id) => {
  warn();
  const all = await ensureSeed();
  return all.find((b) => b.id === id) || null;
};

/**
 * MD / Customer MD decision on a budget request.
 * @param {string} decision - 'approve' | 'reject' | 'escalate_to_customer_md'
 */
export const decideBudget = async (id, actor, decision, note) => {
  warn();
  // TODO(backend): POST /api/v1/budget/requests/:id/decide
  await new Promise((r) => setTimeout(r, 240));
  const all = await ensureSeed();
  const idx = all.findIndex((b) => b.id === id);
  if (idx === -1) return { success: false, error: 'Not found' };
  const now = new Date().toISOString();
  const updates = { updated_at: now };
  if (decision === 'approve') {
    updates.status = 'approved';
    updates.md_decision_at = now;
    updates.md_decided_by = { id: actor?.id, name: actor?.name };
  } else if (decision === 'reject') {
    updates.status = 'rejected';
    updates.md_decision_at = now;
    updates.md_decided_by = { id: actor?.id, name: actor?.name };
    updates.rejection_note = note || '';
  } else if (decision === 'escalate_to_customer_md') {
    updates.status = 'escalated_customer_md';
  } else {
    return { success: false, error: 'Unknown decision' };
  }
  all[idx] = { ...all[idx], ...updates };
  await AsyncStorage.setItem(KEY, JSON.stringify(all));
  return { success: true, budget: all[idx] };
};
