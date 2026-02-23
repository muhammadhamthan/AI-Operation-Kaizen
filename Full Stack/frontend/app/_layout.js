import React, { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { Provider, useDispatch } from 'react-redux'; // Added useDispatch
import { store } from '../src/store';
import { ThemeProvider } from '../src/theme/ThemeContext';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet } from 'react-native';
import { loadUser } from '../src/utils/storage';
import { setUser } from '../src/store/slices/authSlice';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// ── IMPORT UPGRADED COMPONENTS ──
import Loader from '../src/components/common/Loader';
import OfflineBanner from '../src/components/common/OfflineBanner';
import useNetworkStatus from '../src/hooks/useNetworkStatus'; // 🚀 IMPORT THE HOOK

function AppContent() {
  const [isLoading, setIsLoading] = useState(true);
  const dispatch = useDispatch();
  
  // 🚀 ACTIVATE THE ENGINE: This hook now listens for network changes globally
  const { isConnected } = useNetworkStatus();
  

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const user = await loadUser();
      if (user) {
        dispatch(setUser(user)); // Use the component's dispatch
      }
    } catch (error) {
      console.error('Auth check error:', error);
    } finally {
      setTimeout(() => setIsLoading(false), 500);
    }
  };

  if (isLoading) {
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

      {/* 🚀 GLOBAL UI LAYER: 
        Because useNetworkStatus() is running above, this banner will 
        now react instantly when isConnected changes in Redux!
      */}
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