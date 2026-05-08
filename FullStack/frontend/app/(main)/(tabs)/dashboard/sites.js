import React, { useEffect, useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  RefreshControl,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../../../../src/theme/ThemeContext';
import { selectCurrentUser } from '../../../../src/store/slices/authSlice';
import {
  fetchSitesWithAnalytics,
  selectAllSites,
  selectSitesLoading,
} from "../../../../src/store/slices/sitesSlice";
import EmptyState from '../../../../src/components/common/EmptyState';
import Avatar from '../../../../src/components/common/Avatar';
import Loader from '../../../../src/components/common/Loader';

// ── ADDED REUSABLE SPINNER ──
import FullScreenSpinner from '../../../../src/components/common/FullScreenSpinner';

export default function SitesScreen() {
  const { theme, isDark } = useTheme();
  const router = useRouter();
  const dispatch = useDispatch();

  const user = useSelector(selectCurrentUser);
  const sites = useSelector(selectAllSites) || [];
  const loading = useSelector(selectSitesLoading);

  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (user) {
      dispatch(fetchSitesWithAnalytics(user));
    }
  }, [dispatch, user]);

  const onRefresh = useCallback(async () => {
    if (!user) return;
    setRefreshing(true);
    
    try {
      // 📍 FIX: Promise.allSettled guarantees the spinner spins until totally done
      await Promise.allSettled([
        dispatch(fetchSitesWithAnalytics(user))
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [dispatch, user]);

  // ── FILTER LOGIC ──
  const filteredSites = (sites || []).filter(site => {
    // 1. Search Filter
    const searchLower = searchText.toLowerCase();
    const matchesSearch = !searchText || (
      site.name?.toLowerCase().includes(searchLower) ||
      site.location?.toLowerCase().includes(searchLower)
    );

    // 2. Status Filter
    if (!matchesSearch) return false;
    if (statusFilter === 'All') return true;

    const health = (site.analytics?.health || 'Healthy').toLowerCase();
    const filter = statusFilter.toLowerCase();
    
    if (filter === 'needs attention') {
      return health.includes('warning') || health.includes('attention');
    }
    return health.includes(filter);
  });

  // ── PREMIUM PALETTE ──
  const bgColor = isDark ? '#111111' : '#ffffff';
  const surfaceColor = isDark ? '#1a1a1a' : '#ffffff';
  const borderColor = isDark ? '#2e2e2e' : '#f0f0f0';
  const searchBg = isDark ? '#262626' : '#f8fafc';
  const primaryBlue = '#3b82f6';
  
  const getHealthColor = health => {
    const h = String(health).toLowerCase();
    if (h.includes('healthy')) return '#10a37f'; // Premium Emerald
    if (h.includes('warning') || h.includes('attention')) return '#f59e0b'; // Amber
    if (h.includes('critical')) return '#ef4444'; // Red
    return theme.textSecondary;
  };

  const renderItem = ({ item }) => {
    const { analytics } = item || {};
    const health = analytics?.health || 'HEALTHY';
    const score = analytics?.score ?? 100;
    const totalIssues = analytics?.total_issues || 0;
    const overdueCount = analytics?.overdue_count || 0;
    
    return (
      <TouchableOpacity
        activeOpacity={0.7}
        style={[styles.card, { backgroundColor: surfaceColor, borderColor }]}
        onPress={() => router.push({ pathname: '/(main)/(tabs)/dashboard/site-detail', params: { id: item.id } })}
      >
        {/* ── HEALTH INDICATOR BAR ── */}
        <View style={[styles.healthBar, { backgroundColor: getHealthColor(health) }]} />

        {/* Top Row: Title, Badge, ID */}
        <View style={styles.cardTopRow}>
          <Text style={[styles.siteName, { color: theme.text }]} numberOfLines={1}>{item.name}</Text>
          <View style={styles.badgeIdRow}>
            <View style={styles.healthBadge}>
              <View style={[styles.healthDot, { backgroundColor: getHealthColor(health) }]} />
              <Text style={[styles.healthText, { color: theme.textSecondary }]}>{health.toUpperCase()}</Text>
            </View>
            <View style={[styles.idPill, { backgroundColor: searchBg }]}>
              <Text style={[styles.idPillText, { color: theme.textSecondary }]}>SITE-{item.id.toString().padStart(3, '0')}</Text>
            </View>
          </View>
        </View>

        {/* Location Row */}
        <View style={styles.locationRow}>
          <Ionicons name="location-outline" size={14} color={theme.textSecondary} />
          <Text style={[styles.siteLocation, { color: theme.textSecondary }]} numberOfLines={1}>{item.location}</Text>
        </View>

        {/* Divider with Arrow */}
        <View style={styles.dividerRow}>
          <View style={[styles.dividerLine, { backgroundColor: borderColor }]} />
          <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} style={{ opacity: 0.5, marginLeft: 8 }} />
        </View>

        {/* Bottom Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statBlock}>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>SCORE</Text>
            <View style={styles.statValueRow}>
              <Ionicons name="speedometer-outline" size={16} color={getHealthColor(health)} />
              <Text style={[styles.statValue, { color: theme.text }]}>{score}</Text>
            </View>
          </View>
          <View style={styles.statBlock}>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>TOTAL</Text>
            <View style={styles.statValueRow}>
              <Ionicons name="list-outline" size={16} color={primaryBlue} />
              <Text style={[styles.statValue, { color: theme.text }]}>{totalIssues}</Text>
            </View>
          </View>
          <View style={styles.statBlock}>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>OVERDUE</Text>
            <View style={styles.statValueRow}>
              <Ionicons name="alert-circle-outline" size={16} color={overdueCount > 0 ? '#ef4444' : theme.text} />
              <Text style={[styles.statValue, { color: theme.text }]}>{overdueCount}</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // 📍 FIX: Added `&& !refreshing` to prevent Loader hijacking
  if (loading && sites.length === 0 && !refreshing) {
    return <Loader message="Loading sites..." fullScreen />;
  }

  return (
    <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: bgColor }]}>
      
      {/* ── HEADER ── */}
      <View style={[styles.header, { backgroundColor: surfaceColor, borderBottomColor: borderColor }]}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7} style={styles.backButton}>
            <Ionicons name="chevron-back" size={26} color={theme.text} />
          </TouchableOpacity>
        </View>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Site Directory</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={() => router.push('/(main)/profile')} activeOpacity={0.7}>
            <Avatar uri={user?.avatar} name={user?.name} size="small" />
          </TouchableOpacity>
          {/* <TouchableOpacity activeOpacity={0.7} style={styles.filterBtn}>
            <Ionicons name="funnel-outline" size={22} color={theme.text} />
          </TouchableOpacity> */}
        </View>
      </View>

      {/* ── SEARCH BAR ── */}
      <View style={[styles.searchContainer, { backgroundColor: bgColor }]}>
        <View style={[styles.searchInputWrapper, { backgroundColor: searchBg }]}>
          <Ionicons name="search" size={20} color={theme.textSecondary} style={{ opacity: 0.7 }} />
          <TextInput
            style={[styles.searchTextInput, { color: theme.text }]}
            placeholder="Search site name, ID or location..."
            placeholderTextColor={theme.textSecondary}
            value={searchText}
            onChangeText={setSearchText}
          />
        </View>
      </View>

      {/* ── FILTER PILLS ── */}
      <View style={styles.chipsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingRight: 80 }}>
          {['All', 'Healthy', 'Needs Attention', 'Critical'].map((status) => {
            const isActive = statusFilter === status;
            const count = status === 'All' 
              ? sites.length 
              : (sites || []).filter(s => {
                  const h = (s.analytics?.health || 'Healthy').toLowerCase();
                  if (status === 'Needs Attention') return h.includes('warning') || h.includes('attention');
                  return h.includes(status.toLowerCase());
                }).length;

            return (
              <TouchableOpacity 
                key={status}
                onPress={() => setStatusFilter(status)}
                style={[
                  styles.chip, 
                  isActive ? styles.chipActive : styles.chipOutline, 
                  { 
                    borderColor: isActive ? primaryBlue : borderColor, 
                    backgroundColor: isActive ? primaryBlue : (isDark ? '#1a1a1a' : '#fff') 
                  }
                ]}
              >
                <Text style={[isActive ? styles.chipTextActive : styles.chipText, { color: isActive ? '#fff' : theme.text }]}>
                  {status} ({count})
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
        <TouchableOpacity style={[styles.sortBtn, { backgroundColor: bgColor }]}>
          <Ionicons name="swap-vertical" size={14} color={theme.textSecondary} />
          <Text style={[styles.sortText, { color: theme.textSecondary }]}>Sort</Text>
        </TouchableOpacity>
      </View>

      {/* ── RESULTS HEADER ── */}
      <View style={styles.resultsHeader}>
        <Text style={[styles.resultsCount, { color: theme.textSecondary }]}>RECENT SITES</Text>
        <Text style={[styles.resultsSub, { color: theme.textSecondary }]}>Showing {Math.min(5, filteredSites.length)} of {sites.length}</Text>
      </View>

      {/* ── LIST ── */}
      {sites.length === 0 && !loading ? (
        <EmptyState icon="business-outline" title="No sites found" message="You don't have any accessible sites yet." />
      ) : filteredSites.length === 0 ? (
        <EmptyState icon="search-outline" title="No matches" message={`No sites found matching "${searchText}"`} />
      ) : (
        <FlatList
          data={filteredSites}
          keyExtractor={item => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            Platform.OS === 'web' ? undefined : (
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.textSecondary} />
            )
          }
          ListFooterComponent={
            <View style={styles.footerContainer}>
              <View style={[styles.footerIconBox, { backgroundColor: searchBg }]}>
                <Ionicons name="business-outline" size={24} color={theme.textSecondary} />
              </View>
              <Text style={[styles.footerTitle, { color: theme.textSecondary }]}>End of Directory</Text>
              <Text style={[styles.footerSub, { color: theme.textSecondary }]}>Contact operations for new site additions</Text>
            </View>
          }
        />
      )}

      {/* ── NEW CLEAN IMPLEMENTATION ── */}
      <FullScreenSpinner visible={refreshing} message="Updating Sites..." />

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
    borderBottomWidth: StyleSheet.hairlineWidth,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 3 },
      android: { elevation: 2 },
    }),
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  backButton: { padding: 4, marginLeft: -4 },
  headerTitle: { fontSize: 18, fontWeight: '800', letterSpacing: -0.2 },
  placeholder: { width: 32 },
  filterBtn: { padding: 4 },
  
  searchContainer: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 16 },
  searchInputWrapper: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 16, 
    height: 50, 
    borderRadius: 25, 
    gap: 10 
  },
  searchTextInput: { flex: 1, fontSize: 15 },
  
  chipsContainer: { marginBottom: 16, position: 'relative' },
  chip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  chipOutline: { borderWidth: 1, backgroundColor: 'transparent' },
  chipTextActive: { fontSize: 13, fontWeight: '700' },
  chipText: { fontSize: 13, fontWeight: '600' },
  sortBtn: { position: 'absolute', right: 0, top: 0, bottom: 0, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 4, zIndex: 10 },
  sortText: { fontSize: 13, fontWeight: '600' },

  resultsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 12 },
  resultsCount: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 },
  resultsSub: { fontSize: 11 },

  listContent: { paddingHorizontal: 16, paddingBottom: 30 },
  
  card: { 
    borderRadius: 16, 
    borderWidth: 1, 
    padding: 20, 
    paddingLeft: 24, // Extra padding for the bar
    marginBottom: 16,
    overflow: 'hidden',
    position: 'relative',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.02, shadowRadius: 6 },
      android: { elevation: 1 },
    }),
  },
  healthBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 6,
  },
  
  cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  siteName: { fontSize: 18, fontWeight: '800', letterSpacing: -0.3, flex: 1, marginRight: 8 },
  badgeIdRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  healthBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  healthDot: { width: 6, height: 6, borderRadius: 3 },
  healthText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  idPill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  idPillText: { fontSize: 10, fontWeight: '700' },
  
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16 },
  siteLocation: { fontSize: 13 },
  
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  dividerLine: { height: StyleSheet.hairlineWidth, flex: 1 },
  
  statsRow: { flexDirection: 'row' },
  statBlock: { flex: 1 },
  statLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5, marginBottom: 6 },
  statValueRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statValue: { fontSize: 18, fontWeight: '800' },

  footerContainer: { alignItems: 'center', paddingVertical: 40 },
  footerIconBox: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  footerTitle: { fontSize: 14, fontWeight: '700', marginBottom: 4 },
  footerSub: { fontSize: 12 },
});