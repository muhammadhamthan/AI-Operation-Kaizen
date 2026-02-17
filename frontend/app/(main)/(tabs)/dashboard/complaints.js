import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, Image, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../../src/theme/ThemeContext';
import { selectCurrentUser } from '../../../../src/store/slices/authSlice';
import { fetchComplaints, selectFilteredComplaints, selectComplaintsLoading, setFilters } from '../../../../src/store/slices/complaintsSlice';
import { selectIsOnline } from '../../../../src/store/slices/offlineSlice';
import Card from '../../../../src/components/common/Card';
import Avatar from '../../../../src/components/common/Avatar';
import Loader from '../../../../src/components/common/Loader';
import EmptyState from '../../../../src/components/common/EmptyState';
import Toast from '../../../../src/components/common/Toast';

export default function ComplaintsScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const dispatch = useDispatch();
  const user = useSelector(selectCurrentUser);
  const complaints = useSelector(selectFilteredComplaints);
  const loading = useSelector(selectComplaintsLoading);
  const isOnline = useSelector(selectIsOnline);
  const [searchText, setSearchText] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => {
    if (user) dispatch(fetchComplaints(user));
  }, [user]);

  useEffect(() => {
    dispatch(setFilters({ search: searchText }));
  }, [searchText]);

  const onRefresh = useCallback(async () => {
    if (!isOnline) {
      setToastMessage("Can't refresh while offline");
      setTimeout(() => setToastMessage(''), 3000);
      return;
    }

    const now = Date.now();
    if (lastRefresh && now - lastRefresh < 5000) {
      setToastMessage('Just refreshed. Wait a moment.');
      setTimeout(() => setToastMessage(''), 3000);
      return;
    }

    setRefreshing(true);
    if (user) {
      await dispatch(fetchComplaints(user));
    }
    setLastRefresh(Date.now());
    setRefreshing(false);
  }, [user, isOnline, lastRefresh]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'OPEN': return '#3b82f6';
      case 'INVESTIGATING': return '#f97316';
      case 'ESCALATED': return '#ef4444';
      case 'RESOLVED': return '#16a34a';
      default: return '#6b7280';
    }
  };

  const renderItem = ({ item }) => (
    <Card
      style={[styles.card, { borderLeftWidth: 4, borderLeftColor: '#ef4444' }]}
      onPress={() => router.push({ pathname: '/(main)/(tabs)/dashboard/complaint-detail', params: { id: item.id } })}
    >
      <View style={styles.cardHeader}>
        <Text style={[styles.cardId, { color: '#ef4444' }]}>Complaint #{item.id}</Text>
        <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(item.status)}15` }]}>
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>{item.status}</Text>
        </View>
      </View>
      <Text style={[styles.cardDescription, { color: theme.text }]} numberOfLines={2}>
        {item.complaint_details}
      </Text>
      <View style={styles.cardInfo}>
        <View style={styles.personInfo}>
          <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Raised by:</Text>
          <Avatar uri={item.raisedBy?.avatar} name={item.raisedBy?.name} size="small" />
          <Text style={[styles.personName, { color: theme.text }]}>{item.raisedBy?.name}</Text>
        </View>
        {item.targetSolver && (
          <View style={styles.personInfo}>
            <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Against:</Text>
            <Avatar uri={item.targetSolver?.avatar} name={item.targetSolver?.name} size="small" />
            <Text style={[styles.personName, { color: theme.text }]}>{item.targetSolver?.name}</Text>
          </View>
        )}
      </View>
      {item.complaint_image_url && (
        <Image source={{ uri: item.complaint_image_url }} style={styles.thumbnail} resizeMode="cover" />
      )}
    </Card>
  );

  if (loading && complaints.length === 0) return <Loader message="Loading complaints..." />;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { backgroundColor: '#ef4444' }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Complaints</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={[styles.searchContainer, { backgroundColor: theme.card }]}>
        <View style={[styles.searchInput, { backgroundColor: theme.inputBackground }]}>
          <Ionicons name="search" size={20} color={theme.textSecondary} />
          <TextInput
            style={[styles.searchTextInput, { color: theme.text }]}
            placeholder="Search complaints..."
            placeholderTextColor={theme.textSecondary}
            value={searchText}
            onChangeText={setSearchText}
          />
          {searchText !== '' && (
            <TouchableOpacity onPress={() => setSearchText('')}>
              <Ionicons name="close-circle" size={20} color={theme.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.resultsHeader}>
        <Text style={[styles.resultsCount, { color: theme.textSecondary }]}>
          {complaints.length} complaint{complaints.length !== 1 ? 's' : ''} found
        </Text>
      </View>

      <FlatList
        data={complaints}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={<EmptyState icon="shield-checkmark-outline" title="No complaints" message="There are no complaints to display." />}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#ef4444']}
            tintColor="#ef4444"
          />
        }
      />

      {toastMessage !== '' && <Toast message={toastMessage} />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 16 },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#fff' },
  placeholder: { width: 32 },
  searchContainer: { padding: 16, paddingBottom: 8 },
  searchInput: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, gap: 8 },
  searchTextInput: { flex: 1, fontSize: 16 },
  resultsHeader: { paddingHorizontal: 16, paddingBottom: 8 },
  resultsCount: { fontSize: 13 },
  listContent: { padding: 16, paddingTop: 0 },
  card: { marginBottom: 12 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  cardId: { fontSize: 14, fontWeight: '700' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 11, fontWeight: '600' },
  cardDescription: { fontSize: 15, lineHeight: 22, marginBottom: 12 },
  cardInfo: { gap: 8, marginBottom: 12 },
  personInfo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  infoLabel: { fontSize: 12, width: 60 },
  personName: { fontSize: 13, fontWeight: '500' },
  thumbnail: { width: '100%', height: 120, borderRadius: 8, backgroundColor: '#e5e7eb' },
});
