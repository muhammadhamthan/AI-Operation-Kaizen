import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../../src/theme/ThemeContext';
import { selectCurrentUser } from '../../../../src/store/slices/authSlice';
import { fetchIssues, selectAllIssues, selectIssuesLoading } from '../../../../src/store/slices/issuesSlice';
import { selectIsOnline } from '../../../../src/store/slices/offlineSlice';
import IssueCard from '../../../../src/components/issue/IssueCard';
import Loader from '../../../../src/components/common/Loader';
import EmptyState from '../../../../src/components/common/EmptyState';
import Avatar from '../../../../src/components/common/Avatar';
import Toast from '../../../../src/components/common/Toast';
import FilterModal from '../../../../src/components/modals/FilterModal';
import { useDebounce } from '../../../../src/hooks/useDebounce';

// ── ADDED REUSABLE SPINNER ──
import FullScreenSpinner from '../../../../src/components/common/FullScreenSpinner';

export default function IssuesTabScreen() {
  const { theme, isDark } = useTheme(); 
  const router = useRouter();
  const dispatch = useDispatch();
  const user = useSelector(selectCurrentUser);
  const allIssues = useSelector(selectAllIssues);
  const loading = useSelector(selectIssuesLoading);
  const isOnline = useSelector(selectIsOnline);

  const [searchText, setSearchText] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [toastMessage, setToastMessage] = useState('');
  const [appliedFilters, setAppliedFilters] = useState({
    statuses: [],
    priorities: [],
    categories: [],
    site: null,
    dateRange: 'all',
    overdueOnly: false,
  });

  const debouncedSearch = useDebounce(searchText, 300);

  // ── LOGIC UNTOUCHED ──
  useEffect(() => {
    if (user) dispatch(fetchIssues(user));
  }, [user, dispatch]);

  const realSites = useMemo(() => {
    if (!allIssues) return [];
    const uniqueSites = new Map();

    allIssues.forEach(issue => {
      if (issue.site_id && issue.site_name) {
        uniqueSites.set(issue.site_id, {
          id: issue.site_id,
          name: issue.site_name
        });
      }
    });

    return Array.from(uniqueSites.values());
  }, [allIssues]);

const filteredIssues = useMemo(() => {
    if (!allIssues || allIssues.length === 0) return [];
    
    return allIssues.filter(issue => {
      // 2. TEXT SEARCH FILTER
      if (debouncedSearch) {
        const searchLower = debouncedSearch.toLowerCase();
        const matchesSearch = 
          issue.title?.toLowerCase().includes(searchLower) ||
          issue.description?.toLowerCase().includes(searchLower) ||
          issue.id?.toString().includes(searchLower) ||
          issue.site_name?.toLowerCase().includes(searchLower); 
        
        if (!matchesSearch) return false;
      }

      // 3. STATUS FILTER
      if (appliedFilters.statuses && appliedFilters.statuses.length > 0) {
        if (!appliedFilters.statuses.includes(issue.status)) return false;
      }

      // 4. PRIORITY FILTER
      if (appliedFilters.priorities && appliedFilters.priorities.length > 0) {
        if (!appliedFilters.priorities.includes(issue.priority)) return false;
      }

      // 5. SITE FILTER
      if (appliedFilters.site) {
        if (issue.site_id !== appliedFilters.site) return false;
      }

      // 6. CATEGORY FILTER
      if (appliedFilters.categories && appliedFilters.categories.length > 0) {
        const matchesCategory = appliedFilters.categories.some(category => {
          const catLower = category.toLowerCase();
          return issue.title?.toLowerCase().includes(catLower) || 
                 issue.description?.toLowerCase().includes(catLower);
        });
        if (!matchesCategory) return false;
      }

      // 7. DATE RANGE FILTER
      if (appliedFilters.dateRange && appliedFilters.dateRange !== 'all') {
        if (!issue.created_at) return false; 

        const issueDate = new Date(issue.created_at);
        const now = new Date();
        
        if (appliedFilters.dateRange === 'today') {
          if (issueDate.toDateString() !== now.toDateString()) return false;
        } else if (appliedFilters.dateRange === 'week') {
          const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          if (issueDate < oneWeekAgo) return false;
        } else if (appliedFilters.dateRange === 'month') {
          const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          if (issueDate < oneMonthAgo) return false;
        } else if (appliedFilters.dateRange === '3months') {
          const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          if (issueDate < threeMonthsAgo) return false;
        }
      }

      // 8. OVERDUE ONLY FILTER
      if (appliedFilters.overdueOnly) {
        if (issue.status === 'COMPLETED' || issue.status === 'RESOLVED_PENDING_REVIEW') {
          return false;
        }
        
        if (issue.deadline_at) {
          const deadline = new Date(issue.deadline_at);
          if (deadline >= new Date()) return false; 
        } else {
          return false; 
        }
      }

      return true;
    });
  }, [allIssues, debouncedSearch, appliedFilters]);

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
        // 📍 FIX: Promise.allSettled guarantees the spinner spins until totally done
        await Promise.allSettled([
          dispatch(fetchIssues(user))
        ]);
      } finally {
        setLastRefresh(Date.now());
        setRefreshing(false);
      }
    } else {
      setRefreshing(false);
    }
  }, [user, isOnline, lastRefresh, dispatch]);

  const handleIssuePress = (issue) => router.push({ pathname: '/(main)/(tabs)/issues/issue-detail', params: { id: issue.id } });
  const handleApplyFilters = (filters) => setAppliedFilters(filters);
  const handleClearFilters = () => {
    setSearchText('');
    setAppliedFilters({ statuses: [], priorities: [], categories: [], site: null, dateRange: 'all', overdueOnly: false });
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (appliedFilters.statuses.length > 0) count++;
    if (appliedFilters.priorities.length > 0) count++;
    if (appliedFilters.categories.length > 0) count++;
    if (appliedFilters.site) count++;
    if (appliedFilters.dateRange !== 'all') count++;
    if (appliedFilters.overdueOnly) count++;
    return count;
  };

  const hasActiveFilters = getActiveFilterCount() > 0 || searchText !== '';
  const activeFilterCount = getActiveFilterCount();

  // ── PREMIUM MONOCHROME PALETTE ──
  const activeBg = isDark ? '#ffffff' : '#101010';
  const inactiveBg = isDark ? 'rgba(255,255,255,0.06)' : '#f4f4f4';
  const borderColor = isDark ? '#333333' : '#e5e5e5';

  const renderActiveFilterChips = () => {
    const chips = [];
    const chipStyle = [styles.activeChip, { backgroundColor: inactiveBg, borderColor }];
    const textStyle = [styles.activeChipText, { color: theme.text }];
    const iconColor = theme.textSecondary;

    if (appliedFilters.statuses.length > 0) {
      chips.push(
        <View key="status" style={chipStyle}>
          <Text style={textStyle}>Status: {appliedFilters.statuses.length}</Text>
          <TouchableOpacity onPress={() => setAppliedFilters(prev => ({ ...prev, statuses: [] }))}>
            <Ionicons name="close" size={14} color={iconColor} />
          </TouchableOpacity>
        </View>
      );
    }
    if (appliedFilters.priorities.length > 0) {
      chips.push(
        <View key="priority" style={chipStyle}>
          <Text style={textStyle}>Priority: {appliedFilters.priorities.length}</Text>
          <TouchableOpacity onPress={() => setAppliedFilters(prev => ({ ...prev, priorities: [] }))}>
            <Ionicons name="close" size={14} color={iconColor} />
          </TouchableOpacity>
        </View>
      );
    }
    if (appliedFilters.categories.length > 0) {
      chips.push(
        <View key="category" style={chipStyle}>
          <Text style={textStyle}>Category: {appliedFilters.categories.length}</Text>
          <TouchableOpacity onPress={() => setAppliedFilters(prev => ({ ...prev, categories: [] }))}>
            <Ionicons name="close" size={14} color={iconColor} />
          </TouchableOpacity>
        </View>
      );
    }
   if (appliedFilters.site) {
      const selectedSiteObj = realSites.find(s => s.id === appliedFilters.site);
      const siteDisplayName = selectedSiteObj ? selectedSiteObj.name : 'Site Selected';

      chips.push(
        <View key="site" style={chipStyle}>
          <Text style={textStyle}>Site: {siteDisplayName}</Text>
          <TouchableOpacity onPress={() => setAppliedFilters(prev => ({ ...prev, site: null }))}>
            <Ionicons name="close" size={14} color={iconColor} />
          </TouchableOpacity>
        </View>
      );
    }
    if (appliedFilters.overdueOnly) {
      chips.push(
        <View key="overdue" style={[chipStyle, { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.1)' : '#fef2f2', borderColor: isDark ? 'rgba(239, 68, 68, 0.2)' : '#fee2e2' }]}>
          <Text style={[styles.activeChipText, { color: '#ef4444' }]}>Overdue Only</Text>
          <TouchableOpacity onPress={() => setAppliedFilters(prev => ({ ...prev, overdueOnly: false }))}>
            <Ionicons name="close" size={14} color="#ef4444" />
          </TouchableOpacity>
        </View>
      );
    }
    return chips;
  };

  // 📍 FIX: Added `!refreshing` to prevent Loader hijacking
  if (loading && allIssues.length === 0 && !refreshing) return <Loader message="Loading issues..." />;

  return (
    <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: isDark ? '#1a1a1a' : '#ffffff' }]}>

      {/* ── HEADER ── */}
      <View style={[styles.header, { borderBottomColor: borderColor }]}>
        <View>
          <Text style={[styles.headerTitle, { color: theme.text }]}>All Issues</Text>
          <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>
            {user?.role === 'manager' ? 'All Sites' : `${user?.role === 'supervisor' ? 'Your Sites' : 'Assigned to You'}`}
          </Text>
        </View>
        
        {/* 📍 FIX: Added Header Actions Row for Sync + Avatar */}
        <View style={styles.headerActions}>
          {Platform.OS === 'web' && (
            <TouchableOpacity onPress={onRefresh} disabled={refreshing} style={styles.webRefreshButton}>
              <Ionicons name="sync" size={22} color={refreshing ? theme.primary : theme.textSecondary} />
            </TouchableOpacity>
          )}

          {/* ── NEW: Navigate to Chat via Arrow ── */}
          <TouchableOpacity onPress={() => router.push('/(main)/(tabs)/chat')} activeOpacity={0.7} style={{ marginRight: 4, padding: 4 }}>
            <Ionicons name="arrow-undo-outline" size={24} color={theme.text} />
          </TouchableOpacity>

          
          <TouchableOpacity onPress={() => router.push('/(main)/profile')} activeOpacity={0.7}>
            <Avatar uri={user?.avatar} name={user?.name} size="medium" />
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={filteredIssues}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => <IssueCard issue={item} onPress={() => handleIssuePress(item)} />}
        contentContainerStyle={styles.listContent}

        ListHeaderComponent={
          <View style={styles.headerComponentWrapper}>

            {/* ── SEARCH & FILTER ROW ── */}
            <View style={styles.searchContainer}>
              <View style={[styles.searchInput, { backgroundColor: inactiveBg, borderColor }]}>
                <Ionicons name="search" size={18} color={theme.textSecondary} />
                <TextInput
                  style={[styles.searchTextInput, { color: theme.text }]}
                  placeholder="Search issues..."
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

              <TouchableOpacity
                activeOpacity={0.7}
                style={[
                  styles.filterButton,
                  {
                    backgroundColor: activeFilterCount > 0 ? activeBg : inactiveBg,
                    borderColor: activeFilterCount > 0 ? activeBg : borderColor,
                  }
                ]}
                onPress={() => setShowFilterModal(true)}
              >
                <Ionicons
                  name="options-outline"
                  size={20}
                  color={activeFilterCount > 0 ? (isDark ? '#000' : '#fff') : theme.text}
                />
                {activeFilterCount > 0 && (
                  <View style={styles.filterBadge}>
                    <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            {/* ── ACTIVE FILTER CHIPS ── */}
            {hasActiveFilters && (
              <View style={styles.activeFiltersContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.activeChipsScroll}>
                  {renderActiveFilterChips()}
                  <TouchableOpacity style={styles.clearAllButton} onPress={handleClearFilters}>
                    <Text style={[styles.clearAllText, { color: theme.textSecondary }]}>Clear All</Text>
                  </TouchableOpacity>
                </ScrollView>
              </View>
            )}

            {/* ── RESULTS COUNT ── */}
            <View style={styles.resultsHeader}>
              <Text style={[styles.resultsCount, { color: theme.textSecondary }]}>
                {filteredIssues.length} issue{filteredIssues.length !== 1 ? 's' : ''} found
              </Text>
            </View>
          </View>
        }

        ListEmptyComponent={
          <EmptyState
            icon="document-text-outline"
            title="No issues found"
            message={hasActiveFilters ? "Try adjusting your filters." : "There are no issues to display."}
          />
        }
        showsVerticalScrollIndicator={false}
        // 📍 FIX: Disables double spinner on web
        refreshControl={
          Platform.OS === 'web' ? undefined : (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.textSecondary}
            />
          )
        }
      />

      <FilterModal
        visible={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        onApply={handleApplyFilters}
        initialFilters={appliedFilters}
        sites={realSites}
      />

      {/* ── NEW CLEAN IMPLEMENTATION ── */}
      <FullScreenSpinner visible={refreshing} message="Updating Issues..." color={theme.primary} />

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
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth
  },
  headerTitle: { fontSize: 28, fontWeight: '700', letterSpacing: -0.5 },
  headerSubtitle: { fontSize: 14, fontWeight: '500', marginTop: 4 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 12 }, 
  webRefreshButton: { padding: 4 }, 

  headerComponentWrapper: {
    paddingBottom: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    gap: 12
  },
  searchInput: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    height: 44, // Fixed height for exact alignment
    borderRadius: 12, // Squircle 
    borderWidth: 1,
    gap: 8
  },
  searchTextInput: { flex: 1, fontSize: 15 },
  filterButton: {
    width: 44,
    height: 44,
    borderRadius: 12, // Match input squircle
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative'
  },
  filterBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#ef4444', // Kept red for high-alert visibility
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ffffff', // Cuts into the button shape elegantly
  },
  filterBadgeText: { color: '#fff', fontSize: 9, fontWeight: '800' },

  activeFiltersContainer: { paddingHorizontal: 16, marginBottom: 8 },
  activeChipsScroll: { flexDirection: 'row', gap: 8, paddingRight: 16, alignItems: 'center' },
  activeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6
  },
  activeChipText: { fontSize: 13, fontWeight: '500' },
  clearAllButton: { paddingHorizontal: 8, paddingVertical: 6 },
  clearAllText: { fontSize: 13, fontWeight: '600' },

  resultsHeader: { paddingHorizontal: 20, paddingVertical: 8 },
  resultsCount: { fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },

  listContent: { paddingBottom: 24 },
});