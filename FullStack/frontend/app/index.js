import React from 'react';
import { View, ActivityIndicator } from 'react-native';

export default function Index() {
  // This file can be simplified — the _layout.js guard handles routing
  // Just show a blank view; the guard will redirect
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" />
    </View>
  );
}