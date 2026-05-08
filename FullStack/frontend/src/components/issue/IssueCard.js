import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import StatusBadge from '../common/StatusBadge';
import Avatar from '../common/Avatar';

// Status colors based on the Visily mockup
const getStatusTheme = (status) => {
  const statusUpper = status ? status.toUpperCase() : '';
  switch (statusUpper) {
    case 'OPEN':
    case 'ESCALATED':
    case 'NOT_FIXED':
    case 'NOT FIXED':
    case 'REOPENED':
      return { bar: '#ef4444' }; // Red
    case 'FIXED':
    case 'COMPLETED':
    case 'RESOLVED_PENDING_REVIEW':
      return { bar: '#3b82f6' }; // Blue
    case 'AWAITING_REVIEW':
    case 'IN_PROGRESS':
    case 'ASSIGNED':
      return { bar: '#eab308' }; // Yellow
    default:
      return { bar: '#3b82f6' }; // Default Blue
  }
};

const IssueCard = ({ issue, onPress }) => {
  const { theme, isDark } = useTheme();

  const cardTheme = getStatusTheme(issue.status);
  const cardBg = isDark ? '#1a1a1a' : '#ffffff';
  const borderColor = isDark ? '#333333' : '#f0f0f0';

  // Simple elapsed time calculation if formatTimeElapsed isn't exact
  const getElapsed = () => {
    if (!issue.created_at) return '1h ago';
    const diffMs = new Date() - new Date(issue.created_at);
    const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHrs < 1) {
      const diffMins = Math.floor(diffMs / (1000 * 60));
      return `${diffMins}m ago`;
    }
    if (diffHrs < 24) return `${diffHrs}h ago`;
    return `${Math.floor(diffHrs / 24)}d ago`;
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={[
        styles.card,
        {
          backgroundColor: cardBg,
          borderColor: borderColor,
          borderWidth: 1,
          ...Platform.select({
            ios: {
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: isDark ? 0.2 : 0.04,
              shadowRadius: 8,
            },
            android: { elevation: isDark ? 4 : 1 },
          }),
        }
      ]}
    >
      {/* ── Left Accent Bar ── */}
      <View style={[styles.accentBar, { backgroundColor: cardTheme.bar }]} />

      <View style={styles.contentContainer}>
        {/* ── Top Section ── */}
        <View style={styles.topSection}>
          
          {/* Header Row: ID & Status */}
          <View style={styles.headerRow}>
            <Text style={styles.issueId}>
              {issue.id ? (issue.id.toString().includes('TK') || issue.id.toString().includes('KA') ? issue.id : `TK-${issue.id}`) : 'TK-0000'}
            </Text>
            <StatusBadge status={issue.status} size="small" />
          </View>

          {/* Title */}
          <Text
            style={[styles.title, { color: isDark ? '#ffffff' : '#111111' }]}
            numberOfLines={2}
          >
            {issue.title}
          </Text>

          {/* Details Row: Location & Person */}
          <View style={styles.detailsRow}>
            <View style={styles.detailItem}>
              <Ionicons name="location-outline" size={14} color="#888" />
              <Text style={styles.detailText} numberOfLines={1}>
                {issue.site_name || issue.site?.name || 'Unknown Site'}
              </Text>
            </View>
            <View style={styles.detailItem}>
              <Ionicons name="person-outline" size={14} color="#888" />
              <Text style={styles.detailText} numberOfLines={1}>
                {issue.supervisor_name || 'System'}
              </Text>
            </View>
          </View>

        </View>

        {/* ── Divider ── */}
        <View style={[styles.divider, { backgroundColor: isDark ? '#333' : '#f0f0f0' }]} />

        {/* ── Bottom Section ── */}
        <View style={styles.bottomSection}>
          <View style={styles.solverInfo}>
            <Avatar size="small" name={issue.assigned_to_name || 'Solver'} uri={null} />
            <Text style={styles.solverText}>ASSIGNED SOLVER</Text>
          </View>
          
          <View style={styles.timeInfo}>
            <Ionicons name="time-outline" size={14} color="#888" />
            <Text style={styles.timeText}>{getElapsed()}</Text>
          </View>
        </View>

      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: 16,
    borderRadius: 12,
    position: 'relative',
  },
  accentBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
  },
  contentContainer: {
    paddingLeft: 16, // Extra padding to clear the accent bar
  },
  topSection: {
    padding: 16,
    paddingLeft: 12, // adjust for global paddingLeft
    paddingBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  issueId: {
    fontSize: 12,
    fontWeight: '600',
    color: '#888888',
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
    lineHeight: 22,
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  detailText: {
    fontSize: 13,
    color: '#888888',
    fontWeight: '400',
  },
  divider: {
    height: 1,
    width: '100%',
  },
  bottomSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    paddingLeft: 12,
  },
  solverInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  solverText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#888888',
    letterSpacing: 0.5,
  },
  timeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeText: {
    fontSize: 12,
    color: '#888888',
    fontWeight: '500',
  },
});

export default IssueCard;