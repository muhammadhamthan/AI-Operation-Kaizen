import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { selectIsOnline } from '../../store/slices/offlineSlice';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeContext'; // NEW: Imported theme

const OfflineBanner = () => {
  const isOnline = useSelector(selectIsOnline);
  const { isDark } = useTheme(); // NEW: Grabbing dark mode status
  
  const [showBackOnline, setShowBackOnline] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);
  
  // Advanced Animations
  const slideAnim = useRef(new Animated.Value(-100)).current; // Starts hidden above screen
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!isOnline) {
      // Show offline pill
      setWasOffline(true);
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: Math.max(insets.top + 12, 20), // Drops just below status bar
          useNativeDriver: true,
          tension: 40,
          friction: 6,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else if (wasOffline) {
      // Show "Back online" message briefly, then slide up
      setShowBackOnline(true);
      
      setTimeout(() => {
        Animated.parallel([
          Animated.spring(slideAnim, {
            toValue: -100, // Slides back out of view
            useNativeDriver: true,
            tension: 20,
            friction: 7,
          }),
          Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start(() => {
          setShowBackOnline(false);
          setWasOffline(false);
        });
      }, 2500); // Gives them 2.5 seconds to see it's back online
    }
  }, [isOnline, insets.top, slideAnim, fadeAnim]);

  if (isOnline && !showBackOnline) return null;

  // Premium Pill Colors
  const pillBg = isDark ? '#333333' : '#171717'; 
  const pillBorder = isDark ? '#424242' : 'transparent';
  const iconColor = isOnline ? '#10a37f' : '#ef4444'; // OpenAI Green / Clean Red

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
      pointerEvents="none" // Ensures the banner never blocks user taps on the app underneath
    >
      <View 
        style={[
          styles.pill, 
          { 
            backgroundColor: pillBg,
            borderColor: pillBorder,
            borderWidth: isDark ? 1 : 0, 
          }
        ]}
      >
        <Ionicons
          name={isOnline ? 'wifi' : 'wifi-outline'} // Swapped to cleaner wifi icons
          size={16}
          color={iconColor}
        />
        <Text style={styles.text}>
          {isOnline ? 'Back online' : 'No internet connection'}
        </Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    alignItems: 'center', // Centers the floating pill
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 30, // Perfect rounded pill shape
    gap: 8,
    // Subtle shadow to detach it from the screen content
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  text: {
    color: '#ffffff', // Always white for maximum contrast on the dark pill
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.2, // Premium tracking
  },
});

export default OfflineBanner;