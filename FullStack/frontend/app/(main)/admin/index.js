import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { useTheme } from '../../../src/theme/ThemeContext';
import RoleGuard from '../../../src/components/navigation/RoleGuard';
import { backToDashboard } from '../../../src/utils/navigation';

/**
 * MD-only Admin Hub — single entry-point for all §12/§13/§19 admin tools.
 */
export default function AdminHubRoute() {
  const { theme, isDark } = useTheme();
  const router = useRouter();

  const items = [
    {
      id: 'team',
      title: 'Team',
      subtitle: 'View and manage users',
      icon: 'people',
      color: '#0ea5e9',
      route: '/(main)/admin/team',
    },
    {
      id: 'add-site',
      title: 'Add Site',
      subtitle: 'Register a new industrial site',
      icon: 'business',
      color: '#10a37f',
      route: '/(main)/admin/add-site',
    },
    {
      id: 'sheets',
      title: 'Google Sheets Sync',
      subtitle: 'Connect live Ops sheet',
      icon: 'cloud-done',
      color: '#3b82f6',
      route: '/(main)/admin/google-sheets',
    },
    {
      id: 'gaps',
      title: 'Backend Gaps',
      subtitle: 'Endpoints pending on AWS',
      icon: 'hammer',
      color: '#f59e0b',
      route: '/(main)/admin/backend-gaps',
    },
  ];

  return (
    <RoleGuard allowedRoles={['manager']} title="MD-only" message="Admin tools are restricted to the Managing Director.">
      <SafeAreaView edges={['top']} style={[styles.safe, { backgroundColor: isDark ? '#0b0f14' : '#f4f4f6' }]}>
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <TouchableOpacity onPress={backToDashboard} testID="admin-back" hitSlop={10}>
            <Ionicons name="chevron-back" size={22} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Admin</Text>
          <View style={{ width: 22 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={[styles.intro, { color: theme.textSecondary }]}>
            Onboard sites, users, integrations, and inspect backend readiness.
          </Text>
          <View style={styles.grid}>
            {items.map((it) => (
              <TouchableOpacity
                key={it.id}
                testID={`admin-${it.id}`}
                activeOpacity={0.85}
                onPress={() => router.push(it.route)}
                style={[styles.tile, { backgroundColor: theme.card, borderColor: theme.border }]}
              >
                <View style={[styles.iconWrap, { backgroundColor: it.color + '22' }]}>
                  <Ionicons name={it.icon} size={18} color={it.color} />
                </View>
                <Text style={[styles.tileTitle, { color: theme.text }]}>{it.title}</Text>
                <Text style={[styles.tileSub, { color: theme.textSecondary }]} numberOfLines={2}>
                  {it.subtitle}
                </Text>
                <View style={styles.tileFoot}>
                  <Text style={[styles.tileCta, { color: it.color }]}>Open</Text>
                  <Ionicons name="arrow-forward" size={12} color={it.color} />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
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
  scroll: { padding: 16, paddingBottom: 40 },
  intro: { fontSize: 13, lineHeight: 19, marginBottom: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  tile: {
    flexGrow: 1,
    flexBasis: '46%',
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    minHeight: 130,
    justifyContent: 'space-between',
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  tileTitle: { fontSize: 14, fontWeight: '800' },
  tileSub: { fontSize: 11, marginTop: 4, lineHeight: 15 },
  tileFoot: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 10 },
  tileCta: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.4 },
});
