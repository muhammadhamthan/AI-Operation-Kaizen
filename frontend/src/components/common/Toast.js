import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const Toast = ({ message, type = 'info', duration = 3000, onHide }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    // Fade in
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    // Auto hide
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 50,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => {
        if (onHide) onHide();
      });
    }, duration);

    return () => clearTimeout(timer);
  }, [message]);

  const getConfig = () => {
    switch (type) {
      case 'success':
        return { icon: 'checkmark-circle', color: '#16a34a', bgColor: '#dcfce7' };
      case 'error':
        return { icon: 'alert-circle', color: '#ef4444', bgColor: '#fee2e2' };
      case 'warning':
        return { icon: 'warning', color: '#f97316', bgColor: '#ffedd5' };
      default:
        return { icon: 'information-circle', color: '#3b82f6', bgColor: '#dbeafe' };
    }
  };

  const config = getConfig();

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: config.bgColor,
          opacity: fadeAnim,
          transform: [{ translateY }],
        },
      ]}
    >
      <Ionicons name={config.icon} size={20} color={config.color} />
      <Text style={[styles.message, { color: config.color }]}>{message}</Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  message: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
});

export default Toast;
