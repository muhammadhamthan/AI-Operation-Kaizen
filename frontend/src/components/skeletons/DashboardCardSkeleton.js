import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import Shimmer from '../common/Shimmer';

const DashboardCardSkeleton = () => {
  const { theme } = useTheme();

  return (
    <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <Shimmer width={48} height={48} borderRadius={24} style={{ marginBottom: 12 }} />
      <Shimmer width={50} height={28} style={{ marginBottom: 4 }} />
      <Shimmer width={70} height={14} />
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    minWidth: '45%',
    marginHorizontal: 4,
    marginVertical: 4,
  },
});

export default DashboardCardSkeleton;
