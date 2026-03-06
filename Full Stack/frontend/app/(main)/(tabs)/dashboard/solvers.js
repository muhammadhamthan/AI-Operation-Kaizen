import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import Ionicons from '@expo/vector-icons/Ionicons';

import { useTheme } from '../../../../src/theme/ThemeContext';
import { selectCurrentUser } from '../../../../src/store/slices/authSlice';
import {
  fetchSolversPerformance,
  selectAllSolvers,
  selectPerformanceLoading,
} from "../../../../src/store/slices/performanceSlice"
import Loader from '../../../../src/components/common/Loader';
import EmptyState from "../../../../src/components/common/EmptyState"
import Avatar from '../../../../src/components/common/Avatar';

export default function SolversScreen() {
  const { theme, isDark } = useTheme();
  const router = useRouter();
  const dispatch = useDispatch();

  const user = useSelector(selectCurrentUser);
  const solvers = useSelector(selectAllSolvers);
  const loading = useSelector(selectPerformanceLoading);

  const [searchText, setSearchText] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (user) {
      dispatch(fetchSolversPerformance(user));
    }
  }, [dispatch, user]);

  const onRefresh = useCallback(async () => {
    if (!user) return;
    setRefreshing(true);
    await dispatch(fetchSolversPerformance(user));
    setRefreshing(false);
  }, [dispatch, user]);

  const surfaceColor = isDark ? '#171717' : '#ffffff';
  const borderColor = isDark ? '#333333' : '#e5e5e5';
  const inactiveBg = isDark ? 'rgba(255,255,255,0.06)' : '#f4f4f4';

  const filteredSolvers = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    if (!q) return solvers;
    return solvers.filter(s => {
      const name = s.name?.toLowerCase() || '';
      const role = s.role?.toLowerCase() || '';
      return name.includes(q) || role.includes(q);
    });
  }, [searchText, solvers]);

  const getScoreColor = score => {
    if (score >= 75) return '#10a37f';
    if (score >= 50) return '#f59e0b';
    return '#ef4444';
  };

  const getLabelIcon = label => {
    if (label === 'Top Performer') return 'trophy-outline';
    if (label === 'Good') return 'speedometer-outline';
    return 'alert-circle-outline';
  };

  const renderItem = ({ item }) => {
    const perf = item.performance;
    const scoreColor = getScoreColor(perf.score);

    const activeCount =
      perf.inProgressCount +
      perf.assignedNotStartedCount +
      perf.reopenedCount;

    return (
      <TouchableOpacity
        activeOpacity={0.7}
        style={[
          styles.card,
          { backgroundColor: surfaceColor, borderColor },
        ]}
        onPress={() =>
          router.push({
            pathname: '/(main)/(tabs)/dashboard/solver-profile',
            params: { id: item.id },
          })
        }
      >
        <View style={styles.cardHeader}>
          <View style={styles.identityRow}>
            <Avatar
              uri={item.avatar}
              name={item.name}
              size="medium"
            />
            <View style={{ flex: 1 }}>
              <Text
                style={[styles.name, { color: theme.text }]}
                numberOfLines={1}
              >
                {item.name}
              </Text>
              <Text
                style={[
                  styles.skill,
                  { color: theme.textSecondary },
                ]}
              >
                Problem Solver
              </Text>
            </View>
          </View>
          <View
            style={[
              styles.scoreBadge,
              {
                borderColor: scoreColor,
                backgroundColor: scoreColor + '12',
              },
            ]}
          >
            <Text
              style={[
                styles.scoreValue,
                { color: scoreColor },
              ]}
            >
              {perf.score}%
            </Text>
          </View>
        </View>

        <View style={styles.metricsRow}>
          <View style={styles.metric}>
            <Text
              style={[styles.metricLabel, { color: theme.textSecondary }]}
            >
              Active
            </Text>
            <Text
              style={[styles.metricValue, { color: theme.text }]}
            >
              {activeCount}
            </Text>
          </View>
          <View style={styles.metric}>
            <Text
              style={[styles.metricLabel, { color: theme.textSecondary }]}
            >
              Completed
            </Text>
            <Text
              style={[styles.metricValue, { color: theme.text }]}
            >
              {perf.completedCount}
            </Text>
          </View>
          <View style={styles.metric}>
            <Text
              style={[styles.metricLabel, { color: theme.textSecondary }]}
            >
              Complaints
            </Text>
            <Text
              style={[
                styles.metricValue,
                {
                  color:
                    perf.complaintCount > 0 ? '#ef4444' : theme.text,
                },
              ]}
            >
              {perf.complaintCount}
            </Text>
          </View>
        </View>

        <View style={styles.footerRow}>
          <View style={styles.labelChip}>
            <Ionicons
              name={getLabelIcon(perf.label)}
              size={14}
              color={theme.textSecondary}
            />
            <Text
              style={[
                styles.labelText,
                { color: theme.textSecondary },
              ]}
            >
              {perf.label}
            </Text>
          </View>
          <View style={styles.subStats}>
            <Text
              style={[
                styles.subText,
                { color: theme.textSecondary },
              ]}
            >
              Completion {perf.completionRate}%
            </Text>
            <View style={styles.dot} />
            <Text
              style={[
                styles.subText,
                { color: theme.textSecondary },
              ]}
            >
              On-time {perf.onTimeRate}%
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading && solvers.length === 0) return <Loader message="Loading team performance..." fullScreen />;

  return (
    <SafeAreaView
      edges={['top']}
      style={[
        styles.container,
        { backgroundColor: isDark ? '#212121' : '#f9f9f9' },
      ]}
    >
      {/* ── UPDATED HEADER WITH BACK BUTTON ── */}
      <View
        style={[
          styles.header,
          { borderBottomColor: borderColor, backgroundColor: 'transparent' },
        ]}
      >
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7} style={styles.backButton}>
            <Ionicons name="arrow-back" size={26} color={theme.text} />
          </TouchableOpacity>
          <View>
            <Text style={[styles.headerTitle, { color: theme.text }]}>
              Team
            </Text>
            <Text
              style={[styles.headerSubtitle, { color: theme.textSecondary }]}
            >
              Performance overview
            </Text>
          </View>
        </View>
        <TouchableOpacity
          onPress={() => router.push('/(main)/profile')}
          activeOpacity={0.7}
        >
          <Avatar uri={user?.avatar} name={user?.name} size="medium" />
        </TouchableOpacity>
      </View>

      {/* SEARCH */}
      <View style={styles.searchContainer}>
        <View
          style={[
            styles.searchInput,
            { backgroundColor: inactiveBg, borderColor },
          ]}
        >
          <Ionicons
            name="search"
            size={18}
            color={theme.textSecondary}
          />
          <TextInput
            style={[styles.searchTextInput, { color: theme.text }]}
            placeholder="Search solvers..."
            placeholderTextColor={theme.textSecondary}
            value={searchText}
            onChangeText={setSearchText}
          />
          {searchText ? (
            <TouchableOpacity
              onPress={() => setSearchText('')}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons
                name="close-circle"
                size={18}
                color={theme.textSecondary}
              />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {filteredSolvers.length === 0 && !loading ? (
        <EmptyState
          icon="people-outline"
          title="No solvers found"
          message="Try adjusting your search or check your permissions."
        />
      ) : (
        <FlatList
          data={filteredSolvers}
          keyExtractor={item => item.id.toString()}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.textSecondary}
            />
          }
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
  },
  /* ── NEW STYLES ── */
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  backButton: {
    padding: 4,
    marginLeft: -4,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 4,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  searchInput: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  searchTextInput: {
    flex: 1,
    fontSize: 15,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  identityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  skill: {
    fontSize: 13,
  },
  scoreBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  scoreValue: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  metricsRow: {
    flexDirection: 'row',
    marginTop: 4,
  },
  metric: {
    flex: 1,
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 2,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  labelChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  labelText: {
    fontSize: 12,
    fontWeight: '600',
  },
  subStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  subText: {
    fontSize: 12,
    fontWeight: '500',
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    opacity: 0.5,
  },
});