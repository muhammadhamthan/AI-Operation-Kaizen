// app/(main)/(tabs)/dashboard/site-detail.js

import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSelector } from 'react-redux';
import { PieChart } from 'react-native-chart-kit';
import Ionicons from '@expo/vector-icons/Ionicons';

import { useTheme } from '../../../../src/theme/ThemeContext';
import { selectSiteById } from '../../../../src/store/slices/sitesSlice';
import StatusBadge from "../../../../src/components/common/StatusBadge"
import Avatar from '../../../../src/components/common/Avatar';
import EmptyState from '../../../../src/components/common/EmptyState';
import { issues } from '../../../../src/mocks/issues';
import { complaints } from '../../../../src/mocks/complaints';
import { getUserById } from '../../../../src/mocks/users';

const SCREEN_WIDTH = Dimensions.get('window').width;

export default function SiteDetailScreen() {
  const { theme, isDark } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams();
  const id = parseInt(params.id, 10);

  const site = useSelector(state => selectSiteById(state, id));

  const bgColor = isDark ? '#212121' : '#f9f9f9';
  const surfaceColor = isDark ? '#171717' : '#ffffff';
  const borderColor = isDark ? '#333333' : '#e5e5e5';

  const getHealthColor = health => {
    switch (health) {
      case 'Healthy': return '#10a37f';
      case 'Needs Attention': return '#f59e0b';
      case 'Critical': return '#ef4444';
      default: return theme.textSecondary;
    }
  };

  // ── FIX: Changed siteid to site_id to match mock format ──
  const siteIssues = useMemo(
    () => issues.filter(i => i.site_id === id || i.site_id === id),
    [id]
  );

  // ── FIX: Changed issueid and raisedbysupervisorid to snake_case ──
  const siteComplaints = useMemo(
    () =>
      complaints
        .filter(c => {
          const issue = issues.find(i => i.id === (c.issue_id || c.issueid));
          return (issue?.site_id || issue?.site_id) === id;
        })
        .map(c => ({
          ...c,
          raisedBy: getUserById(c.raised_by_supervisor_id || c.raisedbysupervisorid),
        })),
    [id]
  );
  

  // ── FIX: Changed createdat to created_at ──
  const recentIssues = useMemo(() => {
    return [...siteIssues]
      .sort(
        (a, b) =>
          new Date(b.created_at || b.createdat).getTime() - new Date(a.created_at || a.createdat).getTime()
      )
      .slice(0, 5);
  }, [siteIssues]);

  const chartData = useMemo(() => {
    if (!site?.analytics) return null;
    const a = site.analytics;
    const entries = [
      { label: 'Open', value: a.openIssues, color: '#3b82f6' },
      { label: 'In Progress', value: a.inProgressIssues, color: '#8b5cf6' },
      { label: 'Completed', value: a.completedIssues, color: '#10a37f' },
      { label: 'Escalated', value: a.escalatedIssues, color: '#ef4444' },
      { label: 'Reopened', value: a.reopenedIssues, color: '#f59e0b' },
    ].filter(e => e.value > 0);

    if (entries.length === 0) return null;

    return entries.map(e => ({
      name: e.label,
      population: e.value,
      color: e.color,
      legendFontColor: theme.text,
      legendFontSize: 12,
    }));
  }, [site, theme.text]);

  if (!site) {
    return (
      <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: bgColor }]}>
        <EmptyState icon="business-outline" title="Site not found" message="The requested site does not exist." />
      </SafeAreaView>
    );
  }

  const analytics = site.analytics;
  const score = analytics?.score ?? 100;

  return (
    <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: bgColor }]}>
      {/* HEADER */}
      <View style={[styles.header, { borderBottomColor: borderColor, backgroundColor: bgColor }]}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.6} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.textSecondary }]}>Site Overview</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        
        {/* SITE OVERVIEW & SCORE */}
        <View style={[styles.card, { backgroundColor: surfaceColor, borderColor }]}>
          <View style={styles.titleRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.siteName, { color: theme.text }]}>{site.name}</Text>
              <Text style={[styles.siteLocation, { color: theme.textSecondary }]}>{site.location}</Text>
            </View>
            <View style={[styles.healthBadge, { borderColor: getHealthColor(analytics?.health), backgroundColor: getHealthColor(analytics?.health) + '15' }]}>
              <Text style={[styles.healthText, { color: getHealthColor(analytics?.health) }]}>
                {analytics?.health || 'Unknown'}
              </Text>
            </View>
          </View>

          <View style={styles.scoreRow}>
            <View style={styles.scoreBox}>
              <Text style={[styles.scoreValue, { color: getHealthColor(analytics?.health) }]}>{score}</Text>
              <Text style={[styles.scoreLabel, { color: theme.textSecondary }]}>Site Score</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.scoreBox}>
              <Text style={[styles.scoreValue, { color: theme.text }]}>{analytics?.totalIssues || 0}</Text>
              <Text style={[styles.scoreLabel, { color: theme.textSecondary }]}>Total Issues</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.scoreBox}>
              <Text style={[styles.scoreValue, { color: analytics?.overdueCount > 0 ? '#ef4444' : theme.text }]}>
                {analytics?.overdueCount || 0}
              </Text>
              <Text style={[styles.scoreLabel, { color: theme.textSecondary }]}>Overdue</Text>
            </View>
          </View>
        </View>

        {/* ISSUES CHART */}
        <View style={[styles.card, { backgroundColor: surfaceColor, borderColor }]}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Issue Distribution</Text>
          {chartData ? (
            <View style={styles.chartContainer}>
              <PieChart
                data={chartData}
                width={SCREEN_WIDTH - 64}
                height={200}
                chartConfig={{ color: () => theme.text }}
                accessor="population"
                backgroundColor="transparent"
                paddingLeft="15"
                absolute
              />
            </View>
          ) : (
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No issue data available for this site.</Text>
          )}
        </View>

        {/* ASSIGNED SOLVERS */}
        {analytics?.solvers && analytics.solvers.length > 0 && (
          <View style={[styles.card, { backgroundColor: surfaceColor, borderColor }]}>
            <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Assigned Solvers</Text>
            <View style={styles.solverList}>
              {analytics.solvers.map(solver => (
                <View key={solver.id} style={[styles.solverChip, { backgroundColor: isDark ? '#2a2a2a' : '#f0f0f0' }]}>
                  <Avatar name={solver.name} size="small" />
                  <Text style={[styles.solverName, { color: theme.text }]} numberOfLines={1}>
                    {solver.name.split(' ')[0]}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* RECENT COMPLAINTS */}
        {/* RECENT COMPLAINTS */}
        {siteComplaints.length > 0 && (
          <View style={[styles.card, { backgroundColor: surfaceColor, borderColor }]}>
            <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Recent Complaints</Text>
            {siteComplaints.slice(0, 3).map((complaint, index) => (
              <View key={complaint.id || index} style={styles.issueRow}>
                <Ionicons name="warning" size={20} color="#ef4444" />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.issueTitle, { color: theme.text }]} numberOfLines={2}>
                    {/* FIX: Changed from .reason to .complaint_details */}
                    {complaint.complaint_details || 'No reason provided'}
                  </Text>
                  <Text style={[styles.issueMeta, { color: theme.textSecondary }]}>
                    Raised by {complaint.raisedBy?.name || 'Unknown'}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* RECENT ISSUES */}
        <View style={[styles.card, { backgroundColor: surfaceColor, borderColor }]}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Recent Issues</Text>
          {recentIssues.length === 0 ? (
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No recent issues.</Text>
          ) : (
            recentIssues.map(issue => (
              <TouchableOpacity
                key={issue.id}
                style={styles.issueRow}
                activeOpacity={0.7}
                onPress={() => router.push({ pathname: '(main)/(tabs)/dashboard/issue-detail', params: { id: issue.id } })}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.issueTitle, { color: theme.text }]} numberOfLines={2}>
                    {issue.title}
                  </Text>
                  <Text style={[styles.issueMeta, { color: theme.textSecondary }]}>
                    #{issue.id} · {issue.priority?.toUpperCase()}
                  </Text>
                </View>
                <StatusBadge status={issue.status} />
              </TouchableOpacity>
            ))
          )}
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backButton: { padding: 4, marginLeft: -4 },
  headerTitle: { fontSize: 14, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  placeholder: { width: 32 },
  content: { flex: 1 },
  card: {
    marginHorizontal: 16,
    marginTop: 16,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  siteName: { fontSize: 20, fontWeight: '700', marginBottom: 4 },
  siteLocation: { fontSize: 14 },
  healthBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  healthText: { fontSize: 12, fontWeight: '700' },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: '#e5e5e5',
  },
  scoreBox: { alignItems: 'center', flex: 1 },
  scoreValue: { fontSize: 24, fontWeight: '700', marginBottom: 4 },
  scoreLabel: { fontSize: 12, fontWeight: '500' },
  divider: { width: StyleSheet.hairlineWidth, height: 30, backgroundColor: '#ccc' },
  sectionTitle: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 16 },
  chartContainer: { alignItems: 'center' },
  solverList: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  solverChip: { flexDirection: 'row', alignItems: 'center', padding: 8, paddingRight: 12, borderRadius: 20, gap: 8 },
  solverName: { fontSize: 13, fontWeight: '600', maxWidth: 80 },
  issueRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  issueTitle: { fontSize: 14, fontWeight: '600', marginBottom: 4 },
  issueMeta: { fontSize: 12 },
  emptyText: { fontSize: 13, fontStyle: 'italic' },
  bottomPadding: { height: 40 },
});

