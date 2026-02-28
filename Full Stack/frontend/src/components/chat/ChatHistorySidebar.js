import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { formatRelativeTime } from '../../utils/formatters';

const ChatHistorySidebar = ({ conversations, onSelectConversation, onNewChat, selectedId }) => {
  const { theme, isDark } = useTheme();

  // OpenAI's specific color palette for the sidebar
  const sidebarBg = isDark ? '#171717' : '#f9f9f9';
  const selectedBg = isDark ? '#2a2a2a' : '#ececec'; // Soft selection color
  const textColor = isDark ? '#ececec' : '#0d0d0d';
  const mutedColor = isDark ? '#8e8ea0' : '#8e8ea0'; // OpenAI uses this exact gray for both modes
  const borderColor = isDark ? '#2f2f2f' : '#e5e5e5';

  const renderItem = ({ item }) => {
    const isSelected = selectedId === item.id;

    return (
      <TouchableOpacity
        style={[
          styles.item,
          { backgroundColor: isSelected ? selectedBg : 'transparent' },
        ]}
        onPress={() => onSelectConversation(item.id)}
        activeOpacity={0.7}
      >
        <Ionicons
          name={isSelected ? 'chatbubble' : 'chatbubble-outline'}
          size={18}
          color={isSelected ? textColor : mutedColor}
          style={styles.itemIcon}
        />
        <View style={styles.itemContent}>
          <Text
            style={[
              styles.itemText,
              {
                color: isSelected ? textColor : textColor, // Unselected still uses main text color
                fontWeight: isSelected ? '600' : '400',
              },
            ]}
            numberOfLines={1}
          >
            {item.title}
          </Text>
          <View style={styles.metaRow}>
            <Text style={[styles.timeText, { color: mutedColor }]}>
              {formatRelativeTime(item.created_at)}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <View style={[styles.emptyIconWrapper, { backgroundColor: 'transparent' }]}>
        <Ionicons name="chatbox-outline" size={32} color={mutedColor} />
      </View>
      <Text style={[styles.emptyTitle, { color: textColor }]}>No conversations</Text>
      <Text style={[styles.emptySubtitle, { color: mutedColor }]}>
        Start a new chat to get help
      </Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: sidebarBg }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={[styles.headerIconWrapper, { backgroundColor: isDark ? '#ffffff' : '#000000' }]}>
            <Ionicons name="sparkles" size={14} color={isDark ? '#000000' : '#ffffff'} />
          </View>
          <Text style={[styles.title, { color: textColor }]}>New chat</Text>
        </View>

        <TouchableOpacity
          style={styles.newButton}
          onPress={onNewChat}
          activeOpacity={0.6}
        >
          <Ionicons name="create-outline" size={22} color={textColor} />
        </TouchableOpacity>
      </View>

      {/* Conversations count */}
      {conversations?.length > 0 && (
        <View style={styles.countRow}>
          <Text style={[styles.countText, { color: mutedColor }]}>
            Previous 7 Days
          </Text>
        </View>
      )}

      {/* List */}
      <FlatList
        data={conversations}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.list,
          !conversations?.length && styles.listEmpty,
        ]}
        ListEmptyComponent={renderEmpty}
        ItemSeparatorComponent={() => (
          // Replaced hard lines with invisible spacing to match ChatGPT's modern look
          <View style={styles.separator} />
        )}
      />

      {/* Footer */}
      <View style={[styles.footer, { backgroundColor: sidebarBg }]}>
        <Ionicons name="information-circle-outline" size={14} color={mutedColor} />
        <Text style={[styles.footerText, { color: mutedColor }]}>
          Conversations are secured.
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    // Removed borderBottomWidth for a seamless look
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIconWrapper: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  newButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },

  countRow: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: 8,
  },
  countText: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.3,
  },

  list: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  listEmpty: {
    flex: 1,
  },
  separator: {
    height: 2, // Invisible spacing instead of a solid line
    backgroundColor: 'transparent',
  },

  item: {
    flexDirection: 'row',
    alignItems: 'center', // Centered vertically
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8, // Softer rounding for list items
    marginVertical: 1,
  },
  itemIcon: {
    flexShrink: 0,
  },
  itemContent: {
    flex: 1,
    gap: 4,
  },
  itemText: {
    fontSize: 14,
    lineHeight: 18,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeText: {
    fontSize: 12,
    fontWeight: '400',
  },

  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    gap: 8,
    paddingBottom: 40, // Lifted slightly
  },
  emptyIconWrapper: {
    width: 56,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },

  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 16,
    paddingHorizontal: 14,
    // Removed top border, seamlessly blends with background
  },
  footerText: {
    fontSize: 12,
    fontWeight: '400',
  },
});

export default ChatHistorySidebar;