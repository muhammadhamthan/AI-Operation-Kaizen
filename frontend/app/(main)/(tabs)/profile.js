import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useDispatch } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../../../src/theme/ThemeContext';
import useRole from '../../../src/hooks/useRole';
import { logoutUser } from '../../../src/store/slices/authSlice';
import { ROLE_LABELS } from '../../../src/utils/roles';
import Button from '../../../src/components/common/Button';

/**
 * Profile tab (Priority 1 placeholder).
 *
 * Shows who is logged in, their role label, a link to the full profile modal
 * (existing route `/(main)/profile`), and a logout button. Replaces nothing —
 * the original modal at `app/(main)/profile.js` continues to work for any
 * existing caller.
 */
export default function ProfileTab() {
  const { theme, isDark, toggleTheme } = useTheme();
  const router = useRouter();
  const dispatch = useDispatch();
  const { user, role, isPS, isSupervisor, isMD, isCustomerMD } = useRole();

  const roleLabel = ROLE_LABELS[role] || role || 'Unknown';

  const onLogout = async () => {
    try {
      await dispatch(logoutUser());
      router.replace('/(auth)/login');
    } catch (e) {
      // logout is best-effort; Redux state resets regardless
    }
  };

  return (
    <SafeAreaView
      edges={['top']}
      style={[styles.safe, { backgroundColor: theme.background }]}
    >
      <ScrollView contentContainerStyle={styles.content} testID="profile-tab">
        <View style={[styles.avatar, { backgroundColor: theme.primaryLight }]}>
          <Ionicons name="person" size={40} color={theme.primary} />
        </View>

        <Text style={[styles.name, { color: theme.text }]} testID="profile-name">
          {user?.name || 'Guest'}
        </Text>

        <View style={[styles.roleBadge, { backgroundColor: theme.primaryLight }]}>
          <Text style={[styles.roleText, { color: theme.primary }]} testID="profile-role-label">
            {roleLabel}
          </Text>
        </View>

        <View style={[styles.infoCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <InfoRow
            theme={theme}
            icon="mail-outline"
            label="Email"
            value={user?.email || '—'}
          />
          <InfoRow
            theme={theme}
            icon="call-outline"
            label="Phone"
            value={user?.phone || '—'}
          />
          <InfoRow
            theme={theme}
            icon="id-card-outline"
            label="Username"
            value={user?.username || '—'}
          />
        </View>

        <TouchableOpacity
          style={[styles.row, { backgroundColor: theme.card, borderColor: theme.border }]}
          onPress={toggleTheme}
          testID="profile-theme-toggle"
          activeOpacity={0.7}
        >
          <Ionicons
            name={isDark ? 'sunny-outline' : 'moon-outline'}
            size={20}
            color={theme.text}
          />
          <Text style={[styles.rowText, { color: theme.text }]}>
            {isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          </Text>
          <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.row, { backgroundColor: theme.card, borderColor: theme.border }]}
          onPress={() => router.push('/(main)/profile')}
          testID="profile-open-full"
          activeOpacity={0.7}
        >
          <Ionicons name="person-circle-outline" size={20} color={theme.text} />
          <Text style={[styles.rowText, { color: theme.text }]}>Full Profile</Text>
          <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
        </TouchableOpacity>

        <Button
          title="Log Out"
          onPress={onLogout}
          variant="danger"
          fullWidth
          style={styles.logout}
          testID="profile-logout"
        />

        <Text style={[styles.footer, { color: theme.textSecondary }]}>
          Role view:{' '}
          {isPS && 'Problem Solver'}
          {isSupervisor && 'Supervisor'}
          {isMD && 'Managing Director'}
          {isCustomerMD && "Customer's MD"}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const InfoRow = ({ theme, icon, label, value }) => (
  <View style={styles.infoRow}>
    <Ionicons name={icon} size={18} color={theme.textSecondary} style={{ marginRight: 12 }} />
    <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>{label}</Text>
    <Text style={[styles.infoValue, { color: theme.text }]} numberOfLines={1}>
      {value}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: {
    padding: 24,
    alignItems: 'center',
    paddingTop: Platform.OS === 'web' ? 32 : 16,
    paddingBottom: 48,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  name: { fontSize: 22, fontWeight: '700', marginBottom: 6 },
  roleBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 24,
  },
  roleText: { fontSize: 12, fontWeight: '700', letterSpacing: 0.4 },
  infoCard: {
    width: '100%',
    borderRadius: 12,
    borderWidth: 1,
    padding: 4,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  infoLabel: { fontSize: 13, flex: 0.4 },
  infoValue: { fontSize: 13, fontWeight: '600', flex: 0.6, textAlign: 'right' },
  row: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  rowText: { flex: 1, fontSize: 15, marginLeft: 12, fontWeight: '500' },
  logout: { marginTop: 8, width: '100%' },
  footer: { fontSize: 11, marginTop: 24, letterSpacing: 0.5 },
});
