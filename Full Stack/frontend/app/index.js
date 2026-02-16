import React, { useEffect } from 'react';
import { Redirect } from 'expo-router';
import { useSelector } from 'react-redux';
import { selectIsAuthenticated } from '../src/store/slices/authSlice';
import { View, ActivityIndicator, StyleSheet } from 'react-native';

export default function Index() {
  const isAuthenticated = useSelector(selectIsAuthenticated);

  if (isAuthenticated) {
    return <Redirect href="/(main)/(tabs)/chat" />;
  }

  return <Redirect href="/(auth)/login" />;
}
