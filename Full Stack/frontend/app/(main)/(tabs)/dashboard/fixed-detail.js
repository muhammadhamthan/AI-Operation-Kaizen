import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
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
  const { theme } = useTheme();
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

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { backgroundColor: '#16a34a' }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Ionicons name="checkmark-circle" size={20} color="#fff" />
          <Text style={styles.headerTitle}>COMPLETED</Text>
        </View>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Performance Metrics */}
        <Card style={[styles.card, { backgroundColor: '#dcfce7' }]}>
          <Text style={[styles.metricsTitle, { color: '#166534' }]}>Performance Metrics</Text>
          <View style={styles.metricsRow}>
            <View style={styles.metricItem}>
              <Ionicons name="time-outline" size={20} color="#166534" />
              <Text style={[styles.metricValue, { color: '#166534' }]}>{resolutionTime || 'N/A'}</Text>
              <Text style={[styles.metricLabel, { color: '#166534' }]}>Resolution Time</Text>
            </View>
            <View style={styles.metricItem}>
              <Ionicons name="call-outline" size={20} color="#166534" />
              <Text style={[styles.metricValue, { color: '#166534' }]}>{issue.callLogs?.length || 0}</Text>
              <Text style={[styles.metricLabel, { color: '#166534' }]}>Call Attempts</Text>
            </View>
          </View>
        </Card>

        <Card style={styles.card}>
          <Text style={[styles.issueId, { color: theme.primary }]}>Issue #{issue.id}</Text>
          <Text style={[styles.title, { color: theme.text }]}>{issue.title}</Text>
          <Text style={[styles.description, { color: theme.textSecondary }]}>{issue.description}</Text>
          <View style={styles.badges}>
            <StatusBadge status={issue.priority} type="priority" size="small" />
            <View style={styles.typeTag}>
              <Text style={[styles.typeText, { color: theme.textSecondary }]}>{issue.issue_type}</Text>
            </View>
          </View>
        </Card>

        <Card style={styles.card}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Before / After Photos</Text>
          <ImageGallery images={issue.images} />
        </Card>

        <Card style={styles.card}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Participants</Text>
          <View style={styles.participantsRow}>
            {issue.raisedBy && (
              <View style={styles.participant}>
                <Avatar uri={issue.raisedBy.avatar} name={issue.raisedBy.name} size="medium" />
                <Text style={[styles.participantName, { color: theme.text }]}>{issue.raisedBy.name}</Text>
                <Text style={[styles.participantRole, { color: theme.textSecondary }]}>Supervisor</Text>
              </View>
            )}
            {issue.solver && (
              <View style={styles.participant}>
                <Avatar uri={issue.solver.avatar} name={issue.solver.name} size="medium" />
                <Text style={[styles.participantName, { color: theme.text }]}>{issue.solver.name}</Text>
                <Text style={[styles.participantRole, { color: theme.textSecondary }]}>Solver</Text>
              </View>
            )}
          </View>
        </Card>

        <Card style={styles.card}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Full Timeline</Text>
          <IssueTimeline history={issue.history || []} />
        </Card>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 16 },
  backButton: { padding: 4 },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#fff' },
  placeholder: { width: 32 },
  content: { flex: 1, padding: 16 },
  card: { marginBottom: 16 },
  metricsTitle: { fontSize: 14, fontWeight: '600', marginBottom: 12 },
  metricsRow: { flexDirection: 'row', justifyContent: 'space-around' },
  metricItem: { alignItems: 'center', gap: 4 },
  metricValue: { fontSize: 24, fontWeight: '700' },
  metricLabel: { fontSize: 12 },
  issueId: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 8 },
  description: { fontSize: 15, lineHeight: 22, marginBottom: 12 },
  badges: { flexDirection: 'row', gap: 8 },
  typeTag: { backgroundColor: '#f3f4f6', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  typeText: { fontSize: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 12 },
  participantsRow: { flexDirection: 'row', justifyContent: 'space-around' },
  participant: { alignItems: 'center', gap: 6 },
  participantName: { fontSize: 14, fontWeight: '500' },
  participantRole: { fontSize: 12 },
});
