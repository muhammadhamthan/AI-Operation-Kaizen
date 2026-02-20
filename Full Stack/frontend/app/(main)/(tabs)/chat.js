// import React, { useEffect, useState, useRef, useCallback } from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   ScrollView,
//   TouchableOpacity,
//   Animated,
//   Dimensions,
//   Platform,
//   KeyboardAvoidingView,
// } from 'react-native';
// import { SafeAreaView } from 'react-native-safe-area-context';
// import { useRouter } from 'expo-router';
// import { useDispatch, useSelector } from 'react-redux';
// import { Ionicons } from '@expo/vector-icons';
// import { useTheme } from '../../../src/theme/ThemeContext';
// import { selectCurrentUser } from '../../../src/store/slices/authSlice';
// import {
//   selectAllMessages,
//   selectChatHistory,
//   addMessage,
//   loadChatHistory,
//   loadConversation,
//   startNewConversation,
// } from '../../../src/store/slices/chatSlice';
// import { selectUnreadCount, selectNotifications, markAllAsRead, markAsRead, setNotifications } from '../../../src/store/slices/notificationsSlice';
// import NotificationBanner from '../../../src/components/chat/NotificationBanner';
// import ChatMessage from '../../../src/components/chat/ChatMessage';
// import ChatInput from '../../../src/components/chat/ChatInput';
// import ChatHistorySidebar from '../../../src/components/chat/ChatHistorySidebar';
// import Avatar from '../../../src/components/common/Avatar';
// import { navigateToNotification } from '../../../src/utils/notificationNavigation';

// const { width: SCREEN_WIDTH } = Dimensions.get('window');
// const DRAWER_WIDTH = 280;

// const SUGGESTIONS = [
//   { icon: 'document-text-outline', text: 'Show overdue issues' },
//   { icon: 'bar-chart-outline', text: 'Weekly analytics report' },
//   { icon: 'people-outline', text: 'Team performance summary' },
//   { icon: 'alert-circle-outline', text: 'Unresolved complaints' },
// ];

// export default function ChatScreen() {
//   const { theme, isDark } = useTheme();
//   const router = useRouter();
//   const dispatch = useDispatch();
//   const user = useSelector(selectCurrentUser);
//   const messages = useSelector(selectAllMessages);
//   const chatHistory = useSelector(selectChatHistory);
//   const unreadCount = useSelector(selectUnreadCount);
//   const notifications = useSelector(selectNotifications);
//   const scrollViewRef = useRef(null);

//   const [drawerOpen, setDrawerOpen] = useState(false);
//   const [selectedConversation, setSelectedConversation] = useState(null);
//   const drawerAnimation = useRef(new Animated.Value(-DRAWER_WIDTH)).current;

//   useEffect(() => {
//     if (user?.id) {
//       dispatch(loadChatHistory());
//       setSelectedConversation(null);
//     }
    
//     dispatch(setNotifications([
//       { id: 1, type: 'issue_assigned', title: 'New issue assigned', body: 'Issue #8 has been assigned to you', data: { issueId: 8 }, read: false },
//       { id: 2, type: 'issue_reopened', title: 'Issue reopened', body: 'Issue #15 was reopened by supervisor', data: { issueId: 15 }, read: false },
//       { id: 3, type: 'complaint_created', title: 'Complaint raised', body: 'A new complaint has been filed', data: { complaintId: 1 }, read: false },
//     ]));
//   }, [user?.id, dispatch]);

//   const toggleDrawer = useCallback(() => {
//     const toValue = drawerOpen ? -DRAWER_WIDTH : 0;
//     Animated.timing(drawerAnimation, {
//       toValue,
//       duration: 250,
//       useNativeDriver: true,
//     }).start(() => {
//       if (drawerOpen) setDrawerOpen(false);
//     });
//     if (!drawerOpen) setDrawerOpen(true);
//   }, [drawerOpen, drawerAnimation]);

//   const handleSelectConversation = (conversationId) => {
//     dispatch(loadConversation(conversationId));
//     setSelectedConversation(conversationId);
//     toggleDrawer();
//   };

//   const handleNewChat = () => {
//     dispatch(startNewConversation());
//     setSelectedConversation(null);
//     toggleDrawer();
//   };

