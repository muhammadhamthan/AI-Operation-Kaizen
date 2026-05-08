import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSelector } from 'react-redux';

import { useTheme } from '../../../src/theme/ThemeContext';
import { selectCurrentUser } from '../../../src/store/slices/authSlice';
import RoleGuard from '../../../src/components/navigation/RoleGuard';
import EmptyState from '../../../src/components/common/EmptyState';
import { backToDashboard } from '../../../src/utils/navigation';
import { fetchSitesAnalytics } from '../../../src/services/api';
import { getAllSites } from '../../../src/services/mocks/adminMockService';

/**
 * Sites destination screen (reached from Dashboard → Sites card).
 * Lists sites with issue counts. Customer's MD sees only their assigned sites.
 * MD can tap "+" to add a new site; any role can tap a site to view its
 * project timeline (Gantt, §17).
 */
export default function SitesRoute() {
  const { theme } = useTheme();
  const router = useRouter();
  const user = useSelector(selectCurrentUser);
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    // Merge analytics (issue counts) with admin-added sites so newly-added
    // sites show up immediately even though they have 0 analytics.
    const [analyticsRes, allSites] = await Promise.all([
      fetchSitesAnalytics(),
      getAllSites(),
    ]);
    const analytics = analyticsRes.sites || [];
    const byId = new Map(analytics.map((s) => [s.id, s]));
    let merged = allSites.map((s) => ({ ...s, ...(byId.get(s.id) || {}) }));
    if (user?.role === 'customer_md') {
      const ids = user?.sites || [];
      merged = merged.filter((s) => ids.includes(s.id));
    }
    setSites(merged);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      await load();
      if (!mounted) return;
    })();
    return () => {
      mounted = false;
    };
  }, [load]);

  return (
    <RoleGuard action="view:sites">
      <SafeAreaView edges={['top']} style={[styles.safe, { backgroundColor: theme.background }]}>
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <TouchableOpacity onPress={backToDashboard} testID="sites-back">
            <Ionicons name="chevron-back" size={22} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Sites</Text>
          {user?.role === 'manager' ? (
            <TouchableOpacity
              onPress={() => router.push('/(main)/admin/add-site')}
              testID="add-site-cta"
              hitSlop={10}
            >
              <Ionicons name="add-circle-outline" size={22} color={theme.primary} />
            </TouchableOpacity>
          ) : (
            <View style={{ width: 22 }} />
          )}
        </View>
        {loading ? (
          <View style={styles.center}><ActivityIndicator color={theme.textSecondary} /></View>
        ) : sites.length === 0 ? (
          <EmptyState icon="business-outline" title="No sites" message="No sites assigned yet." />
        ) : (
          <FlatList
            data={sites}
            keyExtractor={(s) => String(s.id)}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}
                activeOpacity={0.7}
                testID={`site-item-${item.id}`}
                onPress={() => {
                  // ProjectFlow Intelligence is MD + Supervisor only.
                  // Customer MDs tap sites only for context (no navigation in v3.0).
                  if (user?.role === 'manager' || user?.role === 'supervisor') {
                    router.push(`/(main)/projectflow/${item.id}`);
                  }
                }}
              >
                <View style={[styles.iconBox, { backgroundColor: theme.primaryLight }]}>
                  <Ionicons name="business" size={18} color={theme.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>{item.name}</Text>
                  <Text style={[styles.sub, { color: theme.textSecondary }]} numberOfLines={1}>
                    {item.location}
                  </Text>
                  <View style={styles.metaRow}>
                    <Text style={[styles.metaText, { color: theme.textSecondary }]}>
                      {item.issues_count || 0} issues · {item.active_issues || 0} active
                    </Text>
                    {(user?.role === 'manager' || user?.role === 'supervisor') && (
                      <View style={[styles.timelineTag, { backgroundColor: theme.primaryLight }]}>
                        <Ionicons name="git-network-outline" size={10} color={theme.primary} />
                        <Text style={[styles.timelineText, { color: theme.primary }]}>ProjectFlow</Text>
                      </View>
                    )}
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
              </TouchableOpacity>
            )}
          />
        )}
      </SafeAreaView>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: { fontSize: 14, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  list: { paddingVertical: 12, paddingHorizontal: 16, gap: 10, paddingBottom: 80 },
  card: {
    flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12, borderWidth: 1, gap: 12,
  },
  iconBox: {
    width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center',
  },
  title: { fontSize: 14, fontWeight: '700', letterSpacing: -0.2 },
  sub: { fontSize: 12, marginTop: 2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 8, flexWrap: 'wrap' },
  metaText: { fontSize: 11, fontWeight: '600' },
  timelineTag: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6,
  },
  timelineText: { fontSize: 10, fontWeight: '700' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
