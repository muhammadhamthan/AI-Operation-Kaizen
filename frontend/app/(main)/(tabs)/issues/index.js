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
import { sites } from '../../../../src/mocks/sites';

export default function IssuesTabScreen() {
  const { theme } = useTheme();
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

  // Debounce search
  const debouncedSearch = useDebounce(searchText, 300);

  useEffect(() => {
    if (user) {
      dispatch(fetchIssues(user));
    }
  }, [user]);

  // Filter issues based on all criteria
  const filteredIssues = useMemo(() => {
    if (!allIssues) return [];
    
    return allIssues.filter(issue => {
      // Search filter
      if (debouncedSearch) {
        const searchLower = debouncedSearch.toLowerCase();
        const matchesSearch = 
          issue.title?.toLowerCase().includes(searchLower) ||
          issue.description?.toLowerCase().includes(searchLower) ||
          issue.id?.toString().includes(searchLower) ||
          issue.site?.name?.toLowerCase().includes(searchLower) ||
          issue.issue_type?.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }

      // Status filter
      if (appliedFilters.statuses.length > 0) {
        if (!appliedFilters.statuses.includes(issue.status)) return false;
      }

      // Priority filter
      if (appliedFilters.priorities.length > 0) {
        if (!appliedFilters.priorities.includes(issue.priority)) return false;
      }

      // Category filter
      if (appliedFilters.categories.length > 0) {
        if (!appliedFilters.categories.includes(issue.issue_type)) return false;
      }

      // Site filter
      if (appliedFilters.site) {
        if (issue.site_id !== appliedFilters.site) return false;
      }

      // Date range filter
      if (appliedFilters.dateRange && appliedFilters.dateRange !== 'all') {
        const issueDate = new Date(issue.created_at);
        const now = new Date();
        
        switch (appliedFilters.dateRange) {
          case 'today':
            if (issueDate.toDateString() !== now.toDateString()) return false;
            break;
          case 'week':
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            if (issueDate < weekAgo) return false;
            break;
          case 'month':
            const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            if (issueDate < monthAgo) return false;
            break;
          case '3months':
            const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
            if (issueDate < threeMonthsAgo) return false;
            break;
        }
      }

      // Overdue filter
      if (appliedFilters.overdueOnly) {
        const deadline = new Date(issue.deadline_at);
        if (deadline >= new Date() || issue.status === 'COMPLETED') return false;
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
      await dispatch(fetchIssues(user));
    }
    setLastRefresh(Date.now());
    setRefreshing(false);
  }, [user, isOnline, lastRefresh]);

  const handleIssuePress = (issue) => {
    router.push({ pathname: '/(main)/(tabs)/issues/issue-detail', params: { id: issue.id } });
  };

  const handleApplyFilters = (filters) => {
    setAppliedFilters(filters);
  };

  const handleClearFilters = () => {
    setSearchText('');
    setAppliedFilters({
      statuses: [],
      priorities: [],
      categories: [],
      site: null,
      dateRange: 'all',
      overdueOnly: false,
    });
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

  const renderActiveFilterChips = () => {
    const chips = [];
    
    if (appliedFilters.statuses.length > 0) {
      chips.push(
        <View key="status" style={[styles.activeChip, { backgroundColor: `${theme.primary}20` }]}>
          <Text style={[styles.activeChipText, { color: theme.primary }]}>
            Status: {appliedFilters.statuses.length}
          </Text>
          <TouchableOpacity onPress={() => setAppliedFilters(prev => ({ ...prev, statuses: [] }))}>
            <Ionicons name="close" size={14} color={theme.primary} />
          </TouchableOpacity>
        </View>
      );
    }
    
    if (appliedFilters.priorities.length > 0) {
      chips.push(
        <View key="priority" style={[styles.activeChip, { backgroundColor: `${theme.primary}20` }]}>
          <Text style={[styles.activeChipText, { color: theme.primary }]}>
            Priority: {appliedFilters.priorities.join(', ')}
          </Text>
          <TouchableOpacity onPress={() => setAppliedFilters(prev => ({ ...prev, priorities: [] }))}>
            <Ionicons name="close" size={14} color={theme.primary} />
          </TouchableOpacity>
        </View>
      );
    }

    if (appliedFilters.categories.length > 0) {
      chips.push(
        <View key="category" style={[styles.activeChip, { backgroundColor: `${theme.primary}20` }]}>
          <Text style={[styles.activeChipText, { color: theme.primary }]}>
            Category: {appliedFilters.categories.length}
          </Text>
          <TouchableOpacity onPress={() => setAppliedFilters(prev => ({ ...prev, categories: [] }))}>
            <Ionicons name="close" size={14} color={theme.primary} />
          </TouchableOpacity>
        </View>
      );
    }

    if (appliedFilters.overdueOnly) {
      chips.push(
        <View key="overdue" style={[styles.activeChip, { backgroundColor: '#fee2e2' }]}>
          <Text style={[styles.activeChipText, { color: '#ef4444' }]}>Overdue Only</Text>
          <TouchableOpacity onPress={() => setAppliedFilters(prev => ({ ...prev, overdueOnly: false }))}>
            <Ionicons name="close" size={14} color="#ef4444" />
          </TouchableOpacity>
        </View>
      );
    }

    return chips;
  };

  const renderHeader = () => (
    <>
      {/* Search */}
      <View style={[styles.searchContainer, { backgroundColor: theme.card }]}>
        <View style={[styles.searchInput, { backgroundColor: theme.inputBackground }]}>
          <Ionicons name="search" size={20} color={theme.textSecondary} />
          <TextInput
            style={[styles.searchTextInput, { color: theme.text }]}
            placeholder="Search issues..."
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
        <TouchableOpacity
          style={[
            styles.filterButton, 
            { 
              backgroundColor: activeFilterCount > 0 ? theme.primary : theme.inputBackground,
            }
          ]}
          onPress={() => setShowFilterModal(true)}
        >
          <Ionicons name="options" size={20} color={activeFilterCount > 0 ? '#fff' : theme.text} />
          {activeFilterCount > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Active Filter Chips */}
      {hasActiveFilters && (
        <View style={styles.activeFiltersContainer}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.activeChipsScroll}
          >
            {renderActiveFilterChips()}
            {hasActiveFilters && (
              <TouchableOpacity 
                style={[styles.clearAllButton, { borderColor: theme.primary }]}
                onPress={handleClearFilters}
              >
                <Text style={[styles.clearAllText, { color: theme.primary }]}>Clear All</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>
      )}

      {/* Results Count */}
      <View style={styles.resultsHeader}>
        <Text style={[styles.resultsCount, { color: theme.textSecondary }]}>
          {filteredIssues.length} issue{filteredIssues.length !== 1 ? 's' : ''} found
        </Text>
      </View>
    </>
  );

  if (loading && allIssues.length === 0) {
    return <Loader message="Loading issues..." />;
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        <View>
          <Text style={[styles.headerTitle, { color: theme.text }]}>All Issues</Text>
          <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>
            {user?.role === 'manager' ? 'All Sites' : `${user?.role === 'supervisor' ? 'Your Sites' : 'Assigned to You'}`}
          </Text>
        </View>
        <TouchableOpacity onPress={() => router.push('/(main)/profile')}>
          <Avatar uri={user?.avatar} name={user?.name} size="medium" />
        </TouchableOpacity>
      </View>

      {/* Issues List */}
      <FlatList
        data={filteredIssues}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => <IssueCard issue={item} onPress={() => handleIssuePress(item)} />}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={
          <EmptyState
            icon="document-text-outline"
            title="No issues found"
            message={hasActiveFilters ? "Try adjusting your filters." : "There are no issues to display."}
          />
        }
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.primary]}
            tintColor={theme.primary}
          />
        }
      />

      {/* Filter Modal */}
      <FilterModal
        visible={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        onApply={handleApplyFilters}
        initialFilters={appliedFilters}
        sites={sites}
      />

      {toastMessage !== '' && <Toast message={toastMessage} />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  searchContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 8,
  },
  searchTextInput: {
    flex: 1,
    fontSize: 16,
  },
  filterButton: {
    width: 44,
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  filterBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#ef4444',
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  activeFiltersContainer: {
    paddingHorizontal: 16,
  },
  activeChipsScroll: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: 16,
  },
  activeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  activeChipText: {
    fontSize: 12,
    fontWeight: '500',
  },
  clearAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  clearAllText: {
    fontSize: 12,
    fontWeight: '500',
  },
  resultsHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  resultsCount: {
    fontSize: 13,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
});
