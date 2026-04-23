import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSelector } from 'react-redux';

import { useTheme } from '../../../src/theme/ThemeContext';
import { selectCurrentUser } from '../../../src/store/slices/authSlice';
import RoleGuard from '../../../src/components/navigation/RoleGuard';
import Avatar from '../../../src/components/common/Avatar';
import { backToDashboard } from '../../../src/utils/navigation';
import { users as mockUsers } from '../../../src/mocks/users';

/**
 * MD profile card — accessed from Dashboard → Managing Director card.
 * Shown to Supervisor (to reach their MD) and Customer's MD (to reach the company MD).
 * The chat CTA is a placeholder until Priority 3 lands the personal-chat screen.
 */
export default function MDCardRoute() {
  const { theme } = useTheme();
  const router = useRouter();
  const user = useSelector(selectCurrentUser);

  // Pick the first manager in the mock directory as the "company MD".
  const md = mockUsers.find((u) => u.role === 'manager');

  const onCall = () => {
    if (!md?.phone) return;
    const sanitized = md.phone.replace(/[^\d+]/g, '');
    Linking.openURL(`tel:${sanitized}`).catch(() => {});
  };
  const onChat = () => {
    if (!md?.id) return;
    router.push(`/chat/personal/${md.id}`);
  };

  return (
    <RoleGuard action="view:mdCard">
      <SafeAreaView edges={['top']} style={[styles.safe, { backgroundColor: theme.background }]}>
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <TouchableOpacity onPress={backToDashboard} testID="mdcard-back">
            <Ionicons name="chevron-back" size={22} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Managing Director</Text>
          <View style={{ width: 22 }} />
        </View>
        <ScrollView contentContainerStyle={styles.content} testID="md-card-screen">
          <View style={[styles.profileCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Avatar name={md?.name} uri={md?.avatar} size={88} />
            <Text style={[styles.name, { color: theme.text }]}>{md?.name || 'Unassigned'}</Text>
            <View style={[styles.roleBadge, { backgroundColor: theme.primaryLight }]}>
              <Text style={[styles.roleText, { color: theme.primary }]}>Managing Director</Text>
            </View>

            <View style={styles.rowGroup}>
              <InfoRow theme={theme} icon="mail-outline" label="Email" value={md?.email || '—'} />
              <InfoRow theme={theme} icon="call-outline" label="Phone" value={md?.phone || '—'} />
              <InfoRow theme={theme} icon="id-card-outline" label="Username" value={md?.username || '—'} />
            </View>

            <View style={styles.btnRow}>
              <TouchableOpacity
                style={[styles.secondaryBtn, { borderColor: theme.border }]}
                onPress={onCall}
                activeOpacity={0.7}
                testID="md-call-btn"
              >
                <Ionicons name="call" size={16} color={theme.text} />
                <Text style={[styles.secondaryText, { color: theme.text }]}>Call</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: theme.primary }]}
                onPress={onChat}
                activeOpacity={0.85}
                testID="md-chat-btn"
              >
                <Ionicons name="chatbubbles" size={16} color="#fff" />
                <Text style={styles.primaryText}>Message MD</Text>
              </TouchableOpacity>
            </View>
          </View>

          <Text style={[styles.footerHint, { color: theme.textSecondary }]}>
            Logged in as {user?.name} ({user?.role === 'customer_md' ? "Customer's MD" : 'Supervisor'})
          </Text>
        </ScrollView>
      </SafeAreaView>
    </RoleGuard>
  );
}

const InfoRow = ({ theme, icon, label, value }) => (
  <View style={styles.infoRow}>
    <Ionicons name={icon} size={16} color={theme.textSecondary} style={{ marginRight: 10 }} />
    <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>{label}</Text>
    <Text style={[styles.infoValue, { color: theme.text }]} numberOfLines={1}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: { fontSize: 14, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  content: { padding: 20, alignItems: 'center', gap: 16 },
  profileCard: {
    width: '100%', maxWidth: 460, alignItems: 'center', padding: 22, borderRadius: 16, borderWidth: 1,
  },
  name: { fontSize: 20, fontWeight: '700', marginTop: 12 },
  roleBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10, marginTop: 6, marginBottom: 16 },
  roleText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.3 },
  rowGroup: { width: '100%', gap: 10 },
  infoRow: { flexDirection: 'row', alignItems: 'center' },
  infoLabel: { fontSize: 12, flex: 0.4 },
  infoValue: { fontSize: 13, fontWeight: '600', flex: 0.6, textAlign: 'right' },
  btnRow: { flexDirection: 'row', gap: 10, marginTop: 18, width: '100%' },
  secondaryBtn: {
    flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    paddingVertical: 12, borderRadius: 10, borderWidth: 1, gap: 6,
  },
  secondaryText: { fontSize: 13, fontWeight: '600' },
  primaryBtn: {
    flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    paddingVertical: 12, borderRadius: 10, gap: 6,
  },
  primaryText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  footerHint: { fontSize: 11, marginTop: 8 },
});
