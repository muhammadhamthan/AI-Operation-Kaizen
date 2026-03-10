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
import StatusBadge from '../../../../src/components/common/StatusBadge';
import Avatar from '../../../../src/components/common/Avatar';
import EmptyState from '../../../../src/components/common/EmptyState';

const SCREEN_WIDTH = Dimensions.get('window').width;

export default function SiteDetailScreen() {
  const { theme, isDark } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams();
  const id = parseInt(params.id, 10);

  // ✅ Get site data from our standard Redux slice
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

  // ✅ Chart data mapped to real snake_case backend keys
  const chartData = useMemo(() => {
    if (!site?.analytics) return null;
    const a = site.analytics;
    const entries = [
      { label: 'Open', value: a.open_issues || 0, color: '#3b82f6' },
      { label: 'Assigned', value: a.assigned_issues || 0, color: '#8b5cf6' },
      { label: 'In Progress', value: a.in_progress_issues || 0, color: '#f59e0b' },
      { label: 'Completed', value: a.completed_issues || 0, color: '#10a37f' },
      { label: 'Reopened', value: a.reopened_issues || 0, color: '#ef4444' },
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
        <View style={styles.header}>
           <TouchableOpacity onPress={() => router.back()}><Ionicons name="chevron-back" size={24} color={theme.text} /></TouchableOpacity>
        </View>
        <EmptyState icon="business-outline" title="Site not found" message="The requested site data is unavailable." />
      </SafeAreaView>
    );
  }

  const analytics = site.analytics || {};
  const score = analytics.score ?? 100;

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
            <View style={[styles.healthBadge, { borderColor: getHealthColor(analytics.health), backgroundColor: getHealthColor(analytics.health) + '15' }]}>
              <Text style={[styles.healthText, { color: getHealthColor(analytics.health) }]}>
                {analytics.health || 'Unknown'}
              </Text>
            </View>
          </View>

          <View style={styles.scoreRow}>
            <View style={styles.scoreBox}>
              <Text style={[styles.scoreValue, { color: getHealthColor(analytics.health) }]}>{score}</Text>
              <Text style={[styles.scoreLabel, { color: theme.textSecondary }]}>Site Score</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.scoreBox}>
              <Text style={[styles.scoreValue, { color: theme.text }]}>{analytics.total_issues || 0}</Text>
              <Text style={[styles.scoreLabel, { color: theme.textSecondary }]}>Total Issues</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.scoreBox}>
              <Text style={[styles.scoreValue, { color: (analytics.overdue_count || 0) > 0 ? '#ef4444' : theme.text }]}>
                {analytics.overdue_count || 0}
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
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No issues recorded for this site yet.</Text>
          )}
        </View>

        {/* ASSIGNED SOLVERS (Mapped from real backend solvers list) */}
        {analytics.solvers && analytics.solvers.length > 0 && (
          <View style={[styles.card, { backgroundColor: surfaceColor, borderColor }]}>
            <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Assigned Solvers</Text>
            <View style={styles.solverList}>
              {analytics.solvers.map(solver => (
                <TouchableOpacity
                  key={solver.id}
                  style={[styles.solverChip, { backgroundColor: isDark ? '#2a2a2a' : '#f0f0f0' }]}
                  activeOpacity={0.7}
                  onPress={() => router.push({
                    pathname: '/(main)/(tabs)/dashboard/solver-profile',
                    params: { id: solver.id }
                  })}
                >
                  <Avatar name={solver.name} size="small" />
                  <Text style={[styles.solverName, { color: theme.text }]} numberOfLines={1}>
                    {solver.name.split(' ')[0]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* RECENT COMPLAINTS PLACEHOLDER */}
        <View style={[styles.card, { backgroundColor: surfaceColor, borderColor }]}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Recent Complaints</Text>
          {(analytics.complaints_count || 0) > 0 ? (
             <View style={styles.placeholderBox}>
                <Ionicons name="information-circle-outline" size={20} color={theme.textSecondary} />
                <Text style={{color: theme.textSecondary, marginLeft: 8}}>Complaint details are loaded in the Complaints screen.</Text>
             </View>
          ) : (
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No complaints reported for this site.</Text>
          )}
        </View>

        {/* RECENT ISSUES PLACEHOLDER */}
        <View style={[styles.card, { backgroundColor: surfaceColor, borderColor }]}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Recent Issues</Text>
          {(analytics.total_issues || 0) > 0 ? (
            <TouchableOpacity 
              style={styles.viewAllButton}
              onPress={() => router.push({ pathname: '/(main)/(tabs)/issues', params: { site_id: id } })}
            >
              <Text style={{color: '#3b82f6', fontWeight: '600'}}>View all issues for this site →</Text>
            </TouchableOpacity>
          ) : (
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No recent activity reported.</Text>
          )}
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  backButton: { padding: 4, marginLeft: -4 },
  headerTitle: { fontSize: 14, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  placeholder: { width: 32 },
  content: { flex: 1 },
  card: { marginHorizontal: 16, marginTop: 16, padding: 20, borderRadius: 16, borderWidth: 1 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  siteName: { fontSize: 20, fontWeight: '700', marginBottom: 4 },
  siteLocation: { fontSize: 14 },
  healthBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, borderWidth: 1 },
  healthText: { fontSize: 12, fontWeight: '700' },
  scoreRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, paddingTop: 16, borderTopWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(0,0,0,0.1)' },
  scoreBox: { alignItems: 'center', flex: 1 },
  scoreValue: { fontSize: 24, fontWeight: '700', marginBottom: 4 },
  scoreLabel: { fontSize: 12, fontWeight: '500' },
  divider: { width: StyleSheet.hairlineWidth, height: 30, backgroundColor: 'rgba(0,0,0,0.1)' },
  sectionTitle: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 16 },
  chartContainer: { alignItems: 'center' },
  solverList: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  solverChip: { flexDirection: 'row', alignItems: 'center', padding: 8, paddingRight: 12, borderRadius: 20, gap: 8 },
  solverName: { fontSize: 13, fontWeight: '600', maxWidth: 80 },
  placeholderBox: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 8, backgroundColor: 'rgba(0,0,0,0.03)' },
  viewAllButton: { padding: 12, alignItems: 'center' },
  emptyText: { fontSize: 13, fontStyle: 'italic' },
  bottomPadding: { height: 40 },
});