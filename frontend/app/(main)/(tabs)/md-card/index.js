import React from 'react';
import { StyleSheet, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../../src/theme/ThemeContext';
import RoleGuard from '../../../src/components/navigation/RoleGuard';
import EmptyState from '../../../src/components/common/EmptyState';

export default function MDCardTab() {
  const { theme } = useTheme();
  return (
    <RoleGuard action="view:mdCard">
      <SafeAreaView
        edges={['top']}
        style={[styles.safe, { backgroundColor: theme.background }]}
      >
        <ScrollView contentContainerStyle={styles.content} testID="md-card-tab-placeholder">
          <EmptyState
            icon="person-circle-outline"
            title="Managing Director"
            message="MD profile + personal chat arrives in Priority 3 (Section 7). This tab becomes the entry point for Supervisor↔MD and Customer MD↔MD private chats."
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
