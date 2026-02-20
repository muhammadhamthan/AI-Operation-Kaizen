/**
 * Haptic Feedback Utility
 * 
 * Provides haptic feedback for touch interactions
 * Falls back gracefully on unsupported devices
 */

import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

// Check if haptics are available
const isHapticsAvailable = Platform.OS === 'ios' || Platform.OS === 'android';

/**
 * Light haptic feedback - for subtle interactions
 * Use for: toggles, selections, minor UI changes
 */
export const lightImpact = async () => {
  if (!isHapticsAvailable) return;
  try {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } catch (error) {
    console.log('Haptics not available');
  }
};

/**
 * Medium haptic feedback - for standard interactions
 * Use for: button presses, card selections, navigation
 */
export const mediumImpact = async () => {
  if (!isHapticsAvailable) return;
  try {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  } catch (error) {
    console.log('Haptics not available');
  }
};

/**
 * Heavy haptic feedback - for significant interactions
 * Use for: important actions, confirmations, major state changes
 */
export const heavyImpact = async () => {
  if (!isHapticsAvailable) return;
  try {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  } catch (error) {
    console.log('Haptics not available');
  }
};

/**
 * Selection feedback - for selection changes
 * Use for: picker changes, slider adjustments, segment controls
 */
export const selection = async () => {
  if (!isHapticsAvailable) return;
  try {
    await Haptics.selectionAsync();
  } catch (error) {
    console.log('Haptics not available');
  }
};

/**
 * Success notification feedback
 * Use for: successful operations, completed actions
 */
export const success = async () => {
  if (!isHapticsAvailable) return;
  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } catch (error) {
    console.log('Haptics not available');
  }
};

/**
 * Warning notification feedback
 * Use for: warnings, cautions, attention needed
 */
export const warning = async () => {
  if (!isHapticsAvailable) return;
  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  } catch (error) {
    console.log('Haptics not available');
  }
};

/**
 * Error notification feedback
 * Use for: errors, failed operations, invalid inputs
 */
export const error = async () => {
  if (!isHapticsAvailable) return;
  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  } catch (error) {
    console.log('Haptics not available');
  }
};

/**
 * Custom haptic pattern
 * 
 * @param {Array} pattern - Array of haptic types and delays
 * Example: [{ type: 'light' }, { delay: 100 }, { type: 'medium' }]
 */
export const customPattern = async (pattern) => {
  if (!isHapticsAvailable) return;
  
  for (const item of pattern) {
    if (item.delay) {
      await new Promise(resolve => setTimeout(resolve, item.delay));
    } else if (item.type) {
      switch (item.type) {
        case 'light':
          await lightImpact();
          break;
        case 'medium':
          await mediumImpact();
          break;
        case 'heavy':
          await heavyImpact();
          break;
        case 'selection':
          await selection();
          break;
        case 'success':
          await success();
          break;
        case 'warning':
          await warning();
          break;
        case 'error':
          await error();
          break;
      }
    }
  }
};

/**
 * Preset haptic patterns
 */
export const patterns = {
  // Double tap feel
  doubleTap: async () => {
    await customPattern([
      { type: 'light' },
      { delay: 50 },
      { type: 'light' },
    ]);
  },
  
  // Button press with feedback
  buttonPress: async () => {
    await mediumImpact();
  },
  
  // Successful action
  actionSuccess: async () => {
    await customPattern([
      { type: 'medium' },
      { delay: 100 },
      { type: 'success' },
    ]);
  },
  
  // Failed action
  actionError: async () => {
    await customPattern([
      { type: 'error' },
      { delay: 100 },
      { type: 'light' },
      { delay: 50 },
      { type: 'light' },
    ]);
  },
  
  // Pull to refresh
  pullRefresh: async () => {
    await mediumImpact();
  },
  
  // Toggle switch
  toggle: async () => {
    await lightImpact();
  },
  
  // Slider/picker change
  sliderChange: async () => {
    await selection();
  },
};

export default {
  lightImpact,
  mediumImpact,
  heavyImpact,
  selection,
  success,
  warning,
  error,
  customPattern,
  patterns,
};
