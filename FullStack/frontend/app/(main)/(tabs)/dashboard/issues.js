import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ScrollView,
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

export default function IssuesListScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const dispatch = useDispatch();
  const user = useSelector(selectCurrentUser);
  const issues = useSelector(selectFilteredIssues);
  const loading = useSelector(selectIssuesLoading);

  const [searchText, setSearchText] = useState('');
  const [selectedStatus, setSelectedStatus] = useState(null);
  const [selectedPriority, setSelectedPriority] = useState(null);

  useEffect(() => {
    if (user) {
      dispatch(fetchIssues(user));
    }
  }, [user]);

  useEffect(() => {
    dispatch(setFilters({ search: searchText, status: selectedStatus, priority: selectedPriority }));
  }, [searchText, selectedStatus, selectedPriority]);

  const handleIssuePress = (issue) => {
    router.push({ pathname: '/(main)/(tabs)/dashboard/issue-detail', params: { id: issue.id } });
  };

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

  if (loading && issues.length === 0) {
    return <Loader message="Loading issues..." />;
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>All Issues</Text>
        <View style={styles.placeholder} />
      </View>

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
      </View>

      {/* Filters */}
      <View style={[styles.filtersContainer, { backgroundColor: theme.card }]}>
        <Text style={[styles.filterLabel, { color: theme.textSecondary }]}>Status:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          {STATUS_FILTERS.map((filter) =>
            renderFilterChip(filter, selectedStatus === filter.value, () => setSelectedStatus(filter.value))
          )}
        </ScrollView>
        <Text style={[styles.filterLabel, { color: theme.textSecondary, marginTop: 8 }]}>Priority:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          {PRIORITY_FILTERS.map((filter) =>
            renderFilterChip(filter, selectedPriority === filter.value, () => setSelectedPriority(filter.value))
          )}
        </ScrollView>
      </View>

      {/* Issues List */}
      <FlatList
        data={issues}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => <IssueCard issue={item} onPress={() => handleIssuePress(item)} />}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <EmptyState
            icon="document-text-outline"
            title="No issues found"
            message="There are no issues matching your criteria."
          />
        }
        showsVerticalScrollIndicator={false}
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
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  placeholder: {
    width: 32,
  },
  searchContainer: {
    padding: 16,
  },
  searchInput: {
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
  filtersContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 6,
  },
  filterScroll: {
    flexGrow: 0,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '500',
  },
  listContent: {
    padding: 16,
    paddingTop: 8,
  },
});
