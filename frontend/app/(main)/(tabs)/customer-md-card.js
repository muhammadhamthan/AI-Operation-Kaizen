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
import { sites as mockSites } from '../../../src/mocks/sites';

/**
 * Customer MD directory (MD-only).
 * Reached from MD Dashboard → Customer's MD card.
 */
export default function CustomerMDCardRoute() {
  const { theme } = useTheme();
  const router = useRouter();

  const customerMDs = mockUsers
    .filter((u) => u.role === 'customer_md')
    .map((u) => {
      const siteNames = (u.sites || [])
        .map((sid) => mockSites.find((s) => s.id === sid)?.name)
        .filter(Boolean);
      return {
        ...u,
        sites_label: siteNames.slice(0, 2).join(' · ') +
          (siteNames.length > 2 ? ` +${siteNames.length - 2}` : ''),
        sites_count: siteNames.length,
      };
    });

  return (
    <RoleGuard action="view:customerMDCard">
      <SafeAreaView edges={['top']} style={[styles.safe, { backgroundColor: theme.background }]}>
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <TouchableOpacity onPress={() => router.back()} testID="customermds-back">
            <Ionicons name="chevron-back" size={22} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Customer{'\u2019'}s MDs</Text>
          <View style={{ width: 22 }} />
        </View>
        <FlatList
          data={customerMDs}
          keyExtractor={(s) => String(s.id)}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}
              activeOpacity={0.7}
              testID={`customermd-item-${item.id}`}
              onPress={() => router.push(`/chat/personal/${item.id}`)}
            >
              <Avatar name={item.name} uri={item.avatar} size={44} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[styles.title, { color: theme.text }]}>{item.name}</Text>
                <Text style={[styles.sub, { color: theme.textSecondary }]} numberOfLines={1}>
                  {item.company || '—'}
                </Text>
                <View style={styles.metaRow}>
                  <Ionicons name="business-outline" size={12} color={theme.textSecondary} />
                  <Text style={[styles.metaText, { color: theme.textSecondary }]} numberOfLines={1}>
                    {item.sites_label || 'No sites assigned'}
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
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  metaText: { fontSize: 11, fontWeight: '600', flex: 1 },
});
