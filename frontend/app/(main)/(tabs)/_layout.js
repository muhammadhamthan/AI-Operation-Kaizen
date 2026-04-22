import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '../../../src/theme/ThemeContext';
import { selectIsOnline } from '../../../src/store/slices/offlineSlice';
import OfflineBanner from '../../../src/components/common/OfflineBanner';

import useRole from '../../../src/hooks/useRole';
import { TAB_META, ALL_TAB_ROUTES, isTabVisible } from '../../../src/config/roleNav';

export default function TabsLayout() {
  const { theme, isDark } = useTheme();
  const isOnline = useSelector(selectIsOnline);
  const insets = useSafeAreaInsets();
  const { role } = useRole();

  // ── STRICT MONOCHROME PALETTE (unchanged from MVP) ──
  const activeColor = isDark ? '#ffffff' : '#101010';
  const inactiveColor = isDark ? '#8e8ea0' : '#8e8ea0';
  const bgColor = isDark ? '#171717' : '#ffffff';
  const borderColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)';

  // 📍 DYNAMIC RESPONSIVE SIZING (unchanged)
  const bottomPadding = Math.max(insets.bottom, Platform.OS === 'web' ? 16 : 10);
  const tabHeight = 55 + bottomPadding;

  // Fallback: until the auth slice resolves a role, render nothing hidden —
  // keep existing MVP tab set (chat/issues/dashboard) as the safe default.
  const safeRole = role || 'supervisor';

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
        {ALL_TAB_ROUTES.map((routeName) => {
          const meta = TAB_META[routeName];
          if (!meta) return null;
          const visible = isTabVisible(safeRole, routeName);
          return (
            <Tabs.Screen
              key={routeName}
              name={routeName}
              options={{
                title: meta.title,
                // When a tab is not permitted for the current role we set
                // href: null so expo-router hides it from the tab bar AND
                // removes the deep-link — role isolation at the navigation
                // layer (Kairox Section 10).
                href: visible ? undefined : null,
                tabBarIcon: ({ color, focused }) => (
                  <Ionicons
                    name={focused ? meta.iconActive : meta.iconInactive}
                    size={24}
                    color={color}
                  />
                ),
                tabBarTestID: `tab-${routeName}`,
              }}
            />
          );
        })}
      </Tabs>
    </>
  );
}
