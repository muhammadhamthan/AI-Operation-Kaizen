import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Alert } from 'react-native';
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
import { formatDate } from '../../../../src/utils/formatters';

export default function ComplaintDetailScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const dispatch = useDispatch();
  const user = useSelector(selectCurrentUser);
  const complaint = useSelector(selectCurrentComplaint);
  const loading = useSelector(selectComplaintsLoading);

  useEffect(() => {
    if (id) dispatch(fetchComplaintById(parseInt(id)));
    return () => { dispatch(clearCurrentComplaint()); };
  }, [id]);

  if (loading || !complaint) return <Loader message="Loading complaint details..." />;

  const getStatusColor = (status) => {
    switch (status) {
      case 'OPEN': return '#3b82f6';
      case 'INVESTIGATING': return '#f97316';
      case 'ESCALATED': return '#ef4444';
      case 'RESOLVED': return '#16a34a';
      default: return '#6b7280';
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { backgroundColor: '#ef4444' }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Complaint #{complaint.id}</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Card style={styles.card}>
          <View style={styles.statusRow}>
            <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(complaint.status)}15` }]}>
              <Text style={[styles.statusText, { color: getStatusColor(complaint.status) }]}>{complaint.status}</Text>
            </View>
            <Text style={[styles.date, { color: theme.textSecondary }]}>{formatDate(complaint.created_at)}</Text>
          </View>
          <Text style={[styles.details, { color: theme.text }]}>{complaint.complaint_details}</Text>
        </Card>

        {/* Related Issue */}
        <Card
          style={styles.card}
          onPress={() => router.push({ pathname: '/(main)/(tabs)/dashboard/issue-detail', params: { id: complaint.issue_id } })}
        >
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Related Issue</Text>
          <View style={styles.issueRef}>
            <Ionicons name="link" size={18} color={theme.primary} />
            <Text style={[styles.issueLink, { color: theme.primary }]}>Issue #{complaint.issue_id}</Text>
            <Text style={[styles.issueTitle, { color: theme.textSecondary }]} numberOfLines={1}>
              {complaint.issue?.title}
            </Text>
          </View>
        </Card>

        {/* People */}
        <Card style={styles.card}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>People Involved</Text>
          <View style={styles.peopleRow}>
            {complaint.raisedBy && (
              <View style={styles.personItem}>
                <Avatar uri={complaint.raisedBy.avatar} name={complaint.raisedBy.name} size="medium" />
                <Text style={[styles.personName, { color: theme.text }]}>{complaint.raisedBy.name}</Text>
                <Text style={[styles.personRole, { color: theme.textSecondary }]}>Raised By</Text>
              </View>
            )}
            {complaint.targetSolver && (
              <View style={styles.personItem}>
                <Avatar uri={complaint.targetSolver.avatar} name={complaint.targetSolver.name} size="medium" />
                <Text style={[styles.personName, { color: theme.text }]}>{complaint.targetSolver.name}</Text>
                <Text style={[styles.personRole, { color: '#ef4444' }]}>Against</Text>
              </View>
            )}
          </View>
        </Card>

        {/* Evidence */}
        {complaint.complaint_image_url && (
          <Card style={styles.card}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Evidence Photo</Text>
            <Image
              source={{ uri: complaint.complaint_image_url }}
              style={styles.evidenceImage}
              resizeMode="cover"
            />
          </Card>
        )}

        {/* Actions */}
        {user?.role === 'manager' && (
          <View style={styles.actions}>
            <Button
              title="Re-assign Issue"
              variant="primary"
              icon="swap-horizontal-outline"
              onPress={() => Alert.alert('Coming Soon', 'Phase 2-3')}
            />
            <Button
              title="Resolve Complaint"
              variant="success"
              icon="checkmark-circle-outline"
              onPress={() => Alert.alert('Coming Soon', 'Phase 2-3')}
              style={{ marginTop: 12 }}
            />
          </View>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 16 },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#fff' },
  placeholder: { width: 32 },
  content: { flex: 1, padding: 16 },
  card: { marginBottom: 16 },
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  statusText: { fontSize: 12, fontWeight: '600' },
  date: { fontSize: 13 },
  details: { fontSize: 16, lineHeight: 24 },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 12 },
  issueRef: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  issueLink: { fontSize: 14, fontWeight: '600' },
  issueTitle: { flex: 1, fontSize: 14 },
  peopleRow: { flexDirection: 'row', justifyContent: 'space-around' },
  personItem: { alignItems: 'center', gap: 6 },
  personName: { fontSize: 14, fontWeight: '500' },
  personRole: { fontSize: 12 },
  evidenceImage: { width: '100%', height: 200, borderRadius: 12, backgroundColor: '#e5e7eb' },
  actions: { marginTop: 8 },
});
