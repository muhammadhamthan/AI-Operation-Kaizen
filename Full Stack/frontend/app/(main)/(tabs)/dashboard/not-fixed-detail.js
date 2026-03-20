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
  fetchIssueById, 
  fetchIssueTimeline,
  selectIssueById,
  selectCurrentIssue,
  selectIssueTimeline,
  selectIssuesLoading, 
  clearCurrentIssue 
} from '../../../../src/store/slices/issuesSlice';
import { calculateOverdueDays } from '../../../../src/utils/overdue';
import StatusBadge from '../../../../src/components/common/StatusBadge';
import Button from '../../../../src/components/common/Button';
import IssueTimeline from '../../../../src/components/issue/IssueTimeline';
import ImageGallery from '../../../../src/components/issue/ImageGallery';
import Loader from '../../../../src/components/common/Loader';

// ── ADDED REUSABLE IMPORTS & MISSING COMPONENTS ──
import { selectIsOnline } from '../../../../src/store/slices/offlineSlice';
import Toast from '../../../../src/components/common/Toast';
import FullScreenSpinner from '../../../../src/components/common/FullScreenSpinner';
import Avatar from '../../../../src/components/common/Avatar';
import { formatDate } from '../../../../src/utils/formatters';

export default function NotFixedDetailScreen() {
  const { theme, isDark } = useTheme(); 
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const dispatch = useDispatch();
  const user = useSelector(selectCurrentUser);
  
  const cachedIssue = useSelector((state) => selectIssueById(state, parseInt(id)));
  const fullIssue = useSelector(selectCurrentIssue);
  const timeline = useSelector(selectIssueTimeline) || [];
  const loading = useSelector(selectIssuesLoading);
  const isOnline = useSelector(selectIsOnline);

  const [refreshing, setRefreshing] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const issue = (fullIssue && fullIssue.id === parseInt(id)) ? fullIssue : cachedIssue;

  useEffect(() => {
    if (id) {
      dispatch(fetchIssueById(parseInt(id)));
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
        dispatch(fetchIssueById(parseInt(id))),
        dispatch(fetchIssueTimeline(parseInt(id)))
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [id, isOnline, dispatch]);

  const overdueDays = issue ? calculateOverdueDays(issue.deadline_at, issue.status) : null;

  if (loading && !refreshing && !issue) return <Loader message="Loading issue details..." />;
  if (!issue) return <Loader message="Loading issue details..." />;

  // ── SMART DATA EXTRACTION (Mapped to exact JSON response) ──
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
  const pendingAccent = '#f59e0b';
  
  const warningBg = isDark ? 'rgba(239, 68, 68, 0.1)' : '#fef2f2';
  const warningBorder = isDark ? 'rgba(239, 68, 68, 0.2)' : '#fee2e2';

  return (
    <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: bgColor }]}>
      
      {/* ── HEADER ── */}
      <View style={[styles.header, { backgroundColor: bgColor, borderBottomColor: borderColor }]}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.6} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.textSecondary }]}>Pending Issue</Text>
        
        <View style={styles.headerRight}>
          {Platform.OS === 'web' ? (
            <TouchableOpacity onPress={onRefresh} disabled={refreshing} style={styles.webRefreshButton}>
              <Ionicons name="sync" size={22} color={refreshing ? pendingAccent : theme.textSecondary} />
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
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.textSecondary}
            />
          )
        }
      >
        
        {/* ── REFINED WARNING BANNER ── */}
        {overdueDays > 0 && (
          <View style={[styles.warningBanner, { backgroundColor: warningBg, borderColor: warningBorder }]}>
            <View style={styles.warningIconWrapper}>
              <Ionicons name="warning-outline" size={18} color="#ef4444" />
            </View>
            <View style={styles.warningContent}>
              <Text style={styles.warningTitle}>Action Required</Text>
              <Text style={styles.warningText}>
                This issue is overdue by {overdueDays} day{overdueDays > 1 ? 's' : ''}.
              </Text>
            </View>
          </View>
        )}

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

          {/* ✅ Mapped from JSON: deadline_at */}
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
              {/* ✅ Mapped from JSON: supervisor_name */}
              <Avatar name={raisedByName} size="medium" />
              <View style={styles.personInfo}>
                <Text style={[styles.personName, { color: theme.text }]} numberOfLines={1}>
                  {raisedByName}
                </Text>
                <Text style={[styles.personRole, { color: theme.textSecondary }]}>Raised By</Text>
              </View>
            </View>
            
            {/* ✅ Mapped from JSON: assignments array */}
            {solverName && (
              <View style={[styles.personRow, { paddingTop: 12, paddingBottom: 0 }]}>
                <Avatar name={solverName} size="medium" />
                <View style={styles.personInfo}>
                  <Text style={[styles.personName, { color: theme.text }]} numberOfLines={1}>
                    {solverName}
                  </Text>
                  <Text style={[styles.personRole, { color: theme.textSecondary }]}>Assigned To</Text>
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

        {/* ── ACTIONS ── */}
        <View style={styles.actions}>
          {user?.role === 'supervisor' && (
            <Button 
              title="Raise Complaint" 
              variant="danger" 
              icon="alert-circle-outline" 
              onPress={() => Alert.alert('Coming Soon', 'Phase 2-3')} 
            />
          )}
          {user?.role === 'problem_solver' && (
            <Button 
              title="Upload Fix Photo" 
              variant="primary" 
              icon="camera-outline" 
              onPress={() => Alert.alert('Coming Soon', 'Phase 2-3')} 
            />
          )}
        </View>
        
        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* ── FULL SCREEN SPINNER ── */}
      <FullScreenSpinner visible={refreshing} message="Updating Details..." color={pendingAccent} />

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
  warningTitle: { color: '#ef4444', fontWeight: '700', fontSize: 14, letterSpacing: -0.2, marginBottom: 2 },
  warningText: { color: '#ef4444', fontSize: 13, lineHeight: 18 },

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