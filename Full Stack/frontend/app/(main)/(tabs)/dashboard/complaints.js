import React, { useEffect, useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TextInput, 
  TouchableOpacity, 
  Image, 
  RefreshControl,
  Platform 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../../src/theme/ThemeContext';
import { selectCurrentUser } from '../../../../src/store/slices/authSlice';
import { fetchComplaints, selectFilteredComplaints, selectComplaintsLoading, setFilters } from '../../../../src/store/slices/complaintsSlice';
import { selectIsOnline } from '../../../../src/store/slices/offlineSlice';
import Avatar from '../../../../src/components/common/Avatar';
import Loader from '../../../../src/components/common/Loader';
import EmptyState from '../../../../src/components/common/EmptyState';
import Toast from '../../../../src/components/common/Toast';

export default function ComplaintsScreen() {
  const { theme, isDark } = useTheme(); // 🚀 Pulled in isDark for precise shading
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

  // ── LOGIC UNTOUCHED ──
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
    if (user) await dispatch(fetchComplaints(user));
    setLastRefresh(Date.now());
    setRefreshing(false);
  }, [user, isOnline, lastRefresh]);

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

  // ── PREMIUM MONOCHROME PALETTE ──
  const bgColor = isDark ? '#212121' : '#f9f9f9';
  const surfaceColor = isDark ? '#171717' : '#ffffff';
  const borderColor = isDark ? '#333333' : '#e5e5e5';
  const inactiveBg = isDark ? 'rgba(255,255,255,0.06)' : '#f4f4f4';

  const renderItem = ({ item }) => (
    <TouchableOpacity
      activeOpacity={0.7}
      style={[styles.card, { backgroundColor: surfaceColor, borderColor }]}
      onPress={() => router.push({ pathname: '/(main)/(tabs)/dashboard/complaint-detail', params: { id: item.id } })}
    >
      <View style={styles.cardHeader}>
        <View style={styles.idContainer}>
          <Ionicons name="warning" size={16} color="#ef4444" />
          <Text style={[styles.cardId, { color: theme.textSecondary }]}>#{item.id}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(item.status)}15` }]}>
          <View style={[styles.statusDot, { backgroundColor: getStatusColor(item.status) }]} />
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>{item.status}</Text>
        </View>
      </View>
      
      <Text style={[styles.cardDescription, { color: theme.text }]} numberOfLines={2}>
        {item.complaint_details}
      </Text>
      
      <View style={styles.cardInfo}>
        <View style={styles.personInfo}>
          <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>By:</Text>
          <Avatar uri={item.raisedBy?.avatar} name={item.raisedBy?.name} size="small" />
          <Text style={[styles.personName, { color: theme.text }]} numberOfLines={1}>{item.raisedBy?.name}</Text>
        </View>
        
        {item.targetSolver && (
          <View style={styles.personInfo}>
            <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Ps:</Text>
            <Avatar uri={item.targetSolver?.avatar} name={item.targetSolver?.name} size="small" />
            <Text style={[styles.personName, { color: theme.text }]} numberOfLines={1}>{item.targetSolver?.name}</Text>
          </View>
        )}
      </View>
      
      {item.complaint_image_url && (
        <Image 
          source={{ uri: item.complaint_image_url }} 
          style={[styles.thumbnail, { borderColor }]} 
          resizeMode="cover" 
        />
      )}
    </TouchableOpacity>
  );

  if (loading && complaints.length === 0) return <Loader message="Loading complaints..." />;

  return (
    <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: bgColor }]}>
      
      {/* ── HEADER ── */}
      <View style={[styles.header, { backgroundColor: bgColor, borderBottomColor: borderColor }]}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.6} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.textSecondary }]}>Complaints</Text>
        <View style={styles.placeholder} />
      </View>

      {/* ── SEARCH BAR ── */}
      <View style={[styles.searchContainer, { backgroundColor: bgColor }]}>
        <View style={[styles.searchInput, { backgroundColor: inactiveBg, borderColor }]}>
          <Ionicons name="search" size={18} color={theme.textSecondary} />
          <TextInput
            style={[styles.searchTextInput, { color: theme.text }]}
            placeholder="Search complaints..."
            placeholderTextColor={theme.textSecondary}
            value={searchText}
            onChangeText={setSearchText}
          />
          {searchText !== '' && (
            <TouchableOpacity onPress={() => setSearchText('')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close-circle" size={18} color={theme.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── RESULTS COUNT ── */}
      <View style={styles.resultsHeader}>
        <Text style={[styles.resultsCount, { color: theme.textSecondary }]}>
          {complaints.length} complaint{complaints.length !== 1 ? 's' : ''} found
        </Text>
      </View>

      {/* ── LIST ── */}
      <FlatList
        data={complaints}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <EmptyState 
            icon="shield-checkmark-outline" 
            title="No active complaints" 
            message="There are no complaints matching your criteria." 
          />
        }
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.textSecondary}
          />
        }
      />

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
  placeholder: { width: 32 },
  
  searchContainer: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12 },
  searchInput: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 14, 
    height: 44, // Matched globally with IssuesTabScreen
    borderRadius: 12, 
    borderWidth: 1,
    gap: 8 
  },
  searchTextInput: { flex: 1, fontSize: 15 },
  
  resultsHeader: { paddingHorizontal: 20, paddingBottom: 12 },
  resultsCount: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8 },
  
  listContent: { paddingHorizontal: 16, paddingBottom: 24 },
  
  card: { 
    marginBottom: 12,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    ...Platform.select({
      ios: { shadowOpacity: 0 },
      android: { elevation: 0 },
    }),
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  idContainer: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cardId: { fontSize: 14, fontWeight: '700', letterSpacing: 0.5 },
  
  statusBadge: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 10, 
    paddingVertical: 4, 
    borderRadius: 8, // Squircle shape
    gap: 6
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  
  cardDescription: { fontSize: 15, lineHeight: 22, letterSpacing: -0.1, marginBottom: 16 },
  
  cardInfo: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12, gap: 12 },
  personInfo: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 6 },
  infoLabel: { fontSize: 12, fontWeight: '600', width: 22 }, // Shortened labels ("By:" / "Ps:")
  personName: { fontSize: 13, fontWeight: '600', flexShrink: 1 },
  
  thumbnail: { 
    width: '100%', 
    height: 140, 
    borderRadius: 10, 
    borderWidth: StyleSheet.hairlineWidth,
    marginTop: 4 
  },
});