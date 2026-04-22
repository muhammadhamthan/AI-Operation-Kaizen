import React from 'react';
import { View, StyleSheet, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../../src/theme/ThemeContext';
import RoleGuard from '../../../src/components/navigation/RoleGuard';
import EmptyState from '../../../src/components/common/EmptyState';

export default function SolversTab() {
  const { theme } = useTheme();
  return (
    <RoleGuard action="view:solvers">
      <SafeAreaView
        edges={['top']}
        style={[styles.safe, { backgroundColor: theme.background }]}
      >
        <ScrollView contentContainerStyle={styles.content} testID="solvers-tab-placeholder">
          <EmptyState
            icon="construct-outline"
            title="Problem Solvers"
            message="Solver directory and performance metrics arrive in Priority 2. For now, open a solver from the Dashboard → Solvers card."
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
