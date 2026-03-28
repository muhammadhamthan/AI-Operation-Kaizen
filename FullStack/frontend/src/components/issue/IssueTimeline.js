import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import Avatar from '../common/Avatar';
import { formatDateTime, formatRelativeTime } from '../../utils/formatters';
import { getUserById } from '../../mocks/users';

const IssueTimeline = ({ history }) => {
  const { theme, isDark } = useTheme();

  // Logic untouched
  const getIcon = (actionType) => {
    switch (actionType) {
      case 'CREATED': return 'add';
      case 'AUTO_ASSIGNED': return 'flash-outline';
      case 'STATUS_CHANGE': return 'swap-horizontal';
      case 'FIX_UPLOADED': return 'camera-outline';
      case 'VERIFIED': return 'checkmark';
      case 'ESCALATED': return 'warning-outline';
      case 'REOPENED': return 'refresh-outline';
      case 'COMPLETED': return 'checkmark-done';
      default: return 'ellipse';
    }
  };

  // Upgraded to premium palette
  const getColor = (actionType) => {
    switch (actionType) {
      case 'CREATED': return '#3b82f6';
      case 'AUTO_ASSIGNED': return '#8b5cf6';
      case 'FIX_UPLOADED': return '#f59e0b';
      case 'VERIFIED': return '#10a37f'; // 🚀 OpenAI Green
      case 'COMPLETED': return '#10a37f'; // 🚀 OpenAI Green
      case 'ESCALATED': return '#ef4444';
      case 'REOPENED': return '#f97316';
      default: return '#8e8ea0';
    }
  };

  return (
    <View style={styles.container}>
      {history.map((item, index) => {
        const user = item.changed_by_user_id ? getUserById(item.changed_by_user_id) : null;
        const isLast = index === history.length - 1;

        return (
          <View key={item.id} style={styles.item}>
            
            {/* ── Left Timeline Track ── */}
            <View style={styles.left}>
              <View style={[styles.iconContainer, { backgroundColor: `${getColor(item.action_type)}15` }]}>
                <Ionicons name={getIcon(item.action_type)} size={14} color={getColor(item.action_type)} />
              </View>
              {!isLast && <View style={[styles.line, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }]} />}
            </View>

            {/* ── Right Content Area ── */}
            <View style={styles.content}>
              
              {/* Header Row */}
              <View style={styles.header}>
                <View style={styles.headerLeft}>
                  {user ? (
                    <Avatar uri={user.avatar} name={user.name} size="small" />
                  ) : (
                    <View style={[styles.systemAvatar, { backgroundColor: isDark ? '#2f2f2f' : '#f0f0f0' }]}>
                      <Ionicons name="hardware-chip" size={14} color={theme.textSecondary} />
                    </View>
                  )}
                  <Text style={[styles.userName, { color: theme.text }]}>
                    {user ? user.name : 'System AI'}
                  </Text>
                </View>
                
                {/* Time moved to the right for a cleaner layout */}
                <Text style={[styles.time, { color: theme.textSecondary }]}>
                  {formatRelativeTime(item.created_at)}
                </Text>
              </View>

              {/* Details Text */}
              <View style={[styles.detailsBox, { backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : '#fcfcfc', borderColor: isDark ? '#333' : '#f0f0f0' }]}>
                <Text style={[styles.details, { color: theme.textSecondary }]}>
                  {item.details}
                </Text>
              </View>

            </View>
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 12,
  },
  item: {
    flexDirection: 'row',
  },
  left: {
    width: 32,
    alignItems: 'center',
    marginRight: 12,
  },
  iconContainer: {
    width: 26, // Smaller, more refined node
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4, // Align with text
  },
  line: {
    width: 1, // Ultra-thin thread
    flex: 1,
    marginTop: 6,
    marginBottom: -4,
  },
  content: {
    flex: 1,
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between', // Pushes time to the right
    marginBottom: 8,
    marginTop: 6, // Aligns header with the timeline node
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  systemAvatar: {
    width: 28,
    height: 28,
    borderRadius: 8, // Modern Squircle shape
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(128,128,128,0.2)',
  },
  userName: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  time: {
    fontSize: 12,
    fontWeight: '500',
  },
  detailsBox: {
    marginTop: 4,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  details: {
    fontSize: 14,
    lineHeight: 22,
    letterSpacing: -0.1,
  },
});

export default IssueTimeline;