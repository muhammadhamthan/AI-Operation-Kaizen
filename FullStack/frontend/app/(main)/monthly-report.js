import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';

import { useTheme } from '../../src/theme/ThemeContext';
import { selectCurrentUser } from '../../src/store/slices/authSlice';
import RoleGuard from '../../src/components/navigation/RoleGuard';
import EmptyState from '../../src/components/common/EmptyState';
import { backToDashboard } from '../../src/utils/navigation';
import { getMonthlyReport } from '../../src/services/mocks/monthlyReportMockService';

/**
 * Monthly Report — structured, analytical view (distinct from raw Site
 * Diary logs). Role-scoped: Supervisor sees their team, Manager company-wide,
 * Customer's MD sees their assigned sites only.
 *
 * Reached from the "Monthly Report" dashboard card for all 3 non-solver
 * roles.
 */
export default function MonthlyReportRoute() {
  const { theme, isDark } = useTheme();
  const me = useSelector(selectCurrentUser);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!me) return;
    const r = await getMonthlyReport(me);
    setReport(r);
    setLoading(false);
    setRefreshing(false);
  }, [me]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, [load]);

  return (
    <RoleGuard action="view:dashboard">
      <SafeAreaView
        edges={['top']}
        style={[styles.safe, { backgroundColor: isDark ? '#0b0f14' : '#f4f4f6' }]}
      >
        {/* ── Header ── */}
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <TouchableOpacity onPress={backToDashboard} testID="monthly-report-back" hitSlop={10}>
            <Ionicons name="chevron-back" size={22} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Monthly Report</Text>
          <View style={{ width: 22 }} />
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={theme.textSecondary} />
          </View>
        ) : !report ? (
          <EmptyState
            icon="document-text-outline"
            title="No report yet"
            message="We'll surface your operations summary here at month end."
          />
        ) : (
          <ScrollView
            contentContainerStyle={styles.scroll}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={theme.textSecondary}
              />
            }
          >
            {/* ── Hero tile (big headline metric) ── */}
            <HeroTile theme={theme} isDark={isDark} report={report} />

            {/* ── KPI grid w/ MoM deltas ── */}
            <SectionLabel theme={theme} icon="stats-chart-outline" text="Key metrics" />
            <View style={styles.kpiGrid}>
              {report.kpis.map((k) => (
                <KpiCard key={k.key} theme={theme} isDark={isDark} kpi={k} />
              ))}
            </View>

            {/* ── AI Highlights ── */}
            {!!report.highlights && (
              <View
                style={[
                  styles.highlightsCard,
                  {
                    backgroundColor: isDark ? 'rgba(59,130,246,0.08)' : '#eff6ff',
                    borderColor: isDark ? 'rgba(59,130,246,0.25)' : '#bfdbfe',
                  },
                ]}
                testID="monthly-highlights"
              >
                <View style={styles.highlightsHead}>
                  <View
                    style={[
                      styles.highlightsIcon,
                      { backgroundColor: isDark ? 'rgba(59,130,246,0.2)' : '#dbeafe' },
                    ]}
                  >
                    <Ionicons name="sparkles" size={14} color={theme.primary} />
                  </View>
                  <Text style={[styles.highlightsTitle, { color: theme.primary }]}>
                    Kairox AI Highlights
                  </Text>
                </View>
                <Text style={[styles.highlightsBody, { color: theme.text }]}>
                  {report.highlights}
                </Text>
              </View>
            )}

            {/* ── Standout / Leaderboard ── */}
            {report.standout && (
              <View
                style={[
                  styles.standoutCard,
                  { backgroundColor: theme.card, borderColor: theme.border },
                ]}
                testID="monthly-standout"
              >
                <View
                  style={[
                    styles.standoutBadge,
                    { backgroundColor: isDark ? 'rgba(16,163,127,0.15)' : '#ecfdf5' },
                  ]}
                >
                  <Ionicons name="trophy" size={14} color="#10a37f" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.standoutLabel, { color: theme.textSecondary }]}>
                    {report.standout.label}
                  </Text>
                  <Text style={[styles.standoutName, { color: theme.text }]} numberOfLines={1}>
                    {report.standout.name}
                  </Text>
                  <Text style={[styles.standoutDetail, { color: theme.textSecondary }]}>
                    {report.standout.detail}
                  </Text>
                </View>
              </View>
            )}

            {/* ── Per-site performance ── */}
            {report.per_site.length > 0 && (
              <>
                <SectionLabel
                  theme={theme}
                  icon="business-outline"
                  text={
                    me?.role === 'customer_md' ? 'Your sites' : 'Per-site performance'
                  }
                />
                <View style={styles.perSiteWrap}>
                  {report.per_site.map((s) => (
                    <PerSiteCard key={s.site_id} theme={theme} isDark={isDark} site={s} />
                  ))}
                </View>
              </>
            )}

            {/* ── Budget summary ── */}
            <SectionLabel theme={theme} icon="wallet-outline" text="Budget summary" />
            <View style={styles.budgetRow}>
              <MiniStat
                theme={theme}
                isDark={isDark}
                label="Approved"
                value={'\u20B9' + new Intl.NumberFormat('en-IN').format(report.budget.approved_sum)}
                tone="success"
              />
              <MiniStat
                theme={theme}
                isDark={isDark}
                label="Requests"
                value={report.budget.approved_count}
                tone="neutral"
              />
              <MiniStat
                theme={theme}
                isDark={isDark}
                label="Rejected"
                value={report.budget.rejected_count}
                tone="danger"
              />
              <MiniStat
                theme={theme}
                isDark={isDark}
                label="Escalated"
                value={report.budget.escalated_count}
                tone="warning"
              />
            </View>

            {/* ── Top 5 issues ── */}
            {report.top_issues.length > 0 && (
              <>
                <SectionLabel theme={theme} icon="flame-outline" text="Top issues this month" />
                <View style={[styles.topIssuesCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                  {report.top_issues.map((i, idx) => (
                    <View
                      key={i.id}
                      style={[
                        styles.topIssueRow,
                        idx > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.border },
                      ]}
                      testID={`top-issue-${i.id}`}
                    >
                      <View style={[styles.rankBadge, { backgroundColor: isDark ? '#1f2937' : '#f3f4f6' }]}>
                        <Text style={[styles.rankText, { color: theme.textSecondary }]}>
                          #{idx + 1}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.topIssueTitle, { color: theme.text }]} numberOfLines={1}>
                          {i.title}
                        </Text>
                        <Text style={[styles.topIssueMeta, { color: theme.textSecondary }]} numberOfLines={1}>
                          {i.site_name} · {i.priority || 'medium'} priority
                        </Text>
                      </View>
                      <StatusPill theme={theme} isDark={isDark} status={i.status} />
                    </View>
                  ))}
                </View>
              </>
            )}

            {/* ── Footer meta ── */}
            <View style={styles.footer}>
              <Ionicons name="shield-checkmark-outline" size={12} color={theme.textSecondary} />
              <Text style={[styles.footerText, { color: theme.textSecondary }]}>
                Safety incidents this month: {report.safety_incidents}
              </Text>
            </View>
            <Text style={[styles.footerScope, { color: theme.textSecondary }]}>
              {report.month} · {report.scope_label}
            </Text>

            <View style={{ height: 32 }} />
          </ScrollView>
        )}
      </SafeAreaView>
    </RoleGuard>
  );
}

