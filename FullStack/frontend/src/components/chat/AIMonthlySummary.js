import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';

const fmtInr = (n) => '\u20B9' + new Intl.NumberFormat('en-IN').format(Math.round(n));

/**
 * AI Monthly Summary card pinned at the top of the Ops group chat (Kairox §14).
 * System-posted; renders as a distinctive card with 6 key metrics.
 */
const AIMonthlySummary = ({ summary, period }) => {
  const { theme, isDark } = useTheme();
  if (!summary) return null;
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: isDark ? 'rgba(16, 163, 127, 0.12)' : '#ecfdf5',
          borderColor: theme.success,
        },
      ]}
      testID="ai-monthly-summary"
    >
      <View style={styles.header}>
        <Ionicons name="sparkles" size={16} color={theme.success} />
        <Text style={[styles.title, { color: theme.success }]}>
          AI Monthly Summary
        </Text>
        <Text style={[styles.period, { color: theme.textSecondary }]}>{period}</Text>
      </View>
      <View style={styles.grid}>
        <Stat theme={theme} label="Issues raised" value={summary.issues_raised} />
        <Stat theme={theme} label="Issues closed" value={summary.issues_closed} tone="success" />
        <Stat theme={theme} label="Complaints" value={summary.complaints} tone="warning" />
        <Stat theme={theme} label="Escalations" value={summary.escalations} tone="danger" />
        <Stat theme={theme} label="Budget spent" value={fmtInr(summary.budget_spent)} wide />
      </View>
      {summary.top_decision && (
        <View style={styles.footer}>
          <Text style={[styles.footerLabel, { color: theme.textSecondary }]}>Top decision</Text>
          <Text style={[styles.footerValue, { color: theme.text }]}>{summary.top_decision}</Text>
        </View>
      )}
      {summary.top_supervisor && (
        <View style={styles.footer}>
          <Text style={[styles.footerLabel, { color: theme.textSecondary }]}>Top supervisor</Text>
          <Text style={[styles.footerValue, { color: theme.text }]}>{summary.top_supervisor}</Text>
        </View>
      )}
    </View>
  );
};

const Stat = ({ theme, label, value, tone, wide }) => {
  const tint = tone === 'success' ? theme.success
    : tone === 'warning' ? theme.warning
    : tone === 'danger' ? theme.danger
    : theme.text;
  return (
    <View style={[styles.stat, wide && { flexBasis: '100%' }]}>
      <Text style={[styles.statValue, { color: tint }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: theme.textSecondary }]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: 14,
    borderWidth: 1,
    borderRadius: 14,
    marginVertical: 6,
    alignSelf: 'stretch',
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  title: { fontSize: 12, fontWeight: '700', letterSpacing: 0.4, textTransform: 'uppercase' },
  period: { fontSize: 11, marginLeft: 'auto', fontWeight: '600' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  stat: { flexBasis: '47%', padding: 8 },
  statValue: { fontSize: 18, fontWeight: '800' },
  statLabel: { fontSize: 11, fontWeight: '600', marginTop: 2 },
  footer: {
    marginTop: 8, paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(0,0,0,0.05)',
  },
  footerLabel: { fontSize: 10, fontWeight: '600', letterSpacing: 0.3, textTransform: 'uppercase' },
  footerValue: { fontSize: 13, fontWeight: '600', marginTop: 2 },
});

export default AIMonthlySummary;
