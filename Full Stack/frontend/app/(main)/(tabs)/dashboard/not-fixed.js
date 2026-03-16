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
import { fetchIssues, selectNotFixedIssues, selectIssuesLoading, setFilters } from '../../../../src/store/slices/issuesSlice';
import { selectIsOnline } from '../../../../src/store/slices/offlineSlice';
import IssueCard from '../../../../src/components/issue/IssueCard';
import Loader from '../../../../src/components/common/Loader';
import EmptyState from '../../../../src/components/common/EmptyState';
import Toast from '../../../../src/components/common/Toast';

export default function NotFixedIssuesScreen() {
  const { theme, isDark } = useTheme(); 
  const router = useRouter();
  const dispatch = useDispatch();
  
  const user = useSelector(selectCurrentUser);
  const issues = useSelector(selectNotFixedIssues);
  const loading = useSelector(selectIssuesLoading);
  const isOnline = useSelector(selectIsOnline);
  
  const [searchText, setSearchText] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => {
    if (user) {
      dispatch(fetchIssues(user));
    }
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

  const handleIssuePress = (issue) => {
    router.push({ pathname: '/(main)/(tabs)/dashboard/not-fixed-detail', params: { id: issue.id } });
  };

  // 📍 FIX: Added Local Filtering Logic
  const filteredIssues = issues.filter((issue) => {
    if (!searchText) return true;
    const lowerSearch = searchText.toLowerCase();
    return (
      issue.title?.toLowerCase().includes(lowerSearch) ||
      issue.description?.toLowerCase().includes(lowerSearch) ||
      issue.site_name?.toLowerCase().includes(lowerSearch) ||
      issue.id?.toString().includes(lowerSearch)
    );
  });

  if (loading && issues.length === 0) {
    return <Loader message="Loading issues..." />;
  }

  // ── PREMIUM MONOCHROME PALETTE ──
  const bgColor = isDark ? '#212121' : '#f9f9f9';
  const borderColor = isDark ? '#333333' : '#e5e5e5';
  const inactiveBg = isDark ? 'rgba(255,255,255,0.06)' : '#f4f4f4';
  const pendingAccent = '#f59e0b'; // Premium Amber instead of harsh orange

  return (
    <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: bgColor }]}>
      
      {/* ── HEADER ── */}
      <View style={[styles.header, { backgroundColor: bgColor, borderBottomColor: borderColor }]}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.6} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.textSecondary }]}>Pending Issues</Text>
        <View style={styles.placeholder} />
      </View>

      {/* ── SEARCH BAR ── */}
      <View style={[styles.searchContainer, { backgroundColor: bgColor }]}>
        <View style={[styles.searchInput, { backgroundColor: inactiveBg, borderColor }]}>
          <Ionicons name="search" size={18} color={theme.textSecondary} />
          <TextInput
            style={[styles.searchTextInput, { color: theme.text }]}
            placeholder="Search pending issues..."
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
        {/* 📍 FIX: Output length of filtered array, not raw array */}
        <Text style={[styles.resultsCount, { color: theme.textSecondary }]}>
          {filteredIssues.length} issue{filteredIssues.length !== 1 ? 's' : ''} found
        </Text>
      </View>

      {/* ── LIST ── */}
      <FlatList
        data={filteredIssues} // 📍 FIX: Replaced `issues` with `filteredIssues`
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => <IssueCard issue={item} onPress={() => handleIssuePress(item)} />}
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
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[pendingAccent]}
            tintColor={pendingAccent}
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
    height: 44, // Matched globally with all other screens
    borderRadius: 12, 
    borderWidth: 1,
    gap: 8 
  },
  searchTextInput: { flex: 1, fontSize: 15 },
  
  resultsHeader: { paddingHorizontal: 20, paddingBottom: 12 },
  resultsCount: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8 },
  
  listContent: { paddingHorizontal: 16, paddingBottom: 24 },
});