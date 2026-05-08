import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';

/**
 * Compact sync-state pill used on the MD dashboard header strip.
 * Accepts the live status object from sheetSyncMockService.getSheetsStatus().
 */
export default function SyncStatusPill({ status, onPress }) {
  const { theme, isDark } = useTheme();
  const spin = useRef(new Animated.Value(0)).current;

  const state = status?.state || (status?.connected ? 'synced' : 'idle');

  useEffect(() => {
    let loop;
    if (state === 'syncing') {
      loop = Animated.loop(
        Animated.timing(spin, {
          toValue: 1,
          duration: 1100,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      );
      loop.start();
    } else {
      spin.stopAnimation();
      spin.setValue(0);
    }
    return () => loop?.stop();
  }, [state, spin]);

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  let label = 'Sheets not connected';
  let icon = 'cloud-offline-outline';
  let bg = isDark ? 'rgba(148,163,184,0.12)' : '#f1f5f9';
  let fg = theme.textSecondary;

  if (state === 'synced') {
    label = `Sheets · Synced${status?.last_synced_at ? ' · ' + timeAgo(status.last_synced_at) : ''}`;
    icon = 'checkmark-done';
    bg = isDark ? 'rgba(16,163,127,0.15)' : theme.successLight;
    fg = isDark ? '#22c55e' : theme.success;
  } else if (state === 'syncing') {
    label = 'Sheets · Syncing…';
    icon = 'sync';
    bg = isDark ? 'rgba(59,130,246,0.15)' : theme.primaryLight;
    fg = theme.primary;
  } else if (state === 'error') {
    label = 'Sheets · Sync failed';
    icon = 'warning';
    bg = isDark ? 'rgba(239,68,68,0.18)' : theme.dangerLight;
    fg = theme.danger;
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      testID="sync-status-pill"
      style={[styles.pill, { backgroundColor: bg }]}
    >
      <Animated.View style={{ transform: [{ rotate }] }}>
        <Ionicons name={icon} size={12} color={fg} />
      </Animated.View>
      <Text style={[styles.label, { color: fg }]} numberOfLines={1}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function timeAgo(iso) {
  const secs = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (secs < 60) return 'just now';
  const m = Math.floor(secs / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    maxWidth: 240,
  },
  label: { fontSize: 11, fontWeight: '700' },
});
