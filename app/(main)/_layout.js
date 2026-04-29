import { Stack } from 'expo-router';
import { useSelector } from 'react-redux';
import { Redirect } from 'expo-router';
import { selectIsAuthenticated } from '../../src/store/slices/authSlice';
import { useNetworkStatus } from '../../src/hooks/useNetworkStatus';

export default function MainLayout() {
  const isAuthenticated = useSelector(selectIsAuthenticated);
  
  // Initialize network status monitoring
  useNetworkStatus();

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="profile" options={{ presentation: 'modal' }} />
    </Stack>
  );
}
