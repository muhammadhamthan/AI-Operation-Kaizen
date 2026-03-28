import { useDispatch, useSelector } from 'react-redux';
import { 
  fetchIssueById, 
  fetchIssueTimeline, 
  selectIssueById, 
  selectCurrentIssue, 
  selectIssueTimeline 
} from '../../../../src/store/slices/issuesSlice';
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
  Alert, // ✅ Added Alert import
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../../src/theme/ThemeContext';
import { formatDate, formatDateTime } from '../../../../src/utils/formatters';
import { calculateOverdueDays } from '../../../../src/utils/overdue';
import StatusBadge from '../../../../src/components/common/StatusBadge';
import Avatar from '../../../../src/components/common/Avatar';
import Loader from '../../../../src/components/common/Loader';
import IssueTimeline from '../../../../src/components/issue/IssueTimeline';
import Button from '../../../../src/components/common/Button'; // ✅ Added Button import

export default function IssueDetailScreen() {
  const { theme, isDark } = useTheme(); 
  const router = useRouter();
  const { id, highlighted } = useLocalSearchParams();
  
  const dispatch = useDispatch();

  const cachedIssue = useSelector((state) => selectIssueById(state, parseInt(id)));
  const fullIssue = useSelector(selectCurrentIssue);
  const timeline = useSelector(selectIssueTimeline) || [];

  const issue = (fullIssue && fullIssue.id === parseInt(id)) ? fullIssue : cachedIssue;

  useEffect(() => {
    if (id) {
      dispatch(fetchIssueById(parseInt(id)));
      dispatch(fetchIssueTimeline(parseInt(id)));
    }
  }, [id, dispatch]);
  
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

  // ── SMART DATA EXTRACTION ──
  const siteName = issue.site_name || issue.site?.name || 'N/A';
  const siteLocation = issue.site_location || issue.site?.location || null;
  const category = issue.issue_type || 'General Maintenance';
  const raisedByName = issue.supervisor_name || issue.raised_by?.name || 'N/A';

  const currentAssignment = issue.assignments && issue.assignments.length > 0 
    ? issue.assignments[0] 
    : issue.assignment || null;

  const solverName = currentAssignment?.solver_name || currentAssignment?.assigned_to?.name || null;
  const solverPhone = currentAssignment?.solver_phone || currentAssignment?.assigned_to?.phone || null;
  const dueDate = currentAssignment?.due_date || issue.deadline_at || null;

  // ✅ ONLY OVERDUE IF NOT COMPLETED
  const overdueDays = calculateOverdueDays(issue.deadline_at);
  const isOverdue = overdueDays > 0 && issue.status !== 'COMPLETED';

  // Simple Avatar Generator
  const getInitials = (name) => {
    if (!name || name === 'N/A') return 'NA';
    return name.substring(0, 2).toUpperCase();
  };

  const getStatusColor = (status) => {
    const colors = {
      OPEN: '#3b82f6',
      ASSIGNED: '#f59e0b',
      IN_PROGRESS: '#8b5cf6',
      RESOLVED_PENDING_REVIEW: '#eab308',
      COMPLETED: '#10a37f',
      REOPENED: '#ef4444',
      ESCALATED: '#ef4444',
    };
    return colors[status] || '#8e8ea0';
  };

  const getPriorityColor = (priority) => {
    const colors = {
      high: '#ef4444',
      medium: '#f59e0b',
      low: '#10a37f', 
    };
    return colors[priority] || '#8e8ea0';
  };

  const bgColor = isDark ? '#212121' : '#f9f9f9';
  const surfaceColor = isDark ? '#171717' : '#ffffff';
  const borderColor = isDark ? '#333333' : '#e5e5e5';
  const iconBg = isDark ? 'rgba(255,255,255,0.05)' : '#f4f4f4';

  const highlightColor = highlightAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [surfaceColor, isDark ? '#3f3f46' : '#fef9c3'],
  });

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]}>
      
      <View style={[styles.header, { backgroundColor: bgColor, borderBottomColor: borderColor }]}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.6} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.textSecondary }]}>Issue #{issue.id}</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        
        <Animated.View style={[styles.card, styles.flatCard, { backgroundColor: highlightColor, borderColor }]}>
          <Text style={[styles.issueTitle, { color: theme.text }]}>{issue.title}</Text>
          <View style={styles.badgeRow}>
            <StatusBadge 
              label={issue.status.replace(/_/g, ' ')} 
              color={getStatusColor(issue.status)} 
            />
            <StatusBadge 
              label={issue.priority.toUpperCase()} 
              color={getPriorityColor(issue.priority)} 
            />
            {/* ✅ Badge shows up only if overdue AND not completed */}
            {isOverdue && (
              <StatusBadge label={`${overdueDays}d overdue`} color="#ef4444" />
            )}
          </View>
        </Animated.View>

        <View style={[styles.card, styles.flatCard, { backgroundColor: surfaceColor, borderColor }]}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Description</Text>
          <Text style={[styles.description, { color: theme.text }]}>
            {issue.description}
          </Text>
        </View>

        <View style={[styles.card, styles.flatCard, { backgroundColor: surfaceColor, borderColor }]}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Details</Text>
          
          <View style={styles.infoRow}>
            <View style={[styles.iconWrapper, { backgroundColor: iconBg }]}>
              <Ionicons name="location-outline" size={18} color={theme.textSecondary} />
            </View>
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Site</Text>
              <Text style={[styles.infoValue, { color: theme.text }]}>{siteName}</Text>
            </View>
          </View>
          
          {siteLocation && (
            <View style={styles.infoRow}>
              <View style={[styles.iconWrapper, { backgroundColor: iconBg }]}>
                <Ionicons name="map-outline" size={18} color={theme.textSecondary} />
              </View>
              <View style={styles.infoContent}>
                <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Location</Text>
                <Text style={[styles.infoValue, { color: theme.text }]}>{siteLocation}</Text>
              </View>
            </View>
          )}

          {dueDate && (
            <View style={styles.infoRow}>
              <View style={[styles.iconWrapper, { backgroundColor: iconBg }]}>
                <Ionicons name="calendar-outline" size={18} color={theme.textSecondary} />
              </View>
              <View style={styles.infoContent}>
                <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Deadline</Text>
                <Text style={[styles.infoValue, { color: theme.text }]}>{formatDate(dueDate)}</Text>
              </View>
            </View>
          )}
          
          <View style={[styles.infoRow, { marginBottom: 0 }]}>
            <View style={[styles.iconWrapper, { backgroundColor: iconBg }]}>
              <Ionicons name="construct-outline" size={18} color={theme.textSecondary} />
            </View>
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Category</Text>
              <Text style={[styles.infoValue, { color: theme.text }]}>{category}</Text>
            </View>
          </View>
        </View>

        <View style={[styles.card, styles.flatCard, { backgroundColor: surfaceColor, borderColor }]}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>People Involved</Text>
          <View style={styles.peopleGrid}>
            <View style={[styles.personRow, solverName && { borderBottomColor: borderColor, borderBottomWidth: StyleSheet.hairlineWidth }]}>
              
              <View style={[styles.avatarCircle, { backgroundColor: '#3b82f6' }]}>
                <Text style={styles.avatarText}>{getInitials(raisedByName)}</Text>
              </View>
              
              <View style={styles.personInfo}>
                <Text style={[styles.personName, { color: theme.text }]} numberOfLines={1}>
                  {raisedByName}
                </Text>
                <Text style={[styles.personRole, { color: theme.textSecondary }]}>Raised By</Text>
              </View>
            </View>
            
            {solverName && (
              <View style={[styles.personRow, { paddingTop: 12, paddingBottom: 0 }]}>
                
                <View style={[styles.avatarCircle, { backgroundColor: '#10a37f' }]}>
                  <Text style={styles.avatarText}>{getInitials(solverName)}</Text>
                </View>

                <View style={styles.personInfo}>
                  <Text style={[styles.personName, { color: theme.text }]} numberOfLines={1}>
                    {solverName}
                  </Text>
                  <Text style={[styles.personRole, { color: theme.textSecondary }]}>Assigned To</Text>
                </View>
                {solverPhone && (
                   <View style={styles.phoneBadge}>
                     <Ionicons name="call" size={12} color="#fff" />
                     <Text style={styles.phoneBadgeText}>{solverPhone}</Text>
                   </View>
                )}
              </View>
            )}
          </View>
        </View>

        <View style={[styles.card, styles.flatCard, { backgroundColor: surfaceColor, borderColor }]}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Metadata</Text>

          {issue.complaints_count !== undefined && (
            <View style={styles.infoRow}>
              <View style={[styles.iconWrapper, { backgroundColor: issue.complaints_count > 0 ? 'rgba(239,68,68,0.1)' : iconBg }]}>
                <Ionicons name="warning-outline" size={18} color={issue.complaints_count > 0 ? '#ef4444' : theme.textSecondary} />
              </View>
              <View style={styles.infoContent}>
                <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Complaints Filed</Text>
                <Text style={[styles.infoValue, { color: issue.complaints_count > 0 ? '#ef4444' : theme.text }]}>
                  {issue.complaints_count}
                </Text>
              </View>
            </View>
          )}

          {issue.track_status && (
            <View style={styles.infoRow}>
              <View style={[styles.iconWrapper, { backgroundColor: iconBg }]}>
                <Ionicons name="analytics-outline" size={18} color={theme.textSecondary} />
              </View>
              <View style={styles.infoContent}>
                <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Tracking Status</Text>
                <Text style={[styles.infoValue, { color: theme.text, textTransform: 'capitalize' }]}>
                  {issue.track_status.replace(/_/g, ' ')}
                </Text>
              </View>
            </View>
          )}
          
          <View style={styles.infoRow}>
            {/* ✅ Icon background and color adapt if overdue */}
            <View style={[styles.iconWrapper, { backgroundColor: isOverdue ? 'rgba(239,68,68,0.1)' : iconBg }]}>
              <Ionicons name="flag-outline" size={18} color={isOverdue ? '#ef4444' : theme.textSecondary} />
            </View>
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Deadline</Text>
              <Text style={[styles.infoValue, { color: isOverdue ? '#ef4444' : theme.text }]}>
                {formatDate(issue.deadline_at)}
                {/* ✅ Text appended here if overdue */}
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
          
          <View style={[styles.infoRow, { marginBottom: 0 }]}>
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

                <View style={[styles.imageWrapper, { backgroundColor: isDark ? '#2a2a2a' : '#f0f0f0', borderColor }]}>
                   <Image
                     source={{ uri: img.image_url }}
                     style={styles.image}
                     resizeMode="cover"
                     onError={(e) => console.log('Image failed to load:', img.image_url, e.nativeEvent.error)}
                   />
                </View>
                
                <View style={styles.imageFooter}>
                  <Text style={[styles.uploaderName, { color: theme.text }]}>
                    Uploaded by: {img.uploader_name || 'System'}
                  </Text>
                  <Text style={[styles.imageDate, { color: theme.textSecondary }]}>
                    {formatDateTime(img.created_at)}
                  </Text>
                </View>

              </View>
            ))}
          </View>
        )}

        {/* ── CALL STATUS ── */}
        {currentAssignment && (currentAssignment.total_call_attempts > 0 || currentAssignment.last_call_status) && (
          <View style={[styles.card, styles.flatCard, { backgroundColor: surfaceColor, borderColor }]}>
            <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Call Status</Text>
            
            <View style={styles.infoRow}>
              <View style={[styles.iconWrapper, { backgroundColor: iconBg }]}>
                <Ionicons name="call-outline" size={18} color={theme.textSecondary} />
              </View>
              <View style={styles.infoContent}>
                <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Total Attempts</Text>
                <Text style={[styles.infoValue, { color: theme.text }]}>
                  {currentAssignment.total_call_attempts || 0}
                </Text>
              </View>
            </View>

            <View style={[styles.infoRow, { marginBottom: 0 }]}>
              <View style={[styles.iconWrapper, { backgroundColor: iconBg }]}>
                <Ionicons name="pulse-outline" size={18} color={theme.textSecondary} />
              </View>
              <View style={styles.infoContent}>
                <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Last Call Result</Text>
                <Text style={[styles.infoValue, { 
                  color: currentAssignment.last_call_status === 'ANSWERED' ? '#10a37f' : '#ef4444',
                  textTransform: 'capitalize' 
                }]}>
                  {currentAssignment.last_call_status ? currentAssignment.last_call_status.toLowerCase() : 'Unknown'}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* ── ACTIONS ── */}
        {/* ✅ Added the simple Raise Complaint button for RESOLVED_PENDING_REVIEW */}
        {issue.status === 'RESOLVED_PENDING_REVIEW' && (
          <View style={styles.actions}>
            <Button 
              title="Raise Complaint" 
              variant="danger" 
              icon="alert-circle-outline" 
              onPress={() => Alert.alert('Coming Soon', 'Phase 2-3')} 
            />
          </View>
        )}
        
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

  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  issueTitle: { fontSize: 22, fontWeight: '700', letterSpacing: -0.5, marginBottom: 8, lineHeight: 28 },
  description: { fontSize: 15, lineHeight: 24, letterSpacing: -0.1 },

  sectionTitle: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 16 },
  
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 14 },
  iconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoContent: { flex: 1, justifyContent: 'center' },
  infoLabel: { fontSize: 12, fontWeight: '500', marginBottom: 2 },
  infoValue: { fontSize: 15, fontWeight: '600', letterSpacing: -0.2 },

  peopleGrid: { flexDirection: 'column' },
  personRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 12, 
    paddingBottom: 12 
  },
  
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  
  personInfo: { flex: 1, justifyContent: 'center' },
  personName: { fontSize: 15, fontWeight: '600', letterSpacing: -0.2, marginBottom: 2 },
  personRole: { fontSize: 13 },
  
  phoneBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8b5cf6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  phoneBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },

  imageContainer: { marginBottom: 24 },
  imageHeader: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  imageWrapper: {
    width: '100%',
    height: 220,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden', 
  },
  image: { width: '100%', height: '100%' },
  
  imageFooter: { marginTop: 10 },
  uploaderName: { fontSize: 14, fontWeight: '600', marginBottom: 2 },
  imageDate: { fontSize: 12 },

  historyItem: { flexDirection: 'row', marginBottom: 16 },
  historyThread: { width: 2, borderRadius: 1, marginRight: 16, marginTop: 4, marginBottom: 4 },
  historyContent: { flex: 1, paddingBottom: 4 },
  historyAction: { fontSize: 14, fontWeight: '700', letterSpacing: -0.1, marginBottom: 4, textTransform: 'capitalize' },
  historyDetails: { fontSize: 14, lineHeight: 20, marginBottom: 6 },
  historyTime: { fontSize: 12, fontWeight: '500' },
  
  actions: { marginHorizontal: 16, marginTop: 32 }, // ✅ Added actions style
  bottomPadding: { height: 40 },
});