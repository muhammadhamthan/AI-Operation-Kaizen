import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../../src/theme/ThemeContext';
import { selectCurrentUser } from '../../../../src/store/slices/authSlice';
import { fetchIssueById, selectCurrentIssue, selectIssuesLoading, clearCurrentIssue } from '../../../../src/store/slices/issuesSlice';
import { calculateOverdueDays } from '../../../../src/utils/overdue';
import Card from '../../../../src/components/common/Card';
import StatusBadge from '../../../../src/components/common/StatusBadge';
import Avatar from '../../../../src/components/common/Avatar';
import Button from '../../../../src/components/common/Button';
import IssueTimeline from '../../../../src/components/issue/IssueTimeline';
import ImageGallery from '../../../../src/components/issue/ImageGallery';
import Loader from '../../../../src/components/common/Loader';

export default function NotFixedDetailScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const dispatch = useDispatch();
  const user = useSelector(selectCurrentUser);
  const issue = useSelector(selectCurrentIssue);
  const loading = useSelector(selectIssuesLoading);

  useEffect(() => {
    if (id) dispatch(fetchIssueById(parseInt(id)));
    return () => { dispatch(clearCurrentIssue()); };
  }, [id]);

  const overdueDays = issue ? calculateOverdueDays(issue.deadline_at, issue.status) : null;

  if (loading || !issue) return <Loader message="Loading issue details..." />;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { backgroundColor: '#f97316' }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Issue #{issue.id}</Text>
        <View style={styles.placeholder} />
      </View>

      {overdueDays && (
        <View style={styles.warningBanner}>
          <Ionicons name="warning" size={20} color="#fff" />
          <Text style={styles.warningText}>NOT FIXED - Overdue {overdueDays} day{overdueDays > 1 ? 's' : ''}</Text>
        </View>
      )}

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Card style={styles.card}>
          <View style={styles.statusRow}>
            <StatusBadge status={issue.status} size="medium" />
            <StatusBadge status={issue.priority} type="priority" size="medium" />
          </View>
          <Text style={[styles.title, { color: theme.text }]}>{issue.title}</Text>
          <Text style={[styles.description, { color: theme.textSecondary }]}>{issue.description}</Text>
        </Card>

        <Card style={styles.card}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Location</Text>
          <View style={styles.infoRow}>
            <Ionicons name="location" size={18} color={theme.primary} />
            <Text style={[styles.infoText, { color: theme.text }]}>{issue.site?.name}</Text>
          </View>
        </Card>

        <Card style={styles.card}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Photos</Text>
          <ImageGallery images={issue.images} />
        </Card>

        <Card style={styles.card}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Timeline</Text>
          <IssueTimeline history={issue.history || []} />
        </Card>

        <View style={styles.actions}>
          {user?.role === 'supervisor' && (
            <Button title="Raise Complaint" variant="danger" icon="alert-circle-outline" onPress={() => Alert.alert('Coming Soon', 'Phase 2-3')} />
          )}
          {user?.role === 'problem_solver' && (
            <Button title="Upload Fix Photo" variant="primary" icon="camera-outline" onPress={() => Alert.alert('Coming Soon', 'Phase 2-3')} />
          )}
        </View>
        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 16 },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#fff' },
  placeholder: { width: 32 },
  warningBanner: { backgroundColor: '#ef4444', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, gap: 8 },
  warningText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  content: { flex: 1, padding: 16 },
  card: { marginBottom: 16 },
  statusRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 8 },
  description: { fontSize: 15, lineHeight: 22 },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 12 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  infoText: { fontSize: 15 },
  actions: { marginTop: 8 },
});
