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

import { useTheme } from '../../../src/theme/ThemeContext';
import RoleGuard from '../../../src/components/navigation/RoleGuard';
import Avatar from '../../../src/components/common/Avatar';
import EmptyState from '../../../src/components/common/EmptyState';
import { backToDashboard } from '../../../src/utils/navigation';
import { getAllUsers } from '../../../src/services/mocks/adminMockService';

const ROLE_LABEL = {
  manager: 'Managing Director',
  supervisor: 'Supervisor',
  problem_solver: 'Problem Solver',
  customer_md: "Customer's MD",
};

const ROLE_COLOR = {
  manager: '#ef4444',
  supervisor: '#3b82f6',
  problem_solver: '#0ea5e9',
  customer_md: '#db2777',
};

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'supervisor', label: 'Supervisors' },
  { key: 'problem_solver', label: 'Solvers' },
  { key: 'customer_md', label: "Customer MDs" },
];

export default function TeamScreen() {
  const { theme, isDark } = useTheme();
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  const load = useCallback(async () => {
    setLoading(true);
    const list = await getAllUsers();
    setUsers(list);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Re-load whenever the screen is refocused — expo-router will remount if we route back.
  // (simple approach: call load on mount; Add Member route will pop back)

  const filtered = users.filter((u) => (filter === 'all' ? true : u.role === filter));

  return (
    <RoleGuard allowedRoles={['manager']}>
      <SafeAreaView edges={['top']} style={[styles.safe, { backgroundColor: isDark ? '#0b0f14' : '#f4f4f6' }]}>
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <TouchableOpacity onPress={backToDashboard} testID="team-back" hitSlop={10}>
            <Ionicons name="chevron-back" size={22} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Team</Text>
          <TouchableOpacity
            onPress={() => router.push('/(main)/admin/add-member')}
            testID="add-member-cta"
            hitSlop={10}
          >
            <Ionicons name="add-circle-outline" size={22} color={theme.primary} />
          </TouchableOpacity>
        </View>

        {/* Filter row */}
        <View style={styles.filterRow}>
          {FILTERS.map((f) => {
            const active = filter === f.key;
            return (
              <TouchableOpacity
                key={f.key}
                onPress={() => setFilter(f.key)}
                testID={`filter-${f.key}`}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: active ? theme.primary : theme.card,
                    borderColor: active ? theme.primary : theme.border,
                  },
                ]}
              >
                <Text style={{ color: active ? '#fff' : theme.text, fontSize: 12, fontWeight: '700' }}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={theme.textSecondary} />
          </View>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon="people-outline"
            title="No members"
            message="Tap + to add your first team member."
          />
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(u) => String(u.id)}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => (
              <View
                style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}
                testID={`team-${item.id}`}
              >
                <Avatar name={item.name} uri={item.avatar} size={40} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[styles.name, { color: theme.text }]}>{item.name}</Text>
                  <Text style={[styles.sub, { color: theme.textSecondary }]} numberOfLines={1}>
                    {item.phone}
                    {item.email ? ` · ${item.email}` : ''}
                  </Text>
                  <View style={styles.metaRow}>
                    <View style={[styles.roleTag, { backgroundColor: ROLE_COLOR[item.role] + '22' }]}>
                      <Text style={[styles.roleText, { color: ROLE_COLOR[item.role] }]}>
                        {ROLE_LABEL[item.role] || item.role}
                      </Text>
                    </View>
                    {item.role === 'customer_md' && (
                      <TouchableOpacity
                        onPress={() => router.push(`/(main)/admin/assign-sites/${item.id}`)}
                        testID={`assign-${item.id}`}
                        style={[styles.assignBtn, { borderColor: theme.border }]}
                      >
                        <Ionicons name="link-outline" size={11} color={theme.primary} />
                        <Text style={[styles.assignText, { color: theme.primary }]}>Assign sites</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </View>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: { fontSize: 14, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  filterRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 12, flexWrap: 'wrap' },
  filterChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 1 },
  list: { paddingHorizontal: 16, paddingBottom: 60, gap: 10 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, borderWidth: 1 },
  name: { fontSize: 14, fontWeight: '700' },
  sub: { fontSize: 11, marginTop: 2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6, flexWrap: 'wrap' },
  roleTag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  roleText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.3 },
  assignBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  assignText: { fontSize: 10, fontWeight: '700' },
});