//   // 🚀 THE FIX: Now accepts text, image, AND location!
//   const handleSendMessage = (text, image = null, location = null) => {
//     const userMessage = {
//       id: Date.now(),
//       message: text || '', 
//       image: image,        
//       location: location,  // 📍 NEW: Store the location payload in Redux
//       role_in_chat: 'user',
//       user_id: user?.id,
//       created_at: new Date().toISOString(),
//     };
//     console.log("message dispatched ",userMessage)
//     dispatch(addMessage(userMessage));

//     // Smart AI response logic acknowledging the new data types
//     setTimeout(() => {
//       let responseText = '';
      
//       if (image || location) {
//         responseText = `I received your ${image ? 'image' : ''}${image && location ? ' and ' : ''}${location ? 'location data' : ''}${text ? ` along with your message: "${text}"` : '.'}\n\nIn Phase 2-3, this will automatically generate a fully enriched maintenance ticket.`;
//       } else {
//         responseText = `I understand you asked about: "${text}"\n\nThis is a placeholder response. In Phase 2-3, this will be connected to an actual AI assistant.`;
//       }

//       const aiMessage = {
//         id: Date.now() + 1,
//         message: responseText,
//         role_in_chat: 'assistant',
//         user_id: null,
//         created_at: new Date().toISOString(),
//       };
//       dispatch(addMessage(aiMessage));
//     }, 1000);
//   };

//   const handleSuggestionPress = (text) => {
//     handleSendMessage(text);
//   };

//   const handleNotificationPress = (notification) => {
//     if (!notification) return;
//     dispatch(markAsRead(notification.id));
//     navigateToNotification(notification);
//   };

//   const handleNotificationDismiss = () => {
//     dispatch(markAllAsRead());
//   };

//   const showCamera = user?.role !== 'manager';

//   const screenBg = isDark ? '#212121' : '#ffffff';
//   const headerBg = screenBg; 
//   const logoBg = isDark ? '#ffffff' : '#000000';
//   const logoIconColor = isDark ? '#000000' : '#ffffff';

//   return (
//     <SafeAreaView style={[styles.container, { backgroundColor: screenBg }]}>
//       <View style={[styles.header, { backgroundColor: headerBg }]}>
//         <TouchableOpacity style={styles.menuButton} onPress={toggleDrawer}>
//           <Ionicons name="menu-outline" size={26} color={theme.text} />
//         </TouchableOpacity>

//         <TouchableOpacity style={styles.titleButton} activeOpacity={0.7}>
//           <Text style={[styles.headerTitle, { color: theme.text }]}>MaintenanceFlow</Text>
//           <Ionicons name="chevron-down" size={14} color={theme.textSecondary} />
//         </TouchableOpacity>

//         <TouchableOpacity onPress={() => router.push('/(main)/profile')}>
//           <Avatar uri={user?.avatar} name={user?.name} size="small" />
//         </TouchableOpacity>
//       </View>

//       <NotificationBanner
//         count={unreadCount}
//         notifications={notifications}
//         onPress={handleNotificationPress}
//         onDismiss={handleNotificationDismiss}
//         onMarkRead={(id) => dispatch(markAsRead(id))}
//       />

//       <KeyboardAvoidingView 
//         style={styles.keyboardAvoid} 
//         behavior={Platform.OS === 'ios' ? 'padding' : undefined}
//       >
//         <ScrollView
//           ref={scrollViewRef}
//           style={styles.messagesContainer}
//           contentContainerStyle={[
//             styles.messagesContent,
//             messages.length === 0 && styles.messagesContentEmpty,
//           ]}
//           onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
//           showsVerticalScrollIndicator={false}
//         >
//           {messages.length === 0 ? (
//             <View style={styles.emptyChat}>
//               <View style={[styles.emptyLogo, { backgroundColor: logoBg }]}>
//                 <Ionicons name="sparkles" size={28} color={logoIconColor} />
//               </View>

//               <Text style={[styles.emptyTitle, { color: theme.text }]}>
//                 How can I help you today?
//               </Text>

//               <View style={styles.suggestionsGrid}>
//                 {SUGGESTIONS.map((suggestion, index) => (
//                   <TouchableOpacity
//                     key={index}
//                     style={[
//                       styles.suggestionChip,
//                       {
//                         backgroundColor: 'transparent',
//                         borderColor: isDark ? '#424242' : '#e5e5e5',
//                       },
//                     ]}
//                     onPress={() => handleSuggestionPress(suggestion.text)}
//                     activeOpacity={0.5}
//                   >
//                     <Ionicons
//                       name={suggestion.icon}
//                       size={18}
//                       color={theme.textSecondary}
//                       style={styles.suggestionIcon}
//                     />
//                     <Text style={[styles.suggestionText, { color: theme.textSecondary }]}>
//                       {suggestion.text}
//                     </Text>
//                   </TouchableOpacity>
//                 ))}
//               </View>
//             </View>
//           ) : (
//             messages.map((msg) => (
//               <ChatMessage
//                 key={msg.id}
//                 message={msg.message}
//                 image={msg.image} 
//                 location={msg.location} // 📍 THE FIX: Pass the location down!
//                 isUser={msg.role_in_chat === 'user'}
//                 timestamp={msg.created_at}
//               />
//             ))
//           )}
//         </ScrollView>

