import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSelector } from 'react-redux';

import { useTheme } from '../../../src/theme/ThemeContext';
import { selectCurrentUser } from '../../../src/store/slices/authSlice';
import RoleGuard from '../../../src/components/navigation/RoleGuard';
import { sites as mockSites } from '../../../src/mocks/sites';
import {
  createBudgetRequest,
  classifyBudget,
  APPROVAL_THRESHOLDS,
} from '../../../src/services/mocks/budgetMockService';

const fmtInr = (n) => '\u20B9' + new Intl.NumberFormat('en-IN').format(Math.round(n));

/**
 * Budget request creation form (Supervisor-only).
 * Live-shows the §11 classification so the Supervisor sees in advance
 * whether their request will auto-approve or need MD / Customer MD.
 */
export default function NewBudgetRoute() {
  const { theme } = useTheme();
  const router = useRouter();
  const me = useSelector(selectCurrentUser);

  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [siteId, setSiteId] = useState(me?.sites?.[0] || null);
  const [saving, setSaving] = useState(false);

  const numericAmount = parseInt((amount || '').replace(/[^\d]/g, ''), 10) || 0;
  const classification = classifyBudget(numericAmount);
  const classMeta = {
    auto_approve: { label: 'Will auto-approve', tone: 'success', icon: 'checkmark-circle' },
    md_only: { label: 'Needs Managing Director approval', tone: 'warning', icon: 'person-circle' },
    md_plus_customer_md: { label: "MD + Customer's MD double-approval", tone: 'danger', icon: 'arrow-up-circle' },
  }[classification];

  const toneFg = classMeta.tone === 'success' ? theme.success : classMeta.tone === 'warning' ? theme.warning : theme.danger;
  const toneBg = classMeta.tone === 'success' ? theme.successLight : classMeta.tone === 'warning' ? theme.warningLight : theme.dangerLight;

  const handleSave = async () => {
    if (!title.trim() || numericAmount <= 0 || !reason.trim()) {
      Alert.alert('Missing fields', 'Title, amount, and reason are required.');
      return;
    }
    if (!siteId) {
      Alert.alert('Pick a site');
      return;
    }
    setSaving(true);
    const site = mockSites.find((s) => s.id === siteId);
    const res = await createBudgetRequest(me, {
      title,
      amount: numericAmount,
      reason,
      site_id: siteId,
      site_name: site?.name,
    });
    setSaving(false);
    if (!res.success) {
      Alert.alert('Could not raise', res.error || 'Try again.');
      return;
    }
    Alert.alert(
      res.auto_approved ? 'Auto-approved ✓' : 'Request sent',
      res.auto_approved
        ? `Under ${fmtInr(APPROVAL_THRESHOLDS.AUTO_LIMIT)} — approved automatically per Ops policy.`
        : 'MD has been notified. Track status on the Budget screen.',
      [{ text: 'OK', onPress: () => router.back() }]
    );
  };

  return (
    <RoleGuard allowedRoles={['supervisor']} title="Supervisor-only" message="Only Supervisors can raise budget requests.">
      <SafeAreaView edges={['top']} style={[styles.safe, { backgroundColor: theme.background }]}>
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <TouchableOpacity onPress={() => router.back()} testID="new-budget-back">
            <Ionicons name="chevron-back" size={22} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>New Budget Request</Text>
          <View style={{ width: 22 }} />
        </View>

        <ScrollView contentContainerStyle={styles.body}>
          <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Title *</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. Emergency lift rope replacement"
            placeholderTextColor={theme.textSecondary + '99'}
            style={[styles.input, { color: theme.text, backgroundColor: theme.inputBackground, borderColor: theme.border }]}
            testID="new-budget-title"
          />

          <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Amount (INR) *</Text>
          <TextInput
            value={amount}
            onChangeText={setAmount}
            keyboardType="numeric"
            placeholder="Enter amount in rupees"
            placeholderTextColor={theme.textSecondary + '99'}
            style={[styles.input, { color: theme.text, backgroundColor: theme.inputBackground, borderColor: theme.border }]}
            testID="new-budget-amount"
          />

          {numericAmount > 0 && (
            <View style={[styles.classBanner, { backgroundColor: toneBg, borderColor: toneFg + '44' }]} testID="new-budget-class-banner">
              <Ionicons name={classMeta.icon} size={16} color={toneFg} />
              <Text style={[styles.classText, { color: toneFg }]}>
                {fmtInr(numericAmount)} · {classMeta.label}
              </Text>
            </View>
          )}

          <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Site *</Text>
          <View style={styles.sitesWrap}>
            {mockSites.map((s) => (
              <TouchableOpacity
                key={s.id}
                onPress={() => setSiteId(s.id)}
                style={[
                  styles.siteChip,
                  {
                    backgroundColor: siteId === s.id ? theme.primary : theme.inputBackground,
                    borderColor: siteId === s.id ? theme.primary : theme.border,
                  },
                ]}
                testID={`new-budget-site-${s.id}`}
              >
                <Text style={{ color: siteId === s.id ? '#fff' : theme.text, fontSize: 12, fontWeight: '600' }}>
                  {s.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Reason *</Text>
          <TextInput
            value={reason}
            onChangeText={setReason}
            multiline
            placeholder="Why is this budget needed?"
            placeholderTextColor={theme.textSecondary + '99'}
            style={[styles.input, styles.multi, { color: theme.text, backgroundColor: theme.inputBackground, borderColor: theme.border }]}
            testID="new-budget-reason"
          />

          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: theme.primary }]}
            onPress={handleSave}
            disabled={saving}
            testID="new-budget-save"
            activeOpacity={0.85}
          >
            {saving ? <ActivityIndicator size="small" color="#fff" /> : (
              <>
                <Ionicons name="send" size={14} color="#fff" />
                <Text style={styles.saveText}>
                  {classification === 'auto_approve' ? 'Submit (auto-approve)' : 'Raise Request'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  headerTitle: { fontSize: 14, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  body: { padding: 16, paddingBottom: 60 },
  fieldLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.3, textTransform: 'uppercase', marginTop: 14, marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: Platform.OS === 'ios' ? 11 : 9, fontSize: 14 },
  multi: { minHeight: 86, textAlignVertical: 'top' },
  classBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10, padding: 10, borderRadius: 10, borderWidth: 1 },
  classText: { fontSize: 12, fontWeight: '700' },
  sitesWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  siteChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14, borderWidth: 1 },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 24, paddingVertical: 14, borderRadius: 12 },
  saveText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
