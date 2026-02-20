import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  ScrollView,
  Animated,
  Easing,
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

  // ── Premium Entrance Animations ──
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const logoScale = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(logoScale, {
        toValue: 1,
        friction: 6,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim, logoScale]);

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

  // ── High-End Color Palette ──
  const screenBg = isDark ? '#121212' : '#ffffff'; 
  const textColor = isDark ? '#ffffff' : '#000000';
  const mutedColor = isDark ? '#8e8ea0' : '#6e6e80';
  const logoBg = isDark ? '#ffffff' : '#000000';
  const logoIconColor = isDark ? '#000000' : '#ffffff';
  
  // Frosted Glass / Soft Card effect for the Dev box
  const devBoxBg = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)';
  const devBoxBorder = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)';

  return (
    <SafeAreaView edges={['top', 'bottom']} style={[styles.container, { backgroundColor: screenBg }]}>
      
      {/* ── Seamless Theme Toggle ── */}
      <TouchableOpacity
        style={styles.themeToggle}
        onPress={toggleTheme}
        activeOpacity={0.6}
        hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
      >
        <Ionicons
          name={isDark ? 'sunny' : 'moon'} 
          size={24}
          color={mutedColor}
        />
      </TouchableOpacity>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false} // Prevents over-scrolling for a more native app feel
        >
          {/* ── Animated Header ── */}
          <Animated.View 
            style={[
              styles.header,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }]
              }
            ]}
          >
            {/* Logo with Glow Effect */}
            <View style={styles.logoOuterGlow}>
              <Animated.View 
                style={[
                  styles.logoContainer, 
                  { 
                    backgroundColor: logoBg,
                    transform: [{ scale: logoScale }] 
                  }
                ]}
              >
                <Ionicons name="construct" size={32} color={logoIconColor} style={{ marginLeft: 2 }} />
              </Animated.View>
            </View>

            <Text style={[styles.title, { color: textColor }]}>
              MaintenanceFlow
            </Text>
            <Text style={[styles.subtitle, { color: mutedColor }]}>
              Industrial Issue Tracking
            </Text>
          </Animated.View>

          {/* ── Animated Form ── */}
          <Animated.View 
            style={[
              styles.form,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }]
              }
            ]}
          >
            <View style={styles.inputGroup}>
              <Input
                label="Username"
                value={username}
                onChangeText={setUsername}
                placeholder="Enter your username"
                icon="person-outline"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <Input
                label="Password"
                value={password}
                onChangeText={setPassword}
                placeholder="Enter your password"
                icon="lock-closed-outline"
                secureTextEntry
                autoCapitalize="none"
              />
            </View>

            {(validationError || error) && (
              <Animated.View style={[styles.errorContainer, { backgroundColor: `${theme.danger}15` }]}>
                <Ionicons name="warning" size={18} color={theme.danger} />
                <Text style={[styles.errorText, { color: theme.danger }]}>
                  {validationError || error}
                </Text>
              </Animated.View>
            )}

            <Button
              title="Continue" 
              onPress={handleLogin}
              loading={loading}
              style={styles.loginButton}
            />

            {/* ── Sleek Developer Card ── */}
            <View style={[styles.testCredentials, { backgroundColor: devBoxBg, borderColor: devBoxBorder }]}>
              <View style={styles.devCardHeader}>
                <Ionicons name="code-slash" size={14} color={mutedColor} />
                <Text style={[styles.testTitle, { color: mutedColor }]}>
                  TEST CREDENTIALS
                </Text>
              </View>
              <View style={styles.testList}>
                <Text style={[styles.testText, { color: textColor }]}>
                  <Text style={{ fontWeight: '600', color: mutedColor }}>Mgr:</Text> manager1 / manager123
                </Text>
                <Text style={[styles.testText, { color: textColor }]}>
                  <Text style={{ fontWeight: '600', color: mutedColor }}>Sup:</Text> supervisor1 / super123
                </Text>
                <Text style={[styles.testText, { color: textColor }]}>
                  <Text style={{ fontWeight: '600', color: mutedColor }}>Sol:</Text> solver1 / solver123
                </Text>
              </View>
            </View>
          </Animated.View>
        </ScrollView>
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
    paddingHorizontal: 28,
    justifyContent: 'center', 
    paddingBottom: 40,
  },
  
  // ── Header ──
  header: {
    alignItems: 'center',
    marginBottom: 56, 
  },
  logoOuterGlow: {
    shadowColor: '#10a37f', // OpenAI signature green glow
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 10,
    marginBottom: 28,
  },
  logoContainer: {
    width: 68,
    height: 68,
    borderRadius: 24, 
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 34,
    fontWeight: '800',
    marginBottom: 10,
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 17,
    fontWeight: '400',
    letterSpacing: 0.3,
    textAlign: 'center',
  },

  // ── Form ──
  form: {
    width: '100%',
    maxWidth: 380, 
    alignSelf: 'center',
  },
  inputGroup: {
    marginBottom: 20, 
  },
  
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14, 
    marginBottom: 24,
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)', 
  },
  errorText: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  
  loginButton: {
    marginTop: 4,
    paddingVertical: 16, 
    borderRadius: 16, 
  },

  // ── Test Credentials Card ──
  testCredentials: {
    marginTop: 48,
    padding: 20,
    borderRadius: 20,
    borderWidth: 1, 
  },
  devCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 16,
  },
  testTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.2, 
  },
  testList: {
    gap: 10, 
    alignItems: 'center',
  },
  testText: {
    fontSize: 14,
    letterSpacing: 0.3,
  },

  // ── Theme Toggle ──
  themeToggle: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 10 : 20,
    right: 20,
    zIndex: 10,
    padding: 8,
    backgroundColor: 'rgba(128, 128, 128, 0.1)', 
    borderRadius: 20,
  },
});