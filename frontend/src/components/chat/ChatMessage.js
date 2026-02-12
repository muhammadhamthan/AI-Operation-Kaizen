import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';

const ChatMessage = ({ message, isUser }) => {
  const { theme } = useTheme();

  return (
    <View style={[styles.container, isUser ? styles.userContainer : styles.aiContainer]}>
      <View
        style={[
          styles.bubble,
          isUser
            ? [styles.userBubble, { backgroundColor: theme.primary }]
            : [styles.aiBubble, { backgroundColor: theme.card, borderColor: theme.border }],
        ]}
      >
        <Text
          style={[
            styles.text,
            { color: isUser ? '#ffffff' : theme.text },
          ]}
        >
          {message}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
    paddingHorizontal: 16,
  },
  userContainer: {
    alignItems: 'flex-end',
  },
  aiContainer: {
    alignItems: 'flex-start',
  },
  bubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
  },
  userBubble: {
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    borderBottomLeftRadius: 4,
    borderWidth: 1,
  },
  text: {
    fontSize: 15,
    lineHeight: 22,
  },
});

export default ChatMessage;
