import React, { useEffect, useCallback, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Image, 
  Platform,
  RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../../src/theme/ThemeContext';
import { fetchComplaintById, selectCurrentComplaint, selectComplaintsLoading, clearCurrentComplaint } from '../../../../src/store/slices/complaintsSlice';
import Avatar from '../../../../src/components/common/Avatar';
import Loader from '../../../../src/components/common/Loader';
import { formatDateTime } from '../../../../src/utils/formatters';
import { useSmartBack } from '../../../../src/hooks/useSmartBack';

// ── ADDED REUSABLE IMPORTS ──
import { selectIsOnline } from '../../../../src/store/slices/offlineSlice';
import Toast from '../../../../src/components/common/Toast';
import FullScreenSpinner from '../../../../src/components/common/FullScreenSpinner';

// Helper to format time as "12m ago"
const formatTimeAgo = (dateString) => {
  if (!dateString) return '12m ago';
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHrs = Math.floor(diffMins / 60);
  if (diffMins < 60) return `${diffMins || 1}m ago`;
  if (diffHrs < 24) return `${diffHrs}h ago`;
  return `${Math.floor(diffHrs / 24)}d ago`;
};

export default function ComplaintDetailScreen() {
  const { theme, isDark } = useTheme();
  const router = useRouter();
  const { id, fromNotification } = useLocalSearchParams(); 
  
  const dispatch = useDispatch();
  const complaint = useSelector(selectCurrentComplaint);
  const loading = useSelector(selectComplaintsLoading);
  const isOnline = useSelector(selectIsOnline);

  const [refreshing, setRefreshing] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const handleSmartBack = useCallback(() => {
    if (fromNotification === 'true') {
      router.replace('/(main)/(tabs)/dashboard');
      setTimeout(() => {
        router.navigate('/(main)/(tabs)/chat');
      }, 100);
    } else {
      router.canGoBack() ? router.back() : router.replace('/(main)/(tabs)/dashboard');
    }
  }, [fromNotification, router]);

  useSmartBack(handleSmartBack);

  useEffect(() => {
    if (id) dispatch(fetchComplaintById(parseInt(id)));
    return () => { dispatch(clearCurrentComplaint()); };
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
      // 📍 FIX: Promise.allSettled guarantees the spinner spins until totally done
      await Promise.allSettled([
        dispatch(fetchComplaintById(parseInt(id)))
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [id, isOnline, dispatch]);

  // 📍 FIX: Prevents Loader hijacking during refresh, but safely catches empty states
  if (loading && !refreshing && !complaint) return <Loader message="Loading complaint details..." />;
  if (!complaint) return <Loader message="Loading complaint details..." />;

  // ── PREMIUM PALETTE ──
  const bgColor = isDark ? '#111111' : '#f9fafb';
  const surfaceColor = isDark ? '#1c1c1c' : '#ffffff';
  const borderColor = isDark ? '#2e2e2e' : '#f1f5f9';
  const iconBg = isDark ? 'rgba(255,255,255,0.05)' : '#f8fafc';
  const alertBg = isDark ? 'rgba(239,68,68,0.15)' : '#fce8ec';
  const primaryBlue = '#3b82f6';
  const primaryRed = '#ef4444';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]}>
      
      {/* ── HEADER ── */}
      <View style={[styles.header, { backgroundColor: surfaceColor, borderBottomColor: borderColor }]}>
        <TouchableOpacity onPress={handleSmartBack} activeOpacity={0.6} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Complaint #{complaint.id}</Text>
        
        <View style={styles.headerRight}>
          <View style={styles.placeholder} />
        </View>
      </View>

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
        refreshControl={
          Platform.OS === 'web' ? undefined : (
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.textSecondary} />
          )
        }
      >
        
        {/* Top Banner Alert (Pill) */}
        <View style={[styles.alertBanner, { backgroundColor: alertBg, borderColor: isDark ? 'rgba(239,68,68,0.3)' : 'rgba(239,68,68,0.2)' }]}>
          <Ionicons name="alert-circle-outline" size={16} color={primaryRed} />
          <Text style={styles.alertText}>Official Complaint Ticket</Text>
        </View>

        {/* ── MAIN COMPLAINT DETAILS ── */}
        <View style={[styles.card, { backgroundColor: surfaceColor, borderColor, marginTop: 16 }]}>
          <View style={styles.titleRow}>
            <Ionicons name="document-text-outline" size={14} color={theme.textSecondary} />
            <Text style={[styles.date, { color: theme.textSecondary, marginLeft: 6 }]}>
              FILED ON {formatDateTime(complaint.created_at).toUpperCase()}
            </Text>
          </View>
          
          <Text style={[styles.issueTitle, { color: theme.text }]}>
            {complaint.issue_title || 'Untitled Issue'}
          </Text>
          
          <Text style={[styles.sectionTitle, { color: theme.textSecondary, marginTop: 16 }]}>DETAILS</Text>
          <Text style={[styles.details, { color: theme.text }]}>{complaint.complaint_details}</Text>
        </View>

        {/* ── SYSTEM METADATA GRID ── */}
        <View style={styles.statsGrid}>
          <View style={[styles.statBox, { backgroundColor: surfaceColor, borderColor }]}>
            <View style={styles.statIconWrap}>
              <Ionicons name="document-text-outline" size={14} color={theme.textSecondary} />
              <Text style={[styles.statLabel, { color: theme.textSecondary, marginLeft: 6 }]}>ASSIGNMENT REF</Text>
            </View>
            <Text style={[styles.statValue, { color: theme.text }]}>ASGN-{complaint.assignment_id || complaint.id}-BX</Text>
          </View>

          <View style={[styles.statBox, { backgroundColor: surfaceColor, borderColor }]}>
            <View style={styles.statIconWrap}>
              <Ionicons name="time-outline" size={14} color={theme.textSecondary} />
              <Text style={[styles.statLabel, { color: theme.textSecondary, marginLeft: 6 }]}>LAST UPDATED</Text>
            </View>
            <Text style={[styles.statValue, { color: theme.text }]}>
              {formatTimeAgo(complaint.updated_at)}
            </Text>
          </View>
        </View>

        {/* ── RELATED ISSUE LINK ── */}
        <TouchableOpacity
          activeOpacity={0.7}
          style={[styles.card, styles.issueRefCard, { backgroundColor: surfaceColor, borderColor }]}
          onPress={() => router.push({ pathname: '/(main)/(tabs)/dashboard/issue-detail', params: { id: complaint.issue_id } })}
        >
          <View style={styles.issueRefLeft}>
            <View style={[styles.iconWrapper, { backgroundColor: isDark ? 'rgba(99,102,241,0.15)' : '#eef2ff' }]}>
              <Ionicons name="link-outline" size={20} color={isDark ? '#818cf8' : '#4f46e5'} />
            </View>
            <View style={styles.issueRefContent}>
              <Text style={[styles.issueLink, { color: theme.text }]}>View Original Issue</Text>
              <Text style={[styles.issueSubtitle, { color: theme.textSecondary }]} numberOfLines={1}>
                ISSUE #{complaint.issue_id} · {complaint.issue_title?.toUpperCase()}
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} style={{ opacity: 0.5 }} />
        </TouchableOpacity>

        {/* ── CHAIN OF ACCOUNTABILITY ── */}
        <View style={[styles.card, { backgroundColor: surfaceColor, borderColor, paddingVertical: 20 }]}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>CHAIN OF ACCOUNTABILITY</Text>
            <Ionicons name="shield-checkmark-outline" size={16} color={theme.textSecondary} />
          </View>
          
          <View style={styles.accountabilityList}>
            {complaint.supervisor_name && (
              <View style={styles.accountabilityRow}>
                <View style={styles.accountabilityUser}>
                  <View style={styles.avatarWrap}>
                    <Avatar name={complaint.supervisor_name} uri={`https://i.pravatar.cc/150?u=${complaint.supervisor_name}`} size="small" />
                    <View style={[styles.statusDot, { backgroundColor: '#22c55e', borderColor: surfaceColor }]} />
                  </View>
                  <View style={styles.accountabilityTextWrap}>
                    <Text style={[styles.accountabilityName, { color: theme.text }]}>{complaint.supervisor_name}</Text>
                    <Text style={[styles.accountabilityRole, { color: theme.textSecondary }]}>Safety Inspector</Text>
                  </View>
                </View>
                <Text style={styles.accountabilityTime}>1:10 PM</Text>
              </View>
            )}
            
            {complaint.solver_name && (
              <>
                <View style={[styles.accountabilityDivider, { backgroundColor: borderColor }]} />
                <View style={styles.accountabilityRow}>
                  <View style={styles.accountabilityUser}>
                    <View style={styles.avatarWrap}>
                      <Avatar name={complaint.solver_name} uri={`https://i.pravatar.cc/150?u=${complaint.solver_name}`} size="small" />
                      <View style={[styles.statusDot, { backgroundColor: '#eab308', borderColor: surfaceColor }]} />
                    </View>
                    <View style={styles.accountabilityTextWrap}>
                      <Text style={[styles.accountabilityName, { color: theme.text }]}>{complaint.solver_name}</Text>
                      <Text style={[styles.accountabilityRole, { color: theme.textSecondary }]}>Facility Manager</Text>
                    </View>
                  </View>
                  <Text style={styles.accountabilityTime}>1:15 PM</Text>
                </View>
              </>
            )}

            <View style={[styles.accountabilityDivider, { backgroundColor: borderColor }]} />
            <View style={styles.accountabilityRow}>
              <View style={styles.accountabilityUser}>
                <View style={styles.avatarWrap}>
                  <Avatar name="AI Operations Bot" size="small" />
                  <View style={[styles.statusDot, { backgroundColor: primaryRed, borderColor: surfaceColor }]} />
                </View>
                <View style={styles.accountabilityTextWrap}>
                  <Text style={[styles.accountabilityName, { color: theme.text }]}>AI Operations Bot</Text>
                  <Text style={[styles.accountabilityRole, { color: theme.textSecondary }]}>Automated Reviewer</Text>
                </View>
              </View>
              <Text style={styles.accountabilityTime}>1:16 PM</Text>
            </View>
          </View>
        </View>

        {/* ── EVIDENCE ATTACHED ── */}
        {complaint.complaint_image_url && (
          <View style={[styles.card, { backgroundColor: surfaceColor, borderColor, paddingVertical: 20 }]}>
            <View style={styles.sectionHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="image-outline" size={16} color={theme.textSecondary} />
                <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>EVIDENCE ATTACHED</Text>
              </View>
            </View>
            <View style={styles.evidenceGallery}>
              <View style={styles.evidenceImageWrap}>
                <Image source={{ uri: complaint.complaint_image_url }} style={styles.evidenceImageMock} resizeMode="cover" />
                <View style={styles.expandIconWrap}><Ionicons name="expand" size={14} color="#fff" /></View>
              </View>
              <View style={styles.evidenceImageWrap}>
                <Image source={{ uri: complaint.complaint_image_url }} style={styles.evidenceImageMock} resizeMode="cover" />
                <View style={styles.expandIconWrap}><Ionicons name="expand" size={14} color="#fff" /></View>
              </View>
            </View>
            <View style={styles.galleryDots}>
              <View style={[styles.dot, styles.dotActive, { backgroundColor: primaryBlue }]} />
              <View style={[styles.dot, { backgroundColor: borderColor }]} />
            </View>
          </View>
        )}

        {/* ── TIMELINE ACTIVITY (Mockup match) ── */}
        <View style={[styles.card, { backgroundColor: surfaceColor, borderColor, paddingVertical: 20 }]}>
          <View style={styles.sectionHeaderRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="time-outline" size={16} color={theme.textSecondary} />
              <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>TIMELINE ACTIVITY</Text>
            </View>
          </View>
          <View style={styles.timelineList}>
            <View style={styles.timelineItem}>
              <View style={styles.timelineIconWrap}>
                <View style={[styles.timelineIconBox, { borderColor }]}><Ionicons name="warning-outline" size={14} color={theme.textSecondary} /></View>
                <View style={[styles.timelineLine, { backgroundColor: borderColor }]} />
              </View>
              <View style={styles.timelineContent}>
                <Text style={[styles.timelineDesc, { color: theme.text }]}><Text style={{fontWeight:'700'}}>System</Text> escalated this ticket to urgent status</Text>
                <Text style={styles.timelineSub}>24M AGO</Text>
              </View>
            </View>

            <View style={styles.timelineItem}>
              <View style={styles.timelineIconWrap}>
                <View style={[styles.timelineIconBox, { borderColor }]}><Ionicons name="image-outline" size={14} color={theme.textSecondary} /></View>
                <View style={[styles.timelineLine, { backgroundColor: borderColor }]} />
              </View>
              <View style={styles.timelineContent}>
                <Text style={[styles.timelineDesc, { color: theme.text }]}><Text style={{fontWeight:'700'}}>{complaint.supervisor_name || 'Sarah Jenkins'}</Text> added 3 photos to evidence</Text>
                <Text style={styles.timelineSub}>18M AGO</Text>
              </View>
            </View>

            <View style={[styles.timelineItem, { marginBottom: 0 }]}>
              <View style={styles.timelineIconWrap}>
                <View style={[styles.timelineIconBox, { borderColor }]}><Ionicons name="shield-checkmark-outline" size={14} color={theme.textSecondary} /></View>
              </View>
              <View style={styles.timelineContent}>
                <Text style={[styles.timelineDesc, { color: theme.text }]}><Text style={{fontWeight:'700'}}>AI Bot</Text> verified location data (North Wing)</Text>
                <Text style={styles.timelineSub}>12M AGO</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* ── BOTTOM ACTION BAR ── */}
      <View style={[styles.bottomActionBar, { backgroundColor: surfaceColor, borderTopColor: borderColor }]}>
        <TouchableOpacity style={[styles.actionBtn, styles.actionApprove, { borderColor }]}>
          <Ionicons name="checkmark-outline" size={18} color={theme.text} />
          <Text style={[styles.actionBtnText, { color: theme.text }]}>Approve</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={[styles.actionBtn, styles.actionReject, { backgroundColor: primaryRed }]}>
          <Ionicons name="close-outline" size={18} color="#ffffff" />
          <Text style={[styles.actionBtnText, { color: '#ffffff' }]}>Reject</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={[styles.actionChatBtn, { borderColor }]}>
          <Ionicons name="chatbubble-outline" size={18} color={theme.text} />
        </TouchableOpacity>
      </View>

      <FullScreenSpinner visible={refreshing} message="Updating Complaint..." color={primaryRed} />

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
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 3 },
      android: { elevation: 2 },
    }),
  },
  backButton: { padding: 4, marginLeft: -4 },
  headerTitle: { fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },
  headerRight: { width: 32, alignItems: 'flex-end' },
  placeholder: { width: 32 },
  webRefreshButton: { padding: 4 },
  
  content: { flex: 1, paddingHorizontal: 16, paddingTop: 16 },
  
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
    gap: 8,
  },
  alertText: { color: '#ef4444', fontWeight: '700', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 },

  card: { 
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.02, shadowRadius: 6 },
      android: { elevation: 1 },
    }),
  },

  titleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  date: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  issueTitle: { fontSize: 22, fontWeight: '800', letterSpacing: -0.4, lineHeight: 28 },
  
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  details: { fontSize: 14, lineHeight: 24, letterSpacing: 0, marginTop: 6 },

  statsGrid: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  statBox: { 
    flex: 1, 
    padding: 16, 
    borderRadius: 12, 
    borderWidth: 1,
  },
  statIconWrap: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  statLabel: { fontSize: 9, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  statValue: { fontSize: 14, fontWeight: '700' },
  
  issueRefCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  issueRefLeft: { flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 },
  iconWrapper: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  issueRefContent: { flex: 1 },
  issueLink: { fontSize: 14, fontWeight: '700', letterSpacing: -0.2, marginBottom: 2 },
  issueSubtitle: { fontSize: 10, fontWeight: '600', letterSpacing: 0.5 },
  
  accountabilityList: { marginTop: 4 },
  accountabilityRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 },
  accountabilityUser: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatarWrap: { position: 'relative' },
  statusDot: { position: 'absolute', bottom: -2, right: -2, width: 12, height: 12, borderRadius: 6, borderWidth: 2 },
  accountabilityTextWrap: { justifyContent: 'center' },
  accountabilityName: { fontSize: 14, fontWeight: '700', marginBottom: 2 },
  accountabilityRole: { fontSize: 11, fontStyle: 'italic' },
  accountabilityTime: { fontSize: 10, fontWeight: '600', color: '#9ca3af' },
  accountabilityDivider: { height: StyleSheet.hairlineWidth, marginLeft: 50 },

  evidenceGallery: { flexDirection: 'row', gap: 12 },
  evidenceImageWrap: { flex: 1, height: 140, borderRadius: 12, overflow: 'hidden', position: 'relative' },
  evidenceImageMock: { width: '100%', height: '100%' },
  expandIconWrap: { position: 'absolute', bottom: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.5)', padding: 4, borderRadius: 6 },
  galleryDots: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: 16 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  dotActive: { width: 14 },
  
  timelineList: { marginTop: 4 },
  timelineItem: { flexDirection: 'row', marginBottom: 16 },
  timelineIconWrap: { alignItems: 'center', width: 24, marginRight: 16 },
  timelineIconBox: { width: 24, height: 24, borderRadius: 12, borderWidth: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'transparent', zIndex: 2 },
  timelineLine: { width: 1, flex: 1, position: 'absolute', top: 24, bottom: -16, zIndex: 1 },
  timelineContent: { flex: 1, paddingBottom: 4, paddingTop: 2 },
  timelineDesc: { fontSize: 13, lineHeight: 20 },
  timelineSub: { fontSize: 10, fontWeight: '700', color: '#9ca3af', letterSpacing: 0.5, marginTop: 4 },

  bottomActionBar: { 
    position: 'absolute', 
    bottom: 0, left: 0, right: 0, 
    flexDirection: 'row', 
    padding: 16, 
    paddingBottom: Platform.OS === 'ios' ? 32 : 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 10
  },
  actionBtn: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', height: 48, borderRadius: 12, gap: 8 },
  actionApprove: { borderWidth: 1 },
  actionReject: { },
  actionBtnText: { fontSize: 14, fontWeight: '700' },
  actionChatBtn: { width: 48, height: 48, borderRadius: 12, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
});