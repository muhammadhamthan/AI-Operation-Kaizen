import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../../../src/theme/ThemeContext';
import RoleGuard from '../../../src/components/navigation/RoleGuard';
import SyncStatusPill from '../../../src/components/common/SyncStatusPill';
import { backToDashboard } from '../../../src/utils/navigation';
import {
  getSheetsStatus,
  connectSheets,
  disconnectSheets,
  triggerManualSync,
  simulateError,
} from '../../../src/services/mocks/sheetSyncMockService';

export default function GoogleSheetsSettings() {
  const { theme, isDark } = useTheme();
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    const s = await getSheetsStatus();
    setStatus(s);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const onConnect = async () => {
    setBusy(true);
    setStatus({ state: 'syncing', connected: false });
    const s = await connectSheets();
    setStatus(s);
    setBusy(false);
  };
  const onDisconnect = async () => {
    Alert.alert('Disconnect?', 'Live sync will stop and existing data will remain.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Disconnect',
        style: 'destructive',
        onPress: async () => {
          setBusy(true);
          const s = await disconnectSheets();
          setStatus(s);
          setBusy(false);
        },
      },
    ]);
  };
  const onManualSync = async () => {
    setBusy(true);
    setStatus({ ...(status || {}), state: 'syncing' });
    const s = await triggerManualSync();
    setStatus(s);
    setBusy(false);
  };
  const onSimError = async () => {
    const s = await simulateError();
    setStatus(s);
  };

  return (
    <RoleGuard allowedRoles={['manager']} title="MD-only">
      <SafeAreaView edges={['top']} style={[styles.safe, { backgroundColor: isDark ? '#0b0f14' : '#f4f4f6' }]}>
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <TouchableOpacity onPress={backToDashboard} testID="sheets-back" hitSlop={10}>
            <Ionicons name="chevron-back" size={22} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Google Sheets Sync</Text>
          <View style={{ width: 22 }} />
        </View>

        <ScrollView contentContainerStyle={styles.body}>
          <Text style={[styles.intro, { color: theme.textSecondary }]}>
            Connect a pre-configured Google Sheet. Cell-level edits propagate to the app
            within seconds (webhook + cell diff, backend-managed).
          </Text>

          <View style={styles.pillRow}>
            <SyncStatusPill status={status || {}} onPress={refresh} />
          </View>

          {!status?.connected ? (
            <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Ionicons name="cloud-upload-outline" size={32} color={theme.textSecondary} />
              <Text style={[styles.cardTitle, { color: theme.text }]}>Not connected</Text>
              <Text style={[styles.cardSub, { color: theme.textSecondary }]}>
                Tap the button below to run the OAuth flow (mocked here).
              </Text>
              <TouchableOpacity
                onPress={onConnect}
                disabled={busy}
                testID="connect-sheets"
                style={[styles.primaryBtn, { backgroundColor: theme.primary, opacity: busy ? 0.7 : 1 }]}
              >
                {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Connect Google Sheet</Text>}
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <Text style={[styles.sheetName, { color: theme.text }]} numberOfLines={2}>
                  {status.sheet_name}
                </Text>
                <View style={styles.statLine}>
                  <Ionicons name="time-outline" size={12} color={theme.textSecondary} />
                  <Text style={[styles.statText, { color: theme.textSecondary }]}>
                    Last synced:{' '}
                    {status.last_synced_at
                      ? new Date(status.last_synced_at).toLocaleString()
                      : '—'}
                  </Text>
                </View>
                <View style={styles.statLine}>
                  <Ionicons name="document-text-outline" size={12} color={theme.textSecondary} />
                  <Text style={[styles.statText, { color: theme.textSecondary }]}>
                    Records: {new Intl.NumberFormat('en-IN').format(status.record_count || 0)}
                  </Text>
                </View>
                {status.last_error && (
                  <View style={[styles.errorBlock, { backgroundColor: theme.dangerLight, borderColor: theme.danger }]}>
                    <Ionicons name="alert-circle" size={14} color={theme.danger} />
                    <Text style={[styles.errorText, { color: theme.danger }]} numberOfLines={3}>
                      {status.last_error}
                    </Text>
                  </View>
                )}

                <View style={styles.actionsRow}>
                  <TouchableOpacity
                    onPress={onManualSync}
                    disabled={busy}
                    testID="manual-sync"
                    style={[styles.secondaryBtn, { borderColor: theme.border }]}
                  >
                    <Ionicons name="sync" size={14} color={theme.text} />
                    <Text style={[styles.secondaryText, { color: theme.text }]}>Sync now</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={onSimError}
                    disabled={busy}
                    testID="simulate-error"
                    style={[styles.secondaryBtn, { borderColor: theme.border }]}
                  >
                    <Ionicons name="bug-outline" size={14} color={theme.warning} />
                    <Text style={[styles.secondaryText, { color: theme.warning }]}>Simulate error</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity
                onPress={onDisconnect}
                disabled={busy}
                testID="disconnect-sheets"
                style={[styles.dangerBtn, { backgroundColor: theme.dangerLight, borderColor: theme.danger }]}
              >
                <Text style={[styles.dangerText, { color: theme.danger }]}>Disconnect Sheet</Text>
              </TouchableOpacity>
            </>
          )}

          <View style={[styles.note, { backgroundColor: isDark ? 'rgba(59,130,246,0.08)' : '#eff6ff', borderColor: isDark ? 'rgba(59,130,246,0.25)' : '#bfdbfe' }]}>
            <Ionicons name="information-circle-outline" size={14} color={theme.primary} />
            <Text style={[styles.noteText, { color: theme.primary }]}>
              Backend-only stack: Sheets API v4 webhook · cell-diff · incremental sync worker.
              Frontend mocks status transitions.
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: { fontSize: 14, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  body: { padding: 16, paddingBottom: 60 },
  intro: { fontSize: 13, lineHeight: 19, marginBottom: 12 },
  pillRow: { flexDirection: 'row', marginBottom: 16 },
  card: { borderWidth: 1, borderRadius: 14, padding: 16, alignItems: 'flex-start', gap: 6, marginBottom: 16 },
  cardTitle: { fontSize: 15, fontWeight: '800', marginTop: 8 },
  cardSub: { fontSize: 12, lineHeight: 17 },
  sheetName: { fontSize: 14, fontWeight: '800', marginBottom: 8 },
  statLine: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statText: { fontSize: 11, fontWeight: '600' },
  errorBlock: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 8, borderRadius: 8, borderWidth: 1, marginTop: 8 },
  errorText: { fontSize: 11, fontWeight: '700', flex: 1 },
  actionsRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  secondaryText: { fontSize: 12, fontWeight: '700' },
  primaryBtn: { marginTop: 12, paddingVertical: 12, paddingHorizontal: 20, borderRadius: 10, alignSelf: 'stretch', alignItems: 'center' },
  primaryText: { color: '#fff', fontSize: 13, fontWeight: '800' },
  dangerBtn: { paddingVertical: 12, borderRadius: 10, borderWidth: 1, alignItems: 'center' },
  dangerText: { fontSize: 12, fontWeight: '800' },
  note: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 10, borderRadius: 10, borderWidth: 1, marginTop: 16 },
  noteText: { flex: 1, fontSize: 11, fontWeight: '700', lineHeight: 15 },
});
