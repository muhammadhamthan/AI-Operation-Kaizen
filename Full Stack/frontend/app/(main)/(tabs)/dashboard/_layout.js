import { Stack } from 'expo-router';

export default function DashboardLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="issues" />
      <Stack.Screen name="issue-detail" />
      <Stack.Screen name="not-fixed" />
      <Stack.Screen name="not-fixed-detail" />
      <Stack.Screen name="fixed" />
      <Stack.Screen name="fixed-detail" />
      <Stack.Screen name="complaints" />
      <Stack.Screen name="complaint-detail" />
      {/* ADD THESE: */}
      <Stack.Screen name="sites" />
      <Stack.Screen name="site-detail" />
      <Stack.Screen name="solvers" />
      <Stack.Screen name="solver-profile" />
    </Stack>
  );
}
