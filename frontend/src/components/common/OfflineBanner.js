import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { selectIsOnline } from '../../store/slices/offlineSlice';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const OfflineBanner = () => {
  const isOnline = useSelector(selectIsOnline);
  const [showBackOnline, setShowBackOnline] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!isOnline) {
      // Show offline banner
      setWasOffline(true);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else if (wasOffline) {
      // Show "Back online" message briefly
      setShowBackOnline(true);
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.delay(2000),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setShowBackOnline(false);
        setWasOffline(false);
      });
    }
  }, [isOnline]);

  if (isOnline && !showBackOnline) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: isOnline ? '#16a34a' : '#ef4444',
          opacity: fadeAnim,
          paddingTop: Platform.OS === 'ios' ? insets.top : 0,
        },
      ]}
    >
      <View style={styles.content}>
        <Ionicons
          name={isOnline ? 'checkmark-circle' : 'cloud-offline'}
          size={18}
          color="#fff"
        />
        <Text style={styles.text}>
          {isOnline ? '✓ Back online' : '△ No internet connection'}
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
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    gap: 8,
  },
  text: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default OfflineBanner;
