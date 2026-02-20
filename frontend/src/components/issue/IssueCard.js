import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import StatusBadge from '../common/StatusBadge';
import { formatOverdueText, getDeadlineColor } from '../../utils/overdue';

const IssueCard = ({ issue, onPress }) => {
  const { theme, isDark } = useTheme();

  const deadlineText = formatOverdueText(issue.deadline_at, issue.status);
  const deadlineColor = getDeadlineColor(issue.deadline_at, issue.status);

  // Premium colors based on theme
  const cardBg = isDark ? '#171717' : '#ffffff';
  const borderColor = isDark ? '#333' : '#e5e5e5';
  const dividerColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[styles.card, { backgroundColor: cardBg, borderColor }]}
    >
      {/* ── Header: ID & Badges ── */}
      <View style={styles.header}>
        <View style={styles.idContainer}>
          <Text style={[styles.issueId, { color: theme.textSecondary }]}>
            #{issue.id}
          </Text>
          <StatusBadge status={issue.status} size="small" />
        </View>
        <StatusBadge status={issue.priority} type="priority" size="small" />
      </View>

      {/* ── Body: Title, Meta & Thumbnail ── */}
      <View style={styles.body}>
        <View style={styles.bodyLeft}>
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
            
            {/* Elegant dot separator */}
            <View style={[styles.dot, { backgroundColor: theme.textSecondary }]} />
            
            <View style={styles.detailRow}>
              <Ionicons name="construct-outline" size={14} color={theme.textSecondary} />
              <Text style={[styles.detailText, { color: theme.textSecondary }]} numberOfLines={1}>
                {issue.issue_type}
              </Text>
            </View>
          </View>
        </View>

        {/* Thumbnail integrated into the body row for a cleaner layout */}
        {issue.beforeImage?.image_url && (
          <View style={styles.thumbnailWrapper}>
            <Image
              source={{ uri: issue.beforeImage.image_url }}
              style={[styles.thumbnail, { borderColor: dividerColor }]}
              resizeMode="cover"
            />
          </View>
        )}
      </View>

      {/* ── Footer: Deadline & Action Arrow ── */}
      <View style={[styles.footer, { borderTopColor: dividerColor }]}>
        <View style={styles.deadline}>
          <Ionicons name="time-outline" size={15} color={deadlineColor} />
          <Text style={[styles.deadlineText, { color: deadlineColor }]}>
            {deadlineText}
          </Text>
        </View>
        <Ionicons 
          name="arrow-forward" 
          size={16} 
          color={theme.textSecondary} 
          style={{ opacity: 0.5 }} 
        />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: 12,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    // Replaced heavy shadow with a flat, modern UI aesthetic
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 8 },
      android: { elevation: 1 },
    }),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  idContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  issueId: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  body: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 16,
  },
  bodyLeft: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
    lineHeight: 22,
    letterSpacing: -0.2,
  },
  details: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailText: {
    fontSize: 13,
    fontWeight: '500',
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    opacity: 0.4,
  },
  thumbnailWrapper: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  thumbnail: {
    width: 60,
    height: 60,
    borderRadius: 12,
    borderWidth: 1,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    marginTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth, // Ultra-thin, premium border
  },
  deadline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  deadlineText: {
    fontSize: 13,
    fontWeight: '600',
  },
});

export default IssueCard;