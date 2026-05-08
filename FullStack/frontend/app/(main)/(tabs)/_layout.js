import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '../../../src/theme/ThemeContext';
import { selectIsOnline } from '../../../src/store/slices/offlineSlice';
import OfflineBanner from '../../../src/components/common/OfflineBanner';

/**
 * Bottom tab bar — MVP parity: three tabs only (Chat, Issues, Dashboard).
 *
 * Role-specific features (Sites, Solvers, Budget, MD, Supervisors,
 * Customer MD) are reached from cards INSIDE the Dashboard, not from
 * the bottom bar. Profile is reached from the top-right avatar in the
 * existing dashboard header.
 *
 * The route files for these screens still live in this folder so that
 * `router.push('/(main)/(tabs)/<route>')` works from dashboard cards;
 * `href: null` hides them from the tab bar per expo-router convention.
 */
export default function TabsLayout() {
  const { theme, isDark } = useTheme();
  const isOnline = useSelector(selectIsOnline);
  const insets = useSafeAreaInsets();

  // ── Monochrome palette (unchanged from MVP) ──
  const activeColor = isDark ? '#ffffff' : '#101010';
  const inactiveColor = isDark ? '#8e8ea0' : '#8e8ea0';
  const bgColor = isDark ? '#171717' : '#ffffff';
  const borderColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)';

  const bottomPadding = Math.max(insets.bottom, Platform.OS === 'web' ? 16 : 10);
  const tabHeight = 55 + bottomPadding;

  // Hidden-but-navigable routes (accessed from dashboard cards).
  const hiddenRoutes = [
    'sites',
    'solvers',
    'md-card',
    'supervisors-card',
    'customer-md-card',
    'budget',
  ];

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
          tabBarStyle: {
            backgroundColor: bgColor,
            borderTopColor: borderColor,
            borderTopWidth: StyleSheet.hairlineWidth,
            height: tabHeight,
            paddingBottom: bottomPadding,
            paddingTop: 8,
            elevation: 0,
            shadowOpacity: 0,
          },
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '600',
            letterSpacing: -0.1,
            marginTop: 4,
          },
        }}
      >
        {/* ── Visible tabs (MVP parity: 3 tabs only) ── */}
        <Tabs.Screen
          name="chat"
          options={{
            title: 'Chat',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons
                name={focused ? 'chatbubbles' : 'chatbubbles-outline'}
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
            tabBarIcon: ({ color, focused }) => (
              <Ionicons
                name={focused ? 'document-text' : 'document-text-outline'}
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
            tabBarIcon: ({ color, focused }) => (
              <Ionicons
                name={focused ? 'grid' : 'grid-outline'}
                size={24}
                color={color}
              />
            ),
          }}
        />

        {/* ── Hidden routes — reachable via router.push, not visible in tab bar ── */}
        {hiddenRoutes.map((routeName) => (
          <Tabs.Screen
            key={routeName}
            name={routeName}
            options={{ href: null }}
          />
        ))}
      </Tabs>
    </>
  );
}
