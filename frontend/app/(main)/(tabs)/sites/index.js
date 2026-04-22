import React from 'react';
import { View, StyleSheet, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../../src/theme/ThemeContext';
import RoleGuard from '../../../src/components/navigation/RoleGuard';
import EmptyState from '../../../src/components/common/EmptyState';

export default function SitesTab() {
  const { theme } = useTheme();
  return (
    <RoleGuard action="view:sites">
      <SafeAreaView
        edges={['top']}
        style={[styles.safe, { backgroundColor: theme.background }]}
      >
        <ScrollView contentContainerStyle={styles.content} testID="sites-tab-placeholder">
          <EmptyState
            icon="construct-outline"
            title="Sites"
            message="Enhanced Site Management arrives in Priority 2. For now, open a site from the Dashboard → Sites card."
          />
        </ScrollView>
      </SafeAreaView>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { flexGrow: 1, paddingTop: Platform.OS === 'web' ? 32 : 0 },
});
