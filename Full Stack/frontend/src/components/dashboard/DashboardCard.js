import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';

const DashboardCard = ({ title, count, icon, color, onPress }) => {
  const { theme } = useTheme();

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.iconContainer, { backgroundColor: `${color}15` }]}>
        <Ionicons name={icon} size={24} color={color} />
      </View>
      <Text style={[styles.count, { color: theme.text }]}>{count}</Text>
      <Text style={[styles.title, { color: theme.textSecondary }]} numberOfLines={1}>
        {title}
      </Text>
    </TouchableOpacity>
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
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  count: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 4,
  },
  title: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
});

export default DashboardCard;
