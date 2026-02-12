import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import Card from '../common/Card';
import StatusBadge from '../common/StatusBadge';
import { formatOverdueText, getDeadlineColor } from '../../utils/overdue';

const IssueCard = ({ issue, onPress }) => {
  const { theme } = useTheme();

  const deadlineText = formatOverdueText(issue.deadline_at, issue.status);
  const deadlineColor = getDeadlineColor(issue.deadline_at, issue.status);

  return (
    <Card onPress={onPress} style={styles.card}>
      <View style={styles.header}>
        <View style={styles.idContainer}>
          <Text style={[styles.issueId, { color: theme.primary }]}>
            #{issue.id}
          </Text>
          <StatusBadge status={issue.status} size="small" />
        </View>
        <StatusBadge status={issue.priority} type="priority" size="small" />
      </View>

      <Text style={[styles.title, { color: theme.text }]} numberOfLines={2}>
        {issue.title}
      </Text>

      <View style={styles.details}>
        <View style={styles.detailRow}>
          <Ionicons name="location-outline" size={14} color={theme.textSecondary} />
          <Text style={[styles.detailText, { color: theme.textSecondary }]} numberOfLines={1}>
            {issue.site?.name || 'Unknown Site'}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="construct-outline" size={14} color={theme.textSecondary} />
          <Text style={[styles.detailText, { color: theme.textSecondary }]}>
            {issue.issue_type}
          </Text>
        </View>
      </View>

      <View style={styles.footer}>
        {issue.beforeImage?.image_url && (
          <Image
            source={{ uri: issue.beforeImage.image_url }}
            style={styles.thumbnail}
            resizeMode="cover"
          />
        )}
        <View style={styles.deadline}>
          <Ionicons name="time-outline" size={14} color={deadlineColor} />
          <Text style={[styles.deadlineText, { color: deadlineColor }]}>
            {deadlineText}
          </Text>
        </View>
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  idContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  issueId: {
    fontSize: 16,
    fontWeight: '700',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    lineHeight: 22,
  },
  details: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailText: {
    fontSize: 13,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  thumbnail: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#e5e7eb',
  },
  deadline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  deadlineText: {
    fontSize: 13,
    fontWeight: '500',
  },
});

export default IssueCard;
