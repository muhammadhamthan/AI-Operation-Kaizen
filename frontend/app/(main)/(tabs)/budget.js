import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSelector } from 'react-redux';

import { useTheme } from '../../../src/theme/ThemeContext';
import { selectCurrentUser } from '../../../src/store/slices/authSlice';
import RoleGuard from '../../../src/components/navigation/RoleGuard';
import EmptyState from '../../../src/components/common/EmptyState';
import {
  getBudgetRequests,
  getBudgetTotals,
  getSiteBurnRates,
} from '../../../src/services/mocks/budgetMockService';

const STATUS_META = {
  pending_md: { label: 'Pending MD', tone: 'warning' },
  approved: { label: 'Approved', tone: 'success' },
  rejected: { label: 'Rejected', tone: 'danger' },
  escalated_customer_md: { label: "Escalated to Customer's MD", tone: 'danger' },
};

const fmtCurrency = (n) => {
  if (n == null) return '—';
  return '\u20B9' + new Intl.NumberFormat('en-IN').format(Math.round(n));
};

export default function BudgetRoute() {
  const { theme } = useTheme();
  const router = useRouter();
  const user = useSelector(selectCurrentUser);
  const [list, setList] = useState([]);
  const [totals, setTotals] = useState(null);
  const [burnRates, setBurnRates] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const [l, t, br] = await Promise.all([
        getBudgetRequests(user),
        getBudgetTotals(user),
        getSiteBurnRates(user),
      ]);
      if (!mounted) return;
      setList(l);
      setTotals(t);
      setBurnRates(br);
      setLoading(false);
    })();
    return () => { mounted = false; };
  }, [user]);

  const title =
    user?.role === 'customer_md'
      ? 'Escalated Budget Approvals'
      : user?.role === 'manager'
      ? 'Budget Requests'
      : 'My Budget Requests';

  const toneColor = (tone) => {
    if (tone === 'success') return theme.success;
    if (tone === 'warning') return theme.warning;
    if (tone === 'danger') return theme.danger;
    return theme.textSecondary;
  };
  const toneBg = (tone) => {
    if (tone === 'success') return theme.successLight;
    if (tone === 'warning') return theme.warningLight;
    if (tone === 'danger') return theme.dangerLight;
    return theme.inputBackground;
  };

  return (
    <RoleGuard action="view:budget">
      <SafeAreaView edges={['top']} style={[styles.safe, { backgroundColor: theme.background }]}>
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <TouchableOpacity onPress={() => router.back()} testID="budget-back">
            <Ionicons name="chevron-back" size={22} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>{title}</Text>
          <View style={{ width: 22 }} />
        </View>
        {loading ? (
          <View style={styles.center}><ActivityIndicator color={theme.textSecondary} /></View>
        ) : (
          <ScrollView contentContainerStyle={styles.scroll}>
            {totals && (
              <View style={styles.totalsRow}>
                <TotalCard theme={theme} label="Total" value={totals.count} icon="documents-outline" />
                <TotalCard theme={theme} label="Pending" value={totals.pending} icon="hourglass-outline" color={theme.warning} bg={theme.warningLight} />
                <TotalCard theme={theme} label="Approved" value={fmtCurrency(totals.approvedSum)} icon="checkmark-done-outline" color={theme.success} bg={theme.successLight} wide />
                <TotalCard theme={theme} label="Rejected" value={totals.rejectedCount} icon="close-circle-outline" color={theme.danger} bg={theme.dangerLight} />
              </View>
            )}

            {user?.role === 'supervisor' && (
              <TouchableOpacity
                onPress={() => router.push('/budget/new')}
                style={[styles.raiseBtn, { backgroundColor: theme.primary }]}
                testID="budget-new-request"
                activeOpacity={0.85}
              >
                <Ionicons name="add" size={16} color="#fff" />
                <Text style={styles.raiseText}>Raise New Budget Request</Text>
              </TouchableOpacity>
            )}

            {burnRates.length > 0 && (user?.role === 'manager' || user?.role === 'supervisor') && (
              <View style={styles.burnSection}>
                <Text style={[styles.sectionHeader, { color: theme.textSecondary }]}>
                  This month{'\u2019'}s burn rate
                </Text>
                {burnRates.map((br) => {
                  const pct = Math.min(br.ratio, 1.1);
                  const over = br.ratio > 0.9;
                  const barColor = over ? theme.danger : br.ratio > 0.7 ? theme.warning : theme.success;
                  return (
                    <View
                      key={br.site_id}
                      style={[styles.burnCard, { backgroundColor: theme.card, borderColor: theme.border }]}
                      testID={`burn-${br.site_id}`}
                    >
                      <View style={styles.burnRow}>
                        <Text style={[styles.burnSite, { color: theme.text }]} numberOfLines={1}>
                          {br.site_name}
                        </Text>
                        <Text style={[styles.burnAmt, { color: theme.text }]}>
                          {fmtCurrency(br.spent)} / {fmtCurrency(br.ceiling)}
                        </Text>
                      </View>
                      <View style={[styles.burnTrack, { backgroundColor: theme.border }]}>
                        <View
                          style={[
                            styles.burnFill,
                            { width: `${Math.round(pct * 100)}%`, backgroundColor: barColor },
                          ]}
                        />
                      </View>
                      <Text style={[styles.burnPct, { color: barColor }]}>
                        {Math.round(br.ratio * 100)}% used
                      </Text>
                    </View>
                  );
                })}
              </View>
            )}

            {list.length === 0 ? (
              <EmptyState icon="wallet-outline" title="No budget requests" message="Nothing to show here yet." />
            ) : (
              <FlatList
                data={list}
                scrollEnabled={false}
                keyExtractor={(b) => b.id}
                contentContainerStyle={styles.list}
                renderItem={({ item }) => {
                  const meta = STATUS_META[item.status] || { label: item.status, tone: 'default' };
                  return (
                    <View
                      style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}
                      testID={`budget-item-${item.id}`}
                    >
                      <View style={styles.cardRow}>
                        <Text style={[styles.cardTitle, { color: theme.text }]} numberOfLines={1}>
                          {item.title}
                        </Text>
                        <Text style={[styles.cardAmount, { color: theme.text }]}>
                          {fmtCurrency(item.amount)}
                        </Text>
                      </View>
                      <Text style={[styles.cardSub, { color: theme.textSecondary }]} numberOfLines={2}>
                        {item.reason}
                      </Text>
                      <View style={styles.cardMeta}>
                        <Text style={[styles.metaText, { color: theme.textSecondary }]} numberOfLines={1}>
                          {item.site_name} · by {item.raised_by?.name}
                        </Text>
                        <View style={[styles.statusPill, { backgroundColor: toneBg(meta.tone) }]}>
                          <Text style={[styles.statusText, { color: toneColor(meta.tone) }]}>
                            {meta.label}
                          </Text>
                        </View>
                      </View>
                    </View>
                  );
                }}
              />
            )}
          </ScrollView>
        )}
      </SafeAreaView>
    </RoleGuard>
  );
}

