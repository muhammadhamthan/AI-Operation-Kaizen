import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';

const DashboardCard = ({ title, count, icon, color, onPress, style }) => {
  const { theme, isDark } = useTheme();

  return (
    <TouchableOpacity
      style={[
        styles.card,
        { 
          backgroundColor: isDark ? '#171717' : '#ffffff', 
          borderColor: isDark ? '#2a2a2a' : '#e2e8f0',
        },
        style
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <View style={[styles.iconWrapper, { backgroundColor: isDark ? '#262626' : '#ffffff', borderColor: isDark ? '#2a2a2a' : '#e2e8f0', borderWidth: 1 }]}>
          <Ionicons name={icon} size={18} color={color} />
        </View>
        <Ionicons name="arrow-forward" size={16} color={isDark ? '#475569' : '#94a3b8'} />
      </View>

      <View style={styles.body}>
        {count !== null && count !== undefined && (
          <Text style={[styles.count, { color: theme.text }]}>
            {count.toString().padStart(2, '0')}
          </Text>
        )}
        <Text style={[styles.title, { color: theme.textSecondary }]} numberOfLines={1}>
          {title}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  iconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  body: {
    gap: 4,
  },
  count: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -1,
    lineHeight: 36,
  },
  title: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});

export default DashboardCard;