import React, { useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Animated, Platform } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { mediumImpact } from '../../utils/haptics'; // Utilizing your haptics!

const Card = ({ 
  children, 
  style, 
  onPress, 
  disabled = false,
  variant = 'outlined', // 'outlined' | 'filled' | 'elevated'
}) => {
  const { theme, isDark } = useTheme();
  
  // Physics-based animations
  const scaleValue = useRef(new Animated.Value(1)).current;
  const opacityValue = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    if (!disabled) {
      mediumImpact();
      Animated.parallel([
        Animated.spring(scaleValue, {
          toValue: 0.97, // Slightly deeper physical press
          useNativeDriver: true,
          speed: 50,
          bounciness: 4,
        }),
        Animated.timing(opacityValue, {
          toValue: 0.85, // Smooth optical fade
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();
    }
  };

  const handlePressOut = () => {
    Animated.parallel([
      Animated.spring(scaleValue, {
        toValue: 1,
        useNativeDriver: true,
        speed: 50,
        bounciness: 4,
      }),
      Animated.timing(opacityValue, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
  };

  // ── High-End UI Logic ──
  const getCardStyles = () => {
    // Premium Dark Mode / Light Mode Palettes
    const bgFilled = isDark ? '#2a2a2a' : '#f7f7f8'; // ChatGPT off-gray
    const bgOutlined = isDark ? '#212121' : '#ffffff';
    
    // Dynamic glass borders (lighter on top to catch light in dark mode)
    const borderTop = isDark ? 'rgba(255,255,255,0.08)' : '#e5e5e5';
    const borderBottom = isDark ? 'rgba(255,255,255,0.02)' : '#e5e5e5';

    switch (variant) {
      case 'filled':
        return {
          backgroundColor: bgFilled,
          borderWidth: 0,
        };
      case 'elevated':
        return {
          backgroundColor: bgOutlined,
          borderWidth: 1,
          borderTopColor: borderTop,
          borderColor: borderBottom, // Uses lighter top, darker bottom
          ...Platform.select({
            ios: {
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 12 },
              shadowOpacity: isDark ? 0.3 : 0.08,
              shadowRadius: 24, // Massive blur radius for that modern floating feel
            },
            android: {
              elevation: 8,
            },
          }),
        };
      case 'outlined':
      default:
        return {
          backgroundColor: bgOutlined,
          borderWidth: 1,
          borderTopColor: borderTop,
          borderLeftColor: borderBottom,
          borderRightColor: borderBottom,
          borderBottomColor: borderBottom,
        };
    }
  };

  const baseStyle = [styles.card, getCardStyles(), style];

  if (onPress) {
    return (
      <Animated.View 
        style={[
          { 
            transform: [{ scale: scaleValue }],
            opacity: opacityValue,
          }
        ]}
      >
        <TouchableOpacity
          style={baseStyle}
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          disabled={disabled}
          activeOpacity={1} // Overrides default RN opacity flash since we handle it smoothly via Animated.View
        >
          {children}
        </TouchableOpacity>
      </Animated.View>
    );
  }

  // Non-pressable static card
  return <View style={baseStyle}>{children}</View>;
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 20, // Huge, luxurious curves
    padding: 20, 
    width: '100%',
    overflow: 'hidden', // Keeps any internal elements perfectly clipped to the curve
  },
});

export default Card;