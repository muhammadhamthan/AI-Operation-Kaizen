import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../src/theme/ThemeContext';
import { selectCurrentUser } from '../../../src/store/slices/authSlice';
import {
  selectAllMessages,
  selectChatHistory,
  addMessage,
  loadChatHistory,
  loadConversation,
  startNewConversation,
} from '../../../src/store/slices/chatSlice';
import { selectUnreadCount, markAllAsRead, setNotifications } from '../../../src/store/slices/notificationsSlice';
import NotificationBanner from '../../../src/components/chat/NotificationBanner';
import ChatMessage from '../../../src/components/chat/ChatMessage';
import ChatInput from '../../../src/components/chat/ChatInput';
import ChatHistorySidebar from '../../../src/components/chat/ChatHistorySidebar';
import Avatar from '../../../src/components/common/Avatar';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DRAWER_WIDTH = 280;

export default function ChatScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const dispatch = useDispatch();
  const user = useSelector(selectCurrentUser);
  const messages = useSelector(selectAllMessages);
  const chatHistory = useSelector(selectChatHistory);
  const unreadCount = useSelector(selectUnreadCount);
  const scrollViewRef = useRef(null);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const drawerAnimation = useRef(new Animated.Value(-DRAWER_WIDTH)).current;

  useEffect(() => {
    dispatch(loadChatHistory());
    // Set some initial notifications for demo
    dispatch(setNotifications([
      { id: 1, message: 'New issue assigned', read: false },
      { id: 2, message: 'Issue #15 reopened', read: false },
      { id: 3, message: 'Complaint raised', read: false },
    ]));
  }, []);

  const toggleDrawer = () => {
    const toValue = drawerOpen ? -DRAWER_WIDTH : 0;
    Animated.timing(drawerAnimation, {
      toValue,
      duration: 250,
      useNativeDriver: true,
    }).start();
    setDrawerOpen(!drawerOpen);
  };

  const handleSelectConversation = (conversationId) => {
    dispatch(loadConversation(conversationId));
    setSelectedConversation(conversationId);
    toggleDrawer();
  };

  const handleNewChat = () => {
    dispatch(startNewConversation());
    setSelectedConversation(null);
    toggleDrawer();
  };

  const handleSendMessage = (text) => {
    const userMessage = {
      id: Date.now(),
      message: text,
      role_in_chat: 'user',
      user_id: user?.id,
      created_at: new Date().toISOString(),
    };
    dispatch(addMessage(userMessage));

    // Simulate AI response
    // setTimeout(() => {
    //   const aiMessage = {
    //     id: Date.now() + 1,
    //     message: `I understand you asked about: "${text}"\n\nThis is a placeholder response. In Phase 2-3, this will be connected to an actual AI assistant that can help you with:\n\n• Checking issue status\n• Finding overdue tasks\n• Getting analytics reports\n• Managing assignments`,
    //     role_in_chat: 'assistant',
    //     user_id: null,
    //     created_at: new Date().toISOString(),
    //   };
    //   dispatch(addMessage(aiMessage));
    // }, 10000000);
  };

  // Ensure message prop is always a string
  const renderMessage = (msg) => {
    // Handle cases where message might be an object (from API response)
    if (typeof msg.message === 'object' && msg.message !== null) {
      // Extract the appropriate text from object
      if (msg.role_in_chat === 'user' && msg.message.user_message) {
        return msg.message.user_message;
      } else if (msg.role_in_chat === 'assistant' && msg.message.bot_response) {
        return msg.message.bot_response;
      }
      // Fallback: convert object to string
      return JSON.stringify(msg.message);
    }
    // If it's already a string, return as is
    return msg.message || '';
  };

  const handleNotificationPress = () => {
    dispatch(markAllAsRead());
    router.push('/(main)/(tabs)/dashboard/issues');
  };

  const handleNotificationDismiss = () => {
    dispatch(markAllAsRead());
  };

  const showCamera = user?.role !== 'manager';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        <TouchableOpacity style={styles.menuButton} onPress={toggleDrawer}>
          <Ionicons name="menu" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>AI Assistant</Text>
        <TouchableOpacity onPress={() => router.push('/(main)/profile')}>
          <Avatar uri={user?.avatar} name={user?.name} size="small" />
        </TouchableOpacity>
      </View>

      {/* Notification Banner */}
      <NotificationBanner
        count={unreadCount}
        onPress={handleNotificationPress}
        onDismiss={handleNotificationDismiss}
      />

      {/* Messages */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
      >
        {messages.length === 0 ? (
          <View style={styles.emptyChat}>
            <View style={[styles.emptyIcon, { backgroundColor: `${theme.primary}15` }]}>
              <Ionicons name="chatbubbles-outline" size={48} color={theme.primary} />
            </View>
            <Text style={[styles.emptyTitle, { color: theme.text }]}>
              Welcome, {user?.name}!
            </Text>
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              Start a conversation with your AI assistant. Ask about issues, reports, or analytics.
            </Text>
          </View>
        ) : (
          messages.map((msg) => (
            <ChatMessage
              key={msg.id}
              message={renderMessage(msg)}
              isUser={msg.role_in_chat === 'user'}
            />
          ))
        )}
      </ScrollView>

      {/* Chat Input */}
      <ChatInput onSend={handleSendMessage} showCamera={showCamera} />

      {/* Overlay */}
      {drawerOpen && (
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={toggleDrawer}
        />
      )}

      {/* Drawer */}
      <Animated.View
        style={[
          styles.drawer,
          { backgroundColor: theme.card, transform: [{ translateX: drawerAnimation }] },
        ]}
      >
        <ChatHistorySidebar
          conversations={chatHistory}
          onSelectConversation={handleSelectConversation}
          onNewChat={handleNewChat}
          selectedId={selectedConversation}
        />
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  menuButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    paddingVertical: 16,
  },
  emptyChat: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    marginTop: 60,
  },
  emptyIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    zIndex: 10,
  },
  drawer: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: DRAWER_WIDTH,
    zIndex: 20,
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
  },
});