//         <ChatInput onSend={handleSendMessage} showCamera={showCamera} />
//       </KeyboardAvoidingView>

//       {drawerOpen && (
//         <TouchableOpacity
//           style={styles.overlay}
//           activeOpacity={1}
//           onPress={toggleDrawer}
//         />
//       )}

//       <Animated.View
//         style={[
//           styles.drawer,
//           {
//             backgroundColor: isDark ? '#171717' : '#f9f9f9',
//             transform: [{ translateX: drawerAnimation }],
//           },
//         ]}
//       >
//         <ChatHistorySidebar
//           conversations={chatHistory}
//           onSelectConversation={handleSelectConversation}
//           onNewChat={handleNewChat}
//           selectedId={selectedConversation}
//         />
//       </Animated.View>
//     </SafeAreaView>
//   );
// }

// const styles = StyleSheet.create({
//   container: { flex: 1 },
//   keyboardAvoid: { flex: 1 },
//   header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10 },
//   menuButton: { padding: 4 },
//   titleButton: { flexDirection: 'row', alignItems: 'center', gap: 6 },
//   headerTitle: { fontSize: 18, fontWeight: '600', letterSpacing: 0.2 },
//   messagesContainer: { flex: 1 },
//   messagesContent: { paddingVertical: 16, paddingBottom: 24 },
//   messagesContentEmpty: { flex: 1, justifyContent: 'center' },
//   emptyChat: { alignItems: 'center', paddingHorizontal: 24 },
//   emptyLogo: { width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
//   emptyTitle: { fontSize: 24, fontWeight: '600', marginBottom: 40, textAlign: 'center', letterSpacing: 0.3 },
//   suggestionsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 12, maxWidth: 600 },
//   suggestionChip: { flexDirection: 'column', alignItems: 'flex-start', paddingVertical: 14, paddingHorizontal: 16, borderRadius: 16, borderWidth: 1, width: '47%', minWidth: 150, minHeight: 80, justifyContent: 'space-between' },
//   suggestionIcon: { marginBottom: 8, opacity: 0.8 },
//   suggestionText: { fontSize: 14, fontWeight: '500', lineHeight: 20 },
//   overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 10 },
//   drawer: { position: 'absolute', top: 0, left: 0, bottom: 0, width: DRAWER_WIDTH, zIndex: 20, paddingTop: Platform.OS === 'ios' ? 50 : 30 },
// });



// app/(main)/(tabs)/chat.js

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';

// ✅ INLINE selectors — no external imports that might be undefined
const selectMessages = (state) => state.chat?.messages || [];
const selectChatSending = (state) => state.chat?.sending || false;
const selectCurrentUser = (state) => state.auth?.user || { name: 'User' };

