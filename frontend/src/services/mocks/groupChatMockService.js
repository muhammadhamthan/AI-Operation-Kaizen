/**
 * Mock: Ops Team group chat (Kairox §14).
 *
 * Members: all Supervisors + MD. Features:
 *   - Plain text messages
 *   - Pinned messages (MD-only pin action)
 *   - AI Monthly Summary card (system-posted at month start; mock-seeded)
 *
 * TODO(backend): replace with WS/REST at /api/v1/chat/groups/ops.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'kairox:mock:groupChat:ops:v1';
let _warned = false;
const warn = () => {
  if (_warned) return;
  _warned = true;
  // eslint-disable-next-line no-console
  console.warn(
    '[BACKEND-GAP] chat/groups/ops: needs WS/REST at /api/v1/chat/groups/ops'
  );
};

export const GROUP_MESSAGE_TYPES = {
  TEXT: 'text',
  PIN_MARKER: 'pin_marker',
  AI_SUMMARY: 'ai_summary',
  SYSTEM: 'system',
};

const SEED = {
  id: 'group-ops',
  name: 'Ops Team',
  description: 'Daily ops coordination between MD and all Supervisors',
  member_ids: [1, 2, 3, 4], // Supervisors (1,2,3) + MD (4)
  pinned_ids: ['gm-4'],
  messages: [
    {
      id: 'gm-1',
      from: 4,
      type: 'text',
      text: 'Good morning team. Quick standup: 3 open escalations this week, all under review.',
      ts: '2026-04-22T09:00:00Z',
    },
    {
      id: 'gm-2',
      from: 1,
      type: 'text',
      text: 'Vepery is all green apart from the lift-rope budget (awaiting your call).',
      ts: '2026-04-22T09:03:00Z',
    },
    {
      id: 'gm-3',
      from: 2,
      type: 'text',
      text: 'Guindy new CCTV rollout starts Monday. Solver team briefed.',
      ts: '2026-04-22T09:05:00Z',
    },
    {
      id: 'gm-4',
      from: 4,
      type: 'text',
      text: '📌 DECISION: All weekly consumable budgets <= ₹10k are pre-approved. No need to raise individual cards.',
      ts: '2026-04-22T09:12:00Z',
    },
    {
      id: 'gm-5',
      from: 3,
      type: 'text',
      text: 'Noted, Vikram. Thanks — that saves us ~8 requests a week.',
      ts: '2026-04-22T09:15:00Z',
    },
    {
      id: 'gm-6',
      from: 0, // system
      type: 'ai_summary',
      period: 'April 2026 (so far)',
      summary: {
        issues_raised: 27,
        issues_closed: 19,
        complaints: 8,
        escalations: 3,
        budget_spent: 2150000,
        top_decision:
          'Weekly consumable budgets \u2264 \u20B910k pre-approved (GM-4).',
        top_supervisor: 'Rajesh Kumar (12 issues closed)',
      },
      ts: '2026-04-22T10:00:00Z',
    },
  ],
};

const load = async () => {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) {
      await AsyncStorage.setItem(KEY, JSON.stringify(SEED));
      return JSON.parse(JSON.stringify(SEED));
    }
    return JSON.parse(raw);
  } catch {
    return JSON.parse(JSON.stringify(SEED));
  }
};
const save = async (s) => {
  try { await AsyncStorage.setItem(KEY, JSON.stringify(s)); } catch { /* noop */ }
};

export const getOpsGroup = async () => {
  warn();
  return load();
};

export const sendGroupMessage = async (fromUser, text) => {
  warn();
  if (!text || !text.trim()) return { success: false, error: 'Empty' };
  const group = await load();
  const msg = {
    id: `gm-${Date.now()}`,
    from: fromUser.id,
    type: 'text',
    text: text.trim(),
    ts: new Date().toISOString(),
  };
  group.messages.push(msg);
  await save(group);
  return { success: true, message: msg, group };
};

export const togglePinGroupMessage = async (actor, messageId) => {
  warn();
  // TODO(backend): POST /api/v1/chat/groups/ops/messages/:id/pin
  if (actor?.role !== 'manager') {
    return { success: false, error: 'Only MD can pin' };
  }
  const group = await load();
  const pinned = new Set(group.pinned_ids || []);
  if (pinned.has(messageId)) pinned.delete(messageId);
  else pinned.add(messageId);
  group.pinned_ids = Array.from(pinned);
  await save(group);
  return { success: true, group };
};

export const pollGroupSince = async (sinceTs) => {
  const group = await load();
  const msgs = group.messages || [];
  if (!sinceTs) return { messages: msgs, pinned_ids: group.pinned_ids };
  return {
    messages: msgs.filter((m) => new Date(m.ts) > new Date(sinceTs)),
    pinned_ids: group.pinned_ids,
  };
};