/* ───────────────── Sub-components ───────────────── */

const SectionLabel = ({ theme, icon, text }) => (
  <View style={styles.sectionLabel}>
    <Ionicons name={icon} size={13} color={theme.textSecondary} />
    <Text style={[styles.sectionLabelText, { color: theme.textSecondary }]}>{text}</Text>
  </View>
);

const HeroTile = ({ theme, isDark, report }) => (
  <View
    style={[
      styles.hero,
      {
        backgroundColor: isDark ? '#111827' : '#0f172a',
        borderColor: isDark ? '#1f2937' : '#0b1220',
      },
    ]}
    testID="monthly-hero"
  >
    <View style={styles.heroTopRow}>
      <Text style={styles.heroMonth}>{report.month}</Text>
      <View style={styles.heroScopePill}>
        <Ionicons name="layers-outline" size={11} color="#93c5fd" />
        <Text style={styles.heroScopeText} numberOfLines={1}>
          {report.scope_label}
        </Text>
      </View>
    </View>
    <Text style={styles.heroLabel}>{report.hero.label}</Text>
    <Text style={styles.heroValue}>{report.hero.value}</Text>
    <View style={styles.heroAccentBar} />
  </View>
);

const KpiCard = ({ theme, isDark, kpi }) => {
  // Determine sentiment color of delta
  let deltaColor = theme.textSecondary;
  let deltaBg = isDark ? 'rgba(148,163,184,0.12)' : '#f1f5f9';
  let deltaIcon = 'remove';
  if (kpi.delta) {
    const positive = kpi.delta.startsWith('+');
    const good = kpi.invertSentiment ? !positive : positive;
    deltaColor = good ? '#10a37f' : '#ef4444';
    deltaBg = good
      ? (isDark ? 'rgba(16,163,127,0.15)' : '#ecfdf5')
      : (isDark ? 'rgba(239,68,68,0.15)' : '#fef2f2');
    deltaIcon = positive ? 'trending-up' : 'trending-down';
  }
  return (
    <View
      style={[styles.kpiCard, { backgroundColor: theme.card, borderColor: theme.border }]}
      testID={`kpi-${kpi.key}`}
    >
      <Text style={[styles.kpiLabel, { color: theme.textSecondary }]}>{kpi.label}</Text>
      <Text style={[styles.kpiValue, { color: theme.text }]}>{kpi.value}</Text>
      {kpi.delta ? (
        <View style={[styles.deltaPill, { backgroundColor: deltaBg }]}>
          <Ionicons name={deltaIcon} size={10} color={deltaColor} />
          <Text style={[styles.deltaText, { color: deltaColor }]}>{kpi.delta}</Text>
        </View>
      ) : (
        <View style={{ height: 18 }} />
      )}
    </View>
  );
};

