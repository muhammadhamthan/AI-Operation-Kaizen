import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';

/**
 * Lightweight message bubble used in both personal and group chat.
 * Left-aligned for messages from others, right-aligned for own messages.
 */
const ChatBubble = ({ text, isOwn, senderName, showSender, ts, tint }) => {
  const { theme, isDark } = useTheme();
  const t = new Date(ts);
  const timeLabel = !isNaN(t)
    ? t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '';

  const bgOwn = tint || theme.primary;
  const bgOther = isDark ? '#2a2a2a' : '#f0f0f1';
  const textOwn = '#ffffff';
  const textOther = theme.text;

  return (
    <View style={[styles.wrap, isOwn ? styles.alignRight : styles.alignLeft]}>
      {!isOwn && showSender && senderName && (
        <Text style={[styles.sender, { color: theme.textSecondary }]}>{senderName}</Text>
      )}
      <View
        style={[
          styles.bubble,
          isOwn
            ? { backgroundColor: bgOwn, borderTopRightRadius: 4 }
            : { backgroundColor: bgOther, borderTopLeftRadius: 4 },
        ]}
      >
        <Text style={[styles.text, { color: isOwn ? textOwn : textOther }]}>
          {text}
        </Text>
      </View>
      {!!timeLabel && (
        <Text style={[styles.time, { color: theme.textSecondary }]}>{timeLabel}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { marginVertical: 4, maxWidth: '78%' },
  alignLeft: { alignSelf: 'flex-start' },
  alignRight: { alignSelf: 'flex-end', alignItems: 'flex-end' },
  sender: { fontSize: 11, fontWeight: '600', marginBottom: 2, paddingHorizontal: 12 },
  bubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    maxWidth: '100%',
  },
  text: { fontSize: 14, lineHeight: 20 },
  time: { fontSize: 10, marginTop: 2, paddingHorizontal: 8 },
});

export default ChatBubble;
