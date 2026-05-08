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
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../../src/theme/ThemeContext';
import { selectCurrentUser } from '../../../../src/store/slices/authSlice';
import {
  fetchIssues,
  selectAllIssues,
  selectIssuesLoading,
  selectIssuesLoadingMore,
  selectHasMoreIssues,
} from '../../../../src/store/slices/issuesSlice';
import { selectIsOnline } from '../../../../src/store/slices/offlineSlice';
import Avatar from '../../../../src/components/common/Avatar';
import Loader from '../../../../src/components/common/Loader';
import EmptyState from '../../../../src/components/common/EmptyState';
import Toast from '../../../../src/components/common/Toast';
import FilterModal from '../../../../src/components/modals/FilterModal';
import { useDebounce } from '../../../../src/hooks/useDebounce';
import FullScreenSpinner from '../../../../src/components/common/FullScreenSpinner';

// ── STATUS CONFIG ──
const STATUS_CONFIG = {
  OPEN: {
    label: 'Open',
    icon: 'alert-circle-outline',
    color: '#374151',
    bgColor: 'transparent',
    filled: false,
    borderColor: '#ef4444',
  },
  ASSIGNED: {
    label: 'Assigned',
    icon: 'person-outline',
    color: '#8b5cf6',
    bgColor: 'transparent',
    filled: false,
    borderColor: '#8b5cf6',
  },
  IN_PROGRESS: {
    label: 'In Progress',
    icon: 'time-outline',
    color: '#d97706',
    bgColor: 'transparent',
    filled: false,
    borderColor: '#eab308',
  },
  ESCALATED: {
    label: 'Escalated',
    icon: 'warning-outline',
    color: '#ef4444',
    bgColor: '#fee2e2',
    filled: true,
    borderColor: '#ef4444',
  },
  RESOLVED_PENDING_REVIEW: {
    label: 'Awaiting Review',
    icon: 'time-outline',
    color: '#d97706',
    bgColor: 'transparent',
    filled: false,
    borderColor: '#f97316',
  },
  COMPLETED: {
    label: 'Fixed',
    icon: 'checkmark-circle-outline',
    color: '#374151',
    bgColor: 'transparent',
    filled: false,
    borderColor: '#3b82f6',
  },
  REOPENED: {
    label: 'Not Fixed',
    icon: 'close-circle-outline',
    color: '#ef4444',
    bgColor: '#fee2e2',
    filled: true,
    borderColor: '#ef4444',
  },
};

// ── STATUS TABS ──
const STATUS_TABS = [
  { key: 'all', label: 'All' },
  { key: 'OPEN', label: 'Open' },
  { key: 'ESCALATED', label: 'Escalated' },
  { key: 'COMPLETED', label: 'Fixed' },
  { key: 'REOPENED', label: 'Not Fixed' },
  { key: 'IN_PROGRESS', label: 'In Progress' },
  { key: 'RESOLVED_PENDING_REVIEW', label: 'Awaiting Review' },
  { key: 'ASSIGNED', label: 'Assigned' },
];

