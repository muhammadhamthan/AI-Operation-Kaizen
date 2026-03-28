import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';

const Loader = ({ message = 'Loading...', fullScreen = true }) => {
  const { theme, isDark } = useTheme();

  // Premium OpenAI Style Palette
  const spinnerColor = isDark ? '#ffffff' : '#000000'; // High contrast
  const textColor = isDark ? '#8e8ea0' : '#6e6e80'; // Signature muted gray
  const bgFullScreen = isDark ? '#212121' : '#ffffff'; // Seamless background match

  const content = (
    <View style={[styles.content, !fullScreen && styles.inline]}>
      <ActivityIndicator size="large" color={spinnerColor} />
      {message && (
        <Text style={[styles.message, { color: textColor }]}>
          {message}
        </Text>
      )}
    </View>
  );

  if (fullScreen) {
    return (
      <View style={[styles.container, { backgroundColor: bgFullScreen }]}>
        {content}
      </View>
    );
  }

  return content;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  inline: {
    padding: 40, // Generous padding so it doesn't crowd lists or cards
  },
  message: {
    marginTop: 20, // Extra breathing room below the spinner
    fontSize: 14, // Refined, slightly smaller text
    fontWeight: '500', // Medium weight for legibility
    letterSpacing: 0.5, // Premium tracking
    textTransform: 'uppercase', // Optional: Gives a very system-level, technical feel
  },
});

export default Loader;