import React, { useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSelector, useDispatch } from 'react-redux';
import Ionicons from '@expo/vector-icons/Ionicons';

import { useTheme } from '../../../../src/theme/ThemeContext';
import { selectCurrentUser } from '../../../../src/store/slices/authSlice';
import { selectSolverById, fetchSolversPerformance, selectPerformanceLoading } from '../../../../src/store/slices/performanceSlice';
import { issues } from '../../../../src/mocks/issues';
import { issueAssignments } from '../../../../src/mocks/issueAssignments';
import { solverSkills } from '../../../../src/mocks/solverSkills';
import { getSiteById } from '../../../../src/mocks/sites';
import Avatar from '../../../../src/components/common/Avatar';
import EmptyState from '../../../../src/components/common/EmptyState';
import StatusBadge from '../../../../src/components/common/StatusBadge';
import Loader from '../../../../src/components/common/Loader';

export default function SolverProfileScreen() {
  const { theme, isDark } = useTheme();
  const router = useRouter();
  const dispatch = useDispatch();
  const params = useLocalSearchParams();
  const requestedId = params.id ? parseInt(params.id, 10) : null;

  const currentUser = useSelector(selectCurrentUser);
  const loading = useSelector(selectPerformanceLoading);

  // Use the correct role name
  const solverId = currentUser?.role === 'problem_solver' || currentUser?.role === 'problemsolver'
    ? currentUser.id
    : requestedId;

  const solver = useSelector(state => solverId ? selectSolverById(state, solverId) : null);

  useEffect(() => {
    if (currentUser && !solver) {
      dispatch(fetchSolversPerformance(currentUser));
    }
  }, [dispatch, currentUser, solver]);

  console.log('🧑‍🔧 --- SOLVER PROFILE MOUNTED ---');
  console.log('Target Solver ID:', solverId);
  console.log('Performance Data Available:', !!solver?.performance);

  const bgColor = isDark ? '#212121' : '#f9f9f9';
  const surfaceColor = isDark ? '#171717' : '#ffffff';
  const borderColor = isDark ? '#333333' : '#e5e5e5';

  const assignments = useMemo(
    // 🚨 REVERTED TO SNAKE CASE: assigned_to_solver_id
    () => issueAssignments.filter(a => a.assigned_to_solver_id === solverId),
    [solverId]
  );

  const activeAssignments = useMemo(
    () => assignments.filter(a => a.status !== 'COMPLETED'),
    [assignments]
  );

  const activeIssues = useMemo(() =>
    activeAssignments.map(a => ({
      assignment: a,
      // 🚨 REVERTED TO SNAKE CASE: issue_id
      issue: issues.find(i => i.id === a.issue_id),
    })).filter(x => x.issue),
    [activeAssignments]
  );

  const completedIssues = useMemo(() =>
    assignments
      .filter(a => a.status === 'COMPLETED')
      // 🚨 REVERTED TO SNAKE CASE: issue_id
      .map(a => issues.find(i => i.id === a.issue_id))
      .filter(Boolean)
      .slice(-5)
      .reverse(),
    [assignments]
  );

  const skillsAndSites = useMemo(() => {
    // 🚨 REVERTED TO SNAKE CASE: solver_id
    const entries = solverSkills.filter(s => s.solver_id === solverId);
    const sitesMap = new Map();

    entries.forEach(e => {
      // 🚨 REVERTED TO SNAKE CASE: site_id
      const site = getSiteById(e.site_id);
      if (!site) return;
      if (!sitesMap.has(site.id)) {
        sitesMap.set(site.id, { ...site, skills: new Set() });
      }
      // 🚨 REVERTED TO SNAKE CASE: skill_type
      sitesMap.get(site.id).skills.add(e.skill_type);
    });

    return Array.from(sitesMap.values()).map(s => ({
      id: s.id,
      name: s.name,
      location: s.location,
      skills: Array.from(s.skills),
    }));
  }, [solverId]);

  if (loading && !solver) {
    return <Loader message="Loading profile..." fullScreen />;
  }

  if (!solver) {
    return (
      <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: bgColor }]}>
        <EmptyState icon="person-outline" title="Solver not found" message="This solver profile is not available." />
      </SafeAreaView>
    );
  }

  // Add fallback empty object just in case performance data isn't fully loaded
  const perf = solver.performance || {};
  const scoreColor = (perf.score || 0) >= 75 ? '#10a37f' : (perf.score || 0) >= 50 ? '#f59e0b' : '#ef4444';

  return (
    <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: bgColor }]}>
      <View style={[styles.header, { borderBottomColor: borderColor, backgroundColor: bgColor }]}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.6} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.textSecondary }]}>Solver Profile</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>

        {/* IDENTITY */}
        <View style={[styles.card, styles.flatCard, { backgroundColor: surfaceColor, borderColor }]}>
          <View style={styles.profileRow}>
            <Avatar uri={solver.avatar} name={solver.name} size="xlarge" />
            <View style={styles.profileInfo}>
              <Text style={[styles.name, { color: theme.text }]}>{solver.name}</Text>
              <Text style={[styles.role, { color: theme.textSecondary }]}>Problem Solver</Text>
              <Text style={[styles.phone, { color: theme.textSecondary }]}>{solver.phone || 'No phone added'}</Text>
            </View>
          </View>
        </View>

        {/* PERFORMANCE SCORE */}
        <View style={[styles.card, styles.flatCard, { backgroundColor: surfaceColor, borderColor }]}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Performance Score</Text>
          <View style={styles.scoreRow}>
            <View style={[styles.scoreCircle, { borderColor: scoreColor }]}>
              <Text style={[styles.scoreValue, { color: scoreColor }]}>{perf.score || 0}</Text>
              <Text style={[styles.scorePercent, { color: scoreColor }]}>%</Text>
            </View>
            <View style={styles.scoreInfo}>
              <Text style={[styles.scoreLabel, { color: theme.text }]}>{perf.label || 'Evaluating'}</Text>
              <Text style={[styles.scoreSub, { color: theme.textSecondary }]}>
                Completion {perf.completionRate || 0}% · On-time {perf.onTimeRate || 0}% · Calls answered {perf.callAnswerRate || 0}%
              </Text>
            </View>
          </View>
        </View>

        {/* STAT CARDS */}
        <View style={styles.statsRow}>
          {[
            { label: 'Total', value: perf.totalAssigned || 0 },
            { label: 'Completed', value: perf.completedCount || 0 },
            { label: 'Active', value: (perf.inProgressCount || 0) + (perf.assignedNotStartedCount || 0) + (perf.reopenedCount || 0) },
            { label: 'Escalated', value: perf.escalatedCount || 0 },
          ].map((stat, idx) => (
            <View key={idx} style={[styles.statCard, { backgroundColor: surfaceColor, borderColor }]}>
              <Text style={[styles.statValue, { color: theme.text }]}>{stat.value}</Text>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* RESPONSIVENESS */}
        <View style={[styles.card, styles.flatCard, { backgroundColor: surfaceColor, borderColor }]}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Responsiveness</Text>
          <View style={styles.responsiveRow}>
            <View style={styles.responsiveBox}>
              <Text style={[styles.responsiveLabel, { color: theme.textSecondary }]}>Calls</Text>
              <Text style={[styles.responsiveValue, { color: theme.text }]}>
                {perf.answeredCalls || 0} answered · {perf.missedCalls || 0} missed
              </Text>
            </View>
            <View style={styles.responsiveBox}>
              <Text style={[styles.responsiveLabel, { color: theme.textSecondary }]}>Complaints</Text>
              <Text style={[styles.responsiveValue, { color: (perf.complaintCount || 0) > 0 ? '#ef4444' : theme.text }]}>
                {perf.complaintCount || 0}
              </Text>
            </View>
          </View>
        </View>

        {/* ACTIVE ASSIGNMENTS */}
        <View style={[styles.card, styles.flatCard, { backgroundColor: surfaceColor, borderColor }]}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Active Assignments</Text>
          {activeIssues.length === 0 ? (
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No active assignments.</Text>
          ) : (
            activeIssues.map(item => (
              <TouchableOpacity
                key={item.assignment.id}
                style={styles.issueRow}
                activeOpacity={0.7}
                onPress={() => router.push({ pathname: '/(main)/(tabs)/dashboard/issue-detail', params: { id: item.issue.id } })}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.issueTitle, { color: theme.text }]} numberOfLines={2}>{item.issue.title}</Text>
                  <Text style={[styles.issueMeta, { color: theme.textSecondary }]}>#{item.issue.id} · {item.issue.priority.toUpperCase()}</Text>
                </View>
                <StatusBadge status={item.assignment.status} />
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* SKILLS & SITES */}
        {skillsAndSites.length > 0 && (
          <View style={[styles.card, styles.flatCard, { backgroundColor: surfaceColor, borderColor }]}>
            <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Skills & Sites</Text>
            {skillsAndSites.map(entry => (
              <View key={entry.id} style={styles.siteRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.siteName, { color: theme.text }]}>{entry.name}</Text>
                  <Text style={[styles.siteLocation, { color: theme.textSecondary }]}>{entry.location}</Text>
                </View>
                <View style={styles.skillChips}>
                  {entry.skills.map(skill => (
                    <View key={skill} style={styles.skillChip}>
                      <Text style={[styles.skillChipText, { color: theme.textSecondary }]}>{skill}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* RECENT COMPLETED */}
        <View style={[styles.card, styles.flatCard, { backgroundColor: surfaceColor, borderColor }]}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Recent Completed Issues</Text>
          {completedIssues.length === 0 ? (
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No completed issues yet.</Text>
          ) : (
            completedIssues.map(issue => (
              <TouchableOpacity
                key={issue.id}
                style={styles.issueRow}
                activeOpacity={0.7}
                onPress={() => router.push({ pathname: '/(main)/(tabs)/dashboard/issue-detail', params: { id: issue.id } })}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.issueTitle, { color: theme.text }]} numberOfLines={2}>{issue.title}</Text>
                  <Text style={[styles.issueMeta, { color: theme.textSecondary }]}>#{issue.id} · {issue.priority.toUpperCase()}</Text>
                </View>
                <StatusBadge status="COMPLETED" />
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
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  backButton: { padding: 4, marginLeft: -4 },
  headerTitle: { fontSize: 14, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  placeholder: { width: 32 },
  content: { flex: 1 },
  card: { marginHorizontal: 16, marginTop: 16, padding: 20 },
  flatCard: { borderRadius: 16, borderWidth: 1 },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  profileInfo: { flex: 1 },
  name: { fontSize: 22, fontWeight: '700', letterSpacing: -0.5, marginBottom: 4 },
  role: { fontSize: 13, marginBottom: 4 },
  phone: { fontSize: 13 },
  sectionTitle: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 16 },
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  scoreCircle: { width: 80, height: 80, borderRadius: 40, borderWidth: 4, justifyContent: 'center', alignItems: 'center' },
  scoreValue: { fontSize: 28, fontWeight: '700', letterSpacing: -0.5 },
  scorePercent: { fontSize: 13, fontWeight: '700' },
  scoreInfo: { flex: 1 },
  scoreLabel: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  scoreSub: { fontSize: 13, lineHeight: 20 },
  statsRow: { flexDirection: 'row', paddingHorizontal: 16, marginTop: 16, gap: 12 },
  statCard: { flex: 1, padding: 16, borderRadius: 16, borderWidth: 1 },
  statValue: { fontSize: 22, fontWeight: '700', letterSpacing: -0.5, marginBottom: 4 },
  statLabel: { fontSize: 12, fontWeight: '500' },
  responsiveRow: { flexDirection: 'row', gap: 16 },
  responsiveBox: { flex: 1 },
  responsiveLabel: { fontSize: 12, fontWeight: '500', marginBottom: 4 },
  responsiveValue: { fontSize: 14, fontWeight: '600' },
  emptyText: { fontSize: 13 },
  issueRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  issueTitle: { fontSize: 14, fontWeight: '600', marginBottom: 2 },
  issueMeta: { fontSize: 12 },
  siteRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  siteName: { fontSize: 14, fontWeight: '600' },
  siteLocation: { fontSize: 12 },
  skillChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  skillChip: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, borderWidth: StyleSheet.hairlineWidth },
  skillChipText: { fontSize: 11, fontWeight: '500' },
  bottomPadding: { height: 40 },
});