const TotalCard = ({ theme, label, value, icon, color, bg, wide }) => (
  <View
    style={[
      styles.totalCard,
      wide && { flex: 2 },
      { backgroundColor: bg || theme.card, borderColor: theme.border },
    ]}
  >
    <Ionicons name={icon} size={16} color={color || theme.textSecondary} />
    <Text style={[styles.totalValue, { color: color || theme.text }]}>{value}</Text>
    <Text style={[styles.totalLabel, { color: theme.textSecondary }]}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: { fontSize: 14, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  scroll: { paddingBottom: 80 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  totalsRow: { flexDirection: 'row', gap: 8, padding: 16, flexWrap: 'wrap' },
  totalCard: {
    flex: 1, minWidth: 100, padding: 12, borderRadius: 12, borderWidth: 1, gap: 2, alignItems: 'flex-start',
  },
  totalValue: { fontSize: 18, fontWeight: '800', marginTop: 4 },
  totalLabel: { fontSize: 11, fontWeight: '600' },
  list: { paddingHorizontal: 16, gap: 10 },
  card: { padding: 14, borderRadius: 12, borderWidth: 1, gap: 6 },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  cardTitle: { fontSize: 14, fontWeight: '700', flex: 1 },
  cardAmount: { fontSize: 15, fontWeight: '800' },
  cardSub: { fontSize: 12, lineHeight: 17 },
  cardMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4, gap: 10 },
  metaText: { fontSize: 11, fontWeight: '600', flex: 1 },
  statusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusText: { fontSize: 11, fontWeight: '700' },
  raiseBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    marginHorizontal: 16, paddingVertical: 12, borderRadius: 12, marginBottom: 10,
  },
  raiseText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  burnSection: { marginHorizontal: 16, marginTop: 8, marginBottom: 18, gap: 8 },
  sectionHeader: { fontSize: 11, fontWeight: '700', letterSpacing: 0.4, textTransform: 'uppercase' },
  burnCard: { padding: 12, borderRadius: 12, borderWidth: 1, gap: 6 },
  burnRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  burnSite: { fontSize: 13, fontWeight: '700', flex: 1 },
  burnAmt: { fontSize: 12, fontWeight: '600' },
  burnTrack: { height: 6, borderRadius: 3, overflow: 'hidden' },
  burnFill: { height: 6, borderRadius: 3 },
  burnPct: { fontSize: 11, fontWeight: '700' },
});
