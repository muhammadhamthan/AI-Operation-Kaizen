import React from 'react';
import { StyleSheet, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../../src/theme/ThemeContext';
import RoleGuard from '../../../src/components/navigation/RoleGuard';
import EmptyState from '../../../src/components/common/EmptyState';

export default function CustomerMDCardTab() {
  const { theme } = useTheme();
  return (
    <RoleGuard action="view:customerMDCard">
      <SafeAreaView
        edges={['top']}
        style={[styles.safe, { backgroundColor: theme.background }]}
      >
        <ScrollView contentContainerStyle={styles.content} testID="customer-md-card-tab-placeholder">
          <EmptyState
            icon="business-outline"
            title="Customer's MDs"
            message="Customer MD directory and MD↔Customer MD personal chat arrive in Priority 3 (Section 8)."
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
