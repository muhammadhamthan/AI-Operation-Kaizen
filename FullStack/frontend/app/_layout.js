import React, { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments, usePathname } from 'expo-router'; // 📍 ADDED usePathname
import { Provider, useDispatch, useSelector } from 'react-redux'; 
import { store } from '../src/store';
import { ThemeProvider } from '../src/theme/ThemeContext';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet } from 'react-native';
import { checkAuthStatus, selectIsInitialized, selectIsAuthenticated } from '../src/store/slices/authSlice'; 
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage'; 

// ── IMPORT UPGRADED COMPONENTS ──
import Loader from '../src/components/common/Loader';
import OfflineBanner from '../src/components/common/OfflineBanner';
import useNetworkStatus from '../src/hooks/useNetworkStatus'; 

function AppContent() {
  const [isSplashVisible, setIsSplashVisible] = useState(true);
  const [isFirstLaunch, setIsFirstLaunch] = useState(null); 

  const dispatch = useDispatch();
  const router = useRouter();
  const segments = useSegments();
  const pathname = usePathname(); // 📍 ADDED PATHNAME TRACKING
  
  const isInitialized = useSelector(selectIsInitialized);
  const isAuthenticated = useSelector(selectIsAuthenticated);
  
  const { isConnected } = useNetworkStatus();

  // 1. Kick off Redux Auth Check AND Onboarding Check on mount
  useEffect(() => {
    const prepareApp = async () => {
      try {
        const hasSeen = await AsyncStorage.getItem('has_seen_onboarding');
        setIsFirstLaunch(hasSeen !== 'true');
      } catch (error) {
        setIsFirstLaunch(true); 
      }

      await dispatch(checkAuthStatus());
      setTimeout(() => setIsSplashVisible(false), 500);
    };

    prepareApp();
  }, [dispatch]);

  // 2. THE ULTIMATE AUTH & ONBOARDING GUARD (Web-Proofed)
  useEffect(() => {
    const runGuard = async () => {
      if (!isInitialized || isFirstLaunch === null || isSplashVisible) return;

      const hasSeen = await AsyncStorage.getItem('has_seen_onboarding');
      const reallyFirstLaunch = hasSeen !== 'true';

      // 📍 THE FIX: Vercel strips route groups, so we MUST check pathname too!
      const inAuthGroup = segments[0] === '(auth)' || pathname.startsWith('/login');
      const inOnboarding = segments[0] === 'onboarding' || pathname.startsWith('/onboarding');

      if (reallyFirstLaunch && !inOnboarding) {
        // 🚀 1. Brand new user? Drag to onboarding
        router.replace('/onboarding');
      } else if (!reallyFirstLaunch && !isAuthenticated && !inAuthGroup && !inOnboarding) {
        // 🔒 2. Finished onboarding but not logged in? Drag to login
        router.replace('/(auth)/login');
      } else if (isAuthenticated && (inAuthGroup || inOnboarding || pathname === '/')) {
        // ✅ 3. Logged in but on login/onboarding/root? Send to main app
        router.replace('/(main)/(tabs)/chat'); 
      }
    };

    runGuard();
  }, [isInitialized, isAuthenticated, segments, pathname, isSplashVisible, isFirstLaunch]);

  
  // Show Loader while initializing EVERYTHING
  if (!isInitialized || isFirstLaunch === null || isSplashVisible) {
    return <Loader message="Making Your Work Easy..." fullScreen={true} />;
  }

  return (
    <>
      <StatusBar style="auto" />
      
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="onboarding" /> 
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(main)" />
        <Stack.Screen name="index" />
      </Stack>

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