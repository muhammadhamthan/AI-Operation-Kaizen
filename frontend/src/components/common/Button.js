import React, { useRef } from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, View, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';

const Button = ({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  icon,
  iconPosition = 'left',
  size = 'large', // Defaulted to large for the premium feel
  fullWidth = true,
  style,
}) => {
  const { theme, isDark } = useTheme();
  
  // Animation for a premium tactile click feel
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.96,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 4,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  // ── ChatGPT Style Color Logic ──
  const getBackgroundColor = () => {
    if (disabled) return isDark ? '#2f2f2f' : '#e5e5e5';
    switch (variant) {
      case 'primary': return isDark ? '#ffffff' : '#000000'; // High contrast
      case 'secondary': return isDark ? '#2f2f2f' : '#f4f4f4'; // Soft gray
      case 'danger': return '#ef4444';
      case 'success': return '#10a37f'; // OpenAI Green
      case 'outline': return 'transparent';
      default: return isDark ? '#ffffff' : '#000000';
    }
  };

  const getTextColor = () => {
    if (disabled) return isDark ? '#666666' : '#9ca3af';
    switch (variant) {
      case 'primary': return isDark ? '#000000' : '#ffffff';
      case 'secondary': return theme.text;
      case 'danger': return '#ffffff';
      case 'success': return '#ffffff';
      case 'outline': return theme.text;
      default: return isDark ? '#000000' : '#ffffff';
    }
  };

  const getBorderColor = () => {
    switch (variant) {
      case 'outline': return isDark ? '#424242' : '#e5e5e5';
      default: return 'transparent';
    }
  };

  const getPadding = () => {
    switch (size) {
      case 'small': return { paddingVertical: 10, paddingHorizontal: 16 };
      case 'large': return { paddingVertical: 16, paddingHorizontal: 24 };
      default: return { paddingVertical: 14, paddingHorizontal: 20 };
    }
  };

  const getFontSize = () => {
    switch (size) {
      case 'small': return 14;
      case 'large': return 16;
      default: return 15;
    }
  };

  return (
    <Animated.View style={[{ transform: [{ scale: scaleAnim }] }, fullWidth && styles.fullWidth, style]}>
      <TouchableOpacity
        style={[
          styles.button,
          {
            backgroundColor: getBackgroundColor(),
            borderColor: getBorderColor(),
            borderWidth: variant === 'outline' ? 1 : 0,
            ...getPadding(),
          },
        ]}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || loading}
        activeOpacity={0.9} // Relies on the scale animation rather than fading out
      >
        {loading ? (
          <ActivityIndicator color={getTextColor()} size="small" />
        ) : (
          <View style={styles.content}>
            {icon && iconPosition === 'left' && (
              <Ionicons name={icon} size={getFontSize() + 4} color={getTextColor()} style={styles.iconLeft} />
            )}
            <Text style={[styles.text, { color: getTextColor(), fontSize: getFontSize() }]}>
              {title}
            </Text>
            {icon && iconPosition === 'right' && (
              <Ionicons name={icon} size={getFontSize() + 4} color={getTextColor()} style={styles.iconRight} />
            )}
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: 16, // Smoother squircle shape
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullWidth: {
    width: '100%',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  iconLeft: {
    marginRight: 8,
  },
  iconRight: {
    marginLeft: 8,
  },
});

export default Button;