const PerSiteCard = ({ theme, isDark, site }) => {
  const pct = Math.min(site.burn_ratio, 1.1);
  const barColor =
    site.burn_ratio > 0.9 ? '#ef4444' : site.burn_ratio > 0.7 ? '#f59e0b' : '#10a37f';
  const fmt = (n) => '\u20B9' + new Intl.NumberFormat('en-IN').format(Math.round(n));
  return (
    <View
      style={[styles.siteCard, { backgroundColor: theme.card, borderColor: theme.border }]}
      testID={`per-site-${site.site_id}`}
    >
      <View style={styles.siteHead}>
        <Text style={[styles.siteName, { color: theme.text }]} numberOfLines={1}>
          {site.name}
        </Text>
        <View
          style={[
            styles.siteOnTime,
            { backgroundColor: isDark ? 'rgba(148,163,184,0.1)' : '#f1f5f9' },
          ]}
        >
          <Text style={[styles.siteOnTimeText, { color: theme.textSecondary }]}>
            {site.on_time_rate}% on-time
          </Text>
        </View>
      </View>
      <View style={styles.siteStatsRow}>
        <SiteStat theme={theme} label="Raised" value={site.issues_total} />
        <SiteStat theme={theme} label="Closed" value={site.issues_closed} tone="success" />
        <SiteStat theme={theme} label="Open" value={site.issues_open} tone="warning" />
      </View>
      <View style={styles.burnBlock}>
        <View style={styles.burnRow}>
          <Text style={[styles.burnSub, { color: theme.textSecondary }]}>
            Budget burn · {fmt(site.spent)} / {fmt(site.ceiling)}
          </Text>
          <Text style={[styles.burnPct, { color: barColor }]}>
            {Math.round(site.burn_ratio * 100)}%
          </Text>
        </View>
        <View style={[styles.burnTrack, { backgroundColor: theme.border }]}>
          <View
            style={[styles.burnFill, { width: `${Math.round(pct * 100)}%`, backgroundColor: barColor }]}
          />
        </View>
      </View>
    </View>
  );
};

const SiteStat = ({ theme, label, value, tone }) => {
  const toneColor =
    tone === 'success' ? '#10a37f' : tone === 'warning' ? '#f59e0b' : theme.text;
  return (
    <View style={styles.siteStat}>
      <Text style={[styles.siteStatValue, { color: toneColor }]}>{value}</Text>
      <Text style={[styles.siteStatLabel, { color: theme.textSecondary }]}>{label}</Text>
    </View>
  );
};

const MiniStat = ({ theme, isDark, label, value, tone }) => {
  const toneMap = {
    success: { c: '#10a37f', bg: isDark ? 'rgba(16,163,127,0.12)' : '#ecfdf5' },
    danger: { c: '#ef4444', bg: isDark ? 'rgba(239,68,68,0.12)' : '#fef2f2' },
    warning: { c: '#f59e0b', bg: isDark ? 'rgba(245,158,11,0.12)' : '#fffbeb' },
    neutral: { c: theme.text, bg: theme.card },
  };
  const t = toneMap[tone] || toneMap.neutral;
  return (
    <View style={[styles.miniStat, { backgroundColor: t.bg, borderColor: theme.border }]}>
      <Text style={[styles.miniVal, { color: t.c }]} numberOfLines={1}>
        {value}
      </Text>
      <Text style={[styles.miniLbl, { color: theme.textSecondary }]}>{label}</Text>
    </View>
  );
};