export default function ChatScreen() {
  // ✅ Debug: log what we get
  const messages = useSelector(selectMessages);
  const sending = useSelector(selectChatSending);
  const user = useSelector(selectCurrentUser);
  const dispatch = useDispatch();

  const [input, setInput] = useState('');
  const [localMessages, setLocalMessages] = useState([]);
  const flatListRef = useRef(null);

  const handleSend = async () => {
    if (!input.trim() || sending) return;

    const userMsg = {
      id: Date.now(),
      role: 'user',
      message: input.trim(),
      createdAt: new Date().toISOString(),
    };

    // Add user message locally
    setLocalMessages((prev) => [...prev, userMsg]);
    const currentInput = input.trim();
    setInput('');

    // Call backend directly (bypass Redux to isolate the issue)
    try {
      const { sendChatMessage } = require('../../../src/services/api');

      // Show typing indicator
      const typingMsg = {
        id: Date.now() + 1,
        role: 'ai',
        message: '⏳ Thinking...',
        isTyping: true,
        createdAt: new Date().toISOString(),
      };
      setLocalMessages((prev) => [...prev, typingMsg]);

      const result = await sendChatMessage(currentInput);

      // Remove typing indicator and add real response
      setLocalMessages((prev) => {
        const filtered = prev.filter((m) => !m.isTyping);
        return [
          ...filtered,
          {
            id: Date.now() + 2,
            role: 'ai',
            message: result.success
              ? result.message
              : `❌ ${result.error || 'Failed to get response'}`,
            intent: result.intent,
            createdAt: new Date().toISOString(),
          },
        ];
      });
    } catch (error) {
      setLocalMessages((prev) => {
        const filtered = prev.filter((m) => !m.isTyping);
        return [
          ...filtered,
          {
            id: Date.now() + 2,
            role: 'ai',
            message: `❌ Error: ${error.message}`,
            createdAt: new Date().toISOString(),
          },
        ];
      });
    }
  };

  const allMessages = localMessages;

  const renderMessage = ({ item }) => {
    const isUser = item.role === 'user';

    return (
      <View
        style={[
          styles.messageBubble,
          isUser ? styles.userBubble : styles.aiBubble,
        ]}
      >
        <Text style={styles.roleLabel}>
          {isUser ? '👤 You' : '🤖 AI'}
        </Text>
        <Text
          style={[
            styles.messageText,
            isUser ? styles.userText : styles.aiText,
            item.isTyping && styles.typingText,
          ]}
        >
          {item.message}
        </Text>
        {item.intent && (
          <Text style={styles.intentLabel}>Intent: {item.intent}</Text>
        )}
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={90}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🤖 AI Assistant</Text>
        <Text style={styles.headerSubtitle}>
          Ask about issues, assignments, or query data
        </Text>
      </View>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={allMessages}
        renderItem={renderMessage}
        keyExtractor={(item) => String(item.id)}
        style={styles.messageList}
        contentContainerStyle={styles.messageListContent}
        onContentSizeChange={() =>
          flatListRef.current?.scrollToEnd({ animated: true })
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>👋</Text>
            <Text style={styles.emptyText}>
              Hello {user?.name || 'there'}!
            </Text>
            <Text style={styles.emptySubtext}>
              Try asking:
            </Text>
            <View style={styles.exampleContainer}>
              {[
                '"Show all open issues"',
                '"Who fixed issue 1?"',
                '"Issues created today"',
                '"Give me supervisor id 2"',
                '"Complaints for issue 3"',
              ].map((example, i) => (
                <TouchableOpacity
                  key={i}
                  style={styles.exampleChip}
                  onPress={() => setInput(example.replace(/"/g, ''))}
                >
                  <Text style={styles.exampleText}>{example}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        }
      />

      {/* Input */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.textInput}
          value={input}
          onChangeText={setInput}
          placeholder="Type your message..."
          placeholderTextColor="#999"
          multiline
          maxLength={500}
          returnKeyType="send"
          onSubmitEditing={handleSend}
        />
        <TouchableOpacity
          style={[
            styles.sendButton,
            (!input.trim()) && styles.sendButtonDisabled,
          ]}
          onPress={handleSend}
          disabled={!input.trim()}
        >
          <Text style={styles.sendButtonText}>Send</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#2196F3',
    padding: 16,
    paddingTop: Platform.OS === 'web' ? 16 : 50,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    color: '#e3f2fd',
    fontSize: 12,
    marginTop: 4,
  },
  messageList: {
    flex: 1,
  },
  messageListContent: {
    padding: 16,
    paddingBottom: 8,
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
    marginBottom: 8,
  },
  userBubble: {
    backgroundColor: '#2196F3',
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    backgroundColor: '#fff',
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  roleLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginBottom: 4,
    opacity: 0.7,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
  },
  userText: {
    color: '#fff',
  },
  aiText: {
    color: '#333',
  },
  typingText: {
    fontStyle: 'italic',
    opacity: 0.7,
  },
  intentLabel: {
    fontSize: 10,
    color: '#888',
    marginTop: 4,
    fontStyle: 'italic',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    marginBottom: 16,
  },
  exampleContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 20,
  },
  exampleChip: {
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#bbdefb',
  },
  exampleText: {
    color: '#1565C0',
    fontSize: 13,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  textInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    backgroundColor: '#f9f9f9',
    marginRight: 8,
  },
  sendButton: {
    backgroundColor: '#2196F3',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 60,
  },
  sendButtonDisabled: {
    backgroundColor: '#ccc',
  },
  sendButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
});