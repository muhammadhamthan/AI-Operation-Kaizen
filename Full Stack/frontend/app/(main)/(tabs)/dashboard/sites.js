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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import Ionicons from '@expo/vector-icons/Ionicons';

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

export default function SitesScreen() {
  const { theme, isDark } = useTheme();
  const router = useRouter();
  const dispatch = useDispatch();

  const user = useSelector(selectCurrentUser);
  const sites = useSelector(selectAllSites) || [];
  const loading = useSelector(selectSitesLoading);

  const [searchText, setSearchText] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (user) {
      dispatch(fetchSitesWithAnalytics(user));
    }
  }, [dispatch, user]);

  const onRefresh = useCallback(async () => {
    if (!user) return;
    setRefreshing(true);
    await dispatch(fetchSitesWithAnalytics(user));
    setRefreshing(false);
  }, [dispatch, user]);

  // ── SEARCH LOGIC ──
  const filteredSites = sites.filter(site => {
    if (!searchText) return true;
    const searchLower = searchText.toLowerCase();
    return (
      site.name?.toLowerCase().includes(searchLower) ||
      site.location?.toLowerCase().includes(searchLower)
    );
  });

  // ── PREMIUM PALETTE ──
  const bgColor = isDark ? '#1a1a1a' : '#f4f4f5';
  const surfaceColor = isDark ? '#242424' : '#ffffff';
  const borderColor = isDark ? '#333333' : '#e5e5e5';
  const searchBg = isDark ? '#2a2a2a' : '#eeeeef';
  const metricGridBg = isDark ? 'rgba(255,255,255,0.03)' : '#f9fafb';

  const getHealthColor = health => {
    switch (health) {
      case 'Healthy': return '#10a37f';
      case 'Needs Attention': return '#f59e0b';
      case 'Critical': return '#ef4444';
      default: return theme.textSecondary;
    }
  };

  const renderItem = ({ item }) => {
    const { analytics } = item || {};
    const overdue = analytics?.overdue_count || 0;
    const complaintsCount = analytics?.complaints_count || 0;
    const score = analytics?.score ?? 100; 
    const health = analytics?.health || 'Unknown';
    const openIssues = (analytics?.open_issues || 0) + (analytics?.assigned_issues || 0) + (analytics?.in_progress_issues || 0);

    return (
      <TouchableOpacity
        activeOpacity={0.7}
        style={[styles.card, { backgroundColor: surfaceColor, borderColor }]}
        onPress={() =>
          router.push({
            pathname: '/(main)/(tabs)/dashboard/site-detail',
            params: { id: item.id },
          })
        }
      >
        <View style={styles.cardHeader}>
          <View style={styles.titleContainer}>
            <View style={styles.iconWrapper}>
              <Ionicons name="business-outline" size={20} color={theme.text} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.siteName, { color: theme.text }]} numberOfLines={1}>{item.name}</Text>
              <View style={styles.locationRow}>
                <Ionicons name="location-outline" size={12} color={theme.textSecondary} />
                <Text style={[styles.siteLocation, { color: theme.textSecondary }]} numberOfLines={1}>{item.location}</Text>
              </View>
            </View>
          </View>

          <View style={styles.scoreContainer}>
            <Text style={[styles.scoreText, { color: getHealthColor(health) }]}>{score}%</Text>
            {health !== 'Unknown' && (
              <View style={[styles.healthBadge, { backgroundColor: getHealthColor(health) + '15' }]}>
                <View style={[styles.healthDot, { backgroundColor: getHealthColor(health) }]} />
                <Text style={[styles.healthText, { color: getHealthColor(health) }]}>{health}</Text>
              </View>
            )}
          </View>
        </View>

        {/* ── METRICS DASHBOARD GRID ── */}
        <View style={[styles.metricsContainer, { backgroundColor: metricGridBg, borderColor }]}>
          <View style={styles.metricItem}>
            <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>Active Issues</Text>
            <Text style={[styles.metricValue, { color: theme.text }]}>{openIssues}</Text>
          </View>
          
          <View style={[styles.metricDivider, { backgroundColor: borderColor }]} />
          
          <View style={styles.metricItem}>
            <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>Overdue</Text>
            <Text style={[styles.metricValue, { color: overdue > 0 ? '#ef4444' : theme.text }]}>{overdue}</Text>
          </View>
          
          <View style={[styles.metricDivider, { backgroundColor: borderColor }]} />
          
          <View style={styles.metricItem}>
            <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>Complaints</Text>
            <Text style={[styles.metricValue, { color: complaintsCount > 0 ? '#f97316' : theme.text }]}>{complaintsCount}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading && sites.length === 0) {
    return <Loader message="Loading sites..." fullScreen />;
  }

  return (
    <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: bgColor }]}>
      
      {/* ── HEADER ── */}
      <View style={[styles.header, { backgroundColor: surfaceColor, borderBottomColor: borderColor }]}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7} style={styles.backButton}>
            <Ionicons name="arrow-back" size={26} color={theme.text} />
          </TouchableOpacity>
          <View>
            <Text style={[styles.headerTitle, { color: theme.text }]}>Sites Hub</Text>
            <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>
              {user?.role === 'manager' ? 'All locations overview' : user?.role === 'supervisor' ? 'Your locations' : 'Assigned locations'}
            </Text>
          </View>
        </View>
        <TouchableOpacity onPress={() => router.push('/(main)/profile')} activeOpacity={0.7}>
          <Avatar uri={user?.avatar} name={user?.name} size="medium" />
        </TouchableOpacity>
      </View>

      {/* ── SEARCH BAR ── */}
      <View style={[styles.searchContainer, { backgroundColor: bgColor }]}>
        <View style={[styles.searchInputWrapper, { backgroundColor: searchBg }]}>
          <Ionicons name="search" size={20} color={theme.textSecondary} style={{ opacity: 0.7 }} />
          <TextInput
            style={[styles.searchTextInput, { color: theme.text }]}
            placeholder="Search sites or locations..."
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
      {searchText !== '' && (
        <View style={styles.resultsHeader}>
          <Text style={[styles.resultsCount, { color: theme.textSecondary }]}>
            {filteredSites.length} {filteredSites.length === 1 ? 'Site' : 'Sites'} found
          </Text>
        </View>
      )}

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
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.textSecondary} />}
        />
      )}
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
  backButton: { padding: 4, marginLeft: -4 },
  headerTitle: { fontSize: 24, fontWeight: '800', letterSpacing: -0.5 },
  headerSubtitle: { fontSize: 13, fontWeight: '500', marginTop: 2 },
  
  searchContainer: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  searchInputWrapper: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 14, 
    height: 48, 
    borderRadius: 14, 
    gap: 10 
  },
  searchTextInput: { flex: 1, fontSize: 15, fontWeight: '500' },
  
  resultsHeader: { paddingHorizontal: 20, paddingBottom: 8, paddingTop: 4 },
  resultsCount: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8, opacity: 0.8 },

  listContent: { paddingHorizontal: 16, paddingBottom: 30, paddingTop: 8 },
  
  card: { 
    borderRadius: 20, 
    borderWidth: 1, 
    padding: 16, 
    marginBottom: 14,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 8 },
      android: { elevation: 1 },
    }),
  },
  
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  titleContainer: { flexDirection: 'row', gap: 12, flex: 1, paddingRight: 16 },
  iconWrapper: { width: 40, height: 40, borderRadius: 10, backgroundColor: 'rgba(142,142,160,0.1)', justifyContent: 'center', alignItems: 'center' },
  siteName: { fontSize: 17, fontWeight: '700', letterSpacing: -0.3, marginBottom: 4 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  siteLocation: { fontSize: 13, fontWeight: '500' },
  
  scoreContainer: { alignItems: 'flex-end', gap: 6 },
  scoreText: { fontSize: 20, fontWeight: '800', letterSpacing: -0.5 },
  healthBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, gap: 5 },
  healthDot: { width: 6, height: 6, borderRadius: 3 },
  healthText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5, textTransform: 'uppercase' },
  
  metricsContainer: { 
    flexDirection: 'row', 
    borderRadius: 12, 
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 12,
  },
  metricItem: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  metricDivider: { width: StyleSheet.hairlineWidth, height: '80%', alignSelf: 'center', opacity: 0.5 },
  metricLabel: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  metricValue: { fontSize: 18, fontWeight: '800', letterSpacing: -0.5 },
});