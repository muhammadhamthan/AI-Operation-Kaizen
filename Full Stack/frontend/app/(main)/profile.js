import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/theme/ThemeContext';
import { selectCurrentUser, logoutUser } from '../../src/store/slices/authSlice';
import Card from '../../src/components/common/Card';
import Avatar from '../../src/components/common/Avatar';
import Button from '../../src/components/common/Button';
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

  // Role-specific stats
  const getStats = () => {
    switch (user?.role) {
      case 'manager':
        return [
          { label: 'Total Issues', value: '145', icon: 'document-text' },
          { label: 'Escalations', value: '8', icon: 'arrow-up-circle' },
          { label: 'Sites Monitored', value: '5', icon: 'location' },
          { label: 'Resolution Rate', value: '87%', icon: 'analytics' },
        ];
      case 'supervisor':
        return [
          { label: 'Issues Created', value: '45', icon: 'add-circle' },
          { label: 'Pending Verifications', value: '3', icon: 'eye' },
          { label: 'Complaints Raised', value: '7', icon: 'alert-circle' },
          { label: 'My Sites', value: user?.sites?.length || '2', icon: 'business' },
        ];
      case 'problem_solver':
        return [
          { label: 'Assigned', value: '3', icon: 'clipboard' },
          { label: 'Completed Today', value: '2', icon: 'checkmark-done' },
          { label: 'Total Completed', value: '156', icon: 'trophy' },
          { label: 'Avg Time', value: '4.2 hrs', icon: 'time' },
        ];
      default:
        return [];
    }
  };

  const stats = getStats();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="close" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Profile</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Profile Info */}
        <View style={styles.profileSection}>
          <Avatar uri={user?.avatar} name={user?.name} size="xlarge" />
          <Text style={[styles.name, { color: theme.text }]}>{user?.name}</Text>
          <View style={[styles.roleBadge, { backgroundColor: `${theme.primary}15` }]}>
            <Text style={[styles.roleText, { color: theme.primary }]}>
              {ROLE_LABELS[user?.role] || user?.role}
            </Text>
          </View>
        </View>

        {/* Contact Info */}
        <Card style={styles.card}>
          <View style={styles.contactRow}>
            <Ionicons name="call-outline" size={20} color={theme.primary} />
            <Text style={[styles.contactText, { color: theme.text }]}>{user?.phone}</Text>
          </View>
          <View style={[styles.separator, { backgroundColor: theme.border }]} />
          <View style={styles.contactRow}>
            <Ionicons name="mail-outline" size={20} color={theme.primary} />
            <Text style={[styles.contactText, { color: theme.text }]}>{user?.email}</Text>
          </View>
        </Card>

        {/* Stats Grid */}
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Statistics</Text>
        <View style={styles.statsGrid}>
          {stats.map((stat, index) => (
            <View key={index} style={[styles.statCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <View style={[styles.statIconContainer, { backgroundColor: `${theme.primary}15` }]}>
                <Ionicons name={stat.icon} size={20} color={theme.primary} />
              </View>
              <Text style={[styles.statValue, { color: theme.text }]}>{stat.value}</Text>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* Theme Toggle */}
        <Card style={styles.card}>
          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <Ionicons name={isDark ? 'moon' : 'sunny'} size={22} color={theme.primary} />
              <Text style={[styles.settingText, { color: theme.text }]}>Dark Mode</Text>
            </View>
            <Switch
              value={isDark}
              onValueChange={toggleTheme}
              trackColor={{ false: '#e5e7eb', true: `${theme.primary}50` }}
              thumbColor={isDark ? theme.primary : '#ffffff'}
            />
          </View>
        </Card>

        {/* Logout Button */}
        <Button
          title="Logout"
          variant="danger"
          icon="log-out-outline"
          onPress={handleLogout}
          style={styles.logoutButton}
        />

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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  placeholder: {
    width: 32,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  profileSection: {
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 8,
  },
  name: {
    fontSize: 26,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 8,
  },
  roleBadge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  roleText: {
    fontSize: 14,
    fontWeight: '600',
  },
  card: {
    marginBottom: 16,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 4,
  },
  contactText: {
    fontSize: 15,
  },
  separator: {
    height: 1,
    marginVertical: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    width: '47%',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingText: {
    fontSize: 16,
    fontWeight: '500',
  },
  logoutButton: {
    marginTop: 8,
  },
  bottomPadding: {
    height: 32,
  },
});
