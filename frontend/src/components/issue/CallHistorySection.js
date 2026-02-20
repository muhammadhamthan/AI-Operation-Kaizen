import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import Card from '../common/Card';
import { formatTime, formatDuration } from '../../utils/formatters';

const CallHistorySection = ({ callLogs }) => {
  const { theme, isDark } = useTheme();

  if (!callLogs || callLogs.length === 0) return null;

  // Logic untouched, only swapped the icon name to look slightly sharper
  const getStatusIcon = (status) => {
    switch (status) {
      case 'ANSWERED': return 'call';
      case 'MISSED': return 'call-outline';
      default: return 'call-outline';
    }
  };

  // Logic untouched, but updated colors to the premium palette
  const getStatusColor = (status) => {
    switch (status) {
      case 'ANSWERED': return '#10a37f'; // 🚀 ChatGPT/OpenAI Green
      case 'MISSED': return '#ef4444';   // Clean Red
      default: return '#8e8ea0';         // Premium Gray
    }
  };

  return (
    <Card style={[
      styles.card, 
      { backgroundColor: isDark ? '#171717' : '#ffffff', borderColor: isDark ? '#333' : '#e5e5e5' }
    ]}>
      
      {/* ── Header ── */}
      <View style={styles.header}>
        <View style={[styles.headerIconWrapper, { backgroundColor: isDark ? '#2f2f2f' : '#f4f4f4' }]}>
          <Ionicons name="cellular-outline" size={16} color={theme.textSecondary} />
        </View>
        <Text style={[styles.title, { color: theme.text }]}>
          Automatic Call Attempts
        </Text>
      </View>
      
      {/* ── Log List ── */}
      <View style={styles.listContainer}>
        {callLogs.map((log, index) => {
          // UI Logic: Remove the bottom border for the very last item for a cleaner look
          const isLastItem = index === callLogs.length - 1;

          return (
            <View 
              key={log.id} 
              style={[
                styles.logItem, 
                !isLastItem && { 
                  borderBottomWidth: StyleSheet.hairlineWidth, 
                  borderBottomColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' 
                }
              ]}
            >
              <View style={styles.logLeft}>
                <View style={[styles.statusIcon, { backgroundColor: `${getStatusColor(log.status)}15` }]}>
                  <Ionicons name={getStatusIcon(log.status)} size={16} color={getStatusColor(log.status)} />
                </View>
                <View>
                  <Text style={[styles.attempt, { color: theme.text }]}>
                    Attempt {log.attempt_number}
                  </Text>
                  <Text style={[styles.time, { color: theme.textSecondary }]}>
                    {formatTime(log.initiated_at)}
                  </Text>
                </View>
              </View>
              
              <View style={styles.logRight}>
                <Text style={[styles.status, { color: getStatusColor(log.status) }]}>
                  {log.status === 'ANSWERED' ? 'Answered' : 'Missed'}
                </Text>
                {log.status === 'ANSWERED' && log.ended_at && log.answered_at && (
                  <Text style={[styles.duration, { color: theme.textSecondary }]}>
                    {formatDuration((new Date(log.ended_at) - new Date(log.answered_at)) / 1000)}
                  </Text>
                )}
              </View>
            </View>
          );
        })}
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginTop: 20,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    // Overriding the generic Card shadow to make it flat/modern
    ...Platform.select({
      ios: { shadowOpacity: 0 },
      android: { elevation: 0 },
    }),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  headerIconWrapper: {
    width: 28,
    height: 28,
    borderRadius: 8, // Modern rounded square
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  listContainer: {
    marginTop: 4,
  },
  logItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
  },
  logLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusIcon: {
    width: 36,
    height: 36,
    borderRadius: 10, // Squircle instead of a perfect circle
    justifyContent: 'center',
    alignItems: 'center',
  },
  attempt: {
    fontSize: 14,
    fontWeight: '600', // Bolder to match GPT typography
    letterSpacing: -0.1,
  },
  time: {
    fontSize: 12,
    marginTop: 2,
  },
  logRight: {
    alignItems: 'flex-end',
  },
  status: {
    fontSize: 13,
    fontWeight: '600',
  },
  duration: {
    fontSize: 12,
    marginTop: 4,
    fontVariant: ['tabular-nums'], // Keeps numbers aligned perfectly
  },
});

export default CallHistorySection;