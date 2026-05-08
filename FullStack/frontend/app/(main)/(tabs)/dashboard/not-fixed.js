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
  Platform,
  ActivityIndicator,
  ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../../src/theme/ThemeContext';
import { selectCurrentUser } from '../../../../src/store/slices/authSlice';
import { selectIsOnline } from '../../../../src/store/slices/offlineSlice';
import Avatar from '../../../../src/components/common/Avatar';
import Loader from '../../../../src/components/common/Loader';
import EmptyState from '../../../../src/components/common/EmptyState';
import Toast from '../../../../src/components/common/Toast';
import FullScreenSpinner from '../../../../src/components/common/FullScreenSpinner';

// 📍 IMPORT NEW SELECTORS AND THUNK
import { 
  fetchPendingIssues, 
  selectNotFixedIssues, 
  selectIssuesLoading, 
  setFilters,
  selectIsFetchingNextPage,
  selectHasMoreIssues,
  selectIssuesNextCursor,
  selectFilters
} from '../../../../src/store/slices/issuesSlice';

export default function NotFixedIssuesScreen() {
  const { theme, isDark } = useTheme(); 
  const router = useRouter();
  const dispatch = useDispatch();
  
  const user = useSelector(selectCurrentUser);
  const issues = useSelector(selectNotFixedIssues);
  const loading = useSelector(selectIssuesLoading);
  const isOnline = useSelector(selectIsOnline);
  
  // 📍 NEW PAGINATION SELECTORS
  const isFetchingNextPage = useSelector(selectIsFetchingNextPage);
  const hasMore = useSelector(selectHasMoreIssues);
  const nextCursor = useSelector(selectIssuesNextCursor);
  const filters = useSelector(selectFilters);
  
  const [searchText, setSearchText] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [toastMessage, setToastMessage] = useState('');

  // 📍 INITIAL LOAD
  useEffect(() => {
    if (user) {
      dispatch(fetchPendingIssues({}));
    }
  }, [user]);

  useEffect(() => {
    dispatch(setFilters({ search: searchText }));
  }, [searchText]);

  // 📍 PULL TO REFRESH
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
      try {
        await Promise.allSettled([
          dispatch(fetchPendingIssues({})) 
        ]);
      } finally {
        setLastRefresh(Date.now());
        setRefreshing(false);
      }
    } else {
      setRefreshing(false);
    }
  }, [user, isOnline, lastRefresh, dispatch]);

  // 📍 INFINITE SCROLL TRIGGER
  const handleLoadMore = () => {
    if (!isOnline || isFetchingNextPage || !hasMore || loading) return;
    dispatch(fetchPendingIssues({ cursor: nextCursor, reset: false }));
  };

  const handleIssuePress = (issue) => {
    router.push({ pathname: '/(main)/(tabs)/dashboard/not-fixed-detail', params: { id: issue.id } });
  };

  // Helper to format time as "2h ago" (or fallback)
  const formatTimeAgo = (dateString) => {
    if (!dateString) return '2h ago';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHrs < 1) return 'Just now';
    if (diffHrs < 24) return `${diffHrs}h ago`;
    return `${Math.floor(diffHrs / 24)}d ago`;
  };

  const getStatusColor = (status) => {
    const s = String(status).toUpperCase();
    if (s === 'OPEN') return { bg: isDark ? 'rgba(245, 158, 11, 0.15)' : '#fef3c7', text: '#d97706' };
    if (s === 'IN_PROGRESS' || s === 'ASSIGNED') return { bg: isDark ? 'rgba(59, 130, 246, 0.15)' : '#dbeafe', text: '#2563eb' };
    if (s === 'COMPLETED') return { bg: isDark ? 'rgba(16, 185, 129, 0.15)' : '#dcfce7', text: '#059669' };
    if (s === 'ESCALATED') return { bg: isDark ? 'rgba(239, 68, 68, 0.15)' : '#fee2e2', text: '#dc2626' };
    return { bg: isDark ? '#333' : '#f8fafc', text: theme.textSecondary };
  };

  const filteredIssues = issues.filter((issue) => {
    return !searchText || (
      issue.title?.toLowerCase().includes(searchText.toLowerCase()) ||
      issue.description?.toLowerCase().includes(searchText.toLowerCase()) ||
      issue.site_name?.toLowerCase().includes(searchText.toLowerCase()) ||
      issue.id?.toString().includes(searchText.toLowerCase())
    );
  });

  if (loading && issues.length === 0 && !refreshing) {
    return <Loader message="Loading issues..." />;
  }

  // Premium Palette
  const bgColor = isDark ? '#111111' : '#ffffff';
  const surfaceColor = isDark ? '#1a1a1a' : '#ffffff';
  const borderColor = isDark ? '#333333' : '#f0f0f0';
  const primaryBlue = '#3b82f6';
  const cardBgColor = isDark ? '#1c1c1c' : '#ffffff';
  const cardBorderColor = isDark ? '#2a2a2a' : '#f1f5f9';

  const renderItem = ({ item }) => {
    const statusColor = getStatusColor(item.status);
    
    return (
      <TouchableOpacity
        activeOpacity={0.8}
        style={[
          styles.card, 
          { 
            backgroundColor: cardBgColor, 
            borderColor: cardBorderColor,
          }
        ]}
        onPress={() => handleIssuePress(item)}
      >
        <View style={[styles.healthBar, { backgroundColor: statusColor.text }]} />

        {/* Top Row: ID & Time */}
        <View style={styles.cardHeader}>
          <Text style={[styles.cardId, { color: theme.textSecondary }]}>IS-{item.id}</Text>
          <View style={styles.timeWrap}>
            <Ionicons name="time-outline" size={14} color={theme.textSecondary} />
            <Text style={[styles.cardDate, { color: theme.textSecondary }]}>
              {formatTimeAgo(item.created_at)}
            </Text>
          </View>
        </View>
        
        {/* Title */}
        <Text style={[styles.cardTitle, { color: theme.text }]} numberOfLines={1}>
          {item.title || 'Untitled Issue'}
        </Text>
        
        {/* User Info & Status */}
        <View style={styles.userRow}>
          <View style={styles.userInfo}>
            <Avatar name={item.supervisor_name || 'System User'} uri={item.supervisor_name ? `https://i.pravatar.cc/150?u=${item.id}` : null} size="small" />
            <View style={styles.userText}>
              <Text style={[styles.userName, { color: theme.text }]} numberOfLines={1}>
                {item.supervisor_name || 'System User'}
              </Text>
              <Text style={styles.userRole}>Field Worker</Text>
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColor.bg }]}>
            <Text style={[styles.statusText, { color: statusColor.text }]}>{item.status}</Text>
          </View>
        </View>
        
        <View style={[styles.cardDivider, { backgroundColor: cardBorderColor }]} />
        
        {/* Location & Details */}
        <View style={styles.locationRow}>
          <View style={styles.locationLeft}>
            <Ionicons name="location-outline" size={16} color={primaryBlue} />
            <Text style={styles.locationText} numberOfLines={1}>{item.site_name || 'Tech Park South'}</Text>
          </View>
          <Text style={styles.detailsText}>DETAILS {'>'}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: bgColor }]}>
      
      {/* ── HEADER ── */}
      <View style={[styles.header, { backgroundColor: surfaceColor, borderBottomColor: borderColor }]}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.6} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Pending Issues</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={() => router.push('/(main)/profile')} activeOpacity={0.7} style={{ marginRight: 12 }}>
            <Avatar uri={user?.avatar} name={user?.name} size="small" />
          </TouchableOpacity>
          {/* <TouchableOpacity style={styles.bellButton}>
            <Ionicons name="notifications-outline" size={22} color={theme.text} />
          </TouchableOpacity> */}
        </View>
      </View>

      {/* ── SEARCH BAR ── */}
      <View style={[styles.searchContainer, { backgroundColor: bgColor }]}>
        <View style={[styles.searchInput, { backgroundColor: surfaceColor, borderColor }]}>
          <Ionicons name="search" size={20} color={theme.textSecondary} style={{ opacity: 0.7 }} />
          <TextInput
            style={[styles.searchTextInput, { color: theme.text }]}
            placeholder="Search pending issues..."
            placeholderTextColor={theme.textSecondary}
            value={searchText}
            onChangeText={setSearchText}
          />
          <TouchableOpacity style={styles.filterIconWrap}>
            <Ionicons name="options-outline" size={20} color={theme.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── RESULTS HEADER ── */}
      <View style={styles.resultsHeader}>
        <Text style={[styles.resultsCount, { color: theme.textSecondary }]}>
          PENDING RECORDS ({filteredIssues.length})
        </Text>
      </View>

      {/* ── LIST ── */}
      <FlatList
        data={filteredIssues} 
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <EmptyState 
            icon="checkmark-circle-outline" 
            title={searchText ? "No matches found" : "All Clear!"} 
            message={searchText ? `No issues matching "${searchText}"` : "No pending issues at the moment."} 
          />
        }
        showsVerticalScrollIndicator={false}
        refreshControl={
          Platform.OS === 'web' ? undefined : (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[primaryBlue]}
              tintColor={primaryBlue}
            />
          )
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          isFetchingNextPage ? (
            <View style={styles.footerLoader}>
              <ActivityIndicator size="small" color={primaryBlue} />
            </View>
          ) : filteredIssues.length > 0 ? (
            <View style={styles.endFooter}>
              <Text style={styles.endFooterText}>END OF OPERATIONAL RECORDS</Text>
            </View>
          ) : null
        }
      />

      <FullScreenSpinner visible={refreshing} message="Updating Pending Issues..." color={primaryBlue} />

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
  headerTitle: { fontSize: 17, fontWeight: '700', letterSpacing: -0.2 },
  headerRight: { width: 32, alignItems: 'flex-end' },
  bellButton: { padding: 4 },
  
  searchContainer: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 16 },
  searchInput: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 16, 
    height: 50, 
    borderRadius: 25, 
    borderWidth: 1,
    gap: 10 
  },
  searchTextInput: { flex: 1, fontSize: 15 },
  filterIconWrap: { padding: 4 },
  
  resultsHeader: { paddingHorizontal: 20, paddingBottom: 14 },
  resultsCount: { fontSize: 11, fontWeight: '700', letterSpacing: 1.0 },
  
  listContent: { paddingHorizontal: 16, paddingBottom: 30, gap: 14 },
  
  footerLoader: { paddingVertical: 20, alignItems: 'center' },
  endFooter: { paddingVertical: 24, alignItems: 'center' },
  endFooterText: { fontSize: 10, fontWeight: '600', color: '#9ca3af', letterSpacing: 0.5 },
  
  card: { 
    padding: 16,
    paddingLeft: 24,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 6,
    elevation: 1,
  },
  healthBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 6,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  cardId: { fontSize: 11, fontWeight: '600', letterSpacing: 0.5 },
  timeWrap: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cardDate: { fontSize: 11 },
  
  cardTitle: { fontSize: 16, fontWeight: '700', marginBottom: 16, letterSpacing: -0.2 },
  
  userRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  userInfo: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  userText: { justifyContent: 'center' },
  userName: { fontSize: 13, fontWeight: '700' },
  userRole: { fontSize: 11, color: '#9ca3af' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 10, fontWeight: '700' },
  
  cardDivider: { height: StyleSheet.hairlineWidth, marginBottom: 16 },
  
  locationRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  locationLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  locationText: { fontSize: 12, color: '#6b7280', fontWeight: '500' },
  detailsText: { fontSize: 11, fontWeight: '700', color: '#3b82f6', letterSpacing: 0.5 },
});
