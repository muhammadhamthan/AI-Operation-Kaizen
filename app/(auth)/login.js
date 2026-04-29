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
  Dimensions,
} from 'react-native';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
// Responsive helpers
const isSmall   = SCREEN_W < 360;          // tiny phones (e.g. SE)
const isMedium  = SCREEN_W >= 360 && SCREEN_W < 430; // regular phones
const isTablet  = SCREEN_W >= 430;          // large phones / tablets

const rs = (small, medium, large) => isSmall ? small : isMedium ? medium : large;
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
  const logoScale = useRef(new Animated.Value(0.9)).current;

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
          bounces={false} 
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
            {/* 📍 Pure Image - No shadows, no borders, no boxes */}
            <Animated.View style={{ transform: [{ scale: logoScale }] }}>
              <Image
                source={isDark ? logoDark : logoWhite}
                style={styles.logoImage}
                resizeMode="contain"
              />
            </Animated.View>
          </Animated.View>

          {/* ── Unified Card Container ── */}
          <View style={[
            styles.formContainer,
            {
              backgroundColor: isDark ? '#1a1a2e' : '#ffffff',
              borderColor: isDark ? 'rgba(59,130,246,0.45)' : 'rgba(37,99,235,0.35)',
              shadowColor: isDark ? '#3b82f6' : '#2563eb',
            }
          ]}>
            {/* ── Card Header ── */}
            <View style={styles.cardHeader}>
              <Text style={[styles.title, { color: textColor }]}>
                Kairox Ai Opex
              </Text>
              <Text style={[styles.subtitle, { color: mutedColor }]}>
                Industrial Issue Tracking
              </Text>
            </View>

            {/* ── Divider ── */}
            <View style={[styles.divider, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)' }]} />

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

            </Animated.View>
          </View>
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
    paddingHorizontal: rs(16, 24, 32),
    justifyContent: 'center',
    paddingVertical: rs(16, 20, 24),
  },
  
  // ── Header ──
  header: {
    alignItems: 'center',
    marginBottom: rs(8, 12, 16),
  },
  logoImage: {
    width:  rs(180, 240, 280),
    height: rs(90, 120, 150),
  },
  title: {
    fontSize: rs(24, 28, 34),
    fontWeight: '800',
    marginBottom: 8,
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: rs(13, 15, 17),
    fontWeight: '400',
    letterSpacing: 0.3,
    textAlign: 'center',
  },

  // ── Unified Card Container ──
  formContainer: {
    width: '100%',
    maxWidth: isTablet ? 480 : 420,
    alignSelf: 'center',
    borderRadius: rs(16, 20, 24),
    padding: rs(16, 20, 24),
    borderWidth: 1,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
  },
  cardHeader: {
    alignItems: 'center',
    marginBottom: rs(10, 12, 16),
  },
  divider: {
    height: 1,
    width: '100%',
    marginBottom: rs(12, 16, 20),
  },

  // ── Form ──
  form: {
    width: '100%',
  },
  inputGroup: {
    marginBottom: rs(14, 18, 20),
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
    marginTop: rs(2, 4, 6),
    paddingVertical: rs(12, 14, 16),
    borderRadius: rs(12, 14, 16),
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