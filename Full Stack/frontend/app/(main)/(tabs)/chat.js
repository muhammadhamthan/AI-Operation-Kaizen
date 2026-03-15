import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Dimensions,
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator,
  Alert, // 📍 Added Alert for ghost sessions
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
  selectCurrentConversationId,
  selectConversationLoading // 📍 FIX: Using the main screen loader
} from '../../../src/store/slices/chatSlice';
import { selectUnreadCount, selectNotifications, markAllAsRead, markAsRead, setNotifications } from '../../../src/store/slices/notificationsSlice';
import NotificationBanner from '../../../src/components/chat/NotificationBanner';
import ChatMessage from '../../../src/components/chat/ChatMessage';
import ChatInput from '../../../src/components/chat/ChatInput';
import ChatHistorySidebar from '../../../src/components/chat/ChatHistorySidebar';
import Avatar from '../../../src/components/common/Avatar';
import { navigateToNotification } from '../../../src/utils/notificationNavigation';
import { sendChatMessage } from '../../../src/services/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DRAWER_WIDTH = 280;

const SUGGESTIONS = [
  { icon: 'document-text-outline', text: 'Show overdue issues' },
  { icon: 'bar-chart-outline', text: 'Weekly analytics report' },
  { icon: 'people-outline', text: 'Team performance summary' },
  { icon: 'alert-circle-outline', text: 'Unresolved complaints' },
];

