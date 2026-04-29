import React from 'react';
import { View } from 'react-native';

export default function Index() {
  // 📍 The global routing guard in _layout.js handles all redirects now.
  // We just return an empty view here so they don't fight and cause infinite loops.
  return <View style={{ flex: 1, backgroundColor: '#0b0b14' }} />;
}