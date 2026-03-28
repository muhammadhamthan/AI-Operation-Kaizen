import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import Button from './Button'; // Uses our newly upgraded Animated Button

const ErrorState = ({
  title = 'Something went wrong',
  message = 'An error occurred. Please try again.',
  onRetry,
}) => {
  const { theme, isDark } = useTheme();

  // Premium, ultra-subtle red tint for the icon background
  const iconBg = isDark ? 'rgba(239, 68, 68, 0.1)' : 'rgba(239, 68, 68, 0.08)';
  const iconColor = '#ef4444'; // Clean, flat red

  return (
    <View style={styles.container}>
      <View style={[styles.iconContainer, { backgroundColor: iconBg }]}>
        <Ionicons name="warning" size={38} color={iconColor} />
      </View>
      
      <Text style={[styles.title, { color: theme.text }]}>
        {title}
      </Text>
      
      <Text style={[styles.message, { color: theme.textSecondary }]}>
        {message}
      </Text>
      
      {onRetry && (
        <Button
          title="Try Again"
          onPress={onRetry}
          variant="secondary" // Changed from 'danger' to a calm, premium 'secondary' gray
          size="medium"
          fullWidth={false}
          icon="refresh"
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
    maxWidth: 400, // Keeps the layout tight on larger screens/tablets
    alignSelf: 'center',
    width: '100%',
  },
  iconContainer: {
    width: 80, // Refined proportion
    height: 80,
    borderRadius: 40, // Perfect circle
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.1)', // Subtle boundary definition
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  message: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 24, // High-end paragraph spacing
    marginBottom: 12,
    maxWidth: '85%', // Prevents text from stretching too wide
  },
  button: {
    marginTop: 20,
    minWidth: 160, // Gives the button substantial click area
  },
});

export default ErrorState;