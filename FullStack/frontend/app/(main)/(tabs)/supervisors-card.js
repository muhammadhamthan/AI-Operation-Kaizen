import React from 'react';
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
import { backToDashboard } from '../../../src/utils/navigation';
import { fetchSupervisors } from '../../../src/services/api';

// For enrichment when using mock
import { issues as mockIssues } from '../../../src/mocks/issues';
import { sites as mockSites } from '../../../src/mocks/sites';

/**
 * Supervisor directory (MD-only).
 */
export default function SupervisorsCardRoute() {
  const { theme, isDark } = useTheme();
  const router = useRouter();

  const [supervisors, setSupervisors] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const loadData = async () => {
      try {
        const res = await fetchSupervisors();
        if (res.success && Array.isArray(res.supervisors)) {
          // Enrich data (works for both backend and mock)
          const enriched = res.supervisors.map(u => {
            // If backend already provided counts, use them. Otherwise calculate from mock.
            if (u.active_issues_count !== undefined) return u;

            const handled = mockIssues.filter(i => i.raised_by_supervisor_id === u.id);
            const active = handled.filter(i => ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'REOPENED', 'ESCALATED'].includes(i.status)).length;
            const closed = handled.filter(i => i.status === 'COMPLETED').length;
            const escalated = handled.filter(i => i.status === 'ESCALATED').length;
            
            const siteIds = u.sites || [];
            const siteObjs = Array.isArray(siteIds) ? siteIds.map(sid => typeof sid === 'object' ? sid : mockSites.find(s => s.id === sid)).filter(Boolean) : [];
            
            return {
              ...u,
              active_issues_count: active,
              closed_issues_count: closed,
              escalated_issues_count: escalated,
              sites: siteObjs
            };
          });
          setSupervisors(enriched);
        }
      } catch (err) {
        console.error('Error loading supervisors:', err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <RoleGuard action="view:supervisorsCard">
      <SafeAreaView edges={['top']} style={[styles.safe, { backgroundColor: theme.background }]}>
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <TouchableOpacity onPress={backToDashboard} testID="supervisors-back">
            <Ionicons name="chevron-back" size={22} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Supervisors</Text>
          <View style={{ width: 22 }} />
        </View>
        <FlatList
          data={supervisors}
          keyExtractor={(s) => String(s.id)}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => {
            const rawSites = item.sites;
            const sitesArr = Array.isArray(rawSites) ? rawSites : [];
            const siteNames = sitesArr.map(s => s?.name).filter(Boolean);
            
            const sitesLabel = siteNames.length > 0 
              ? (siteNames.slice(0, 2).join(' · ') + (siteNames.length > 2 ? ` +${siteNames.length - 2}` : ''))
              : '';

            return (
              <TouchableOpacity
                style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}
                activeOpacity={0.7}
                onPress={() => router.push(`/supervisors/${item.id}`)}
              >
                <Avatar name={item.name} uri={item.avatar_url || item.avatar} size={50} />
                <View style={{ flex: 1, marginLeft: 14 }}>
                  <View style={styles.nameRow}>
                    <Text style={[styles.title, { color: theme.text }]}>{item.name}</Text>
                  </View>
                  


                  {siteNames.length > 0 && (
                    <View style={styles.siteRow}>
                      <Ionicons name="business-outline" size={12} color={theme.primary} />
                      <Text style={[styles.sub, { color: theme.textSecondary }]} numberOfLines={1}>
                        {sitesLabel}
                      </Text>
                    </View>
                  )}

                  <View style={styles.metaRow}>
                    <View style={[styles.badge, { backgroundColor: theme.warningLight }]}>
                      <Text style={[styles.badgeText, { color: theme.warning }]}>{item.active_issues_count || 0} active</Text>
                    </View>
                    <View style={[styles.badge, { backgroundColor: theme.successLight }]}>
                      <Text style={[styles.badgeText, { color: theme.success }]}>{item.closed_issues_count || 0} closed</Text>
                    </View>
                    {item.escalated_issues_count > 0 && (
                      <View style={[styles.badge, { backgroundColor: '#fee2e2' }]}>
                        <Text style={[styles.badgeText, { color: '#ef4444' }]}>{item.escalated_issues_count} escalated</Text>
                      </View>
                    )}
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
              </TouchableOpacity>
            );
          }}
        />
      </SafeAreaView>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  headerTitle: { fontSize: 14, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  list: { paddingVertical: 12, paddingHorizontal: 16, gap: 12, paddingBottom: 80 },
  card: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 16, borderWidth: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: { fontSize: 16, fontWeight: '700' },
  onlineDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#10b981' },
  contactRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  contactText: { fontSize: 12, fontWeight: '500' },
  siteRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  sub: { fontSize: 12, opacity: 0.8 },
  metaRow: { flexDirection: 'row', gap: 6, marginTop: 10, flexWrap: 'wrap' },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeText: { fontSize: 10, fontWeight: '700' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
