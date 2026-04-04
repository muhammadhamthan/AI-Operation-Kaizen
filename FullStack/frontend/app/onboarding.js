import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
  Platform,
  StatusBar,
  useWindowDimensions,
  ActivityIndicator, // Added for loading state
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../src/theme/ThemeContext';

const SLIDES = [
  {
    icon: 'hardware-chip-outline',
    title: 'Kairox AI Opex',
    subtitle: 'Industrial Intelligence',
    body: 'Next-generation AI platform engineered for industrial excellence. Monitor, track, and optimise your operations with unprecedented precision.',
    accent: '#818cf8',
    glowColor: 'rgba(99,102,241,0.25)',
    accentDim: 'rgba(129,140,248,0.12)',
    tag: 'ENTERPRISE GRADE',
  },
  {
    icon: 'pulse-outline',
    title: 'Real-Time Tracking',
    subtitle: 'Zero Latency. Full Visibility.',
    body: 'Capture and resolve industrial issues the moment they arise. AI-assisted workflows ensure nothing slips through the cracks on your floor.',
    accent: '#34d399',
    glowColor: 'rgba(16,185,129,0.25)',
    accentDim: 'rgba(52,211,153,0.12)',
    tag: 'LIVE MONITORING',
  },
  {
    icon: 'analytics-outline',
    title: 'AI-Powered Insights',
    subtitle: 'Predict. Prevent. Perform.',
    body: 'Leverage machine learning to identify failure patterns, receive intelligent recommendations and prevent costly downtime before it ever occurs.',
    accent: '#fbbf24',
    glowColor: 'rgba(245,158,11,0.25)',
    accentDim: 'rgba(251,191,36,0.12)',
    tag: 'MACHINE LEARNING',
  },
  {
    icon: 'shield-checkmark-outline',
    title: 'Built for Your Team',
    subtitle: 'Collaborate Without Limits.',
    body: 'Role-based access, department-wide visibility and real-time sync — empowering every member of your industrial operation from day one.',
    accent: '#c084fc',
    glowColor: 'rgba(139,92,246,0.25)',
    accentDim: 'rgba(192,132,252,0.12)',
    tag: 'ENTERPRISE READY',
  },
];

const PARTICLES = [
  { x: '8%',  y: '12%', size: 5, delay: 0,    dur: 4200 },
  { x: '82%', y: '8%',  size: 4, delay: 600,  dur: 3800 },
  { x: '68%', y: '22%', size: 3, delay: 1100, dur: 5000 },
  { x: '15%', y: '68%', size: 6, delay: 400,  dur: 4500 },
  { x: '91%', y: '55%', size: 4, delay: 900,  dur: 3600 },
  { x: '45%', y: '88%', size: 3, delay: 200,  dur: 4800 },
  { x: '3%',  y: '42%', size: 5, delay: 1300, dur: 3900 },
  { x: '93%', y: '78%', size: 3, delay: 750,  dur: 4100 },
  { x: '55%', y: '5%',  size: 4, delay: 1600, dur: 5200 },
  { x: '30%', y: '80%', size: 3, delay: 300,  dur: 3700 },
];

function Particle({ x, y, size, delay, dur, accent }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(anim, { toValue: 1, duration: dur, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: dur, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);
  return (
    <Animated.View pointerEvents="none" style={{
        position: 'absolute', left: x, top: y, width: size, height: size, borderRadius: size / 2, backgroundColor: accent,
        opacity: anim.interpolate({ inputRange: [0, 1], outputRange: [0.06, 0.45] }),
        transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [0, -18] }) }],
      }}
    />
  );
}

