import React, { useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSelector, useDispatch } from 'react-redux';
import Ionicons from '@expo/vector-icons/Ionicons';

import { useTheme } from '../../../../src/theme/ThemeContext';
import { selectCurrentUser } from '../../../../src/store/slices/authSlice';
import { selectSolverById, fetchSolversPerformance, selectPerformanceLoading } from '../../../../src/store/slices/performanceSlice';

// 🚨 REMOVED ALL MOCK IMPORTS 🚨
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

  const bgColor = isDark ? '#212121' : '#f9f9f9';
  const surfaceColor = isDark ? '#171717' : '#ffffff';
  const borderColor = isDark ? '#333333' : '#e5e5e5';

  // The backend doesn't currently embed issue arrays in the solvers list, 
  // so we default to empty arrays to prevent crashes.
  const activeIssues = [];
  const completedIssues = [];

  if (loading && !solver) {
    return <Loader message="Loading profile..." fullScreen />;
  }

  if (!solver) {
    return (
      <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: bgColor }]}>
        <View style={[styles.header, { borderBottomColor: borderColor, backgroundColor: bgColor }]}>
          <TouchableOpacity onPress={() => router.back()} activeOpacity={0.6} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color={theme.text} />
          </TouchableOpacity>
        </View>
        <EmptyState icon="person-outline" title="Solver not found" message="This solver profile is not available." />
      </SafeAreaView>
    );
  }

  // ✅ EXTRACTED REAL SNAKE_CASE PERFORMANCE DATA
  const perf = solver.performance || {};
  
  // Use exact label color from backend if available
  const scoreColor = perf.label_color || (
    (perf.score || 0) >= 75 ? '#10a37f' : (perf.score || 0) >= 50 ? '#f59e0b' : '#ef4444'
  );

  const activeCount = 
    (perf.in_progress_count || 0) + 
    (perf.assigned_not_started_count || 0) + 
    (perf.reopened_count || 0) + 
    (perf.active_count || 0);

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
              <Text style={[styles.role, { color: theme.textSecondary }]}>
                {solver.skills?.length > 0 
                  ? solver.skills.map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(', ') 
                  : 'Problem Solver'}
              </Text>
              <Text style={[styles.phone, { color: theme.textSecondary }]}>{solver.phone || 'No phone added'}</Text>
              {solver.email && (
                <Text style={[styles.phone, { color: theme.textSecondary, marginTop: 2 }]}>{solver.email}</Text>
              )}
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
                Completion {perf.completion_rate || 0}% · On-time {perf.on_time_rate || 0}% · Calls answered {perf.call_answer_rate || 0}%
              </Text>
            </View>
          </View>
        </View>

        {/* STAT CARDS */}
        <View style={styles.statsRow}>
          {[
           { label: 'Total', value: perf.total_assigned || 0 },
            { label: 'Completed', value: perf.completed_count || 0 },
            { label: 'Active', value: activeCount },
            { label: 'Overdue', value: perf.overdue_count || 0 }, // ✅ NOW USING OVERDUE DATA
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
                {perf.answered_calls || 0} answered · {perf.missed_calls || 0} missed
              </Text>
            </View>
            <View style={styles.responsiveBox}>
              <Text style={[styles.responsiveLabel, { color: theme.textSecondary }]}>Complaints</Text>
              <Text style={[styles.responsiveValue, { color: (perf.complaint_count || 0) > 0 ? '#ef4444' : theme.text }]}>
                {perf.complaint_count || 0}
              </Text>
            </View>
          </View>
        </View>

        {/* SKILLS & SITES (Updated to handle raw arrays from backend) */}
        {(solver.skills?.length > 0 || solver.sites?.length > 0) && (
          <View style={[styles.card, styles.flatCard, { backgroundColor: surfaceColor, borderColor }]}>
            
            {solver.skills?.length > 0 && (
              <>
                <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Trade Skills</Text>
                <View style={[styles.skillChips, { marginBottom: solver.sites?.length > 0 ? 20 : 0 }]}>
                  {solver.skills.map(skill => (
                    <View key={skill} style={[styles.skillChip, { borderColor }]}>
                      <Text style={[styles.skillChipText, { color: theme.textSecondary }]}>
                        {skill.charAt(0).toUpperCase() + skill.slice(1)}
                      </Text>
                    </View>
                  ))}
                </View>
              </>
            )}

            {solver.sites?.length > 0 && (
              <>
                <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Assigned Sites</Text>
                <View style={styles.skillChips}>
                  {solver.sites.map(site => (
                    <View key={site} style={[styles.skillChip, { borderColor }]}>
                      <Text style={[styles.skillChipText, { color: theme.textSecondary }]}>{site}</Text>
                    </View>
                  ))}
                </View>
              </>
            )}
          </View>
        )}

       

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
  skillChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  skillChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: StyleSheet.hairlineWidth },
  skillChipText: { fontSize: 13, fontWeight: '500' },
  bottomPadding: { height: 40 },
});