// ── HELPERS ──
const getTimeAgo = (dateStr) => {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

const formatId = (id) => {
  if (!id) return '';
  return `TK-${String(id).padStart(4, '0')}`;
};

// ── INLINE ISSUE CARD ──
const IssueCard = ({ issue, onPress, isDark }) => {
  const cfg = STATUS_CONFIG[issue.status] || {
    label: issue.status,
    icon: 'ellipse-outline',
    color: '#6b7280',
    bgColor: 'transparent',
    filled: false,
    borderColor: '#6b7280',
  };

  const cardBg = isDark ? '#242424' : '#ffffff';
  const subtitleColor = isDark ? '#9ca3af' : '#6b7280';
  const titleColor = isDark ? '#f9fafb' : '#111827';
  const dividerColor = isDark ? '#2e2e2e' : '#f3f4f6';
  const badgeTextColor = cfg.filled ? cfg.color : cfg.color;
  const badgeBg = cfg.filled
    ? isDark
      ? 'rgba(239,68,68,0.15)'
      : cfg.bgColor
    : 'transparent';

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.75}>
      <View style={[styles.card, { backgroundColor: cardBg, borderBottomColor: dividerColor }]}>
        {/* Left Status Border */}
        <View style={[styles.cardBorder, { backgroundColor: cfg.borderColor }]} />

        {/* Card Content */}
        <View style={styles.cardContent}>
          {/* Top Row: ID + Status Badge */}
          <View style={styles.cardTopRow}>
            <Text style={[styles.cardId, { color: subtitleColor }]}>{formatId(issue.id)}</Text>
            <View style={[styles.statusBadge, { backgroundColor: badgeBg, borderColor: cfg.filled ? badgeBg : 'transparent' }]}>
              <Ionicons name={cfg.icon} size={13} color={badgeTextColor} />
              <Text style={[styles.statusBadgeText, { color: badgeTextColor }]}>{cfg.label.toUpperCase()}</Text>
            </View>
          </View>

          {/* Title */}
          <Text style={[styles.cardTitle, { color: titleColor }]} numberOfLines={1}>
            {issue.title}
          </Text>

          {/* Location + Assignee Row */}
          <View style={styles.cardMetaRow}>
            <View style={styles.cardMetaItem}>
              <Ionicons name="location-outline" size={13} color={subtitleColor} />
              <Text style={[styles.cardMetaText, { color: subtitleColor }]} numberOfLines={1}>
                {issue.site_name || issue.site?.name || 'Unknown Site'}
              </Text>
            </View>
            <View style={styles.cardMetaItem}>
              <Ionicons name="person-outline" size={13} color={subtitleColor} />
              <Text
                style={[styles.cardMetaText, { color: subtitleColor }]}
                numberOfLines={1}
              >
                {issue.supervisor_role || 'Supervisor'}
              </Text>
            </View>
          </View>

          {/* Bottom Row: Solver + Time */}
          <View style={styles.cardBottomRow}>
            <View style={styles.solverRow}>
              <Avatar
                uri={issue.solver_avatar || issue.assigned_to_avatar}
                name={issue.solver_name || issue.assigned_to_name}
                size="small"
              />
              <Text style={[styles.solverLabel, { color: subtitleColor }]}>ASSIGNED SOLVER</Text>
            </View>
            <View style={styles.timeRow}>
              <Ionicons name="time-outline" size={13} color={subtitleColor} />
              <Text style={[styles.timeText, { color: subtitleColor }]}>{getTimeAgo(issue.created_at)}</Text>
            </View>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

// ── MAIN SCREEN ──
export default function IssuesTabScreen() {
  const { theme, isDark } = useTheme();
  const router = useRouter();
  const dispatch = useDispatch();
  const user = useSelector(selectCurrentUser);
  const allIssues = useSelector(selectAllIssues);
  const loading = useSelector(selectIssuesLoading);
  const loadingMore = useSelector(selectIssuesLoadingMore);
  const hasMore = useSelector(selectHasMoreIssues);
  const isOnline = useSelector(selectIsOnline);

  const [searchText, setSearchText] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [toastMessage, setToastMessage] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [appliedFilters, setAppliedFilters] = useState({
    statuses: [],
    priorities: [],
    categories: [],
    site: null,
    dateRange: 'all',
    overdueOnly: false,
  });

  const debouncedSearch = useDebounce(searchText, 300);

  useEffect(() => {
    if (user) dispatch(fetchIssues({ reset: true }));
  }, [user, dispatch]);

  const realSites = useMemo(() => {
    if (!allIssues) return [];
    const uniqueSites = new Map();
    allIssues.forEach((issue) => {
      if (issue.site_id && issue.site_name) {
        uniqueSites.set(issue.site_id, { id: issue.site_id, name: issue.site_name });
      }
    });
    return Array.from(uniqueSites.values());
  }, [allIssues]);

  const filteredIssues = useMemo(() => {
    if (!allIssues || allIssues.length === 0) return [];
    return allIssues.filter((issue) => {
      if (debouncedSearch) {
        const s = debouncedSearch.toLowerCase();
        const match =
          issue.title?.toLowerCase().includes(s) ||
          issue.description?.toLowerCase().includes(s) ||
          issue.id?.toString().includes(s) ||
          issue.site_name?.toLowerCase().includes(s);
        if (!match) return false;
      }
      if (appliedFilters.statuses?.length > 0 && !appliedFilters.statuses.includes(issue.status)) return false;
      if (appliedFilters.priorities?.length > 0 && !appliedFilters.priorities.includes(issue.priority)) return false;
      if (appliedFilters.site && issue.site_id !== appliedFilters.site) return false;
      if (appliedFilters.categories?.length > 0) {
        const match = appliedFilters.categories.some((cat) => {
          const c = cat.toLowerCase();
          return issue.title?.toLowerCase().includes(c) || issue.description?.toLowerCase().includes(c);
        });
        if (!match) return false;
      }
      if (appliedFilters.dateRange && appliedFilters.dateRange !== 'all') {
        if (!issue.created_at) return false;
        const issueDate = new Date(issue.created_at);
        const now = new Date();
        if (appliedFilters.dateRange === 'today' && issueDate.toDateString() !== now.toDateString()) return false;
        if (appliedFilters.dateRange === 'week' && issueDate < new Date(now - 7 * 864e5)) return false;
        if (appliedFilters.dateRange === 'month' && issueDate < new Date(now - 30 * 864e5)) return false;
        if (appliedFilters.dateRange === '3months' && issueDate < new Date(now - 90 * 864e5)) return false;
      }
      if (appliedFilters.overdueOnly) {
        if (issue.status === 'COMPLETED' || issue.status === 'RESOLVED_PENDING_REVIEW') return false;
        if (issue.deadline_at) { if (new Date(issue.deadline_at) >= new Date()) return false; }
        else return false;
      }
      return true;
    });
  }, [allIssues, debouncedSearch, appliedFilters]);

  // Apply active tab filter on top
  const tabFilteredIssues = useMemo(() => {
    if (activeTab === 'all') return filteredIssues;
    return filteredIssues.filter((issue) => issue.status === activeTab);
  }, [filteredIssues, activeTab]);

  const onRefresh = useCallback(async () => {
    if (!isOnline) { setToastMessage("Can't refresh while offline"); setTimeout(() => setToastMessage(''), 3000); return; }
    const now = Date.now();
    if (lastRefresh && now - lastRefresh < 5000) { setToastMessage('Just refreshed. Wait a moment.'); setTimeout(() => setToastMessage(''), 3000); return; }
    setRefreshing(true);
    if (user) {
      try { await Promise.allSettled([dispatch(fetchIssues({ reset: true }))]); }
      finally { setLastRefresh(Date.now()); setRefreshing(false); }
    } else { setRefreshing(false); }
  }, [user, isOnline, lastRefresh, dispatch]);

  const handleLoadMore = () => {
    if (!loadingMore && hasMore && isOnline) dispatch(fetchIssues({ reset: false }));
  };

  const handleIssuePress = (issue) =>
    router.push({ pathname: '/(main)/(tabs)/issues/issue-detail', params: { id: issue.id } });
  const handleApplyFilters = (filters) => setAppliedFilters(filters);
  const handleClearFilters = () => {
    setSearchText('');
    setActiveTab('all');
    setAppliedFilters({ statuses: [], priorities: [], categories: [], site: null, dateRange: 'all', overdueOnly: false });
  };

  const getActiveFilterCount = () => {
    let c = 0;
    if (appliedFilters.statuses.length > 0) c++;
    if (appliedFilters.priorities.length > 0) c++;
    if (appliedFilters.categories.length > 0) c++;
    if (appliedFilters.site) c++;
    if (appliedFilters.dateRange !== 'all') c++;
    if (appliedFilters.overdueOnly) c++;
    return c;
  };

  const activeFilterCount = getActiveFilterCount();
  const borderColor = isDark ? '#2e2e2e' : '#e5e7eb';
  const bgColor = isDark ? '#1a1a1a' : '#f9fafb';
  const cardAreaBg = isDark ? '#1a1a1a' : '#f9fafb';

  if (loading && allIssues.length === 0 && !refreshing) return <Loader message="Loading issues..." />;

  return (
    <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: bgColor }]}>

      {/* ── HEADER ── */}
      <View style={[styles.header, { backgroundColor: isDark ? '#1a1a1a' : '#ffffff', borderBottomColor: borderColor }]}>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Field Issues</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={() => setShowFilterModal(true)}
            style={[styles.headerFilterBtn, { backgroundColor: activeFilterCount > 0 ? theme.primary : 'transparent' }]}
            activeOpacity={0.7}
          >
            <Ionicons
              name="funnel-outline"
              size={20}
              color={activeFilterCount > 0 ? '#fff' : theme.text}
            />
            {activeFilterCount > 0 && (
              <View style={styles.filterDot}>
                <Text style={styles.filterDotText}>{activeFilterCount}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/(main)/profile')} activeOpacity={0.7}>
            <Avatar uri={user?.avatar} name={user?.name} size="medium" />
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={tabFilteredIssues}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <IssueCard issue={item} onPress={() => handleIssuePress(item)} isDark={isDark} />
        )}
        contentContainerStyle={[styles.listContent, { backgroundColor: cardAreaBg }]}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          loadingMore ? (
            <View style={styles.loadingFooter}>
              <ActivityIndicator size="small" color={theme.primary} />
            </View>
          ) : null
        }
        ListHeaderComponent={
          <View style={{ backgroundColor: isDark ? '#1a1a1a' : '#ffffff' }}>
            {/* ── SEARCH BAR ── */}
            <View style={[styles.searchWrapper, { borderBottomColor: borderColor }]}>
              <View style={[styles.searchBar, { backgroundColor: isDark ? '#242424' : '#f3f4f6', borderColor }]}>
                <Ionicons name="search-outline" size={17} color={isDark ? '#6b7280' : '#9ca3af'} />
                <TextInput
                  style={[styles.searchInput, { color: theme.text }]}
                  placeholder="Search by ID, title, or site..."
                  placeholderTextColor={isDark ? '#4b5563' : '#9ca3af'}
                  value={searchText}
                  onChangeText={setSearchText}
                />
                {searchText !== '' && (
                  <TouchableOpacity onPress={() => setSearchText('')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Ionicons name="close-circle" size={16} color={isDark ? '#4b5563' : '#9ca3af'} />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* ── STATUS TABS ── */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.tabsScroll}
              style={[styles.tabsContainer, { borderBottomColor: borderColor }]}
            >
              {STATUS_TABS.map((tab) => {
                const isActive = activeTab === tab.key;
                return (
                  <TouchableOpacity
                    key={tab.key}
                    onPress={() => setActiveTab(tab.key)}
                    activeOpacity={0.7}
                    style={[
                      styles.tab,
                      isActive
                        ? { backgroundColor: '#2563eb' }
                        : { backgroundColor: 'transparent' },
                    ]}
                  >
                    <Text
                      style={[
                        styles.tabText,
                        { color: isActive ? '#ffffff' : isDark ? '#9ca3af' : '#6b7280' },
                      ]}
                    >
                      {tab.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
              {(activeFilterCount > 0 || searchText) && (
                <TouchableOpacity onPress={handleClearFilters} style={styles.clearTabBtn}>
                  <Text style={[styles.clearTabText, { color: isDark ? '#9ca3af' : '#6b7280' }]}>Clear All</Text>
                </TouchableOpacity>
              )}
            </ScrollView>

            {/* ── RESULTS COUNT ── */}
            <View style={[styles.resultsRow, { backgroundColor: isDark ? '#1a1a1a' : '#f9fafb' }]}>
              <Text style={[styles.resultsText, { color: isDark ? '#6b7280' : '#9ca3af' }]}>
                {tabFilteredIssues.length} issue{tabFilteredIssues.length !== 1 ? 's' : ''}
              </Text>
              {Platform.OS === 'web' && (
                <TouchableOpacity onPress={onRefresh} disabled={refreshing}>
                  <Ionicons name="refresh-outline" size={16} color={isDark ? '#6b7280' : '#9ca3af'} />
                </TouchableOpacity>
              )}
            </View>
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            icon="document-text-outline"
            title="No issues found"
            message={
              activeFilterCount > 0 || searchText || activeTab !== 'all'
                ? 'Try adjusting your filters.'
                : 'There are no issues to display.'
            }
          />
        }
        showsVerticalScrollIndicator={false}
        refreshControl={
          Platform.OS === 'web' ? undefined : (
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.textSecondary} />
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

      <FullScreenSpinner visible={refreshing} message="Updating Issues..." color={theme.primary} />
      {toastMessage !== '' && <Toast message={toastMessage} />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: { fontSize: 20, fontWeight: '700', letterSpacing: -0.3 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerFilterBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  filterDot: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#ef4444',
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  filterDotText: { color: '#fff', fontSize: 8, fontWeight: '800' },

  // Search
  searchWrapper: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 14 },

  // Tabs
  tabsContainer: { borderBottomWidth: StyleSheet.hairlineWidth },
  tabsScroll: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    alignItems: 'center',
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
  },
  tabText: { fontSize: 13, fontWeight: '600' },
  clearTabBtn: { paddingHorizontal: 8, paddingVertical: 7 },
  clearTabText: { fontSize: 13, fontWeight: '500' },

  // Results row
  resultsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  resultsText: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },

  // Card
  card: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 10,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardBorder: { width: 4, flexShrink: 0 },
  cardContent: { flex: 1, padding: 14, gap: 6 },

  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardId: { fontSize: 11, fontWeight: '600', letterSpacing: 0.3 },

  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusBadgeText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.4 },

  cardTitle: { fontSize: 15, fontWeight: '700', letterSpacing: -0.2, marginTop: 1 },

  cardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  cardMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1 },
  cardMetaText: { fontSize: 12, fontWeight: '500', flexShrink: 1 },

  cardBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.06)',
  },
  solverRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  solverLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  timeText: { fontSize: 11, fontWeight: '500' },

  listContent: { paddingBottom: 30 },
  loadingFooter: { paddingVertical: 20, alignItems: 'center' },
});