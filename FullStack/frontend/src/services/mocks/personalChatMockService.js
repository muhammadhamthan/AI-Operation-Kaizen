/**
 * Mock: personal (1:1) chat service (Kairox §7 + §8).
 *
 * Handles:
 *   - Supervisor <-> MD chat
 *   - MD <-> Customer MD chat
 *
 * Conversation id is a stable hash of the two user IDs (ascending), so
 * either participant arrives at the same record. Messages can be plain
 * text OR a structured budget-card payload (see §7: inline budget cards).
 *
 * Data persists to AsyncStorage so the demo survives reloads.
 *
 * TODO(backend): replace with `/api/v1/chat/personal/:conversation_id`
 *                + WebSocket `ws://.../chat/personal/:conversation_id`.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { canChatWith } from '../../utils/roles';

const KEY = 'kairox:mock:personalChat:v1';
let _warned = false;
const warn = () => {
  if (_warned) return;
  _warned = true;
  // eslint-disable-next-line no-console
  console.warn(
    '[BACKEND-GAP] chat/personal: needs WS/REST at /api/v1/chat/personal/:conversation_id'
  );
};

export const MESSAGE_TYPES = {
  TEXT: 'text',
  BUDGET_CARD: 'budget_card',
  SYSTEM: 'system',
};

const buildConvoId = (a, b) => {
  const ids = [String(a), String(b)].sort();
  return `conv-${ids[0]}-${ids[1]}`;
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

// Seed pleasant-looking history so Priority 3 demos feel lived-in.
const seedIfMissing = async () => {
  const all = await loadAll();
  // Supervisor1 (id 1, Rajesh) <-> Manager1 (id 4, Vikram)
  const c1 = buildConvoId(1, 4);
  if (!all[c1]) {
    all[c1] = {
      id: c1,
      participant_ids: [1, 4],
      messages: [
        {
          id: 'm-s1-1',
          from: 1,
          type: MESSAGE_TYPES.TEXT,
          text: 'Sir, we have a safety-critical lift-rope issue at Vepery. Need your go-ahead on a budget.',
          ts: '2026-04-20T09:58:00Z',
        },
        {
          id: 'm-s1-2',
          from: 4,
          type: MESSAGE_TYPES.TEXT,
          text: 'Send me the request card.',
          ts: '2026-04-20T10:02:00Z',
        },
        {
          id: 'm-s1-3',
          from: 1,
          type: MESSAGE_TYPES.BUDGET_CARD,
          budget_id: 'bud-001',
          ts: '2026-04-20T10:05:00Z',
        },
        {
          id: 'm-s1-4',
          from: 4,
          type: MESSAGE_TYPES.TEXT,
          text: 'Reviewing now. Will decide by end of day.',
          ts: '2026-04-20T10:07:00Z',
        },
      ],
    };
  }
  // MD (Vikram, 4) <-> Customer MD (Anita, 11)
  const c2 = buildConvoId(4, 11);
  if (!all[c2]) {
    all[c2] = {
      id: c2,
      participant_ids: [4, 11],
      messages: [
        {
          id: 'm-c1-1',
          from: 4,
          type: MESSAGE_TYPES.TEXT,
          text: 'Anita, one budget request is being escalated to you — AC compressor overhaul on tower 2.',
          ts: '2026-04-18T09:30:00Z',
        },
        {
          id: 'm-c1-2',
          from: 4,
          type: MESSAGE_TYPES.BUDGET_CARD,
          budget_id: 'bud-003',
          ts: '2026-04-18T09:31:00Z',
        },
        {
          id: 'm-c1-3',
          from: 11,
          type: MESSAGE_TYPES.TEXT,
          text: 'Thanks Vikram. Will review with finance and get back tomorrow.',
          ts: '2026-04-18T10:12:00Z',
        },
      ],
    };
  }
  await saveAll(all);
  return all;
};

/** Get (or create) a conversation between two users. */
export const getPersonalConversation = async (userAId, userBId) => {
  warn();
  const all = await seedIfMissing();
  const id = buildConvoId(userAId, userBId);
  if (!all[id]) {
    all[id] = { id, participant_ids: [userAId, userBId], messages: [] };
    await saveAll(all);
  }
  return all[id];
};

/** Send a plain text message. */
export const sendPersonalMessage = async (fromUser, toUserId, text) => {
  warn();
  // TODO(backend): POST /api/v1/chat/personal/:conversation_id/messages
  if (!text || !text.trim()) return { success: false, error: 'Empty message' };
  if (!canChatWith(fromUser?.role, toUserId.role || toUserId?._role)) {
    // Soft check; real enforcement is at the backend.
  }
  const all = await seedIfMissing();
  const id = buildConvoId(fromUser.id, toUserId);
  if (!all[id]) {
    all[id] = { id, participant_ids: [fromUser.id, toUserId], messages: [] };
  }
  const msg = {
    id: `m-${Date.now()}-${Math.round(Math.random() * 999)}`,
    from: fromUser.id,
    type: MESSAGE_TYPES.TEXT,
    text: text.trim(),
    ts: new Date().toISOString(),
  };
  all[id].messages.push(msg);
  await saveAll(all);
  return { success: true, message: msg, conversation: all[id] };
};

/** Attach a budget card to the conversation. */
export const sendBudgetCard = async (fromUser, toUserId, budgetId) => {
  warn();
  // TODO(backend): POST /api/v1/chat/personal/:conversation_id/messages  (type=budget_card)
  const all = await seedIfMissing();
  const id = buildConvoId(fromUser.id, toUserId);
  if (!all[id]) {
    all[id] = { id, participant_ids: [fromUser.id, toUserId], messages: [] };
  }
  const msg = {
    id: `m-${Date.now()}-bc`,
    from: fromUser.id,
    type: MESSAGE_TYPES.BUDGET_CARD,
    budget_id: budgetId,
    ts: new Date().toISOString(),
  };
  all[id].messages.push(msg);
  await saveAll(all);
  return { success: true, message: msg, conversation: all[id] };
};

/** Poll helper — returns only messages newer than `sinceTs`. */
export const pollSince = async (userAId, userBId, sinceTs) => {
  const all = await seedIfMissing();
  const id = buildConvoId(userAId, userBId);
  const msgs = all[id]?.messages || [];
  if (!sinceTs) return msgs;
  return msgs.filter((m) => new Date(m.ts) > new Date(sinceTs));
};
