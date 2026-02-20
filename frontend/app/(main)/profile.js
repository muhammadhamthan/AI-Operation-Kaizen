import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/theme/ThemeContext';
import { selectCurrentUser, logoutUser } from '../../src/store/slices/authSlice';
import Avatar from '../../src/components/common/Avatar';
import { ROLE_LABELS } from '../../src/utils/constants';

export default function ProfileScreen() {
  const { theme, isDark, toggleTheme } = useTheme();
  const router = useRouter();
  const dispatch = useDispatch();
  const user = useSelector(selectCurrentUser);

  const handleLogout = async () => {
    await dispatch(logoutUser());
    router.replace('/(auth)/login');
  };

  // Logic untouched
  const getStats = () => {
    switch (user?.role) {
      case 'manager':
        return [
          { label: 'Total Issues', value: '145', icon: 'document-text-outline' },
          { label: 'Escalations', value: '8', icon: 'warning-outline' },
          { label: 'Sites Monitored', value: '5', icon: 'business-outline' },
          { label: 'Resolution Rate', value: '87%', icon: 'analytics-outline' },
        ];
      case 'supervisor':
        return [
          { label: 'Issues Created', value: '45', icon: 'add-circle-outline' },
          { label: 'Pending Verifications', value: '3', icon: 'eye-outline' },
          { label: 'Complaints Raised', value: '7', icon: 'alert-circle-outline' },
          { label: 'My Sites', value: user?.sites?.length || '2', icon: 'business-outline' },
        ];
      case 'problem_solver':
        return [
          { label: 'Assigned', value: '3', icon: 'clipboard-outline' },
          { label: 'Completed Today', value: '2', icon: 'checkmark-done-outline' },
          { label: 'Total Completed', value: '156', icon: 'trophy-outline' },
          { label: 'Avg Time', value: '4.2 hrs', icon: 'time-outline' },
        ];
      default:
        return [];
    }
  };

  const stats = getStats();

  // Premium Palette
  const bgColor = isDark ? '#212121' : '#f9f9f9';
  const surfaceColor = isDark ? '#171717' : '#ffffff';
  const borderColor = isDark ? '#333333' : '#e5e5e5';
  const iconBg = isDark ? 'rgba(255,255,255,0.05)' : '#f4f4f4';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]}>
      
      {/* ── HEADER ── */}
      <View style={[styles.header, { backgroundColor: bgColor }]}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.6} style={styles.iconButton}>
          <Ionicons name="chevron-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Settings</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        
        {/* ── PROFILE IDENTITY ── */}
        <View style={styles.profileSection}>
          <View style={styles.avatarWrapper}>
            <Avatar uri={user?.avatar} name={user?.name} size="xlarge" />
            <View style={[styles.onlineIndicator, { borderColor: bgColor }]} />
          </View>
          <Text style={[styles.name, { color: theme.text }]}>{user?.name}</Text>
          <View style={[styles.roleBadge, { backgroundColor: isDark ? '#333' : '#e5e5e5' }]}>
            <Text style={[styles.roleText, { color: theme.textSecondary }]}>
              {ROLE_LABELS[user?.role] || user?.role?.toUpperCase()}
            </Text>
          </View>
        </View>

        {/* ── PERFORMANCE METRICS ── */}
        {stats.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Performance Metrics</Text>
            <View style={styles.statsGrid}>
              {stats.map((stat, index) => (
                <View key={index} style={[styles.statCard, { backgroundColor: surfaceColor, borderColor }]}>
                  <View style={[styles.statIconContainer, { backgroundColor: iconBg }]}>
                    <Ionicons name={stat.icon} size={18} color={theme.textSecondary} />
                  </View>
                  <View style={styles.statInfo}>
                    <Text style={[styles.statValue, { color: theme.text }]}>{stat.value}</Text>
                    <Text style={[styles.statLabel, { color: theme.textSecondary }]}>{stat.label}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ── ACCOUNT SETTINGS ── */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Account Details</Text>
          <View style={[styles.settingsGroup, { backgroundColor: surfaceColor, borderColor }]}>
            
            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <Ionicons name="call-outline" size={20} color={theme.textSecondary} />
                <Text style={[styles.settingText, { color: theme.text }]}>{user?.phone || 'No phone added'}</Text>
              </View>
            </View>

            <View style={[styles.separator, { backgroundColor: borderColor }]} />
            
            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <Ionicons name="mail-outline" size={20} color={theme.textSecondary} />
                <Text style={[styles.settingText, { color: theme.text }]}>{user?.email || 'No email added'}</Text>
              </View>
            </View>

          </View>
        </View>

        {/* ── PREFERENCES ── */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Preferences</Text>
          <View style={[styles.settingsGroup, { backgroundColor: surfaceColor, borderColor }]}>
            
            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <Ionicons name={isDark ? 'moon' : 'sunny'} size={20} color={theme.textSecondary} />
                <Text style={[styles.settingText, { color: theme.text }]}>Appearance</Text>
              </View>
              <View style={styles.settingRight}>
                <Text style={[styles.settingValue, { color: theme.textSecondary, marginRight: 8 }]}>
                  {isDark ? 'Dark' : 'Light'}
                </Text>
                <Switch
                  value={isDark}
                  onValueChange={toggleTheme}
                  trackColor={{ false: '#e5e5e5', true: '#10a37f' }} // OpenAI Green
                  thumbColor="#ffffff"
                  ios_backgroundColor="#e5e5e5"
                />
              </View>
            </View>

          </View>
        </View>

        {/* ── DANGER ZONE (Logout) ── */}
        <View style={styles.section}>
          <TouchableOpacity
            activeOpacity={0.7}
            style={[styles.logoutButton, { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.1)' : '#fef2f2', borderColor: isDark ? 'rgba(239, 68, 68, 0.2)' : '#fee2e2' }]}
            onPress={handleLogout}
          >
            <Ionicons name="log-out-outline" size={20} color="#ef4444" />
            <Text style={styles.logoutText}>Log Out</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  iconButton: {
    padding: 4,
    marginLeft: -4,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  placeholder: {
    width: 32,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  profileSection: {
    alignItems: 'center',
    marginBottom: 40,
    marginTop: 20,
  },
  avatarWrapper: {
    position: 'relative',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#10a37f', // Active Green
    borderWidth: 3,
  },
  name: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.5,
    marginTop: 16,
    marginBottom: 8,
  },
  roleBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8, // Modern squircle badge
  },
  roleText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 12,
    marginLeft: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  statCard: {
    width: '48%',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'column',
    alignItems: 'flex-start',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.02, shadowRadius: 4 },
      android: { elevation: 1 },
    }),
  },
  statIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8, // Squircle icon background
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statInfo: {
    width: '100%',
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.5,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  settingsGroup: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.02, shadowRadius: 4 },
      android: { elevation: 1 },
    }),
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingText: {
    fontSize: 15,
    fontWeight: '500',
  },
  settingValue: {
    fontSize: 15,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 48, // Indents separator to align with text, exactly like iOS/Native UI
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 8,
  },
  logoutText: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: '600',
  },
  bottomPadding: {
    height: 60,
  },
});