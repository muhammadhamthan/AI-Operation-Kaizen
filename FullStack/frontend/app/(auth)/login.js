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
  Image,
  TextInput,
  useWindowDimensions,
} from 'react-native';

import { useRouter } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../src/theme/ThemeContext';
import { loginUser, selectAuthLoading, selectAuthError, clearError } from '../../src/store/slices/authSlice';
import Input from '../../src/components/common/Input';
import Button from '../../src/components/common/Button';

// Pre-require images for performance, adjust paths if needed
const logoDark = require('../../assets/images/kaizen_logo_dark.png');
const logoWhite = require('../../assets/images/kaizen_logo_white.jpeg');

export default function LoginScreen() {
  const { width } = useWindowDimensions();
  const { theme, isDark, toggleTheme } = useTheme();
  const router = useRouter();
  const dispatch = useDispatch();
  const loading = useSelector(selectAuthLoading);
  const error = useSelector(selectAuthError);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [validationError, setValidationError] = useState('');

  // ── Entrance Animations ──
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        easing: Easing.out(Easing.back(1)),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

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

  const bg = isDark ? '#0F172A' : '#FFFFFF';
  const cardBg = isDark ? '#1E293B' : '#FFFFFF';
  const textColor = isDark ? '#F1F5F9' : '#1E293B';
  const subTextColor = isDark ? '#94A3B8' : '#64748B';
  const primaryColor = '#3B82F6';
  const inputBg = isDark ? '#334155' : '#F1F5F9';
  const borderColor = isDark ? '#475569' : '#E2E8F0';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bg }]}>
      <View style={[styles.backgroundDecoration, { backgroundColor: primaryColor + '08' }]} />
      
      <TouchableOpacity
        style={styles.themeToggle}
        onPress={toggleTheme}
        activeOpacity={0.6}
      >
        <Ionicons
          name={isDark ? 'sunny' : 'moon'}
          size={22}
          color={subTextColor}
        />
      </TouchableOpacity>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View 
            style={[
              styles.mainContainer, 
              { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
            ]}
          >
            {/* ── LOGO SECTION ── */}
            <View style={styles.logoContainer}>
              <Image
                source={isDark ? logoDark : logoWhite}
                style={styles.logoImage}
                resizeMode="contain"
              />
            </View>

            {/* ── FORM SECTION ── */}
            <View style={[styles.formCard, { backgroundColor: cardBg, borderColor }]}>
              <View style={styles.headerText}>
                <Text style={[styles.title, { color: textColor }]}>Kairox Ai Opex</Text>
                <Text style={[styles.subtitle, { color: subTextColor }]}>Industrial Intelligence System</Text>
              </View>

              <View style={styles.inputsGroup}>
                {/* Username */}
                <View style={styles.inputWrapper}>
                  <Text style={[styles.inputLabel, { color: subTextColor }]}>ID / USERNAME</Text>
                  <View style={[styles.inputContainer, { backgroundColor: inputBg, borderColor }]}>
                    <Ionicons name="person-outline" size={20} color={subTextColor} />
                    <TextInput
                      value={username}
                      onChangeText={setUsername}
                      placeholder="e.g. admin_01"
                      placeholderTextColor={isDark ? '#475569' : '#94A3B8'}
                      style={[styles.rawInput, { color: textColor }]}
                      autoCapitalize="none"
                    />
                  </View>
                </View>

                {/* Password */}
                <View style={styles.inputWrapper}>
                  <Text style={[styles.inputLabel, { color: subTextColor }]}>SECURITY ACCESS</Text>
                  <View style={[styles.inputContainer, { backgroundColor: inputBg, borderColor }]}>
                    <Ionicons name="shield-checkmark-outline" size={20} color={subTextColor} />
                    <TextInput
                      value={password}
                      onChangeText={setPassword}
                      placeholder="••••••••"
                      placeholderTextColor={isDark ? '#475569' : '#94A3B8'}
                      secureTextEntry={!showPassword}
                      style={[styles.rawInput, { color: textColor }]}
                      autoCapitalize="none"
                    />
                    <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                      <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color={subTextColor} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              {/* Error Messages */}
              {(validationError || error) && (
                <View style={[styles.errorContainer, { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.1)' : '#FEF2F2', borderColor: 'rgba(239, 68, 68, 0.2)' }]}>
                  <Ionicons name="alert-circle" size={18} color="#EF4444" />
                  <Text style={[styles.errorText, { color: "#EF4444" }]}>
                    {validationError || error}
                  </Text>
                </View>
              )}

              {/* Login Button */}
              <TouchableOpacity 
                onPress={handleLogin}
                activeOpacity={0.8}
                disabled={loading}
                style={[styles.loginButton, { backgroundColor: primaryColor }]}
              >
                {loading ? (
                  <View style={styles.loadingRow}>
                    <Text style={styles.buttonText}>Authenticating...</Text>
                  </View>
                ) : (
                  <Text style={styles.buttonText}>Secure Login</Text>
                )}
              </TouchableOpacity>

              <View style={styles.footer}>
                <Text style={[styles.footerText, { color: subTextColor }]}>
                  Authorized Personnel Only
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
  backgroundDecoration: {
    position: 'absolute',
    top: -100,
    right: -100,
    width: 300,
    height: 300,
    borderRadius: 150,
    zIndex: 0,
  },
  themeToggle: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 10 : 20,
    right: 20,
    zIndex: 10,
    padding: 10,
    backgroundColor: 'rgba(128, 128, 128, 0.08)',
    borderRadius: 12,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingBottom: 40,
  },
  mainContainer: {
    flex: 1,
    paddingHorizontal: 28,
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 30,
    marginTop: 20,
  },
  logoImage: {
    width: '95%',
    height: 200,
    maxWidth: 300,
  },
  formCard: {
    width: '100%',
    padding: 32,
    borderRadius: 32,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
  },
  headerText: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    opacity: 0.8,
    letterSpacing: 0.2,
  },
  inputsGroup: {
    gap: 18,
    marginBottom: 24,
  },
  inputWrapper: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    marginLeft: 2,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: 1.5,
    paddingHorizontal: 16,
    height: 56,
    gap: 12,
  },
  rawInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
  },
  eyeIcon: {
    padding: 4,
  },
  loginButton: {
    height: 60,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    marginBottom: 20,
    gap: 10,
    borderWidth: 1,
  },
  errorText: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  footer: {
    marginTop: 24,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    opacity: 0.6,
  },
});

