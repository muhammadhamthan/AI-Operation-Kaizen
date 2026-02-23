import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../../src/theme/ThemeContext';
import { fetchIssueById, selectCurrentIssue, selectIssuesLoading, clearCurrentIssue } from '../../../../src/store/slices/issuesSlice';
import { formatDate, formatDurationFromDates } from '../../../../src/utils/formatters';
import Card from '../../../../src/components/common/Card';
import StatusBadge from '../../../../src/components/common/StatusBadge';
import Avatar from '../../../../src/components/common/Avatar';
import IssueTimeline from '../../../../src/components/issue/IssueTimeline';
import ImageGallery from '../../../../src/components/issue/ImageGallery';
import Loader from '../../../../src/components/common/Loader';

export default function FixedDetailScreen() {
  const { theme, isDark } = useTheme(); // 🚀 Pulled in isDark for precise shading
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const dispatch = useDispatch();
  const issue = useSelector(selectCurrentIssue);
  const loading = useSelector(selectIssuesLoading);

  useEffect(() => {
    if (id) dispatch(fetchIssueById(parseInt(id)));
    return () => { dispatch(clearCurrentIssue()); };
  }, [id]);

  if (loading || !issue) return <Loader message="Loading issue details..." />;

  const resolutionTime = formatDurationFromDates(issue.created_at, issue.updated_at);

  // ── PREMIUM PALETTE ──
  const bgColor = isDark ? '#212121' : '#f9f9f9';
  const surfaceColor = isDark ? '#171717' : '#ffffff';
  const borderColor = isDark ? '#333333' : '#e5e5e5';
  const iconBg = isDark ? 'rgba(255,255,255,0.05)' : '#f4f4f4';
  const successColor = '#10a37f'; // OpenAI Green
  const successBg = isDark ? 'rgba(16, 163, 127, 0.15)' : 'rgba(16, 163, 127, 0.1)';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]}>
      
      {/* ── HEADER ── */}
      <View style={[styles.header, { backgroundColor: bgColor, borderBottomColor: borderColor }]}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.6} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.textSecondary }]}>Resolution Report</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        
        {/* ── ISSUE IDENTITY & STATUS ── */}
        <View style={[styles.card, styles.flatCard, { backgroundColor: surfaceColor, borderColor }]}>
          <View style={styles.idRow}>
            <Text style={[styles.issueId, { color: theme.textSecondary }]}>ISSUE #{issue.id}</Text>
            <View style={[styles.successBadge, { backgroundColor: successBg }]}>
              <Ionicons name="checkmark-circle" size={14} color={successColor} />
              <Text style={[styles.successText, { color: successColor }]}>Completed</Text>
            </View>
          </View>
          
          <Text style={[styles.title, { color: theme.text }]}>{issue.title}</Text>
          <Text style={[styles.description, { color: theme.textSecondary }]}>{issue.description}</Text>
          
          <View style={styles.badges}>
            <StatusBadge status={issue.priority} type="priority" size="small" />
            <View style={[styles.typeTag, { backgroundColor: iconBg }]}>
              <Text style={[styles.typeText, { color: theme.text }]}>{issue.issue_type}</Text>
            </View>
          </View>
        </View>

        {/* ── PERFORMANCE METRICS ── */}
        <View style={styles.metricsContainer}>
          <View style={[styles.metricCard, styles.flatCard, { backgroundColor: surfaceColor, borderColor }]}>
            <View style={[styles.metricIconWrapper, { backgroundColor: successBg }]}>
              <Ionicons name="time-outline" size={20} color={successColor} />
            </View>
            <Text style={[styles.metricValue, { color: theme.text }]}>{resolutionTime || 'N/A'}</Text>
            <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>Resolution Time</Text>
          </View>
          
          <View style={[styles.metricCard, styles.flatCard, { backgroundColor: surfaceColor, borderColor }]}>
            <View style={[styles.metricIconWrapper, { backgroundColor: iconBg }]}>
              <Ionicons name="cellular-outline" size={20} color={theme.textSecondary} />
            </View>
            <Text style={[styles.metricValue, { color: theme.text }]}>{issue.callLogs?.length || 0}</Text>
            <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>Call Attempts</Text>
          </View>
        </View>

        {/* ── PHOTOS ── */}
        <View style={[styles.card, styles.flatCard, { backgroundColor: surfaceColor, borderColor }]}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Before & After</Text>
          <ImageGallery images={issue.images} />
        </View>

        {/* ── PARTICIPANTS ── */}
        <View style={[styles.card, styles.flatCard, { backgroundColor: surfaceColor, borderColor }]}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Participants</Text>
          <View style={styles.peopleGrid}>
            {issue.raisedBy && (
              <View style={[styles.personRow, { borderBottomColor: borderColor, borderBottomWidth: StyleSheet.hairlineWidth }]}>
                <Avatar uri={issue.raisedBy.avatar} name={issue.raisedBy.name} size="medium" />
                <View style={styles.personInfo}>
                  <Text style={[styles.personName, { color: theme.text }]}>{issue.raisedBy.name}</Text>
                  <Text style={[styles.personRole, { color: theme.textSecondary }]}>Supervisor</Text>
                </View>
              </View>
            )}
            
            {issue.solver && (
              <View style={[styles.personRow, { paddingTop: 12 }]}>
                <Avatar uri={issue.solver.avatar} name={issue.solver.name} size="medium" />
                <View style={styles.personInfo}>
                  <Text style={[styles.personName, { color: theme.text }]}>{issue.solver.name}</Text>
                  <Text style={[styles.personRole, { color: theme.textSecondary }]}>Solver</Text>
                </View>
                <Ionicons name="checkmark-done" size={20} color={successColor} />
              </View>
            )}
          </View>
        </View>

        {/* ── TIMELINE ── */}
        <View style={[styles.card, styles.flatCard, { backgroundColor: surfaceColor, borderColor }]}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Full Timeline</Text>
          <IssueTimeline history={issue.history || []} />
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
    padding: 20 
  },
  flatCard: {
    borderRadius: 16,
    borderWidth: 1,
    ...Platform.select({
      ios: { shadowOpacity: 0 },
      android: { elevation: 0 },
    }),
  },

  idRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  issueId: { fontSize: 13, fontWeight: '700', letterSpacing: 0.5 },
  successBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, gap: 4 },
  successText: { fontSize: 12, fontWeight: '700', letterSpacing: 0.2 },
  
  title: { fontSize: 22, fontWeight: '700', letterSpacing: -0.5, marginBottom: 8, lineHeight: 28 },
  description: { fontSize: 15, lineHeight: 24, letterSpacing: -0.1, marginBottom: 16 },
  
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeTag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  typeText: { fontSize: 12, fontWeight: '600' },
  
  metricsContainer: { flexDirection: 'row', paddingHorizontal: 16, marginTop: 16, gap: 12 },
  metricCard: { flex: 1, padding: 16, alignItems: 'flex-start' },
  metricIconWrapper: { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  metricValue: { fontSize: 24, fontWeight: '700', letterSpacing: -0.5, marginBottom: 2, fontVariant: ['tabular-nums'] },
  metricLabel: { fontSize: 12, fontWeight: '500' },
  
  sectionTitle: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 16 },
  
  peopleGrid: { flexDirection: 'column' },
  personRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 12, 
    paddingBottom: 12 
  },
  personInfo: { flex: 1, justifyContent: 'center' },
  personName: { fontSize: 15, fontWeight: '600', letterSpacing: -0.2, marginBottom: 2 },
  personRole: { fontSize: 13 },

  bottomPadding: { height: 40 },
});