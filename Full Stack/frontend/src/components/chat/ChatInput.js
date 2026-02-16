import React, { useState } from 'react';
import { View, TextInput, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { sendChatMessage } from '../../services/chatService';

const ChatInput = ({ onSend, showCamera = true, userId = null, conversationId = null }) => {
  const { theme } = useTheme();
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSend = async () => {
    if (message.trim() && !isLoading) {
      const userMessage = message.trim();
      setMessage('');
      setIsLoading(true);

      try {
        // Send message to backend
        const response = await sendChatMessage(userMessage);

        if (response.success) {
          // Call parent callback with bot response and user message
          onSend({
            userMessage,
            botResponse: response.data.bot_response,
            extractedData: response.data.extracted_data,
            timestamp: response.data.timestamp,
          });
        } else {
          Alert.alert('Error', response.error || 'Failed to send message');
          // Still send the user message even if backend fails
          onSend({
            userMessage,
            botResponse: 'Error processing message. Please try again.',
          });
        }
      } catch (error) {
        console.error('Error in handleSend:', error);
        Alert.alert('Error', 'Failed to send message. Please check your connection.');
        onSend({
          userMessage,
          botResponse: 'Error: Connection failed',
        });
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleCamera = () => {
    Alert.alert('Coming Soon', 'Camera functionality will be available in Phase 2-3');
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.card, borderTopColor: theme.border }]}>
      {showCamera && (
        <TouchableOpacity 
          style={styles.iconButton} 
          onPress={handleCamera}
          disabled={isLoading}
        >
          <Ionicons name="camera-outline" size={24} color={theme.primary} />
        </TouchableOpacity>
      )}
      <View style={[styles.inputContainer, { backgroundColor: theme.inputBackground }]}>
        <TextInput
          style={[styles.input, { color: theme.text }]}
          placeholder="Type a message..."
          placeholderTextColor={theme.textSecondary}
          value={message}
          onChangeText={setMessage}
          multiline
          maxLength={500}
          editable={!isLoading}
        />
      </View>
      <TouchableOpacity
        style={[
          styles.sendButton,
          { 
            backgroundColor: isLoading ? theme.textSecondary : theme.primary,
            opacity: (!message.trim() || isLoading) ? 0.5 : 1
          }
        ]}
        onPress={handleSend}
        disabled={!message.trim() || isLoading}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color="#ffffff" />
        ) : (
          <Ionicons name="send" size={18} color="#ffffff" />
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    borderTopWidth: 1,
    gap: 8,
  },
  iconButton: {
    padding: 8,
  },
  inputContainer: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    maxHeight: 100,
  },
  input: {
    fontSize: 16,
    lineHeight: 22,
    minHeight: 24,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default ChatInput;
