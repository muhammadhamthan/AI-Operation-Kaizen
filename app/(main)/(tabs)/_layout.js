import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../src/theme/ThemeContext';
import { useSelector } from 'react-redux';
import { selectIsOnline } from '../../../src/store/slices/offlineSlice';
import OfflineBanner from '../../../src/components/common/OfflineBanner';
import { useSafeAreaInsets } from 'react-native-safe-area-context'; // 📍 ADDED THIS

export default function TabsLayout() {
  const { theme, isDark } = useTheme();
  const isOnline = useSelector(selectIsOnline);
  const insets = useSafeAreaInsets(); // 📍 GRABS DYNAMIC SCREEN INSETS

  // ── STRICT MONOCHROME PALETTE ──
  const activeColor = isDark ? '#ffffff' : '#101010';
  const inactiveColor = isDark ? '#8e8ea0' : '#8e8ea0'; // Signature GPT muted gray
  const bgColor = isDark ? '#171717' : '#ffffff';
  const borderColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)';

  // 📍 DYNAMIC RESPONSIVE SIZING
  // Ensures at least 16px of padding on Web, or standard 10 on Android, while fully respecting iOS notches
  const bottomPadding = Math.max(insets.bottom, Platform.OS === 'web' ? 16 : 10);
  const tabHeight = 55 + bottomPadding; 

  return (
    <>
      <View style={{ position: 'absolute', top: 0, width: '100%', zIndex: 9999, elevation: 9999 }}>
        <OfflineBanner />
      </View>

      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: activeColor,
          tabBarInactiveTintColor: inactiveColor,

          // ── PREMIUM FLAT STYLING ──
          tabBarStyle: {
            backgroundColor: bgColor,
            borderTopColor: borderColor,
            borderTopWidth: StyleSheet.hairlineWidth, // Ultra-thin, crisp border
            height: tabHeight, // 📍 RESPONSIVE HEIGHT
            paddingBottom: bottomPadding, // 📍 RESPONSIVE PADDING
            paddingTop: 8,
            elevation: 0, // Strips away Android default drop-shadow
            shadowOpacity: 0, // Strips away iOS default shadow
          },
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '600',
            letterSpacing: -0.1,
            marginTop: 4,
          },
        }}
      >
        <Tabs.Screen
          name="chat"
          options={{
            title: 'Chat',
            // 🚀 DYNAMIC ICONS: Outline when inactive, Solid when active
            tabBarIcon: ({ color, focused }) => (
              <Ionicons 
                name={focused ? "chatbubbles" : "chatbubbles-outline"} 
                size={24} 
                color={color} 
              />
            ),
          }}
        />
        <Tabs.Screen
          name="issues"
          options={{
            title: 'Issues',
            // 🚀 DYNAMIC ICONS: Outline when inactive, Solid when active
            tabBarIcon: ({ color, focused }) => (
              <Ionicons 
                name={focused ? "document-text" : "document-text-outline"} 
                size={24} 
                color={color} 
              />
            ),
          }}
        />
        <Tabs.Screen
          name="dashboard"
          options={{
            title: 'Dashboard',
            // 🚀 DYNAMIC ICONS: Outline when inactive, Solid when active
            tabBarIcon: ({ color, focused }) => (
              <Ionicons 
                name={focused ? "grid" : "grid-outline"} 
                size={24} 
                color={color} 
              />
            ),
          }}
        />
      </Tabs>
    </>
  );
}