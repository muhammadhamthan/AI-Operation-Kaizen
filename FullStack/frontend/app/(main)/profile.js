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
    router.replace('/onboarding');
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

  // Premium Palette matching the mockup
  const bgColor = isDark ? '#111111' : '#f9fafb';
  const surfaceColor = isDark ? '#1c1c1c' : '#ffffff';
  const borderColor = isDark ? '#2e2e2e' : '#f1f5f9';
  const iconBg = isDark ? 'rgba(255,255,255,0.05)' : '#f4f4f4';
  const redAccent = '#e11d48';
  const blueBadgeBg = isDark ? 'rgba(56,189,248,0.15)' : '#e0f2fe';
  const blueBadgeText = isDark ? '#38bdf8' : '#0284c7';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: surfaceColor }]}>
      
      {/* ── HEADER ── */}
      <View style={[styles.header, { backgroundColor: surfaceColor, borderBottomColor: borderColor, borderBottomWidth: 1 }]}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7} style={styles.backButton}>
          <Ionicons name="chevron-back" size={26} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>My Profile</Text>
        <TouchableOpacity style={styles.iconButton}>
          <Ionicons name="settings-outline" size={22} color={theme.text} />
        </TouchableOpacity>
      </View>

      <ScrollView style={[styles.content, { backgroundColor: bgColor }]} showsVerticalScrollIndicator={false}>
        
        {/* ── PROFILE IDENTITY ── */}
        <View style={[styles.profileSection, { backgroundColor: surfaceColor }]}>
          <View style={styles.avatarWrapper}>
            <Avatar uri={user?.avatar} name={user?.name} size="xlarge" />
            <View style={[styles.avatarBadge, { borderColor: surfaceColor }]} />
          </View>
          <Text style={[styles.name, { color: theme.text }]}>{user?.name}</Text>
          <View style={[styles.roleBadge, { backgroundColor: blueBadgeBg }]}>
            <Text style={[styles.roleText, { color: blueBadgeText }]}>
              {ROLE_LABELS[user?.role] || user?.role?.toUpperCase() || 'Senior Operations Manager'}
            </Text>
          </View>
          <Text style={styles.empIdText}>EMP-{user?.id || '9921'}-OPS</Text>
        </View>

        {/* ── PERFORMANCE METRICS (Styled as Assigned Sites from mockup) ── */}
        {stats.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionHeaderLeft}>
                <Ionicons name="location-outline" size={16} color={theme.textSecondary} />
                <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>PERFORMANCE METRICS</Text>
              </View>
              <TouchableOpacity>
                <Text style={styles.viewAllText}>View All</Text>
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statsScroll}>
              {stats.map((stat, index) => (
                <View key={index} style={[styles.statCardH, { backgroundColor: surfaceColor, borderColor }]}>
                  <View style={styles.statCardHTop}>
                    <Text style={[styles.statCardHLabel, { color: theme.textSecondary }]}>S-0{index + 1}</Text>
                    {index === 1 && <View style={styles.redDot} />}
                  </View>
                  <Text style={[styles.statCardHTitle, { color: theme.text }]}>{stat.label}</Text>
                  <Text style={styles.statCardHSubtitle}>{stat.value} RECORDED</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* ── PERSONNEL INFORMATION ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionHeaderLeft}>
              <Ionicons name="shield-checkmark-outline" size={16} color={theme.textSecondary} />
              <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>PERSONNEL INFORMATION</Text>
            </View>
          </View>
          <View style={[styles.infoContainer, { backgroundColor: surfaceColor, borderColor }]}>
            
            <View style={styles.infoRow}>
              <View style={[styles.infoIconCircle, { backgroundColor: blueBadgeBg }]}>
                <Ionicons name="mail-outline" size={18} color={blueBadgeText} />
              </View>
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoLabel}>Work Email</Text>
                <Text style={[styles.infoValue, { color: theme.text }]}>{user?.email || 'a.vance@kaizen-ops.ai'}</Text>
              </View>
            </View>

            <View style={[styles.separator, { backgroundColor: borderColor }]} />
            
            <View style={styles.infoRow}>
              <View style={[styles.infoIconCircle, { backgroundColor: blueBadgeBg }]}>
                <Ionicons name="call-outline" size={18} color={blueBadgeText} />
              </View>
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoLabel}>Contact Number</Text>
                <Text style={[styles.infoValue, { color: theme.text }]}>{user?.phone || '+1 (555) 012-3456'}</Text>
              </View>
            </View>

            <View style={[styles.separator, { backgroundColor: borderColor }]} />
            
            <View style={styles.infoRow}>
              <View style={[styles.infoIconCircle, { backgroundColor: blueBadgeBg }]}>
                <Ionicons name="calendar-outline" size={18} color={blueBadgeText} />
              </View>
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoLabel}>Joined Kaizen</Text>
                <Text style={[styles.infoValue, { color: theme.text }]}>Mar 2022</Text>
              </View>
            </View>

          </View>
        </View>

        {/* ── ACTIVITY FEED (Mockup Match) ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionHeaderLeft}>
              <Ionicons name="time-outline" size={16} color={theme.textSecondary} />
              <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>ACTIVITY FEED</Text>
            </View>
          </View>
          <View style={[styles.infoContainer, { backgroundColor: surfaceColor, borderColor, paddingVertical: 12 }]}>
            
            <View style={styles.timelineRow}>
              <View style={styles.timelineIconWrap}>
                <View style={[styles.timelineCircle, { borderColor }]}><Ionicons name="checkmark-circle-outline" size={14} color={theme.text} /></View>
                <View style={[styles.timelineLine, { backgroundColor: borderColor }]} />
              </View>
              <View style={styles.timelineContent}>
                <Text style={[styles.timelineText, { color: theme.text }]}>Approved Issue #4421</Text>
                <Text style={styles.timelineTime}>2h ago</Text>
                <Ionicons name="chevron-forward" size={14} color={theme.textSecondary} style={{ marginLeft: 6 }} />
              </View>
            </View>

            <View style={styles.timelineRow}>
              <View style={styles.timelineIconWrap}>
                <View style={[styles.timelineCircle, { borderColor }]}><Ionicons name="flash-outline" size={14} color={redAccent} /></View>
                <View style={[styles.timelineLine, { backgroundColor: borderColor }]} />
              </View>
              <View style={styles.timelineContent}>
                <Text style={[styles.timelineText, { color: theme.text }]}>Escalated Site S-14</Text>
                <Text style={styles.timelineTime}>5h ago</Text>
                <Ionicons name="chevron-forward" size={14} color={theme.textSecondary} style={{ marginLeft: 6 }} />
              </View>
            </View>

            <View style={[styles.timelineRow, { marginBottom: 0 }]}>
              <View style={styles.timelineIconWrap}>
                <View style={[styles.timelineCircle, { borderColor }]}><Ionicons name="time-outline" size={14} color={theme.text} /></View>
              </View>
              <View style={styles.timelineContent}>
                <Text style={[styles.timelineText, { color: theme.text }]}>Updated Profile Photo</Text>
                <Text style={styles.timelineTime}>1d ago</Text>
                <Ionicons name="chevron-forward" size={14} color={theme.textSecondary} style={{ marginLeft: 6 }} />
              </View>
            </View>

          </View>
        </View>

        {/* ── PREFERENCES (Maintained required field) ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionHeaderLeft}>
              <Ionicons name="settings-outline" size={16} color={theme.textSecondary} />
              <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>PREFERENCES</Text>
            </View>
          </View>
          <View style={[styles.infoContainer, { backgroundColor: surfaceColor, borderColor }]}>
            
            <View style={styles.infoRow}>
              <View style={[styles.infoIconCircle, { backgroundColor: isDark ? '#333' : '#f4f4f5' }]}>
                <Ionicons name={isDark ? 'moon-outline' : 'sunny-outline'} size={18} color={theme.text} />
              </View>
              <View style={[styles.infoTextContainer, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingRight: 0 }]}>
                <View>
                  <Text style={styles.infoLabel}>Appearance</Text>
                  <Text style={[styles.infoValue, { color: theme.text }]}>{isDark ? 'Dark Mode' : 'Light Mode'}</Text>
                </View>
                <Switch
                  value={isDark}
                  onValueChange={toggleTheme}
                  trackColor={{ false: '#e5e5e5', true: '#3b82f6' }}
                  thumbColor="#ffffff"
                  ios_backgroundColor="#e5e5e5"
                />
              </View>
            </View>

          </View>
        </View>

        {/* ── SIGN OUT ── */}
        <View style={styles.footerSection}>
          <TouchableOpacity
            activeOpacity={0.8}
            style={[styles.logoutButtonSolid, { backgroundColor: redAccent }]}
            onPress={handleLogout}
          >
            <Ionicons name="log-out-outline" size={20} color="#ffffff" />
            <Text style={styles.logoutTextSolid}>Sign Out from Account</Text>
          </TouchableOpacity>
          <Text style={styles.footerVersion}>AI-Operation Kaizen Enterprise v2.4.0</Text>
          <Text style={styles.footerSync}>Last synced: Today at 09:42 AM</Text>
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  iconButton: { padding: 4 },
  backButton: { padding: 4, marginLeft: -4 },
  headerTitle: { fontSize: 17, fontWeight: '700', letterSpacing: -0.3 },
  placeholder: { width: 32 },
  content: { flex: 1 },
  
  profileSection: {
    alignItems: 'center',
    paddingTop: 40,
    paddingBottom: 30,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.03)',
  },
  avatarWrapper: { position: 'relative' },
  avatarBadge: {
    position: 'absolute',
    bottom: 2,
    right: 8,
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 4,
    backgroundColor: 'transparent',
  },
  name: { fontSize: 24, fontWeight: '700', letterSpacing: -0.5, marginTop: 16, marginBottom: 8 },
  roleBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  roleText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.2 },
  empIdText: { fontSize: 10, color: '#9ca3af', marginTop: 10, fontWeight: '600', letterSpacing: 1.5 },
  
  section: { marginTop: 24, paddingHorizontal: 20 },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sectionTitle: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.0 },
  viewAllText: { fontSize: 12, color: '#3b82f6', fontWeight: '600' },
  
  statsScroll: { gap: 12, paddingRight: 20 },
  statCardH: { width: 150, padding: 16, borderRadius: 16, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.02, shadowRadius: 6, elevation: 1 },
  statCardHTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  statCardHLabel: { fontSize: 10, fontWeight: '700', color: '#60a5fa' },
  redDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#e11d48' },
  statCardHTitle: { fontSize: 14, fontWeight: '700', marginBottom: 4 },
  statCardHSubtitle: { fontSize: 9, color: '#9ca3af', fontWeight: '700', letterSpacing: 0.5 },
  
  infoContainer: { borderRadius: 16, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.02, shadowRadius: 6, elevation: 1 },
  infoRow: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  infoIconCircle: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  infoTextContainer: { flex: 1 },
  infoLabel: { fontSize: 11, color: '#9ca3af', marginBottom: 2 },
  infoValue: { fontSize: 14, fontWeight: '600' },
  separator: { height: StyleSheet.hairlineWidth, marginLeft: 66 },
  
  timelineRow: { flexDirection: 'row', paddingHorizontal: 16, marginBottom: 16 },
  timelineIconWrap: { alignItems: 'center', marginRight: 14 },
  timelineCircle: { width: 24, height: 24, borderRadius: 12, borderWidth: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff', zIndex: 2 },
  timelineLine: { width: 1, flex: 1, position: 'absolute', top: 24, bottom: -16, zIndex: 1 },
  timelineContent: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  timelineText: { flex: 1, fontSize: 13, fontWeight: '600' },
  timelineTime: { fontSize: 11, color: '#9ca3af' },

  footerSection: { marginTop: 32, paddingHorizontal: 20, alignItems: 'center' },
  logoutButtonSolid: { flexDirection: 'row', width: '100%', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 12, gap: 8, marginBottom: 16 },
  logoutTextSolid: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
  footerVersion: { fontSize: 11, color: '#9ca3af', marginBottom: 2 },
  footerSync: { fontSize: 11, color: '#9ca3af' },

  bottomPadding: { height: 60 },
});