function SpinRing({ diameter, accent, speed, reverse = false }) {
  const rot = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.timing(rot, { toValue: 1, duration: speed, easing: Easing.linear, useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [speed]);
  const spin = rot.interpolate({ inputRange: [0, 1], outputRange: reverse ? ['360deg', '0deg'] : ['0deg', '360deg'] });
  return (
    <Animated.View pointerEvents="none" style={{
        position: 'absolute', width: diameter, height: diameter, borderRadius: diameter / 2, borderWidth: 1, borderColor: accent,
        borderTopColor: 'transparent', borderBottomColor: 'transparent', opacity: 0.45, transform: [{ rotate: spin }],
      }}
    />
  );
}

function ScanLine({ accent, height }) {
  const pos = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pos, { toValue: 1, duration: 3500, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.delay(1200),
        Animated.timing(pos, { toValue: 0, duration: 0, useNativeDriver: true }),
        Animated.delay(600),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);
  return (
    <Animated.View pointerEvents="none" style={{
        position: 'absolute', left: 0, right: 0, height: 2, backgroundColor: accent, opacity: 0.18,
        transform: [{ translateY: pos.interpolate({ inputRange: [0, 1], outputRange: [0, height] }) }],
      }}
    />
  );
}

export default function OnboardingScreen() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const { theme, isDark, toggleTheme } = useTheme();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isNavigating, setIsNavigating] = useState(false); // 📍 Prevent double navigation
  const slide = SLIDES[currentIndex];

  const isWide = width >= 640;
  const iconBoxSize = isWide ? 120 : 94;
  const outerRing  = isWide ? 230 : 188;
  const innerRing  = isWide ? 170 : 138;

  const entranceFade  = useRef(new Animated.Value(0)).current;
  const entranceSlide = useRef(new Animated.Value(30)).current;
  const contentFade   = useRef(new Animated.Value(1)).current;
  const contentSlide  = useRef(new Animated.Value(0)).current;
  const iconScale     = useRef(new Animated.Value(0.6)).current;
  const iconFloat     = useRef(new Animated.Value(0)).current;
  const glowPulse     = useRef(new Animated.Value(0)).current;
  const buttonScale   = useRef(new Animated.Value(1)).current;
  const skipFade      = useRef(new Animated.Value(1)).current;

  const dotWidths = useRef(SLIDES.map((_, i) => new Animated.Value(i === 0 ? 28 : 8))).current;

  const screenBg = isDark ? '#0b0b14' : '#f8f9fa'; 
  const textPrimary = isDark ? '#ffffff' : '#111827';
  const textSecondary = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.6)';
  const textMuted = isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)';
  const textFaint = isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)';
  const gridLineColor = isDark ? 'rgba(255,255,255,0.028)' : 'rgba(0,0,0,0.04)';
  const skipBg = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)';
  const skipBorder = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)';
  const dotInactive = isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.12)';
  const toggleBg = isDark ? 'rgba(128, 128, 128, 0.15)' : 'rgba(0, 0, 0, 0.05)';
  const toggleIconColor = isDark ? '#8e8ea0' : '#6e6e80';

  useEffect(() => {
    Animated.parallel([
      Animated.timing(entranceFade, { toValue: 1, duration: 900, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(entranceSlide, { toValue: 0, duration: 900, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.spring(iconScale, { toValue: 1, friction: 5, tension: 38, useNativeDriver: true }),
    ]).start();

    const floatLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(iconFloat, { toValue: 1, duration: 2800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(iconFloat, { toValue: 0, duration: 2800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    floatLoop.start();

    const glowLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(glowPulse, { toValue: 1, duration: 2200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(glowPulse, { toValue: 0, duration: 2200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    glowLoop.start();

    return () => {
      floatLoop.stop();
      glowLoop.stop();
    };
  }, []);

  const animateDots = useCallback((nextIndex) => {
    SLIDES.forEach((_, i) => {
      Animated.spring(dotWidths[i], { toValue: i === nextIndex ? 28 : 8, friction: 6, tension: 60, useNativeDriver: false }).start();
    });
  }, [dotWidths]);

  const goTo = useCallback((nextIndex) => {
    if (nextIndex === currentIndex) return;
    Animated.timing(skipFade, { toValue: nextIndex === SLIDES.length - 1 ? 0 : 1, duration: 250, useNativeDriver: true }).start();
    Animated.parallel([
      Animated.timing(contentFade, { toValue: 0, duration: 160, useNativeDriver: true }),
      Animated.timing(contentSlide, { toValue: -45, duration: 160, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
      Animated.timing(iconScale, { toValue: 0.65, duration: 160, useNativeDriver: true }),
    ]).start(() => {
      setCurrentIndex(nextIndex);
      contentSlide.setValue(55);
      Animated.parallel([
        Animated.timing(contentFade, { toValue: 1, duration: 380, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.spring(contentSlide, { toValue: 0, friction: 9, tension: 65, useNativeDriver: true }),
        Animated.spring(iconScale, { toValue: 1, friction: 5, tension: 45, useNativeDriver: true }),
      ]).start();
    });
    animateDots(nextIndex);
  }, [currentIndex, animateDots]);

  // 📍 FIXED NAVIGATION: Added 'await' and manual check to break loops
  const finishOnboarding = async () => {
    if (isNavigating) return;
    setIsNavigating(true);
    try {
      await AsyncStorage.setItem('has_seen_onboarding', 'true');
      router.replace('/(auth)/login');
    } catch (e) {
      setIsNavigating(false);
    }
  };

  const handleNext = () => { 
    if (currentIndex < SLIDES.length - 1) {
      goTo(currentIndex + 1);
    } else {
      finishOnboarding();
    }
  };

  const handleSkip = () => finishOnboarding();

  const isLast = currentIndex === SLIDES.length - 1;
  const floatY   = iconFloat.interpolate({ inputRange: [0, 1], outputRange: [0, -14] });
  const glowOpac = glowPulse.interpolate({ inputRange: [0, 1], outputRange: [0.4, 0.85] });
  const glowSc   = glowPulse.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1.08] });

  return (
    <View style={[styles.root, { backgroundColor: screenBg }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor="transparent" translucent />

      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {Array.from({ length: 9 }).map((_, i) => (
          <View key={`h${i}`} style={[styles.gridLine, { top: `${(i + 1) * 10}%`, width: '100%', height: 1, backgroundColor: gridLineColor }]} />
        ))}
        {Array.from({ length: 7 }).map((_, i) => (
          <View key={`v${i}`} style={[styles.gridLine, { left: `${(i + 1) * 14}%`, width: 1, height: '100%', backgroundColor: gridLineColor }]} />
        ))}
        <View style={[styles.corner, styles.cornerTL, { borderColor: slide.accent }]} />
        <View style={[styles.corner, styles.cornerTR, { borderColor: slide.accent }]} />
        <View style={[styles.corner, styles.cornerBL, { borderColor: slide.accent }]} />
        <View style={[styles.corner, styles.cornerBR, { borderColor: slide.accent }]} />
      </View>

      <Animated.View pointerEvents="none" style={[styles.glowOrb, { width: width * 0.85, height: width * 0.85, borderRadius: (width * 0.85) / 2, backgroundColor: slide.glowColor, opacity: glowOpac, transform: [{ scale: glowSc }] }]} />

      <ScanLine accent={slide.accent} height={height} />
      {PARTICLES.map((p, i) => ( <Particle key={i} {...p} accent={slide.accent} /> ))}

      <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
        <Animated.View style={[styles.topBar, { opacity: entranceFade, transform: [{ translateY: entranceSlide }] }]}>
          <View style={styles.brandRow}>
            <View style={[styles.brandDot, { backgroundColor: slide.accent }]} />
            <Text style={[styles.brandLabel, { color: slide.accent }]}>KAIROX</Text>
            <View style={[styles.brandSep, { backgroundColor: slide.accent }]} />
            <Text style={[styles.brandSub, { color: textMuted }]}>AI OPEX</Text>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <TouchableOpacity onPress={toggleTheme} style={[styles.themeToggle, { backgroundColor: toggleBg }]}>
              <Ionicons name={isDark ? 'sunny' : 'moon'} size={18} color={toggleIconColor} />
            </TouchableOpacity>
            {!isLast && (
              <Animated.View style={{ opacity: skipFade }}>
                <TouchableOpacity onPress={handleSkip} style={[styles.skipBtn, { backgroundColor: skipBg, borderColor: skipBorder }]}>
                  <Text style={[styles.skipText, { color: textMuted }]}>Skip</Text>
                  <Ionicons name="chevron-forward" size={14} color={textMuted} />
                </TouchableOpacity>
              </Animated.View>
            )}
          </View>
        </Animated.View>

        <View style={[styles.mainArea, isWide && styles.mainAreaWide]}>
          <Animated.View style={[styles.iconSection, isWide && styles.iconSectionWide, { opacity: contentFade, transform: [{ scale: iconScale }, { translateY: floatY }] }]}>
            <SpinRing diameter={outerRing} accent={slide.accent} speed={14000} />
            <SpinRing diameter={innerRing} accent={slide.accent} speed={8000} reverse />
            <Animated.View pointerEvents="none" style={[styles.iconHalo, { width: iconBoxSize + 34, height: iconBoxSize + 34, borderRadius: (iconBoxSize + 34) / 2, backgroundColor: slide.glowColor, opacity: glowOpac, transform: [{ scale: glowSc }] }]} />
            <View style={[styles.iconBox, { width: iconBoxSize, height: iconBoxSize, borderRadius: iconBoxSize / 2, backgroundColor: slide.accentDim, borderColor: slide.accent }]}>
              <Ionicons name={slide.icon} size={iconBoxSize * 0.46} color={slide.accent} />
            </View>
          </Animated.View>

          <View style={[styles.textSection, isWide && styles.textSectionWide]}>
            <Animated.View style={[styles.tagChip, { backgroundColor: slide.accentDim, borderColor: slide.accent, opacity: contentFade, transform: [{ translateY: contentSlide }] }]}>
              <View style={[styles.tagDot, { backgroundColor: slide.accent }]} />
              <Text style={[styles.tagText, { color: slide.accent }]}>{slide.tag}</Text>
            </Animated.View>
            <Animated.Text style={[styles.slideTitle, isWide && styles.slideTitleWide, { color: textPrimary, opacity: contentFade, transform: [{ translateY: contentSlide }] }]}>{slide.title}</Animated.Text>
            <Animated.Text style={[styles.slideSubtitle, { color: slide.accent }, isWide && styles.slideSubtitleWide, { opacity: contentFade, transform: [{ translateY: contentSlide }] }]}>{slide.subtitle}</Animated.Text>
            <Animated.View style={[styles.divider, { backgroundColor: slide.accent, opacity: contentFade }]} />
            <Animated.Text style={[styles.slideBody, isWide && styles.slideBodyWide, { color: textSecondary, opacity: contentFade, transform: [{ translateY: contentSlide }] }]}>{slide.body}</Animated.Text>
          </View>
        </View>

        <Animated.View style={[styles.footer, { opacity: entranceFade, transform: [{ translateY: entranceSlide }] }]}>
          <View style={styles.dotsRow}>
            {SLIDES.map((_, i) => (
              <TouchableOpacity key={i} onPress={() => goTo(i)}>
                <Animated.View style={[styles.dot, { backgroundColor: i === currentIndex ? slide.accent : dotInactive, width: dotWidths[i] }]} />
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.navRow}>
            <Text style={styles.counter}>
              <Text style={{ color: slide.accent, fontWeight: '700' }}>{String(currentIndex + 1).padStart(2, '0')}</Text>
              <Text style={{ color: textFaint }}> / {String(SLIDES.length).padStart(2, '0')}</Text>
            </Text>

            <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
              <TouchableOpacity onPress={handleNext} disabled={isNavigating} style={[styles.nextBtn, { backgroundColor: slide.accent, opacity: isNavigating ? 0.7 : 1 }]}>
                {isNavigating ? (
                  <ActivityIndicator color="#000" size="small" />
                ) : (
                  <>
                    <Text style={styles.nextBtnText}>{isLast ? 'Get Started' : 'Next'}</Text>
                    <Ionicons name={isLast ? 'arrow-forward-circle' : 'arrow-forward'} size={19} color="#000" />
                  </>
                )}
              </TouchableOpacity>
            </Animated.View>
          </View>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, overflow: 'hidden' },
  gridLine: { position: 'absolute' },
  corner: { position: 'absolute', width: 28, height: 28, opacity: 0.35 },
  cornerTL: { top: Platform.OS === 'ios' ? 56 : 36, left: 20, borderTopWidth: 1.5, borderLeftWidth: 1.5 },
  cornerTR: { top: Platform.OS === 'ios' ? 56 : 36, right: 20, borderTopWidth: 1.5, borderRightWidth: 1.5 },
  cornerBL: { bottom: 28, left: 20, borderBottomWidth: 1.5, borderLeftWidth: 1.5 },
  cornerBR: { bottom: 28, right: 20, borderBottomWidth: 1.5, borderRightWidth: 1.5 },
  glowOrb: { position: 'absolute', top: '-18%', left: '8%' },
  safeArea: { flex: 1, paddingHorizontal: 24 },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, paddingBottom: 8 },
  mainArea: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  mainAreaWide: { flexDirection: 'row', justifyContent: 'space-evenly', alignItems: 'center', paddingHorizontal: 16 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  brandDot: { width: 7, height: 7, borderRadius: 3.5 },
  brandLabel: { fontSize: 13, fontWeight: '800', letterSpacing: 2.5 },
  brandSep: { width: 1, height: 12, opacity: 0.4 },
  brandSub: { fontSize: 12, fontWeight: '500', letterSpacing: 1.8 },
  themeToggle: { padding: 8, borderRadius: 20 },
  skipBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  skipText: { fontSize: 13, fontWeight: '500', letterSpacing: 0.4 },
  iconSection: { width: 230, height: 230, justifyContent: 'center', alignItems: 'center', marginBottom: 40 },
  iconSectionWide: { marginBottom: 0, marginRight: 24, width: 260, height: 260 },
  iconHalo: { position: 'absolute' },
  iconBox: { justifyContent: 'center', alignItems: 'center', borderWidth: 1.5 },
  textSection: { alignItems: 'center', paddingHorizontal: 12, maxWidth: 420 },
  textSectionWide: { alignItems: 'flex-start', flex: 1, maxWidth: 480 },
  tagChip: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 30, borderWidth: 1, marginBottom: 22 },
  tagDot: { width: 6, height: 6, borderRadius: 3 },
  tagText: { fontSize: 11, fontWeight: '700', letterSpacing: 2 },
  slideTitle: { fontSize: 34, fontWeight: '800', textAlign: 'center', letterSpacing: 0.3, marginBottom: 10, lineHeight: 42 },
  slideTitleWide: { fontSize: 42, textAlign: 'left', lineHeight: 52 },
  slideSubtitle: { fontSize: 16, fontWeight: '600', letterSpacing: 0.5, textAlign: 'center', marginBottom: 18 },
  slideSubtitleWide: { fontSize: 18, textAlign: 'left' },
  divider: { width: 40, height: 2.5, borderRadius: 2, marginBottom: 20, opacity: 0.7, alignSelf: 'center' },
  slideBody: { fontSize: 15, lineHeight: 24, textAlign: 'center', maxWidth: 340, fontWeight: '400', letterSpacing: 0.2 },
  slideBodyWide: { textAlign: 'left', maxWidth: 420, fontSize: 16, lineHeight: 26 },
  footer: { paddingBottom: Platform.OS === 'android' ? 12 : 4, paddingTop: 16, gap: 20 },
  dotsRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  dot: { height: 8, borderRadius: 4 },
  navRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  counter: { fontSize: 14, letterSpacing: 1.5, fontWeight: '600', fontVariant: ['tabular-nums'] },
  nextBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 28, paddingVertical: 15, borderRadius: 50 },
  nextBtnText: { fontSize: 15, fontWeight: '700', color: '#000', letterSpacing: 0.4 },
});