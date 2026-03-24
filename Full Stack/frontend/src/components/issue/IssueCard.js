import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import StatusBadge from '../common/StatusBadge';
import { formatOverdueText, getDeadlineColor } from '../../utils/overdue';

// ── BOLD PROFESSIONAL STATUS PALETTE ──
const getStatusTheme = (status, isDark) => {
  const themes = {
    OPEN: { base: '#3b82f6' },                     // Blue
    ASSIGNED: { base: '#8b5cf6' },                 // Purple
    IN_PROGRESS: { base: '#eab308' },              // Yellow/Amber
    RESOLVED_PENDING_REVIEW: { base: '#f97316' },  // Orange
    COMPLETED: { base: '#10a37f' },                // Green
    REOPENED: { base: '#ef4444' },                 // Red
    ESCALATED: { base: '#dc2626' },                // Darker Red
  };

  const selected = themes[status] || { base: '#8e8ea0' }; // Gray fallback
  const baseColor = selected.base;

  return {
    accent: baseColor,
    // Unified, obvious background tint for the entire card (approx 10-15% opacity)
    bgBody: isDark ? `${baseColor}20` : `${baseColor}15`, 
    // Distinct, color-matched borders
    border: isDark ? `${baseColor}40` : `${baseColor}35`,
    // Deeper tint for inner elements like the status pill
    pillBg: isDark ? `${baseColor}30` : `${baseColor}25`,
  };
};

const IssueCard = ({ issue, onPress }) => {
  const { theme, isDark } = useTheme();

  const deadlineText = formatOverdueText(issue.deadline_at, issue.status);
  const deadlineColor = getDeadlineColor(issue.deadline_at, issue.status);
  const cardTheme = getStatusTheme(issue.status, isDark);

  // Format track_status (e.g., "awaiting_solver" -> "Awaiting Solver")
  const formatTrackStatus = (statusStr) => {
    if (!statusStr) return '';
    return statusStr.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  // Safely extract the first image if the array exists
  const thumbnailUri = issue.images && issue.images.length > 0 ? issue.images[0].image_url : null;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={[
        styles.card, 
        { 
          backgroundColor: cardTheme.bgBody, 
          borderColor: cardTheme.border,
          borderLeftColor: cardTheme.accent,
        }
      ]}
    >
      <View style={styles.contentContainer}>
        {/* ── Header: ID & Badges ── */}
        <View style={styles.header}>
          <View style={styles.idContainer}>
            <Text style={[styles.issueId, { color: theme.textSecondary }]}>
              #{issue.id}
            </Text>
            <StatusBadge status={issue.status} size="small" />
            <StatusBadge status={issue.priority} type="priority" size="small" />
          </View>
        </View>

        {/* ── Body: Title, Meta & Thumbnail ── */}
        <View style={styles.body}>
          <View style={styles.bodyLeft}>
            <Text style={[styles.title, { color: theme.text }]} numberOfLines={2}>
              {issue.title}
            </Text>
            
            <View style={styles.details}>
              {/* Site Name */}
              <View style={styles.detailRow}>
                <Ionicons name="location" size={14} color={theme.textSecondary} />
                <Text style={[styles.detailText, { color: theme.textSecondary }]} numberOfLines={1}>
                  {issue.site_name || 'Unknown Site'}
                </Text>
              </View>

              <View style={[styles.dot, { backgroundColor: theme.textSecondary }]} />
              
              {/* Raised By */}
              <View style={styles.detailRow}>
                <Ionicons name="person" size={14} color={theme.textSecondary} />
                <Text style={[styles.detailText, { color: theme.textSecondary }]} numberOfLines={1}>
                  {issue.supervisor_name || 'System'}
                </Text>
              </View>
            </View>

            {/* Track Status Sub-badge */}
            {issue.track_status && (
              <View style={[styles.trackStatusContainer, { backgroundColor: cardTheme.pillBg }]}>
                <View style={[styles.trackStatusDot, { backgroundColor: cardTheme.accent }]} />
                <Text style={[styles.trackStatusText, { color: isDark ? '#ffffff' : cardTheme.accent }]}>
                  {formatTrackStatus(issue.track_status)}
                </Text>
              </View>
            )}
          </View>

          {/* Thumbnail */}
          {thumbnailUri && (
            <View style={styles.thumbnailWrapper}>
              <Image
                source={{ uri: thumbnailUri }}
                style={[styles.thumbnail, { borderColor: cardTheme.border }]}
                resizeMode="cover"
              />
            </View>
          )}
        </View>

        {/* ── Footer: Deadline & Action Arrow ── */}
        <View style={[styles.footer, { borderTopColor: cardTheme.border }]}>
          <View style={styles.deadline}>
            <Ionicons name="time" size={15} color={deadlineColor} />
            <Text style={[styles.deadlineText, { color: deadlineColor }]}>
              {deadlineText}
            </Text>
          </View>
          <View style={styles.actionRow}>
            <Text style={[styles.actionText, { color: cardTheme.accent }]}>View Details</Text>
            <Ionicons name="arrow-forward" size={16} color={cardTheme.accent} />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderLeftWidth: 6, // Strong accent line
    overflow: 'hidden', 
    ...Platform.select({
      ios: { 
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 }, 
        shadowOpacity: 0.05, 
        shadowRadius: 10 
      },
      android: { elevation: 2 }, 
    }),
  },
  contentContainer: {
    padding: 16,
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
    flexWrap: 'wrap',
  },
  issueId: {
    fontSize: 14,
    fontWeight: '800',
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
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 10,
    lineHeight: 24,
    letterSpacing: -0.3,
  },
  details: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailText: {
    fontSize: 13,
    fontWeight: '600',
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    opacity: 0.4,
  },
  trackStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  trackStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  trackStatusText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  thumbnailWrapper: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  thumbnail: {
    width: 64,
    height: 64,
    borderRadius: 12,
    borderWidth: 1,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 14,
    marginTop: 14,
    borderTopWidth: 1,
  },
  deadline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  deadlineText: {
    fontSize: 13,
    fontWeight: '700',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '700',
  }
});

export default IssueCard;