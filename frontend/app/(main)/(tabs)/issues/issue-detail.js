import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../../src/theme/ThemeContext';
import { selectIssueById } from '../../../../src/store/slices/issuesSlice';
import { formatDate, formatDateTime } from '../../../../src/utils/formatters';
import { calculateOverdueDays } from '../../../../src/utils/overdue';
import Card from '../../../../src/components/common/Card';
import StatusBadge from '../../../../src/components/common/StatusBadge';
import Loader from '../../../../src/components/common/Loader';

export default function IssueDetailScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { id, highlighted } = useLocalSearchParams();
  const issue = useSelector((state) => selectIssueById(state, parseInt(id)));
  
  const [highlightAnim] = useState(new Animated.Value(highlighted === 'true' ? 1 : 0));

  useEffect(() => {
    if (highlighted === 'true') {
      // Fade out highlight after 2 seconds
      Animated.timing(highlightAnim, {
        toValue: 0,
        duration: 2000,
        delay: 500,
        useNativeDriver: false,
      }).start();
    }
  }, [highlighted]);

  if (!issue) {
    return <Loader message="Loading issue details..." />;
  }

  const overdueDays = calculateOverdueDays(issue.deadline_at);
  const isOverdue = overdueDays > 0;

  const getStatusColor = (status) => {
    const colors = {
      OPEN: '#3b82f6',
      ASSIGNED: '#f97316',
      IN_PROGRESS: '#8b5cf6',
      RESOLVED_PENDING_REVIEW: '#eab308',
      COMPLETED: '#16a34a',
      REOPENED: '#ef4444',
      ESCALATED: '#dc2626',
    };
    return colors[status] || '#6b7280';
  };

  const getPriorityColor = (priority) => {
    const colors = {
      high: '#ef4444',
      medium: '#f97316',
      low: '#22c55e',
    };
    return colors[priority] || '#6b7280';
  };

  const highlightColor = highlightAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [theme.card, '#fef3c7'],
  });

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <Animated.View style={[styles.header, { backgroundColor: highlightColor, borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Issue #{issue.id}</Text>
        <View style={styles.placeholder} />
      </Animated.View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Title & Status */}
        <Animated.View style={{ backgroundColor: highlightColor }}>
          <Card style={styles.card}>
            <Text style={[styles.issueTitle, { color: theme.text }]}>{issue.title}</Text>
            <View style={styles.badgeRow}>
              <Badge 
                label={issue.status.replace('_', ' ')} 
                color={getStatusColor(issue.status)} 
              />
              <Badge 
                label={issue.priority.toUpperCase()} 
                color={getPriorityColor(issue.priority)} 
              />
              {isOverdue && (
                <Badge label={`${overdueDays}d overdue`} color="#ef4444" />
              )}
            </View>
          </Card>
        </Animated.View>

        {/* Description */}
        <Card style={styles.card}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Description</Text>
          <Text style={[styles.description, { color: theme.textSecondary }]}>
            {issue.description}
          </Text>
        </Card>

        {/* Site & Location */}
        <Card style={styles.card}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Location</Text>
          <View style={styles.infoRow}>
            <Ionicons name="location" size={20} color={theme.primary} />
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Site</Text>
              <Text style={[styles.infoValue, { color: theme.text }]}>{issue.site?.name || 'N/A'}</Text>
            </View>
          </View>
          {issue.site?.location && (
            <View style={styles.infoRow}>
              <Ionicons name="map" size={20} color={theme.primary} />
              <View style={styles.infoContent}>
                <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Address</Text>
                <Text style={[styles.infoValue, { color: theme.text }]}>{issue.site.location}</Text>
              </View>
            </View>
          )}
        </Card>

        {/* Raised By */}
        <Card style={styles.card}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Raised By</Text>
          <View style={styles.infoRow}>
            <Ionicons name="person" size={20} color={theme.primary} />
            <View style={styles.infoContent}>
              <Text style={[styles.infoValue, { color: theme.text }]}>{issue.raised_by?.name || 'N/A'}</Text>
              <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>
                {formatDateTime(issue.created_at)}
              </Text>
            </View>
          </View>
        </Card>

        {/* Assignment */}
        {issue.assignment && (
          <Card style={styles.card}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Assigned To</Text>
            <View style={styles.infoRow}>
              <Ionicons name="person-circle" size={20} color={theme.primary} />
              <View style={styles.infoContent}>
                <Text style={[styles.infoValue, { color: theme.text }]}>
                  {issue.assignment.assigned_to?.name || 'N/A'}
                </Text>
                <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>
                  {issue.assignment.assigned_to?.phone}
                </Text>
              </View>
            </View>
            {issue.assignment.due_date && (
              <View style={styles.infoRow}>
                <Ionicons name="calendar" size={20} color={theme.primary} />
                <View style={styles.infoContent}>
                  <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Due Date</Text>
                  <Text style={[styles.infoValue, { color: theme.text }]}>
                    {formatDate(issue.assignment.due_date)}
                  </Text>
                </View>
              </View>
            )}
          </Card>
        )}

        {/* Deadline */}
        <Card style={styles.card}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Timeline</Text>
          <View style={styles.infoRow}>
            <Ionicons name="time" size={20} color={isOverdue ? '#ef4444' : theme.primary} />
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Deadline</Text>
              <Text style={[styles.infoValue, { color: isOverdue ? '#ef4444' : theme.text }]}>
                {formatDate(issue.deadline_at)}
                {isOverdue && ` (${overdueDays} days overdue)`}
              </Text>
            </View>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="create" size={20} color={theme.primary} />
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Created</Text>
              <Text style={[styles.infoValue, { color: theme.text }]}>
                {formatDateTime(issue.created_at)}
              </Text>
            </View>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="refresh" size={20} color={theme.primary} />
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Last Updated</Text>
              <Text style={[styles.infoValue, { color: theme.text }]}>
                {formatDateTime(issue.updated_at)}
              </Text>
            </View>
          </View>
        </Card>

        {/* Images */}
        {issue.images && issue.images.length > 0 && (
          <Card style={styles.card}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Images</Text>
            {issue.images.map((img, index) => (
              <View key={index} style={styles.imageContainer}>
                <View style={styles.imageHeader}>
                  <Badge 
                    label={img.image_type} 
                    color={img.image_type === 'BEFORE' ? '#f97316' : '#16a34a'} 
                  />
                  {img.ai_flag && img.ai_flag !== 'NOT_CHECKED' && (
                    <Badge 
                      label={`AI: ${img.ai_flag}`} 
                      color={img.ai_flag === 'OK' ? '#16a34a' : '#ef4444'} 
                    />
                  )}
                </View>
                <Image
                  source={{ uri: img.image_url }}
                  style={styles.image}
                  resizeMode="cover"
                />
                <Text style={[styles.imageDate, { color: theme.textSecondary }]}>
                  Uploaded: {formatDateTime(img.created_at)}
                </Text>
              </View>
            ))}
          </Card>
        )}

        {/* Call Logs */}
        {issue.call_logs && issue.call_logs.length > 0 && (
          <Card style={styles.card}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Call Logs</Text>
            {issue.call_logs.map((log, index) => (
              <View key={index} style={[styles.callLog, { borderBottomColor: theme.border }]}>
                <View style={styles.callLogHeader}>
                  <Text style={[styles.callAttempt, { color: theme.text }]}>
                    Attempt #{log.attempt_number}
                  </Text>
                  <Badge 
                    label={log.status} 
                    color={log.status === 'ANSWERED' ? '#16a34a' : '#ef4444'} 
                  />
                </View>
                <Text style={[styles.callTime, { color: theme.textSecondary }]}>
                  {formatDateTime(log.initiated_at)}
                </Text>
              </View>
            ))}
          </Card>
        )}

        {/* History */}
        {issue.history && issue.history.length > 0 && (
          <Card style={styles.card}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>History</Text>
            {issue.history.map((item, index) => (
              <View key={index} style={[styles.historyItem, { borderLeftColor: theme.primary }]}>
                <Text style={[styles.historyAction, { color: theme.text }]}>
                  {item.action_type}
                </Text>
                <Text style={[styles.historyDetails, { color: theme.textSecondary }]}>
                  {item.details}
                </Text>
                <Text style={[styles.historyTime, { color: theme.textSecondary }]}>
                  {formatDateTime(item.created_at)} by {item.changed_by?.name || 'System'}
                </Text>
              </View>
            ))}
          </Card>
        )}

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
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  placeholder: {
    width: 32,
  },
  content: {
    flex: 1,
  },
  card: {
    marginHorizontal: 16,
    marginTop: 16,
  },
  issueTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '500',
  },
  imageContainer: {
    marginBottom: 16,
  },
  imageHeader: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  image: {
    width: '100%',
    height: 200,
    borderRadius: 8,
  },
  imageDate: {
    fontSize: 12,
    marginTop: 4,
  },
  callLog: {
    paddingBottom: 12,
    marginBottom: 12,
    borderBottomWidth: 1,
  },
  callLogHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  callAttempt: {
    fontSize: 14,
    fontWeight: '500',
  },
  callTime: {
    fontSize: 12,
  },
  historyItem: {
    borderLeftWidth: 3,
    paddingLeft: 12,
    marginBottom: 16,
  },
  historyAction: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  historyDetails: {
    fontSize: 13,
    marginBottom: 4,
  },
  historyTime: {
    fontSize: 11,
  },
  bottomPadding: {
    height: 32,
  },
});
