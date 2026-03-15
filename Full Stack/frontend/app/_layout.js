import React, { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router'; // ✅ Added router hooks
import { Provider, useDispatch, useSelector } from 'react-redux'; // ✅ Added useSelector
import { store } from '../src/store';
import { ThemeProvider } from '../src/theme/ThemeContext';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet } from 'react-native';
import { checkAuthStatus, selectIsInitialized, selectIsAuthenticated } from '../src/store/slices/authSlice'; // ✅ Import upgraded Redux actions/selectors
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
  
  // ✅ Pull auth state from Redux
  const isInitialized = useSelector(selectIsInitialized);
  const isAuthenticated = useSelector(selectIsAuthenticated);
  
  // 🚀 ACTIVATE THE ENGINE: This hook now listens for network changes globally
  const { isConnected } = useNetworkStatus();

  // 1. Kick off Redux Auth Check on mount
  useEffect(() => {
    dispatch(checkAuthStatus()).finally(() => {
      // Keep your 500ms visual delay for a smooth entrance
      setTimeout(() => setIsSplashVisible(false), 500);
    });
  }, [dispatch]);

  // 2. THE AUTH GUARD (Stops the refresh bug)
  useEffect(() => {
    // Don't attempt to route until storage is checked and splash is done
    if (!isInitialized || isSplashVisible) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!isAuthenticated && !inAuthGroup) {
      // ❌ Not logged in? Protect the main screens and kick to login
      router.replace('/(auth)/login');
    } else if (isAuthenticated && inAuthGroup) {
      // ✅ Logged in but stuck on the login screen? Send to chat
      router.replace('/(main)/(tabs)/chat');
    }
  }, [isInitialized, isAuthenticated, segments, isSplashVisible]);

  // Show Loader while initializing
  if (!isInitialized || isSplashVisible) {
    return <Loader message="Making Your Work Easy..." fullScreen={true} />;
  }

  return (
    <>
      <StatusBar style="auto" />
      
      <Stack screenOptions={{ headerShown: false }}>
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