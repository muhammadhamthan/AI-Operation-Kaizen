import React, { useEffect, useState, useCallback, useMemo } from 'react';
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
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../../../../src/theme/ThemeContext';
import { selectCurrentUser } from '../../../../src/store/slices/authSlice';
import {
  fetchSolversPerformance,
  selectAllSolvers,
  selectPerformanceLoading,
} from "../../../../src/store/slices/performanceSlice";
import { selectIsOnline } from '../../../../src/store/slices/offlineSlice';
import Loader from '../../../../src/components/common/Loader';
import EmptyState from "../../../../src/components/common/EmptyState";
import Avatar from '../../../../src/components/common/Avatar';
import Toast from '../../../../src/components/common/Toast';
import FullScreenSpinner from '../../../../src/components/common/FullScreenSpinner';

export default function SolversScreen() {
  const { theme, isDark } = useTheme();
  const router = useRouter();
  const dispatch = useDispatch();

  const user = useSelector(selectCurrentUser);
  const solvers = useSelector(selectAllSolvers) || [];
  const loading = useSelector(selectPerformanceLoading);
  const isOnline = useSelector(selectIsOnline);

  const [searchText, setSearchText] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => {
    if (user) {
      dispatch(fetchSolversPerformance(user));
    }
  }, [dispatch, user]);

  const onRefresh = useCallback(async () => {
    if (!isOnline) {
      setToastMessage("Can't refresh while offline");
      setTimeout(() => setToastMessage(''), 3000);
      return;
    }
    if (!user) return;
    
    setRefreshing(true);
    try {
      await Promise.allSettled([
        dispatch(fetchSolversPerformance(user))
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [dispatch, user, isOnline]);

  // ── FILTER LOGIC ──
  const filteredSolvers = useMemo(() => {
    let list = solvers || [];
    
    // Search Filter
    const q = searchText.trim().toLowerCase();
    if (q) {
      list = list.filter(s => {
        const name = s.name?.toLowerCase() || '';
        const role = s.role?.toLowerCase() || '';
        const skills = (s.skills || []).join(' ').toLowerCase();
        return name.includes(q) || role.includes(q) || skills.includes(q);
      });
    }
    
    return list;
  }, [searchText, solvers]);

  // ── PREMIUM PALETTE ──
  const bgColor = isDark ? '#111111' : '#ffffff';
  const surfaceColor = isDark ? '#1a1a1a' : '#ffffff';
  const borderColor = isDark ? '#2e2e2e' : '#f0f0f0';
  const searchBg = isDark ? '#262626' : '#f8fafc';
  const primaryBlue = '#3b82f6';
  
  const getScoreColor = (score, backendColor) => {
    if (backendColor) return backendColor;
    if (score >= 75) return '#10a37f'; // Premium Emerald
    if (score >= 50) return '#f59e0b'; // Amber
    return '#ef4444'; // Red
  };

  const renderItem = ({ item }) => {
    const perf = item.performance || {};
    const score = perf.score || 0;
    const scoreColor = getScoreColor(score, perf.label_color);
    const label = perf.label || 'NO RATING';
    
    const activeCount =
      (perf.in_progress_count || 0) +
      (perf.assigned_not_started_count || 0) +
      (perf.reopened_count || 0) +
      (perf.active_count || 0);

    const displaySkills = item.skills?.length > 0 
      ? item.skills.map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(', ')
      : 'Professional Solver';

    return (
      <TouchableOpacity
        activeOpacity={0.7}
        style={[styles.card, { backgroundColor: surfaceColor, borderColor }]}
        onPress={() => router.push({ pathname: '/(main)/(tabs)/dashboard/solver-profile', params: { id: item.id } })}
      >
        {/* ── PERFORMANCE INDICATOR BAR ── */}
        <View style={[styles.healthBar, { backgroundColor: scoreColor }]} />

        {/* Top Row: Avatar, Name, Badge, ID */}
        <View style={styles.cardTopRow}>
          <View style={styles.nameSection}>
            <Avatar uri={item.avatar} name={item.name} size="small" />
            <Text style={[styles.siteName, { color: theme.text }]} numberOfLines={1}>{item.name}</Text>
          </View>
          <View style={styles.badgeIdRow}>
            <View style={styles.healthBadge}>
              <View style={[styles.healthDot, { backgroundColor: scoreColor }]} />
              <Text style={[styles.healthText, { color: theme.textSecondary }]}>{label.toUpperCase()}</Text>
            </View>
            <View style={[styles.idPill, { backgroundColor: searchBg }]}>
              <Text style={[styles.idPillText, { color: theme.textSecondary }]}>SOLV-{item.id.toString().padStart(3, '0')}</Text>
            </View>
          </View>
        </View>

        {/* Skills Row */}
        <View style={styles.locationRow}>
          <Ionicons name="briefcase-outline" size={14} color={theme.textSecondary} />
          <Text style={[styles.siteLocation, { color: theme.textSecondary }]} numberOfLines={1}>{displaySkills}</Text>
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
              <Ionicons name="speedometer-outline" size={16} color={scoreColor} />
              <Text style={[styles.statValue, { color: theme.text }]}>{score}%</Text>
            </View>
          </View>
          <View style={styles.statBlock}>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>COMPLETED</Text>
            <View style={styles.statValueRow}>
              <Ionicons name="checkmark-circle-outline" size={16} color={primaryBlue} />
              <Text style={[styles.statValue, { color: theme.text }]}>{perf.completed_count || 0}</Text>
            </View>
          </View>
          <View style={styles.statBlock}>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>ACTIVE</Text>
            <View style={styles.statValueRow}>
              <Ionicons name="flash-outline" size={16} color={activeCount > 0 ? '#f59e0b' : theme.text} />
              <Text style={[styles.statValue, { color: theme.text }]}>{activeCount}</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading && solvers.length === 0 && !refreshing) {
    return <Loader message="Loading team performance..." fullScreen />;
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
        <Text style={[styles.headerTitle, { color: theme.text }]}>Team Directory</Text>
        <View style={styles.headerActions} />
      </View>

      {/* ── SEARCH BAR ── */}
      <View style={[styles.searchContainer, { backgroundColor: bgColor }]}>
        <View style={[styles.searchInputWrapper, { backgroundColor: searchBg }]}>
          <Ionicons name="search" size={20} color={theme.textSecondary} style={{ opacity: 0.7 }} />
          <TextInput
            style={[styles.searchTextInput, { color: theme.text }]}
            placeholder="Search name, skill or role..."
            placeholderTextColor={theme.textSecondary}
            value={searchText}
            onChangeText={setSearchText}
          />
        </View>
      </View>



      {/* ── RESULTS HEADER ── */}
      <View style={styles.resultsHeader}>
        <Text style={[styles.resultsCount, { color: theme.textSecondary }]}>TEAM PERFORMANCE</Text>
        <Text style={[styles.resultsSub, { color: theme.textSecondary }]}>Showing {filteredSolvers.length} members</Text>
      </View>

      {/* ── LIST ── */}
      {solvers.length === 0 && !loading ? (
        <EmptyState icon="people-outline" title="No solvers found" message="Team data is not available yet." />
      ) : filteredSolvers.length === 0 ? (
        <EmptyState icon="search-outline" title="No matches" message={`No members found matching "${searchText}"`} />
      ) : (
        <FlatList
          data={filteredSolvers}
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
                <Ionicons name="people-outline" size={24} color={theme.textSecondary} />
              </View>
              <Text style={[styles.footerTitle, { color: theme.textSecondary }]}>End of Directory</Text>
              <Text style={[styles.footerSub, { color: theme.textSecondary }]}>Manage your team's performance metrics</Text>
            </View>
          }
        />
      )}

      {/* ── NEW CLEAN IMPLEMENTATION ── */}
      <FullScreenSpinner visible={refreshing} message="Updating Team..." />

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
 
  resultsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 12 },
  resultsCount: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 },
  resultsSub: { fontSize: 11 },

  listContent: { paddingHorizontal: 16, paddingBottom: 30 },
  
  card: { 
    borderRadius: 16, 
    borderWidth: 1, 
    padding: 20, 
    paddingLeft: 24, 
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
  
  cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  nameSection: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  siteName: { fontSize: 18, fontWeight: '800', letterSpacing: -0.3, flex: 1 },
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