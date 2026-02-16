import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';

const Loader = ({ message = 'Loading...', fullScreen = true }) => {
  const { theme } = useTheme();

  const content = (
    <View style={[styles.content, !fullScreen && styles.inline]}>
      <ActivityIndicator size="large" color={theme.primary} />
      {message && (
        <Text style={[styles.message, { color: theme.textSecondary }]}>
          {message}
        </Text>
      )}
    </View>
  );

  if (fullScreen) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
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
    padding: 32,
  },
  message: {
    marginTop: 16,
    fontSize: 16,
  },
});

export default Loader;
