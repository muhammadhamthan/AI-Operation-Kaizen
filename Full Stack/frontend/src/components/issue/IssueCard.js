import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import StatusBadge from '../common/StatusBadge';
import { formatOverdueText, getDeadlineColor } from '../../utils/overdue';

// ── BOLD PROFESSIONAL STATUS PALETTE ──
const getStatusTheme = (status, isDark) => {
  const themes = {
    OPEN: { base: '#3b82f6' },
    ASSIGNED: { base: '#8b5cf6' },
    IN_PROGRESS: { base: '#eab308' },
    RESOLVED_PENDING_REVIEW: { base: '#f97316' },
    COMPLETED: { base: '#10a37f' },
    REOPENED: { base: '#ef4444' },
    ESCALATED: { base: '#dc2626' },
  };

  const selected = themes[status] || { base: '#8e8ea0' };
  const baseColor = selected.base;

  return {
    accent: baseColor,
    bgBody: isDark ? `${baseColor}20` : `${baseColor}15`,
    border: isDark ? `${baseColor}40` : `${baseColor}35`,
    pillBg: isDark ? `${baseColor}30` : `${baseColor}25`,
  };
};

const IssueCard = ({ issue, onPress }) => {
  const { theme, isDark } = useTheme();

  const deadlineText = formatOverdueText(issue.deadline_at, issue.status);
  const deadlineColor = getDeadlineColor(issue.deadline_at, issue.status);
  const cardTheme = getStatusTheme(issue.status, isDark);

  const formatTrackStatus = (statusStr) => {
    if (!statusStr) return '';
    return statusStr.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const thumbnailUri = issue.images && issue.images.length > 0 ? issue.images[0].image_url : null;

  // ── Per-theme card surface ──
  // Dark:  deep slate with a whisper of the accent tint + a glass-edge top highlight
  // Light: pure white, lifted by a soft directional shadow + faint accent wash
  const cardBg = isDark
    ? `${cardTheme.accent}0D`   // ~5% accent over transparent — layered on dark base below
    : '#ffffff';

  const cardBase = isDark ? '#18181f' : '#ffffff'; // true base (drawn first)

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={[
        styles.card,
        {
          // Light: crisp shadow. Dark: accent-tinted shadow for depth.
          ...Platform.select({
            ios: {
              shadowColor: isDark ? cardTheme.accent : '#000',
              shadowOffset: { width: 0, height: isDark ? 6 : 3 },
              shadowOpacity: isDark ? 0.22 : 0.09,
              shadowRadius: isDark ? 18 : 10,
            },
            android: { elevation: isDark ? 6 : 3 },
          }),
        }
      ]}
    >
      {/* ── Base surface layer ── */}
      <View style={[StyleSheet.absoluteFill, styles.baseSurface, { backgroundColor: cardBase }]} />

      {/* ── Accent tint wash (gives the card its identity colour) ── */}
      <View style={[StyleSheet.absoluteFill, styles.baseSurface, { backgroundColor: isDark ? `${cardTheme.accent}0F` : `${cardTheme.accent}07` }]} />

      {/* ── Glass-edge top highlight (dark only) ──
           Simulates the bright top rim of a frosted glass object. */}
      {isDark && (
        <View style={styles.glassEdge} />
      )}

      {/* ── Left accent bar ── */}
      <View style={[styles.accentBar, { backgroundColor: cardTheme.accent }]} />

      {/* ── Outer border ── */}
      <View style={[
        styles.outerBorder,
        {
          borderColor: isDark
            ? `${cardTheme.accent}28`
            : `${cardTheme.accent}22`,
        }
      ]} />

      {/* ── Content ── */}
      <View style={styles.contentContainer}>

        {/* ── Header: ID & Badges ── */}
        <View style={styles.header}>
          <View style={styles.idContainer}>
            <Text style={[styles.issueId, { color: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.3)' }]}>
              #{issue.id}
            </Text>
            <StatusBadge status={issue.status} size="small" />
            <StatusBadge status={issue.priority} type="priority" size="small" />
          </View>
        </View>

        {/* ── Body: Title, Meta & Thumbnail ── */}
        <View style={styles.body}>
          <View style={styles.bodyLeft}>
            <Text
              style={[
                styles.title,
                { color: isDark ? 'rgba(255,255,255,0.92)' : 'rgba(0,0,0,0.87)' }
              ]}
              numberOfLines={2}
            >
              {issue.title}
            </Text>

            <View style={styles.details}>
              {/* Site Name */}
              <View style={styles.detailRow}>
                <Ionicons
                  name="location"
                  size={13}
                  color={isDark ? 'rgba(255,255,255,0.38)' : 'rgba(0,0,0,0.38)'}
                />
                <Text
                  style={[styles.detailText, { color: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)' }]}
                  numberOfLines={1}
                >
                  {issue.site_name || 'Unknown Site'}
                </Text>
              </View>

              <View style={[styles.dot, { backgroundColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)' }]} />

              {/* Raised By */}
              <View style={styles.detailRow}>
                <Ionicons
                  name="person"
                  size={13}
                  color={isDark ? 'rgba(255,255,255,0.38)' : 'rgba(0,0,0,0.38)'}
                />
                <Text
                  style={[styles.detailText, { color: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)' }]}
                  numberOfLines={1}
                >
                  {issue.supervisor_name || 'System'}
                </Text>
              </View>
            </View>

            {/* Track Status Sub-badge */}
            {issue.track_status && (
              <View style={[
                styles.trackStatusContainer,
                {
                  backgroundColor: isDark
                    ? `${cardTheme.accent}1A`
                    : `${cardTheme.accent}12`,
                  borderColor: isDark
                    ? `${cardTheme.accent}30`
                    : `${cardTheme.accent}25`,
                }
              ]}>
                <View style={[styles.trackStatusDot, { backgroundColor: cardTheme.accent }]} />
                <Text style={[
                  styles.trackStatusText,
                  { color: isDark ? `${cardTheme.accent}` : cardTheme.accent }
                ]}>
                  {formatTrackStatus(issue.track_status)}
                </Text>
              </View>
            )}
          </View>

          {/* Thumbnail */}
          {thumbnailUri && (
            <View style={[
              styles.thumbnailWrapper,
              {
                borderColor: isDark
                  ? `${cardTheme.accent}35`
                  : `${cardTheme.accent}28`,
                ...Platform.select({
                  ios: {
                    shadowColor: cardTheme.accent,
                    shadowOffset: { width: 0, height: 3 },
                    shadowOpacity: 0.25,
                    shadowRadius: 6,
                  },
                  android: { elevation: 3 },
                }),
              }
            ]}>
              <Image
                source={{ uri: thumbnailUri }}
                style={styles.thumbnail}
                resizeMode="cover"
              />
            </View>
          )}
        </View>

        {/* ── Footer ── */}
        <View style={[
          styles.footer,
          {
            borderTopColor: isDark
              ? 'rgba(255,255,255,0.06)'
              : 'rgba(0,0,0,0.06)',
          }
        ]}>
          <View style={styles.deadline}>
            <Ionicons name="time-outline" size={14} color={deadlineColor} />
            <Text style={[styles.deadlineText, { color: deadlineColor }]}>
              {deadlineText}
            </Text>
          </View>
          <View style={styles.actionRow}>
            <Text style={[styles.actionText, { color: cardTheme.accent }]}>View Details</Text>
            <Ionicons name="arrow-forward" size={15} color={cardTheme.accent} />
          </View>
        </View>

      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: 14,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
  },

  // ── Layered surface system ──
  baseSurface: {
    borderRadius: 16,
  },

  // Thin bright line on the very top of the card — the "glass rim"
  glassEdge: {
    position: 'absolute',
    top: 0,
    left: 16,
    right: 16,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderRadius: 1,
  },

  // 3px solid left accent strip
  accentBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
  },

  // Full card border overlay
  outerBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 16,
    borderWidth: 1,
  },

  // ── Content ──
  contentContainer: {
    paddingLeft: 18,   // extra left padding to clear the accent bar
    paddingRight: 16,
    paddingTop: 14,
    paddingBottom: 14,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  idContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  issueId: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  body: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 14,
  },
  bodyLeft: {
    flex: 1,
  },
  title: {
    fontSize: 15.5,
    fontWeight: '600',
    marginBottom: 8,
    lineHeight: 22,
    letterSpacing: -0.3,
  },
  details: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  detailText: {
    fontSize: 12.5,
    fontWeight: '500',
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
  },
  trackStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 7,
    borderWidth: 1,
  },
  trackStatusDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  trackStatusText: {
    fontSize: 11.5,
    fontWeight: '600',
    letterSpacing: 0.15,
  },

  // ── Thumbnail ──
  thumbnailWrapper: {
    borderRadius: 11,
    borderWidth: 1.5,
    overflow: 'hidden',
  },
  thumbnail: {
    width: 62,
    height: 62,
  },

  // ── Footer ──
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    marginTop: 12,
    borderTopWidth: 1,
  },
  deadline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  deadlineText: {
    fontSize: 12.5,
    fontWeight: '600',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  actionText: {
    fontSize: 12.5,
    fontWeight: '600',
  },
});

export default IssueCard;