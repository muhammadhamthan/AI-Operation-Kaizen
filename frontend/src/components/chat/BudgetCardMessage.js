import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import {
  getBudgetById,
  decideBudget,
} from '../../services/mocks/budgetMockService';

const STATUS_META = {
  pending_md: { label: 'Pending MD', tone: 'warning' },
  approved: { label: 'Approved', tone: 'success' },
  rejected: { label: 'Rejected', tone: 'danger' },
  escalated_customer_md: { label: "Escalated", tone: 'danger' },
};

const fmtCurrency = (n) => {
  if (n == null) return '—';
  return '\u20B9' + new Intl.NumberFormat('en-IN').format(Math.round(n));
};

/**
 * Inline budget-request card rendered as a chat message (Kairox §7).
 * MD sees Accept / Reject / Escalate action buttons while status is pending.
 * Customer MD sees Approve / Reject while status is escalated_customer_md.
 * Supervisors + others see read-only view.
 */
const BudgetCardMessage = ({ budgetId, viewerRole, viewerUser, onDecided }) => {
  const { theme } = useTheme();
  const [budget, setBudget] = useState(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const b = await getBudgetById(budgetId);
      if (mounted) {
        setBudget(b);
        setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [budgetId]);

  if (loading) {
    return (
      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <ActivityIndicator size="small" color={theme.textSecondary} />
      </View>
    );
  }
  if (!budget) {
    return (
      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Text style={{ color: theme.textSecondary, fontSize: 12 }}>
          Budget request not found.
        </Text>
      </View>
    );
  }

  const meta = STATUS_META[budget.status] || { label: budget.status, tone: 'default' };
  const toneColor = meta.tone === 'success' ? theme.success
    : meta.tone === 'warning' ? theme.warning
    : meta.tone === 'danger' ? theme.danger
    : theme.textSecondary;
  const toneBg = meta.tone === 'success' ? theme.successLight
    : meta.tone === 'warning' ? theme.warningLight
    : meta.tone === 'danger' ? theme.dangerLight
    : theme.inputBackground;

  const canMDDecide = viewerRole === 'manager' && budget.status === 'pending_md';
  const canCustMDDecide =
    viewerRole === 'customer_md' && budget.status === 'escalated_customer_md';

  const handleDecision = async (decision) => {
    const label = decision === 'approve' ? 'Approve'
      : decision === 'reject' ? 'Reject'
      : 'Escalate to Customer\u2019s MD';
    setActing(decision);
    const res = await decideBudget(budget.id, viewerUser, decision);
    setActing(null);
    if (!res.success) {
      Alert.alert('Action failed', res.error || 'Try again.');
      return;
    }
    setBudget(res.budget);
    onDecided?.(res.budget);
  };

  return (
    <View
      style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}
      testID={`budget-card-msg-${budget.id}`}
    >
      <View style={styles.header}>
        <Ionicons name="wallet-outline" size={16} color={theme.primary} />
        <Text style={[styles.headerText, { color: theme.primary }]}>Budget Request</Text>
        <View style={[styles.pill, { backgroundColor: toneBg }]}>
          <Text style={[styles.pillText, { color: toneColor }]}>{meta.label}</Text>
        </View>
      </View>
      <Text style={[styles.title, { color: theme.text }]} numberOfLines={2}>
        {budget.title}
      </Text>
      <Text style={[styles.amount, { color: theme.text }]}>{fmtCurrency(budget.amount)}</Text>
      <Text style={[styles.reason, { color: theme.textSecondary }]} numberOfLines={3}>
        {budget.reason}
      </Text>
      <View style={styles.metaRow}>
        <Ionicons name="business-outline" size={11} color={theme.textSecondary} />
        <Text style={[styles.metaText, { color: theme.textSecondary }]}>{budget.site_name}</Text>
        <View style={styles.dot} />
        <Text style={[styles.metaText, { color: theme.textSecondary }]}>
          by {budget.raised_by?.name}
        </Text>
      </View>

      {(canMDDecide || canCustMDDecide) && (
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.rejectBtn, { borderColor: theme.danger }]}
            onPress={() => handleDecision('reject')}
            disabled={!!acting}
            activeOpacity={0.8}
            testID={`budget-card-reject-${budget.id}`}
          >
            {acting === 'reject' ? (
              <ActivityIndicator size="small" color={theme.danger} />
            ) : (
              <Text style={[styles.rejectText, { color: theme.danger }]}>Reject</Text>
            )}
          </TouchableOpacity>
          {canMDDecide && (
            <TouchableOpacity
              style={[styles.escalateBtn, { backgroundColor: theme.warning }]}
              onPress={() => handleDecision('escalate_to_customer_md')}
              disabled={!!acting}
              activeOpacity={0.85}
              testID={`budget-card-escalate-${budget.id}`}
            >
              {acting === 'escalate_to_customer_md' ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.escalateText}>Escalate</Text>
              )}
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.approveBtn, { backgroundColor: theme.success }]}
            onPress={() => handleDecision('approve')}
            disabled={!!acting}
            activeOpacity={0.85}
            testID={`budget-card-approve-${budget.id}`}
          >
            {acting === 'approve' ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.approveText}>Approve</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginVertical: 4,
    minWidth: 240,
    maxWidth: 360,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  headerText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.4, textTransform: 'uppercase' },
  pill: { marginLeft: 'auto', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  pillText: { fontSize: 10, fontWeight: '700' },
  title: { fontSize: 14, fontWeight: '700', marginBottom: 2 },
  amount: { fontSize: 18, fontWeight: '800', marginBottom: 6 },
  reason: { fontSize: 12, lineHeight: 17, marginBottom: 8 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'wrap' },
  metaText: { fontSize: 11, fontWeight: '600' },
  dot: { width: 3, height: 3, borderRadius: 2, backgroundColor: '#cbd5e1', marginHorizontal: 2 },
  actionsRow: { flexDirection: 'row', gap: 6, marginTop: 10 },
  rejectBtn: {
    flex: 1, borderWidth: 1, borderRadius: 8, paddingVertical: 8, alignItems: 'center',
  },
  rejectText: { fontSize: 12, fontWeight: '700' },
  escalateBtn: {
    flex: 1, borderRadius: 8, paddingVertical: 8, alignItems: 'center',
  },
  escalateText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  approveBtn: {
    flex: 1, borderRadius: 8, paddingVertical: 8, alignItems: 'center',
  },
  approveText: { color: '#fff', fontSize: 12, fontWeight: '700' },
});

export default BudgetCardMessage;
