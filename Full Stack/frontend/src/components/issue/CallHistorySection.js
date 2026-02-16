import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import Card from '../common/Card';
import { formatTime, formatDuration } from '../../utils/formatters';

const CallHistorySection = ({ callLogs }) => {
  const { theme } = useTheme();

  if (!callLogs || callLogs.length === 0) return null;

  const getStatusIcon = (status) => {
    switch (status) {
      case 'ANSWERED': return 'call';
      case 'MISSED': return 'call-outline';
      default: return 'call-outline';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'ANSWERED': return '#16a34a';
      case 'MISSED': return '#ef4444';
      default: return '#6b7280';
    }
  };

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <Ionicons name="call" size={20} color={theme.primary} />
        <Text style={[styles.title, { color: theme.text }]}>
          Automatic Call Attempts
        </Text>
      </View>
      
      {callLogs.map((log) => (
        <View key={log.id} style={[styles.logItem, { borderBottomColor: theme.border }]}>
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
      ))}
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginTop: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
  },
  logItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  logLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  attempt: {
    fontSize: 14,
    fontWeight: '500',
  },
  time: {
    fontSize: 12,
    marginTop: 2,
  },
  logRight: {
    alignItems: 'flex-end',
  },
  status: {
    fontSize: 14,
    fontWeight: '600',
  },
  duration: {
    fontSize: 12,
    marginTop: 2,
  },
});

export default CallHistorySection;
