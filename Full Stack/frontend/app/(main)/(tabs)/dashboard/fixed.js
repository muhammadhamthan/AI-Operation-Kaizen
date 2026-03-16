import React, { useEffect, useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TextInput, 
  TouchableOpacity, 
  RefreshControl,
  Platform 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../../src/theme/ThemeContext';
import { selectCurrentUser } from '../../../../src/store/slices/authSlice';
import { fetchIssues, selectFixedIssues, selectIssuesLoading, setFilters } from '../../../../src/store/slices/issuesSlice';
import { selectIsOnline } from '../../../../src/store/slices/offlineSlice';
import Avatar from '../../../../src/components/common/Avatar';
import Loader from '../../../../src/components/common/Loader';
import EmptyState from '../../../../src/components/common/EmptyState';
import Toast from '../../../../src/components/common/Toast';
import { formatDate } from '../../../../src/utils/formatters';

export default function FixedIssuesScreen() {
  const { theme, isDark } = useTheme(); 
  const router = useRouter();
  const dispatch = useDispatch();
  
  const user = useSelector(selectCurrentUser);
  const issues = useSelector(selectFixedIssues);
  const loading = useSelector(selectIssuesLoading);
  const isOnline = useSelector(selectIsOnline);
  
  const [searchText, setSearchText] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => {
    if (user) dispatch(fetchIssues(user));
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
      await dispatch(fetchIssues(user));
    }
    setLastRefresh(Date.now());
    setRefreshing(false);
  }, [user, isOnline, lastRefresh]);

  // 📍 FIX: Added Local Search Filtering
  const filteredIssues = issues.filter((issue) => {
    if (!searchText) return true;
    const lowerSearch = searchText.toLowerCase();
    return (
      issue.title?.toLowerCase().includes(lowerSearch) ||
      issue.site_name?.toLowerCase().includes(lowerSearch) ||
      issue.id?.toString().includes(lowerSearch)
    );
  });

  const bgColor = isDark ? '#212121' : '#f9f9f9';
  const surfaceColor = isDark ? '#171717' : '#ffffff';
  const borderColor = isDark ? '#333333' : '#e5e5e5';
  const inactiveBg = isDark ? 'rgba(255,255,255,0.06)' : '#f4f4f4';
  const successColor = '#10a37f'; // OpenAI Green
  const successBg = isDark ? 'rgba(16, 163, 127, 0.15)' : 'rgba(16, 163, 127, 0.1)';

  const renderItem = ({ item }) => {
    // 📍 FIX: Mapped perfectly to real backend data (no more mocks!)
    const siteName = item.site_name || item.site?.name || 'Unknown Site';
    const solverName = item.assignments && item.assignments.length > 0 
      ? item.assignments[0].solver_name 
      : (item.solver_name || null);

    return (
      <TouchableOpacity
        activeOpacity={0.7}
        style={[styles.card, { backgroundColor: surfaceColor, borderColor }]}
        onPress={() => router.push({ pathname: '/(main)/(tabs)/dashboard/fixed-detail', params: { id: item.id } })}
      >
        <View style={styles.cardHeader}>
          <View style={styles.idContainer}>
            <Ionicons name="checkmark-circle" size={16} color={successColor} />
            <Text style={[styles.cardId, { color: theme.textSecondary }]}>#{item.id}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: successBg }]}>
            <Text style={[styles.statusText, { color: successColor }]}>Resolved</Text>
          </View>
        </View>
        
        <Text style={[styles.cardTitle, { color: theme.text }]} numberOfLines={2}>
          {item.title}
        </Text>
        
        <View style={styles.cardInfo}>
          <View style={styles.infoItem}>
            <Ionicons name="location-outline" size={14} color={theme.textSecondary} />
            <Text style={[styles.infoText, { color: theme.textSecondary }]}>{siteName}</Text>
          </View>
          <View style={[styles.dot, { backgroundColor: theme.textSecondary }]} />
          <View style={styles.infoItem}>
            <Ionicons name="calendar-outline" size={14} color={theme.textSecondary} />
            <Text style={[styles.infoText, { color: theme.textSecondary }]}>{formatDate(item.updated_at)}</Text>
          </View>
        </View>

        {solverName && (
          <View style={[styles.solverRow, { borderTopColor: borderColor, borderTopWidth: StyleSheet.hairlineWidth }]}>
            <Text style={[styles.solverLabel, { color: theme.textSecondary }]}>Solved by</Text>
            <View style={styles.solverUser}>
              <Avatar name={solverName} size="small" />
              <Text style={[styles.solverName, { color: theme.text }]}>{solverName}</Text>
            </View>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (loading && issues.length === 0) return <Loader message="Loading fixed issues..." />;

  return (
    <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: bgColor }]}>
      
      {/* ── HEADER ── */}
      <View style={[styles.header, { backgroundColor: bgColor, borderBottomColor: borderColor }]}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.6} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.textSecondary }]}>Resolved Issues</Text>
        <View style={styles.placeholder} />
      </View>

      {/* ── SEARCH BAR ── */}
      <View style={[styles.searchContainer, { backgroundColor: bgColor }]}>
        <View style={[styles.searchInput, { backgroundColor: inactiveBg, borderColor }]}>
          <Ionicons name="search" size={18} color={theme.textSecondary} />
          <TextInput
            style={[styles.searchTextInput, { color: theme.text }]}
            placeholder="Search resolved issues..."
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
        {/* 📍 FIX: Displays the length of the filtered array */}
        <Text style={[styles.resultsCount, { color: theme.textSecondary }]}>
          {filteredIssues.length} issue{filteredIssues.length !== 1 ? 's' : ''} found
        </Text>
      </View>

      {/* ── LIST ── */}
      <FlatList
        data={filteredIssues} // 📍 FIX: Passed the filtered array here
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <EmptyState 
            icon="checkmark-done-outline" 
            title={searchText ? "No matches found" : "No completed issues"} 
            message={searchText ? `No issues matching "${searchText}"` : "No issues have been completed yet."} 
          />
        }
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[successColor]}
            tintColor={successColor}
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
    height: 44, // Matched globally
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
    paddingHorizontal: 10, 
    paddingVertical: 4, 
    borderRadius: 8, // Squircle shape
  },
  statusText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' },
  
  cardTitle: { fontSize: 16, fontWeight: '600', lineHeight: 22, letterSpacing: -0.2, marginBottom: 12 },
  
  cardInfo: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  infoItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  infoText: { fontSize: 13, fontWeight: '500' },
  dot: { width: 3, height: 3, borderRadius: 1.5, opacity: 0.5 },

  solverRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    paddingTop: 12, 
  },
  solverLabel: { fontSize: 12, fontWeight: '500' },
  solverUser: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  solverName: { fontSize: 13, fontWeight: '600' },
});