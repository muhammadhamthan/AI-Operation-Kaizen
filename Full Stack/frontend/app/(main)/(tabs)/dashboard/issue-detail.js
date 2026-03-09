import React, { useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSmartBack } from '../../../../src/hooks/useSmartBack';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../../src/theme/ThemeContext';
import { selectCurrentUser } from '../../../../src/store/slices/authSlice';
import { fetchIssueById, selectCurrentIssue, selectIssuesLoading, clearCurrentIssue } from '../../../../src/store/slices/issuesSlice';
// ✅ ADDED: Brought over your formatters from the other file so dates look clean
import { formatDate } from '../../../../src/utils/formatters'; 
import StatusBadge from '../../../../src/components/common/StatusBadge';
import Avatar from '../../../../src/components/common/Avatar';
import Button from '../../../../src/components/common/Button';
import IssueTimeline from '../../../../src/components/issue/IssueTimeline';
import ImageGallery from '../../../../src/components/issue/ImageGallery';
import CallHistorySection from '../../../../src/components/issue/CallHistorySection';
import Loader from '../../../../src/components/common/Loader';

export default function IssueDetailScreen() {
  const { theme, isDark } = useTheme(); 
  const router = useRouter();
  
  const { id, fromNotification } = useLocalSearchParams();

  // ── LOGIC UNTOUCHED ──
  const handleSmartBack = useCallback(() => {
    if (fromNotification === 'true') {
      router.replace('/(main)/(tabs)/dashboard');
      setTimeout(() => {
        router.navigate('/(main)/(tabs)/chat');
      }, 100); 
    } else {
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/(main)/(tabs)/dashboard');
      }
    }
  }, [fromNotification, router]);

  useSmartBack(handleSmartBack);

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

  // ── SAFEGUARD FOR ASSIGNMENTS (Backend sends an array now) ──
  const currentAssignment = issue.assignments && issue.assignments.length > 0 
    ? issue.assignments[0] 
    : null;

  // ── PREMIUM PALETTE ──
  const bgColor = isDark ? '#212121' : '#f9f9f9';
  const surfaceColor = isDark ? '#171717' : '#ffffff';
  const borderColor = isDark ? '#333333' : '#e5e5e5';
  const iconBg = isDark ? 'rgba(255,255,255,0.05)' : '#f4f4f4';

  return (
    <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: bgColor }]}>
      
      {/* ── HEADER ── */}
      <View style={[styles.header, { backgroundColor: bgColor, borderBottomColor: borderColor }]}>
        <TouchableOpacity onPress={handleSmartBack} activeOpacity={0.6} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.textSecondary }]}>Issue #{issue.id}</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        
        {/* ── ISSUE IDENTITY ── */}
        <View style={[styles.card, styles.flatCard, { backgroundColor: surfaceColor, borderColor }]}>
          <View style={styles.badgeRow}>
            <StatusBadge status={issue.status} size="small" />
            <StatusBadge status={issue.priority} type="priority" size="small" />
          </View>
          <Text style={[styles.title, { color: theme.text }]}>{issue.title}</Text>
          <Text style={[styles.description, { color: theme.textSecondary }]}>
            {issue.description}
          </Text>
        </View>

        {/* ── DETAILS ROW ── */}
        <View style={[styles.card, styles.flatCard, { backgroundColor: surfaceColor, borderColor }]}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Details</Text>
          
          <View style={styles.infoRow}>
            <View style={[styles.iconWrapper, { backgroundColor: iconBg }]}>
              <Ionicons name="location-outline" size={18} color={theme.textSecondary} />
            </View>
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Site</Text>
              {/* ✅ Mapped to flat site_name */}
              <Text style={[styles.infoValue, { color: theme.text }]}>{issue.site_name || 'N/A'}</Text>
            </View>
          </View>

          {/* ✅ Render site_location safely */}
          {issue.site_location && (
            <View style={styles.infoRow}>
              <View style={[styles.iconWrapper, { backgroundColor: iconBg }]}>
                <Ionicons name="map-outline" size={18} color={theme.textSecondary} />
              </View>
              <View style={styles.infoContent}>
                <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Location</Text>
                <Text style={[styles.infoValue, { color: theme.text }]}>{issue.site_location}</Text>
              </View>
            </View>
          )}

          {/* ✅ Added Due Date from the assignment block */}
          {currentAssignment?.due_date && (
            <View style={styles.infoRow}>
              <View style={[styles.iconWrapper, { backgroundColor: iconBg }]}>
                <Ionicons name="calendar-outline" size={18} color={theme.textSecondary} />
              </View>
              <View style={styles.infoContent}>
                <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Deadline</Text>
                <Text style={[styles.infoValue, { color: theme.text }]}>{formatDate(currentAssignment.due_date)}</Text>
              </View>
            </View>
          )}
          
          <View style={[styles.infoRow, { marginBottom: 0 }]}>
            <View style={[styles.iconWrapper, { backgroundColor: iconBg }]}>
              <Ionicons name="construct-outline" size={18} color={theme.textSecondary} />
            </View>
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Category</Text>
              <Text style={[styles.infoValue, { color: theme.text }]}>{issue.issue_type || 'General Maintenance'}</Text>
            </View>
          </View>
        </View>

        {/* ── PEOPLE INVOLVED ── */}
        <View style={[styles.card, styles.flatCard, { backgroundColor: surfaceColor, borderColor }]}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>People Involved</Text>
          <View style={styles.peopleGrid}>
            <View style={[styles.personRow, currentAssignment && { borderBottomColor: borderColor, borderBottomWidth: StyleSheet.hairlineWidth }]}>
              {/* ✅ Mapped to flat supervisor_name */}
              <Avatar name={issue.supervisor_name} size="medium" />
              <View style={styles.personInfo}>
                <Text style={[styles.personName, { color: theme.text }]} numberOfLines={1}>
                  {issue.supervisor_name || 'N/A'}
                </Text>
                <Text style={[styles.personRole, { color: theme.textSecondary }]}>Raised By</Text>
              </View>
            </View>
            
            {/* ✅ Mapped dynamically from the assignments array */}
            {currentAssignment && (
              <View style={[styles.personRow, { paddingTop: 12, paddingBottom: 0 }]}>
                <Avatar name={currentAssignment.solver_name} size="medium" />
                <View style={styles.personInfo}>
                  <Text style={[styles.personName, { color: theme.text }]} numberOfLines={1}>
                    {currentAssignment.solver_name}
                  </Text>
                  <Text style={[styles.personRole, { color: theme.textSecondary }]}>Assigned To</Text>
                </View>
                {currentAssignment.solver_phone && (
                   <Text style={[styles.personRole, { color: theme.textSecondary, marginTop: 4 }]}>
                     {currentAssignment.solver_phone}
                   </Text>
                )}
              </View>
            )}
          </View>
        </View>

        {/* ── PHOTOS ── */}
        <View style={[styles.card, styles.flatCard, { backgroundColor: surfaceColor, borderColor }]}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Photos</Text>
          <ImageGallery images={issue.images || []} />
        </View>

        {/* ── TIMELINE ── */}
        <View style={[styles.card, styles.flatCard, { backgroundColor: surfaceColor, borderColor }]}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Timeline</Text>
          <IssueTimeline history={issue.history || []} />
        </View>

        {/* ── CALL HISTORY (Solver Only) ── */}
        {user?.role === 'problem_solver' && issue.call_logs?.length > 0 && (
          <View style={[styles.card, styles.flatCard, { backgroundColor: surfaceColor, borderColor, padding: 0, overflow: 'hidden' }]}>
            <CallHistorySection callLogs={issue.call_logs} />
          </View>
        )}

        {/* ── ACTIONS ── */}
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
  title: { fontSize: 22, fontWeight: '700', letterSpacing: -0.5, marginBottom: 8, lineHeight: 28 },
  description: { fontSize: 15, lineHeight: 24, letterSpacing: -0.1 },

  sectionTitle: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 16 },
  
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 14 },
  iconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 10, // Squircle shape
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
  buttonMargin: { marginTop: 12 },
  bottomPadding: { height: 40 },
});