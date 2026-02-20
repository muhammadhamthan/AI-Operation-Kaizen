import { useState, useEffect, useCallback } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { useDispatch } from 'react-redux';
import { setOnlineStatus } from '../store/slices/offlineSlice';
import { Platform } from 'react-native';

export const useNetworkStatus = () => {
  const [isConnected, setIsConnected] = useState(true);
  const dispatch = useDispatch();

  const updateStatus = useCallback((status) => {
    setIsConnected(status);
    dispatch(setOnlineStatus(status));
    console.log("🌐 Redux Updated - Is Online:", status);
  }, [dispatch]);

  useEffect(() => {
    // 1. Standard NetInfo Listener (Works best on Mobile)
    const unsubscribe = NetInfo.addEventListener(state => {
      // On Web, isInternetReachable is often null, so we fallback to isConnected
      const connected = state.isConnected && state.isInternetReachable !== false;
      updateStatus(connected);
    });

    // 2. Native Browser Listeners (Standard for Web)
    if (Platform.OS === 'web') {
      const goOnline = () => updateStatus(true);
      const goOffline = () => updateStatus(false);

      window.addEventListener('online', goOnline);
      window.addEventListener('offline', goOffline);

      return () => {
        unsubscribe();
        window.removeEventListener('online', goOnline);
        window.removeEventListener('offline', goOffline);
      };
    }

    return () => unsubscribe();
  }, [updateStatus]);

  const checkConnection = useCallback(async () => {
    const state = await NetInfo.fetch();
    return state.isConnected && state.isInternetReachable !== false;
  }, []);

  return { isConnected, checkConnection };
};

export default useNetworkStatus;