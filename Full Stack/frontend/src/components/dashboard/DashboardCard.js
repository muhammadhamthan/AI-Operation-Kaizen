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
          backgroundColor: isDark ? '#2f2f2f' : '#ffffff', 
          borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' 
        },
        style
      ]}
      onPress={onPress}
      activeOpacity={0.6}
    >
      <View style={styles.content}>
        {/* Top Row: Icon and Title */}
        <View style={styles.header}>
          <View style={[styles.iconWrapper, { backgroundColor: `${color}15` }]}>
            <Ionicons name={icon} size={18} color={color} />
          </View>
          <Text style={[styles.title, { color: theme.textSecondary }]} numberOfLines={1}>
            {title}
          </Text>
        </View>

        {/* Bottom Row: Large Count and Trend (Visual only) */}
        <View style={styles.statsRow}>
          <Text style={[styles.count, { color: theme.text }]}>{count}</Text>
          <Ionicons 
            name="arrow-forward-circle-outline" 
            size={20} 
            color={isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)'} 
          />
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    margin: 6,
    // Modern ChatGPT shadow
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.04,
        shadowRadius: 10,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  content: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20, // Spacious look
    gap: 10,
  },
  iconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 8, // Modern rounded square instead of circle
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: -0.2,
    flex: 1,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  count: {
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: -1, // Tight tracking for modern look
    lineHeight: 36,
  },
});

export default DashboardCard;