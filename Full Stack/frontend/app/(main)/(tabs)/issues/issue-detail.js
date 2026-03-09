import { useDispatch } from 'react-redux';//new import for dispatching actions
import { fetchIssueById } from '../../../../src/store/slices/issuesSlice';//new import for fetching issue details
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Animated,
  Platform,
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
  const { theme, isDark } = useTheme(); // 🚀 Added isDark for premium shading
  const router = useRouter();
  const { id, highlighted } = useLocalSearchParams();
  //new
  const dispatch = useDispatch();

  const issue = useSelector((state) => selectIssueById(state, parseInt(id)));

  useEffect(() => {
    if (id) {
      dispatch(fetchIssueById(parseInt(id)));
    }
  }, [id]);
  //new
  const [highlightAnim] = useState(new Animated.Value(highlighted === 'true' ? 1 : 0));

  useEffect(() => {
    if (highlighted === 'true') {
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

  // Modernized semantic colors
  const getStatusColor = (status) => {
    const colors = {
      OPEN: '#3b82f6',
      ASSIGNED: '#f59e0b',
      IN_PROGRESS: '#8b5cf6',
      RESOLVED_PENDING_REVIEW: '#eab308',
      COMPLETED: '#10a37f', // OpenAI Green
      REOPENED: '#ef4444',
      ESCALATED: '#ef4444',
    };
    return colors[status] || '#8e8ea0';
  };

  const getPriorityColor = (priority) => {
    const colors = {
      high: '#ef4444',
      medium: '#f59e0b',
      low: '#10a37f', // OpenAI Green
    };
    return colors[priority] || '#8e8ea0';
  };

  // Premium Palette
  const bgColor = isDark ? '#212121' : '#f9f9f9';
  const surfaceColor = isDark ? '#171717' : '#ffffff';
  const borderColor = isDark ? '#333333' : '#e5e5e5';
  const iconBg = isDark ? 'rgba(255,255,255,0.05)' : '#f4f4f4';

  // Subtler, more premium highlight flash
  const highlightColor = highlightAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [surfaceColor, isDark ? '#3f3f46' : '#fef9c3'],
  });

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]}>
      
      {/* ── HEADER ── */}
      <View style={[styles.header, { backgroundColor: bgColor, borderBottomColor: borderColor }]}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.6} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.textSecondary }]}>Issue #{issue.id}</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        
        {/* ── TITLE & STATUS ── */}
        <Animated.View style={[styles.card, styles.flatCard, { backgroundColor: highlightColor, borderColor }]}>
          <Text style={[styles.issueTitle, { color: theme.text }]}>{issue.title}</Text>
          <View style={styles.badgeRow}>
            <StatusBadge 
              label={issue.status.replace('_', ' ')} 
              color={getStatusColor(issue.status)} 
            />
            <StatusBadge 
              label={issue.priority.toUpperCase()} 
              color={getPriorityColor(issue.priority)} 
            />
            {isOverdue && (
              <StatusBadge label={`${overdueDays}d overdue`} color="#ef4444" />
            )}
          </View>
        </Animated.View>

        {/* ── DESCRIPTION ── */}
        <View style={[styles.card, styles.flatCard, { backgroundColor: surfaceColor, borderColor }]}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Description</Text>
          <Text style={[styles.description, { color: theme.text }]}>
            {issue.description}
          </Text>
        </View>

        {/* ── LOCATION ── */}
        <View style={[styles.card, styles.flatCard, { backgroundColor: surfaceColor, borderColor }]}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Location</Text>
          
          <View style={styles.infoRow}>
            <View style={[styles.iconWrapper, { backgroundColor: iconBg }]}>
              <Ionicons name="location-outline" size={18} color={theme.textSecondary} />
            </View>
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Site</Text>
              <Text style={[styles.infoValue, { color: theme.text }]}>{issue.site?.name || 'N/A'}</Text>
            </View>
          </View>
          
          {issue.site?.location && (
            <View style={styles.infoRow}>
              <View style={[styles.iconWrapper, { backgroundColor: iconBg }]}>
                <Ionicons name="map-outline" size={18} color={theme.textSecondary} />
              </View>
              <View style={styles.infoContent}>
                <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Address</Text>
                <Text style={[styles.infoValue, { color: theme.text }]}>{issue.site.location}</Text>
              </View>
            </View>
          )}
        </View>

        {/* ── RAISED BY ── */}
        <View style={[styles.card, styles.flatCard, { backgroundColor: surfaceColor, borderColor }]}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Raised By</Text>
          <View style={styles.infoRow}>
            <View style={[styles.iconWrapper, { backgroundColor: iconBg }]}>
              <Ionicons name="person-outline" size={18} color={theme.textSecondary} />
            </View>
            <View style={styles.infoContent}>
              <Text style={[styles.infoValue, { color: theme.text }]}>{issue.raised_by?.name || 'N/A'}</Text>
              <Text style={[styles.infoLabel, { color: theme.textSecondary, marginTop: 2 }]}>
                {formatDateTime(issue.created_at)}
              </Text>
            </View>
          </View>
        </View>

        {/* ── ASSIGNMENT ── */}
        {issue.assignment && (
          <View style={[styles.card, styles.flatCard, { backgroundColor: surfaceColor, borderColor }]}>
            <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Assigned To</Text>
            
            <View style={styles.infoRow}>
              <View style={[styles.iconWrapper, { backgroundColor: iconBg }]}>
                <Ionicons name="briefcase-outline" size={18} color={theme.textSecondary} />
              </View>
              <View style={styles.infoContent}>
                <Text style={[styles.infoValue, { color: theme.text }]}>
                  {issue.assignment.assigned_to?.name || 'N/A'}
                </Text>
                {issue.assignment.assigned_to?.phone && (
                  <Text style={[styles.infoLabel, { color: theme.textSecondary, marginTop: 2 }]}>
                    {issue.assignment.assigned_to.phone}
                  </Text>
                )}
              </View>
            </View>
            
            {issue.assignment.due_date && (
              <View style={styles.infoRow}>
                <View style={[styles.iconWrapper, { backgroundColor: iconBg }]}>
                  <Ionicons name="calendar-outline" size={18} color={theme.textSecondary} />
                </View>
                <View style={styles.infoContent}>
                  <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Due Date</Text>
                  <Text style={[styles.infoValue, { color: theme.text }]}>
                    {formatDate(issue.assignment.due_date)}
                  </Text>
                </View>
              </View>
            )}
          </View>
        )}

        {/* ── TIMELINE ── */}
        <View style={[styles.card, styles.flatCard, { backgroundColor: surfaceColor, borderColor }]}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Timeline</Text>
          
          <View style={styles.infoRow}>
            <View style={[styles.iconWrapper, { backgroundColor: isOverdue ? 'rgba(239,68,68,0.1)' : iconBg }]}>
              <Ionicons name="flag-outline" size={18} color={isOverdue ? '#ef4444' : theme.textSecondary} />
            </View>
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Deadline</Text>
              <Text style={[styles.infoValue, { color: isOverdue ? '#ef4444' : theme.text }]}>
                {formatDate(issue.deadline_at)}
                {isOverdue && ` (${overdueDays} days overdue)`}
              </Text>
            </View>
          </View>
          
          <View style={styles.infoRow}>
            <View style={[styles.iconWrapper, { backgroundColor: iconBg }]}>
              <Ionicons name="add-outline" size={18} color={theme.textSecondary} />
            </View>
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Created</Text>
              <Text style={[styles.infoValue, { color: theme.text }]}>
                {formatDateTime(issue.created_at)}
              </Text>
            </View>
          </View>
          
          <View style={styles.infoRow}>
            <View style={[styles.iconWrapper, { backgroundColor: iconBg }]}>
              <Ionicons name="refresh-outline" size={18} color={theme.textSecondary} />
            </View>
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Last Updated</Text>
              <Text style={[styles.infoValue, { color: theme.text }]}>
                {formatDateTime(issue.updated_at)}
              </Text>
            </View>
          </View>
        </View>

        {/* ── IMAGES ── */}
        {issue.images && issue.images.length > 0 && (
          <View style={[styles.card, styles.flatCard, { backgroundColor: surfaceColor, borderColor }]}>
            <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Media Attached</Text>
            {issue.images.map((img, index) => (
              <View key={index} style={styles.imageContainer}>
                <View style={styles.imageHeader}>
                  <StatusBadge 
                    label={img.image_type} 
                    color={img.image_type === 'BEFORE' ? '#f59e0b' : '#10a37f'} 
                  />
                  {img.ai_flag && img.ai_flag !== 'NOT_CHECKED' && (
                    <StatusBadge 
                      label={`AI: ${img.ai_flag}`} 
                      color={img.ai_flag === 'OK' ? '#10a37f' : '#ef4444'} 
                    />
                  )}
                </View>
                <Image
                  source={{ uri: img.image_url }}
                  style={[styles.image, { borderColor }]}
                  resizeMode="cover"
                />
                <Text style={[styles.imageDate, { color: theme.textSecondary }]}>
                  Uploaded: {formatDateTime(img.created_at)}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* ── CALL LOGS ── */}
        {issue.call_logs && issue.call_logs.length > 0 && (
          <View style={[styles.card, styles.flatCard, { backgroundColor: surfaceColor, borderColor }]}>
            <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Automated Call Logs</Text>
            {issue.call_logs.map((log, index) => {
              const isLast = index === issue.call_logs.length - 1;
              return (
                <View key={index} style={[styles.callLog, !isLast && { borderBottomColor: borderColor, borderBottomWidth: StyleSheet.hairlineWidth }]}>
                  <View style={styles.callLogHeader}>
                    <Text style={[styles.callAttempt, { color: theme.text }]}>
                      Attempt #{log.attempt_number}
                    </Text>
                    <StatusBadge 
                      label={log.status} 
                      color={log.status === 'ANSWERED' ? '#10a37f' : '#ef4444'} 
                    />
                  </View>
                  <Text style={[styles.callTime, { color: theme.textSecondary }]}>
                    {formatDateTime(log.initiated_at)}
                  </Text>
                </View>
              );
            })}
          </View>
        )}

        {/* ── HISTORY ── */}
        {issue.history && issue.history.length > 0 && (
          <View style={[styles.card, styles.flatCard, { backgroundColor: surfaceColor, borderColor }]}>
            <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Activity Log</Text>
            {issue.history.map((item, index) => (
              <View key={index} style={styles.historyItem}>
                {/* Custom thread line */}
                <View style={[styles.historyThread, { backgroundColor: borderColor }]} />
                <View style={styles.historyContent}>
                  <Text style={[styles.historyAction, { color: theme.text }]}>
                    {item.action_type.replace(/_/g, ' ')}
                  </Text>
                  <Text style={[styles.historyDetails, { color: theme.textSecondary }]}>
                    {item.details}
                  </Text>
                  <Text style={[styles.historyTime, { color: theme.textSecondary }]}>
                    {formatDateTime(item.created_at)} • {item.changed_by?.name || 'System AI'}
                  </Text>
                </View>
              </View>
            ))}
          </View>
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
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backButton: {
    padding: 4,
    marginLeft: -4,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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
    padding: 20,
  },
  flatCard: {
    borderRadius: 16,
    borderWidth: 1,
    ...Platform.select({
      ios: { shadowOpacity: 0 },
      android: { elevation: 0 },
    }),
  },
  issueTitle: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.5,
    marginBottom: 16,
    lineHeight: 30,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 16,
  },
  description: {
    fontSize: 15,
    lineHeight: 24,
    letterSpacing: -0.1,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 14,
  },
  iconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 10, // Squircle shape
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoContent: {
    flex: 1,
    justifyContent: 'center',
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  imageContainer: {
    marginBottom: 20,
  },
  imageHeader: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  image: {
    width: '100%',
    height: 220,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  imageDate: {
    fontSize: 12,
    marginTop: 8,
  },
  callLog: {
    paddingVertical: 12,
  },
  callLogHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  callAttempt: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  callTime: {
    fontSize: 13,
  },
  historyItem: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  historyThread: {
    width: 2,
    borderRadius: 1,
    marginRight: 16,
    marginTop: 4,
    marginBottom: 4,
  },
  historyContent: {
    flex: 1,
    paddingBottom: 4,
  },
  historyAction: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.1,
    marginBottom: 4,
    textTransform: 'capitalize',
  },
  historyDetails: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 6,
  },
  historyTime: {
    fontSize: 12,
    fontWeight: '500',
  },
  bottomPadding: {
    height: 40,
  },
});