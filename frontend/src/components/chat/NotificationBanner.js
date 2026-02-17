import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, FlatList, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { navigateToNotification, getNavigationPreview } from '../../utils/notificationNavigation';

const NotificationBanner = ({ count, notifications = [], onPress, onDismiss, onMarkRead }) => {
  const { theme } = useTheme();
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
    // Mark as read
    onMarkRead?.(notification.id);
    
    // Navigate to the notification target
    navigateToNotification(notification);
    
    // Close the list
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

  const renderNotificationItem = ({ item }) => (
    <TouchableOpacity
      style={[styles.notificationItem, { backgroundColor: item.read ? theme.card : `${theme.primary}10` }]}
      onPress={() => handleNotificationPress(item)}
    >
      <View style={[styles.notificationIcon, { backgroundColor: `${theme.primary}20` }]}>
        <Ionicons name={getNotificationIcon(item.type)} size={20} color={theme.primary} />
      </View>
      <View style={styles.notificationContent}>
        <Text style={[styles.notificationTitle, { color: theme.text }]} numberOfLines={1}>
          {item.title || item.message}
        </Text>
        <Text style={[styles.notificationBody, { color: theme.textSecondary }]} numberOfLines={2}>
          {item.body || getNavigationPreview(item)}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
    </TouchableOpacity>
  );

  return (
    <>
      {/* Banner */}
      <TouchableOpacity
        style={[styles.container, { backgroundColor: theme.primary }]}
        onPress={handleBannerPress}
        activeOpacity={0.8}
      >
        <View style={styles.content}>
          <Ionicons name="notifications" size={20} color="#ffffff" />
          <Text style={styles.text}>
            {count} New Notification{count > 1 ? 's' : ''}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={(e) => {
            e.stopPropagation();
            onDismiss?.();
          }}
        >
          <Ionicons name="close" size={18} color="#ffffff" />
        </TouchableOpacity>
      </TouchableOpacity>

      {/* Notifications List Modal */}
      <Modal
        visible={showList}
        transparent
        animationType="slide"
        onRequestClose={() => setShowList(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Notifications</Text>
              <TouchableOpacity onPress={() => setShowList(false)}>
                <Ionicons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>
            
            <FlatList
              data={notifications}
              keyExtractor={(item) => item.id.toString()}
              renderItem={renderNotificationItem}
              contentContainerStyle={styles.listContent}
              ItemSeparatorComponent={() => (
                <View style={[styles.separator, { backgroundColor: theme.border }]} />
              )}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Ionicons name="notifications-off-outline" size={48} color={theme.textSecondary} />
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
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  text: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '70%',
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
    fontSize: 18,
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    gap: 12,
  },
  notificationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  notificationBody: {
    fontSize: 12,
    lineHeight: 16,
  },
  separator: {
    height: 1,
    marginVertical: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 14,
  },
});

export default NotificationBanner;
