import React from 'react';
import { StyleSheet, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../../src/theme/ThemeContext';
import RoleGuard from '../../../src/components/navigation/RoleGuard';
import EmptyState from '../../../src/components/common/EmptyState';

export default function BudgetTab() {
  const { theme } = useTheme();
  return (
    <RoleGuard action="view:budget">
      <SafeAreaView
        edges={['top']}
        style={[styles.safe, { backgroundColor: theme.background }]}
      >
        <ScrollView contentContainerStyle={styles.content} testID="budget-tab-placeholder">
          <EmptyState
            icon="wallet-outline"
            title="Budget"
            message="Budget requests, multi-level approval, and burn-rate dashboards arrive in Priority 4 (Section 11). Raise requests via your MD personal chat when that lands."
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
