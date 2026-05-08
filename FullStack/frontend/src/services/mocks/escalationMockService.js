/**
 * Mock: issue escalation service (Kairox §3).
 *
 * When a Supervisor taps "Escalate to MD" on an overdue / disputed issue,
 * an escalation report is filed. The real backend will:
 *   1. Flip issue.status to 'escalated'
 *   2. Email the Customer MD of the site
 *   3. Post a message into the Supervisor↔MD personal chat (Section 7)
 *
 * This mock persists locally and no-ops the email/chat side-effects.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'kairox:mock:escalations:v1';
let _warned = false;
const warn = () => {
  if (_warned) return;
  _warned = true;
  // eslint-disable-next-line no-console
  console.warn(
    '[BACKEND-GAP] issues/escalate: needs POST /api/v1/issues/:id/escalate ' +
      "-> {reason, root_cause, proposed_action, copy_customer_md:boolean}"
  );
};

const loadAll = async () => {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
};
const saveAll = async (s) => {
  try { await AsyncStorage.setItem(KEY, JSON.stringify(s)); } catch { /* noop */ }
};

/** POST a new escalation record. */
export const submitEscalation = async (issueId, payload) => {
  warn();
  // TODO(backend): POST /api/v1/issues/:id/escalate
  if (!payload || !payload.reason) {
    return { success: false, error: 'Reason is required' };
  }
  await new Promise((r) => setTimeout(r, 400));
  const record = {
    id: `esc-${Date.now()}`,
    issueId: String(issueId),
    reason: payload.reason,
    root_cause: payload.root_cause || '',
    proposed_action: payload.proposed_action || '',
    copy_customer_md: !!payload.copy_customer_md,
    created_by: payload.created_by || null,
    created_at: new Date().toISOString(),
    email_sent: true,       // mocked
    md_chat_posted: true,    // mocked
  };
  const all = await loadAll();
  all.unshift(record);
  await saveAll(all);
  return { success: true, record };
};

/** GET all escalations for a given issue (most-recent first). */
export const getEscalationsForIssue = async (issueId) => {
  warn();
  // TODO(backend): GET /api/v1/issues/:id/escalations
  const all = await loadAll();
  return all.filter((e) => e.issueId === String(issueId));
};
