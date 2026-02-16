import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import Avatar from '../common/Avatar';
import { formatDateTime, formatRelativeTime } from '../../utils/formatters';
import { getUserById } from '../../mocks/users';

const IssueTimeline = ({ history }) => {
  const { theme } = useTheme();

  const getIcon = (actionType) => {
    switch (actionType) {
      case 'CREATED': return 'add-circle';
      case 'AUTO_ASSIGNED': return 'flash';
      case 'STATUS_CHANGE': return 'swap-horizontal';
      case 'FIX_UPLOADED': return 'camera';
      case 'VERIFIED': return 'checkmark-circle';
      case 'ESCALATED': return 'warning';
      case 'REOPENED': return 'refresh';
      case 'COMPLETED': return 'checkmark-done';
      default: return 'ellipse';
    }
  };

  const getColor = (actionType) => {
    switch (actionType) {
      case 'CREATED': return '#3b82f6';
      case 'AUTO_ASSIGNED': return '#8b5cf6';
      case 'FIX_UPLOADED': return '#f97316';
      case 'VERIFIED': return '#16a34a';
      case 'COMPLETED': return '#16a34a';
      case 'ESCALATED': return '#ef4444';
      case 'REOPENED': return '#f97316';
      default: return '#6b7280';
    }
  };

  return (
    <View style={styles.container}>
      {history.map((item, index) => {
        const user = item.changed_by_user_id ? getUserById(item.changed_by_user_id) : null;
        const isLast = index === history.length - 1;

        return (
          <View key={item.id} style={styles.item}>
            <View style={styles.left}>
              <View style={[styles.iconContainer, { backgroundColor: `${getColor(item.action_type)}20` }]}>
                <Ionicons name={getIcon(item.action_type)} size={16} color={getColor(item.action_type)} />
              </View>
              {!isLast && <View style={[styles.line, { backgroundColor: theme.border }]} />}
            </View>
            <View style={styles.content}>
              <View style={styles.header}>
                {user ? (
                  <Avatar uri={user.avatar} name={user.name} size="small" />
                ) : (
                  <View style={[styles.systemAvatar, { backgroundColor: theme.primary }]}>
                    <Ionicons name="hardware-chip" size={16} color="#fff" />
                  </View>
                )}
                <View style={styles.info}>
                  <Text style={[styles.userName, { color: theme.text }]}>
                    {user ? user.name : 'System'}
                  </Text>
                  <Text style={[styles.time, { color: theme.textSecondary }]}>
                    {formatRelativeTime(item.created_at)}
                  </Text>
                </View>
              </View>
              <Text style={[styles.details, { color: theme.textSecondary }]}>
                {item.details}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
  },
  item: {
    flexDirection: 'row',
    minHeight: 80,
  },
  left: {
    width: 40,
    alignItems: 'center',
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  line: {
    width: 2,
    flex: 1,
    marginTop: 4,
    marginBottom: -8,
  },
  content: {
    flex: 1,
    paddingLeft: 12,
    paddingBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  systemAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  info: {
    marginLeft: 8,
  },
  userName: {
    fontSize: 14,
    fontWeight: '600',
  },
  time: {
    fontSize: 12,
  },
  details: {
    fontSize: 14,
    lineHeight: 20,
  },
});

export default IssueTimeline;
