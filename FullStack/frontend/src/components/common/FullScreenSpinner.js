import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing, Platform, Dimensions } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';

export default function FullScreenSpinner({ visible, message = "Processing..." }) {
  const { theme, isDark } = useTheme();
  
  const floatAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Fade in overlay
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: Platform.OS !== 'web',
      }).start();

      // Robot floating animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(floatAnim, {
            toValue: -20,
            duration: 1500,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: Platform.OS !== 'web',
          }),
          Animated.timing(floatAnim, {
            toValue: 0,
            duration: 1500,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: Platform.OS !== 'web',
          }),
        ])
      ).start();

      // Pulse animation for the glow
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.5,
            duration: 1000,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: Platform.OS !== 'web',
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: Platform.OS !== 'web',
          }),
        ])
      ).start();
    } else {
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: Platform.OS !== 'web',
      }).start();
    }
  }, [visible]);

  if (!visible) return null;

  const glowColor = isDark ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.15)';

  return (
    <Animated.View 
      style={[
        styles.overlay, 
        { 
          backgroundColor: isDark ? 'rgba(17, 17, 17, 0.95)' : 'rgba(255, 255, 255, 0.9)',
          opacity: opacityAnim 
        }
      ]}
    >
      <View style={styles.animationContainer}>
        {/* Pulsing Glow Background */}
        <Animated.View 
          style={[
            styles.glowPill, 
            { 
              backgroundColor: glowColor,
              transform: [{ scale: pulseAnim }]
            }
          ]} 
        />
        
        {/* Floating Robot */}
        <Animated.View 
          style={{ 
            transform: [{ translateY: floatAnim }],
            alignItems: 'center'
          }}
        >
          <View style={[styles.robotWrapper, { borderColor: theme.primary + '30' }]}>
            <MaterialCommunityIcons 
              name="robot" 
              size={64} 
              color={theme.primary} 
            />
            {/* Small Antenna Light */}
            <View style={[styles.antennaLight, { backgroundColor: '#10a37f' }]} />
          </View>
        </Animated.View>
      </View>

      <View style={styles.textContainer}>
        <Text style={[styles.message, { color: theme.text }]}>
          {message}
        </Text>
        <Text style={[styles.subText, { color: theme.textSecondary }]}>
          AI Kaizen Assistant is working...
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  animationContainer: {
    width: 120,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  glowPill: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  robotWrapper: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  antennaLight: {
    position: 'absolute',
    top: 22,
    right: 32,
    width: 6,
    height: 6,
    borderRadius: 3,
    shadowColor: '#10a37f',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 5,
  },
  textContainer: {
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  message: {
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  subText: {
    fontSize: 14,
    fontWeight: '500',
    opacity: 0.8,
  },
});