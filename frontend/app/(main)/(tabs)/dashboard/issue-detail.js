import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../../src/theme/ThemeContext';
import { selectCurrentUser } from '../../../../src/store/slices/authSlice';
import { fetchIssueById, selectCurrentIssue, selectIssuesLoading, clearCurrentIssue } from '../../../../src/store/slices/issuesSlice';
import Card from '../../../../src/components/common/Card';
import StatusBadge from '../../../../src/components/common/StatusBadge';
import Avatar from '../../../../src/components/common/Avatar';
import Button from '../../../../src/components/common/Button';
import IssueTimeline from '../../../../src/components/issue/IssueTimeline';
import ImageGallery from '../../../../src/components/issue/ImageGallery';
import CallHistorySection from '../../../../src/components/issue/CallHistorySection';
import Loader from '../../../../src/components/common/Loader';

export default function IssueDetailScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const dispatch = useDispatch();
  const user = useSelector(selectCurrentUser);
  const issue = useSelector(selectCurrentIssue);
  const loading = useSelector(selectIssuesLoading);

  useEffect(() => {
    if (id) {
      dispatch(fetchIssueById(parseInt(id)));
    }
    return () => {
      dispatch(clearCurrentIssue());
    };
  }, [id]);

  const handleAction = (action) => {
    Alert.alert('Coming Soon', `${action} functionality will be available in Phase 2-3`);
  };

  if (loading || !issue) {
    return <Loader message="Loading issue details..." />;
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Issue #{issue.id}</Text>
          <StatusBadge status={issue.status} size="small" />
        </View>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Issue Info Card */}
        <Card style={styles.card}>
          <Text style={[styles.title, { color: theme.text }]}>{issue.title}</Text>
          <Text style={[styles.description, { color: theme.textSecondary }]}>
            {issue.description}
          </Text>

          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Ionicons name="location-outline" size={16} color={theme.textSecondary} />
              <Text style={[styles.infoText, { color: theme.textSecondary }]}>
                {issue.site?.name}
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Ionicons name="construct-outline" size={16} color={theme.textSecondary} />
              <Text style={[styles.infoText, { color: theme.textSecondary }]}>
                {issue.issue_type}
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Ionicons name="flag-outline" size={16} color={theme.textSecondary} />
              <StatusBadge status={issue.priority} type="priority" size="small" />
            </View>
          </View>
        </Card>

        {/* People Involved */}
        <Card style={styles.card}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>People Involved</Text>
          <View style={styles.peopleRow}>
            <View style={styles.personItem}>
              <Avatar uri={issue.raisedBy?.avatar} name={issue.raisedBy?.name} size="medium" />
              <Text style={[styles.personName, { color: theme.text }]} numberOfLines={1}>
                {issue.raisedBy?.name}
              </Text>
              <Text style={[styles.personRole, { color: theme.textSecondary }]}>Raised By</Text>
            </View>
            {issue.solver && (
              <View style={styles.personItem}>
                <Avatar uri={issue.solver?.avatar} name={issue.solver?.name} size="medium" />
                <Text style={[styles.personName, { color: theme.text }]} numberOfLines={1}>
                  {issue.solver?.name}
                </Text>
                <Text style={[styles.personRole, { color: theme.textSecondary }]}>Assigned To</Text>
              </View>
            )}
          </View>
        </Card>

        {/* Photos */}
        <Card style={styles.card}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Photos</Text>
          <ImageGallery images={issue.images} />
        </Card>

        {/* Timeline */}
        <Card style={styles.card}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Timeline</Text>
          <IssueTimeline history={issue.history || []} />
        </Card>

        {/* Call History - Solver only */}
        {user?.role === 'problem_solver' && issue.callLogs?.length > 0 && (
          <CallHistorySection callLogs={issue.callLogs} />
        )}

        {/* Action Buttons */}
        <View style={styles.actions}>
          {user?.role === 'supervisor' && (
            <>
              <Button
                title="Raise Complaint"
                variant="danger"
                icon="alert-circle-outline"
                onPress={() => handleAction('Raise Complaint')}
              />
              <Button
                title="Mark Complete"
                variant="success"
                icon="checkmark-circle-outline"
                onPress={() => handleAction('Mark Complete')}
                style={styles.buttonMargin}
              />
            </>
          )}
          {user?.role === 'problem_solver' && (
            <Button
              title="Upload Fix Photo"
              variant="primary"
              icon="camera-outline"
              onPress={() => handleAction('Upload Fix Photo')}
            />
          )}
          {user?.role === 'manager' && (
            <>
              <Button
                title="Escalate"
                variant="danger"
                icon="arrow-up-circle-outline"
                onPress={() => handleAction('Escalate')}
              />
              <Button
                title="Re-assign"
                variant="secondary"
                icon="swap-horizontal-outline"
                onPress={() => handleAction('Re-assign')}
                style={styles.buttonMargin}
              />
            </>
          )}
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 4,
  },
  headerCenter: {
    alignItems: 'center',
    gap: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  placeholder: {
    width: 32,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  card: {
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 16,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoText: {
    fontSize: 14,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  peopleRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  personItem: {
    alignItems: 'center',
    gap: 6,
  },
  personName: {
    fontSize: 14,
    fontWeight: '500',
    maxWidth: 100,
    textAlign: 'center',
  },
  personRole: {
    fontSize: 12,
  },
  actions: {
    marginTop: 8,
  },
  buttonMargin: {
    marginTop: 12,
  },
  bottomPadding: {
    height: 32,
  },
});
