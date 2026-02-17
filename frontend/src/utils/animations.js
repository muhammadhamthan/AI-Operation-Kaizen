/**
 * Animation Utilities for React Native
 * 
 * Features:
 * - Button press animations
 * - Success/Error animations
 * - Fade in/out
 * - Scale animations
 * - Slide animations
 */

import { Animated, Easing } from 'react-native';
import * as Haptics from 'expo-haptics';

/**
 * Create a pressable animation (scale down on press)
 * 
 * @returns {Object} - Animation value and handlers
 */
export const usePressAnimation = () => {
  const scaleValue = new Animated.Value(1);

  const onPressIn = () => {
    Animated.spring(scaleValue, {
      toValue: 0.95,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  };

  const onPressOut = () => {
    Animated.spring(scaleValue, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  };

  return {
    scaleValue,
    onPressIn,
    onPressOut,
    style: { transform: [{ scale: scaleValue }] },
  };
};

/**
 * Create a shake animation (for errors)
 * 
 * @param {Animated.Value} value - Animation value
 * @returns {Function} - Trigger function
 */
export const createShakeAnimation = (value) => {
  return () => {
    Animated.sequence([
      Animated.timing(value, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(value, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(value, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(value, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(value, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
    
    // Haptic feedback
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  };
};

/**
 * Create a bounce animation (for success)
 * 
 * @param {Animated.Value} value - Animation value
 * @returns {Function} - Trigger function
 */
export const createBounceAnimation = (value) => {
  return () => {
    Animated.sequence([
      Animated.timing(value, { toValue: 1.2, duration: 150, useNativeDriver: true }),
      Animated.spring(value, { toValue: 1, useNativeDriver: true, friction: 3 }),
    ]).start();
    
    // Haptic feedback
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };
};

/**
 * Create a fade animation
 * 
 * @param {Animated.Value} value - Animation value (0 to 1)
 * @param {number} duration - Animation duration in ms
 * @returns {Object} - fadeIn and fadeOut functions
 */
export const createFadeAnimation = (value, duration = 300) => {
  return {
    fadeIn: (callback) => {
      Animated.timing(value, {
        toValue: 1,
        duration,
        useNativeDriver: true,
        easing: Easing.ease,
      }).start(callback);
    },
    fadeOut: (callback) => {
      Animated.timing(value, {
        toValue: 0,
        duration,
        useNativeDriver: true,
        easing: Easing.ease,
      }).start(callback);
    },
  };
};

/**
 * Create a slide animation
 * 
 * @param {Animated.Value} value - Animation value
 * @param {Object} options - Animation options
 * @returns {Object} - slideIn and slideOut functions
 */
export const createSlideAnimation = (value, options = {}) => {
  const { from = 100, to = 0, duration = 300 } = options;
  
  return {
    slideIn: (callback) => {
      value.setValue(from);
      Animated.timing(value, {
        toValue: to,
        duration,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }).start(callback);
    },
    slideOut: (callback) => {
      Animated.timing(value, {
        toValue: from,
        duration,
        useNativeDriver: true,
        easing: Easing.in(Easing.cubic),
      }).start(callback);
    },
  };
};

/**
 * Create a pulse animation (for attention)
 * 
 * @param {Animated.Value} value - Animation value
 * @returns {Function} - Start and stop functions
 */
export const createPulseAnimation = (value) => {
  let animation = null;
  
  return {
    start: () => {
      animation = Animated.loop(
        Animated.sequence([
          Animated.timing(value, { toValue: 1.1, duration: 500, useNativeDriver: true }),
          Animated.timing(value, { toValue: 1, duration: 500, useNativeDriver: true }),
        ])
      );
      animation.start();
    },
    stop: () => {
      if (animation) {
        animation.stop();
        value.setValue(1);
      }
    },
  };
};

/**
 * Animated button component wrapper
 */
export const AnimatedPressable = Animated.createAnimatedComponent(
  require('react-native').TouchableOpacity
);

/**
 * Spring config presets
 */
export const SPRING_CONFIG = {
  gentle: { tension: 100, friction: 10 },
  bouncy: { tension: 150, friction: 5 },
  stiff: { tension: 200, friction: 20 },
  slow: { tension: 50, friction: 10 },
};

/**
 * Easing presets
 */
export const EASING = {
  smooth: Easing.bezier(0.25, 0.1, 0.25, 1),
  snappy: Easing.bezier(0.4, 0, 0.2, 1),
  bounce: Easing.bounce,
  elastic: Easing.elastic(1),
};

export default {
  usePressAnimation,
  createShakeAnimation,
  createBounceAnimation,
  createFadeAnimation,
  createSlideAnimation,
  createPulseAnimation,
  AnimatedPressable,
  SPRING_CONFIG,
  EASING,
};
