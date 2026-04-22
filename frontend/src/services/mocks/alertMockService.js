/**
 * Mock: dual-channel alert service (Kairox §5 + §6).
 *
 * When a Supervisor raises a new issue the real backend is supposed to:
 *   1. Trigger a Twilio voice call to the assigned Problem Solver's phone.
 *   2. Send a WhatsApp notification with issue summary + photo link.
 *   3. If the voice call is missed, flag the issue with `missed_call=true`
 *      so the UI shows a persistent "Call was missed, message sent via
 *      WhatsApp" notice.
 *
 * Until that backend exists, this mock fakes the response and persists
 * state to AsyncStorage so the UI has something to render.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'kairox:mock:alerts:v1';
let _warned = false;

const warn = () => {
  if (_warned) return;
  _warned = true;
  // eslint-disable-next-line no-console
  console.warn(
    '[BACKEND-GAP] alerts/dual-channel: needs POST /api/v1/issues/:id/alert ' +
      '-> {voice:{sent,status,call_sid},whatsapp:{sent,message_sid},missed_call:boolean}'
  );
};

const loadAll = async () => {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

const saveAll = async (state) => {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* storage is best-effort in a mock */
  }
};

/**
 * Simulate firing a Twilio-voice + WhatsApp alert pair.
 * Randomly picks delivery outcomes (weighted heavily toward success so
 * the happy-path banner is seen most of the time in demos).
 *
 * // TODO(backend): replace with api.post(`/api/v1/issues/${issueId}/alert`)
 */
export const sendDualChannelAlert = async (issueId) => {
  warn();
  // Simulated 500ms network round-trip.
  await new Promise((r) => setTimeout(r, 500));

  const roll = Math.random();
  // 70% happy-path, 20% missed-call, 10% WhatsApp-only.
  let voiceSent = true;
  let whatsappSent = true;
  let missedCall = false;
  if (roll < 0.2) {
    voiceSent = false;
    missedCall = true;
  } else if (roll < 0.3) {
    voiceSent = false;
  }

  const record = {
    issueId: String(issueId),
    voice: {
      sent: voiceSent,
      status: voiceSent ? 'delivered' : missedCall ? 'no-answer' : 'failed',
      call_sid: `mock-call-${Date.now()}`,
    },
    whatsapp: {
      sent: whatsappSent,
      message_sid: `mock-wa-${Date.now()}`,
    },
    missed_call: missedCall,
    timestamp: new Date().toISOString(),
  };

  const all = await loadAll();
  all[String(issueId)] = record;
  await saveAll(all);
  return record;
};

/** Get the last alert record for a given issue (or null). */
export const getAlertForIssue = async (issueId) => {
  warn();
  // TODO(backend): GET /api/v1/issues/:id/alert
  const all = await loadAll();
  return all[String(issueId)] || null;
};

/** Supervisor-initiated "re-send WhatsApp" action. */
export const resendWhatsappNotice = async (issueId) => {
  warn();
  // TODO(backend): POST /api/v1/issues/:id/alert/whatsapp/resend
  await new Promise((r) => setTimeout(r, 300));
  const all = await loadAll();
  const existing = all[String(issueId)] || {};
  const updated = {
    ...existing,
    whatsapp: { sent: true, message_sid: `mock-wa-${Date.now()}` },
    resent_at: new Date().toISOString(),
  };
  all[String(issueId)] = updated;
  await saveAll(all);
  return updated;
};
