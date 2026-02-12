import React, { useState } from 'react';
import { View, TextInput, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';

const ChatInput = ({ onSend, showCamera = true }) => {
  const { theme } = useTheme();
  const [message, setMessage] = useState('');

  const handleSend = () => {
    if (message.trim()) {
      onSend(message.trim());
      setMessage('');
    }
  };

  const handleCamera = () => {
    Alert.alert('Coming Soon', 'Camera functionality will be available in Phase 2-3');
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.card, borderTopColor: theme.border }]}>
      {showCamera && (
        <TouchableOpacity style={styles.iconButton} onPress={handleCamera}>
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
        />
      </View>
      <TouchableOpacity
        style={[styles.sendButton, { backgroundColor: theme.primary }]}
        onPress={handleSend}
        disabled={!message.trim()}
      >
        <Ionicons name="send" size={18} color="#ffffff" />
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
