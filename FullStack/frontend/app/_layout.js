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
    if (!isInitialized || isFirstLaunch === null || isSplashVisible) return;

    const hasSeen = await AsyncStorage.getItem('has_seen_onboarding');
    const reallyFirstLaunch = hasSeen !== 'true';

    const inAuthGroup = segments[0] === '(auth)';
    const inOnboarding = segments[0] === 'onboarding';
    const inMain = segments[0] === '(main)';

    // ✅ KEY FIX: Don't navigate if already on the correct screen
    if (reallyFirstLaunch) {
      if (!inOnboarding) router.replace('/onboarding');
      // Already on onboarding — do nothing
    } else if (!isAuthenticated) {
      if (!inAuthGroup) router.replace('/(auth)/login');
      // Already on login — do nothing
    } else if (isAuthenticated) {
      if (inAuthGroup || inOnboarding) router.replace('/(main)/(tabs)/chat');
      // Already in main — do nothing
    }
  };

  runGuard();
}, [isInitialized, isAuthenticated, isSplashVisible, isFirstLaunch]);
// ✅ REMOVED 'segments' from dependency array — it was re-triggering on every navigation

  
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