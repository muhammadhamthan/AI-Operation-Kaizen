import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
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
import { getAllSites } from '../../../src/services/mocks/adminMockService';
import { getProjectFlow } from '../../../src/services/mocks/projectFlowMockService';

/**
 * ProjectFlow Intelligence — site picker.
 * MD sees all sites; Supervisor sees only assigned sites.
 * Each tile previews execution health + tab summary; tap → /projectflow/:id.
 */
export default function ProjectFlowIndex() {
  const { theme, isDark } = useTheme();
  const router = useRouter();
  const user = useSelector(selectCurrentUser);
  const [tiles, setTiles] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    let allSites = await getAllSites();
    if (user?.role === 'supervisor') {
      const ids = user?.sites || [];
      allSites = allSites.filter((s) => ids.includes(s.id));
    }
    // Pull a lightweight bundle for each site to surface health + flags
    const tilesData = await Promise.all(
      allSites.map(async (s) => {
        const b = await getProjectFlow(s.id);
        return {
          id: s.id,
          name: s.name,
          location: s.location,
          health_score: b?.health_score ?? 0,
          health_label: b?.health_label ?? 'Pending',
          alerts_count: b?.alerts?.length ?? 0,
          weather_recalibrated: !!b?.weather?.recalibrated,
          delayed_count: (b?.materials || []).filter((m) => m.status === 'delayed').length,
        };
      })
    );
    setTiles(tilesData);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <RoleGuard
      allowedRoles={['manager', 'supervisor']}
      title="Restricted module"
      message="ProjectFlow Intelligence is available to MD and Supervisors only."
    >
      <SafeAreaView edges={['top']} style={[styles.safe, { backgroundColor: isDark ? '#0b0f14' : '#f4f4f6' }]}>
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <TouchableOpacity onPress={backToDashboard} testID="pf-index-back" hitSlop={10}>
            <Ionicons name="chevron-back" size={22} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>ProjectFlow</Text>
          <View style={{ width: 22 }} />
        </View>

        <Text style={[styles.tagline, { color: theme.textSecondary }]}>
          Choose a site to view its live execution coordination — timelines, materials, vendor
          readiness, and dependencies in one place.
        </Text>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={theme.textSecondary} />
          </View>
        ) : tiles.length === 0 ? (
          <EmptyState
            icon="git-network-outline"
            title="No sites assigned"
            message="Once an MD assigns sites to you, they'll appear here."
          />
        ) : (
          <FlatList
            data={tiles}
            keyExtractor={(t) => String(t.id)}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => <SiteTile theme={theme} isDark={isDark} item={item} router={router} />}
          />
        )}
      </SafeAreaView>
    </RoleGuard>
  );
}

const SiteTile = ({ theme, isDark, item, router }) => {
  const tone =
    item.health_label === 'On track' ? '#22c55e'
    : item.health_label === 'At risk' ? '#f59e0b'
    : '#ef4444';

  return (
    <TouchableOpacity
      onPress={() => router.push(`/(main)/projectflow/${item.id}`)}
      activeOpacity={0.85}
      testID={`pf-tile-${item.id}`}
      style={[styles.tile, { backgroundColor: theme.card, borderColor: theme.border }]}
    >
      <View style={styles.tileHead}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.tileName, { color: theme.text }]} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={[styles.tileSub, { color: theme.textSecondary }]} numberOfLines={1}>
            {item.location}
          </Text>
        </View>
        <View style={[styles.healthChip, { backgroundColor: tone + '22' }]}>
          <View style={[styles.healthDot, { backgroundColor: tone }]} />
          <Text style={[styles.healthChipText, { color: tone }]}>{item.health_label}</Text>
        </View>
      </View>

      <View style={styles.tileScoreRow}>
        <View style={{ flex: 1 }}>
          <View style={[styles.tileBarTrack, { backgroundColor: isDark ? 'rgba(148,163,184,0.18)' : '#e2e8f0' }]}>
            <View style={[styles.tileBarFill, { width: `${item.health_score}%`, backgroundColor: tone }]} />
          </View>
          <Text style={[styles.tileScoreText, { color: theme.textSecondary }]}>
            Execution health · {item.health_score}/100
          </Text>
        </View>
      </View>

      <View style={styles.tileFlags}>
        {item.alerts_count > 0 && (
          <View style={[styles.flagPill, { backgroundColor: isDark ? 'rgba(59,130,246,0.15)' : '#eff6ff' }]}>
            <Ionicons name="sparkles-outline" size={10} color={theme.primary} />
            <Text style={[styles.flagText, { color: theme.primary }]}>
              {item.alerts_count} alert{item.alerts_count === 1 ? '' : 's'}
            </Text>
          </View>
        )}
        {item.delayed_count > 0 && (
          <View style={[styles.flagPill, { backgroundColor: isDark ? 'rgba(239,68,68,0.15)' : '#fef2f2' }]}>
            <Ionicons name="alert-circle-outline" size={10} color="#ef4444" />
            <Text style={[styles.flagText, { color: '#ef4444' }]}>
              {item.delayed_count} delayed material{item.delayed_count === 1 ? '' : 's'}
            </Text>
          </View>
        )}
        {item.weather_recalibrated && (
          <View style={[styles.flagPill, { backgroundColor: isDark ? 'rgba(245,158,11,0.15)' : '#fffbeb' }]}>
            <Ionicons name="rainy-outline" size={10} color="#f59e0b" />
            <Text style={[styles.flagText, { color: '#f59e0b' }]}>Weather adjusted</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: { fontSize: 14, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  tagline: { fontSize: 12, lineHeight: 17, paddingHorizontal: 16, paddingTop: 12, fontStyle: 'italic' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 16, gap: 10, paddingBottom: 60 },
  tile: { borderWidth: 1, borderRadius: 14, padding: 14 },
  tileHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  tileName: { fontSize: 14, fontWeight: '800' },
  tileSub: { fontSize: 11, marginTop: 2 },
  healthChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  healthDot: { width: 6, height: 6, borderRadius: 3 },
  healthChipText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.3 },
  tileScoreRow: { marginTop: 12 },
  tileBarTrack: { height: 5, borderRadius: 3, overflow: 'hidden' },
  tileBarFill: { height: 5, borderRadius: 3 },
  tileScoreText: { fontSize: 10, fontWeight: '700', marginTop: 6 },
  tileFlags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  flagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  flagText: { fontSize: 10, fontWeight: '700' },
});
