import React, { useEffect, useState } from 'react';
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

import { useTheme } from '../../../src/theme/ThemeContext';
import RoleGuard from '../../../src/components/navigation/RoleGuard';
import EmptyState from '../../../src/components/common/EmptyState';
import Avatar from '../../../src/components/common/Avatar';
import { backToDashboard } from '../../../src/utils/navigation';
import { fetchSolversPerformanceAPI } from '../../../src/services/api';

export default function SolversRoute() {
  const { theme } = useTheme();
  const router = useRouter();
  const [solvers, setSolvers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const res = await fetchSolversPerformanceAPI();
      if (!mounted) return;
      setSolvers(res.solvers || []);
      setLoading(false);
    })();
    return () => { mounted = false; };
  }, []);

  return (
    <RoleGuard action="view:solvers">
      <SafeAreaView edges={['top']} style={[styles.safe, { backgroundColor: theme.background }]}>
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <TouchableOpacity onPress={backToDashboard} testID="solvers-back">
            <Ionicons name="chevron-back" size={22} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Problem Solvers</Text>
          <View style={{ width: 22 }} />
        </View>
        {loading ? (
          <View style={styles.center}><ActivityIndicator color={theme.textSecondary} /></View>
        ) : solvers.length === 0 ? (
          <EmptyState icon="people-outline" title="No solvers" message="No problem solvers available." />
        ) : (
          <FlatList
            data={solvers}
            keyExtractor={(s) => String(s.id)}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}
                activeOpacity={0.7}
                testID={`solver-item-${item.id}`}
              >
                <Avatar name={item.name} uri={item.avatar_url} size={44} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>{item.name}</Text>
                  <Text style={[styles.sub, { color: theme.textSecondary }]} numberOfLines={1}>
                    {item.skill || 'General'} · {item.phone}
                  </Text>
                  <View style={styles.metaRow}>
                    <Text style={[styles.metaChip, { backgroundColor: theme.successLight, color: theme.success }]}>
                      ✓ {item.completed}
                    </Text>
                    <Text style={[styles.metaChip, { backgroundColor: theme.warningLight, color: theme.warning }]}>
                      ⏳ {item.pending}
                    </Text>
                    <Text style={[styles.metaText, { color: theme.textSecondary }]}>
                      ★ {item.rating}
                    </Text>
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
  card: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, borderWidth: 1 },
  title: { fontSize: 14, fontWeight: '700' },
  sub: { fontSize: 12, marginTop: 2 },
  metaRow: { flexDirection: 'row', marginTop: 8, gap: 8, alignItems: 'center' },
  metaChip: { fontSize: 11, fontWeight: '700', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, overflow: 'hidden' },
  metaText: { fontSize: 11, fontWeight: '600' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
