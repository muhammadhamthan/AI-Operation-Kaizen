import React, { useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Alert,
  Platform 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../../src/theme/ThemeContext';
import { selectCurrentUser } from '../../../../src/store/slices/authSlice';
import { fetchIssueById, selectCurrentIssue, selectIssuesLoading, clearCurrentIssue } from '../../../../src/store/slices/issuesSlice';
import { calculateOverdueDays } from '../../../../src/utils/overdue';
import StatusBadge from '../../../../src/components/common/StatusBadge';
import Button from '../../../../src/components/common/Button';
import IssueTimeline from '../../../../src/components/issue/IssueTimeline';
import ImageGallery from '../../../../src/components/issue/ImageGallery';
import Loader from '../../../../src/components/common/Loader';

export default function NotFixedDetailScreen() {
  const { theme, isDark } = useTheme(); // 🚀 Pulled in isDark for precise shading
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

  // ── PREMIUM PALETTE ──
  const bgColor = isDark ? '#212121' : '#f9f9f9';
  const surfaceColor = isDark ? '#171717' : '#ffffff';
  const borderColor = isDark ? '#333333' : '#e5e5e5';
  const iconBg = isDark ? 'rgba(255,255,255,0.05)' : '#f4f4f4';
  
  // Refined Warning Palette
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
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        
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
        </View>

        {/* ── PHOTOS ── */}
        <View style={[styles.card, styles.flatCard, { backgroundColor: surfaceColor, borderColor }]}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Attached Media</Text>
          <ImageGallery images={issue.images} />
        </View>

        {/* ── TIMELINE ── */}
        <View style={[styles.card, styles.flatCard, { backgroundColor: surfaceColor, borderColor }]}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Activity Log</Text>
          <IssueTimeline history={issue.history || []} />
        </View>

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
    borderRadius: 10, // Squircle shape
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoContent: { flex: 1, justifyContent: 'center' },
  infoLabel: { fontSize: 12, fontWeight: '500', marginBottom: 2 },
  infoValue: { fontSize: 15, fontWeight: '600', letterSpacing: -0.2 },
  
  actions: { marginHorizontal: 16, marginTop: 32 },
  bottomPadding: { height: 40 },
});