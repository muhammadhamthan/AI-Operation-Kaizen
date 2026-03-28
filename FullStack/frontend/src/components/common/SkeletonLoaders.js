import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import Shimmer from './Shimmer';

/**
 * Skeleton loading component for Issue Cards
 */
export const IssueCardSkeleton = () => {
  const { theme } = useTheme();
  
  return (
    <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={styles.cardHeader}>
        <Shimmer width={60} height={24} borderRadius={12} />
        <Shimmer width={50} height={20} borderRadius={10} />
      </View>
      <Shimmer width="80%" height={20} style={styles.titleShimmer} />
      <View style={styles.infoRow}>
        <Shimmer width={100} height={16} borderRadius={8} />
        <Shimmer width={80} height={16} borderRadius={8} />
      </View>
      <Shimmer width={120} height={14} style={styles.dateShimmer} />
    </View>
  );
};

/**
 * Skeleton loading component for Dashboard Cards
 */
export const DashboardCardSkeleton = () => {
  const { theme } = useTheme();
  
  return (
    <View style={[styles.dashboardCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <Shimmer width={40} height={40} borderRadius={20} />
      <Shimmer width={60} height={32} style={styles.countShimmer} />
      <Shimmer width={80} height={14} />
    </View>
  );
};

/**
 * Skeleton loading for list screen
 */
export const ListScreenSkeleton = ({ count = 5 }) => {
  return (
    <View style={styles.listContainer}>
      {/* Search bar skeleton */}
      <View style={styles.searchSkeleton}>
        <Shimmer width="100%" height={44} borderRadius={10} />
      </View>
      
      {/* Cards skeleton */}
      {Array.from({ length: count }).map((_, index) => (
        <IssueCardSkeleton key={index} />
      ))}
    </View>
  );
};

/**
 * Skeleton loading for Dashboard
 */
export const DashboardSkeleton = () => {
  const { theme } = useTheme();
  
  return (
    <View style={styles.dashboardContainer}>
      {/* Header skeleton */}
      <View style={styles.headerSkeleton}>
        <View>
          <Shimmer width={100} height={14} style={styles.headerSubtitle} />
          <Shimmer width={150} height={24} />
        </View>
        <Shimmer width={44} height={44} borderRadius={22} />
      </View>
      
      {/* Stats cards skeleton */}
      <View style={styles.statsRow}>
        <DashboardCardSkeleton />
        <DashboardCardSkeleton />
      </View>
      <View style={styles.statsRow}>
        <View style={[styles.fullWidthCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Shimmer width={40} height={40} borderRadius={20} />
          <Shimmer width={60} height={32} style={styles.countShimmer} />
          <Shimmer width={80} height={14} />
        </View>
      </View>
      
      {/* Chart skeleton */}
      <View style={[styles.chartSkeleton, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Shimmer width={180} height={20} style={styles.chartTitle} />
        <Shimmer width="100%" height={180} borderRadius={12} />
        <Shimmer width={120} height={36} borderRadius={8} style={styles.chartButton} />
      </View>
    </View>
  );
};

/**
 * Skeleton for Chat message
 */
export const ChatMessageSkeleton = ({ isUser = false }) => {
  const { theme } = useTheme();
  
  return (
    <View style={[styles.messageContainer, isUser && styles.userMessage]}>
      {!isUser && <Shimmer width={32} height={32} borderRadius={16} />}
      <View style={[
        styles.messageBubble, 
        { backgroundColor: isUser ? `${theme.primary}30` : theme.inputBackground },
        isUser && styles.userBubble
      ]}>
        <Shimmer width={isUser ? 150 : 200} height={14} />
        <Shimmer width={isUser ? 100 : 180} height={14} style={styles.messageLine} />
        {!isUser && <Shimmer width={120} height={14} style={styles.messageLine} />}
      </View>
    </View>
  );
};

/**
 * Skeleton for Notification item
 */
export const NotificationSkeleton = () => {
  const { theme } = useTheme();
  
  return (
    <View style={[styles.notificationItem, { backgroundColor: theme.card }]}>
      <Shimmer width={40} height={40} borderRadius={20} />
      <View style={styles.notificationContent}>
        <Shimmer width="70%" height={16} />
        <Shimmer width="90%" height={14} style={styles.notificationBody} />
      </View>
    </View>
  );
};

/**
 * Profile screen skeleton
 */
export const ProfileSkeleton = () => {
  const { theme } = useTheme();
  
  return (
    <View style={styles.profileContainer}>
      {/* Avatar */}
      <View style={styles.profileHeader}>
        <Shimmer width={100} height={100} borderRadius={50} />
        <Shimmer width={150} height={24} style={styles.profileName} />
        <Shimmer width={100} height={16} />
      </View>
      
      {/* Info cards */}
      {Array.from({ length: 4 }).map((_, index) => (
        <View key={index} style={[styles.profileCard, { backgroundColor: theme.card }]}>
          <Shimmer width={24} height={24} borderRadius={12} />
          <View style={styles.profileCardContent}>
            <Shimmer width={80} height={12} />
            <Shimmer width={150} height={16} style={styles.profileCardValue} />
          </View>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  // Issue Card
  card: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  titleShimmer: {
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 8,
  },
  dateShimmer: {
    marginTop: 4,
  },
  
  // Dashboard Card
  dashboardCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  countShimmer: {
    marginVertical: 8,
  },
  
  // List Screen
  listContainer: {
    padding: 16,
  },
  searchSkeleton: {
    marginBottom: 16,
  },
  
  // Dashboard
  dashboardContainer: {
    padding: 16,
  },
  headerSkeleton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  headerSubtitle: {
    marginBottom: 8,
  },
  statsRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  fullWidthCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  chartSkeleton: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 16,
  },
  chartTitle: {
    marginBottom: 16,
  },
  chartButton: {
    alignSelf: 'center',
    marginTop: 16,
  },
  
  // Chat Message
  messageContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 16,
    gap: 8,
  },
  userMessage: {
    flexDirection: 'row-reverse',
  },
  messageBubble: {
    padding: 12,
    borderRadius: 16,
    maxWidth: '70%',
  },
  userBubble: {
    borderBottomRightRadius: 4,
  },
  messageLine: {
    marginTop: 6,
  },
  
  // Notification
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    gap: 12,
  },
  notificationContent: {
    flex: 1,
  },
  notificationBody: {
    marginTop: 6,
  },
  
  // Profile
  profileContainer: {
    padding: 16,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 32,
  },
  profileName: {
    marginTop: 16,
    marginBottom: 8,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    gap: 12,
  },
  profileCardContent: {
    flex: 1,
  },
  profileCardValue: {
    marginTop: 4,
  },
});

export default {
  IssueCardSkeleton,
  DashboardCardSkeleton,
  ListScreenSkeleton,
  DashboardSkeleton,
  ChatMessageSkeleton,
  NotificationSkeleton,
  ProfileSkeleton,
};
