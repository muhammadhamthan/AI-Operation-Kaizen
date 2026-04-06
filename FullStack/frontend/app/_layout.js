import React, { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments, usePathname } from 'expo-router'; 
import { Provider, useDispatch, useSelector } from 'react-redux'; 
import { store } from '../src/store';
import { ThemeProvider } from '../src/theme/ThemeContext';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet } from 'react-native';
import { checkAuthStatus, selectIsInitialized, selectIsAuthenticated } from '../src/store/slices/authSlice'; 
import { SafeAreaProvider } from 'react-native-safe-area-context';

// ── IMPORT UPGRADED COMPONENTS ──
import Loader from '../src/components/common/Loader';
import OfflineBanner from '../src/components/common/OfflineBanner';
import useNetworkStatus from '../src/hooks/useNetworkStatus'; 

function AppContent() {
  const [isSplashVisible, setIsSplashVisible] = useState(true);

  const dispatch = useDispatch();
  const router = useRouter();
  const segments = useSegments();
  const pathname = usePathname(); 
  
  const isInitialized = useSelector(selectIsInitialized);
  const isAuthenticated = useSelector(selectIsAuthenticated);
  
  const { isConnected } = useNetworkStatus();

  // 1. Kick off Redux Auth Check on mount
  useEffect(() => {
    const prepareApp = async () => {
      await dispatch(checkAuthStatus());
      setTimeout(() => setIsSplashVisible(false), 500);
    };

    prepareApp();
  }, [dispatch]);

  // 2. THE ULTIMATE AUTH GUARD (Onboarding Always First)
  useEffect(() => {
    const runGuard = async () => {
      if (!isInitialized || isSplashVisible) return;

      const inAuthGroup = segments[0] === '(auth)' || pathname.startsWith('/login');
      const inOnboarding = segments[0] === 'onboarding' || pathname.startsWith('/onboarding');

      if (!isAuthenticated && !inAuthGroup && !inOnboarding) {
        // 🚀 1. Logged out and anywhere else? Force to onboarding
        router.replace('/onboarding');
      } else if (isAuthenticated && (inAuthGroup || inOnboarding || pathname === '/')) {
        // ✅ 2. Logged in but stuck on login/onboarding/root? Send to main app
        router.replace('/(main)/(tabs)/chat'); 
      }
    };

    runGuard();
  }, [isInitialized, isAuthenticated, segments, pathname, isSplashVisible]);

  
  // Show Loader while initializing EVERYTHING
  if (!isInitialized || isSplashVisible) {
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