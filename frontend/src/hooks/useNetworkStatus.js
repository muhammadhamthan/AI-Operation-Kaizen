import { useState, useEffect, useCallback } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { useDispatch } from 'react-redux';
import { setOnlineStatus } from '../store/slices/offlineSlice';

export const useNetworkStatus = () => {
  const [isConnected, setIsConnected] = useState(true);
  const dispatch = useDispatch();

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      const connected = state.isConnected && state.isInternetReachable !== false;
      setIsConnected(connected);
      dispatch(setOnlineStatus(connected));
    });

    // Initial check
    NetInfo.fetch().then(state => {
      const connected = state.isConnected && state.isInternetReachable !== false;
      setIsConnected(connected);
      dispatch(setOnlineStatus(connected));
    });

    return () => unsubscribe();
  }, [dispatch]);

  const checkConnection = useCallback(async () => {
    const state = await NetInfo.fetch();
    return state.isConnected && state.isInternetReachable !== false;
  }, []);

  return { isConnected, checkConnection };
};

export default useNetworkStatus;
