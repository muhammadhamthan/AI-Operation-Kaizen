import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import Button from './Button'; // This will automatically use your beautifully upgraded Button!

const EmptyState = ({
  icon = 'document-text-outline',
  title = 'No data found',
  message = 'There is nothing to display at the moment.',
  actionLabel,
  onAction,
}) => {
  const { theme, isDark } = useTheme();

  // Premium Muted Palette
  const iconBg = isDark ? '#2a2a2a' : '#f7f7f8';
  const iconColor = isDark ? '#8e8ea0' : '#6e6e80'; // OpenAI's signature muted gray

  return (
    <View style={styles.container}>
      <View style={[styles.iconContainer, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={42} color={iconColor} />
      </View>
      
      <Text style={[styles.title, { color: theme.text }]}>
        {title}
      </Text>
      
      <Text style={[styles.message, { color: theme.textSecondary }]}>
        {message}
      </Text>
      
      {actionLabel && onAction && (
        <Button
          title={actionLabel}
          onPress={onAction}
          variant="secondary" // Uses the sleek flat-gray variant we just built
          size="medium"
          fullWidth={false}
          style={styles.button}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    maxWidth: 400, // Keeps the text from stretching too wide on tablets
    alignSelf: 'center',
    width: '100%',
  },
  iconContainer: {
    width: 80, // Slightly more refined size
    height: 80,
    borderRadius: 40, // Perfect circle
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(128,128,128,0.08)', // Subtle edge definition
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
    letterSpacing: 0.3, // Premium typography tracking
  },
  message: {
    fontSize: 15, // Slightly larger for readability
    textAlign: 'center',
    lineHeight: 24, // Generous breathing room
    marginBottom: 12,
    maxWidth: '85%', // Prevents orphans (single words on a new line)
  },
  button: {
    marginTop: 20,
    minWidth: 160, // Ensures the button doesn't look too tiny with short words
  },
});

export default EmptyState;