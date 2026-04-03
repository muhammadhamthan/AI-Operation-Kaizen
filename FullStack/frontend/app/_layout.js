import React, { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router'; 
import { Provider, useDispatch, useSelector } from 'react-redux'; 
import { store } from '../src/store';
import { ThemeProvider } from '../src/theme/ThemeContext';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet } from 'react-native';
import { checkAuthStatus, selectIsInitialized, selectIsAuthenticated } from '../src/store/slices/authSlice'; 
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage'; // 📍 IMPORTED THIS

// ── IMPORT UPGRADED COMPONENTS ──
import Loader from '../src/components/common/Loader';
import OfflineBanner from '../src/components/common/OfflineBanner';
import useNetworkStatus from '../src/hooks/useNetworkStatus'; 

function AppContent() {
  const [isSplashVisible, setIsSplashVisible] = useState(true);
  const [isFirstLaunch, setIsFirstLaunch] = useState(null); // 📍 ADDED ONBOARDING STATE

  const dispatch = useDispatch();
  const router = useRouter();
  const segments = useSegments();
  
  const isInitialized = useSelector(selectIsInitialized);
  const isAuthenticated = useSelector(selectIsAuthenticated);
  
  const { isConnected } = useNetworkStatus();

  // 1. Kick off Redux Auth Check AND Onboarding Check on mount
  useEffect(() => {
    const prepareApp = async () => {
      try {
        // 📍 Check if they've seen the onboarding screen before
        const hasSeen = await AsyncStorage.getItem('has_seen_onboarding');
        setIsFirstLaunch(hasSeen !== 'true');
      } catch (error) {
        setIsFirstLaunch(true); // Default to showing it if error
      }

      // Check Auth
      await dispatch(checkAuthStatus());
      
      // Keep your 500ms visual delay for a smooth entrance
      setTimeout(() => setIsSplashVisible(false), 500);
    };

    prepareApp();
  }, [dispatch]);

// 2. THE ULTIMATE AUTH & ONBOARDING GUARD
  useEffect(() => {
    const runGuard = async () => {
      // Don't attempt to route until initial checks and splash are done
      if (!isInitialized || isFirstLaunch === null || isSplashVisible) return;

      // 📍 THE FIX: Dynamically re-read storage right before routing so it's NEVER stale!
      const hasSeen = await AsyncStorage.getItem('has_seen_onboarding');
      const reallyFirstLaunch = hasSeen !== 'true';

      const inAuthGroup = segments[0] === '(auth)';
      const inOnboarding = segments[0] === 'onboarding';

      if (reallyFirstLaunch && !inOnboarding) {
        // 🚀 1. Brand new user? Drag to onboarding
        router.replace('/onboarding');
      } else if (!reallyFirstLaunch && !isAuthenticated && !inAuthGroup && !inOnboarding) {
        // 🔒 2. Finished onboarding but not logged in? Drag to login
        router.replace('/(auth)/login');
      } else if (isAuthenticated && (inAuthGroup || inOnboarding)) {
        // ✅ 3. Logged in but stuck on login/onboarding screen? Send to main app
        router.replace('/(main)/(tabs)/chat'); 
      }
    };

    runGuard();
  }, [isInitialized, isAuthenticated, segments, isSplashVisible, isFirstLaunch]);

  
  // Show Loader while initializing EVERYTHING
  if (!isInitialized || isFirstLaunch === null || isSplashVisible) {
    return <Loader message="Making Your Work Easy..." fullScreen={true} />;
  }

  return (
    <>
      <StatusBar style="auto" />
      
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="onboarding" /> {/* 📍 ADDED ONBOARDING TO STACK */}
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(main)" />
        <Stack.Screen name="index" />
      </Stack>

      {/* 🚀 GLOBAL UI LAYER */}
      <OfflineBanner />
    </>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider> 
        <Provider store={store}>
          <ThemeProvider>
            <AppContent />
          </ThemeProvider>
        </Provider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}