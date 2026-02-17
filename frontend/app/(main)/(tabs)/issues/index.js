import React, { useEffect, useState, useCallback } from 'react';
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
import { fetchIssues, selectFilteredIssues, selectIssuesLoading, setFilters, clearFilters } from '../../../../src/store/slices/issuesSlice';
import IssueCard from '../../../../src/components/issue/IssueCard';
import Loader from '../../../../src/components/common/Loader';
import EmptyState from '../../../../src/components/common/EmptyState';
import Avatar from '../../../../src/components/common/Avatar';
import { useDebounce } from '../../../../src/hooks/useDebounce';

const STATUS_FILTERS = [
  { label: 'All', value: null },
  { label: 'Open', value: 'OPEN' },
  { label: 'Assigned', value: 'ASSIGNED' },
  { label: 'In Progress', value: 'IN_PROGRESS' },
  { label: 'Completed', value: 'COMPLETED' },
  { label: 'Escalated', value: 'ESCALATED' },
];

const PRIORITY_FILTERS = [
  { label: 'All', value: null },
  { label: 'High', value: 'high' },
  { label: 'Medium', value: 'medium' },
  { label: 'Low', value: 'low' },
];

export default function IssuesTabScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const dispatch = useDispatch();
  const user = useSelector(selectCurrentUser);
  const issues = useSelector(selectFilteredIssues);
  const loading = useSelector(selectIssuesLoading);

  const [searchText, setSearchText] = useState('');
  const [selectedStatus, setSelectedStatus] = useState(null);
  const [selectedPriority, setSelectedPriority] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Debounce search
  const debouncedSearch = useDebounce(searchText, 500);

  useEffect(() => {
    if (user) {
      dispatch(fetchIssues(user));
    }
  }, [user]);

  useEffect(() => {
    dispatch(setFilters({ search: debouncedSearch, status: selectedStatus, priority: selectedPriority }));
  }, [debouncedSearch, selectedStatus, selectedPriority]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (user) {
      await dispatch(fetchIssues(user));
    }
    setRefreshing(false);
  }, [user]);

  const handleIssuePress = (issue) => {
    router.push({ pathname: '/(main)/(tabs)/issues/issue-detail', params: { id: issue.id } });
  };

  const handleClearFilters = () => {
    setSearchText('');
    setSelectedStatus(null);
    setSelectedPriority(null);
    dispatch(clearFilters());
  };

  const hasActiveFilters = selectedStatus !== null || selectedPriority !== null || searchText !== '';

  const renderFilterChip = (filter, isSelected, onPress) => (
    <TouchableOpacity
      key={filter.value || 'all'}
      style={[
        styles.filterChip,
        { backgroundColor: isSelected ? theme.primary : theme.inputBackground },
      ]}
      onPress={onPress}
    >
      <Text style={[styles.filterChipText, { color: isSelected ? '#fff' : theme.text }]}>
        {filter.label}
      </Text>
    </TouchableOpacity>
  );

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
          style={[styles.filterButton, { backgroundColor: showFilters ? theme.primary : theme.inputBackground }]}
          onPress={() => setShowFilters(!showFilters)}
        >
          <Ionicons name="options" size={20} color={showFilters ? '#fff' : theme.text} />
        </TouchableOpacity>
      </View>

      {/* Filters */}
      {showFilters && (
        <View style={[styles.filtersContainer, { backgroundColor: theme.card }]}>
          <View style={styles.filterHeader}>
            <Text style={[styles.filterSectionTitle, { color: theme.text }]}>Filters</Text>
            {hasActiveFilters && (
              <TouchableOpacity onPress={handleClearFilters}>
                <Text style={[styles.clearButton, { color: theme.primary }]}>Clear All</Text>
              </TouchableOpacity>
            )}
          </View>
          
          <Text style={[styles.filterLabel, { color: theme.textSecondary }]}>Status:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
            {STATUS_FILTERS.map((filter) =>
              renderFilterChip(filter, selectedStatus === filter.value, () => setSelectedStatus(filter.value))
            )}
          </ScrollView>
          
          <Text style={[styles.filterLabel, { color: theme.textSecondary, marginTop: 12 }]}>Priority:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
            {PRIORITY_FILTERS.map((filter) =>
              renderFilterChip(filter, selectedPriority === filter.value, () => setSelectedPriority(filter.value))
            )}
          </ScrollView>
        </View>
      )}

      {/* Active Filter Chips */}
      {hasActiveFilters && (
        <View style={styles.activeFiltersContainer}>
          {selectedStatus && (
            <View style={[styles.activeChip, { backgroundColor: `${theme.primary}20` }]}>
              <Text style={[styles.activeChipText, { color: theme.primary }]}>Status: {selectedStatus}</Text>
              <TouchableOpacity onPress={() => setSelectedStatus(null)}>
                <Ionicons name="close" size={16} color={theme.primary} />
              </TouchableOpacity>
            </View>
          )}
          {selectedPriority && (
            <View style={[styles.activeChip, { backgroundColor: `${theme.primary}20` }]}>
              <Text style={[styles.activeChipText, { color: theme.primary }]}>Priority: {selectedPriority}</Text>
              <TouchableOpacity onPress={() => setSelectedPriority(null)}>
                <Ionicons name="close" size={16} color={theme.primary} />
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {/* Results Count */}
      <View style={styles.resultsHeader}>
        <Text style={[styles.resultsCount, { color: theme.textSecondary }]}>
          {issues.length} issue{issues.length !== 1 ? 's' : ''} found
        </Text>
      </View>
    </>
  );

  if (loading && issues.length === 0) {
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
        data={issues}
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
  },
  filtersContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  filterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  clearButton: {
    fontSize: 14,
    fontWeight: '500',
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 8,
  },
  filterScroll: {
    flexGrow: 0,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '500',
  },
  activeFiltersContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 8,
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