export default function ChatScreen() {
  const { theme, isDark } = useTheme();
  const router = useRouter();
  const dispatch = useDispatch();
  
  const user = useSelector(selectCurrentUser);
  const messages = useSelector(selectAllMessages);
  const chatHistory = useSelector(selectChatHistory);
  const unreadCount = useSelector(selectUnreadCount);
  const notifications = useSelector(selectNotifications);
  const currentSessionId = useSelector(selectCurrentConversationId);
  const isConversationLoading = useSelector(selectConversationLoading); // 📍 FIX

  const scrollViewRef = useRef(null);
  const [isLoading, setIsLoading] = useState(false); 

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const drawerAnimation = useRef(new Animated.Value(-DRAWER_WIDTH)).current;

  useEffect(() => {
    if (user?.id) {
      dispatch(loadChatHistory());
      dispatch(startNewConversation()); // 📍 FIX: Guarantees a blank screen on startup
      setSelectedConversation(null);
    }

    dispatch(setNotifications([
      { id: 1, type: 'issue_assigned', title: 'New issue assigned', body: 'Issue #8 has been assigned to you', data: { issueId: 8 }, read: false },
      { id: 2, type: 'issue_reopened', title: 'Issue reopened', body: 'Issue #15 was reopened by supervisor', data: { issueId: 15 }, read: false },
      { id: 3, type: 'complaint_created', title: 'Complaint raised', body: 'A new complaint has been filed', data: { complaintId: 1 }, read: false },
    ]));
  }, [user?.id, dispatch]);

  const toggleDrawer = useCallback(() => {
    const toValue = drawerOpen ? -DRAWER_WIDTH : 0;
    Animated.timing(drawerAnimation, {
      toValue,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      if (drawerOpen) setDrawerOpen(false);
    });
    if (!drawerOpen) setDrawerOpen(true);
  }, [drawerOpen, drawerAnimation]);

  // 📍 FIX: Ghost Session handling!
  const handleSelectConversation = async (conversationId) => {
    toggleDrawer(); // Close drawer immediately for snappy UX
    
    try {
      // .unwrap() allows us to catch the 404 error from the backend
      await dispatch(loadConversation(conversationId)).unwrap();
      setSelectedConversation(conversationId);
    } catch (error) {
      console.warn("Failed to load session:", error);
      
      // Reset the screen back to empty state
      dispatch(startNewConversation());
      setSelectedConversation(null);
      
      // Refresh the sidebar to delete the ghost session
      dispatch(loadChatHistory());
      
      Alert.alert("Session Not Found", "This conversation no longer exists or was deleted.");
    }
  };

  const handleNewChat = () => {
    dispatch(startNewConversation());
    setSelectedConversation(null);
    toggleDrawer();
  };

  const handleSendMessage = async (text) => {
    const userMessage = {
      id: Date.now(),
      message: text,
      role_in_chat: 'user',
      created_at: new Date().toISOString(),
    };

    dispatch(addMessage(userMessage));
    setIsLoading(true); 

    try {
      const result = await sendChatMessage(
        text,
        currentSessionId 
      );

      if (!result.success) return;

      const response = result.data;

      if (!currentSessionId && response.session_id) {
        dispatch({
          type: 'chat/setCurrentConversationId',
          payload: response.session_id,
        });
      }

      const aiMessage = {
        id: Date.now() + 1,
        message: response.message,
        role_in_chat: 'AI',
        created_at: new Date().toISOString(),
      };

      dispatch(addMessage(aiMessage));
    } catch (error) {
      console.error(error);
    }
    finally {
      setIsLoading(false); 
    }
  };

  const handleSuggestionPress = (text) => {
    handleSendMessage(text);
  };

  const handleNotificationPress = (notification) => {
    if (!notification) return;
    dispatch(markAsRead(notification.id));
    navigateToNotification(notification);
  };

  const handleNotificationDismiss = () => {
    dispatch(markAllAsRead());
  };

  const showCamera = user?.role !== 'manager';

  const screenBg = isDark ? '#212121' : '#ffffff';
  const headerBg = screenBg;
  const logoBg = isDark ? '#ffffff' : '#000000';
  const logoIconColor = isDark ? '#000000' : '#ffffff';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: screenBg }]}>
      <View style={[styles.header, { backgroundColor: headerBg }]}>
        <TouchableOpacity style={styles.menuButton} onPress={toggleDrawer}>
          <Ionicons name="menu-outline" size={26} color={theme.text} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.titleButton} activeOpacity={0.7}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>MaintenanceFlow</Text>
          <Ionicons name="chevron-down" size={14} color={theme.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push('/(main)/profile')}>
          <Avatar uri={user?.avatar} name={user?.name} size="small" />
        </TouchableOpacity>
      </View>

      <NotificationBanner
        count={unreadCount}
        notifications={notifications}
        onPress={handleNotificationPress}
        onDismiss={handleNotificationDismiss}
        onMarkRead={(id) => dispatch(markAsRead(id))}
      />

      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={[
            styles.messagesContent,
            (messages.length === 0 || isConversationLoading) && styles.messagesContentEmpty,
          ]}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
          showsVerticalScrollIndicator={false}
        >
          {/* 📍 FIX: Dynamic State rendering using the correct loader */}
          {isConversationLoading ? (
            <View style={styles.loadingHistoryContainer}>
              <ActivityIndicator size="large" color={theme.textSecondary} />
              <Text style={[styles.loadingHistoryText, { color: theme.textSecondary }]}>
                Loading conversation...
              </Text>
            </View>
          ) : messages.length === 0 ? (
            <View style={styles.emptyChat}>
              <View style={[styles.emptyLogo, { backgroundColor: logoBg }]}>
                <Ionicons name="sparkles" size={28} color={logoIconColor} />
              </View>

              <Text style={[styles.emptyTitle, { color: theme.text }]}>
                How can I help you today?
              </Text>

              <View style={styles.suggestionsGrid}>
                {SUGGESTIONS.map((suggestion, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.suggestionChip,
                      {
                        backgroundColor: 'transparent',
                        borderColor: isDark ? '#424242' : '#e5e5e5',
                      },
                    ]}
                    onPress={() => handleSuggestionPress(suggestion.text)}
                    activeOpacity={0.5}
                  >
                    <Ionicons
                      name={suggestion.icon}
                      size={18}
                      color={theme.textSecondary}
                      style={styles.suggestionIcon}
                    />
                    <Text style={[styles.suggestionText, { color: theme.textSecondary }]}>
                      {suggestion.text}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ) : (
            messages.map((msg) => (
              <ChatMessage
                key={msg.id}
                message={msg.message}
                image={msg.image || (msg.attachments?.length > 0 ? msg.attachments[0] : null)}
                location={msg.location} 
                // 📍 FIX: Case insensitive check fixes the left/right alignment!
                isUser={msg.role_in_chat?.toLowerCase() === 'user'} 
                timestamp={msg.created_at}
              />
            ))
          )}

          {isLoading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={theme.textSecondary} />
              <Text style={[styles.loadingText, { color: theme.textSecondary }]}>AI is typing...</Text>
            </View>
          )}
        </ScrollView>

        <ChatInput onSend={handleSendMessage} showCamera={showCamera} />
      </KeyboardAvoidingView>

      {drawerOpen && (
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={toggleDrawer}
        />
      )}

      <Animated.View
        style={[
          styles.drawer,
          {
            backgroundColor: isDark ? '#171717' : '#f9f9f9',
            transform: [{ translateX: drawerAnimation }],
          },
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
  container: { flex: 1 },
  keyboardAvoid: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10 },
  menuButton: { padding: 4 },
  titleButton: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  headerTitle: { fontSize: 18, fontWeight: '600', letterSpacing: 0.2 },
  messagesContainer: { flex: 1 },
  messagesContent: { paddingVertical: 16, paddingBottom: 24 },
  messagesContentEmpty: { flex: 1, justifyContent: 'center' },
  emptyChat: { alignItems: 'center', paddingHorizontal: 24 },
  emptyLogo: { width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  emptyTitle: { fontSize: 24, fontWeight: '600', marginBottom: 40, textAlign: 'center', letterSpacing: 0.3 },
  suggestionsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 12, maxWidth: 600 },
  suggestionChip: { flexDirection: 'column', alignItems: 'flex-start', paddingVertical: 14, paddingHorizontal: 16, borderRadius: 16, borderWidth: 1, width: '47%', minWidth: 150, minHeight: 80, justifyContent: 'space-between' },
  suggestionIcon: { marginBottom: 8, opacity: 0.8 },
  suggestionText: { fontSize: 14, fontWeight: '500', lineHeight: 20 },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 10 },
  drawer: { position: 'absolute', top: 0, left: 0, bottom: 0, width: DRAWER_WIDTH, zIndex: 20, paddingTop: Platform.OS === 'ios' ? 50 : 30 },
  
  loadingHistoryContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingHistoryText: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: '500',
  },

  loadingContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 20, 
    paddingVertical: 10,
    gap: 8,
  },
  loadingText: { 
    fontSize: 14, 
    fontStyle: 'italic',
  },
});