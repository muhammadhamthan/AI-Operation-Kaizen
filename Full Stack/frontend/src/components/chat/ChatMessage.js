import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard'; // 📍 IMPORTED CLIPBOARD
import { useTheme } from '../../theme/ThemeContext';
import { formatRelativeTime } from '../../utils/formatters';

// NEW: Added `image` to the destructured props
const ChatMessage = ({ message, image, isUser, timestamp, status = 'sent' }) => {
  const { theme, isDark } = useTheme();
  
  // 📍 STATE for copy animation
  const [copied, setCopied] = useState(false);

  // Smart detection: Handle legacy cases where the image URI is passed as the message string
  const isMessageStringAnImage = 
    typeof message === 'string' &&
    (message.startsWith('file://') || 
     message.startsWith('content://') || 
     message.match(/\.(jpeg|jpg|gif|png)$/i));

  // Determine exactly what to render
  const imageUrl = image || (isMessageStringAnImage ? message : null);
  const textContent = isMessageStringAnImage ? null : message;

  // Exact ChatGPT Color Palette
  const userBubbleBg = isDark ? '#2f2f2f' : '#f4f4f4';
  const aiAvatarBg = isDark ? '#ffffff' : '#000000';
  const aiIconColor = isDark ? '#000000' : '#ffffff';

  // 📍 COPY FUNCTION
  const handleCopy = async () => {
    if (!textContent) return;
    await Clipboard.setStringAsync(textContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000); // Reset after 2 seconds
  };

  return (
    <View style={[styles.container, isUser ? styles.userContainer : styles.aiContainer]}>
      
      {/* ── AI Avatar (ChatGPT 4o Style) ── */}
      {!isUser && (
        <View style={[styles.avatar, { backgroundColor: aiAvatarBg }]}>
          <Ionicons name="sparkles" size={16} color={aiIconColor} />
        </View>
      )}

      <View style={[styles.contentWrapper, isUser ? styles.userContentWrapper : styles.aiContentWrapper]}>
        
        {/* Label (ChatGPT removed these for a cleaner look, so we make it super subtle) */}
        {!isUser && (
          <Text style={[styles.label, { color: theme.textSecondary }]}>MaintenanceFlow AI</Text>
        )}

        {/* ── Message Bubble ── */}
        <View
          style={[
            styles.bubble,
            isUser ? [styles.userBubble, { backgroundColor: userBubbleBg }] : styles.aiBubble,
          ]}
        >
          {/* 1. Render Image if it exists */}
          {imageUrl && (
            <Image 
              source={{ uri: imageUrl }} 
              style={styles.mediaImage} 
              resizeMode="cover"
            />
          )}

          {/* 2. Render Text if it exists */}
          {textContent ? (
            <Text 
              style={[
                styles.text, 
                { 
                  color: theme.text,
                  // Add margin to separate text from image if BOTH exist
                  marginTop: imageUrl ? 10 : 0 
                }
              ]}
            >
              {textContent}
            </Text>
          ) : null}
        </View>

        {/* ── Footer: Timestamp & Read Receipts ── */}
        <View style={[styles.footer, isUser ? styles.footerUser : styles.footerAi]}>
          {timestamp && (
            <Text style={[styles.timestamp, { color: theme.textSecondary }]}>
              {formatRelativeTime(timestamp)}
            </Text>
          )}

          {/* 📍 NEW COPY BUTTON */}
          {textContent && (
            <TouchableOpacity 
              onPress={handleCopy} 
              activeOpacity={0.6} 
              style={styles.copyButton}
            >
              <Ionicons 
                name={copied ? "checkmark-done" : "copy-outline"} 
                size={12} 
                color={copied ? "#10a37f" : theme.textSecondary} 
              />
              {copied && <Text style={[styles.copiedText, { color: "#10a37f" }]}>Copied</Text>}
            </TouchableOpacity>
          )}

          {isUser && status && (
            <View style={styles.statusContainer}>
              {status === 'sending' && (
                <Ionicons name="time-outline" size={12} color={theme.textSecondary} />
              )}
              {status === 'sent' && (
                <Ionicons name="checkmark" size={12} color={theme.textSecondary} />
              )}
              {status === 'delivered' && (
                <Ionicons name="checkmark-done" size={12} color={theme.textSecondary} />
              )}
              {status === 'read' && (
                <Ionicons name="checkmark-done" size={12} color="#10a37f" /> // OpenAI Green
              )}
            </View>
          )}
        </View>

      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginVertical: 14, 
    paddingHorizontal: 16,
  },
  userContainer: {
    justifyContent: 'flex-end',
  },
  aiContainer: {
    justifyContent: 'flex-start',
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14, 
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 2, 
  },
  contentWrapper: {
    flexShrink: 1,
  },
  userContentWrapper: {
    maxWidth: '85%', 
  },
  aiContentWrapper: {
    maxWidth: '90%', 
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
    opacity: 0.5, 
  },
  bubble: {
    // Pure flat UI
  },
  userBubble: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20, 
    borderBottomRightRadius: 6, 
  },
  aiBubble: {
    paddingHorizontal: 0, 
    paddingVertical: 4,
    backgroundColor: 'transparent', 
  },
  mediaImage: {
    width: 220,
    height: 280,
    borderRadius: 12, // Slightly tighter curves to fit inside the bubble natively
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)', 
  },
  text: {
    fontSize: 16, 
    lineHeight: 24, 
    letterSpacing: 0.1,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  footerUser: {
    justifyContent: 'flex-end',
  },
  footerAi: {
    justifyContent: 'flex-start',
  },
  timestamp: {
    fontSize: 11,
    fontWeight: '400',
    opacity: 0.6,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 2,
  },
  // 📍 NEW STYLES FOR COPY BUTTON
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginLeft: 4,
  },
  copiedText: {
    fontSize: 11,
    fontWeight: '600',
  },
});

export default ChatMessage;