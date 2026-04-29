import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { navigateToNotification, getNavigationPreview } from '../../utils/notificationNavigation';

const NotificationBanner = ({ count, notifications = [], onPress, onDismiss, onMarkRead }) => {
  const { theme, isDark } = useTheme();
  const [showList, setShowList] = useState(false);

  if (!count || count === 0) return null;

  const handleBannerPress = () => {
    if (notifications.length > 0) {
      setShowList(true);
    } else {
      onPress?.();
    }
  };

  const handleNotificationPress = (notification) => {
    onMarkRead?.(notification.id);
    navigateToNotification(notification);
    setShowList(false);
  };

  const getNotificationIcon = (type) => {
    const icons = {
      issue_created: 'document-text',
      issue_assigned: 'person-add',
      issue_status_changed: 'sync',
      issue_escalated: 'warning',
      issue_completed: 'checkmark-circle',
      issue_reopened: 'refresh-circle',
      complaint_created: 'alert-circle',
      complaint_resolved: 'shield-checkmark',
      chat_message: 'chatbubble',
      overdue_issues: 'time',
      daily_summary: 'bar-chart',
    };
    return icons[type] || 'notifications';
  };

  // Exact ChatGPT-style colors
  const bannerBg = isDark ? '#2f2f2f' : '#f4f4f4'; // Soft flat gray
  const modalBg = isDark ? '#212121' : '#ffffff';
  const modalOverlayBg = isDark ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0.3)';
  const unreadBg = isDark ? '#343541' : '#f7f7f8'; // OpenAI's specific alternating row colors
  const borderColor = isDark ? '#424242' : '#e5e5e5';
  const accentColor = '#10a37f'; // The official OpenAI Green

  const renderNotificationItem = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.notificationItem,
        {
          backgroundColor: item.read ? 'transparent' : unreadBg,
        },
      ]}
      onPress={() => handleNotificationPress(item)}
      activeOpacity={0.7}
    >
      <View style={[styles.notificationDot, { backgroundColor: item.read ? 'transparent' : accentColor }]} />
      <View style={styles.notificationContent}>
        <Text style={[styles.notificationTitle, { color: theme.text }]} numberOfLines={1}>
          {item.title || item.message}
        </Text>
        <Text style={[styles.notificationBody, { color: theme.textSecondary }]} numberOfLines={2}>
          {item.body || getNavigationPreview(item)}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} />
    </TouchableOpacity>
  );

  return (
    <>
      {/* ── Banner — subtle inline strip ── */}
      <TouchableOpacity
        style={[
          styles.banner,
          {
            backgroundColor: bannerBg,
            // Removed borders entirely for the "flat" look
          },
        ]}
        onPress={handleBannerPress}
        activeOpacity={0.8}
      >
        <View style={styles.bannerLeft}>
          <View style={[styles.bannerDot, { backgroundColor: accentColor }]} />
          <Text style={[styles.bannerText, { color: theme.text }]}>
            {count} new notification{count > 1 ? 's' : ''}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.bannerClose}
          onPress={(e) => {
            e.stopPropagation();
            onDismiss?.();
          }}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="close" size={18} color={theme.textSecondary} />
        </TouchableOpacity>
      </TouchableOpacity>

      {/* ── Notifications Modal ── */}
      <Modal
        visible={showList}
        transparent
        animationType="fade"
        onRequestClose={() => setShowList(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: modalOverlayBg }]}>
          <View style={[styles.modalContent, { backgroundColor: modalBg, borderColor: borderColor }]}>
            
            {/* Modal Header */}
            <View style={[styles.modalHeader, { borderBottomColor: borderColor }]}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Notifications</Text>
              <TouchableOpacity
                onPress={() => setShowList(false)}
                style={styles.modalClose}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={22} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Notification List */}
            <FlatList
              data={notifications}
              keyExtractor={(item) => item.id.toString()}
              renderItem={renderNotificationItem}
              contentContainerStyle={styles.listContent}
              ItemSeparatorComponent={() => (
                <View style={styles.separator} /> // Invisible spacer instead of lines
              )}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Ionicons name="notifications-outline" size={32} color={theme.textSecondary} style={{ opacity: 0.5 }} />
                  <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                    No notifications
                  </Text>
                </View>
              }
            />
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  // ── Banner ────────
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12, // Slightly taller
    paddingHorizontal: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12, // Soft rounded corners
  },
  bannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  bannerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  bannerText: {
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  bannerClose: {
    padding: 2,
  },

  // ── Modal ────────
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    borderRadius: 16, // Beautiful large curves
    borderWidth: 1, // Subtle border helps it pop without shadows
    width: '100%',
    maxWidth: 480,
    maxHeight: '75%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  modalClose: {
    padding: 4,
    borderRadius: 8,
  },

  // ── Notification Items ────────
  listContent: {
    padding: 8,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center', // Centers dot, text, and chevron vertically
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12, // Soft item curves
    gap: 14,
  },
  notificationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    flexShrink: 0,
  },
  notificationContent: {
    flex: 1,
    gap: 4, // Space between title and body
  },
  notificationTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  notificationBody: {
    fontSize: 13,
    lineHeight: 18,
  },
  separator: {
    height: 4, // Using invisible gap spacing instead of hard lines
    backgroundColor: 'transparent',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
  },
});

export default NotificationBanner;