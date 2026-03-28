import React, { useRef } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  Animated,
  ActivityIndicator,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { mediumImpact } from '../../utils/haptics';

/**
 * Animated Button with haptic feedback
 * 
 * @param {string} title - Button text
 * @param {Function} onPress - Press handler
 * @param {string} variant - 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
 * @param {string} size - 'small' | 'medium' | 'large'
 * @param {string} icon - Ionicons icon name
 * @param {boolean} loading - Show loading indicator
 * @param {boolean} disabled - Disable button
 * @param {boolean} fullWidth - Take full width
 * @param {Object} style - Additional styles
 */
const AnimatedButton = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  icon,
  iconPosition = 'left',
  loading = false,
  disabled = false,
  fullWidth = false,
  haptic = true,
  style,
}) => {
  const { theme } = useTheme();
  const scaleValue = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleValue, {
      toValue: 0.96,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleValue, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  };

  const handlePress = () => {
    if (haptic) {
      mediumImpact();
    }
    onPress?.();
  };

  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return {
          button: { backgroundColor: theme.primary },
          text: { color: '#ffffff' },
          icon: '#ffffff',
        };
      case 'secondary':
        return {
          button: { backgroundColor: theme.inputBackground },
          text: { color: theme.text },
          icon: theme.text,
        };
      case 'outline':
        return {
          button: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: theme.primary },
          text: { color: theme.primary },
          icon: theme.primary,
        };
      case 'ghost':
        return {
          button: { backgroundColor: 'transparent' },
          text: { color: theme.primary },
          icon: theme.primary,
        };
      case 'danger':
        return {
          button: { backgroundColor: '#ef4444' },
          text: { color: '#ffffff' },
          icon: '#ffffff',
        };
      default:
        return {
          button: { backgroundColor: theme.primary },
          text: { color: '#ffffff' },
          icon: '#ffffff',
        };
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return {
          button: { paddingVertical: 8, paddingHorizontal: 14 },
          text: { fontSize: 13 },
          iconSize: 16,
        };
      case 'large':
        return {
          button: { paddingVertical: 16, paddingHorizontal: 24 },
          text: { fontSize: 17 },
          iconSize: 22,
        };
      default:
        return {
          button: { paddingVertical: 12, paddingHorizontal: 20 },
          text: { fontSize: 15 },
          iconSize: 18,
        };
    }
  };

  const variantStyles = getVariantStyles();
  const sizeStyles = getSizeStyles();

  const isDisabled = disabled || loading;

  return (
    <Animated.View style={[{ transform: [{ scale: scaleValue }] }, fullWidth && styles.fullWidth]}>
      <TouchableOpacity
        style={[
          styles.button,
          variantStyles.button,
          sizeStyles.button,
          fullWidth && styles.fullWidth,
          isDisabled && styles.disabled,
          style,
        ]}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={isDisabled}
        activeOpacity={0.8}
      >
        {loading ? (
          <ActivityIndicator size="small" color={variantStyles.icon} />
        ) : (
          <View style={styles.content}>
            {icon && iconPosition === 'left' && (
              <Ionicons
                name={icon}
                size={sizeStyles.iconSize}
                color={isDisabled ? theme.textSecondary : variantStyles.icon}
                style={styles.iconLeft}
              />
            )}
            {title && (
              <Text
                style={[
                  styles.text,
                  variantStyles.text,
                  sizeStyles.text,
                  isDisabled && { color: theme.textSecondary },
                ]}
              >
                {title}
              </Text>
            )}
            {icon && iconPosition === 'right' && (
              <Ionicons
                name={icon}
                size={sizeStyles.iconSize}
                color={isDisabled ? theme.textSecondary : variantStyles.icon}
                style={styles.iconRight}
              />
            )}
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  fullWidth: {
    width: '100%',
  },
  disabled: {
    opacity: 0.5,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontWeight: '600',
  },
  iconLeft: {
    marginRight: 8,
  },
  iconRight: {
    marginLeft: 8,
  },
});

export default AnimatedButton;
