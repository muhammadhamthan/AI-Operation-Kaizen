import React, { useEffect, useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Alert,
  Platform,
  RefreshControl 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../../src/theme/ThemeContext';
import { selectCurrentUser } from '../../../../src/store/slices/authSlice';
import { 
  fetchDashboardIssueDetail, // 📍 SWAPPED IN NEW DYNAMIC THUNK
  fetchIssueTimeline,
  selectIssueById,
  selectCurrentIssue,
  selectIssuesLoading, 
  clearCurrentIssue 
} from '../../../../src/store/slices/issuesSlice';
import { calculateOverdueDays } from '../../../../src/utils/overdue';
import StatusBadge from '../../../../src/components/common/StatusBadge';
import Button from '../../../../src/components/common/Button';
import IssueTimeline from '../../../../src/components/issue/IssueTimeline';
import ImageGallery from '../../../../src/components/issue/ImageGallery';
import Loader from '../../../../src/components/common/Loader';

import { selectIsOnline } from '../../../../src/store/slices/offlineSlice';
import Toast from '../../../../src/components/common/Toast';
import FullScreenSpinner from '../../../../src/components/common/FullScreenSpinner';
import Avatar from '../../../../src/components/common/Avatar';
import { formatDate } from '../../../../src/utils/formatters';

export default function AwaitingReviewDetailScreen() {
  const { theme, isDark } = useTheme(); 
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const dispatch = useDispatch();
  const user = useSelector(selectCurrentUser);
  
  const cachedIssue = useSelector((state) => selectIssueById(state, parseInt(id)));
  const fullIssue = useSelector(selectCurrentIssue);
  const loading = useSelector(selectIssuesLoading);
  const isOnline = useSelector(selectIsOnline);

  const [refreshing, setRefreshing] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const issue = (fullIssue && fullIssue.id === parseInt(id)) ? fullIssue : cachedIssue;

  useEffect(() => {
    if (id) {
      // 📍 PASSED EXACT CARD TYPE
      dispatch(fetchDashboardIssueDetail({ cardType: 'resolved-pending-review', issueId: parseInt(id) }));
      dispatch(fetchIssueTimeline(parseInt(id)));
    }
    return () => { dispatch(clearCurrentIssue()); };
  }, [id, dispatch]);

  const onRefresh = useCallback(async () => {
    if (!isOnline) {
      setToastMessage("Can't refresh while offline");
      setTimeout(() => setToastMessage(''), 3000);
      return;
    }
    if (!id) return;
    
    setRefreshing(true);
    try {
      await Promise.allSettled([
        // 📍 PASSED EXACT CARD TYPE
        dispatch(fetchDashboardIssueDetail({ cardType: 'resolved-pending-review', issueId: parseInt(id) })),
        dispatch(fetchIssueTimeline(parseInt(id)))
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [id, isOnline, dispatch]);

  // 📍 NEW: Dedicated Review Action Handler (Web & Native Safe)
  const handleReviewAction = (actionType) => {
    console.log(`\n=============================================`);
    console.log(`📝 SUPERVISOR REVIEW ACTION: ${actionType}`);
    console.log(`=============================================`);
    console.log(`Issue ID:      ${issue?.id}`);
    console.log(`Supervisor ID: ${user?.id}`);
    console.log(`Supervisor:    ${user?.name}`);
    console.log(`=============================================\n`);

    if (actionType === 'APPROVE') {
      if (Platform.OS === 'web') {
        // Web Fallback
        const confirmApprove = window.confirm("Are you sure you want to approve this fix? The issue will be marked as COMPLETED.");
        if (confirmApprove) {
          console.log(`[DEBUG] Issue #${issue?.id} APPROVED successfully.`);
          // TODO: Add backend API call here (e.g., dispatch(approveIssue(issue.id)))
          alert("Success! Issue has been approved and closed.");
 
        }
      } else {
        // Native Mobile Flow
        Alert.alert(
          "Approve Fix",
          "Are you sure you want to approve this fix? The issue will be marked as COMPLETED.",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Approve",
              style: "default",
              onPress: () => {
                console.log(`[DEBUG] Issue #${issue?.id} APPROVED successfully.`);
                // TODO: Add backend API call here
                Alert.alert("Success", "Issue has been approved and closed.");
             
              }
            }
          ]
        );
      }
    } else if (actionType === 'REJECT') {
      if (Platform.OS === 'web') {
        // Web Fallback
        const confirmReject = window.confirm("Are you sure you want to reject this fix? The issue will be sent back to the solver.");
        if (confirmReject) {
          console.log(`[DEBUG] Issue #${issue?.id} REJECTED successfully.`);
          // TODO: Add backend API call here (e.g., dispatch(rejectIssue(issue.id)))
          alert("Rejected! Issue has been returned to the solver.");
    
        }
      } else {
        // Native Mobile Flow
        Alert.alert(
          "Reject Fix",
          "Are you sure you want to reject this fix? The issue will be sent back to the solver.",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Reject",
              style: "destructive",
              onPress: () => {
                console.log(`[DEBUG] Issue #${issue?.id} REJECTED successfully.`);
                // TODO: Add backend API call here
                Alert.alert("Rejected", "Issue has been returned to the solver.");
      
              }
            }
          ]
        );
      }
    }
  };

  const overdueDays = issue ? calculateOverdueDays(issue.deadline_at, issue.status) : null;

  if (loading && !refreshing && !issue) return <Loader message="Loading review details..." />;
  if (!issue) return <Loader message="Loading review details..." />;

  const siteName = issue.site_name || issue.site?.name || 'N/A';
  const siteLocation = issue.site_location || issue.site?.location || null;
  const raisedByName = issue.supervisor_name || 'N/A';
  
  const currentAssignment = issue.assignments && issue.assignments.length > 0 
    ? issue.assignments[0] 
    : null;
    
  const solverName = currentAssignment?.solver_name || null;

  // ── PREMIUM PALETTE ──
  const bgColor = isDark ? '#212121' : '#f9f9f9';
  const surfaceColor = isDark ? '#171717' : '#ffffff';
  const borderColor = isDark ? '#333333' : '#e5e5e5';
  const iconBg = isDark ? 'rgba(255,255,255,0.05)' : '#f4f4f4';
  const reviewAccent = '#f97316'; // Orange accent
  
  const alertBg = isDark ? 'rgba(249, 115, 22, 0.1)' : '#fff7ed';
  const alertBorder = isDark ? 'rgba(249, 115, 22, 0.2)' : '#ffedd5';

  return (
    <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: bgColor }]}>
      
      {/* ── HEADER ── */}
      <View style={[styles.header, { backgroundColor: bgColor, borderBottomColor: borderColor }]}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.6} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.textSecondary }]}>Review Required</Text>
        
        <View style={styles.headerRight}>
          {Platform.OS === 'web' ? (
            <TouchableOpacity onPress={onRefresh} disabled={refreshing} style={styles.webRefreshButton}>
              <Ionicons name="sync" size={22} color={refreshing ? reviewAccent : theme.textSecondary} />
            </TouchableOpacity>
          ) : (
            <View style={styles.placeholder} />
          )}
        </View>
      </View>

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          Platform.OS === 'web' ? undefined : (
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.textSecondary} />
          )
        }
      >
        
        {/* ── BANNER ── */}
        <View style={[styles.warningBanner, { backgroundColor: alertBg, borderColor: alertBorder }]}>
          <View style={styles.warningIconWrapper}>
            <Ionicons name="eye-outline" size={18} color="#f97316" />
          </View>
          <View style={styles.warningContent}>
            <Text style={styles.warningTitle}>Ready for Inspection</Text>
            <Text style={styles.warningText}>
              The solver has marked this issue as resolved. Please review and approve or reject the fix.
            </Text>
          </View>
        </View>

        {/* ── ISSUE IDENTITY ── */}
        <View style={[styles.card, styles.flatCard, { backgroundColor: surfaceColor, borderColor }]}>
          <View style={styles.idRow}>
            <Text style={[styles.issueId, { color: theme.textSecondary }]}>ISSUE #{issue.id}</Text>
            <View style={styles.statusRow}>
              <StatusBadge status={issue.status} size="small" />
              <StatusBadge status={issue.priority} type="priority" size="small" />
            </View>
          </View>
          
          <Text style={[styles.title, { color: theme.text }]}>{issue.title}</Text>
          <Text style={[styles.description, { color: theme.textSecondary }]}>{issue.description}</Text>
        </View>

        {/* ── DETAILS & LOCATION ── */}
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
            <View style={[styles.infoRow, { marginTop: 16 }]}>
              <View style={[styles.iconWrapper, { backgroundColor: iconBg }]}>
                <Ionicons name="map-outline" size={18} color={theme.textSecondary} />
              </View>
              <View style={styles.infoContent}>
                <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Address</Text>
                <Text style={[styles.infoValue, { color: theme.text }]}>{siteLocation}</Text>
              </View>
            </View>
          )}

          {issue.deadline_at && (
            <View style={[styles.infoRow, { marginTop: 16 }]}>
              <View style={[styles.iconWrapper, { backgroundColor: iconBg }]}>
                <Ionicons name="calendar-outline" size={18} color={theme.textSecondary} />
              </View>
              <View style={styles.infoContent}>
                <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Deadline</Text>
                <Text style={[styles.infoValue, { color: theme.text }]}>{formatDate(issue.deadline_at)}</Text>
              </View>
            </View>
          )}
        </View>

        {/* ── PEOPLE INVOLVED ── */}
        <View style={[styles.card, styles.flatCard, { backgroundColor: surfaceColor, borderColor }]}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>People Involved</Text>
          <View style={styles.peopleGrid}>
            <View style={[styles.personRow, solverName && { borderBottomColor: borderColor, borderBottomWidth: StyleSheet.hairlineWidth }]}>
              <Avatar name={raisedByName} size="medium" />
              <View style={styles.personInfo}>
                <Text style={[styles.personName, { color: theme.text }]} numberOfLines={1}>
                  {raisedByName}
                </Text>
                <Text style={[styles.personRole, { color: theme.textSecondary }]}>Raised By</Text>
              </View>
            </View>
            
            {solverName && (
              <View style={[styles.personRow, { paddingTop: 12, paddingBottom: 0 }]}>
                <Avatar name={solverName} size="medium" />
                <View style={styles.personInfo}>
                  <Text style={[styles.personName, { color: theme.text }]} numberOfLines={1}>
                    {solverName}
                  </Text>
                  <Text style={[styles.personRole, { color: theme.textSecondary }]}>Resolved By</Text>
                </View>
                {currentAssignment?.solver_phone && (
                   <Text style={[styles.personRole, { color: theme.textSecondary, marginTop: 4 }]}>
                     {currentAssignment.solver_phone}
                   </Text>
                )}
              </View>
            )}
          </View>
        </View>

        {/* ── PHOTOS ── */}
        {issue.images && issue.images.length > 0 && (
          <View style={[styles.card, styles.flatCard, { backgroundColor: surfaceColor, borderColor }]}>
            <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Attached Media</Text>
            <ImageGallery images={issue.images} />
          </View>
        )}

        {/* ── SUPERVISOR ACTIONS ── */}
        <View style={styles.actions}>
          {user?.role === 'supervisor' ? (
            <View style={{ gap: 12 }}>
              <Button 
                title="Approve Fix" 
                variant="success" 
                icon="checkmark-circle-outline" 
                onPress={() => handleReviewAction('APPROVE')} 
                style={{ backgroundColor: '#10a37f', borderColor: '#10a37f', borderRadius: 10 }} 
              />
              <Button 
                title="Reject Fix" 
                variant="danger" 
                icon="close-circle-outline" 
                onPress={() => handleReviewAction('REJECT')} 
              />
            </View>
          ) : (
            <View style={{ alignItems: 'center', padding: 16, backgroundColor: iconBg, borderRadius: 12 }}>
              <Text style={{ color: theme.textSecondary, fontStyle: 'italic' }}>
                Waiting for Supervisor Approval.
              </Text>
            </View>
          )}
        </View>
        
        <View style={styles.bottomPadding} />
      </ScrollView>

      <FullScreenSpinner visible={refreshing} message="Updating Details..." color={reviewAccent} />
      {toastMessage !== '' && <Toast message={toastMessage} />}
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
  headerRight: { width: 32, alignItems: 'flex-end' },
  placeholder: { width: 32 },
  webRefreshButton: { padding: 4 },
  
  warningBanner: { 
    flexDirection: 'row', 
    alignItems: 'flex-start', 
    marginHorizontal: 16, 
    marginTop: 16,
    padding: 16, 
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  warningIconWrapper: {
    backgroundColor: '#ffffff',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 2 },
      android: { elevation: 2 },
    }),
  },
  warningContent: { flex: 1 },
  warningTitle: { color: '#f97316', fontWeight: '700', fontSize: 14, letterSpacing: -0.2, marginBottom: 2 },
  warningText: { color: '#f97316', fontSize: 13, lineHeight: 18 },

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

  idRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  issueId: { fontSize: 13, fontWeight: '700', letterSpacing: 0.5 },
  statusRow: { flexDirection: 'row', gap: 6 },
  
  title: { fontSize: 22, fontWeight: '700', letterSpacing: -0.5, marginBottom: 8, lineHeight: 28 },
  description: { fontSize: 15, lineHeight: 24, letterSpacing: -0.1 },
  
  sectionTitle: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 16 },
  
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
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
  personInfo: { flex: 1, justifyContent: 'center' },
  personName: { fontSize: 15, fontWeight: '600', letterSpacing: -0.2, marginBottom: 2 },
  personRole: { fontSize: 13 },
  
  actions: { marginHorizontal: 16, marginTop: 32 },
  bottomPadding: { height: 40 },
});