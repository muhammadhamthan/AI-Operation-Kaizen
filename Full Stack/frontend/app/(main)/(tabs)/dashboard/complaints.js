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
  const { theme, isDark } = useTheme();
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
    if (user) await dispatch(fetchComplaints(user));
    setLastRefresh(Date.now());
    setRefreshing(false);
  }, [user, isOnline, lastRefresh]);

  // ── Date Formatter ──
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const bgColor = isDark ? '#1a1a1a' : '#f4f4f5';
  const surfaceColor = isDark ? '#242424' : '#ffffff';
  const borderColor = isDark ? '#333333' : '#e5e5e5';
  const inactiveBg = isDark ? '#2a2a2a' : '#eeeeef';

  const renderItem = ({ item }) => {
    return (
      <TouchableOpacity
        activeOpacity={0.7}
        style={[styles.card, { backgroundColor: surfaceColor, borderColor }]}
        onPress={() => router.push({ pathname: '/(main)/(tabs)/dashboard/complaint-detail', params: { id: item.id } })}
      >
        <View style={styles.cardHeader}>
          <View style={styles.idContainer}>
            <View style={styles.iconWrapper}>
              <Ionicons name="warning" size={14} color="#ef4444" />
            </View>
            
            {/* 📍 FIX: Created a flex wrapper to properly space the ID and Date */}
            <View style={styles.idTextWrapper}>
              <Text style={[styles.cardId, { color: theme.textSecondary }]} numberOfLines={1}>
                #{item.id} <Text style={{ color: borderColor, marginHorizontal: 4 }}>|</Text> Issue #{item.issue_id}
              </Text>
              <Text style={[styles.cardDate, { color: theme.textSecondary }]}>
                {formatDate(item.created_at)}
              </Text>
            </View>

          </View>
        </View>
        
        <Text style={[styles.cardTitle, { color: theme.text }]} numberOfLines={1}>
          {item.issue_title}
        </Text>
        <Text style={[styles.cardDescription, { color: theme.textSecondary }]} numberOfLines={2}>
          {item.complaint_details}
        </Text>
        
        <View style={styles.cardInfo}>
          <View style={styles.personBadge}>
            <Text style={[styles.roleLabel, { color: theme.textSecondary }]}>Rzd By:</Text>
            <Avatar name={item.supervisor_name} size="tiny" />
            <Text style={[styles.personName, { color: theme.text }]} numberOfLines={1}>
              {item.supervisor_name?.split(' ')[0]}
            </Text>
          </View>
          
          {item.solver_name && (
            <>
              <View style={[styles.verticalDivider, { backgroundColor: borderColor }]} />
              <View style={styles.personBadge}>
                <Text style={[styles.roleLabel, { color: theme.textSecondary }]}>To:</Text>
                <Avatar name={item.solver_name} size="tiny" />
                <Text style={[styles.personName, { color: theme.text }]} numberOfLines={1}>
                  {item.solver_name?.split(' ')[0]}
                </Text>
              </View>
            </>
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
  };

  if (loading && complaints.length === 0) return <Loader message="Loading complaints..." />;

  return (
    <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: bgColor }]}>
      
      {/* ── HEADER ── */}
      <View style={[styles.header, { backgroundColor: surfaceColor, borderBottomColor: borderColor }]}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.6} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Complaints Hub</Text>
        <View style={styles.placeholder} />
      </View>

      {/* ── SEARCH BAR ── */}
      <View style={[styles.searchContainer, { backgroundColor: bgColor }]}>
        <View style={[styles.searchInput, { backgroundColor: inactiveBg, borderColor: 'transparent' }]}>
          <Ionicons name="search" size={20} color={theme.textSecondary} style={{ opacity: 0.7 }} />
          <TextInput
            style={[styles.searchTextInput, { color: theme.text }]}
            placeholder="Search by ID, title, or details..."
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
          {complaints.length} Active {complaints.length === 1 ? 'Complaint' : 'Complaints'}
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
            title="All Clear" 
            message="There are no active complaints matching your search." 
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
  
  searchContainer: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 10 },
  searchInput: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 14, 
    height: 48, 
    borderRadius: 14, 
    borderWidth: 1,
    gap: 10 
  },
  searchTextInput: { flex: 1, fontSize: 15, fontWeight: '500' },
  
  resultsHeader: { paddingHorizontal: 20, paddingBottom: 14 },
  resultsCount: { fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8, opacity: 0.8 },
  
  listContent: { paddingHorizontal: 16, paddingBottom: 30 },
  
  card: { 
    marginBottom: 14,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 8 },
      android: { elevation: 1 },
    }),
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  
  // 📍 FIX: Updated Flex layout for ID and Date
  idContainer: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  iconWrapper: { backgroundColor: 'rgba(239,68,68,0.1)', padding: 4, borderRadius: 6 },
  idTextWrapper: { flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardId: { fontSize: 13, fontWeight: '700', letterSpacing: 0.3 },
  cardDate: { fontSize: 12, fontWeight: '500', opacity: 0.7 },
  
  cardTitle: { fontSize: 17, fontWeight: '700', marginBottom: 6, letterSpacing: -0.2 },
  cardDescription: { fontSize: 14, lineHeight: 22, opacity: 0.9, marginBottom: 16 },
  
  cardInfo: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  personBadge: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  roleLabel: { fontSize: 11, fontWeight: '600' },
  personName: { fontSize: 13, fontWeight: '600', maxWidth: 90 },
  verticalDivider: { width: 1, height: 12, opacity: 0.5 },
  
  thumbnail: { 
    width: '100%', 
    height: 140, 
    borderRadius: 10, 
    borderWidth: StyleSheet.hairlineWidth,
    marginTop: 16,
  },
});