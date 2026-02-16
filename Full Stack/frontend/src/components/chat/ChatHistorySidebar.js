import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { formatRelativeTime } from '../../utils/formatters';

const ChatHistorySidebar = ({ conversations, onSelectConversation, onNewChat, selectedId }) => {
  const { theme } = useTheme();

  const renderItem = ({ item }) => {
    const isSelected = selectedId === item.id;
    return (
      <TouchableOpacity
        style={[
          styles.item,
          { backgroundColor: isSelected ? `${theme.primary}15` : 'transparent' },
        ]}
        onPress={() => onSelectConversation(item.id)}
      >
        <View style={styles.itemContent}>
          <Text
            style={[styles.message, { color: theme.text }]}
            numberOfLines={2}
          >
            {item.firstMessage}
          </Text>
          <Text style={[styles.time, { color: theme.textSecondary }]}>
            {formatRelativeTime(item.created_at)}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.card }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>Chat History</Text>
        <TouchableOpacity
          style={[styles.newButton, { backgroundColor: theme.primary }]}
          onPress={onNewChat}
        >
          <Ionicons name="add" size={20} color="#ffffff" />
        </TouchableOpacity>
      </View>
      <FlatList
        data={conversations}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.list}
      />
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
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  newButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    padding: 8,
  },
  item: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 4,
  },
  itemContent: {
    gap: 4,
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
  },
  time: {
    fontSize: 12,
  },
});

export default ChatHistorySidebar;
