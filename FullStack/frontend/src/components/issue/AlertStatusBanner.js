import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import {
  getAlertForIssue,
  sendDualChannelAlert,
  resendWhatsappNotice,
} from '../../services/mocks/alertMockService';

/**
 * Dual-channel (Twilio voice + WhatsApp) alert status banner (Kairox §5+§6).
 *
 * Renders under the issue header on Issue Detail. Shows:
 *   - ✅ happy path  — "Alert delivered via Call & WhatsApp"
 *   - ⚠️ missed call — persistent amber notice with "Resend WhatsApp" action
 *   - ❌ both failed — danger banner with "Resend" action
 *
 * Uses existing theme tokens only. Data comes from the mock service;
 * real backend lands under `GET /api/v1/issues/:id/alert` later.
 */
const AlertStatusBanner = ({ issueId, canResend }) => {
  const { theme } = useTheme();
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!issueId) return;
      setLoading(true);
      // TODO(backend): GET /api/v1/issues/:id/alert
      let r = await getAlertForIssue(issueId);
      // First view: simulate the alert that would have been fired on create.
      if (!r) {
        r = await sendDualChannelAlert(issueId);
      }
      if (mounted) {
        setRecord(r);
        setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [issueId]);

  if (loading) {
    return (
      <View style={[styles.shell, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <ActivityIndicator size="small" color={theme.textSecondary} />
      </View>
    );
  }
  if (!record) return null;

  const bothFailed = !record.voice?.sent && !record.whatsapp?.sent;
  const missedCall = record.missed_call || (!record.voice?.sent && record.whatsapp?.sent);
  const happy = record.voice?.sent && record.whatsapp?.sent;

  const variant = bothFailed ? 'danger' : missedCall ? 'warning' : 'success';
  const palette = {
    success: { bg: theme.successLight, fg: theme.success, icon: 'checkmark-circle' },
    warning: { bg: theme.warningLight, fg: theme.warning, icon: 'call-outline' },
    danger: { bg: theme.dangerLight, fg: theme.danger, icon: 'alert-circle' },
  }[variant];

  let title = '';
  let body = '';
  if (happy) {
    title = 'Alert delivered';
    body = 'Problem Solver reached via voice call and WhatsApp.';
  } else if (missedCall) {
    title = 'Call was missed';
    body = 'WhatsApp message was sent as a fallback.';
  } else {
    title = 'Alert delivery failed';
    body = 'Neither the voice call nor WhatsApp message reached the solver.';
  }

  const onResend = async () => {
    setResending(true);
    const updated = await resendWhatsappNotice(issueId);
    setRecord(updated);
    setResending(false);
  };

  return (
    <View
      style={[styles.shell, { backgroundColor: palette.bg, borderColor: palette.fg + '33' }]}
      testID={`alert-banner-${variant}`}
    >
      <Ionicons name={palette.icon} size={20} color={palette.fg} style={{ marginRight: 10 }} />
      <View style={{ flex: 1 }}>
        <Text style={[styles.title, { color: palette.fg }]}>{title}</Text>
        <Text style={[styles.body, { color: theme.text }]}>{body}</Text>
        <View style={styles.chipRow}>
          <Ionicons
            name={record.voice?.sent ? 'call' : 'call-outline'}
            size={12}
            color={record.voice?.sent ? theme.success : theme.danger}
          />
          <Text style={[styles.chipText, { color: theme.textSecondary }]}>
            {record.voice?.sent ? 'Voice delivered' : `Voice: ${record.voice?.status || 'failed'}`}
          </Text>
          <View style={styles.dot} />
          <Ionicons
            name="logo-whatsapp"
            size={12}
            color={record.whatsapp?.sent ? theme.success : theme.danger}
          />
          <Text style={[styles.chipText, { color: theme.textSecondary }]}>
            {record.whatsapp?.sent ? 'WhatsApp delivered' : 'WhatsApp failed'}
          </Text>
        </View>
      </View>
      {(missedCall || bothFailed) && canResend && (
        <TouchableOpacity
          style={[styles.resendBtn, { backgroundColor: palette.fg }]}
          onPress={onResend}
          disabled={resending}
          testID="alert-resend-whatsapp"
          activeOpacity={0.7}
        >
          {resending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.resendText}>Resend</Text>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  shell: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 12,
  },
  title: { fontSize: 13, fontWeight: '700', marginBottom: 2 },
  body: { fontSize: 12, lineHeight: 17, marginBottom: 8 },
  chipRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 4 },
  chipText: { fontSize: 11, marginRight: 8 },
  dot: {
    width: 3, height: 3, borderRadius: 2,
    backgroundColor: '#cbd5e1',
    marginHorizontal: 4,
  },
  resendBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    marginLeft: 8,
    alignSelf: 'center',
  },
  resendText: { color: '#fff', fontSize: 12, fontWeight: '700' },
});

export default AlertStatusBanner;
