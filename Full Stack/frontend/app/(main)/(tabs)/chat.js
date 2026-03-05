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
  selectCurrentConversationId
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
  const scrollViewRef = useRef(null);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const drawerAnimation = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const currentSessionId = useSelector(selectCurrentConversationId);

  useEffect(() => {
    if (user?.id) {
      dispatch(loadChatHistory());
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

  // 🚀 THE FIX: Now accepts text, image, AND location!
  // const handleSendMessage = (text, image = null, location = null) => {
  //   const userMessage = {
  //     id: Date.now(),
  //     message: text || '', 
  //     image: image,        
  //     location: location,  // 📍 NEW: Store the location payload in Redux
  //     role_in_chat: 'user',
  //     user_id: user?.id,
  //     created_at: new Date().toISOString(),
  //   };
  //   console.log("message dispatched ",userMessage)
  //   dispatch(addMessage(userMessage));

  //   // Smart AI response logic acknowledging the new data types
  //   setTimeout(() => {
  //     let responseText = '';
      
  //     if (image || location) {
  //       responseText = `I received your ${image ? 'image' : ''}${image && location ? ' and ' : ''}${location ? 'location data' : ''}${text ? ` along with your message: "${text}"` : '.'}\n\nIn Phase 2-3, this will automatically generate a fully enriched maintenance ticket.`;
  //     } else {
  //       responseText = `I understand you asked about: "${text}"\n\nThis is a placeholder response. In Phase 2-3, this will be connected to an actual AI assistant.`;
  //     }

  //     const aiMessage = {
  //       id: Date.now() + 1,
  //       message: responseText,
  //       role_in_chat: 'assistant',
  //       user_id: null,
  //       created_at: new Date().toISOString(),
  //     };
  //     dispatch(addMessage(aiMessage));
  //   }, 1000);
  // };


  const handleSendMessage = async (text) => {
  const userMessage = {
    id: Date.now(),
    message: text,
    role_in_chat: 'USER',
    created_at: new Date().toISOString(),
  };

  dispatch(addMessage(userMessage));

  try {
    const result = await sendChatMessage(
      text,
      currentSessionId // ✅ SEND SESSION ID
    );

    if (!result.success) return;

    const response = result.data;

    // ✅ VERY IMPORTANT
    // Store session_id if this was first message
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
            messages.length === 0 && styles.messagesContentEmpty,
          ]}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
          showsVerticalScrollIndicator={false}
        >
          {messages.length === 0 ? (
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
                image={msg.image} 
                location={msg.location} // 📍 THE FIX: Pass the location down!
                isUser={msg.role_in_chat === 'USER'}
                timestamp={msg.created_at}
              />
            ))
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
});