const STATUS_TONE = {
  OPEN: { label: 'Active', c: '#3b82f6' },
  ASSIGNED: { label: 'Active', c: '#3b82f6' },
  AUTO_ASSIGNED: { label: 'Active', c: '#3b82f6' },
  REASSIGNED: { label: 'Active', c: '#3b82f6' },
  IN_PROGRESS: { label: 'In Progress', c: '#f59e0b' },
  COMPLETED: { label: 'Fixed', c: '#10a37f' },
  ESCALATED: { label: 'Escalated', c: '#ef4444' },
  REOPENED: { label: 'Not Fixed', c: '#ef4444' },
};

const StatusPill = ({ theme, isDark, status }) => {
  const meta = STATUS_TONE[status] || { label: status, c: theme.textSecondary };
  const bg = isDark ? `${meta.c}22` : `${meta.c}15`;
  return (
    <View style={[styles.statusPill, { backgroundColor: bg }]}>
      <Text style={[styles.statusText, { color: meta.c }]}>{meta.label}</Text>
    </View>
  );
};

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
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 80 },

  // Section label
  sectionLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 22,
    marginBottom: 10,
  },
  sectionLabelText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },

  // Hero
  hero: {
    borderRadius: 18,
    padding: 22,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  heroTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  heroMonth: { color: '#cbd5e1', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  heroScopePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(59,130,246,0.18)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    maxWidth: '55%',
  },
  heroScopeText: { color: '#93c5fd', fontSize: 10, fontWeight: '700' },
  heroLabel: { color: '#94a3b8', fontSize: 13, fontWeight: '600', marginBottom: 6 },
  heroValue: { color: '#fff', fontSize: 44, fontWeight: '800', letterSpacing: -1.5 },
  heroAccentBar: {
    position: 'absolute',
    left: 0,
    bottom: 0,
    height: 3,
    width: '60%',
    backgroundColor: '#3b82f6',
    borderBottomLeftRadius: 18,
  },

  // KPIs
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  kpiCard: {
    flexGrow: 1,
    flexBasis: '46%',
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 4,
  },
  kpiLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6 },
  kpiValue: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5, marginTop: 4 },
  deltaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 999,
    alignSelf: 'flex-start',
    marginTop: 6,
  },
  deltaText: { fontSize: 10, fontWeight: '800' },

  // Highlights
  highlightsCard: {
    marginTop: 22,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
  },
  highlightsHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  highlightsIcon: {
    width: 26,
    height: 26,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  highlightsTitle: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.8 },
  highlightsBody: { fontSize: 13, lineHeight: 19 },

  // Standout
  standoutCard: {
    marginTop: 14,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  standoutBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  standoutLabel: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.8 },
  standoutName: { fontSize: 15, fontWeight: '700', marginTop: 2 },
  standoutDetail: { fontSize: 12, marginTop: 2 },

  // Per site
  perSiteWrap: { gap: 10 },
  siteCard: { borderRadius: 14, borderWidth: 1, padding: 14 },
  siteHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  siteName: { fontSize: 14, fontWeight: '700', flex: 1 },
  siteOnTime: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  siteOnTimeText: { fontSize: 10, fontWeight: '800' },
  siteStatsRow: { flexDirection: 'row', gap: 16, marginBottom: 12 },
  siteStat: { flex: 1 },
  siteStatValue: { fontSize: 18, fontWeight: '800' },
  siteStatLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4, marginTop: 2 },
  burnBlock: { gap: 6 },
  burnRow: { flexDirection: 'row', justifyContent: 'space-between' },
  burnSub: { fontSize: 11, fontWeight: '600' },
  burnPct: { fontSize: 11, fontWeight: '800' },
  burnTrack: { height: 5, borderRadius: 3, overflow: 'hidden' },
  burnFill: { height: 5, borderRadius: 3 },

  // Budget mini row
  budgetRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  miniStat: {
    flexGrow: 1,
    flexBasis: '22%',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'flex-start',
  },
  miniVal: { fontSize: 14, fontWeight: '800', marginBottom: 2 },
  miniLbl: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },

  // Top issues
  topIssuesCard: { borderRadius: 14, borderWidth: 1, overflow: 'hidden' },
  topIssueRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, paddingHorizontal: 14 },
  rankBadge: { width: 30, height: 30, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  rankText: { fontSize: 11, fontWeight: '800' },
  topIssueTitle: { fontSize: 13, fontWeight: '700' },
  topIssueMeta: { fontSize: 11, marginTop: 2 },
  statusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusText: { fontSize: 10, fontWeight: '800' },

  // Footer
  footer: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 24 },
  footerText: { fontSize: 11, fontWeight: '600' },
  footerScope: { fontSize: 10, fontWeight: '600', marginTop: 4, letterSpacing: 0.3 },
});
