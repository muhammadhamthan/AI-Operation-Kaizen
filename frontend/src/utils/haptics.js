import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';

const HAPTICS_KEY = '@haptics_enabled';
let hapticsEnabled = true;

export const loadHapticSetting = async () => {
  try {
    const saved = await AsyncStorage.getItem(HAPTICS_KEY);
    hapticsEnabled = saved !== 'false';
    return hapticsEnabled;
  } catch {
    return true;
  }
};

export const saveHapticSetting = async (enabled) => {
  try {
    await AsyncStorage.setItem(HAPTICS_KEY, enabled.toString());
    hapticsEnabled = enabled;
  } catch (error) {
    console.error('Error saving haptic setting:', error);
  }
};

export const triggerHaptic = async (type = 'light') => {
  if (!hapticsEnabled) return;
  
  try {
    switch (type) {
      case 'light':
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        break;
      case 'medium':
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        break;
      case 'heavy':
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        break;
      case 'success':
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        break;
      case 'error':
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        break;
      case 'warning':
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        break;
      default:
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  } catch (error) {
    console.log('Haptic feedback not available');
  }
};
