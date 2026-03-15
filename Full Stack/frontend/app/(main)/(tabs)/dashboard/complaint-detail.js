import React, { useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Platform } from 'react-native';
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

export default function ComplaintDetailScreen() {
  const { theme, isDark } = useTheme();
  const router = useRouter();
  const { id, fromNotification } = useLocalSearchParams(); 
  
  const dispatch = useDispatch();
  const complaint = useSelector(selectCurrentComplaint);
  const loading = useSelector(selectComplaintsLoading);

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

  if (loading || !complaint) return <Loader message="Loading complaint details..." />;

  // ── PREMIUM PALETTE ──
  const bgColor = isDark ? '#1a1a1a' : '#f4f4f5';
  const surfaceColor = isDark ? '#242424' : '#ffffff';
  const borderColor = isDark ? '#333333' : '#e5e5e5';
  const iconBg = isDark ? 'rgba(255,255,255,0.05)' : '#f4f4f4';
  const alertBg = isDark ? 'rgba(239,68,68,0.15)' : 'rgba(239,68,68,0.08)';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]}>
      
      {/* ── HEADER ── */}
      <View style={[styles.header, { backgroundColor: surfaceColor, borderBottomColor: borderColor }]}>
        <TouchableOpacity onPress={handleSmartBack} activeOpacity={0.6} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Complaint #{complaint.id}</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        
        {/* ── MAIN COMPLAINT DETAILS ── */}
        <View style={[styles.card, { backgroundColor: surfaceColor, borderColor, overflow: 'hidden', padding: 0 }]}>
          {/* Top Banner Alert */}
          <View style={[styles.alertBanner, { backgroundColor: alertBg }]}>
            <Ionicons name="warning" size={16} color="#ef4444" />
            <Text style={styles.alertText}>Official Complaint Ticket</Text>
          </View>
          
          <View style={{ padding: 20 }}>
            <View style={styles.titleRow}>
              <Text style={[styles.date, { color: theme.textSecondary }]}>
                Filed on {formatDateTime(complaint.created_at)}
              </Text>
            </View>
            
            <Text style={[styles.issueTitle, { color: theme.text }]}>
              {complaint.issue_title}
            </Text>
            
            <Text style={[styles.sectionTitle, { color: theme.textSecondary, marginTop: 16 }]}>Details</Text>
            <Text style={[styles.details, { color: theme.text }]}>{complaint.complaint_details}</Text>
          </View>
        </View>

        {/* ── SYSTEM METADATA GRID ── */}
        <View style={styles.statsGrid}>
          <View style={[styles.statBox, { backgroundColor: surfaceColor, borderColor }]}>
            <View style={[styles.statIcon, { backgroundColor: iconBg }]}>
              <Ionicons name="document-text-outline" size={18} color={theme.textSecondary} />
            </View>
            <View>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Assignment Ref</Text>
              <Text style={[styles.statValue, { color: theme.text }]}>#{complaint.assignment_id}</Text>
            </View>
          </View>

          <View style={[styles.statBox, { backgroundColor: surfaceColor, borderColor }]}>
            <View style={[styles.statIcon, { backgroundColor: iconBg }]}>
              <Ionicons name="time-outline" size={18} color={theme.textSecondary} />
            </View>
            <View>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Last Updated</Text>
              <Text style={[styles.statValue, { color: theme.text }]}>
                {new Date(complaint.updated_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
          </View>
        </View>

        {/* ── RELATED ISSUE LINK ── */}
        <TouchableOpacity
          activeOpacity={0.7}
          style={[styles.card, styles.issueRefCard, { backgroundColor: surfaceColor, borderColor }]}
          onPress={() => router.push({ pathname: '/(main)/(tabs)/dashboard/issue-detail', params: { id: complaint.issue_id } })}
        >
          <View style={styles.issueRefLeft}>
            <View style={[styles.iconWrapper, { backgroundColor: iconBg }]}>
              <Ionicons name="link-outline" size={20} color={theme.text} />
            </View>
            <View style={styles.issueRefContent}>
              <Text style={[styles.issueLink, { color: theme.text }]}>View Original Issue</Text>
              <Text style={[styles.issueSubtitle, { color: theme.textSecondary }]} numberOfLines={1}>
                Issue #{complaint.issue_id} · {complaint.issue_title}
              </Text>
            </View>
          </View>
          <Ionicons name="arrow-forward" size={18} color={theme.textSecondary} style={{ opacity: 0.5 }} />
        </TouchableOpacity>

        {/* ── CHAIN OF ACCOUNTABILITY (Beautiful Timeline UI) ── */}
        <View style={[styles.card, { backgroundColor: surfaceColor, borderColor, padding: 24 }]}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary, marginBottom: 20 }]}>Chain of Accountability</Text>
          
          <View style={styles.trackerContainer}>
            
            {/* Origin Node: Supervisor */}
            {complaint.supervisor_name && (
              <View style={styles.trackerRow}>
                <View style={styles.trackerNode}>
                  <View style={[styles.nodeDot, { backgroundColor: '#3b82f6', shadowColor: '#3b82f6', shadowOpacity: 0.3, shadowRadius: 6 }]} />
                  <View style={[styles.nodeLine, { backgroundColor: borderColor }]} />
                </View>
                
                <View style={styles.trackerContent}>
                  <Text style={[styles.trackerRole, { color: theme.textSecondary }]}>Raised By (Supervisor)</Text>
                  <View style={[styles.trackerUserCard, { backgroundColor: iconBg, borderColor }]}>
                    <Avatar name={complaint.supervisor_name} size="small" />
                    <Text style={[styles.trackerName, { color: theme.text }]}>{complaint.supervisor_name}</Text>
                  </View>
                </View>
              </View>
            )}

            {/* Target Node: Solver */}
            {complaint.solver_name && (
              <View style={[styles.trackerRow, { marginTop: 0 }]}>
                <View style={styles.trackerNode}>
                  <View style={[styles.nodeDot, { backgroundColor: '#ef4444', shadowColor: '#ef4444', shadowOpacity: 0.3, shadowRadius: 6 }]} />
                </View>
                
                <View style={[styles.trackerContent, { paddingBottom: 0 }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                    <Text style={[styles.trackerRole, { color: '#ef4444', marginBottom: 0 }]}>Target Solver </Text>
                    <View style={styles.againstPill}>
                      <Text style={styles.againstPillText}>Against</Text>
                    </View>
                  </View>
                  
                  <View style={[styles.trackerUserCard, { backgroundColor: alertBg, borderColor: 'rgba(239,68,68,0.2)' }]}>
                    <Avatar name={complaint.solver_name} size="small" />
                    <Text style={[styles.trackerName, { color: theme.text }]}>{complaint.solver_name}</Text>
                  </View>
                </View>
              </View>
            )}

          </View>
        </View>

        {/* ── EVIDENCE PHOTO ── */}
        {complaint.complaint_image_url && (
          <View style={[styles.card, { backgroundColor: surfaceColor, borderColor }]}>
            <View style={styles.photoHeader}>
              <Ionicons name="image-outline" size={18} color={theme.textSecondary} />
              <Text style={[styles.sectionTitle, { color: theme.textSecondary, marginBottom: 0, marginLeft: 8 }]}>Evidence Attached</Text>
            </View>
            <Image
              source={{ uri: complaint.complaint_image_url }}
              style={[styles.evidenceImage, { borderColor }]}
              resizeMode="cover"
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
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 3 },
      android: { elevation: 2 },
    }),
  },
  backButton: { padding: 4, marginLeft: -4 },
  headerTitle: { fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },
  placeholder: { width: 32 },
  
  content: { flex: 1, paddingHorizontal: 16 },
  
  card: { 
    marginTop: 16, 
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 10 },
      android: { elevation: 1 },
    }),
  },
  
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 8,
  },
  alertText: { color: '#ef4444', fontWeight: '700', fontSize: 13, textTransform: 'uppercase', letterSpacing: 1 },

  titleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  date: { fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  issueTitle: { fontSize: 20, fontWeight: '800', letterSpacing: -0.4, lineHeight: 26 },
  
  sectionTitle: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 },
  details: { fontSize: 16, lineHeight: 26, letterSpacing: -0.1, marginTop: 6 },

  statsGrid: { flexDirection: 'row', gap: 12, marginTop: 16 },
  statBox: { 
    flex: 1, 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 16, 
    borderRadius: 16, 
    borderWidth: 1,
    gap: 12
  },
  statIcon: { padding: 8, borderRadius: 10 },
  statLabel: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  statValue: { fontSize: 15, fontWeight: '700' },
  
  issueRefCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  issueRefLeft: { flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 },
  iconWrapper: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  issueRefContent: { flex: 1 },
  issueLink: { fontSize: 16, fontWeight: '700', letterSpacing: -0.2, marginBottom: 4 },
  issueSubtitle: { fontSize: 14 },
  
  // ── NEW: Timeline Tracker Styles ──
  trackerContainer: { marginTop: 4 },
  trackerRow: { flexDirection: 'row' },
  trackerNode: { width: 24, alignItems: 'center' },
  nodeDot: { width: 14, height: 14, borderRadius: 7, zIndex: 2, marginTop: 2 },
  nodeLine: { width: 2, flex: 1, marginVertical: 4, borderRadius: 1, opacity: 0.5 },
  trackerContent: { flex: 1, paddingBottom: 28, paddingLeft: 12, marginTop: -2 },
  trackerRole: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  trackerUserCard: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 12, 
    padding: 12, 
    borderRadius: 14,
    borderWidth: 1
  },
  trackerName: { fontSize: 16, fontWeight: '600' },
  againstPill: { backgroundColor: '#ef4444', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginLeft: 4 },
  againstPillText: { color: '#ffffff', fontSize: 9, fontWeight: '800', textTransform: 'uppercase' },
  
  photoHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  evidenceImage: { width: '100%', height: 240, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth },
  
  bottomPadding: { height: 50 },
});