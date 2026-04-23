import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { useTheme } from '../../../src/theme/ThemeContext';
import RoleGuard from '../../../src/components/navigation/RoleGuard';
import Avatar from '../../../src/components/common/Avatar';
import { users as mockUsers } from '../../../src/mocks/users';
import { issues as mockIssues } from '../../../src/mocks/issues';
import { sites as mockSites } from '../../../src/mocks/sites';

/**
 * Supervisor directory (MD-only).
 * Reached from MD Dashboard → Supervisors card.
 */
export default function SupervisorsCardRoute() {
  const { theme } = useTheme();
  const router = useRouter();

  const supervisors = mockUsers
    .filter((u) => u.role === 'supervisor')
    .map((u) => {
      const handled = mockIssues.filter((i) => i.raised_by_supervisor_id === u.id);
      const active = handled.filter((i) =>
        ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'REOPENED', 'ESCALATED'].includes(i.status)
      ).length;
      const closed = handled.filter((i) => i.status === 'COMPLETED').length;
      const siteIds = u.sites || [];
      const siteNames = siteIds
        .map((sid) => mockSites.find((s) => s.id === sid)?.name)
        .filter(Boolean);
      return {
        ...u,
        issues_total: handled.length,
        active,
        closed,
        sites_label: siteNames.slice(0, 2).join(' · ') +
          (siteNames.length > 2 ? ` +${siteNames.length - 2}` : ''),
      };
    });

  return (
    <RoleGuard action="view:supervisorsCard">
      <SafeAreaView edges={['top']} style={[styles.safe, { backgroundColor: theme.background }]}>
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <TouchableOpacity onPress={() => router.back()} testID="supervisors-back">
            <Ionicons name="chevron-back" size={22} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Supervisors</Text>
          <View style={{ width: 22 }} />
        </View>
        <FlatList
          data={supervisors}
          keyExtractor={(s) => String(s.id)}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}
              activeOpacity={0.7}
              testID={`supervisor-item-${item.id}`}
              onPress={() => router.push(`/chat/personal/${item.id}`)}
            >
              <Avatar name={item.name} uri={item.avatar} size={44} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[styles.title, { color: theme.text }]}>{item.name}</Text>
                <Text style={[styles.sub, { color: theme.textSecondary }]} numberOfLines={1}>
                  {item.sites_label || 'Unassigned'}
                </Text>
                <View style={styles.metaRow}>
                  <Text style={[styles.chip, { backgroundColor: theme.warningLight, color: theme.warning }]}>
                    {item.active} active
                  </Text>
                  <Text style={[styles.chip, { backgroundColor: theme.successLight, color: theme.success }]}>
                    {item.closed} closed
                  </Text>
                </View>
              </View>
              <Ionicons name="chatbubble-ellipses-outline" size={20} color={theme.primary} />
            </TouchableOpacity>
          )}
        />
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
  metaRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  chip: { fontSize: 11, fontWeight: '700', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, overflow: 'hidden' },
});
