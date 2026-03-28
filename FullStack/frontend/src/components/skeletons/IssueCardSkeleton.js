import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import Shimmer from '../common/Shimmer';

const IssueCardSkeleton = () => {
  const { theme } = useTheme();

  return (
    <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={styles.header}>
        <Shimmer width={60} height={20} />
        <Shimmer width={80} height={24} borderRadius={12} />
      </View>
      <Shimmer width="90%" height={18} style={{ marginBottom: 8 }} />
      <Shimmer width="70%" height={14} style={{ marginBottom: 12 }} />
      <View style={styles.footer}>
        <Shimmer width={48} height={48} borderRadius={8} />
        <Shimmer width={100} height={14} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
});

export default IssueCardSkeleton;
