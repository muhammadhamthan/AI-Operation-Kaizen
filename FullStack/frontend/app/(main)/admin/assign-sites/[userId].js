import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';

import { useTheme } from '../../../../src/theme/ThemeContext';
import RoleGuard from '../../../../src/components/navigation/RoleGuard';
import Avatar from '../../../../src/components/common/Avatar';
import {
  getAllSites,
  getAllUsers,
  getCustomerMdSites,
  setCustomerMdSites,
} from '../../../../src/services/mocks/adminMockService';

/**
 * Assign sites to a Customer MD (MD-only).
 * Route: /(main)/admin/assign-sites/[userId]
 */
export default function AssignSitesScreen() {
  const { theme, isDark } = useTheme();
  const router = useRouter();
  const { userId } = useLocalSearchParams();
  const uid = parseInt(userId, 10);

  const [user, setUser] = useState(null);
  const [sites, setSites] = useState([]);
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [allUsers, allSites, current] = await Promise.all([
      getAllUsers(),
      getAllSites(),
      getCustomerMdSites(uid),
    ]);
    setUser(allUsers.find((u) => u.id === uid));
    setSites(allSites);
    setSelected(current);
    setLoading(false);
  }, [uid]);

  useEffect(() => {
    load();
  }, [load]);

  const toggle = (sid) => {
    setSelected((prev) => (prev.includes(sid) ? prev.filter((x) => x !== sid) : [...prev, sid]));
  };

  const onSave = async () => {
    setSaving(true);
    const res = await setCustomerMdSites(uid, selected);
    setSaving(false);
    if (res.success) {
      Alert.alert(
        'Sites assigned',
        `${user?.name} now has dashboard access to ${res.sites.length} site(s).`,
        [{ text: 'OK', onPress: () => router.back() }]
      );
    }
  };

  return (
    <RoleGuard allowedRoles={['manager']}>
      <SafeAreaView edges={['top']} style={[styles.safe, { backgroundColor: isDark ? '#0b0f14' : '#f4f4f6' }]}>
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <TouchableOpacity onPress={() => router.back()} testID="assign-back" hitSlop={10}>
            <Ionicons name="chevron-back" size={22} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Assign Sites</Text>
          <View style={{ width: 22 }} />
        </View>

        {loading || !user ? (
          <View style={styles.center}>
            <ActivityIndicator color={theme.textSecondary} />
          </View>
        ) : (
          <>
            <View style={[styles.userCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Avatar name={user.name} uri={user.avatar} size={40} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[styles.userName, { color: theme.text }]}>{user.name}</Text>
                <Text style={[styles.userSub, { color: theme.textSecondary }]}>
                  {user.company || "Customer's MD"} · {selected.length} selected
                </Text>
              </View>
            </View>

            <ScrollView contentContainerStyle={styles.list}>
              {sites.map((s) => {
                const on = selected.includes(s.id);
                return (
                  <TouchableOpacity
                    key={s.id}
                    onPress={() => toggle(s.id)}
                    activeOpacity={0.8}
                    testID={`assign-site-${s.id}`}
                    style={[
                      styles.row,
                      {
                        backgroundColor: on
                          ? (isDark ? 'rgba(59,130,246,0.12)' : '#eff6ff')
                          : theme.card,
                        borderColor: on ? theme.primary : theme.border,
                      },
                    ]}
                  >
                    <View style={styles.rowLeft}>
                      <View
                        style={[
                          styles.check,
                          { borderColor: on ? theme.primary : theme.border, backgroundColor: on ? theme.primary : 'transparent' },
                        ]}
                      >
                        {on && <Ionicons name="checkmark" size={12} color="#fff" />}
                      </View>
                      <View>
                        <Text style={[styles.rowTitle, { color: theme.text }]}>{s.name}</Text>
                        <Text style={[styles.rowSub, { color: theme.textSecondary }]} numberOfLines={1}>
                          {s.location}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
              <View style={{ height: 80 }} />
            </ScrollView>

            <View style={[styles.footer, { backgroundColor: isDark ? '#0b0f14' : '#f4f4f6', borderTopColor: theme.border }]}>
              <TouchableOpacity
                onPress={onSave}
                disabled={saving}
                testID="save-assign"
                style={[styles.saveBtn, { backgroundColor: theme.primary, opacity: saving ? 0.7 : 1 }]}
                activeOpacity={0.85}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.saveText}>
                    Save ({selected.length} site{selected.length === 1 ? '' : 's'})
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </>
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
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  userName: { fontSize: 14, fontWeight: '700' },
  userSub: { fontSize: 11, marginTop: 2 },
  list: { paddingHorizontal: 16, gap: 10 },
  row: { padding: 14, borderRadius: 12, borderWidth: 1 },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  check: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rowTitle: { fontSize: 14, fontWeight: '700' },
  rowSub: { fontSize: 11, marginTop: 2 },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  saveBtn: { paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  saveText: { color: '#fff', fontSize: 14, fontWeight: '800' },
});
