import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';

const NotificationBanner = ({ count, onPress, onDismiss }) => {
  const { theme } = useTheme();

  if (!count || count === 0) return null;

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: theme.primary }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.content}>
        <Ionicons name="notifications" size={20} color="#ffffff" />
        <Text style={styles.text}>
          {count} New Notification{count > 1 ? 's' : ''}
        </Text>
      </View>
      <TouchableOpacity
        style={styles.closeButton}
        onPress={(e) => {
          e.stopPropagation();
          onDismiss?.();
        }}
      >
        <Ionicons name="close" size={18} color="#ffffff" />
      </TouchableOpacity>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  text: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
  },
});

export default NotificationBanner;
