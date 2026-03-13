import React, { useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../../src/theme/ThemeContext';
import { selectCurrentUser } from '../../../../src/store/slices/authSlice';
import { fetchComplaintById, selectCurrentComplaint, selectComplaintsLoading, clearCurrentComplaint } from '../../../../src/store/slices/complaintsSlice';
import Card from '../../../../src/components/common/Card';
import Avatar from '../../../../src/components/common/Avatar';
import Button from '../../../../src/components/common/Button';
import Loader from '../../../../src/components/common/Loader';
import StatusBadge from '../../../../src/components/common/StatusBadge';
import { formatDate, formatDateTime } from '../../../../src/utils/formatters';
import { useSmartBack } from '../../../../src/hooks/useSmartBack';

export default function ComplaintDetailScreen() {
  const { theme, isDark } = useTheme(); // 🚀 Added isDark for premium shading
  const router = useRouter();
  
  const { id, fromNotification } = useLocalSearchParams(); 
  
  const dispatch = useDispatch();
  const user = useSelector(selectCurrentUser);
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
  }, [id]);

  if (loading || !complaint) return <Loader message="Loading complaint details..." />;

  // ── PREMIUM SEMANTIC COLORS ──
  const getStatusColor = (status) => {
    switch (status) {
      case 'OPEN': return '#8b5cf6';         // Purple
      case 'INVESTIGATING': return '#f59e0b'; // Amber
      case 'ESCALATED': return '#ef4444';     // Red
      case 'RESOLVED': return '#10a37f';      // OpenAI Green
      default: return '#8e8ea0';
    }
  };

  // ── PREMIUM PALETTE ──
  const bgColor = isDark ? '#212121' : '#f9f9f9';
  const surfaceColor = isDark ? '#171717' : '#ffffff';
  const borderColor = isDark ? '#333333' : '#e5e5e5';
  const iconBg = isDark ? 'rgba(255,255,255,0.05)' : '#f4f4f4';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]}>
      
      {/* ── HEADER (Stripped harsh red, made premium flat) ── */}
      <View style={[styles.header, { backgroundColor: bgColor, borderBottomColor: borderColor }]}>
        <TouchableOpacity onPress={handleSmartBack} activeOpacity={0.6} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.textSecondary }]}>Complaint #{complaint.id}</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        
        {/* ── MAIN COMPLAINT DETAILS ── */}
        <View style={[styles.card, styles.flatCard, { backgroundColor: surfaceColor, borderColor }]}>
          <View style={styles.statusRow}>
            <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(complaint.status)}15` }]}>
              <View style={[styles.statusDot, { backgroundColor: getStatusColor(complaint.status) }]} />
              <Text style={[styles.statusText, { color: getStatusColor(complaint.status) }]}>
                {complaint.status}
              </Text>
            </View>
            <Text style={[styles.date, { color: theme.textSecondary }]}>
              {formatDateTime(complaint.created_at)}
            </Text>
          </View>
          
          <Text style={[styles.sectionTitle, { color: theme.textSecondary, marginTop: 8 }]}>Details</Text>
          <Text style={[styles.details, { color: theme.text }]}>{complaint.complaint_details}</Text>
        </View>

        {/* ── RELATED ISSUE LINK ── */}
        <TouchableOpacity
          activeOpacity={0.7}
          style={[styles.card, styles.flatCard, styles.issueRefCard, { backgroundColor: surfaceColor, borderColor }]}
          onPress={() => router.push({ pathname: '/(main)/(tabs)/dashboard/issue-detail', params: { id: complaint.issue_id } })}
        >
          <View style={styles.issueRefLeft}>
            <View style={[styles.iconWrapper, { backgroundColor: iconBg }]}>
              <Ionicons name="link-outline" size={18} color={theme.textSecondary} />
            </View>
            <View style={styles.issueRefContent}>
              <Text style={[styles.issueLink, { color: theme.text }]}>Issue #{complaint.issue_id}</Text>
              <Text style={[styles.issueTitle, { color: theme.textSecondary }]} numberOfLines={1}>
                {complaint.issue?.title || 'View associated issue details'}
              </Text>
            </View>
          </View>
          <Ionicons name="arrow-forward" size={16} color={theme.textSecondary} style={{ opacity: 0.5 }} />
        </TouchableOpacity>

        {/* ── PEOPLE INVOLVED ── */}
        <View style={[styles.card, styles.flatCard, { backgroundColor: surfaceColor, borderColor }]}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>People Involved</Text>
          
          <View style={styles.peopleGrid}>
            {complaint.raisedBy && (
              <View style={[styles.personRow, { borderBottomColor: borderColor, borderBottomWidth: StyleSheet.hairlineWidth }]}>
                <Avatar uri={complaint.raisedBy.avatar} name={complaint.raisedBy.name} size="medium" />
                <View style={styles.personInfo}>
                  <Text style={[styles.personName, { color: theme.text }]}>{complaint.raisedBy.name}</Text>
                  <Text style={[styles.personRole, { color: theme.textSecondary }]}>Raised By</Text>
                </View>
              </View>
            )}
            
            {complaint.targetSolver && (
              <View style={[styles.personRow, { paddingTop: 12 }]}>
                <Avatar uri={complaint.targetSolver.avatar} name={complaint.targetSolver.name} size="medium" />
                <View style={styles.personInfo}>
                  <Text style={[styles.personName, { color: theme.text }]}>{complaint.targetSolver.name}</Text>
                  <View style={styles.againstBadge}>
                    <Text style={[styles.personRole, { color: '#ef4444', fontWeight: '600' }]}>Against</Text>
                  </View>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* ── EVIDENCE PHOTO ── */}
        {complaint.complaint_image_url && (
          <View style={[styles.card, styles.flatCard, { backgroundColor: surfaceColor, borderColor }]}>
            <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Evidence Photo</Text>
            <Image
              source={{ uri: complaint.complaint_image_url }}
              style={[styles.evidenceImage, { borderColor }]}
              resizeMode="cover"
            />
          </View>
        )}

        {/* ── ACTIONS ── */}
        {user?.role === 'manager' && (
          <View style={styles.actions}>
            <Text style={[styles.sectionTitle, { color: theme.textSecondary, marginBottom: 12, marginLeft: 4 }]}>Manager Actions</Text>
            <View style={styles.actionButtons}>
              <Button
                title="Re-assign Issue"
                variant="secondary"
                icon="swap-horizontal-outline"
                onPress={() => Alert.alert('Coming Soon', 'Phase 2-3')}
                style={styles.actionBtn}
              />
              <Button
                title="Resolve Complaint"
                variant="primary"
                icon="checkmark-circle-outline"
                onPress={() => Alert.alert('Coming Soon', 'Phase 2-3')}
                style={styles.actionBtn}
              />
            </View>
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
  
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  statusBadge: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 10, 
    paddingVertical: 6, 
    borderRadius: 8, // Squircle badge
    gap: 6
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },
  date: { fontSize: 13, fontWeight: '500' },
  
  sectionTitle: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 },
  details: { fontSize: 15, lineHeight: 24, letterSpacing: -0.1 },
  
  issueRefCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  issueRefLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  iconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  issueRefContent: { flex: 1 },
  issueLink: { fontSize: 15, fontWeight: '600', letterSpacing: -0.2, marginBottom: 2 },
  issueTitle: { fontSize: 13 },
  
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
  againstBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  
  evidenceImage: { width: '100%', height: 220, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth },
  
  actions: { 
    marginHorizontal: 16, 
    marginTop: 32,
  },
  actionButtons: {
    gap: 12,
  },
  actionBtn: {
    // Ensuring buttons don't have weird default margins
    marginTop: 0, 
  },
  
  bottomPadding: { height: 40 },
});