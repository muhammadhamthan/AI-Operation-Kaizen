import { useCallback } from 'react';
import { BackHandler, Platform } from 'react-native';
import { useFocusEffect } from 'expo-router';

export const useSmartBack = (customBackAction) => {
  useFocusEffect(
    useCallback(() => {
      const onHardwareBackPress = () => {
        if (customBackAction) {
          customBackAction();
          return true; // Blocks default Android back behavior
        }
        return false;
      };

      let subscription;
      
      if (Platform.OS === 'android') {
        subscription = BackHandler.addEventListener('hardwareBackPress', onHardwareBackPress);
      }

      return () => {
        if (Platform.OS === 'android') {
          // Bulletproof cleanup: safely supports both old and new React Native versions
          if (subscription && typeof subscription.remove === 'function') {
            subscription.remove();
          } else if (typeof BackHandler.removeEventListener === 'function') {
            BackHandler.removeEventListener('hardwareBackPress', onHardwareBackPress);
          }
        }
      };
    }, [customBackAction])
  );
};