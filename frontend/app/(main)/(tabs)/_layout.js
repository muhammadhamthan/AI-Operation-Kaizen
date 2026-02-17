import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../src/theme/ThemeContext';
import { useSelector } from 'react-redux';
import { selectIsOnline } from '../../../src/store/slices/offlineSlice';
import OfflineBanner from '../../../src/components/common/OfflineBanner';
import { View } from 'react-native';

export default function TabsLayout() {
  const { theme } = useTheme();
  const isOnline = useSelector(selectIsOnline);

  return (
    <View style={{ flex: 1 }}>
      {/* Offline Banner - Shows above all tabs when offline */}
      <OfflineBanner />
      
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: theme.primary,
          tabBarInactiveTintColor: theme.textSecondary,
          tabBarStyle: {
            backgroundColor: theme.tabBar,
            borderTopColor: theme.border,
            height: 60,
            paddingBottom: 8,
            paddingTop: 8,
          },
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '500',
          },
        }}
      >
        <Tabs.Screen
          name="chat"
          options={{
            title: 'Chat',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="chatbubbles" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="issues"
          options={{
            title: 'Issues',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="document-text" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="dashboard"
          options={{
            title: 'Dashboard',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="grid" size={size} color={color} />
            ),
          }}
        />
      </Tabs>
    </View>
  );
}
