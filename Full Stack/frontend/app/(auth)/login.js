import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  ScrollView,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../src/theme/ThemeContext';
import { loginUser, selectAuthLoading, selectAuthError, clearError } from '../../src/store/slices/authSlice';
import Input from '../../src/components/common/Input';
import Button from '../../src/components/common/Button';

export default function LoginScreen() {
  const { theme, isDark, toggleTheme } = useTheme();
  const router = useRouter();
  const dispatch = useDispatch();
  const loading = useSelector(selectAuthLoading);
  const error = useSelector(selectAuthError);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [validationError, setValidationError] = useState('');

  const handleLogin = async () => {
    setValidationError('');
    dispatch(clearError());

    if (!username.trim()) {
      setValidationError('Username is required');
      return;
    }
    if (!password.trim()) {
      setValidationError('Password is required');
      return;
    }

    try {
      const result = await dispatch(loginUser({ username, password })).unwrap();
      if (result) {
        router.replace('/(main)/(tabs)/chat');
      }
    } catch (err) {
      console.log('Login error:', err);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <View style={[styles.logoContainer, { backgroundColor: theme.primary }]}>
              <Ionicons name="construct" size={48} color="#ffffff" />
            </View>
            <Text style={[styles.title, { color: theme.text }]}>
              MaintenanceFlow
            </Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
              Industrial Issue Tracking
            </Text>
          </View>

          <View style={styles.form}>
            <Input
              label="Username"
              value={username}
              onChangeText={setUsername}
              placeholder="Enter your username"
              icon="person-outline"
              autoCapitalize="none"
            />

            <Input
              label="Password"
              value={password}
              onChangeText={setPassword}
              placeholder="Enter your password"
              icon="lock-closed-outline"
              secureTextEntry
              autoCapitalize="none"
            />

            {(validationError || error) && (
              <View style={[styles.errorContainer, { backgroundColor: `${theme.danger}15` }]}>
                <Ionicons name="alert-circle" size={18} color={theme.danger} />
                <Text style={[styles.errorText, { color: theme.danger }]}>
                  {validationError || error}
                </Text>
              </View>
            )}

            <Button
              title="Login"
              onPress={handleLogin}
              loading={loading}
              icon="log-in-outline"
              style={styles.loginButton}
            />

            <View style={[styles.testCredentials, { backgroundColor: theme.inputBackground }]}>
              <Text style={[styles.testTitle, { color: theme.textSecondary }]}>
                Test Credentials:
              </Text>
              <Text style={[styles.testText, { color: theme.textSecondary }]}>
                Manager: manager1 / manager123
              </Text>
              <Text style={[styles.testText, { color: theme.textSecondary }]}>
                Supervisor: supervisor1 / super123
              </Text>
              <Text style={[styles.testText, { color: theme.textSecondary }]}>
                Solver: solver1 / solver123
              </Text>
            </View>
          </View>
        </ScrollView>

        <TouchableOpacity
          style={[styles.themeToggle, { backgroundColor: theme.card, borderColor: theme.border }]}
          onPress={toggleTheme}
        >
          <Ionicons
            name={isDark ? 'sunny-outline' : 'moon-outline'}
            size={24}
            color={theme.text}
          />
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoContainer: {
    width: 96,
    height: 96,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
  },
  form: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  errorText: {
    fontSize: 14,
    flex: 1,
  },
  loginButton: {
    marginTop: 8,
  },
  testCredentials: {
    marginTop: 32,
    padding: 16,
    borderRadius: 12,
  },
  testTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  testText: {
    fontSize: 12,
    marginBottom: 4,
  },
  themeToggle: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
});
