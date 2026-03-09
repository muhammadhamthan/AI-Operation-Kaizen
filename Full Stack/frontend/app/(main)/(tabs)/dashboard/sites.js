import React, { useEffect, useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
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

  const surfaceColor = isDark ? '#171717' : '#ffffff';
  const borderColor = isDark ? '#333333' : '#e5e5e5';

  const getHealthColor = health => {
    switch (health) {
      case 'Healthy':
        return '#10a37f';
      case 'Needs Attention':
        return '#f59e0b';
      case 'Critical':
        return '#ef4444';
      default:
        return theme.textSecondary;
    }
  };

  const renderItem = ({ item }) => {
    const { analytics } = item || {};
    const overdue = analytics?.overdueCount || 0;
    const complaintsCount = analytics?.complaintsCount || 0;
    const score = analytics?.score ?? 100; 

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
          <View style={styles.titleRow}>
            <Ionicons name="business-outline" size={18} color={theme.textSecondary} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.siteName, { color: theme.text }]}>{item.name}</Text>
              <Text style={[styles.siteLocation, { color: theme.textSecondary }]}>{item.location}</Text>
            </View>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: getHealthColor(analytics?.health) }}>
              {score}%
            </Text>
            {analytics?.health && (
              <View style={[styles.healthBadge, { backgroundColor: getHealthColor(analytics.health) + '22' }]}>
                <View style={[styles.healthDot, { backgroundColor: getHealthColor(analytics.health) }]} />
                <Text style={[styles.healthText, { color: getHealthColor(analytics.health) }]}>{analytics.health}</Text>
              </View>
            )}
          </View>

        </View>

        <View style={styles.metricsRow}>
          <View style={styles.metric}>
            <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>Open</Text>
            <Text style={[styles.metricValue, { color: theme.text }]}>{analytics?.openIssues ?? 0}</Text>
          </View>
          <View style={styles.metric}>
            <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>Overdue</Text>
            <Text style={[styles.metricValue, { color: overdue > 0 ? '#ef4444' : theme.text }]}>{overdue}</Text>
          </View>
          <View style={styles.metric}>
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
    <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: isDark ? '#212121' : '#f9f9f9' }]}>
      
      {/* ── UPDATED HEADER WITH BACK BUTTON ── */}
      <View style={[styles.header, { borderBottomColor: borderColor, backgroundColor: 'transparent' }]}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7} style={styles.backButton}>
            <Ionicons name="arrow-back" size={26} color={theme.text} />
          </TouchableOpacity>
          <View>
            <Text style={[styles.headerTitle, { color: theme.text }]}>Sites</Text>
            <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>
              {user?.role === 'manager' ? 'All locations' : user?.role === 'supervisor' ? 'Your locations' : 'Assigned locations'}
            </Text>
          </View>
        </View>
        <TouchableOpacity onPress={() => router.push('/(main)/profile')} activeOpacity={0.7}>
          <Avatar uri={user?.avatar} name={user?.name} size="medium" />
        </TouchableOpacity>
      </View>

      {sites.length === 0 && !loading ? (
        <EmptyState icon="business-outline" title="No sites found" message="You don't have any accessible sites yet." />
      ) : (
        <FlatList
          data={sites}
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
    borderBottomWidth: StyleSheet.hairlineWidth 
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
  headerTitle: { fontSize: 28, fontWeight: '700', letterSpacing: -0.5 },
  headerSubtitle: { fontSize: 14, fontWeight: '500', marginTop: 4 },
  listContent: { paddingHorizontal: 16, paddingVertical: 12 },
  card: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  siteName: { fontSize: 16, fontWeight: '700', letterSpacing: -0.2 },
  siteLocation: { fontSize: 13, marginTop: 2 },
  healthBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, gap: 6 },
  healthDot: { width: 6, height: 6, borderRadius: 3 },
  healthText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' },
  metricsRow: { flexDirection: 'row', marginTop: 8 },
  metric: { flex: 1 },
  metricLabel: { fontSize: 12, fontWeight: '500', marginBottom: 2 },
  metricValue: { fontSize: 18, fontWeight: '700', letterSpacing: -0.4 },
});