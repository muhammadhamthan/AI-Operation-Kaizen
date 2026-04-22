
## C:\Users\head user\Desktop\Hamthan\v3\AI-Operation-Kaizen\FullStack\frontend\app\(auth)\login.js

```javascript
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
const logoDark = require('../../assets/images/kaizen_logo_dark.jpeg');
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
            <Animated.View style={{ transform: [{ scale: logoScale }], marginBottom: 24 }}>
              <Image
                source={isDark ? logoDark : logoWhite}
                style={styles.logoImage}
                resizeMode="contain"
              />
            </Animated.View>

            <Text style={[styles.title, { color: textColor }]}>
              Kairox Ai Opex
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
  logoImage: {
    width: 200, 
    height: 100, 
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
```

## C:\Users\head user\Desktop\Hamthan\v3\AI-Operation-Kaizen\FullStack\frontend\app\(auth)\_layout.js

```javascript
import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
    </Stack>
  );
}
```

## C:\Users\head user\Desktop\Hamthan\v3\AI-Operation-Kaizen\FullStack\frontend\app\(main)\(tabs)\dashboard\awaiting_review.js

```javascript
import React, { useEffect, useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TextInput, 
  TouchableOpacity, 
  RefreshControl,
  Platform 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../../src/theme/ThemeContext';
import { selectCurrentUser } from '../../../../src/store/slices/authSlice';
import { fetchIssues, selectAwaitingReviewIssues, selectIssuesLoading, setFilters } from '../../../../src/store/slices/issuesSlice';
import { selectIsOnline } from '../../../../src/store/slices/offlineSlice';
import IssueCard from '../../../../src/components/issue/IssueCard';
import Loader from '../../../../src/components/common/Loader';
import EmptyState from '../../../../src/components/common/EmptyState';
import Toast from '../../../../src/components/common/Toast';
import FullScreenSpinner from '../../../../src/components/common/FullScreenSpinner';

export default function AwaitingReviewScreen() {
  const { theme, isDark } = useTheme(); 
  const router = useRouter();
  const dispatch = useDispatch();
  
  const user = useSelector(selectCurrentUser);
  const issues = useSelector(selectAwaitingReviewIssues);
  const loading = useSelector(selectIssuesLoading);
  const isOnline = useSelector(selectIsOnline);
  
  const [searchText, setSearchText] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => {
    if (user) dispatch(fetchIssues(user));
  }, [user, dispatch]);

  useEffect(() => {
    dispatch(setFilters({ search: searchText }));
  }, [searchText, dispatch]);

  const onRefresh = useCallback(async () => {
    if (!isOnline) {
      setToastMessage("Can't refresh while offline");
      setTimeout(() => setToastMessage(''), 3000);
      return;
    }

    const now = Date.now();
    if (lastRefresh && now - lastRefresh < 5000) {
      setToastMessage('Just refreshed. Wait a moment.');
      setTimeout(() => setToastMessage(''), 3000);
      return;
    }

    setRefreshing(true);
    if (user) {
      try {
        await Promise.allSettled([dispatch(fetchIssues(user))]);
      } finally {
        setLastRefresh(Date.now());
        setRefreshing(false);
      }
    } else {
      setRefreshing(false);
    }
  }, [user, isOnline, lastRefresh, dispatch]);

  const handleIssuePress = (issue) => {
    router.push({ pathname: '/(main)/(tabs)/dashboard/awaiting_review_detail', params: { id: issue.id } });
  };

  const filteredIssues = issues.filter((issue) => {
    if (!searchText) return true;
    const lowerSearch = searchText.toLowerCase();
    return (
      issue.title?.toLowerCase().includes(lowerSearch) ||
      issue.description?.toLowerCase().includes(lowerSearch) ||
      issue.site_name?.toLowerCase().includes(lowerSearch) ||
      issue.id?.toString().includes(lowerSearch)
    );
  });

  if (loading && issues.length === 0 && !refreshing) {
    return <Loader message="Loading review queue..." />;
  }

  // ── PREMIUM MONOCHROME PALETTE ──
  const bgColor = isDark ? '#212121' : '#f9f9f9';
  const borderColor = isDark ? '#333333' : '#e5e5e5';
  const inactiveBg = isDark ? 'rgba(255,255,255,0.06)' : '#f4f4f4';
  const reviewAccent = '#f97316'; // Orange accent for pending review

  return (
    <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: bgColor }]}>
      
      {/* ── HEADER ── */}
      <View style={[styles.header, { backgroundColor: bgColor, borderBottomColor: borderColor }]}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.6} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.textSecondary }]}>Awaiting Review</Text>
        
        <View style={styles.headerRight}>
          {Platform.OS === 'web' ? (
            <TouchableOpacity onPress={onRefresh} disabled={refreshing} style={styles.webRefreshButton}>
              <Ionicons name="sync" size={22} color={refreshing ? reviewAccent : theme.textSecondary} />
            </TouchableOpacity>
          ) : (
            <View style={styles.placeholder} />
          )}
        </View>
      </View>

      {/* ── SEARCH BAR ── */}
      <View style={[styles.searchContainer, { backgroundColor: bgColor }]}>
        <View style={[styles.searchInput, { backgroundColor: inactiveBg, borderColor }]}>
          <Ionicons name="search" size={18} color={theme.textSecondary} />
          <TextInput
            style={[styles.searchTextInput, { color: theme.text }]}
            placeholder="Search review queue..."
            placeholderTextColor={theme.textSecondary}
            value={searchText}
            onChangeText={setSearchText}
          />
          {searchText !== '' && (
            <TouchableOpacity onPress={() => setSearchText('')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close-circle" size={18} color={theme.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── RESULTS COUNT ── */}
      <View style={styles.resultsHeader}>
        <Text style={[styles.resultsCount, { color: theme.textSecondary }]}>
          {filteredIssues.length} issue{filteredIssues.length !== 1 ? 's' : ''} found
        </Text>
      </View>

      {/* ── LIST ── */}
      <FlatList
        data={filteredIssues}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => <IssueCard issue={item} onPress={() => handleIssuePress(item)} />}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <EmptyState 
            icon="checkmark-done-circle-outline" 
            title={searchText ? "No matches found" : "Queue is Empty!"} 
            message={searchText ? `No issues matching "${searchText}"` : "You have no issues waiting for review right now."} 
          />
        }
        showsVerticalScrollIndicator={false}
        refreshControl={
          Platform.OS === 'web' ? undefined : (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[reviewAccent]}
              tintColor={reviewAccent}
            />
          )
        }
      />

      <FullScreenSpinner visible={refreshing} message="Updating Queue..." color={reviewAccent} />
      {toastMessage !== '' && <Toast message={toastMessage} />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: 16, 
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backButton: { padding: 4, marginLeft: -4 },
  headerTitle: { fontSize: 14, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  headerRight: { width: 32, alignItems: 'flex-end' },
  placeholder: { width: 32 },
  webRefreshButton: { padding: 4 },
  searchContainer: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12 },
  searchInput: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 14, 
    height: 44, 
    borderRadius: 12, 
    borderWidth: 1,
    gap: 8 
  },
  searchTextInput: { flex: 1, fontSize: 15 },
  resultsHeader: { paddingHorizontal: 20, paddingBottom: 12 },
  resultsCount: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8 },
  listContent: { paddingHorizontal: 16, paddingBottom: 24 },
});
```

## C:\Users\head user\Desktop\Hamthan\v3\AI-Operation-Kaizen\FullStack\frontend\app\(main)\(tabs)\dashboard\awaiting_review_detail.js

```javascript
import React, { useEffect, useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Alert,
  Platform,
  RefreshControl 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../../src/theme/ThemeContext';
import { selectCurrentUser } from '../../../../src/store/slices/authSlice';
import { 
  fetchIssueById, 
  fetchIssueTimeline,
  selectIssueById,
  selectCurrentIssue,
  selectIssuesLoading, 
  clearCurrentIssue 
} from '../../../../src/store/slices/issuesSlice';
import { calculateOverdueDays } from '../../../../src/utils/overdue';
import StatusBadge from '../../../../src/components/common/StatusBadge';
import Button from '../../../../src/components/common/Button';
import IssueTimeline from '../../../../src/components/issue/IssueTimeline';
import ImageGallery from '../../../../src/components/issue/ImageGallery';
import Loader from '../../../../src/components/common/Loader';

import { selectIsOnline } from '../../../../src/store/slices/offlineSlice';
import Toast from '../../../../src/components/common/Toast';
import FullScreenSpinner from '../../../../src/components/common/FullScreenSpinner';
import Avatar from '../../../../src/components/common/Avatar';
import { formatDate } from '../../../../src/utils/formatters';

export default function AwaitingReviewDetailScreen() {
  const { theme, isDark } = useTheme(); 
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const dispatch = useDispatch();
  const user = useSelector(selectCurrentUser);
  
  const cachedIssue = useSelector((state) => selectIssueById(state, parseInt(id)));
  const fullIssue = useSelector(selectCurrentIssue);
  const loading = useSelector(selectIssuesLoading);
  const isOnline = useSelector(selectIsOnline);

  const [refreshing, setRefreshing] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const issue = (fullIssue && fullIssue.id === parseInt(id)) ? fullIssue : cachedIssue;

  useEffect(() => {
    if (id) {
      dispatch(fetchIssueById(parseInt(id)));
      dispatch(fetchIssueTimeline(parseInt(id)));
    }
    return () => { dispatch(clearCurrentIssue()); };
  }, [id, dispatch]);

  const onRefresh = useCallback(async () => {
    if (!isOnline) {
      setToastMessage("Can't refresh while offline");
      setTimeout(() => setToastMessage(''), 3000);
      return;
    }
    if (!id) return;
    
    setRefreshing(true);
    try {
      await Promise.allSettled([
        dispatch(fetchIssueById(parseInt(id))),
        dispatch(fetchIssueTimeline(parseInt(id)))
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [id, isOnline, dispatch]);

  // 📍 NEW: Dedicated Review Action Handler (Web & Native Safe)
  const handleReviewAction = (actionType) => {
    console.log(`\n=============================================`);
    console.log(`📝 SUPERVISOR REVIEW ACTION: ${actionType}`);
    console.log(`=============================================`);
    console.log(`Issue ID:      ${issue?.id}`);
    console.log(`Supervisor ID: ${user?.id}`);
    console.log(`Supervisor:    ${user?.name}`);
    console.log(`=============================================\n`);

    if (actionType === 'APPROVE') {
      if (Platform.OS === 'web') {
        // Web Fallback
        const confirmApprove = window.confirm("Are you sure you want to approve this fix? The issue will be marked as COMPLETED.");
        if (confirmApprove) {
          console.log(`[DEBUG] Issue #${issue?.id} APPROVED successfully.`);
          // TODO: Add backend API call here (e.g., dispatch(approveIssue(issue.id)))
          alert("Success! Issue has been approved and closed.");
 
        }
      } else {
        // Native Mobile Flow
        Alert.alert(
          "Approve Fix",
          "Are you sure you want to approve this fix? The issue will be marked as COMPLETED.",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Approve",
              style: "default",
              onPress: () => {
                console.log(`[DEBUG] Issue #${issue?.id} APPROVED successfully.`);
                // TODO: Add backend API call here
                Alert.alert("Success", "Issue has been approved and closed.");
             
              }
            }
          ]
        );
      }
    } else if (actionType === 'REJECT') {
      if (Platform.OS === 'web') {
        // Web Fallback
        const confirmReject = window.confirm("Are you sure you want to reject this fix? The issue will be sent back to the solver.");
        if (confirmReject) {
          console.log(`[DEBUG] Issue #${issue?.id} REJECTED successfully.`);
          // TODO: Add backend API call here (e.g., dispatch(rejectIssue(issue.id)))
          alert("Rejected! Issue has been returned to the solver.");
    
        }
      } else {
        // Native Mobile Flow
        Alert.alert(
          "Reject Fix",
          "Are you sure you want to reject this fix? The issue will be sent back to the solver.",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Reject",
              style: "destructive",
              onPress: () => {
                console.log(`[DEBUG] Issue #${issue?.id} REJECTED successfully.`);
                // TODO: Add backend API call here
                Alert.alert("Rejected", "Issue has been returned to the solver.");
      
              }
            }
          ]
        );
      }
    }
  };

  const overdueDays = issue ? calculateOverdueDays(issue.deadline_at, issue.status) : null;

  if (loading && !refreshing && !issue) return <Loader message="Loading review details..." />;
  if (!issue) return <Loader message="Loading review details..." />;

  const siteName = issue.site_name || issue.site?.name || 'N/A';
  const siteLocation = issue.site_location || issue.site?.location || null;
  const raisedByName = issue.supervisor_name || 'N/A';
  
  const currentAssignment = issue.assignments && issue.assignments.length > 0 
    ? issue.assignments[0] 
    : null;
    
  const solverName = currentAssignment?.solver_name || null;

  // ── PREMIUM PALETTE ──
  const bgColor = isDark ? '#212121' : '#f9f9f9';
  const surfaceColor = isDark ? '#171717' : '#ffffff';
  const borderColor = isDark ? '#333333' : '#e5e5e5';
  const iconBg = isDark ? 'rgba(255,255,255,0.05)' : '#f4f4f4';
  const reviewAccent = '#f97316'; // Orange accent
  
  const alertBg = isDark ? 'rgba(249, 115, 22, 0.1)' : '#fff7ed';
  const alertBorder = isDark ? 'rgba(249, 115, 22, 0.2)' : '#ffedd5';

  return (
    <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: bgColor }]}>
      
      {/* ── HEADER ── */}
      <View style={[styles.header, { backgroundColor: bgColor, borderBottomColor: borderColor }]}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.6} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.textSecondary }]}>Review Required</Text>
        
        <View style={styles.headerRight}>
          {Platform.OS === 'web' ? (
            <TouchableOpacity onPress={onRefresh} disabled={refreshing} style={styles.webRefreshButton}>
              <Ionicons name="sync" size={22} color={refreshing ? reviewAccent : theme.textSecondary} />
            </TouchableOpacity>
          ) : (
            <View style={styles.placeholder} />
          )}
        </View>
      </View>

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          Platform.OS === 'web' ? undefined : (
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.textSecondary} />
          )
        }
      >
        
        {/* ── BANNER ── */}
        <View style={[styles.warningBanner, { backgroundColor: alertBg, borderColor: alertBorder }]}>
          <View style={styles.warningIconWrapper}>
            <Ionicons name="eye-outline" size={18} color="#f97316" />
          </View>
          <View style={styles.warningContent}>
            <Text style={styles.warningTitle}>Ready for Inspection</Text>
            <Text style={styles.warningText}>
              The solver has marked this issue as resolved. Please review and approve or reject the fix.
            </Text>
          </View>
        </View>

        {/* ── ISSUE IDENTITY ── */}
        <View style={[styles.card, styles.flatCard, { backgroundColor: surfaceColor, borderColor }]}>
          <View style={styles.idRow}>
            <Text style={[styles.issueId, { color: theme.textSecondary }]}>ISSUE #{issue.id}</Text>
            <View style={styles.statusRow}>
              <StatusBadge status={issue.status} size="small" />
              <StatusBadge status={issue.priority} type="priority" size="small" />
            </View>
          </View>
          
          <Text style={[styles.title, { color: theme.text }]}>{issue.title}</Text>
          <Text style={[styles.description, { color: theme.textSecondary }]}>{issue.description}</Text>
        </View>

        {/* ── DETAILS & LOCATION ── */}
        <View style={[styles.card, styles.flatCard, { backgroundColor: surfaceColor, borderColor }]}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Details</Text>
          
          <View style={styles.infoRow}>
            <View style={[styles.iconWrapper, { backgroundColor: iconBg }]}>
              <Ionicons name="location-outline" size={18} color={theme.textSecondary} />
            </View>
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Site</Text>
              <Text style={[styles.infoValue, { color: theme.text }]}>{siteName}</Text>
            </View>
          </View>

          {siteLocation && (
            <View style={[styles.infoRow, { marginTop: 16 }]}>
              <View style={[styles.iconWrapper, { backgroundColor: iconBg }]}>
                <Ionicons name="map-outline" size={18} color={theme.textSecondary} />
              </View>
              <View style={styles.infoContent}>
                <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Address</Text>
                <Text style={[styles.infoValue, { color: theme.text }]}>{siteLocation}</Text>
              </View>
            </View>
          )}

          {issue.deadline_at && (
            <View style={[styles.infoRow, { marginTop: 16 }]}>
              <View style={[styles.iconWrapper, { backgroundColor: iconBg }]}>
                <Ionicons name="calendar-outline" size={18} color={theme.textSecondary} />
              </View>
              <View style={styles.infoContent}>
                <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Deadline</Text>
                <Text style={[styles.infoValue, { color: theme.text }]}>{formatDate(issue.deadline_at)}</Text>
              </View>
            </View>
          )}
        </View>

        {/* ── PEOPLE INVOLVED ── */}
        <View style={[styles.card, styles.flatCard, { backgroundColor: surfaceColor, borderColor }]}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>People Involved</Text>
          <View style={styles.peopleGrid}>
            <View style={[styles.personRow, solverName && { borderBottomColor: borderColor, borderBottomWidth: StyleSheet.hairlineWidth }]}>
              <Avatar name={raisedByName} size="medium" />
              <View style={styles.personInfo}>
                <Text style={[styles.personName, { color: theme.text }]} numberOfLines={1}>
                  {raisedByName}
                </Text>
                <Text style={[styles.personRole, { color: theme.textSecondary }]}>Raised By</Text>
              </View>
            </View>
            
            {solverName && (
              <View style={[styles.personRow, { paddingTop: 12, paddingBottom: 0 }]}>
                <Avatar name={solverName} size="medium" />
                <View style={styles.personInfo}>
                  <Text style={[styles.personName, { color: theme.text }]} numberOfLines={1}>
                    {solverName}
                  </Text>
                  <Text style={[styles.personRole, { color: theme.textSecondary }]}>Resolved By</Text>
                </View>
                {currentAssignment?.solver_phone && (
                   <Text style={[styles.personRole, { color: theme.textSecondary, marginTop: 4 }]}>
                     {currentAssignment.solver_phone}
                   </Text>
                )}
              </View>
            )}
          </View>
        </View>

        {/* ── PHOTOS ── */}
        {issue.images && issue.images.length > 0 && (
          <View style={[styles.card, styles.flatCard, { backgroundColor: surfaceColor, borderColor }]}>
            <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Attached Media</Text>
            <ImageGallery images={issue.images} />
          </View>
        )}

        {/* ── SUPERVISOR ACTIONS ── */}
        <View style={styles.actions}>
          {user?.role === 'supervisor' ? (
            <View style={{ gap: 12 }}>
              <Button 
                title="Approve Fix" 
                variant="success" 
                icon="checkmark-circle-outline" 
                onPress={() => handleReviewAction('APPROVE')} 
                style={{ backgroundColor: '#10a37f', borderColor: '#10a37f', borderRadius: 10 }} 
              />
              <Button 
                title="Reject Fix" 
                variant="danger" 
                icon="close-circle-outline" 
                onPress={() => handleReviewAction('REJECT')} 
              />
            </View>
          ) : (
            <View style={{ alignItems: 'center', padding: 16, backgroundColor: iconBg, borderRadius: 12 }}>
              <Text style={{ color: theme.textSecondary, fontStyle: 'italic' }}>
                Waiting for Supervisor Approval.
              </Text>
            </View>
          )}
        </View>
        
        <View style={styles.bottomPadding} />
      </ScrollView>

      <FullScreenSpinner visible={refreshing} message="Updating Details..." color={reviewAccent} />
      {toastMessage !== '' && <Toast message={toastMessage} />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: 16, 
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backButton: { padding: 4, marginLeft: -4 },
  headerTitle: { fontSize: 14, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  headerRight: { width: 32, alignItems: 'flex-end' },
  placeholder: { width: 32 },
  webRefreshButton: { padding: 4 },
  
  warningBanner: { 
    flexDirection: 'row', 
    alignItems: 'flex-start', 
    marginHorizontal: 16, 
    marginTop: 16,
    padding: 16, 
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  warningIconWrapper: {
    backgroundColor: '#ffffff',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 2 },
      android: { elevation: 2 },
    }),
  },
  warningContent: { flex: 1 },
  warningTitle: { color: '#f97316', fontWeight: '700', fontSize: 14, letterSpacing: -0.2, marginBottom: 2 },
  warningText: { color: '#f97316', fontSize: 13, lineHeight: 18 },

  content: { flex: 1 },
  
  card: { 
    marginHorizontal: 16, 
    marginTop: 16, 
    padding: 20 
  },
  flatCard: {
    borderRadius: 16,
    borderWidth: 1,
    ...Platform.select({
      ios: { shadowOpacity: 0 },
      android: { elevation: 0 },
    }),
  },

  idRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  issueId: { fontSize: 13, fontWeight: '700', letterSpacing: 0.5 },
  statusRow: { flexDirection: 'row', gap: 6 },
  
  title: { fontSize: 22, fontWeight: '700', letterSpacing: -0.5, marginBottom: 8, lineHeight: 28 },
  description: { fontSize: 15, lineHeight: 24, letterSpacing: -0.1 },
  
  sectionTitle: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 16 },
  
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  iconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 10, 
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoContent: { flex: 1, justifyContent: 'center' },
  infoLabel: { fontSize: 12, fontWeight: '500', marginBottom: 2 },
  infoValue: { fontSize: 15, fontWeight: '600', letterSpacing: -0.2 },

  peopleGrid: { flexDirection: 'column' },
  personRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 12, 
    paddingBottom: 12 
  },
  personInfo: { flex: 1, justifyContent: 'center' },
  personName: { fontSize: 15, fontWeight: '600', letterSpacing: -0.2, marginBottom: 2 },
  personRole: { fontSize: 13 },
  
  actions: { marginHorizontal: 16, marginTop: 32 },
  bottomPadding: { height: 40 },
});
```

## C:\Users\head user\Desktop\Hamthan\v3\AI-Operation-Kaizen\FullStack\frontend\app\(main)\(tabs)\dashboard\complaint-detail.js

```javascript
import React, { useEffect, useCallback, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Image, 
  Platform,
  RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../../src/theme/ThemeContext';
import { fetchComplaintById, selectCurrentComplaint, selectComplaintsLoading, clearCurrentComplaint } from '../../../../src/store/slices/complaintsSlice';
import Avatar from '../../../../src/components/common/Avatar';
import Loader from '../../../../src/components/common/Loader';
import { formatDateTime } from '../../../../src/utils/formatters';
import { useSmartBack } from '../../../../src/hooks/useSmartBack';

// ── ADDED REUSABLE IMPORTS ──
import { selectIsOnline } from '../../../../src/store/slices/offlineSlice';
import Toast from '../../../../src/components/common/Toast';
import FullScreenSpinner from '../../../../src/components/common/FullScreenSpinner';

export default function ComplaintDetailScreen() {
  const { theme, isDark } = useTheme();
  const router = useRouter();
  const { id, fromNotification } = useLocalSearchParams(); 
  
  const dispatch = useDispatch();
  const complaint = useSelector(selectCurrentComplaint);
  const loading = useSelector(selectComplaintsLoading);
  const isOnline = useSelector(selectIsOnline);

  const [refreshing, setRefreshing] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const handleSmartBack = useCallback(() => {
    if (fromNotification === 'true') {
      router.replace('/(main)/(tabs)/dashboard');
      setTimeout(() => {
        router.navigate('/(main)/(tabs)/chat');
      }, 100);
    } else {
      router.canGoBack() ? router.back() : router.replace('/(main)/(tabs)/dashboard');
    }
  }, [fromNotification, router]);

  useSmartBack(handleSmartBack);

  useEffect(() => {
    if (id) dispatch(fetchComplaintById(parseInt(id)));
    return () => { dispatch(clearCurrentComplaint()); };
  }, [id, dispatch]);

  const onRefresh = useCallback(async () => {
    if (!isOnline) {
      setToastMessage("Can't refresh while offline");
      setTimeout(() => setToastMessage(''), 3000);
      return;
    }
    if (!id) return;
    
    setRefreshing(true);
    try {
      // 📍 FIX: Promise.allSettled guarantees the spinner spins until totally done
      await Promise.allSettled([
        dispatch(fetchComplaintById(parseInt(id)))
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [id, isOnline, dispatch]);

  // 📍 FIX: Prevents Loader hijacking during refresh, but safely catches empty states
  if (loading && !refreshing && !complaint) return <Loader message="Loading complaint details..." />;
  if (!complaint) return <Loader message="Loading complaint details..." />;

  // ── PREMIUM PALETTE ──
  const bgColor = isDark ? '#1a1a1a' : '#f4f4f5';
  const surfaceColor = isDark ? '#242424' : '#ffffff';
  const borderColor = isDark ? '#333333' : '#e5e5e5';
  const iconBg = isDark ? 'rgba(255,255,255,0.05)' : '#f4f4f4';
  const alertBg = isDark ? 'rgba(239,68,68,0.15)' : 'rgba(239,68,68,0.08)';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]}>
      
      {/* ── HEADER ── */}
      <View style={[styles.header, { backgroundColor: surfaceColor, borderBottomColor: borderColor }]}>
        <TouchableOpacity onPress={handleSmartBack} activeOpacity={0.6} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Complaint #{complaint.id}</Text>
        
        {/* 📍 FIX: Added Web-only Refresh Button to Header */}
        <View style={styles.headerRight}>
          {Platform.OS === 'web' ? (
            <TouchableOpacity onPress={onRefresh} disabled={refreshing} style={styles.webRefreshButton}>
              <Ionicons name="sync" size={22} color={refreshing ? '#ef4444' : theme.textSecondary} />
            </TouchableOpacity>
          ) : (
            <View style={styles.placeholder} />
          )}
        </View>
      </View>

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        // 📍 FIX: Disables double spinner on web
        refreshControl={
          Platform.OS === 'web' ? undefined : (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.textSecondary}
            />
          )
        }
      >
        
        {/* ── MAIN COMPLAINT DETAILS ── */}
        <View style={[styles.card, { backgroundColor: surfaceColor, borderColor, overflow: 'hidden', padding: 0 }]}>
          {/* Top Banner Alert */}
          <View style={[styles.alertBanner, { backgroundColor: alertBg }]}>
            <Ionicons name="warning" size={16} color="#ef4444" />
            <Text style={styles.alertText}>Official Complaint Ticket</Text>
          </View>
          
          <View style={{ padding: 20 }}>
            <View style={styles.titleRow}>
              <Text style={[styles.date, { color: theme.textSecondary }]}>
                Filed on {formatDateTime(complaint.created_at)}
              </Text>
            </View>
            
            <Text style={[styles.issueTitle, { color: theme.text }]}>
              {complaint.issue_title}
            </Text>
            
            <Text style={[styles.sectionTitle, { color: theme.textSecondary, marginTop: 16 }]}>Details</Text>
            <Text style={[styles.details, { color: theme.text }]}>{complaint.complaint_details}</Text>
          </View>
        </View>

        {/* ── SYSTEM METADATA GRID ── */}
        <View style={styles.statsGrid}>
          <View style={[styles.statBox, { backgroundColor: surfaceColor, borderColor }]}>
            <View style={[styles.statIcon, { backgroundColor: iconBg }]}>
              <Ionicons name="document-text-outline" size={18} color={theme.textSecondary} />
            </View>
            <View>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Assignment Ref</Text>
              <Text style={[styles.statValue, { color: theme.text }]}>#{complaint.assignment_id}</Text>
            </View>
          </View>

          <View style={[styles.statBox, { backgroundColor: surfaceColor, borderColor }]}>
            <View style={[styles.statIcon, { backgroundColor: iconBg }]}>
              <Ionicons name="time-outline" size={18} color={theme.textSecondary} />
            </View>
            <View>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Last Updated</Text>
              <Text style={[styles.statValue, { color: theme.text }]}>
                {new Date(complaint.updated_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
          </View>
        </View>

        {/* ── RELATED ISSUE LINK ── */}
        <TouchableOpacity
          activeOpacity={0.7}
          style={[styles.card, styles.issueRefCard, { backgroundColor: surfaceColor, borderColor }]}
          onPress={() => router.push({ pathname: '/(main)/(tabs)/dashboard/issue-detail', params: { id: complaint.issue_id } })}
        >
          <View style={styles.issueRefLeft}>
            <View style={[styles.iconWrapper, { backgroundColor: iconBg }]}>
              <Ionicons name="link-outline" size={20} color={theme.text} />
            </View>
            <View style={styles.issueRefContent}>
              <Text style={[styles.issueLink, { color: theme.text }]}>View Original Issue</Text>
              <Text style={[styles.issueSubtitle, { color: theme.textSecondary }]} numberOfLines={1}>
                Issue #{complaint.issue_id} · {complaint.issue_title}
              </Text>
            </View>
          </View>
          <Ionicons name="arrow-forward" size={18} color={theme.textSecondary} style={{ opacity: 0.5 }} />
        </TouchableOpacity>

        {/* ── CHAIN OF ACCOUNTABILITY (Beautiful Timeline UI) ── */}
        <View style={[styles.card, { backgroundColor: surfaceColor, borderColor, padding: 24 }]}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary, marginBottom: 20 }]}>Chain of Accountability</Text>
          
          <View style={styles.trackerContainer}>
            
            {/* Origin Node: Supervisor */}
            {complaint.supervisor_name && (
              <View style={styles.trackerRow}>
                <View style={styles.trackerNode}>
                  <View style={[styles.nodeDot, { backgroundColor: '#3b82f6', shadowColor: '#3b82f6', shadowOpacity: 0.3, shadowRadius: 6 }]} />
                  <View style={[styles.nodeLine, { backgroundColor: borderColor }]} />
                </View>
                
                <View style={styles.trackerContent}>
                  <Text style={[styles.trackerRole, { color: theme.textSecondary }]}>Raised By (Supervisor)</Text>
                  <View style={[styles.trackerUserCard, { backgroundColor: iconBg, borderColor }]}>
                    <Avatar name={complaint.supervisor_name} size="small" />
                    <Text style={[styles.trackerName, { color: theme.text }]}>{complaint.supervisor_name}</Text>
                  </View>
                </View>
              </View>
            )}

            {/* Target Node: Solver */}
            {complaint.solver_name && (
              <View style={[styles.trackerRow, { marginTop: 0 }]}>
                <View style={styles.trackerNode}>
                  <View style={[styles.nodeDot, { backgroundColor: '#ef4444', shadowColor: '#ef4444', shadowOpacity: 0.3, shadowRadius: 6 }]} />
                </View>
                
                <View style={[styles.trackerContent, { paddingBottom: 0 }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                    <Text style={[styles.trackerRole, { color: '#ef4444', marginBottom: 0 }]}>Target Solver </Text>
                    <View style={styles.againstPill}>
                      <Text style={styles.againstPillText}>Against</Text>
                    </View>
                  </View>
                  
                  <View style={[styles.trackerUserCard, { backgroundColor: alertBg, borderColor: 'rgba(239,68,68,0.2)' }]}>
                    <Avatar name={complaint.solver_name} size="small" />
                    <Text style={[styles.trackerName, { color: theme.text }]}>{complaint.solver_name}</Text>
                  </View>
                </View>
              </View>
            )}

          </View>
        </View>

        {/* ── EVIDENCE PHOTO ── */}
        {complaint.complaint_image_url && (
          <View style={[styles.card, { backgroundColor: surfaceColor, borderColor }]}>
            <View style={styles.photoHeader}>
              <Ionicons name="image-outline" size={18} color={theme.textSecondary} />
              <Text style={[styles.sectionTitle, { color: theme.textSecondary, marginBottom: 0, marginLeft: 8 }]}>Evidence Attached</Text>
            </View>
            <Image
              source={{ uri: complaint.complaint_image_url }}
              style={[styles.evidenceImage, { borderColor }]}
              resizeMode="cover"
            />
          </View>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* ── NEW CLEAN IMPLEMENTATION ── */}
      <FullScreenSpinner visible={refreshing} message="Updating Complaint..." color="#ef4444" />

      {toastMessage !== '' && <Toast message={toastMessage} />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: 16, 
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 3 },
      android: { elevation: 2 },
    }),
  },
  backButton: { padding: 4, marginLeft: -4 },
  headerTitle: { fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },
  headerRight: { width: 32, alignItems: 'flex-end' },
  placeholder: { width: 32 },
  webRefreshButton: { padding: 4 },
  
  content: { flex: 1, paddingHorizontal: 16 },
  
  card: { 
    marginTop: 16, 
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 10 },
      android: { elevation: 1 },
    }),
  },
  
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 8,
  },
  alertText: { color: '#ef4444', fontWeight: '700', fontSize: 13, textTransform: 'uppercase', letterSpacing: 1 },

  titleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  date: { fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  issueTitle: { fontSize: 20, fontWeight: '800', letterSpacing: -0.4, lineHeight: 26 },
  
  sectionTitle: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 },
  details: { fontSize: 16, lineHeight: 26, letterSpacing: -0.1, marginTop: 6 },

  statsGrid: { flexDirection: 'row', gap: 12, marginTop: 16 },
  statBox: { 
    flex: 1, 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 16, 
    borderRadius: 16, 
    borderWidth: 1,
    gap: 12
  },
  statIcon: { padding: 8, borderRadius: 10 },
  statLabel: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  statValue: { fontSize: 15, fontWeight: '700' },
  
  issueRefCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  issueRefLeft: { flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 },
  iconWrapper: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  issueRefContent: { flex: 1 },
  issueLink: { fontSize: 16, fontWeight: '700', letterSpacing: -0.2, marginBottom: 4 },
  issueSubtitle: { fontSize: 14 },
  
  trackerContainer: { marginTop: 4 },
  trackerRow: { flexDirection: 'row' },
  trackerNode: { width: 24, alignItems: 'center' },
  nodeDot: { width: 14, height: 14, borderRadius: 7, zIndex: 2, marginTop: 2 },
  nodeLine: { width: 2, flex: 1, marginVertical: 4, borderRadius: 1, opacity: 0.5 },
  trackerContent: { flex: 1, paddingBottom: 28, paddingLeft: 12, marginTop: -2 },
  trackerRole: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  trackerUserCard: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 12, 
    padding: 12, 
    borderRadius: 14,
    borderWidth: 1
  },
  trackerName: { fontSize: 16, fontWeight: '600' },
  againstPill: { backgroundColor: '#ef4444', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginLeft: 4 },
  againstPillText: { color: '#ffffff', fontSize: 9, fontWeight: '800', textTransform: 'uppercase' },
  
  photoHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  evidenceImage: { width: '100%', height: 240, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth },
  
  bottomPadding: { height: 50 },
});
```

## C:\Users\head user\Desktop\Hamthan\v3\AI-Operation-Kaizen\FullStack\frontend\app\(main)\(tabs)\dashboard\complaints.js

```javascript
import React, { useEffect, useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TextInput, 
  TouchableOpacity, 
  Image, 
  RefreshControl,
  Platform 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../../src/theme/ThemeContext';
import { selectCurrentUser } from '../../../../src/store/slices/authSlice';
import { fetchComplaints, selectFilteredComplaints, selectComplaintsLoading, setFilters } from '../../../../src/store/slices/complaintsSlice';
import { selectIsOnline } from '../../../../src/store/slices/offlineSlice';
import Avatar from '../../../../src/components/common/Avatar';
import Loader from '../../../../src/components/common/Loader';
import EmptyState from '../../../../src/components/common/EmptyState';
import Toast from '../../../../src/components/common/Toast';
import FullScreenSpinner from '../../../../src/components/common/FullScreenSpinner';

export default function ComplaintsScreen() {
  const { theme, isDark } = useTheme();
  const router = useRouter();
  const dispatch = useDispatch();
  
  const user = useSelector(selectCurrentUser);
  const complaints = useSelector(selectFilteredComplaints);
  const loading = useSelector(selectComplaintsLoading);
  const isOnline = useSelector(selectIsOnline);
  
  const [searchText, setSearchText] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => {
    if (user) dispatch(fetchComplaints(user));
  }, [user]);

  useEffect(() => {
    dispatch(setFilters({ search: searchText }));
  }, [searchText]);

  const onRefresh = useCallback(async () => {
    if (!isOnline) {
      setToastMessage("Can't refresh while offline");
      setTimeout(() => setToastMessage(''), 3000);
      return;
    }

    const now = Date.now();
    if (lastRefresh && now - lastRefresh < 5000) {
      setToastMessage('Just refreshed. Wait a moment.');
      setTimeout(() => setToastMessage(''), 3000);
      return;
    }

    setRefreshing(true);
    if (user) {
      try {
        await Promise.allSettled([
          dispatch(fetchComplaints(user))
        ]);
      } finally {
        setLastRefresh(Date.now());
        setRefreshing(false);
      }
    } else {
      setRefreshing(false);
    }
  }, [user, isOnline, lastRefresh, dispatch]);

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // ── PREMIUM DANGER PALETTE ──
  const bgColor = isDark ? '#1a1a1a' : '#f4f4f5';
  const surfaceColor = isDark ? '#242424' : '#ffffff';
  const borderColor = isDark ? '#333333' : '#e5e5e5';
  const inactiveBg = isDark ? '#2a2a2a' : '#eeeeef';
  const accentColor = '#ef4444'; // Red to match the warning icon
  
  // Custom Card Background for Complaints
  const cardBgColor = isDark ? 'rgba(239, 68, 68, 0.08)' : 'rgba(239, 68, 68, 0.03)';
  const cardBorderColor = isDark ? 'rgba(239, 68, 68, 0.3)' : 'rgba(239, 68, 68, 0.2)';
  const searchBorderColor = searchText ? accentColor : 'transparent';

  const renderItem = ({ item }) => {
    return (
      <TouchableOpacity
        activeOpacity={0.7}
        style={[
          styles.card, 
          { 
            backgroundColor: cardBgColor, 
            borderColor: cardBorderColor,
            borderLeftColor: accentColor 
          }
        ]}
        onPress={() => router.push({ pathname: '/(main)/(tabs)/dashboard/complaint-detail', params: { id: item.id } })}
      >
        <View style={styles.cardHeader}>
          <View style={styles.idContainer}>
            <View style={[styles.iconWrapper, { backgroundColor: isDark ? 'rgba(239,68,68,0.2)' : 'rgba(239,68,68,0.1)' }]}>
              <Ionicons name="warning" size={14} color={accentColor} />
            </View>
            
            <View style={styles.idTextWrapper}>
              <Text style={[styles.cardId, { color: theme.textSecondary }]} numberOfLines={1}>
                #{item.id} <Text style={{ color: cardBorderColor, marginHorizontal: 4 }}>|</Text> Issue #{item.issue_id}
              </Text>
              <Text style={[styles.cardDate, { color: theme.textSecondary }]}>
                {formatDate(item.created_at)}
              </Text>
            </View>

          </View>
        </View>
        
        <Text style={[styles.cardTitle, { color: theme.text }]} numberOfLines={1}>
          {item.issue_title}
        </Text>
        <Text style={[styles.cardDescription, { color: theme.textSecondary }]} numberOfLines={2}>
          {item.complaint_details}
        </Text>
        
        <View style={styles.cardInfo}>
          <View style={styles.personBadge}>
            <Text style={[styles.roleLabel, { color: theme.textSecondary }]}>Rzd By:</Text>
            <Avatar name={item.supervisor_name} size="tiny" />
            <Text style={[styles.personName, { color: theme.text }]} numberOfLines={1}>
              {item.supervisor_name?.split(' ')[0]}
            </Text>
          </View>
          
          {item.solver_name && (
            <>
              <View style={[styles.verticalDivider, { backgroundColor: cardBorderColor }]} />
              <View style={styles.personBadge}>
                <Text style={[styles.roleLabel, { color: theme.textSecondary }]}>To:</Text>
                <Avatar name={item.solver_name} size="tiny" />
                <Text style={[styles.personName, { color: theme.text }]} numberOfLines={1}>
                  {item.solver_name?.split(' ')[0]}
                </Text>
              </View>
            </>
          )}
        </View>
        
        {item.complaint_image_url && (
          <Image 
            source={{ uri: item.complaint_image_url }} 
            style={[styles.thumbnail, { borderColor: cardBorderColor }]} 
            resizeMode="cover" 
          />
        )}
      </TouchableOpacity>
    );
  };

  if (loading && complaints.length === 0 && !refreshing) return <Loader message="Loading complaints..." />;

  return (
    <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: bgColor }]}>
      
      {/* ── HEADER ── */}
      <View style={[styles.header, { backgroundColor: surfaceColor, borderBottomColor: borderColor }]}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.6} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Complaints Hub</Text>
        
        <View style={styles.headerRight}>
          {Platform.OS === 'web' ? (
            <TouchableOpacity onPress={onRefresh} disabled={refreshing} style={styles.webRefreshButton}>
              <Ionicons name="sync" size={22} color={refreshing ? accentColor : theme.textSecondary} />
            </TouchableOpacity>
          ) : (
            <View style={styles.placeholder} />
          )}
        </View>
      </View>

      {/* ── SEARCH BAR ── */}
      <View style={[styles.searchContainer, { backgroundColor: bgColor }]}>
        <View style={[styles.searchInput, { backgroundColor: inactiveBg, borderColor: searchBorderColor }]}>
          <Ionicons name="search" size={20} color={searchText ? accentColor : theme.textSecondary} style={{ opacity: searchText ? 1 : 0.7 }} />
          <TextInput
            style={[styles.searchTextInput, { color: theme.text }]}
            placeholder="Search by ID, title, or details..."
            placeholderTextColor={theme.textSecondary}
            value={searchText}
            onChangeText={setSearchText}
          />
          {searchText !== '' && (
            <TouchableOpacity onPress={() => setSearchText('')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close-circle" size={18} color={accentColor} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── RESULTS COUNT ── */}
      <View style={styles.resultsHeader}>
        <Text style={[styles.resultsCount, { color: searchText ? accentColor : theme.textSecondary }]}>
          {complaints.length} Active {complaints.length === 1 ? 'Complaint' : 'Complaints'}
        </Text>
      </View>

      {/* ── LIST ── */}
      <FlatList
        data={complaints}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <EmptyState 
            icon="shield-checkmark-outline" 
            title="All Clear" 
            message="There are no active complaints matching your search." 
          />
        }
        showsVerticalScrollIndicator={false}
        refreshControl={
          Platform.OS === 'web' ? undefined : (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[accentColor]}
              tintColor={accentColor}
            />
          )
        }
      />

      <FullScreenSpinner visible={refreshing} message="Updating Complaints..." color={accentColor} />

      {toastMessage !== '' && <Toast message={toastMessage} />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: 16, 
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 3 },
      android: { elevation: 2 },
    }),
  },
  backButton: { padding: 4, marginLeft: -4 },
  headerTitle: { fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },
  headerRight: { width: 32, alignItems: 'flex-end' },
  placeholder: { width: 32 },
  webRefreshButton: { padding: 4 },
  
  searchContainer: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 10 },
  searchInput: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 14, 
    height: 48, 
    borderRadius: 14, 
    borderWidth: 1,
    gap: 10 
  },
  searchTextInput: { flex: 1, fontSize: 15, fontWeight: '500' },
  
  resultsHeader: { paddingHorizontal: 20, paddingBottom: 14 },
  resultsCount: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, opacity: 0.8 },
  
  listContent: { paddingHorizontal: 16, paddingBottom: 30 },
  
  card: { 
    marginBottom: 14,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderLeftWidth: 6, // Thick alert stripe
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 8 },
      android: { elevation: 1 },
    }),
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  
  idContainer: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  iconWrapper: { padding: 4, borderRadius: 6 },
  idTextWrapper: { flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardId: { fontSize: 13, fontWeight: '800', letterSpacing: 0.3 },
  cardDate: { fontSize: 12, fontWeight: '600', opacity: 0.7 },
  
  cardTitle: { fontSize: 17, fontWeight: '700', marginBottom: 6, letterSpacing: -0.2 },
  cardDescription: { fontSize: 14, lineHeight: 22, opacity: 0.9, marginBottom: 16 },
  
  cardInfo: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  personBadge: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  roleLabel: { fontSize: 11, fontWeight: '600' },
  personName: { fontSize: 13, fontWeight: '600', maxWidth: 90 },
  verticalDivider: { width: 1, height: 12, opacity: 0.5 },
  
  thumbnail: { 
    width: '100%', 
    height: 140, 
    borderRadius: 10, 
    borderWidth: StyleSheet.hairlineWidth,
    marginTop: 16,
  },
});
```

## C:\Users\head user\Desktop\Hamthan\v3\AI-Operation-Kaizen\FullStack\frontend\app\(main)\(tabs)\dashboard\escalated-detail.js

```javascript
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  RefreshControl,
  Image,
  Animated,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSmartBack } from '../../../../src/hooks/useSmartBack';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';

import { useTheme } from '../../../../src/theme/ThemeContext';
import { selectCurrentUser } from '../../../../src/store/slices/authSlice';
import { 
  fetchIssueById, 
  fetchIssueTimeline,
  selectCurrentIssue, 
  selectIssuesLoading, 
  clearCurrentIssue 
} from '../../../../src/store/slices/issuesSlice';
import { formatDate, formatDateTime } from '../../../../src/utils/formatters'; 
import { calculateOverdueDays } from '../../../../src/utils/overdue';
import StatusBadge from '../../../../src/components/common/StatusBadge';
import Avatar from '../../../../src/components/common/Avatar';
import Button from '../../../../src/components/common/Button';
import IssueTimeline from '../../../../src/components/issue/IssueTimeline';
import ImageGallery from '../../../../src/components/issue/ImageGallery';
import CallHistorySection from '../../../../src/components/issue/CallHistorySection';
import Loader from '../../../../src/components/common/Loader';

import { selectIsOnline } from '../../../../src/store/slices/offlineSlice';
import Toast from '../../../../src/components/common/Toast';
import FullScreenSpinner from '../../../../src/components/common/FullScreenSpinner';

export default function EscalatedDetailScreen() {
  const { theme, isDark } = useTheme(); 
  const router = useRouter();
  
  const { id, fromNotification, highlighted } = useLocalSearchParams();

  const handleSmartBack = useCallback(() => {
    if (fromNotification === 'true') {
      router.replace('/(main)/(tabs)/dashboard');
      setTimeout(() => {
        router.navigate('/(main)/(tabs)/chat');
      }, 100); 
    } else {
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/(main)/(tabs)/dashboard');
      }
    }
  }, [fromNotification, router]);

  useSmartBack(handleSmartBack);

  const dispatch = useDispatch();
  const user = useSelector(selectCurrentUser);
  const issue = useSelector(selectCurrentIssue);
  const loading = useSelector(selectIssuesLoading);
  const isOnline = useSelector(selectIsOnline);

  const [refreshing, setRefreshing] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // 📍 CAMERA & LOCATION STATES
  const [selectedImage, setSelectedImage] = useState(null);
  const [isCapturingLocation, setIsCapturingLocation] = useState(false);
  const [capturedLocation, setCapturedLocation] = useState(null);

  const [highlightAnim] = useState(new Animated.Value(highlighted === 'true' ? 1 : 0));

  useEffect(() => {
    if (id) {
      dispatch(fetchIssueById(parseInt(id)));
      dispatch(fetchIssueTimeline(parseInt(id)));
    }
    return () => {
      dispatch(clearCurrentIssue());
    };
  }, [id, dispatch]);

  useEffect(() => {
    if (highlighted === 'true') {
      Animated.timing(highlightAnim, {
        toValue: 0,
        duration: 2000,
        delay: 500,
        useNativeDriver: false,
      }).start();
    }
  }, [highlighted, highlightAnim]);

  const onRefresh = useCallback(async () => {
    if (!isOnline) {
      setToastMessage("Can't refresh while offline");
      setTimeout(() => setToastMessage(''), 3000);
      return;
    }
    if (!id) return;
    
    setRefreshing(true);
    try {
      await Promise.allSettled([
        dispatch(fetchIssueById(parseInt(id))),
        dispatch(fetchIssueTimeline(parseInt(id)))
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [id, isOnline, dispatch]);

  const handleTakePhoto = async () => {
    setIsCapturingLocation(true); 
    try {
      let loc = null;
      if (Platform.OS !== 'web') {
        try {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status === 'granted') {
            const locationPromise = Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
            const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 8000));
            const position = await Promise.race([locationPromise, timeoutPromise]);
            loc = { latitude: position.coords.latitude, longitude: position.coords.longitude };
          }
        } catch(e) {}
      }

      if (loc) {
        setCapturedLocation(loc);
      } else if (Platform.OS !== 'web') {
        Alert.alert("Location Required", "We need your location to verify the fix.");
        setIsCapturingLocation(false);
        return; 
      }

      let result;
      if (Platform.OS === 'web') {
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [4, 3],
          quality: 0.8,
        });
      } else {
        const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
        if (permissionResult.granted === false) {
          Alert.alert("Permission Required", "Camera access is needed.");
          setIsCapturingLocation(false);
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [4, 3],
          quality: 0.8,
        });
      }

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setSelectedImage(result.assets[0].uri);
        setCapturedLocation(loc);
      } else {
        setCapturedLocation(null); 
      }
    } catch (error) {
      if (Platform.OS === 'web') alert("Error opening file picker.");
    } finally {
      setIsCapturingLocation(false); 
    }
  };

  const handleSubmitPhoto = () => {
    setSelectedImage(null);
    setCapturedLocation(null);
    if (Platform.OS === 'web') {
      alert("Sent Successfully! Fix photo uploaded for review.");
    } else {
      Alert.alert("Sent Successfully!", "Fix photo uploaded for review.", [{ text: "OK" }]);
    }
  };

  const handleReviewAction = (actionType) => {
    if (actionType === 'APPROVE') {
      if (Platform.OS === 'web') {
        if (window.confirm("Approve this fix? Issue will be marked as COMPLETED.")) {
          alert("Success! Issue has been approved and closed.");
          router.back();
        }
      } else {
        Alert.alert("Approve Fix", "Approve this fix? Issue will be marked as COMPLETED.", [
          { text: "Cancel", style: "cancel" },
          { text: "Approve", onPress: () => { Alert.alert("Success", "Issue approved."); router.back(); } }
        ]);
      }
    } else if (actionType === 'REJECT') {
      if (Platform.OS === 'web') {
        if (window.confirm("Reject this fix? Issue will return to the solver.")) {
          alert("Rejected! Issue returned to solver.");
          router.back();
        }
      } else {
        Alert.alert("Reject Fix", "Reject this fix? Issue will return to the solver.", [
          { text: "Cancel", style: "cancel" },
          { text: "Reject", style: "destructive", onPress: () => { Alert.alert("Rejected", "Issue returned."); router.back(); } }
        ]);
      }
    }
  };

  const handleAction = (action) => {
    Alert.alert('Coming Soon', `${action} functionality will be available in Phase 2-3`);
  };

  if (loading && !refreshing && !issue) return <Loader message="Loading issue details..." />;
  if (!issue) return <Loader message="Loading issue details..." />;

  const currentAssignment = issue.assignments && issue.assignments.length > 0 ? issue.assignments[0] : null;
  const overdueDays = calculateOverdueDays(issue.deadline_at);
  const isOverdue = overdueDays > 0 && issue.status !== 'COMPLETED';

  const bgColor = isDark ? '#212121' : '#f9f9f9';
  const surfaceColor = isDark ? '#171717' : '#ffffff';
  const borderColor = isDark ? '#333333' : '#e5e5e5';
  const iconBg = isDark ? 'rgba(255,255,255,0.05)' : '#f4f4f4';
  const successAccent = '#10a37f';
  
  const isProblemSolver = user?.role === 'problemsolver' || user?.role === 'problem_solver';
  const isSupervisor    = user?.role === 'supervisor';
  const isManager       = user?.role === 'manager';

  const showMarkDoneBtn = isProblemSolver && (issue.status?.toUpperCase() === 'IN_PROGRESS' || issue.status?.toUpperCase() === 'ASSIGNED');
  const showApproveBtn  = (isSupervisor || isManager) && issue.status?.toUpperCase() === 'RESOLVED_PENDING_REVIEW';

  const highlightColor = highlightAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [surfaceColor, isDark ? '#3f3f46' : '#fef9c3'],
  });

  return (
    <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: bgColor }]}>
      <View style={[styles.header, { backgroundColor: bgColor, borderBottomColor: borderColor }]}>
        <TouchableOpacity onPress={handleSmartBack} activeOpacity={0.6} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.textSecondary }]}>Escalated Issue #{issue.id}</Text>
        <View style={styles.headerRight}>
          {Platform.OS === 'web' ? (
            <TouchableOpacity onPress={onRefresh} disabled={refreshing} style={styles.webRefreshButton}>
              <Ionicons name="sync" size={22} color={refreshing ? theme.primary : theme.textSecondary} />
            </TouchableOpacity>
          ) : (
            <View style={styles.placeholder} />
          )}
        </View>
      </View>

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        refreshControl={Platform.OS === 'web' ? undefined : <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.textSecondary} />}
      >
        <Animated.View style={[styles.card, styles.flatCard, { backgroundColor: highlightColor, borderColor }]}>
          <View style={styles.badgeRow}>
            <StatusBadge status={issue.status} size="small" />
            <StatusBadge status={issue.priority} type="priority" size="small" />
            {isOverdue && <StatusBadge label={`${overdueDays}d overdue`} color="#ef4444" />}
          </View>
          <Text style={[styles.title, { color: theme.text }]}>{issue.title}</Text>
          <Text style={[styles.description, { color: theme.textSecondary }]}>{issue.description}</Text>
        </Animated.View>

        <View style={[styles.card, styles.flatCard, { backgroundColor: surfaceColor, borderColor }]}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Details</Text>
          <View style={styles.infoRow}>
            <View style={[styles.iconWrapper, { backgroundColor: iconBg }]}><Ionicons name="location-outline" size={18} color={theme.textSecondary} /></View>
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Site</Text>
              <Text style={[styles.infoValue, { color: theme.text }]}>{issue.site_name || 'N/A'}</Text>
            </View>
          </View>
          {issue.site_location && (
            <View style={styles.infoRow}>
              <View style={[styles.iconWrapper, { backgroundColor: iconBg }]}><Ionicons name="map-outline" size={18} color={theme.textSecondary} /></View>
              <View style={styles.infoContent}>
                <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Location</Text>
                <Text style={[styles.infoValue, { color: theme.text }]}>{issue.site_location}</Text>
              </View>
            </View>
          )}
          {currentAssignment?.due_date && (
            <View style={styles.infoRow}>
              <View style={[styles.iconWrapper, { backgroundColor: iconBg }]}><Ionicons name="calendar-outline" size={18} color={theme.textSecondary} /></View>
              <View style={styles.infoContent}>
                <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Deadline</Text>
                <Text style={[styles.infoValue, { color: theme.text }]}>{formatDate(currentAssignment.due_date)}</Text>
              </View>
            </View>
          )}
          <View style={[styles.infoRow, { marginBottom: 0 }]}>
            <View style={[styles.iconWrapper, { backgroundColor: iconBg }]}><Ionicons name="construct-outline" size={18} color={theme.textSecondary} /></View>
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Category</Text>
              <Text style={[styles.infoValue, { color: theme.text }]}>{issue.issue_type || 'General Maintenance'}</Text>
            </View>
          </View>
        </View>

        <View style={[styles.card, styles.flatCard, { backgroundColor: surfaceColor, borderColor }]}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>People Involved</Text>
          <View style={styles.peopleGrid}>
            <View style={[styles.personRow, currentAssignment && { borderBottomColor: borderColor, borderBottomWidth: StyleSheet.hairlineWidth }]}>
              <Avatar name={issue.supervisor_name} size="medium" />
              <View style={styles.personInfo}>
                <Text style={[styles.personName, { color: theme.text }]} numberOfLines={1}>{issue.supervisor_name || 'N/A'}</Text>
                <Text style={[styles.personRole, { color: theme.textSecondary }]}>Raised By</Text>
              </View>
            </View>
            {currentAssignment && (
              <View style={[styles.personRow, { paddingTop: 12, paddingBottom: 0 }]}>
                <Avatar name={currentAssignment.solver_name} size="medium" />
                <View style={styles.personInfo}>
                  <Text style={[styles.personName, { color: theme.text }]} numberOfLines={1}>{currentAssignment.solver_name}</Text>
                  <Text style={[styles.personRole, { color: theme.textSecondary }]}>Assigned To</Text>
                </View>
                {currentAssignment.solver_phone && (
                   <Text style={[styles.personRole, { color: theme.textSecondary, marginTop: 4 }]}>{currentAssignment.solver_phone}</Text>
                )}
              </View>
            )}
          </View>
        </View>

        <View style={[styles.card, styles.flatCard, { backgroundColor: surfaceColor, borderColor }]}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Metadata</Text>
          {issue.complaints_count !== undefined && (
            <View style={styles.infoRow}>
              <View style={[styles.iconWrapper, { backgroundColor: issue.complaints_count > 0 ? 'rgba(239,68,68,0.1)' : iconBg }]}><Ionicons name="warning-outline" size={18} color={issue.complaints_count > 0 ? '#ef4444' : theme.textSecondary} /></View>
              <View style={styles.infoContent}>
                <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Complaints Filed</Text>
                <Text style={[styles.infoValue, { color: issue.complaints_count > 0 ? '#ef4444' : theme.text }]}>{issue.complaints_count}</Text>
              </View>
            </View>
          )}
          {issue.track_status && (
            <View style={styles.infoRow}>
              <View style={[styles.iconWrapper, { backgroundColor: iconBg }]}><Ionicons name="analytics-outline" size={18} color={theme.textSecondary} /></View>
              <View style={styles.infoContent}>
                <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Tracking Status</Text>
                <Text style={[styles.infoValue, { color: theme.text, textTransform: 'capitalize' }]}>{issue.track_status.replace(/_/g, ' ')}</Text>
              </View>
            </View>
          )}
          <View style={styles.infoRow}>
            <View style={[styles.iconWrapper, { backgroundColor: iconBg }]}><Ionicons name="add-outline" size={18} color={theme.textSecondary} /></View>
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Created</Text>
              <Text style={[styles.infoValue, { color: theme.text }]}>{formatDateTime(issue.created_at)}</Text>
            </View>
          </View>
          <View style={[styles.infoRow, { marginBottom: 0 }]}>
            <View style={[styles.iconWrapper, { backgroundColor: iconBg }]}><Ionicons name="refresh-outline" size={18} color={theme.textSecondary} /></View>
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Last Updated</Text>
              <Text style={[styles.infoValue, { color: theme.text }]}>{formatDateTime(issue.updated_at)}</Text>
            </View>
          </View>
        </View>

        {issue.images && issue.images.length > 0 && (
          <View style={[styles.card, styles.flatCard, { backgroundColor: surfaceColor, borderColor }]}>
            <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Photos</Text>
            <ImageGallery images={issue.images || []} />
          </View>
        )}

        {isProblemSolver && issue.call_logs?.length > 0 && (
          <View style={[styles.card, styles.flatCard, { backgroundColor: surfaceColor, borderColor, padding: 0, overflow: 'hidden' }]}>
            <CallHistorySection callLogs={issue.call_logs} />
          </View>
        )}

        <View style={styles.actions}>
          {isProblemSolver && (
            <View style={styles.solverActionContainer}>
              {showMarkDoneBtn ? (
                !selectedImage ? (
                  <TouchableOpacity activeOpacity={0.8} style={[styles.primaryActionBtn, { backgroundColor: successAccent, opacity: isCapturingLocation ? 0.7 : 1 }]} onPress={handleTakePhoto} disabled={isCapturingLocation}>
                    <View style={styles.primaryActionBtnInner}>
                      {isCapturingLocation ? <ActivityIndicator color="#fff" size="small" /> : <Ionicons name="camera" size={24} color="#fff" />}
                      <Text style={styles.primaryActionBtnText}>{isCapturingLocation ? "Preparing..." : "Take Fix Photo"}</Text>
                    </View>
                  </TouchableOpacity>
                ) : (
                  <View style={[styles.previewContainer, { backgroundColor: surfaceColor, borderColor }]}>
                    <View style={styles.previewHeader}>
                      <Ionicons name="image-outline" size={20} color={theme.text} />
                      <Text style={[styles.previewTitle, { color: theme.text }]}>Photo Ready</Text>
                    </View>
                    <Image source={{ uri: selectedImage }} style={[styles.previewImage, { borderColor }]} />
                    <Text style={[styles.previewSubtext, { color: theme.textSecondary }]}>Does this photo clearly show the resolved issue?</Text>
                    <View style={styles.previewActions}>
                      <TouchableOpacity style={[styles.previewBtn, { backgroundColor: iconBg, borderColor, borderWidth: 1 }]} onPress={() => { setSelectedImage(null); setCapturedLocation(null); }}>
                        <Text style={[styles.previewBtnText, { color: theme.text }]}>Retake</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.previewBtn, { backgroundColor: successAccent, flex: 2 }]} onPress={handleSubmitPhoto}>
                        <Ionicons name="send" size={18} color="#fff" style={{ marginRight: 6 }} />
                        <Text style={[styles.previewBtnText, { color: '#fff' }]}>Send Photo</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )
              ) : (
                <Text style={{ color: theme.textSecondary, textAlign: 'center', fontStyle: 'italic' }}>
                  No actions available for this status.
                </Text>
              )}
            </View>
          )}

          {isSupervisor && (
            <View style={{ gap: 12 }}>
              {showApproveBtn ? (
                <>
                  <Button title="Approve & Close" variant="success" icon="checkmark-done-circle-outline" onPress={() => handleReviewAction('APPROVE')} style={{ backgroundColor: '#10a37f', borderColor: '#10a37f', borderRadius: 10 }} />
                  <Button title="Reject Fix" variant="danger" icon="close-circle-outline" onPress={() => handleReviewAction('REJECT')} style={{ borderRadius: 10 }} />
                </>
              ) : (
                <>
                  <Button title="Raise Complaint" variant="danger" icon="alert-circle-outline" onPress={() => handleAction('Raise Complaint')} />
                  <Button title="Mark Complete" variant="success" icon="checkmark-circle-outline" onPress={() => handleAction('Mark Complete')} />
                </>
              )}
            </View>
          )}

          {isManager && (
            <View style={{ gap: 12 }}>
              {showApproveBtn ? (
                <>
                  <Button title="Approve & Close" variant="success" icon="checkmark-done-circle-outline" onPress={() => handleReviewAction('APPROVE')} style={{ backgroundColor: '#10a37f', borderColor: '#10a37f', borderRadius: 10 }} />
                  <Button title="Reject Fix" variant="danger" icon="close-circle-outline" onPress={() => handleReviewAction('REJECT')} style={{ borderRadius: 10 }} />
                </>
              ) : (
                <>
                  <Button title="Escalate" variant="danger" icon="arrow-up-circle-outline" onPress={() => handleAction('Escalate')} />
                  <Button title="Re-assign" variant="secondary" icon="swap-horizontal-outline" onPress={() => handleAction('Re-assign')} />
                </>
              )}
            </View>
          )}
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>

      <FullScreenSpinner visible={refreshing} message="Updating Issue Details..." color={theme.primary} />
      {toastMessage !== '' && <Toast message={toastMessage} />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  backButton: { padding: 4, marginLeft: -4 },
  headerTitle: { fontSize: 14, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  headerRight: { width: 32, alignItems: 'flex-end' },
  placeholder: { width: 32 },
  webRefreshButton: { padding: 4 },
  content: { flex: 1 },
  card: { marginHorizontal: 16, marginTop: 16, padding: 20 },
  flatCard: { borderRadius: 16, borderWidth: 1, ...Platform.select({ ios: { shadowOpacity: 0 }, android: { elevation: 0 } }) },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  title: { fontSize: 22, fontWeight: '700', letterSpacing: -0.5, marginBottom: 8, lineHeight: 28 },
  description: { fontSize: 15, lineHeight: 24, letterSpacing: -0.1 },
  sectionTitle: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 16 },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 14 },
  iconWrapper: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  infoContent: { flex: 1, justifyContent: 'center' },
  infoLabel: { fontSize: 12, fontWeight: '500', marginBottom: 2 },
  infoValue: { fontSize: 15, fontWeight: '600', letterSpacing: -0.2 },
  peopleGrid: { flexDirection: 'column' },
  personRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingBottom: 12 },
  personInfo: { flex: 1, justifyContent: 'center' },
  personName: { fontSize: 15, fontWeight: '600', letterSpacing: -0.2, marginBottom: 2 },
  personRole: { fontSize: 13 },
  actions: { marginHorizontal: 16, marginTop: 32 },
  buttonMargin: { marginTop: 12 },
  solverActionContainer: { width: '100%' },
  primaryActionBtn: { borderRadius: 16, paddingVertical: 18, paddingHorizontal: 20, ...Platform.select({ ios: { shadowColor: '#10a37f', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 12 }, android: { elevation: 4 } }) },
  primaryActionBtnInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  primaryActionBtnText: { color: '#fff', fontSize: 17, fontWeight: '700', letterSpacing: -0.2 },
  previewContainer: { borderRadius: 16, borderWidth: 1, padding: 16, alignItems: 'center', ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 8 }, android: { elevation: 2 } }) },
  previewHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16, alignSelf: 'flex-start' },
  previewTitle: { fontSize: 16, fontWeight: '700', letterSpacing: -0.2 },
  previewImage: { width: '100%', height: 220, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, marginBottom: 12 },
  previewSubtext: { fontSize: 13, textAlign: 'center', marginBottom: 16 },
  previewActions: { flexDirection: 'row', gap: 12, width: '100%' },
  previewBtn: { flex: 1, flexDirection: 'row', paddingVertical: 14, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  previewBtnText: { fontSize: 15, fontWeight: '700', letterSpacing: -0.2 },
  bottomPadding: { height: 40 },
});
```

## C:\Users\head user\Desktop\Hamthan\v3\AI-Operation-Kaizen\FullStack\frontend\app\(main)\(tabs)\dashboard\escalated.js

```javascript
import React, { useEffect, useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TextInput, 
  TouchableOpacity, 
  RefreshControl,
  Platform 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../../src/theme/ThemeContext';
import { selectCurrentUser } from '../../../../src/store/slices/authSlice';
// 📍 NOTE: Make sure you export `selectEscalatedIssues` in your issuesSlice!
import { fetchIssues, selectEscalatedIssues, selectIssuesLoading, setFilters } from '../../../../src/store/slices/issuesSlice';
import { selectIsOnline } from '../../../../src/store/slices/offlineSlice';
import IssueCard from '../../../../src/components/issue/IssueCard';
import Loader from '../../../../src/components/common/Loader';
import EmptyState from '../../../../src/components/common/EmptyState';
import Toast from '../../../../src/components/common/Toast';
import FullScreenSpinner from '../../../../src/components/common/FullScreenSpinner';

export default function EscalatedIssuesScreen() {
  const { theme, isDark } = useTheme(); 
  const router = useRouter();
  const dispatch = useDispatch();
  
  const user = useSelector(selectCurrentUser);
  const issues = useSelector(selectEscalatedIssues);
  const loading = useSelector(selectIssuesLoading);
  const isOnline = useSelector(selectIsOnline);
  
  const [searchText, setSearchText] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => {
    if (user) dispatch(fetchIssues(user));
  }, [user, dispatch]);

  useEffect(() => {
    dispatch(setFilters({ search: searchText }));
  }, [searchText, dispatch]);

  const onRefresh = useCallback(async () => {
    if (!isOnline) {
      setToastMessage("Can't refresh while offline");
      setTimeout(() => setToastMessage(''), 3000);
      return;
    }

    const now = Date.now();
    if (lastRefresh && now - lastRefresh < 5000) {
      setToastMessage('Just refreshed. Wait a moment.');
      setTimeout(() => setToastMessage(''), 3000);
      return;
    }

    setRefreshing(true);
    if (user) {
      try {
        await Promise.allSettled([dispatch(fetchIssues(user))]);
      } finally {
        setLastRefresh(Date.now());
        setRefreshing(false);
      }
    } else {
      setRefreshing(false);
    }
  }, [user, isOnline, lastRefresh, dispatch]);

  const handleIssuePress = (issue) => {
    // 📍 ROUTES TO THE NEW ESCALATED DETAIL SCREEN
    router.push({ pathname: '/(main)/(tabs)/dashboard/escalated-detail', params: { id: issue.id } });
  };

  const filteredIssues = issues.filter((issue) => {
    if (!searchText) return true;
    const lowerSearch = searchText.toLowerCase();
    return (
      issue.title?.toLowerCase().includes(lowerSearch) ||
      issue.description?.toLowerCase().includes(lowerSearch) ||
      issue.site_name?.toLowerCase().includes(lowerSearch) ||
      issue.id?.toString().includes(lowerSearch)
    );
  });

  if (loading && issues.length === 0 && !refreshing) {
    return <Loader message="Loading escalated issues..." />;
  }

  const bgColor = isDark ? '#212121' : '#f9f9f9';
  const borderColor = isDark ? '#333333' : '#e5e5e5';
  const inactiveBg = isDark ? 'rgba(255,255,255,0.06)' : '#f4f4f4';
  const escalatedAccent = '#dc2626'; // 📍 Critical Red for Escalated

  return (
    <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: bgColor }]}>
      
      <View style={[styles.header, { backgroundColor: bgColor, borderBottomColor: borderColor }]}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.6} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.textSecondary }]}>Escalated Issues</Text>
        
        <View style={styles.headerRight}>
          {Platform.OS === 'web' ? (
            <TouchableOpacity onPress={onRefresh} disabled={refreshing} style={styles.webRefreshButton}>
              <Ionicons name="sync" size={22} color={refreshing ? escalatedAccent : theme.textSecondary} />
            </TouchableOpacity>
          ) : (
            <View style={styles.placeholder} />
          )}
        </View>
      </View>

      <View style={[styles.searchContainer, { backgroundColor: bgColor }]}>
        <View style={[styles.searchInput, { backgroundColor: inactiveBg, borderColor }]}>
          <Ionicons name="search" size={18} color={theme.textSecondary} />
          <TextInput
            style={[styles.searchTextInput, { color: theme.text }]}
            placeholder="Search escalated issues..."
            placeholderTextColor={theme.textSecondary}
            value={searchText}
            onChangeText={setSearchText}
          />
          {searchText !== '' && (
            <TouchableOpacity onPress={() => setSearchText('')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close-circle" size={18} color={theme.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.resultsHeader}>
        <Text style={[styles.resultsCount, { color: theme.textSecondary }]}>
          {filteredIssues.length} issue{filteredIssues.length !== 1 ? 's' : ''} found
        </Text>
      </View>

      <FlatList
        data={filteredIssues}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => <IssueCard issue={item} onPress={() => handleIssuePress(item)} />}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <EmptyState 
            icon="shield-checkmark-outline" 
            title={searchText ? "No matches found" : "All Clear!"} 
            message={searchText ? `No issues matching "${searchText}"` : "There are no escalated issues requiring your attention."} 
          />
        }
        showsVerticalScrollIndicator={false}
        refreshControl={
          Platform.OS === 'web' ? undefined : (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[escalatedAccent]}
              tintColor={escalatedAccent}
            />
          )
        }
      />

      <FullScreenSpinner visible={refreshing} message="Updating Queue..." color={escalatedAccent} />
      {toastMessage !== '' && <Toast message={toastMessage} />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: 16, 
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backButton: { padding: 4, marginLeft: -4 },
  headerTitle: { fontSize: 14, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  headerRight: { width: 32, alignItems: 'flex-end' },
  placeholder: { width: 32 },
  webRefreshButton: { padding: 4 },
  searchContainer: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12 },
  searchInput: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 14, 
    height: 44, 
    borderRadius: 12, 
    borderWidth: 1,
    gap: 8 
  },
  searchTextInput: { flex: 1, fontSize: 15 },
  resultsHeader: { paddingHorizontal: 20, paddingBottom: 12 },
  resultsCount: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8 },
  listContent: { paddingHorizontal: 16, paddingBottom: 24 },
});
```

## C:\Users\head user\Desktop\Hamthan\v3\AI-Operation-Kaizen\FullStack\frontend\app\(main)\(tabs)\dashboard\fixed-detail.js

```javascript
import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../../src/theme/ThemeContext';
import { 
  fetchIssueById, 
  fetchIssueTimeline,
  selectIssueById,
  selectCurrentIssue,
  selectIssueTimeline,
  selectIssuesLoading, 
  clearCurrentIssue 
} from '../../../../src/store/slices/issuesSlice';
import { formatDate, formatDateTime } from '../../../../src/utils/formatters';
import StatusBadge from '../../../../src/components/common/StatusBadge';
import ImageGallery from '../../../../src/components/issue/ImageGallery';
import IssueTimeline from '../../../../src/components/issue/IssueTimeline';
import Loader from '../../../../src/components/common/Loader';

// ── ADDED REUSABLE IMPORTS ──
import { selectIsOnline } from '../../../../src/store/slices/offlineSlice';
import Toast from '../../../../src/components/common/Toast';
import FullScreenSpinner from '../../../../src/components/common/FullScreenSpinner';

export default function FixedDetailScreen() {
  const { theme, isDark } = useTheme(); 
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const dispatch = useDispatch();

  const cachedIssue = useSelector((state) => selectIssueById(state, parseInt(id)));
  const fullIssue = useSelector(selectCurrentIssue);
  const timeline = useSelector(selectIssueTimeline) || [];
  const loading = useSelector(selectIssuesLoading);
  const isOnline = useSelector(selectIsOnline);

  const issue = (fullIssue && fullIssue.id === parseInt(id)) ? fullIssue : cachedIssue;

  const [refreshing, setRefreshing] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => {
    if (id) {
      dispatch(fetchIssueById(parseInt(id)));
      dispatch(fetchIssueTimeline(parseInt(id)));
    }
    return () => { 
      dispatch(clearCurrentIssue()); 
    };
  }, [id, dispatch]);

  const onRefresh = useCallback(async () => {
    if (!isOnline) {
      setToastMessage("Can't refresh while offline");
      setTimeout(() => setToastMessage(''), 3000);
      return;
    }
    if (!id) return;
    
    setRefreshing(true);
    try {
      // 📍 FIX: Promise.allSettled guarantees the spinner spins until both APIs are done
      await Promise.allSettled([
        dispatch(fetchIssueById(parseInt(id))),
        dispatch(fetchIssueTimeline(parseInt(id)))
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [id, isOnline, dispatch]);

  // 📍 FIX: Added `!refreshing` to prevent Loader hijacking
  if (loading && !refreshing && !issue) return <Loader message="Loading issue details..." />;
  if (!issue) return <Loader message="Loading issue details..." />;

  // ── SMART DATA EXTRACTION ──
  const raisedByName = issue.supervisor_name || issue.raised_by?.name || 'N/A';
  
  const currentAssignment = issue.assignments && issue.assignments.length > 0 
    ? issue.assignments[0] 
    : issue.assignment || null;

  const solverName = currentAssignment?.solver_name || currentAssignment?.assigned_to?.name || null;

  // ── 🕒 PROFESSIONAL TIME CALCULATION ──
  const calculateProfessionalTime = (start, end) => {
    if (!start || !end) return 'N/A';
    const diffInMs = new Date(end).getTime() - new Date(start).getTime();
    if (diffInMs <= 0) return '0 hrs';
    
    const totalHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const days = Math.floor(totalHours / 24);
    const remainingHours = totalHours % 24;

    if (days > 0) {
      return `${days}d ${remainingHours > 0 ? `${remainingHours}h` : ''}`.trim();
    }
    return `${totalHours}h`;
  };

  const resolutionTime = calculateProfessionalTime(issue.created_at, issue.updated_at);

  const getInitials = (name) => {
    if (!name || name === 'N/A') return 'NA';
    return name.substring(0, 2).toUpperCase();
  };

  // ── PREMIUM PALETTE ──
  const bgColor = isDark ? '#212121' : '#f9f9f9';
  const surfaceColor = isDark ? '#171717' : '#ffffff';
  const borderColor = isDark ? '#333333' : '#e5e5e5';
  const iconBg = isDark ? 'rgba(255,255,255,0.05)' : '#f4f4f4';
  const successColor = '#10a37f'; // OpenAI Green
  const successBg = isDark ? 'rgba(16, 163, 127, 0.15)' : 'rgba(16, 163, 127, 0.1)';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]}>
      
      {/* ── HEADER ── */}
      <View style={[styles.header, { backgroundColor: bgColor, borderBottomColor: borderColor }]}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.6} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.textSecondary }]}>Resolution Report</Text>
        
        {/* 📍 FIX: Added Web-only Refresh Button to Header */}
        <View style={styles.headerRight}>
          {Platform.OS === 'web' ? (
            <TouchableOpacity onPress={onRefresh} disabled={refreshing} style={styles.webRefreshButton}>
              <Ionicons name="sync" size={22} color={refreshing ? successColor : theme.textSecondary} />
            </TouchableOpacity>
          ) : (
            <View style={styles.placeholder} />
          )}
        </View>
      </View>

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        // 📍 FIX: Disables double spinner on web
        refreshControl={
          Platform.OS === 'web' ? undefined : (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.textSecondary}
            />
          )
        }
      >
        
        {/* ── ISSUE IDENTITY & STATUS ── */}
        <View style={[styles.card, styles.flatCard, { backgroundColor: surfaceColor, borderColor }]}>
          <View style={styles.idRow}>
            <Text style={[styles.issueId, { color: theme.textSecondary }]}>ISSUE #{issue.id}</Text>
            <View style={[styles.successBadge, { backgroundColor: successBg }]}>
              <Ionicons name="checkmark-circle" size={14} color={successColor} />
              <Text style={[styles.successText, { color: successColor }]}>Completed</Text>
            </View>
          </View>
          
          <Text style={[styles.title, { color: theme.text }]}>{issue.title}</Text>
          <Text style={[styles.description, { color: theme.textSecondary }]}>{issue.description}</Text>
          
          <View style={styles.badges}>
            <StatusBadge status={issue.priority} type="priority" size="small" />
            <View style={[styles.typeTag, { backgroundColor: iconBg }]}>
              <Text style={[styles.typeText, { color: theme.text }]}>{issue.issue_type || 'General'}</Text>
            </View>
          </View>
        </View>

        {/* ── PERFORMANCE METRICS ── */}
        <View style={styles.metricsContainer}>
          <View style={[styles.metricCard, styles.flatCard, { backgroundColor: surfaceColor, borderColor }]}>
            <View style={[styles.metricIconWrapper, { backgroundColor: successBg }]}>
              <Ionicons name="time-outline" size={20} color={successColor} />
            </View>
            <Text style={[styles.metricValue, { color: theme.text }]}>{resolutionTime}</Text>
            <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>Resolution Time</Text>
          </View>
          
          <View style={[styles.metricCard, styles.flatCard, { backgroundColor: surfaceColor, borderColor }]}>
            <View style={[styles.metricIconWrapper, { backgroundColor: iconBg }]}>
              <Ionicons name="cellular-outline" size={20} color={theme.textSecondary} />
            </View>
            <Text style={[styles.metricValue, { color: theme.text }]}>
              {currentAssignment?.total_call_attempts || 0}
            </Text>
            <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>Call Attempts</Text>
          </View>
        </View>

        {/* ── PHOTOS (Using ImageGallery component to prevent DOM crashes) ── */}
        {issue.images && issue.images.length > 0 && (
          <View style={[styles.card, styles.flatCard, { backgroundColor: surfaceColor, borderColor }]}>
            <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Before & After</Text>
            <ImageGallery images={issue.images} />
          </View>
        )}

        {/* ── PARTICIPANTS ── */}
        <View style={[styles.card, styles.flatCard, { backgroundColor: surfaceColor, borderColor }]}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Participants</Text>
          <View style={styles.peopleGrid}>
            <View style={[styles.personRow, solverName && { borderBottomColor: borderColor, borderBottomWidth: StyleSheet.hairlineWidth }]}>
              <View style={[styles.avatarCircle, { backgroundColor: '#3b82f6' }]}>
                <Text style={styles.avatarText}>{getInitials(raisedByName)}</Text>
              </View>
              <View style={styles.personInfo}>
                <Text style={[styles.personName, { color: theme.text }]}>{raisedByName}</Text>
                <Text style={[styles.personRole, { color: theme.textSecondary }]}>Supervisor</Text>
              </View>
            </View>
            
            {solverName && (
              <View style={[styles.personRow, { paddingTop: 12 }]}>
                <View style={[styles.avatarCircle, { backgroundColor: '#10a37f' }]}>
                  <Text style={styles.avatarText}>{getInitials(solverName)}</Text>
                </View>
                <View style={styles.personInfo}>
                  <Text style={[styles.personName, { color: theme.text }]}>{solverName}</Text>
                  <Text style={[styles.personRole, { color: theme.textSecondary }]}>Solver</Text>
                </View>
                <Ionicons name="checkmark-done" size={20} color={successColor} />
              </View>
            )}
          </View>
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* ── NEW CLEAN IMPLEMENTATION ── */}
      <FullScreenSpinner visible={refreshing} message="Updating Report..." color={successColor} />

      {toastMessage !== '' && <Toast message={toastMessage} />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: 16, 
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backButton: { padding: 4, marginLeft: -4 },
  headerTitle: { fontSize: 14, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  headerRight: { width: 32, alignItems: 'flex-end' },
  placeholder: { width: 32 },
  webRefreshButton: { padding: 4 },
  
  content: { flex: 1 },
  
  card: { 
    marginHorizontal: 16, 
    marginTop: 16, 
    padding: 20 
  },
  flatCard: {
    borderRadius: 16,
    borderWidth: 1,
    ...Platform.select({
      ios: { shadowOpacity: 0 },
      android: { elevation: 0 },
    }),
  },

  idRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  issueId: { fontSize: 13, fontWeight: '700', letterSpacing: 0.5 },
  successBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, gap: 4 },
  successText: { fontSize: 12, fontWeight: '700', letterSpacing: 0.2 },
  
  title: { fontSize: 22, fontWeight: '700', letterSpacing: -0.5, marginBottom: 8, lineHeight: 28 },
  description: { fontSize: 15, lineHeight: 24, letterSpacing: -0.1, marginBottom: 16 },
  
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeTag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  typeText: { fontSize: 12, fontWeight: '600' },
  
  metricsContainer: { flexDirection: 'row', paddingHorizontal: 16, marginTop: 16, gap: 12 },
  metricCard: { flex: 1, padding: 16, alignItems: 'flex-start' },
  metricIconWrapper: { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  metricValue: { fontSize: 22, fontWeight: '700', letterSpacing: -0.5, marginBottom: 2 },
  metricLabel: { fontSize: 12, fontWeight: '500' },
  
  sectionTitle: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 16 },
  
  peopleGrid: { flexDirection: 'column' },
  personRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 12, 
    paddingBottom: 12 
  },
  personInfo: { flex: 1, justifyContent: 'center' },
  personName: { fontSize: 15, fontWeight: '600', letterSpacing: -0.2, marginBottom: 2 },
  personRole: { fontSize: 13 },

  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },

  bottomPadding: { height: 40 },
});
```

## C:\Users\head user\Desktop\Hamthan\v3\AI-Operation-Kaizen\FullStack\frontend\app\(main)\(tabs)\dashboard\fixed.js

```javascript
import React, { useEffect, useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TextInput, 
  TouchableOpacity, 
  RefreshControl,
  Platform 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../../src/theme/ThemeContext';
import { selectCurrentUser } from '../../../../src/store/slices/authSlice';
import { fetchIssues, selectFixedIssues, selectIssuesLoading, setFilters } from '../../../../src/store/slices/issuesSlice';
import { selectIsOnline } from '../../../../src/store/slices/offlineSlice';
import IssueCard from '../../../../src/components/issue/IssueCard';
import Loader from '../../../../src/components/common/Loader';
import EmptyState from '../../../../src/components/common/EmptyState';
import Toast from '../../../../src/components/common/Toast';
import FullScreenSpinner from '../../../../src/components/common/FullScreenSpinner';

export default function FixedIssuesScreen() {
  const { theme, isDark } = useTheme(); 
  const router = useRouter();
  const dispatch = useDispatch();
  
  const user = useSelector(selectCurrentUser);
  const issues = useSelector(selectFixedIssues);
  const loading = useSelector(selectIssuesLoading);
  const isOnline = useSelector(selectIsOnline);
  
  const [searchText, setSearchText] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => {
    if (user) dispatch(fetchIssues(user));
  }, [user]);

  useEffect(() => {
    dispatch(setFilters({ search: searchText }));
  }, [searchText]);

  const onRefresh = useCallback(async () => {
    if (!isOnline) {
      setToastMessage("Can't refresh while offline");
      setTimeout(() => setToastMessage(''), 3000);
      return;
    }

    const now = Date.now();
    if (lastRefresh && now - lastRefresh < 5000) {
      setToastMessage('Just refreshed. Wait a moment.');
      setTimeout(() => setToastMessage(''), 3000);
      return;
    }

    setRefreshing(true);
    
    if (user) {
      try {
        await Promise.allSettled([
          dispatch(fetchIssues(user))
        ]);
      } finally {
        setLastRefresh(Date.now());
        setRefreshing(false);
      }
    } else {
      setRefreshing(false);
    }
  }, [user, isOnline, lastRefresh, dispatch]);

  const filteredIssues = issues.filter((issue) => {
    if (!searchText) return true;
    const lowerSearch = searchText.toLowerCase();
    return (
      issue.title?.toLowerCase().includes(lowerSearch) ||
      issue.site_name?.toLowerCase().includes(lowerSearch) ||
      issue.id?.toString().includes(lowerSearch)
    );
  });

  const bgColor = isDark ? '#212121' : '#f9f9f9';
  const borderColor = isDark ? '#333333' : '#e5e5e5';
  const inactiveBg = isDark ? 'rgba(255,255,255,0.06)' : '#ffffff';
  const successAccent = '#10a37f'; 

  const searchBorderColor = searchText ? successAccent : borderColor;

  if (loading && issues.length === 0 && !refreshing) return <Loader message="Loading fixed issues..." />;

  return (
    <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: bgColor }]}>
      
      {/* ── HEADER ── */}
      <View style={[styles.header, { backgroundColor: bgColor, borderBottomColor: borderColor }]}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.6} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Resolved Issues</Text>
        
        <View style={styles.headerRight}>
          {Platform.OS === 'web' ? (
            <TouchableOpacity onPress={onRefresh} disabled={refreshing} style={styles.webRefreshButton}>
              <Ionicons name="sync" size={22} color={refreshing ? successAccent : theme.textSecondary} />
            </TouchableOpacity>
          ) : (
            <View style={styles.placeholder} />
          )}
        </View>
      </View>

      {/* ── SEARCH BAR ── */}
      <View style={[styles.searchContainer, { backgroundColor: bgColor }]}>
        <View style={[styles.searchInput, { backgroundColor: inactiveBg, borderColor: searchBorderColor }]}>
          <Ionicons name="search" size={18} color={searchText ? successAccent : theme.textSecondary} />
          <TextInput
            style={[styles.searchTextInput, { color: theme.text }]}
            placeholder="Search resolved issues..."
            placeholderTextColor={theme.textSecondary}
            value={searchText}
            onChangeText={setSearchText}
          />
          {searchText !== '' && (
            <TouchableOpacity onPress={() => setSearchText('')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close-circle" size={18} color={successAccent} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── RESULTS COUNT ── */}
      <View style={styles.resultsHeader}>
        <Text style={[styles.resultsCount, { color: searchText ? successAccent : theme.textSecondary }]}>
          {filteredIssues.length} issue{filteredIssues.length !== 1 ? 's' : ''} found
        </Text>
      </View>

      {/* ── LIST ── */}
      <FlatList
        data={filteredIssues}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <IssueCard 
            issue={item} 
            onPress={() => router.push({ pathname: '/(main)/(tabs)/dashboard/fixed-detail', params: { id: item.id } })} 
          />
        )}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <EmptyState 
            icon="checkmark-done-outline" 
            title={searchText ? "No matches found" : "No completed issues"} 
            message={searchText ? `No issues matching "${searchText}"` : "No issues have been completed yet."} 
          />
        }
        showsVerticalScrollIndicator={false}
        refreshControl={
          Platform.OS === 'web' ? undefined : (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[successAccent]}
              tintColor={successAccent}
            />
          )
        }
      />

      <FullScreenSpinner visible={refreshing} message="Updating Resolved Issues..." color={successAccent} />

      {toastMessage !== '' && <Toast message={toastMessage} />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: 16, 
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backButton: { padding: 4, marginLeft: -4 },
  headerTitle: { fontSize: 18, fontWeight: '700', letterSpacing: -0.3 },
  headerRight: { width: 32, alignItems: 'flex-end' },
  placeholder: { width: 32 },
  webRefreshButton: { padding: 4 },
  
  searchContainer: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12 },
  searchInput: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 14, 
    height: 44, // Matched globally
    borderRadius: 12, 
    borderWidth: 1,
    gap: 8 
  },
  searchTextInput: { flex: 1, fontSize: 15 },
  
  resultsHeader: { paddingHorizontal: 20, paddingBottom: 12 },
  resultsCount: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 },
  
  listContent: { paddingHorizontal: 16, paddingBottom: 24 },
});
```

## C:\Users\head user\Desktop\Hamthan\v3\AI-Operation-Kaizen\FullStack\frontend\app\(main)\(tabs)\dashboard\index.js

```javascript
import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  RefreshControl,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { LineChart, PieChart, BarChart } from 'react-native-chart-kit';

import { useTheme } from '../../../../src/theme/ThemeContext';
import { selectCurrentUser } from '../../../../src/store/slices/authSlice';
import { 
  fetchDashboardData, 
  selectStats, 
  selectCharts, 
  selectAlerts,
  selectRecentIssues,
  selectIsSolverView, 
  selectDashboardLoading 
} from '../../../../src/store/slices/dashboardSlice';
import { selectIsOnline } from '../../../../src/store/slices/offlineSlice';
import { fetchSolversPerformance, selectAllSolvers } from '../../../../src/store/slices/performanceSlice';
import { fetchSitesWithAnalytics, selectAllSites } from '../../../../src/store/slices/sitesSlice';
import { fetchComplaints, selectAllComplaints } from '../../../../src/store/slices/complaintsSlice';

import DashboardCard from '../../../../src/components/dashboard/DashboardCard';
import ChartDownloadButton from '../../../../src/components/dashboard/ChartDownloadButton';
import Loader from '../../../../src/components/common/Loader';
import Avatar from '../../../../src/components/common/Avatar';
import Toast from '../../../../src/components/common/Toast';
import StatusBadge from '../../../../src/components/common/StatusBadge'; 
import FullScreenSpinner from '../../../../src/components/common/FullScreenSpinner'; 

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const formatSafeDate = (dateString) => {
  if (!dateString) return '';
  const d = new Date(dateString);
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${days[d.getDay()]}, ${months[d.getMonth()]} ${d.getDate()}`;
};

export default function DashboardScreen() {
  const { theme, isDark } = useTheme();
  const router = useRouter();
  const dispatch = useDispatch();
  
  const user = useSelector(selectCurrentUser);
  const stats = useSelector(selectStats);
  const charts = useSelector(selectCharts);
  const alerts = useSelector(selectAlerts) || {};
  const recentIssues = useSelector(selectRecentIssues) || [];
  const isSolverView = useSelector(selectIsSolverView); 
  const loading = useSelector(selectDashboardLoading);
  const isOnline = useSelector(selectIsOnline);
  const solvers = useSelector(selectAllSolvers);
  const sitesList = useSelector(selectAllSites);
  const complaintsList = useSelector(selectAllComplaints); 

  const [refreshing, setRefreshing] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const lineChartRef = useRef();
  const pieChartRef = useRef();
  const barChartRef = useRef();

  useEffect(() => {
    if (user) {
      dispatch(fetchDashboardData(user));
      dispatch(fetchSolversPerformance(user));
      dispatch(fetchSitesWithAnalytics(user));
      dispatch(fetchComplaints(user)); 
    }
  }, [user, dispatch]);

  const getDeadlineIndicator = (dateString) => {
    if (!dateString) return null;
    const dueDate = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    dueDate.setHours(0, 0, 0, 0);
    
    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return { text: `Overdue by ${Math.abs(diffDays)}d`, color: '#ef4444' };
    if (diffDays === 0) return { text: 'Due Today', color: '#f59e0b' }; 
    if (diffDays === 1) return { text: 'Due Tomorrow', color: '#f59e0b' }; 
    return { text: `Due in ${diffDays}d`, color: theme.textSecondary }; 
  };

  const onRefresh = useCallback(async () => {
    if (!isOnline) {
      setToastMessage("Can't refresh while offline");
      setTimeout(() => setToastMessage(''), 3000);
      return;
    }
    
    setRefreshing(true);
    if (user) {
      try {
        await Promise.allSettled([
          dispatch(fetchDashboardData(user)),
          dispatch(fetchSolversPerformance(user)),
          dispatch(fetchSitesWithAnalytics(user)),
          dispatch(fetchComplaints(user))
        ]);
      } finally {
        setRefreshing(false);
      }
    } else {
      setRefreshing(false);
    }
  }, [user, isOnline, dispatch]);

  const surfaceColor = isDark ? '#171717' : '#ffffff';
  const borderColor = isDark ? '#2a2a2a' : '#ebebeb';

  const calculatedLineData = useMemo(() => {
    if (user?.role === 'manager') {
      if (!solvers || solvers.length === 0) {
        return { 
          labels: ['No Data'], 
          datasets: [{ data: [0] }], 
          legend: ['Solver Workload'],
          subtitle: 'Total assignments distributed among top solvers.' 
        };
      }
      
      const topSolvers = [...solvers]
        .sort((a, b) => (b.performance?.total_assigned || 0) - (a.performance?.total_assigned || 0))
        .slice(0, 6);

      return {
        labels: topSolvers.map(s => (s.name || `ID:${s.id || '?'}`).split(' ')[0]),
        datasets: [{ data: topSolvers.map(s => s.performance?.total_assigned || 0), color: () => '#8b5cf6' }],
        legend: ['Solver Workload (Total Assignments)'],
        subtitle: 'Total assignments distributed among top solvers.'
      };
    } 
    
    if (!recentIssues || recentIssues.length === 0) {
      return { 
        labels: ['No Data'], 
        datasets: [{ data: [0] }], 
        legend: ['Recent Volume'],
        subtitle: 'Trend over the last 7 active days.' 
      };
    }

    const validIssues = [...recentIssues].filter(i => 
      isSolverView ? (i.due_date || i.created_at) : (i.updated_at || i.created_at)
    );
    
    if (validIssues.length === 0) {
        return { 
          labels: ['No Dates'], 
          datasets: [{ data: [0] }], 
          legend: ['Missing Date Data'],
          subtitle: 'No valid dates found to chart.'
        };
    }

    validIssues.sort((a, b) => {
      const dateA = isSolverView ? (a.due_date || a.created_at) : (a.updated_at || a.created_at);
      const dateB = isSolverView ? (b.due_date || b.created_at) : (b.updated_at || b.created_at);
      return new Date(dateB) - new Date(dateA);
    });
    
    const latestDateStr = isSolverView 
      ? (validIssues[0].due_date || validIssues[0].created_at) 
      : (validIssues[0].updated_at || validIssues[0].created_at);
      
    const latestDate = new Date(latestDateStr);
    const startDate = new Date(latestDate);
    startDate.setDate(latestDate.getDate() - 6);
    
    const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const labels = [];
    const data = [];
    
    for (let i = 6; i >= 0; i--) {
      const d = new Date(latestDate);
      d.setDate(d.getDate() - i);
      labels.push(daysOfWeek[d.getDay()]);
      
      const dateString = d.toISOString().split('T')[0];
      
      const count = recentIssues.filter(issue => {
          const issueDate = isSolverView ? (issue.due_date || issue.created_at) : (issue.updated_at || issue.created_at);
          return issueDate?.startsWith(dateString);
      }).length;
      
      data.push(count);
    }

    const hasData = data.some(val => val > 0);

    return {
      labels,
      datasets: [{ data: hasData ? data : [0], color: () => '#ef4444' }],
      legend: [isSolverView ? 'Recent Deadlines Recorded' : 'Recent Issues'],
      subtitle: `Trend from ${formatSafeDate(startDate)} to ${formatSafeDate(latestDate)}`
    };
  }, [recentIssues, isSolverView, user?.role, solvers]);

  const pieData = charts?.issuesByCategory?.length > 0 
    ? charts.issuesByCategory.map((item) => ({
        name: item.name,
        population: item.count,
        color: item.color,
        legendFontColor: theme.text,
        legendFontSize: 12,
      })) 
    : [{ name: 'No Data', population: 1, color: isDark ? '#333' : '#e5e5e5', legendFontColor: theme.text, legendFontSize: 12 }];

  const calculatedBarData = useMemo(() => {
    if (!sitesList || sitesList.length === 0) {
      return { labels: ['No Data'], datasets: [{ data: [0] }] };
    }
    const topSites = [...sitesList]
      .sort((a, b) => (b.analytics?.total_issues || 0) - (a.analytics?.total_issues || 0))
      .slice(0, 5);

    return {
      labels: topSites.map(s => (s.name || 'Site').substring(0, 5)),
      datasets: [{ data: topSites.map(s => s.analytics?.total_issues || 0) }]
    };
  }, [sitesList]);

  const getOptimalSegments = (maxVal) => {
    if (maxVal === 0) return 1; 
    if (maxVal <= 8) return maxVal; 
    return 4; 
  };

  const lineDataMax = Math.max(...calculatedLineData.datasets[0].data);
  const lineSegments = getOptimalSegments(lineDataMax);

  const barDataMax = calculatedBarData.datasets[0].data.length > 0 
    ? Math.max(...calculatedBarData.datasets[0].data) 
    : 0;
  const barSegments = getOptimalSegments(barDataMax);

  if (loading && !stats?.totalIssues) return <Loader message="Analyzing data..." />;

  const chartConfig = {
    backgroundColor: surfaceColor,
    backgroundGradientFrom: surfaceColor,
    backgroundGradientTo: surfaceColor,
    color: (opacity = 1) => isDark ? `rgba(255, 255, 255, ${opacity * 0.5})` : `rgba(0, 0, 0, ${opacity * 0.5})`,
    labelColor: () => theme.textSecondary,
    strokeWidth: 2,
    barPercentage: 0.6,
    decimalPlaces: 0,
    propsForLabels: { fontSize: 11, fontWeight: '500' },
    propsForDots: { r: '4', strokeWidth: '2', stroke: isDark ? '#171717' : '#ffffff' },
  };

  // Alert card config — keeps all routing logic untouched
  const alertCards = [
    {
      icon: 'alert-circle',
      count: alerts?.escalations || 0,
      label: 'Escalated',
      accentColor: '#ef4444',
      bgLight: '#fef2f2',
      bgDark: 'rgba(239,68,68,0.08)',
      borderLight: '#fecaca',
      borderDark: 'rgba(239,68,68,0.2)',
      iconBgLight: '#fee2e2',
      iconBgDark: 'rgba(239,68,68,0.15)',
      route: '/(main)/(tabs)/dashboard/escalated',
    },
    {
      icon: 'clipboard-outline',
      count: alerts?.pendingReviews || 0,
      label: 'Pending Review',
      accentColor: '#3b82f6',
      bgLight: '#eff6ff',
      bgDark: 'rgba(59,130,246,0.08)',
      borderLight: '#bfdbfe',
      borderDark: 'rgba(59,130,246,0.2)',
      iconBgLight: '#dbeafe',
      iconBgDark: 'rgba(59,130,246,0.15)',
      route: '/(main)/(tabs)/dashboard/awaiting_review',
    },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#111111' : '#f4f4f6' }]}>
      
      {/* ── HEADER ── */}
      <View style={[styles.header, { backgroundColor: isDark ? '#111111' : '#f4f4f6' }]}>
        <View>
          <Text style={[styles.greeting, { color: theme.textSecondary }]}>Analytics Overview</Text>
          <Text style={[styles.userName, { color: theme.text }]}>{isSolverView ? 'Workspace' : 'Dashboard'}</Text>
        </View>
        
        <View style={styles.headerActions}>
          {Platform.OS === 'web' && (
            <TouchableOpacity 
              onPress={onRefresh} 
              disabled={refreshing}
              style={styles.refreshButton}
            >
              <Ionicons 
                name="sync" 
                size={22} 
                color={refreshing ? theme.primary : theme.textSecondary} 
              />
            </TouchableOpacity>
          )}

          <TouchableOpacity onPress={() => router.push('/(main)/(tabs)/chat')} activeOpacity={0.7} style={{ marginRight: 4, padding: 4 }}>
            <Ionicons name="arrow-undo-outline" size={24} color={theme.text} />
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.push('/(main)/profile')} activeOpacity={0.7}>
            <Avatar uri={user?.avatar} name={user?.name} size="medium" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.textSecondary} />}
      >

        {/* ── ACTION REQUIRED ALERTS (Manager only) ── */}
        {!isSolverView && <View style={styles.statsContainer}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Action Required</Text>
          
          <View style={styles.alertsRow}>
            {alertCards.map((card) => (
              <TouchableOpacity
                key={card.label}
                activeOpacity={0.75}
                onPress={() => router.push(card.route)}
                style={[
                  styles.alertCard,
                  {
                    backgroundColor: isDark ? card.bgDark : card.bgLight,
                    borderColor: isDark ? card.borderDark : card.borderLight,
                  },
                ]}
              >
                {/* Accent bar */}
                <View style={[styles.alertAccentBar, { backgroundColor: card.accentColor }]} />

                {/* Icon */}
                <View style={[styles.alertIconWrap, { backgroundColor: isDark ? card.iconBgDark : card.iconBgLight }]}>
                  <Ionicons name={card.icon} size={18} color={card.accentColor} />
                </View>

                {/* Count */}
                <Text style={[styles.alertCount, { color: card.accentColor }]}>
                  {card.count}
                </Text>

                {/* Label */}
                <Text
                  style={[styles.alertLabel, { color: isDark ? card.accentColor : card.accentColor }]}
                  numberOfLines={2}
                  adjustsFontSizeToFit
                >
                  {card.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>}

        {/* ── KEY METRICS ── */}
        <View style={styles.statsContainer}>
          <View style={styles.statsRow}>
            <DashboardCard title={isSolverView ? "Active Tasks" : "Pending issues"} count={stats?.notFixedIssues || 0} icon="time-outline" color="#f59e0b" onPress={() => router.push('/(main)/(tabs)/dashboard/not-fixed')} />
            <DashboardCard title="Resolved" count={stats?.fixedIssues || 0} icon="checkmark-done" color="#10a37f" onPress={() => router.push('/(main)/(tabs)/dashboard/fixed')} />
          </View>

          {isSolverView ? (
            <>
              <View style={styles.statsRow}>
                <DashboardCard 
                  title="My Analytics" 
                  count={(stats?.fixedIssues || 0) + (stats?.notFixedIssues || 0)} 
                  icon="stats-chart" 
                  color="#8b5cf6" 
                  onPress={() => router.push({ pathname: '/(main)/(tabs)/dashboard/solver-profile', params: { id: user?.id } })} 
                />
                <DashboardCard 
                  title="My Sites" 
                  count={sitesList?.length || 0} 
                  icon="business-outline" 
                  color="#3b82f6" 
                  onPress={() => router.push('/(main)/(tabs)/dashboard/sites')}
                />
              </View>
              <View style={styles.statsRow}>
                <DashboardCard 
                  title="Complaints Logged" 
                  count={complaintsList?.filter(c => c.target_solver_id === user?.id)?.length || 0} 
                  icon="warning-outline" 
                  color="#ef4444" 
                  style={styles.fullWidthCard} 
                  onPress={() => router.push('/(main)/(tabs)/dashboard/complaints')}
                />
              </View>
            </>
          ) : (
            <>
              <View style={styles.statsRow}>
                <DashboardCard 
                  title="Total Recorded Complaints" 
                  count={complaintsList?.length || 0}
 
                  icon="warning-outline" 
                  color="#ef4444" 
                  onPress={() => router.push('/(main)/(tabs)/dashboard/complaints')} 
                  style={styles.fullWidthCard} 
                />
              </View>
              <View style={styles.statsRow}>
                <DashboardCard title="Sites" count={sitesList?.length || 0} icon="business-outline" color="#3b82f6" onPress={() => router.push('/(main)/(tabs)/dashboard/sites')} />
                <DashboardCard title="Solvers" count={solvers?.length || 0} icon="people-outline" color="#8b5cf6" onPress={() => router.push('/(main)/(tabs)/dashboard/solvers')} />
              </View>
            </>
          )}
        </View>

        {/* ── DYNAMIC LINE CHART ── */}
        <View style={[styles.chartCard, { backgroundColor: surfaceColor, borderColor }]}>
          <Text style={[styles.chartTitle, { color: theme.text }]}>
            {user?.role === 'manager' ? 'Solver Bandwidth' : isSolverView ? 'Upcoming Deadlines' : 'Recent Issues'}
          </Text>
          <Text style={[styles.chartSubtitle, { color: theme.textSecondary }]}>
            {calculatedLineData.subtitle}
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View ref={lineChartRef} collapsable={false} style={{ backgroundColor: surfaceColor, paddingRight: 16 }}>
              <LineChart 
                data={calculatedLineData} 
                width={SCREEN_WIDTH - 32} 
                height={220} 
                chartConfig={chartConfig} 
                bezier 
                style={styles.chart} 
                withInnerLines={true} 
                withOuterLines={false} 
                fromZero={true} 
                segments={lineSegments} 
              />
            </View>
          </ScrollView>
          <ChartDownloadButton viewShotRef={lineChartRef} chartType={user?.role === 'manager' ? 'Solver Bandwidth' : 'Volume Over Time'} />
        </View>

        {/* ── PIE CHART ── */}
        <View style={[styles.chartCard, { backgroundColor: surfaceColor, borderColor }]}>
          <Text style={[styles.chartTitle, { color: theme.text }]}>Status Breakdown</Text>
          <Text style={[styles.chartSubtitle, { color: theme.textSecondary }]}>Distribution of issues by current status.</Text>
          <View ref={pieChartRef} collapsable={false} style={{ backgroundColor: surfaceColor, alignItems: 'center' }}>
            <PieChart data={pieData} width={SCREEN_WIDTH - 64} height={200} chartConfig={chartConfig} accessor="population" backgroundColor="transparent" paddingLeft="15" absolute />
          </View>
          <ChartDownloadButton viewShotRef={pieChartRef} chartType="Status Breakdown" />
        </View>

        {/* ── BAR CHART (Manager Only) ── */}
        {!isSolverView && user?.role === 'manager' && (
          <View style={[styles.chartCard, { backgroundColor: surfaceColor, borderColor }]}>
            <Text style={[styles.chartTitle, { color: theme.text }]}>Site Performance</Text>
            <Text style={[styles.chartSubtitle, { color: theme.textSecondary }]}>Total issues handled per location.</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View ref={barChartRef} collapsable={false} style={{ backgroundColor: surfaceColor, paddingRight: 16 }}>
                <BarChart
                  data={calculatedBarData}
                  width={SCREEN_WIDTH - 32}
                  height={220}
                  chartConfig={{ ...chartConfig, color: () => '#3b82f6' }}
                  style={styles.chart}
                  showValuesOnTopOfBars
                  withInnerLines={false}
                  fromZero={true} 
                  segments={barSegments} 
                />
              </View>
            </ScrollView>
            <ChartDownloadButton viewShotRef={barChartRef} chartType="Site Performance" />
          </View>
        )}

        {/* ── RECENT ISSUES FEED ── */}
        {recentIssues?.length > 0 && (
          <View style={[styles.chartCard, { backgroundColor: surfaceColor, borderColor, padding: 0, overflow: 'hidden' }]}>
            <View style={{ padding: 20, paddingBottom: 10 }}>
              <Text style={[styles.chartTitle, { color: theme.text }]}>{isSolverView ? "My Active Tasks" : "Recent Activity"}</Text>
              <Text style={[styles.chartSubtitle, { color: theme.textSecondary, marginBottom: 10 }]}>Current tasks requiring attention.</Text>
            </View>
            
            {recentIssues.map((issue, index) => {
              const targetDate = isSolverView 
                ? (issue.due_date || issue.created_at) 
                : (issue.updated_at || issue.created_at);
                
              const deadline = isSolverView ? getDeadlineIndicator(targetDate) : null;
              const displayDate = targetDate ? formatSafeDate(targetDate) : '';
              
              const datePrefix = isSolverView ? 'Due' : (issue.updated_at ? 'Updated' : 'Opened');

              return (
                <TouchableOpacity 
                  key={issue.id} 
                  style={[styles.issueRow, { borderTopColor: borderColor, borderTopWidth: index === 0 ? 0 : StyleSheet.hairlineWidth }]}
                  onPress={() => router.push({ pathname: '/(main)/(tabs)/dashboard/issue-detail', params: { id: issue.id } })}
                >
                  <View style={{ flex: 1, paddingRight: 12 }}>
                    
                    <View style={styles.titleRow}>
                      <Text style={[styles.issueTitle, { color: theme.text }]} numberOfLines={1}>
                        {issue.title}
                      </Text>
                      
                      {deadline && (
                        <View style={[styles.deadlineBadge, { backgroundColor: `${deadline.color}15` }]}>
                          <Text style={[styles.deadlineText, { color: deadline.color }]}>
                            {deadline.text}
                          </Text>
                        </View>
                      )}
                    </View>

                    <Text style={[styles.issueMeta, { color: theme.textSecondary }]}>
                      {issue.site_name} · #{issue.id}
                      {displayDate ? ` · ${datePrefix}: ${displayDate}` : ''}
                    </Text>
                  </View>
                  <StatusBadge status={issue.status} />
                </TouchableOpacity>
              );
            })}

            <TouchableOpacity 
              style={[styles.viewAllButton, { borderTopColor: borderColor }]}
              onPress={() => router.push('/(main)/(tabs)/issues')}
            >
              <Text style={[styles.viewAllText, { color: theme.textSecondary }]}>Manage {isSolverView ? 'Tasks' : 'Issues'} in Full View</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>

      <FullScreenSpinner visible={refreshing} message="Updating Dashboard..." />

      {toastMessage !== '' && <Toast message={toastMessage} />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollArea: { flex: 1 },

  // ── HEADER ──
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 20 : 10,
    paddingBottom: 20,
  },
  greeting: { fontSize: 13, fontWeight: '500', marginBottom: 3, letterSpacing: 0.2 },
  userName: { fontSize: 26, fontWeight: '700', letterSpacing: -0.5 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  refreshButton: { padding: 8, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  content: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 0 },

  // ── SECTION TITLE ──
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.1,
    marginBottom: 10,
    marginLeft: 2,
  },

  // ── CONTAINERS ──
  statsContainer: { marginBottom: 24 },
  statsRow: { flexDirection: 'row', marginBottom: 12, gap: 12 },
  fullWidthCard: { flex: 1, marginRight: 0 },

  // ── ALERT CARDS — now match chart card language ──
  alertsRow: { flexDirection: 'row', gap: 10 },
  alertCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    paddingTop: 0,          // accent bar sits flush at top
    paddingBottom: 16,
    paddingHorizontal: 12,
    alignItems: 'flex-start',
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
      },
      android: { elevation: 1 },
    }),
  },
  alertAccentBar: {
    width: '100%',          // full-width top stripe — mirrors chart card section headers
    height: 3,
    borderRadius: 2,
    marginBottom: 14,
    marginLeft: -12,        // bleed to edges of paddingHorizontal
    alignSelf: 'stretch',
    // override width approach:
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  alertIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,          // pushes below the accent bar
    marginBottom: 12,
  },
  alertCount: {
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -1,
    marginBottom: 4,
    lineHeight: 34,
  },
  alertLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    lineHeight: 15,
  },

  // ── CHART CARDS ──
  chartCard: {
    marginBottom: 16,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 10,
      },
      android: { elevation: 1 },
    }),
  },
  chartTitle: { fontSize: 17, fontWeight: '700', letterSpacing: -0.3, marginBottom: 3 },
  chartSubtitle: { fontSize: 13, marginBottom: 20, lineHeight: 18, opacity: 0.75 },
  chart: { borderRadius: 12, marginLeft: -10 },

  // ── RECENT ISSUES ──
  issueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 5,
    flexWrap: 'wrap',
  },
  issueTitle: { fontSize: 15, fontWeight: '600', flexShrink: 1 },
  deadlineBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5 },
  deadlineText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.2 },
  issueMeta: { fontSize: 12.5, lineHeight: 17 },

  viewAllButton: {
    paddingVertical: 15,
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  viewAllText: { fontSize: 13, fontWeight: '600' },
  bottomPadding: { height: 40 },
});
```

## C:\Users\head user\Desktop\Hamthan\v3\AI-Operation-Kaizen\FullStack\frontend\app\(main)\(tabs)\dashboard\issue-detail.js

```javascript
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  RefreshControl,
  Image,
  Animated,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSmartBack } from '../../../../src/hooks/useSmartBack';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';

import { useTheme } from '../../../../src/theme/ThemeContext';
import { selectCurrentUser } from '../../../../src/store/slices/authSlice';
import { 
  fetchIssueById, 
  fetchIssueTimeline,
  selectCurrentIssue, 
  selectIssuesLoading, 
  clearCurrentIssue 
} from '../../../../src/store/slices/issuesSlice';
import { formatDate, formatDateTime } from '../../../../src/utils/formatters'; 
import { calculateOverdueDays } from '../../../../src/utils/overdue';
import StatusBadge from '../../../../src/components/common/StatusBadge';
import Avatar from '../../../../src/components/common/Avatar';
import Button from '../../../../src/components/common/Button';
import IssueTimeline from '../../../../src/components/issue/IssueTimeline';
import ImageGallery from '../../../../src/components/issue/ImageGallery';
import CallHistorySection from '../../../../src/components/issue/CallHistorySection';
import Loader from '../../../../src/components/common/Loader';

import { selectIsOnline } from '../../../../src/store/slices/offlineSlice';
import Toast from '../../../../src/components/common/Toast';
import FullScreenSpinner from '../../../../src/components/common/FullScreenSpinner';

export default function IssueDetailScreen() {
  const { theme, isDark } = useTheme(); 
  const router = useRouter();
  
  const { id, fromNotification, highlighted } = useLocalSearchParams();

  const handleSmartBack = useCallback(() => {
    if (fromNotification === 'true') {
      router.replace('/(main)/(tabs)/dashboard');
      setTimeout(() => {
        router.navigate('/(main)/(tabs)/chat');
      }, 100); 
    } else {
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/(main)/(tabs)/dashboard');
      }
    }
  }, [fromNotification, router]);

  useSmartBack(handleSmartBack);

  const dispatch = useDispatch();
  const user = useSelector(selectCurrentUser);
  const issue = useSelector(selectCurrentIssue);
  const loading = useSelector(selectIssuesLoading);
  const isOnline = useSelector(selectIsOnline);

  const [refreshing, setRefreshing] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // 📍 CAMERA & LOCATION STATES
  const [selectedImage, setSelectedImage] = useState(null);
  const [isCapturingLocation, setIsCapturingLocation] = useState(false);
  const [capturedLocation, setCapturedLocation] = useState(null);

  const [highlightAnim] = useState(new Animated.Value(highlighted === 'true' ? 1 : 0));

  useEffect(() => {
    if (id) {
      dispatch(fetchIssueById(parseInt(id)));
      dispatch(fetchIssueTimeline(parseInt(id)));
    }
    return () => {
      dispatch(clearCurrentIssue());
    };
  }, [id, dispatch]);

  useEffect(() => {
    if (highlighted === 'true') {
      Animated.timing(highlightAnim, {
        toValue: 0,
        duration: 2000,
        delay: 500,
        useNativeDriver: false,
      }).start();
    }
  }, [highlighted, highlightAnim]);

  const onRefresh = useCallback(async () => {
    if (!isOnline) {
      setToastMessage("Can't refresh while offline");
      setTimeout(() => setToastMessage(''), 3000);
      return;
    }
    if (!id) return;
    
    setRefreshing(true);
    try {
      await Promise.allSettled([
        dispatch(fetchIssueById(parseInt(id))),
        dispatch(fetchIssueTimeline(parseInt(id)))
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [id, isOnline, dispatch]);

  // 📍 BULLETPROOF WEB/NATIVE CAMERA HANDLER
  const handleTakePhoto = async () => {
    console.log("\n[DEBUG] --- STARTING PHOTO CAPTURE FLOW ---");
    setIsCapturingLocation(true); 

    try {
      let loc = null;
      if (Platform.OS !== 'web') {
        try {
          console.log("[DEBUG] Native Device: Requesting GPS...");
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status === 'granted') {
            const locationPromise = Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
            const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 8000));
            const position = await Promise.race([locationPromise, timeoutPromise]);
            loc = { latitude: position.coords.latitude, longitude: position.coords.longitude };
          }
        } catch(e) {
          console.log("[DEBUG] Native location fetch failed:", e.message);
        }
      }

      if (loc) {
        setCapturedLocation(loc);
      } else if (Platform.OS !== 'web') {
        Alert.alert("Location Required", "We need your location to verify the fix.");
        setIsCapturingLocation(false);
        return; 
      }

      let result;
      if (Platform.OS === 'web') {
        console.log("[DEBUG] Web: Triggering File Picker.");
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [4, 3],
          quality: 0.8,
        });
      } else {
        const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
        if (permissionResult.granted === false) {
          Alert.alert("Permission Required", "Camera access is needed.");
          setIsCapturingLocation(false);
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [4, 3],
          quality: 0.8,
        });
      }

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setSelectedImage(result.assets[0].uri);
        setCapturedLocation(loc);
      } else {
        setCapturedLocation(null); 
      }
    } catch (error) {
      if (Platform.OS === 'web') alert("Error opening file picker.");
    } finally {
      setIsCapturingLocation(false); 
    }
  };

  const handleSubmitPhoto = () => {
    console.log("\n=============================================");
    console.log("📸 FIX PHOTO UPLOADED");
    console.log(`Issue ID:      ${issue.id}`);
    console.log(`Solver:        ${user?.name}`);
    console.log(`Location:      ${capturedLocation ? `${capturedLocation.latitude}, ${capturedLocation.longitude}` : 'Bypassed (Web)'}`);
    console.log("=============================================\n");

    setSelectedImage(null);
    setCapturedLocation(null);
    
    if (Platform.OS === 'web') {
      alert("Sent Successfully! Fix photo uploaded for review.");
    } else {
      Alert.alert("Sent Successfully!", "Fix photo uploaded for review.", [{ text: "OK" }]);
    }
  };

  // 📍 REVIEW ACTION HANDLER (Supervisors/Managers)
  const handleReviewAction = (actionType) => {
    console.log(`[DEBUG] Action: ${actionType} on Issue #${issue?.id}`);

    if (actionType === 'APPROVE') {
      if (Platform.OS === 'web') {
        if (window.confirm("Approve this fix? Issue will be marked as COMPLETED.")) {
          alert("Success! Issue has been approved and closed.");
          router.back();
        }
      } else {
        Alert.alert("Approve Fix", "Approve this fix? Issue will be marked as COMPLETED.", [
          { text: "Cancel", style: "cancel" },
          { text: "Approve", onPress: () => { Alert.alert("Success", "Issue approved."); router.back(); } }
        ]);
      }
    } else if (actionType === 'REJECT') {
      if (Platform.OS === 'web') {
        if (window.confirm("Reject this fix? Issue will return to the solver.")) {
          alert("Rejected! Issue returned to solver.");
          router.back();
        }
      } else {
        Alert.alert("Reject Fix", "Reject this fix? Issue will return to the solver.", [
          { text: "Cancel", style: "cancel" },
          { text: "Reject", style: "destructive", onPress: () => { Alert.alert("Rejected", "Issue returned."); router.back(); } }
        ]);
      }
    }
  };

  if (loading && !refreshing && !issue) return <Loader message="Loading issue details..." />;
  if (!issue) return <Loader message="Loading issue details..." />;

  const currentAssignment = issue.assignments && issue.assignments.length > 0 
    ? issue.assignments[0] 
    : null;

  const overdueDays = calculateOverdueDays(issue.deadline_at);
  const isOverdue = overdueDays > 0 && issue.status !== 'COMPLETED';

  const bgColor = isDark ? '#212121' : '#f9f9f9';
  const surfaceColor = isDark ? '#171717' : '#ffffff';
  const borderColor = isDark ? '#333333' : '#e5e5e5';
  const iconBg = isDark ? 'rgba(255,255,255,0.05)' : '#f4f4f4';
  const successAccent = '#10a37f';
  
  // ── ROLE + STATUS DERIVED FLAGS ──
  const isProblemSolver = user?.role === 'problemsolver' || user?.role === 'problem_solver';
  const isSupervisor    = user?.role === 'supervisor';
  const isManager       = user?.role === 'manager';

  const showMarkDoneBtn = isProblemSolver && (issue.status?.toUpperCase() === 'IN_PROGRESS' || issue.status?.toUpperCase() === 'ASSIGNED');

  const highlightColor = highlightAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [surfaceColor, isDark ? '#3f3f46' : '#fef9c3'],
  });

  return (
    <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: bgColor }]}>
      
      {/* ── HEADER ── */}
      <View style={[styles.header, { backgroundColor: bgColor, borderBottomColor: borderColor }]}>
        <TouchableOpacity onPress={handleSmartBack} activeOpacity={0.6} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.textSecondary }]}>Issue #{issue.id}</Text>
        
        <View style={styles.headerRight}>
          {Platform.OS === 'web' ? (
            <TouchableOpacity onPress={onRefresh} disabled={refreshing} style={styles.webRefreshButton}>
              <Ionicons name="sync" size={22} color={refreshing ? theme.primary : theme.textSecondary} />
            </TouchableOpacity>
          ) : (
            <View style={styles.placeholder} />
          )}
        </View>
      </View>

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          Platform.OS === 'web' ? undefined : (
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.textSecondary} />
          )
        }
      >
        
        {/* ── ISSUE IDENTITY ── */}
        <Animated.View style={[styles.card, styles.flatCard, { backgroundColor: highlightColor, borderColor }]}>
          <View style={styles.badgeRow}>
            <StatusBadge status={issue.status} size="small" />
            <StatusBadge status={issue.priority} type="priority" size="small" />
            {isOverdue && <StatusBadge label={`${overdueDays}d overdue`} color="#ef4444" />}
          </View>
          <Text style={[styles.title, { color: theme.text }]}>{issue.title}</Text>
          <Text style={[styles.description, { color: theme.textSecondary }]}>
            {issue.description}
          </Text>
        </Animated.View>

        {/* ── DETAILS ROW ── */}
        <View style={[styles.card, styles.flatCard, { backgroundColor: surfaceColor, borderColor }]}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Details</Text>
          
          <View style={styles.infoRow}>
            <View style={[styles.iconWrapper, { backgroundColor: iconBg }]}>
              <Ionicons name="location-outline" size={18} color={theme.textSecondary} />
            </View>
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Site</Text>
              <Text style={[styles.infoValue, { color: theme.text }]}>{issue.site_name || 'N/A'}</Text>
            </View>
          </View>

          {issue.site_location && (
            <View style={styles.infoRow}>
              <View style={[styles.iconWrapper, { backgroundColor: iconBg }]}>
                <Ionicons name="map-outline" size={18} color={theme.textSecondary} />
              </View>
              <View style={styles.infoContent}>
                <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Location</Text>
                <Text style={[styles.infoValue, { color: theme.text }]}>{issue.site_location}</Text>
              </View>
            </View>
          )}

          {currentAssignment?.due_date && (
            <View style={styles.infoRow}>
              <View style={[styles.iconWrapper, { backgroundColor: iconBg }]}>
                <Ionicons name="calendar-outline" size={18} color={theme.textSecondary} />
              </View>
              <View style={styles.infoContent}>
                <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Deadline</Text>
                <Text style={[styles.infoValue, { color: theme.text }]}>{formatDate(currentAssignment.due_date)}</Text>
              </View>
            </View>
          )}
          
          <View style={[styles.infoRow, { marginBottom: 0 }]}>
            <View style={[styles.iconWrapper, { backgroundColor: iconBg }]}>
              <Ionicons name="construct-outline" size={18} color={theme.textSecondary} />
            </View>
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Category</Text>
              <Text style={[styles.infoValue, { color: theme.text }]}>{issue.issue_type || 'General Maintenance'}</Text>
            </View>
          </View>
        </View>

        {/* ── PEOPLE INVOLVED ── */}
        <View style={[styles.card, styles.flatCard, { backgroundColor: surfaceColor, borderColor }]}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>People Involved</Text>
          <View style={styles.peopleGrid}>
            <View style={[styles.personRow, currentAssignment && { borderBottomColor: borderColor, borderBottomWidth: StyleSheet.hairlineWidth }]}>
              <Avatar name={issue.supervisor_name} size="medium" />
              <View style={styles.personInfo}>
                <Text style={[styles.personName, { color: theme.text }]} numberOfLines={1}>
                  {issue.supervisor_name || 'N/A'}
                </Text>
                <Text style={[styles.personRole, { color: theme.textSecondary }]}>Raised By</Text>
              </View>
            </View>
            
            {currentAssignment && (
              <View style={[styles.personRow, { paddingTop: 12, paddingBottom: 0 }]}>
                <Avatar name={currentAssignment.solver_name} size="medium" />
                <View style={styles.personInfo}>
                  <Text style={[styles.personName, { color: theme.text }]} numberOfLines={1}>
                    {currentAssignment.solver_name}
                  </Text>
                  <Text style={[styles.personRole, { color: theme.textSecondary }]}>Assigned To</Text>
                </View>
                {currentAssignment.solver_phone && (
                   <Text style={[styles.personRole, { color: theme.textSecondary, marginTop: 4 }]}>
                     {currentAssignment.solver_phone}
                   </Text>
                )}
              </View>
            )}
          </View>
        </View>

        {/* ── METADATA (From Full Screen) ── */}
        <View style={[styles.card, styles.flatCard, { backgroundColor: surfaceColor, borderColor }]}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Metadata</Text>

          {issue.complaints_count !== undefined && (
            <View style={styles.infoRow}>
              <View style={[styles.iconWrapper, { backgroundColor: issue.complaints_count > 0 ? 'rgba(239,68,68,0.1)' : iconBg }]}><Ionicons name="warning-outline" size={18} color={issue.complaints_count > 0 ? '#ef4444' : theme.textSecondary} /></View>
              <View style={styles.infoContent}>
                <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Complaints Filed</Text>
                <Text style={[styles.infoValue, { color: issue.complaints_count > 0 ? '#ef4444' : theme.text }]}>{issue.complaints_count}</Text>
              </View>
            </View>
          )}

          {issue.track_status && (
            <View style={styles.infoRow}>
              <View style={[styles.iconWrapper, { backgroundColor: iconBg }]}><Ionicons name="analytics-outline" size={18} color={theme.textSecondary} /></View>
              <View style={styles.infoContent}>
                <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Tracking Status</Text>
                <Text style={[styles.infoValue, { color: theme.text, textTransform: 'capitalize' }]}>{issue.track_status.replace(/_/g, ' ')}</Text>
              </View>
            </View>
          )}
          
          <View style={styles.infoRow}>
            <View style={[styles.iconWrapper, { backgroundColor: iconBg }]}><Ionicons name="add-outline" size={18} color={theme.textSecondary} /></View>
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Created</Text>
              <Text style={[styles.infoValue, { color: theme.text }]}>{formatDateTime(issue.created_at)}</Text>
            </View>
          </View>
          
          <View style={[styles.infoRow, { marginBottom: 0 }]}>
            <View style={[styles.iconWrapper, { backgroundColor: iconBg }]}><Ionicons name="refresh-outline" size={18} color={theme.textSecondary} /></View>
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Last Updated</Text>
              <Text style={[styles.infoValue, { color: theme.text }]}>{formatDateTime(issue.updated_at)}</Text>
            </View>
          </View>
        </View>

        {/* ── PHOTOS ── */}
        <View style={[styles.card, styles.flatCard, { backgroundColor: surfaceColor, borderColor }]}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Photos</Text>
          <ImageGallery images={issue.images || []} />
        </View>

        {/* ── CALL HISTORY (Solver Only) ── */}
        {isProblemSolver && issue.call_logs?.length > 0 && (
          <View style={[styles.card, styles.flatCard, { backgroundColor: surfaceColor, borderColor, padding: 0, overflow: 'hidden' }]}>
            <CallHistorySection callLogs={issue.call_logs} />
          </View>
        )}

        {/* ── ACTIONS ── */}
        <View style={styles.actions}>

          {/* ── PROBLEM SOLVER ACTIONS ── */}
          {isProblemSolver && (
            <View style={styles.solverActionContainer}>
              {showMarkDoneBtn ? (
                !selectedImage ? (
                  <TouchableOpacity
                    activeOpacity={0.8}
                    style={[styles.primaryActionBtn, { backgroundColor: successAccent, opacity: isCapturingLocation ? 0.7 : 1 }]}
                    onPress={handleTakePhoto}
                    disabled={isCapturingLocation}
                  >
                    <View style={styles.primaryActionBtnInner}>
                      {isCapturingLocation ? <ActivityIndicator color="#fff" size="small" /> : <Ionicons name="camera" size={24} color="#fff" />}
                      <Text style={styles.primaryActionBtnText}>{isCapturingLocation ? "Preparing..." : "Take Fix Photo"}</Text>
                    </View>
                  </TouchableOpacity>
                ) : (
                  <View style={[styles.previewContainer, { backgroundColor: surfaceColor, borderColor }]}>
                    <View style={styles.previewHeader}>
                      <Ionicons name="image-outline" size={20} color={theme.text} />
                      <Text style={[styles.previewTitle, { color: theme.text }]}>Photo Ready</Text>
                    </View>
                    <Image source={{ uri: selectedImage }} style={[styles.previewImage, { borderColor }]} />
                    <Text style={[styles.previewSubtext, { color: theme.textSecondary }]}>Does this photo clearly show the resolved issue?</Text>
                    <View style={styles.previewActions}>
                      <TouchableOpacity style={[styles.previewBtn, { backgroundColor: iconBg, borderColor, borderWidth: 1 }]} onPress={() => { setSelectedImage(null); setCapturedLocation(null); }}>
                        <Text style={[styles.previewBtnText, { color: theme.text }]}>Retake</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.previewBtn, { backgroundColor: successAccent, flex: 2 }]} onPress={handleSubmitPhoto}>
                        <Ionicons name="send" size={18} color="#fff" style={{ marginRight: 6 }} />
                        <Text style={[styles.previewBtnText, { color: '#fff' }]}>Send Photo</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )
              ) : (
                <Text style={{ color: theme.textSecondary, textAlign: 'center', fontStyle: 'italic' }}>
                  No actions available for this status.
                </Text>
              )}
            </View>
          )}

          {/* ── SUPERVISOR & MANAGER ACTIONS ── */}
          {(isSupervisor || isManager) && issue.status?.toUpperCase() === 'RESOLVED_PENDING_REVIEW' && (
            <View style={{ gap: 12 }}>
              <Button 
                title="Approve & Close" 
                variant="success" 
                icon="checkmark-done-circle-outline" 
                onPress={() => handleReviewAction('APPROVE')} 
                style={{ backgroundColor: '#10a37f', borderColor: '#10a37f', borderRadius: 10 }} 
              />
              <Button 
                title="Reject Fix" 
                variant="danger" 
                icon="close-circle-outline" 
                onPress={() => handleReviewAction('REJECT')} 
                style={{ borderRadius: 10 }} 
              />
            </View>
          )}

        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>

      <FullScreenSpinner visible={refreshing} message="Updating Issue Details..." color={theme.primary} />

      {toastMessage !== '' && <Toast message={toastMessage} />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: 16, 
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backButton: { padding: 4, marginLeft: -4 },
  headerTitle: { fontSize: 14, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  headerRight: { width: 32, alignItems: 'flex-end' },
  placeholder: { width: 32 },
  webRefreshButton: { padding: 4 },
  
  content: { flex: 1 },
  
  card: { 
    marginHorizontal: 16, 
    marginTop: 16, 
    padding: 20 
  },
  flatCard: {
    borderRadius: 16,
    borderWidth: 1,
    ...Platform.select({
      ios: { shadowOpacity: 0 },
      android: { elevation: 0 },
    }),
  },

  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  title: { fontSize: 22, fontWeight: '700', letterSpacing: -0.5, marginBottom: 8, lineHeight: 28 },
  description: { fontSize: 15, lineHeight: 24, letterSpacing: -0.1 },

  sectionTitle: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 16 },
  
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 14 },
  iconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoContent: { flex: 1, justifyContent: 'center' },
  infoLabel: { fontSize: 12, fontWeight: '500', marginBottom: 2 },
  infoValue: { fontSize: 15, fontWeight: '600', letterSpacing: -0.2 },

  peopleGrid: { flexDirection: 'column' },
  personRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 12, 
    paddingBottom: 12 
  },
  personInfo: { flex: 1, justifyContent: 'center' },
  personName: { fontSize: 15, fontWeight: '600', letterSpacing: -0.2, marginBottom: 2 },
  personRole: { fontSize: 13 },
  
  // ── ACTIONS ──
  actions: { marginHorizontal: 16, marginTop: 32 },
  buttonMargin: { marginTop: 12 },

  solverActionContainer: { width: '100%' },
  primaryActionBtn: {
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 20,
    ...Platform.select({
      ios: { shadowColor: '#10a37f', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 12 },
      android: { elevation: 4 },
    }),
  },
  primaryActionBtnInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  primaryActionBtnText: { color: '#fff', fontSize: 17, fontWeight: '700', letterSpacing: -0.2 },
  
  previewContainer: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    alignItems: 'center',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 8 },
      android: { elevation: 2 },
    }),
  },
  previewHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16, alignSelf: 'flex-start' },
  previewTitle: { fontSize: 16, fontWeight: '700', letterSpacing: -0.2 },
  previewImage: {
    width: '100%',
    height: 220,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 12,
  },
  previewSubtext: { fontSize: 13, textAlign: 'center', marginBottom: 16 },
  previewActions: { flexDirection: 'row', gap: 12, width: '100%' },
  previewBtn: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 14,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewBtnText: { fontSize: 15, fontWeight: '700', letterSpacing: -0.2 },

  bottomPadding: { height: 40 },
});
```

## C:\Users\head user\Desktop\Hamthan\v3\AI-Operation-Kaizen\FullStack\frontend\app\(main)\(tabs)\dashboard\issues.js

```javascript
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../../src/theme/ThemeContext';
import { selectCurrentUser } from '../../../../src/store/slices/authSlice';
import { fetchIssues, selectFilteredIssues, selectIssuesLoading, setFilters, clearFilters } from '../../../../src/store/slices/issuesSlice';
import IssueCard from '../../../../src/components/issue/IssueCard';
import Loader from '../../../../src/components/common/Loader';
import EmptyState from '../../../../src/components/common/EmptyState';

const STATUS_FILTERS = [
  { label: 'All', value: null },
  { label: 'Open', value: 'OPEN' },
  { label: 'Assigned', value: 'ASSIGNED' },
  { label: 'In Progress', value: 'IN_PROGRESS' },
  { label: 'Completed', value: 'COMPLETED' },
  { label: 'Escalated', value: 'ESCALATED' },
];

const PRIORITY_FILTERS = [
  { label: 'All', value: null },
  { label: 'High', value: 'high' },
  { label: 'Medium', value: 'medium' },
  { label: 'Low', value: 'low' },
];

export default function IssuesListScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const dispatch = useDispatch();
  const user = useSelector(selectCurrentUser);
  const issues = useSelector(selectFilteredIssues);
  const loading = useSelector(selectIssuesLoading);

  const [searchText, setSearchText] = useState('');
  const [selectedStatus, setSelectedStatus] = useState(null);
  const [selectedPriority, setSelectedPriority] = useState(null);

  useEffect(() => {
    if (user) {
      dispatch(fetchIssues(user));
    }
  }, [user]);

  useEffect(() => {
    dispatch(setFilters({ search: searchText, status: selectedStatus, priority: selectedPriority }));
  }, [searchText, selectedStatus, selectedPriority]);

  const handleIssuePress = (issue) => {
    router.push({ pathname: '/(main)/(tabs)/dashboard/issue-detail', params: { id: issue.id } });
  };

  const renderFilterChip = (filter, isSelected, onPress) => (
    <TouchableOpacity
      key={filter.value || 'all'}
      style={[
        styles.filterChip,
        { backgroundColor: isSelected ? theme.primary : theme.inputBackground },
      ]}
      onPress={onPress}
    >
      <Text style={[styles.filterChipText, { color: isSelected ? '#fff' : theme.text }]}>
        {filter.label}
      </Text>
    </TouchableOpacity>
  );

  if (loading && issues.length === 0) {
    return <Loader message="Loading issues..." />;
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>All Issues</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Search */}
      <View style={[styles.searchContainer, { backgroundColor: theme.card }]}>
        <View style={[styles.searchInput, { backgroundColor: theme.inputBackground }]}>
          <Ionicons name="search" size={20} color={theme.textSecondary} />
          <TextInput
            style={[styles.searchTextInput, { color: theme.text }]}
            placeholder="Search issues..."
            placeholderTextColor={theme.textSecondary}
            value={searchText}
            onChangeText={setSearchText}
          />
          {searchText !== '' && (
            <TouchableOpacity onPress={() => setSearchText('')}>
              <Ionicons name="close-circle" size={20} color={theme.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filters */}
      <View style={[styles.filtersContainer, { backgroundColor: theme.card }]}>
        <Text style={[styles.filterLabel, { color: theme.textSecondary }]}>Status:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          {STATUS_FILTERS.map((filter) =>
            renderFilterChip(filter, selectedStatus === filter.value, () => setSelectedStatus(filter.value))
          )}
        </ScrollView>
        <Text style={[styles.filterLabel, { color: theme.textSecondary, marginTop: 8 }]}>Priority:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          {PRIORITY_FILTERS.map((filter) =>
            renderFilterChip(filter, selectedPriority === filter.value, () => setSelectedPriority(filter.value))
          )}
        </ScrollView>
      </View>

      {/* Issues List */}
      <FlatList
        data={issues}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => <IssueCard issue={item} onPress={() => handleIssuePress(item)} />}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <EmptyState
            icon="document-text-outline"
            title="No issues found"
            message="There are no issues matching your criteria."
          />
        }
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  placeholder: {
    width: 32,
  },
  searchContainer: {
    padding: 16,
  },
  searchInput: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 8,
  },
  searchTextInput: {
    flex: 1,
    fontSize: 16,
  },
  filtersContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 6,
  },
  filterScroll: {
    flexGrow: 0,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '500',
  },
  listContent: {
    padding: 16,
    paddingTop: 8,
  },
});
```

## C:\Users\head user\Desktop\Hamthan\v3\AI-Operation-Kaizen\FullStack\frontend\app\(main)\(tabs)\dashboard\not-fixed-detail.js

```javascript
import React, { useEffect, useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Alert,
  Platform,
  RefreshControl,
  Image,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker'; 
import * as Location from 'expo-location'; // 📍 IMPORTED LOCATION DIRECTLY

import { useTheme } from '../../../../src/theme/ThemeContext';
import { selectCurrentUser } from '../../../../src/store/slices/authSlice';
import { 
  fetchIssueById, 
  fetchIssueTimeline,
  selectIssueById,
  selectCurrentIssue,
  selectIssueTimeline,
  selectIssuesLoading, 
  clearCurrentIssue 
} from '../../../../src/store/slices/issuesSlice';
import { calculateOverdueDays } from '../../../../src/utils/overdue';
import StatusBadge from '../../../../src/components/common/StatusBadge';
import Button from '../../../../src/components/common/Button';
import IssueTimeline from '../../../../src/components/issue/IssueTimeline';
import ImageGallery from '../../../../src/components/issue/ImageGallery';
import Loader from '../../../../src/components/common/Loader';

import { selectIsOnline } from '../../../../src/store/slices/offlineSlice';
import Toast from '../../../../src/components/common/Toast';
import FullScreenSpinner from '../../../../src/components/common/FullScreenSpinner';
import Avatar from '../../../../src/components/common/Avatar';
import { formatDate } from '../../../../src/utils/formatters';

export default function NotFixedDetailScreen() {
  const { theme, isDark } = useTheme(); 
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const dispatch = useDispatch();
  const user = useSelector(selectCurrentUser);
  
  const cachedIssue = useSelector((state) => selectIssueById(state, parseInt(id)));
  const fullIssue = useSelector(selectCurrentIssue);
  const timeline = useSelector(selectIssueTimeline) || [];
  const loading = useSelector(selectIssuesLoading);
  const isOnline = useSelector(selectIsOnline);

  const [refreshing, setRefreshing] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  
  const [selectedImage, setSelectedImage] = useState(null);
  
  const [isCapturingLocation, setIsCapturingLocation] = useState(false);
  const [capturedLocation, setCapturedLocation] = useState(null);

  const issue = (fullIssue && fullIssue.id === parseInt(id)) ? fullIssue : cachedIssue;

  useEffect(() => {
    if (id) {
      dispatch(fetchIssueById(parseInt(id)));
      dispatch(fetchIssueTimeline(parseInt(id)));
    }
    return () => { dispatch(clearCurrentIssue()); };
  }, [id, dispatch]);

  const onRefresh = useCallback(async () => {
    if (!isOnline) {
      setToastMessage("Can't refresh while offline");
      setTimeout(() => setToastMessage(''), 3000);
      return;
    }
    if (!id) return;
    
    setRefreshing(true);
    try {
      await Promise.allSettled([
        dispatch(fetchIssueById(parseInt(id))),
        dispatch(fetchIssueTimeline(parseInt(id)))
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [id, isOnline, dispatch]);

  const handleTakePhoto = async () => {
    console.log("\n[DEBUG] --- STARTING PHOTO CAPTURE FLOW ---");
    console.log(`[DEBUG] Current Platform: ${Platform.OS}`);
    
    setIsCapturingLocation(true); 

    try {
      console.log("[DEBUG] Requesting location data before opening camera...");
      
      // 📍 INLINE LOCATION LOGIC (Bypasses the buggy location.js import)
      let loc = null;
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const locationPromise = Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
          const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 10000));
          
          // Race between getting the location and the 10-second timeout
          const position = await Promise.race([locationPromise, timeoutPromise]);
          loc = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          };
        } else {
          console.log("[DEBUG] Location permission denied by user.");
        }
      } catch (err) {
        console.log("[DEBUG] Location fetch error:", err.message);
      }

      if (loc) {
        console.log(`[DEBUG] Location captured successfully: Lat ${loc.latitude}, Lon ${loc.longitude}`);
        setCapturedLocation(loc);
      } else {
        console.log("[DEBUG] Location capture failed or timed out.");
        if (Platform.OS !== 'web') {
          Alert.alert("Location Required", "We need your location to verify the fix.");
          return; 
        }
        console.log("[DEBUG] Proceeding without location due to web fallback.");
      }

      let result;

      if (Platform.OS === 'web') {
        console.log("[DEBUG] Web browser detected. Triggering File Picker.");
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [4, 3],
          quality: 0.8,
        });
      } else {
        console.log("[DEBUG] Native device detected. Requesting Camera Permissions.");
        const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
        
        if (permissionResult.granted === false) {
          console.log("[DEBUG] User denied camera permissions.");
          Alert.alert("Permission Required", "You need to allow camera access to take a fix photo.");
          return;
        }

        console.log("[DEBUG] Permissions granted. Launching Native Camera.");
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [4, 3],
          quality: 0.8,
        });
      }

      console.log("[DEBUG] Raw ImagePicker Result:", result);

      if (!result.canceled && result.assets && result.assets.length > 0) {
        console.log(`[DEBUG] SUCCESS! Image selected. URI: ${result.assets[0].uri}`);
        setSelectedImage(result.assets[0].uri);
      } else {
        console.log("[DEBUG] Action was canceled by the user (no image selected).");
        setCapturedLocation(null); 
      }
    } catch (error) {
      console.error("[DEBUG] EXCEPTION caught during photo capture:", error);
      if (Platform.OS === 'web') {
        alert("Error opening file picker on the browser.");
      } else {
        Alert.alert("Error", "Could not access the camera.");
      }
      setCapturedLocation(null);
    } finally {
      setIsCapturingLocation(false); 
    }
  };

  const handleSubmitPhoto = () => {
    console.log("\n=============================================");
    console.log("📸 UPLOADING FIX PHOTO TO BACKEND");
    console.log("=============================================");
    console.log(`Issue ID:      ${issue.id}`);
    console.log(`Issue Title:   ${issue.title}`);
    console.log(`Solver ID:     ${user?.id}`);
    console.log(`Solver Name:   ${user?.name}`);
    console.log(`Photo URI:     ${selectedImage}`);
    console.log(`Location:      ${capturedLocation ? `Lat: ${capturedLocation.latitude}, Lon: ${capturedLocation.longitude}` : 'Not Captured'}`);
    console.log("=============================================\n");

    setSelectedImage(null);
    setCapturedLocation(null);
    
    if (Platform.OS === 'web') {
      alert("Sent Successfully! Your fix photo has been uploaded and sent for review.");
    } else {
      Alert.alert(
        "Sent Successfully!", 
        "Your fix photo has been uploaded and sent for review.",
        [{ text: "OK" }]
      );
    }
  };

  const overdueDays = issue ? calculateOverdueDays(issue.deadline_at, issue.status) : null;

  if (loading && !refreshing && !issue) return <Loader message="Loading issue details..." />;
  if (!issue) return <Loader message="Loading issue details..." />;

  const siteName = issue.site_name || issue.site?.name || 'N/A';
  const siteLocation = issue.site_location || issue.site?.location || null;
  const raisedByName = issue.supervisor_name || 'N/A';
  
  const currentAssignment = issue.assignments && issue.assignments.length > 0 
    ? issue.assignments[0] 
    : null;
    
  const solverName = currentAssignment?.solver_name || null;

  const bgColor = isDark ? '#212121' : '#f9f9f9';
  const surfaceColor = isDark ? '#171717' : '#ffffff';
  const borderColor = isDark ? '#333333' : '#e5e5e5';
  const iconBg = isDark ? 'rgba(255,255,255,0.05)' : '#f4f4f4';
  const pendingAccent = '#f59e0b';
  const successAccent = '#10a37f'; 
  
  const warningBg = isDark ? 'rgba(239, 68, 68, 0.1)' : '#fef2f2';
  const warningBorder = isDark ? 'rgba(239, 68, 68, 0.2)' : '#fee2e2';

  return (
    <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: bgColor }]}>
      
      <View style={[styles.header, { backgroundColor: bgColor, borderBottomColor: borderColor }]}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.6} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.textSecondary }]}>Pending Issue</Text>
        
        <View style={styles.headerRight}>
          {Platform.OS === 'web' ? (
            <TouchableOpacity onPress={onRefresh} disabled={refreshing} style={styles.webRefreshButton}>
              <Ionicons name="sync" size={22} color={refreshing ? pendingAccent : theme.textSecondary} />
            </TouchableOpacity>
          ) : (
            <View style={styles.placeholder} />
          )}
        </View>
      </View>

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          Platform.OS === 'web' ? undefined : (
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.textSecondary} />
          )
        }
      >
        
        {overdueDays > 0 && (
          <View style={[styles.warningBanner, { backgroundColor: warningBg, borderColor: warningBorder }]}>
            <View style={styles.warningIconWrapper}>
              <Ionicons name="warning-outline" size={18} color="#ef4444" />
            </View>
            <View style={styles.warningContent}>
              <Text style={styles.warningTitle}>Action Required</Text>
              <Text style={styles.warningText}>
                This issue is overdue by {overdueDays} day{overdueDays > 1 ? 's' : ''}.
              </Text>
            </View>
          </View>
        )}

        <View style={[styles.card, styles.flatCard, { backgroundColor: surfaceColor, borderColor }]}>
          <View style={styles.idRow}>
            <Text style={[styles.issueId, { color: theme.textSecondary }]}>ISSUE #{issue.id}</Text>
            <View style={styles.statusRow}>
              <StatusBadge status={issue.status} size="small" />
              <StatusBadge status={issue.priority} type="priority" size="small" />
            </View>
          </View>
          
          <Text style={[styles.title, { color: theme.text }]}>{issue.title}</Text>
          <Text style={[styles.description, { color: theme.textSecondary }]}>{issue.description}</Text>
        </View>

        <View style={[styles.card, styles.flatCard, { backgroundColor: surfaceColor, borderColor }]}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Details</Text>
          
          <View style={styles.infoRow}>
            <View style={[styles.iconWrapper, { backgroundColor: iconBg }]}>
              <Ionicons name="location-outline" size={18} color={theme.textSecondary} />
            </View>
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Site</Text>
              <Text style={[styles.infoValue, { color: theme.text }]}>{siteName}</Text>
            </View>
          </View>

          {siteLocation && (
            <View style={[styles.infoRow, { marginTop: 16 }]}>
              <View style={[styles.iconWrapper, { backgroundColor: iconBg }]}>
                <Ionicons name="map-outline" size={18} color={theme.textSecondary} />
              </View>
              <View style={styles.infoContent}>
                <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Address</Text>
                <Text style={[styles.infoValue, { color: theme.text }]}>{siteLocation}</Text>
              </View>
            </View>
          )}

          {issue.deadline_at && (
            <View style={[styles.infoRow, { marginTop: 16 }]}>
              <View style={[styles.iconWrapper, { backgroundColor: iconBg }]}>
                <Ionicons name="calendar-outline" size={18} color={theme.textSecondary} />
              </View>
              <View style={styles.infoContent}>
                <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Deadline</Text>
                <Text style={[styles.infoValue, { color: theme.text }]}>{formatDate(issue.deadline_at)}</Text>
              </View>
            </View>
          )}
        </View>

        <View style={[styles.card, styles.flatCard, { backgroundColor: surfaceColor, borderColor }]}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>People Involved</Text>
          <View style={styles.peopleGrid}>
            <View style={[styles.personRow, solverName && { borderBottomColor: borderColor, borderBottomWidth: StyleSheet.hairlineWidth }]}>
              <Avatar name={raisedByName} size="medium" />
              <View style={styles.personInfo}>
                <Text style={[styles.personName, { color: theme.text }]} numberOfLines={1}>
                  {raisedByName}
                </Text>
                <Text style={[styles.personRole, { color: theme.textSecondary }]}>Raised By</Text>
              </View>
            </View>
            
            {solverName && (
              <View style={[styles.personRow, { paddingTop: 12, paddingBottom: 0 }]}>
                <Avatar name={solverName} size="medium" />
                <View style={styles.personInfo}>
                  <Text style={[styles.personName, { color: theme.text }]} numberOfLines={1}>
                    {solverName}
                  </Text>
                  <Text style={[styles.personRole, { color: theme.textSecondary }]}>Assigned To</Text>
                </View>
                {currentAssignment?.solver_phone && (
                   <Text style={[styles.personRole, { color: theme.textSecondary, marginTop: 4 }]}>
                     {currentAssignment.solver_phone}
                   </Text>
                )}
              </View>
            )}
          </View>
        </View>

        {issue.images && issue.images.length > 0 && (
          <View style={[styles.card, styles.flatCard, { backgroundColor: surfaceColor, borderColor }]}>
            <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Attached Media</Text>
            <ImageGallery images={issue.images} />
          </View>
        )}

        <View style={styles.actions}>
          
          {user?.role === 'supervisor' && (
            <Button 
              title="Raise Complaint" 
              variant="danger" 
              icon="alert-circle-outline" 
              onPress={() => Alert.alert('Coming Soon', 'Phase 2-3')} 
            />
          )}

          {(user?.role === 'problemsolver' || user?.role === 'problem_solver') && issue?.status === 'IN_PROGRESS' && (
            <View style={styles.solverActionContainer}>
              {!selectedImage ? (
                <TouchableOpacity
                  activeOpacity={0.8}
                  style={[styles.primaryActionBtn, { backgroundColor: successAccent, opacity: isCapturingLocation ? 0.7 : 1 }]}
                  onPress={handleTakePhoto}
                  disabled={isCapturingLocation}
                >
                  <View style={styles.primaryActionBtnInner}>
                    {isCapturingLocation ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Ionicons name="camera" size={24} color="#fff" />
                    )}
                    <Text style={styles.primaryActionBtnText}>
                      {isCapturingLocation ? "Getting Location..." : "Take Fix Photo"}
                    </Text>
                  </View>
                </TouchableOpacity>
              ) : (
                <View style={[styles.previewContainer, { backgroundColor: surfaceColor, borderColor }]}>
                  <View style={styles.previewHeader}>
                    <Ionicons name="image-outline" size={20} color={theme.text} />
                    <Text style={[styles.previewTitle, { color: theme.text }]}>Photo Ready</Text>
                  </View>
                  
                  <Image source={{ uri: selectedImage }} style={[styles.previewImage, { borderColor }]} />
                  
                  <Text style={[styles.previewSubtext, { color: theme.textSecondary }]}>
                    Does this photo clearly show the resolved issue?
                  </Text>

                  <View style={styles.previewActions}>
                    <TouchableOpacity 
                      style={[styles.previewBtn, { backgroundColor: iconBg, borderColor, borderWidth: 1 }]} 
                      onPress={() => {
                        setSelectedImage(null);
                        setCapturedLocation(null);
                      }}
                    >
                      <Text style={[styles.previewBtnText, { color: theme.text }]}>Retake</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={[styles.previewBtn, { backgroundColor: successAccent, flex: 2 }]} 
                      onPress={handleSubmitPhoto}
                    >
                      <Ionicons name="send" size={18} color="#fff" style={{ marginRight: 6 }} />
                      <Text style={[styles.previewBtnText, { color: '#fff' }]}>Send Photo</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          )}
        </View>
        
        <View style={styles.bottomPadding} />
      </ScrollView>

      <FullScreenSpinner visible={refreshing} message="Updating Details..." color={pendingAccent} />

      {toastMessage !== '' && <Toast message={toastMessage} />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: 16, 
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backButton: { padding: 4, marginLeft: -4 },
  headerTitle: { fontSize: 14, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  headerRight: { width: 32, alignItems: 'flex-end' },
  placeholder: { width: 32 },
  webRefreshButton: { padding: 4 },
  
  warningBanner: { 
    flexDirection: 'row', 
    alignItems: 'flex-start', 
    marginHorizontal: 16, 
    marginTop: 16,
    padding: 16, 
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  warningIconWrapper: {
    backgroundColor: '#ffffff',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 2 },
      android: { elevation: 2 },
    }),
  },
  warningContent: { flex: 1 },
  warningTitle: { color: '#ef4444', fontWeight: '700', fontSize: 14, letterSpacing: -0.2, marginBottom: 2 },
  warningText: { color: '#ef4444', fontSize: 13, lineHeight: 18 },

  content: { flex: 1 },
  
  card: { 
    marginHorizontal: 16, 
    marginTop: 16, 
    padding: 20 
  },
  flatCard: {
    borderRadius: 16,
    borderWidth: 1,
    ...Platform.select({
      ios: { shadowOpacity: 0 },
      android: { elevation: 0 },
    }),
  },

  idRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  issueId: { fontSize: 13, fontWeight: '700', letterSpacing: 0.5 },
  statusRow: { flexDirection: 'row', gap: 6 },
  
  title: { fontSize: 22, fontWeight: '700', letterSpacing: -0.5, marginBottom: 8, lineHeight: 28 },
  description: { fontSize: 15, lineHeight: 24, letterSpacing: -0.1 },
  
  sectionTitle: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 16 },
  
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  iconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 10, 
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoContent: { flex: 1, justifyContent: 'center' },
  infoLabel: { fontSize: 12, fontWeight: '500', marginBottom: 2 },
  infoValue: { fontSize: 15, fontWeight: '600', letterSpacing: -0.2 },

  peopleGrid: { flexDirection: 'column' },
  personRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 12, 
    paddingBottom: 12 
  },
  personInfo: { flex: 1, justifyContent: 'center' },
  personName: { fontSize: 15, fontWeight: '600', letterSpacing: -0.2, marginBottom: 2 },
  personRole: { fontSize: 13 },
  
  actions: { marginHorizontal: 16, marginTop: 32 },
  
  solverActionContainer: { width: '100%' },
  primaryActionBtn: {
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 20,
    ...Platform.select({
      ios: { shadowColor: '#10a37f', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 12 },
      android: { elevation: 4 },
    }),
  },
  primaryActionBtnInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  primaryActionBtnText: { color: '#fff', fontSize: 17, fontWeight: '700', letterSpacing: -0.2 },
  
  previewContainer: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    alignItems: 'center',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 8 },
      android: { elevation: 2 },
    }),
  },
  previewHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16, alignSelf: 'flex-start' },
  previewTitle: { fontSize: 16, fontWeight: '700', letterSpacing: -0.2 },
  previewImage: {
    width: '100%',
    height: 220,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 12,
  },
  previewSubtext: { fontSize: 13, textAlign: 'center', marginBottom: 16 },
  previewActions: { flexDirection: 'row', gap: 12, width: '100%' },
  previewBtn: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 14,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewBtnText: { fontSize: 15, fontWeight: '700', letterSpacing: -0.2 },

  bottomPadding: { height: 40 },
});
```

## C:\Users\head user\Desktop\Hamthan\v3\AI-Operation-Kaizen\FullStack\frontend\app\(main)\(tabs)\dashboard\not-fixed.js

```javascript
import React, { useEffect, useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TextInput, 
  TouchableOpacity, 
  RefreshControl,
  Platform 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../../src/theme/ThemeContext';
import { selectCurrentUser } from '../../../../src/store/slices/authSlice';
import { fetchIssues, selectNotFixedIssues, selectIssuesLoading, setFilters } from '../../../../src/store/slices/issuesSlice';
import { selectIsOnline } from '../../../../src/store/slices/offlineSlice';
import IssueCard from '../../../../src/components/issue/IssueCard';
import Loader from '../../../../src/components/common/Loader';
import EmptyState from '../../../../src/components/common/EmptyState';
import Toast from '../../../../src/components/common/Toast';

// ── ADDED REUSABLE SPINNER ──
import FullScreenSpinner from '../../../../src/components/common/FullScreenSpinner';

export default function NotFixedIssuesScreen() {
  const { theme, isDark } = useTheme(); 
  const router = useRouter();
  const dispatch = useDispatch();
  
  const user = useSelector(selectCurrentUser);
  const issues = useSelector(selectNotFixedIssues);
  const loading = useSelector(selectIssuesLoading);
  const isOnline = useSelector(selectIsOnline);
  
  const [searchText, setSearchText] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => {
    if (user) {
      dispatch(fetchIssues(user));
    }
  }, [user]);

  useEffect(() => {
    dispatch(setFilters({ search: searchText }));
  }, [searchText]);

  const onRefresh = useCallback(async () => {
    if (!isOnline) {
      setToastMessage("Can't refresh while offline");
      setTimeout(() => setToastMessage(''), 3000);
      return;
    }

    const now = Date.now();
    if (lastRefresh && now - lastRefresh < 5000) {
      setToastMessage('Just refreshed. Wait a moment.');
      setTimeout(() => setToastMessage(''), 3000);
      return;
    }

    setRefreshing(true);
    if (user) {
      try {
        // 📍 FIX: Promise.allSettled guarantees the spinner spins until totally done
        await Promise.allSettled([
          dispatch(fetchIssues(user))
        ]);
      } finally {
        setLastRefresh(Date.now());
        setRefreshing(false);
      }
    } else {
      setRefreshing(false);
    }
  }, [user, isOnline, lastRefresh, dispatch]);

  const handleIssuePress = (issue) => {
    router.push({ pathname: '/(main)/(tabs)/dashboard/not-fixed-detail', params: { id: issue.id } });
  };

  // 📍 FIX: Added Local Filtering Logic
  const filteredIssues = issues.filter((issue) => {
    if (!searchText) return true;
    const lowerSearch = searchText.toLowerCase();
    return (
      issue.title?.toLowerCase().includes(lowerSearch) ||
      issue.description?.toLowerCase().includes(lowerSearch) ||
      issue.site_name?.toLowerCase().includes(lowerSearch) ||
      issue.id?.toString().includes(lowerSearch)
    );
  });

  // 📍 FIX: Added `&& !refreshing` to prevent Loader hijacking
  if (loading && issues.length === 0 && !refreshing) {
    return <Loader message="Loading issues..." />;
  }

  // ── PREMIUM MONOCHROME PALETTE ──
  const bgColor = isDark ? '#212121' : '#f9f9f9';
  const borderColor = isDark ? '#333333' : '#e5e5e5';
  const inactiveBg = isDark ? 'rgba(255,255,255,0.06)' : '#f4f4f4';
  const pendingAccent = '#f59e0b'; // Premium Amber instead of harsh orange

  return (
    <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: bgColor }]}>
      
      {/* ── HEADER ── */}
      <View style={[styles.header, { backgroundColor: bgColor, borderBottomColor: borderColor }]}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.6} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.textSecondary }]}>Pending Issues</Text>
        
        {/* 📍 FIX: Added Web-only Refresh Button to Header */}
        <View style={styles.headerRight}>
          {Platform.OS === 'web' ? (
            <TouchableOpacity onPress={onRefresh} disabled={refreshing} style={styles.webRefreshButton}>
              <Ionicons name="sync" size={22} color={refreshing ? pendingAccent : theme.textSecondary} />
            </TouchableOpacity>
          ) : (
            <View style={styles.placeholder} />
          )}
        </View>
      </View>

      {/* ── SEARCH BAR ── */}
      <View style={[styles.searchContainer, { backgroundColor: bgColor }]}>
        <View style={[styles.searchInput, { backgroundColor: inactiveBg, borderColor }]}>
          <Ionicons name="search" size={18} color={theme.textSecondary} />
          <TextInput
            style={[styles.searchTextInput, { color: theme.text }]}
            placeholder="Search pending issues..."
            placeholderTextColor={theme.textSecondary}
            value={searchText}
            onChangeText={setSearchText}
          />
          {searchText !== '' && (
            <TouchableOpacity onPress={() => setSearchText('')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close-circle" size={18} color={theme.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── RESULTS COUNT ── */}
      <View style={styles.resultsHeader}>
        {/* 📍 FIX: Output length of filtered array, not raw array */}
        <Text style={[styles.resultsCount, { color: theme.textSecondary }]}>
          {filteredIssues.length} issue{filteredIssues.length !== 1 ? 's' : ''} found
        </Text>
      </View>

      {/* ── LIST ── */}
      <FlatList
        data={filteredIssues} // 📍 FIX: Replaced `issues` with `filteredIssues`
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => <IssueCard issue={item} onPress={() => handleIssuePress(item)} />}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <EmptyState 
            icon="checkmark-circle-outline" 
            title={searchText ? "No matches found" : "All Clear!"} 
            message={searchText ? `No issues matching "${searchText}"` : "No pending issues at the moment."} 
          />
        }
        showsVerticalScrollIndicator={false}
        // 📍 FIX: Disables double spinner on web
        refreshControl={
          Platform.OS === 'web' ? undefined : (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[pendingAccent]}
              tintColor={pendingAccent}
            />
          )
        }
      />

      {/* ── NEW CLEAN IMPLEMENTATION ── */}
      <FullScreenSpinner visible={refreshing} message="Updating Pending Issues..." color={pendingAccent} />

      {toastMessage !== '' && <Toast message={toastMessage} />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: 16, 
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backButton: { padding: 4, marginLeft: -4 },
  headerTitle: { fontSize: 14, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  headerRight: { width: 32, alignItems: 'flex-end' },
  placeholder: { width: 32 },
  webRefreshButton: { padding: 4 },
  
  searchContainer: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12 },
  searchInput: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 14, 
    height: 44, // Matched globally with all other screens
    borderRadius: 12, 
    borderWidth: 1,
    gap: 8 
  },
  searchTextInput: { flex: 1, fontSize: 15 },
  
  resultsHeader: { paddingHorizontal: 20, paddingBottom: 12 },
  resultsCount: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8 },
  
  listContent: { paddingHorizontal: 16, paddingBottom: 24 },
});
```

## C:\Users\head user\Desktop\Hamthan\v3\AI-Operation-Kaizen\FullStack\frontend\app\(main)\(tabs)\dashboard\site-detail.js

```javascript
import React, { useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Platform,
  RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSelector, useDispatch } from 'react-redux';
import { PieChart } from 'react-native-chart-kit';
import Ionicons from '@expo/vector-icons/Ionicons';

import { useTheme } from '../../../../src/theme/ThemeContext';
import { selectSiteById, fetchSitesWithAnalytics, selectSitesLoading } from '../../../../src/store/slices/sitesSlice';
import StatusBadge from '../../../../src/components/common/StatusBadge';
import Avatar from '../../../../src/components/common/Avatar';
import EmptyState from '../../../../src/components/common/EmptyState';
import Loader from '../../../../src/components/common/Loader';

// ── ADDED REUSABLE IMPORTS ──
import { selectIsOnline } from '../../../../src/store/slices/offlineSlice';
import Toast from '../../../../src/components/common/Toast';
import FullScreenSpinner from '../../../../src/components/common/FullScreenSpinner';

const SCREEN_WIDTH = Dimensions.get('window').width;

export default function SiteDetailScreen() {
  const { theme, isDark } = useTheme();
  const router = useRouter();
  const dispatch = useDispatch();
  const params = useLocalSearchParams();
  const id = parseInt(params.id, 10);

  const site = useSelector(state => selectSiteById(state, id));
  const loading = useSelector(selectSitesLoading);
  const isOnline = useSelector(selectIsOnline);

  const [refreshing, setRefreshing] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const onRefresh = useCallback(async () => {
    if (!isOnline) {
      setToastMessage("Can't refresh while offline");
      setTimeout(() => setToastMessage(''), 3000);
      return;
    }
    
    setRefreshing(true);
    try {
      // 📍 FIX: Promise.allSettled guarantees the spinner spins until totally done
      await Promise.allSettled([
        dispatch(fetchSitesWithAnalytics())
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [isOnline, dispatch]);

  const bgColor = isDark ? '#212121' : '#f9f9f9';
  const surfaceColor = isDark ? '#171717' : '#ffffff';
  const borderColor = isDark ? '#333333' : '#e5e5e5';

  const getHealthColor = health => {
    switch (health) {
      case 'Healthy': return '#10a37f';
      case 'Needs Attention': return '#f59e0b';
      case 'Critical': return '#ef4444';
      default: return theme.textSecondary;
    }
  };

  const chartData = useMemo(() => {
    if (!site?.analytics) return null;
    const a = site.analytics;
    const entries = [
      { label: 'Open', value: a.open_issues || 0, color: '#3b82f6' },
      { label: 'Assigned', value: a.assigned_issues || 0, color: '#8b5cf6' },
      { label: 'In Progress', value: a.in_progress_issues || 0, color: '#f59e0b' },
      { label: 'Completed', value: a.completed_issues || 0, color: '#10a37f' },
      { label: 'Reopened', value: a.reopened_issues || 0, color: '#ef4444' },
    ].filter(e => e.value > 0);

    if (entries.length === 0) return null;

    return entries.map(e => ({
      name: e.label,
      population: e.value,
      color: e.color,
      legendFontColor: theme.text,
      legendFontSize: 12,
    }));
  }, [site, theme.text]);

  // 📍 FIX: Added `!refreshing` to prevent Loader hijacking
  if (loading && !refreshing && !site) return <Loader message="Loading site details..." />;

  if (!site) {
    return (
      <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: bgColor }]}>
        <View style={styles.header}>
           <TouchableOpacity onPress={() => router.back()}><Ionicons name="chevron-back" size={24} color={theme.text} /></TouchableOpacity>
        </View>
        <EmptyState icon="business-outline" title="Site not found" message="The requested site data is unavailable." />
      </SafeAreaView>
    );
  }

  const analytics = site.analytics || {};
  const score = analytics.score ?? 100;

  return (
    <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: bgColor }]}>

      {/* ── HEADER ── */}
      <View style={[styles.header, { borderBottomColor: borderColor, backgroundColor: bgColor }]}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.6} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.textSecondary }]}>Site Overview</Text>
        
        {/* 📍 FIX: Added Web-only Refresh Button to Header */}
        <View style={styles.headerRight}>
          {Platform.OS === 'web' ? (
            <TouchableOpacity onPress={onRefresh} disabled={refreshing} style={styles.webRefreshButton}>
              <Ionicons name="sync" size={22} color={refreshing ? theme.primary : theme.textSecondary} />
            </TouchableOpacity>
          ) : (
            <View style={styles.placeholder} />
          )}
        </View>
      </View>

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        // 📍 FIX: Disables double spinner on web
        refreshControl={
          Platform.OS === 'web' ? undefined : (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.textSecondary}
            />
          )
        }
      >

        {/* ── SITE OVERVIEW & SCORE ── */}
        <View style={[styles.card, { backgroundColor: surfaceColor, borderColor }]}>
          <View style={styles.titleRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.siteName, { color: theme.text }]}>{site.name}</Text>
              <Text style={[styles.siteLocation, { color: theme.textSecondary }]}>{site.location}</Text>
            </View>
            <View style={[styles.healthBadge, { borderColor: getHealthColor(analytics.health), backgroundColor: getHealthColor(analytics.health) + '15' }]}>
              <Text style={[styles.healthText, { color: getHealthColor(analytics.health) }]}>
                {analytics.health || 'Unknown'}
              </Text>
            </View>
          </View>

          <View style={styles.scoreRow}>
            <View style={styles.scoreBox}>
              <Text style={[styles.scoreValue, { color: getHealthColor(analytics.health) }]}>{score}</Text>
              <Text style={[styles.scoreLabel, { color: theme.textSecondary }]}>Site Score</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.scoreBox}>
              <Text style={[styles.scoreValue, { color: theme.text }]}>{analytics.total_issues || 0}</Text>
              <Text style={[styles.scoreLabel, { color: theme.textSecondary }]}>Total Issues</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.scoreBox}>
              <Text style={[styles.scoreValue, { color: (analytics.overdue_count || 0) > 0 ? '#ef4444' : theme.text }]}>
                {analytics.overdue_count || 0}
              </Text>
              <Text style={[styles.scoreLabel, { color: theme.textSecondary }]}>Overdue</Text>
            </View>
          </View>
        </View>

        {/* ── ISSUES CHART ── */}
        <View style={[styles.card, { backgroundColor: surfaceColor, borderColor }]}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Issue Distribution</Text>
          {chartData ? (
            <View style={styles.chartContainer}>
              <PieChart
                data={chartData}
                width={SCREEN_WIDTH - 64}
                height={200}
                chartConfig={{ color: () => theme.text }}
                accessor="population"
                backgroundColor="transparent"
                paddingLeft="15"
                absolute
              />
            </View>
          ) : (
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No issues recorded for this site yet.</Text>
          )}
        </View>

        {/* ── ASSIGNED SOLVERS ── */}
        {analytics.solvers && analytics.solvers.length > 0 && (
          <View style={[styles.card, { backgroundColor: surfaceColor, borderColor }]}>
            <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Assigned Solvers</Text>
            <View style={styles.solverList}>
              {analytics.solvers.map(solver => (
                <TouchableOpacity
                  key={solver.id}
                  style={[styles.solverChip, { backgroundColor: isDark ? '#2a2a2a' : '#f0f0f0' }]}
                  activeOpacity={0.7}
                  onPress={() => router.push({
                    pathname: '/(main)/(tabs)/dashboard/solver-profile',
                    params: { id: solver.id }
                  })}
                >
                  <Avatar name={solver.name} size="small" />
                  <Text style={[styles.solverName, { color: theme.text }]} numberOfLines={1}>
                    {solver.name.split(' ')[0]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* ── RECENT COMPLAINTS PLACEHOLDER ── */}
        <View style={[styles.card, { backgroundColor: surfaceColor, borderColor }]}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Recent Complaints</Text>
          {(analytics.complaints_count || 0) > 0 ? (
             <View style={styles.placeholderBox}>
                <Ionicons name="information-circle-outline" size={20} color={theme.textSecondary} />
                <Text style={{color: theme.textSecondary, marginLeft: 8}}>Complaint details are loaded in the Complaints screen.</Text>
             </View>
          ) : (
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No complaints reported for this site.</Text>
          )}
        </View>

        {/* ── RECENT ISSUES PLACEHOLDER ── */}
        <View style={[styles.card, { backgroundColor: surfaceColor, borderColor }]}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Recent Issues</Text>
          {(analytics.total_issues || 0) > 0 ? (
            <TouchableOpacity 
              style={styles.viewAllButton}
              onPress={() => router.push({ pathname: '/(main)/(tabs)/issues', params: { site_id: id } })}
            >
              <Text style={{color: '#3b82f6', fontWeight: '600'}}>View all issues for this site →</Text>
            </TouchableOpacity>
          ) : (
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No recent activity reported.</Text>
          )}
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* ── NEW CLEAN IMPLEMENTATION ── */}
      <FullScreenSpinner visible={refreshing} message="Updating Site Data..." color={theme.primary} />

      {toastMessage !== '' && <Toast message={toastMessage} />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  backButton: { padding: 4, marginLeft: -4 },
  headerTitle: { fontSize: 14, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  headerRight: { width: 32, alignItems: 'flex-end' },
  placeholder: { width: 32 },
  webRefreshButton: { padding: 4 },
  content: { flex: 1 },
  card: { marginHorizontal: 16, marginTop: 16, padding: 20, borderRadius: 16, borderWidth: 1 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  siteName: { fontSize: 20, fontWeight: '700', marginBottom: 4 },
  siteLocation: { fontSize: 14 },
  healthBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, borderWidth: 1 },
  healthText: { fontSize: 12, fontWeight: '700' },
  scoreRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, paddingTop: 16, borderTopWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(0,0,0,0.1)' },
  scoreBox: { alignItems: 'center', flex: 1 },
  scoreValue: { fontSize: 24, fontWeight: '700', marginBottom: 4 },
  scoreLabel: { fontSize: 12, fontWeight: '500' },
  divider: { width: StyleSheet.hairlineWidth, height: 30, backgroundColor: 'rgba(0,0,0,0.1)' },
  sectionTitle: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 16 },
  chartContainer: { alignItems: 'center' },
  solverList: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  solverChip: { flexDirection: 'row', alignItems: 'center', padding: 8, paddingRight: 12, borderRadius: 20, gap: 8 },
  solverName: { fontSize: 13, fontWeight: '600', maxWidth: 80 },
  placeholderBox: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 8, backgroundColor: 'rgba(0,0,0,0.03)' },
  viewAllButton: { padding: 12, alignItems: 'center' },
  emptyText: { fontSize: 13, fontStyle: 'italic' },
  bottomPadding: { height: 40 },
});
```

## C:\Users\head user\Desktop\Hamthan\v3\AI-Operation-Kaizen\FullStack\frontend\app\(main)\(tabs)\dashboard\sites.js

```javascript
import React, { useEffect, useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  RefreshControl,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import Ionicons from '@expo/vector-icons/Ionicons';

import { useTheme } from '../../../../src/theme/ThemeContext';
import { selectCurrentUser } from '../../../../src/store/slices/authSlice';
import {
  fetchSitesWithAnalytics,
  selectAllSites,
  selectSitesLoading,
} from "../../../../src/store/slices/sitesSlice";
import EmptyState from '../../../../src/components/common/EmptyState';
import Avatar from '../../../../src/components/common/Avatar';
import Loader from '../../../../src/components/common/Loader';

// ── ADDED REUSABLE SPINNER ──
import FullScreenSpinner from '../../../../src/components/common/FullScreenSpinner';

export default function SitesScreen() {
  const { theme, isDark } = useTheme();
  const router = useRouter();
  const dispatch = useDispatch();

  const user = useSelector(selectCurrentUser);
  const sites = useSelector(selectAllSites) || [];
  const loading = useSelector(selectSitesLoading);

  const [searchText, setSearchText] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (user) {
      dispatch(fetchSitesWithAnalytics(user));
    }
  }, [dispatch, user]);

  const onRefresh = useCallback(async () => {
    if (!user) return;
    setRefreshing(true);
    
    try {
      // 📍 FIX: Promise.allSettled guarantees the spinner spins until totally done
      await Promise.allSettled([
        dispatch(fetchSitesWithAnalytics(user))
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [dispatch, user]);

  // ── SEARCH LOGIC ──
  const filteredSites = sites.filter(site => {
    if (!searchText) return true;
    const searchLower = searchText.toLowerCase();
    return (
      site.name?.toLowerCase().includes(searchLower) ||
      site.location?.toLowerCase().includes(searchLower)
    );
  });

  // ── PREMIUM PALETTE ──
  const bgColor = isDark ? '#1a1a1a' : '#f4f4f5';
  const surfaceColor = isDark ? '#242424' : '#ffffff';
  const borderColor = isDark ? '#333333' : '#e5e5e5';
  const searchBg = isDark ? '#2a2a2a' : '#eeeeef';
  const metricGridBg = isDark ? 'rgba(255,255,255,0.03)' : '#f9fafb';

  const getHealthColor = health => {
    switch (health) {
      case 'Healthy': return '#10a37f';
      case 'Needs Attention': return '#f59e0b';
      case 'Critical': return '#ef4444';
      default: return theme.textSecondary;
    }
  };

  const renderItem = ({ item }) => {
    const { analytics } = item || {};
    const overdue = analytics?.overdue_count || 0;
    const complaintsCount = analytics?.complaints_count || 0;
    const score = analytics?.score ?? 100; 
    const health = analytics?.health || 'Unknown';
    const openIssues = (analytics?.open_issues || 0) + (analytics?.assigned_issues || 0) + (analytics?.in_progress_issues || 0);

    return (
      <TouchableOpacity
        activeOpacity={0.7}
        style={[styles.card, { backgroundColor: surfaceColor, borderColor }]}
        onPress={() =>
          router.push({
            pathname: '/(main)/(tabs)/dashboard/site-detail',
            params: { id: item.id },
          })
        }
      >
        <View style={styles.cardHeader}>
          <View style={styles.titleContainer}>
            <View style={styles.iconWrapper}>
              <Ionicons name="business-outline" size={20} color={theme.text} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.siteName, { color: theme.text }]} numberOfLines={1}>{item.name}</Text>
              <View style={styles.locationRow}>
                <Ionicons name="location-outline" size={12} color={theme.textSecondary} />
                <Text style={[styles.siteLocation, { color: theme.textSecondary }]} numberOfLines={1}>{item.location}</Text>
              </View>
            </View>
          </View>

          <View style={styles.scoreContainer}>
            <Text style={[styles.scoreText, { color: getHealthColor(health) }]}>{score}%</Text>
            {health !== 'Unknown' && (
              <View style={[styles.healthBadge, { backgroundColor: getHealthColor(health) + '15' }]}>
                <View style={[styles.healthDot, { backgroundColor: getHealthColor(health) }]} />
                <Text style={[styles.healthText, { color: getHealthColor(health) }]}>{health}</Text>
              </View>
            )}
          </View>
        </View>

        {/* ── METRICS DASHBOARD GRID ── */}
        <View style={[styles.metricsContainer, { backgroundColor: metricGridBg, borderColor }]}>
          <View style={styles.metricItem}>
            <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>Active Issues</Text>
            <Text style={[styles.metricValue, { color: theme.text }]}>{openIssues}</Text>
          </View>
          
          <View style={[styles.metricDivider, { backgroundColor: borderColor }]} />
          
          <View style={styles.metricItem}>
            <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>Overdue</Text>
            <Text style={[styles.metricValue, { color: overdue > 0 ? '#ef4444' : theme.text }]}>{overdue}</Text>
          </View>
          
          <View style={[styles.metricDivider, { backgroundColor: borderColor }]} />
          
          <View style={styles.metricItem}>
            <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>Complaints</Text>
            <Text style={[styles.metricValue, { color: complaintsCount > 0 ? '#f97316' : theme.text }]}>{complaintsCount}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // 📍 FIX: Added `&& !refreshing` to prevent Loader hijacking
  if (loading && sites.length === 0 && !refreshing) {
    return <Loader message="Loading sites..." fullScreen />;
  }

  return (
    <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: bgColor }]}>
      
      {/* ── HEADER ── */}
      <View style={[styles.header, { backgroundColor: surfaceColor, borderBottomColor: borderColor }]}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7} style={styles.backButton}>
            <Ionicons name="arrow-back" size={26} color={theme.text} />
          </TouchableOpacity>
          <View>
            <Text style={[styles.headerTitle, { color: theme.text }]}>Sites Hub</Text>
            <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>
              {user?.role === 'manager' ? 'All locations overview' : user?.role === 'supervisor' ? 'Your locations' : 'Assigned locations'}
            </Text>
          </View>
        </View>
        
        {/* 📍 FIX: Added Header Actions Row for Sync + Avatar */}
        <View style={styles.headerActions}>
          {Platform.OS === 'web' && (
            <TouchableOpacity onPress={onRefresh} disabled={refreshing} style={styles.webRefreshButton}>
              <Ionicons name="sync" size={22} color={refreshing ? theme.primary : theme.textSecondary} />
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={() => router.push('/(main)/profile')} activeOpacity={0.7}>
            <Avatar uri={user?.avatar} name={user?.name} size="medium" />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── SEARCH BAR ── */}
      <View style={[styles.searchContainer, { backgroundColor: bgColor }]}>
        <View style={[styles.searchInputWrapper, { backgroundColor: searchBg }]}>
          <Ionicons name="search" size={20} color={theme.textSecondary} style={{ opacity: 0.7 }} />
          <TextInput
            style={[styles.searchTextInput, { color: theme.text }]}
            placeholder="Search sites or locations..."
            placeholderTextColor={theme.textSecondary}
            value={searchText}
            onChangeText={setSearchText}
          />
          {searchText !== '' && (
            <TouchableOpacity onPress={() => setSearchText('')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close-circle" size={18} color={theme.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── RESULTS COUNT ── */}
      {searchText !== '' && (
        <View style={styles.resultsHeader}>
          <Text style={[styles.resultsCount, { color: theme.textSecondary }]}>
            {filteredSites.length} {filteredSites.length === 1 ? 'Site' : 'Sites'} found
          </Text>
        </View>
      )}

      {/* ── LIST ── */}
      {sites.length === 0 && !loading ? (
        <EmptyState icon="business-outline" title="No sites found" message="You don't have any accessible sites yet." />
      ) : filteredSites.length === 0 ? (
        <EmptyState icon="search-outline" title="No matches" message={`No sites found matching "${searchText}"`} />
      ) : (
        <FlatList
          data={filteredSites}
          keyExtractor={item => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          // 📍 FIX: Disables double spinner on web
          refreshControl={
            Platform.OS === 'web' ? undefined : (
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.textSecondary} />
            )
          }
        />
      )}

      {/* ── NEW CLEAN IMPLEMENTATION ── */}
      <FullScreenSpinner visible={refreshing} message="Updating Sites..." />

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: 20, 
    paddingVertical: 16, 
    borderBottomWidth: StyleSheet.hairlineWidth,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 3 },
      android: { elevation: 2 },
    }),
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  backButton: { padding: 4, marginLeft: -4 },
  headerTitle: { fontSize: 24, fontWeight: '800', letterSpacing: -0.5 },
  headerSubtitle: { fontSize: 13, fontWeight: '500', marginTop: 2 },
  webRefreshButton: { padding: 8 },
  
  searchContainer: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  searchInputWrapper: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 14, 
    height: 48, 
    borderRadius: 14, 
    gap: 10 
  },
  searchTextInput: { flex: 1, fontSize: 15, fontWeight: '500' },
  
  resultsHeader: { paddingHorizontal: 20, paddingBottom: 8, paddingTop: 4 },
  resultsCount: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8, opacity: 0.8 },

  listContent: { paddingHorizontal: 16, paddingBottom: 30, paddingTop: 8 },
  
  card: { 
    borderRadius: 20, 
    borderWidth: 1, 
    padding: 16, 
    marginBottom: 14,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 8 },
      android: { elevation: 1 },
    }),
  },
  
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  titleContainer: { flexDirection: 'row', gap: 12, flex: 1, paddingRight: 16 },
  iconWrapper: { width: 40, height: 40, borderRadius: 10, backgroundColor: 'rgba(142,142,160,0.1)', justifyContent: 'center', alignItems: 'center' },
  siteName: { fontSize: 17, fontWeight: '700', letterSpacing: -0.3, marginBottom: 4 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  siteLocation: { fontSize: 13, fontWeight: '500' },
  
  scoreContainer: { alignItems: 'flex-end', gap: 6 },
  scoreText: { fontSize: 20, fontWeight: '800', letterSpacing: -0.5 },
  healthBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, gap: 5 },
  healthDot: { width: 6, height: 6, borderRadius: 3 },
  healthText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5, textTransform: 'uppercase' },
  
  metricsContainer: { 
    flexDirection: 'row', 
    borderRadius: 12, 
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 12,
  },
  metricItem: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  metricDivider: { width: StyleSheet.hairlineWidth, height: '80%', alignSelf: 'center', opacity: 0.5 },
  metricLabel: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  metricValue: { fontSize: 18, fontWeight: '800', letterSpacing: -0.5 },
});
```

## C:\Users\head user\Desktop\Hamthan\v3\AI-Operation-Kaizen\FullStack\frontend\app\(main)\(tabs)\dashboard\solver-profile.js

```javascript
import React, { useMemo, useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSelector, useDispatch } from 'react-redux';
import Ionicons from '@expo/vector-icons/Ionicons';

import { useTheme } from '../../../../src/theme/ThemeContext';
import { selectCurrentUser } from '../../../../src/store/slices/authSlice';
import { selectSolverById, fetchSolversPerformance, selectPerformanceLoading } from '../../../../src/store/slices/performanceSlice';

// 🚨 REMOVED ALL MOCK IMPORTS 🚨
import Avatar from '../../../../src/components/common/Avatar';
import EmptyState from '../../../../src/components/common/EmptyState';
import StatusBadge from '../../../../src/components/common/StatusBadge';
import Loader from '../../../../src/components/common/Loader';

// ── ADDED REUSABLE IMPORTS ──
import { selectIsOnline } from '../../../../src/store/slices/offlineSlice';
import Toast from '../../../../src/components/common/Toast';
import FullScreenSpinner from '../../../../src/components/common/FullScreenSpinner';

export default function SolverProfileScreen() {
  const { theme, isDark } = useTheme();
  const router = useRouter();
  const dispatch = useDispatch();
  const params = useLocalSearchParams();
  const requestedId = params.id ? parseInt(params.id, 10) : null;

  const currentUser = useSelector(selectCurrentUser);
  const loading = useSelector(selectPerformanceLoading);
  const isOnline = useSelector(selectIsOnline);

  const [refreshing, setRefreshing] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Use the correct role name
  const solverId = currentUser?.role === 'problem_solver' || currentUser?.role === 'problemsolver'
    ? currentUser.id
    : requestedId;

  const solver = useSelector(state => solverId ? selectSolverById(state, solverId) : null);

  useEffect(() => {
    if (currentUser && !solver) {
      dispatch(fetchSolversPerformance());
    }
  }, [dispatch, currentUser, solver]);

  const onRefresh = useCallback(async () => {
    if (!isOnline) {
      setToastMessage("Can't refresh while offline");
      setTimeout(() => setToastMessage(''), 3000);
      return;
    }
    
    setRefreshing(true);
    try {
      // 📍 FIX: Promise.allSettled guarantees the spinner spins until totally done
      await Promise.allSettled([
        dispatch(fetchSolversPerformance())
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [isOnline, dispatch]);

  const bgColor = isDark ? '#212121' : '#f9f9f9';
  const surfaceColor = isDark ? '#171717' : '#ffffff';
  const borderColor = isDark ? '#333333' : '#e5e5e5';

  // 📍 FIX: Added `!refreshing` to prevent Loader hijacking
  if (loading && !refreshing && !solver) {
    return <Loader message="Loading profile..." fullScreen />;
  }

  if (!solver) {
    return (
      <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: bgColor }]}>
        <View style={[styles.header, { borderBottomColor: borderColor, backgroundColor: bgColor }]}>
          <TouchableOpacity onPress={() => router.back()} activeOpacity={0.6} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color={theme.text} />
          </TouchableOpacity>
        </View>
        <EmptyState icon="person-outline" title="Solver not found" message="This solver profile is not available." />
      </SafeAreaView>
    );
  }

  // ✅ EXTRACTED REAL SNAKE_CASE PERFORMANCE DATA
  const perf = solver.performance || {};
  
  // Use exact label color from backend if available
  const scoreColor = perf.label_color || (
    (perf.score || 0) >= 75 ? '#10a37f' : (perf.score || 0) >= 50 ? '#f59e0b' : '#ef4444'
  );

  const activeCount = 
    (perf.in_progress_count || 0) + 
    (perf.assigned_not_started_count || 0) + 
    (perf.reopened_count || 0) + 
    (perf.active_count || 0);

  return (
    <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: bgColor }]}>
      <View style={[styles.header, { borderBottomColor: borderColor, backgroundColor: bgColor }]}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.6} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.textSecondary }]}>Solver Profile</Text>
        
        {/* 📍 FIX: Added Web-only Refresh Button to Header */}
        <View style={styles.headerRight}>
          {Platform.OS === 'web' ? (
            <TouchableOpacity onPress={onRefresh} disabled={refreshing} style={styles.webRefreshButton}>
              <Ionicons name="sync" size={22} color={refreshing ? scoreColor : theme.textSecondary} />
            </TouchableOpacity>
          ) : (
            <View style={styles.placeholder} />
          )}
        </View>
      </View>

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        // 📍 FIX: Disables double spinner on web
        refreshControl={
          Platform.OS === 'web' ? undefined : (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.textSecondary}
            />
          )
        }
      >

        {/* IDENTITY */}
        <View style={[styles.card, styles.flatCard, { backgroundColor: surfaceColor, borderColor }]}>
          <View style={styles.profileRow}>
            <Avatar uri={solver.avatar} name={solver.name} size="xlarge" />
            <View style={styles.profileInfo}>
              <Text style={[styles.name, { color: theme.text }]}>{solver.name}</Text>
              <Text style={[styles.role, { color: theme.textSecondary }]}>
                {solver.skills?.length > 0 
                  ? solver.skills.map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(', ') 
                  : 'Problem Solver'}
              </Text>
              <Text style={[styles.phone, { color: theme.textSecondary }]}>{solver.phone || 'No phone added'}</Text>
              {solver.email && (
                <Text style={[styles.phone, { color: theme.textSecondary, marginTop: 2 }]}>{solver.email}</Text>
              )}
            </View>
          </View>
        </View>

        {/* PERFORMANCE SCORE */}
        <View style={[styles.card, styles.flatCard, { backgroundColor: surfaceColor, borderColor }]}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Performance Score</Text>
          <View style={styles.scoreRow}>
            <View style={[styles.scoreCircle, { borderColor: scoreColor }]}>
              <Text style={[styles.scoreValue, { color: scoreColor }]}>{perf.score || 0}</Text>
              <Text style={[styles.scorePercent, { color: scoreColor }]}>%</Text>
            </View>
            <View style={styles.scoreInfo}>
              <Text style={[styles.scoreLabel, { color: theme.text }]}>{perf.label || 'Evaluating'}</Text>
              <Text style={[styles.scoreSub, { color: theme.textSecondary }]}>
                Completion {perf.completion_rate || 0}% · On-time {perf.on_time_rate || 0}% · Calls answered {perf.call_answer_rate || 0}%
              </Text>
            </View>
          </View>
        </View>

        {/* STAT CARDS */}
        <View style={styles.statsRow}>
          {[
           { label: 'Total', value: perf.total_assigned || 0 },
            { label: 'Completed', value: perf.completed_count || 0 },
            { label: 'Active', value: activeCount },
            { label: 'Overdue', value: perf.overdue_count || 0 }, 
          ].map((stat, idx) => (
            <View key={idx} style={[styles.statCard, { backgroundColor: surfaceColor, borderColor }]}>
              <Text style={[styles.statValue, { color: theme.text }]}>{stat.value}</Text>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* RESPONSIVENESS */}
        <View style={[styles.card, styles.flatCard, { backgroundColor: surfaceColor, borderColor }]}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Responsiveness</Text>
          <View style={styles.responsiveRow}>
            <View style={styles.responsiveBox}>
              <Text style={[styles.responsiveLabel, { color: theme.textSecondary }]}>Calls</Text>
              <Text style={[styles.responsiveValue, { color: theme.text }]}>
                {perf.answered_calls || 0} answered · {perf.missed_calls || 0} missed
              </Text>
            </View>
            <View style={styles.responsiveBox}>
              <Text style={[styles.responsiveLabel, { color: theme.textSecondary }]}>Complaints</Text>
              <Text style={[styles.responsiveValue, { color: (perf.complaint_count || 0) > 0 ? '#ef4444' : theme.text }]}>
                {perf.complaint_count || 0}
              </Text>
            </View>
          </View>
        </View>

        {/* SKILLS & SITES (Updated to handle raw arrays from backend) */}
        {(solver.skills?.length > 0 || solver.sites?.length > 0) && (
          <View style={[styles.card, styles.flatCard, { backgroundColor: surfaceColor, borderColor }]}>
            
            {solver.skills?.length > 0 && (
              <>
                <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Trade Skills</Text>
                <View style={[styles.skillChips, { marginBottom: solver.sites?.length > 0 ? 20 : 0 }]}>
                  {solver.skills.map(skill => (
                    <View key={skill} style={[styles.skillChip, { borderColor }]}>
                      <Text style={[styles.skillChipText, { color: theme.textSecondary }]}>
                        {skill.charAt(0).toUpperCase() + skill.slice(1)}
                      </Text>
                    </View>
                  ))}
                </View>
              </>
            )}

            {solver.sites?.length > 0 && (
              <>
                <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Assigned Sites</Text>
                <View style={styles.skillChips}>
                  {solver.sites.map(site => (
                    <View key={site} style={[styles.skillChip, { borderColor }]}>
                      <Text style={[styles.skillChipText, { color: theme.textSecondary }]}>{site}</Text>
                    </View>
                  ))}
                </View>
              </>
            )}
          </View>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* ── NEW CLEAN IMPLEMENTATION ── */}
      <FullScreenSpinner visible={refreshing} message="Updating Profile..." color={scoreColor} />

      {toastMessage !== '' && <Toast message={toastMessage} />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  backButton: { padding: 4, marginLeft: -4 },
  headerTitle: { fontSize: 14, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  headerRight: { width: 32, alignItems: 'flex-end' },
  placeholder: { width: 32 },
  webRefreshButton: { padding: 4 },
  content: { flex: 1 },
  card: { marginHorizontal: 16, marginTop: 16, padding: 20 },
  flatCard: { borderRadius: 16, borderWidth: 1 },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  profileInfo: { flex: 1 },
  name: { fontSize: 22, fontWeight: '700', letterSpacing: -0.5, marginBottom: 4 },
  role: { fontSize: 13, marginBottom: 4 },
  phone: { fontSize: 13 },
  sectionTitle: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 16 },
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  scoreCircle: { width: 80, height: 80, borderRadius: 40, borderWidth: 4, justifyContent: 'center', alignItems: 'center' },
  scoreValue: { fontSize: 28, fontWeight: '700', letterSpacing: -0.5 },
  scorePercent: { fontSize: 13, fontWeight: '700' },
  scoreInfo: { flex: 1 },
  scoreLabel: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  scoreSub: { fontSize: 13, lineHeight: 20 },
  statsRow: { flexDirection: 'row', paddingHorizontal: 16, marginTop: 16, gap: 12 },
  statCard: { flex: 1, padding: 16, borderRadius: 16, borderWidth: 1 },
  statValue: { fontSize: 22, fontWeight: '700', letterSpacing: -0.5, marginBottom: 4 },
  statLabel: { fontSize: 12, fontWeight: '500' },
  responsiveRow: { flexDirection: 'row', gap: 16 },
  responsiveBox: { flex: 1 },
  responsiveLabel: { fontSize: 12, fontWeight: '500', marginBottom: 4 },
  responsiveValue: { fontSize: 14, fontWeight: '600' },
  emptyText: { fontSize: 13 },
  issueRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  issueTitle: { fontSize: 14, fontWeight: '600', marginBottom: 2 },
  issueMeta: { fontSize: 12 },
  skillChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  skillChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: StyleSheet.hairlineWidth },
  skillChipText: { fontSize: 13, fontWeight: '500' },
  bottomPadding: { height: 40 },
});
```

## C:\Users\head user\Desktop\Hamthan\v3\AI-Operation-Kaizen\FullStack\frontend\app\(main)\(tabs)\dashboard\solvers.js

```javascript
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  RefreshControl,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import Ionicons from '@expo/vector-icons/Ionicons';

import { useTheme } from '../../../../src/theme/ThemeContext';
import { selectCurrentUser } from '../../../../src/store/slices/authSlice';
import {
  fetchSolversPerformance,
  selectAllSolvers,
  selectPerformanceLoading,
} from "../../../../src/store/slices/performanceSlice"
import Loader from '../../../../src/components/common/Loader';
import EmptyState from "../../../../src/components/common/EmptyState";
import Avatar from '../../../../src/components/common/Avatar';

// ── ADDED MISSING IMPORTS FOR STANDARD PATTERN ──
import { selectIsOnline } from '../../../../src/store/slices/offlineSlice';
import Toast from '../../../../src/components/common/Toast';
import FullScreenSpinner from '../../../../src/components/common/FullScreenSpinner';

export default function SolversScreen() {
  const { theme, isDark } = useTheme();
  const router = useRouter();
  const dispatch = useDispatch();

  const user = useSelector(selectCurrentUser);
  const solvers = useSelector(selectAllSolvers);
  const loading = useSelector(selectPerformanceLoading);
  const isOnline = useSelector(selectIsOnline); // Added for safety

  const [searchText, setSearchText] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [toastMessage, setToastMessage] = useState(''); // Added for Toast

  useEffect(() => {
    if (user) {
      dispatch(fetchSolversPerformance(user));
    }
  }, [dispatch, user]);

  const onRefresh = useCallback(async () => {
    if (!isOnline) {
      setToastMessage("Can't refresh while offline");
      setTimeout(() => setToastMessage(''), 3000);
      return;
    }
    if (!user) return;
    
    setRefreshing(true);
    try {
      // 📍 FIX: Promise.allSettled guarantees the spinner spins until totally done
      await Promise.allSettled([
        dispatch(fetchSolversPerformance(user))
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [dispatch, user, isOnline]);

  const surfaceColor = isDark ? '#171717' : '#ffffff';
  const borderColor = isDark ? '#333333' : '#e5e5e5';
  const inactiveBg = isDark ? 'rgba(255,255,255,0.06)' : '#f4f4f4';

  const filteredSolvers = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    if (!q) return solvers;
    return solvers.filter(s => {
      const name = s.name?.toLowerCase() || '';
      const role = s.role?.toLowerCase() || '';
      return name.includes(q) || role.includes(q);
    });
  }, [searchText, solvers]);

  const getScoreColor = (score, backendColor) => {
    if (backendColor) return backendColor;
    if (score >= 75) return '#10a37f';
    if (score >= 50) return '#f59e0b';
    return '#ef4444';
  };

  const getLabelIcon = label => {
    if (label === 'Top Performer') return 'trophy-outline';
    if (label === 'Good' || label === 'Average') return 'speedometer-outline';
    return 'alert-circle-outline'; 
  };

  const renderItem = ({ item }) => {
    const perf = item.performance || {};
    const scoreColor = getScoreColor(perf.score, perf.label_color);

    const activeCount =
      (perf.in_progress_count || 0) +
      (perf.assigned_not_started_count || 0) +
      (perf.reopened_count || 0) +
      (perf.active_count || 0); 

    const displaySkills = item.skills?.length > 0 
      ? item.skills.map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(', ')
      : 'Problem Solver';

    return (
      <TouchableOpacity
        activeOpacity={0.7}
        style={[
          styles.card,
          { backgroundColor: surfaceColor, borderColor },
        ]}
        onPress={() =>
          router.push({
            pathname: '/(main)/(tabs)/dashboard/solver-profile',
            params: { id: item.id },
          })
        }
      >
        <View style={styles.cardHeader}>
          <View style={styles.identityRow}>
            <Avatar
              uri={item.avatar}
              name={item.name}
              size="medium"
            />
            <View style={{ flex: 1 }}>
              <Text
                style={[styles.name, { color: theme.text }]}
                numberOfLines={1}
              >
                {item.name}
              </Text>
              <Text
                style={[
                  styles.skill,
                  { color: theme.textSecondary },
                ]}
                numberOfLines={1}
              >
                {displaySkills}
              </Text>
            </View>
          </View>
          <View
            style={[
              styles.scoreBadge,
              {
                borderColor: scoreColor,
                backgroundColor: scoreColor + '12',
              },
            ]}
          >
            <Text
              style={[
                styles.scoreValue,
                { color: scoreColor },
              ]}
            >
              {perf.score || 0}%
            </Text>
          </View>
        </View>

        <View style={styles.metricsRow}>
          <View style={styles.metric}>
            <Text
              style={[styles.metricLabel, { color: theme.textSecondary }]}
            >
              Active
            </Text>
            <Text
              style={[styles.metricValue, { color: theme.text }]}
            >
              {activeCount}
            </Text>
          </View>
          <View style={styles.metric}>
            <Text
              style={[styles.metricLabel, { color: theme.textSecondary }]}
            >
              Completed
            </Text>
            <Text
              style={[styles.metricValue, { color: theme.text }]}
            >
              {perf.completed_count || 0}
            </Text>
          </View>
          <View style={styles.metric}>
            <Text
              style={[styles.metricLabel, { color: theme.textSecondary }]}
            >
              Complaints
            </Text>
            <Text
              style={[
                styles.metricValue,
                {
                  color:
                    (perf.complaint_count || 0) > 0 ? '#ef4444' : theme.text, 
                },
              ]}
            >
              {perf.complaint_count || 0} 
            </Text>
          </View>
        </View>

        <View style={styles.footerRow}>
          <View style={styles.labelChip}>
            <Ionicons
              name={getLabelIcon(perf.label)}
              size={14}
              color={theme.textSecondary}
            />
            <Text
              style={[
                styles.labelText,
                { color: theme.textSecondary },
              ]}
            >
              {perf.label || 'No Rating'}
            </Text>
          </View>
          <View style={styles.subStats}>
            <Text
              style={[
                styles.subText,
                { color: theme.textSecondary },
              ]}
            >
              Completion {perf.completion_rate || 0}% 
            </Text>
            <View style={styles.dot} />
            <Text
              style={[
                styles.subText,
                { color: theme.textSecondary },
              ]}
            >
              On-time {perf.on_time_rate || 0}% 
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // 📍 FIX: Added `&& !refreshing` to prevent Loader hijacking
  if (loading && solvers.length === 0 && !refreshing) return <Loader message="Loading team performance..." />;

  return (
    <SafeAreaView
      edges={['top']}
      style={[
        styles.container,
        { backgroundColor: isDark ? '#212121' : '#f9f9f9' },
      ]}
    >
      {/* ── HEADER WITH BACK BUTTON ── */}
      <View
        style={[
          styles.header,
          { borderBottomColor: borderColor, backgroundColor: 'transparent' },
        ]}
      >
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7} style={styles.backButton}>
            <Ionicons name="arrow-back" size={26} color={theme.text} />
          </TouchableOpacity>
          <View>
            <Text style={[styles.headerTitle, { color: theme.text }]}>
              Team
            </Text>
            <Text
              style={[styles.headerSubtitle, { color: theme.textSecondary }]}
            >
              Performance overview
            </Text>
          </View>
        </View>
        
        {/* 📍 FIX: Added Header Actions Row for Sync + Avatar */}
        <View style={styles.headerActions}>
          {Platform.OS === 'web' && (
            <TouchableOpacity onPress={onRefresh} disabled={refreshing} style={styles.webRefreshButton}>
              <Ionicons name="sync" size={22} color={refreshing ? theme.primary : theme.textSecondary} />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={() => router.push('/(main)/profile')}
            activeOpacity={0.7}
          >
            <Avatar uri={user?.avatar} name={user?.name} size="medium" />
          </TouchableOpacity>
        </View>
      </View>

      {/* SEARCH */}
      <View style={styles.searchContainer}>
        <View
          style={[
            styles.searchInput,
            { backgroundColor: inactiveBg, borderColor },
          ]}
        >
          <Ionicons
            name="search"
            size={18}
            color={theme.textSecondary}
          />
          <TextInput
            style={[styles.searchTextInput, { color: theme.text }]}
            placeholder="Search solvers..."
            placeholderTextColor={theme.textSecondary}
            value={searchText}
            onChangeText={setSearchText}
          />
          {searchText ? (
            <TouchableOpacity
              onPress={() => setSearchText('')}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons
                name="close-circle"
                size={18}
                color={theme.textSecondary}
              />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {filteredSolvers.length === 0 && !loading ? (
        <EmptyState
          icon="people-outline"
          title="No solvers found"
          message="Try adjusting your search or check your permissions."
        />
      ) : (
        <FlatList
          data={filteredSolvers}
          keyExtractor={item => item.id.toString()}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          // 📍 FIX: Disables double spinner on web
          refreshControl={
            Platform.OS === 'web' ? undefined : (
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={theme.textSecondary}
              />
            )
          }
        />
      )}

      {/* ── NEW CLEAN IMPLEMENTATION ── */}
      <FullScreenSpinner visible={refreshing} message="Updating Team..." />

      {toastMessage !== '' && <Toast message={toastMessage} />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 12 }, // Added for spacing
  backButton: {
    padding: 4,
    marginLeft: -4,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 4,
  },
  webRefreshButton: { padding: 8 }, // Added for touch target
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  searchInput: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  searchTextInput: {
    flex: 1,
    fontSize: 15,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  identityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  skill: {
    fontSize: 13,
  },
  scoreBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  scoreValue: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  metricsRow: {
    flexDirection: 'row',
    marginTop: 4,
  },
  metric: {
    flex: 1,
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 2,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  labelChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  labelText: {
    fontSize: 12,
    fontWeight: '600',
  },
  subStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  subText: {
    fontSize: 12,
    fontWeight: '500',
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    opacity: 0.5,
  },
});
```

## C:\Users\head user\Desktop\Hamthan\v3\AI-Operation-Kaizen\FullStack\frontend\app\(main)\(tabs)\dashboard\_layout.js

```javascript
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
      <Stack.Screen name="awaiting_review"/>
      <Stack.Screen name="awaiting_review_detail"/>
    </Stack>
  );
}
```

## C:\Users\head user\Desktop\Hamthan\v3\AI-Operation-Kaizen\FullStack\frontend\app\(main)\(tabs)\issues\index.js

```javascript
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Platform,
  ActivityIndicator, // 📍 Added for the infinite scroll loading spinner
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../../src/theme/ThemeContext';
import { selectCurrentUser } from '../../../../src/store/slices/authSlice';
import { 
  fetchIssues, 
  selectAllIssues, 
  selectIssuesLoading,
  selectIssuesLoadingMore, // 📍 Added
  selectHasMoreIssues      // 📍 Added
} from '../../../../src/store/slices/issuesSlice';
import { selectIsOnline } from '../../../../src/store/slices/offlineSlice';
import IssueCard from '../../../../src/components/issue/IssueCard';
import Loader from '../../../../src/components/common/Loader';
import EmptyState from '../../../../src/components/common/EmptyState';
import Avatar from '../../../../src/components/common/Avatar';
import Toast from '../../../../src/components/common/Toast';
import FilterModal from '../../../../src/components/modals/FilterModal';
import { useDebounce } from '../../../../src/hooks/useDebounce';
import FullScreenSpinner from '../../../../src/components/common/FullScreenSpinner';

// ── PREMIUM STATUS PALETTE FOR CHIPS ──
const STATUS_COLORS = {
  OPEN: '#3b82f6',
  ASSIGNED: '#8b5cf6',
  IN_PROGRESS: '#eab308',
  RESOLVED_PENDING_REVIEW: '#f97316',
  COMPLETED: '#10a37f',
  REOPENED: '#ef4444',
  ESCALATED: '#dc2626',
};

const formatStatusText = (status) => {
  if (!status) return '';
  return status.split('_').map(w => w.charAt(0) + w.slice(1).toLowerCase()).join(' ');
};

export default function IssuesTabScreen() {
  const { theme, isDark } = useTheme(); 
  const router = useRouter();
  const dispatch = useDispatch();
  const user = useSelector(selectCurrentUser);
  const allIssues = useSelector(selectAllIssues);
  const loading = useSelector(selectIssuesLoading);
  
  // 📍 NEW: Track cursor pagination state
  const loadingMore = useSelector(selectIssuesLoadingMore);
  const hasMore = useSelector(selectHasMoreIssues);
  
  const isOnline = useSelector(selectIsOnline);

  const [searchText, setSearchText] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [toastMessage, setToastMessage] = useState('');
  const [appliedFilters, setAppliedFilters] = useState({
    statuses: [],
    priorities: [],
    categories: [],
    site: null,
    dateRange: 'all',
    overdueOnly: false,
  });

  const debouncedSearch = useDebounce(searchText, 300);

  // 📍 UPDATED: Initial load explicitly asks for a reset (sends null cursor)
  useEffect(() => {
    if (user) dispatch(fetchIssues({ reset: true }));
  }, [user, dispatch]);

  const realSites = useMemo(() => {
    if (!allIssues) return [];
    const uniqueSites = new Map();

    allIssues.forEach(issue => {
      if (issue.site_id && issue.site_name) {
        uniqueSites.set(issue.site_id, {
          id: issue.site_id,
          name: issue.site_name
        });
      }
    });

    return Array.from(uniqueSites.values());
  }, [allIssues]);

  const filteredIssues = useMemo(() => {
    if (!allIssues || allIssues.length === 0) return [];
    
    return allIssues.filter(issue => {
      // 2. TEXT SEARCH FILTER
      if (debouncedSearch) {
        const searchLower = debouncedSearch.toLowerCase();
        const matchesSearch = 
          issue.title?.toLowerCase().includes(searchLower) ||
          issue.description?.toLowerCase().includes(searchLower) ||
          issue.id?.toString().includes(searchLower) ||
          issue.site_name?.toLowerCase().includes(searchLower); 
        
        if (!matchesSearch) return false;
      }

      // 3. STATUS FILTER
      if (appliedFilters.statuses && appliedFilters.statuses.length > 0) {
        if (!appliedFilters.statuses.includes(issue.status)) return false;
      }

      // 4. PRIORITY FILTER
      if (appliedFilters.priorities && appliedFilters.priorities.length > 0) {
        if (!appliedFilters.priorities.includes(issue.priority)) return false;
      }

      // 5. SITE FILTER
      if (appliedFilters.site) {
        if (issue.site_id !== appliedFilters.site) return false;
      }

      // 6. CATEGORY FILTER
      if (appliedFilters.categories && appliedFilters.categories.length > 0) {
        const matchesCategory = appliedFilters.categories.some(category => {
          const catLower = category.toLowerCase();
          return issue.title?.toLowerCase().includes(catLower) || 
                 issue.description?.toLowerCase().includes(catLower);
        });
        if (!matchesCategory) return false;
      }

      // 7. DATE RANGE FILTER
      if (appliedFilters.dateRange && appliedFilters.dateRange !== 'all') {
        if (!issue.created_at) return false; 

        const issueDate = new Date(issue.created_at);
        const now = new Date();
        
        if (appliedFilters.dateRange === 'today') {
          if (issueDate.toDateString() !== now.toDateString()) return false;
        } else if (appliedFilters.dateRange === 'week') {
          const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          if (issueDate < oneWeekAgo) return false;
        } else if (appliedFilters.dateRange === 'month') {
          const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          if (issueDate < oneMonthAgo) return false;
        } else if (appliedFilters.dateRange === '3months') {
          const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          if (issueDate < threeMonthsAgo) return false;
        }
      }

      // 8. OVERDUE ONLY FILTER
      if (appliedFilters.overdueOnly) {
        if (issue.status === 'COMPLETED' || issue.status === 'RESOLVED_PENDING_REVIEW') {
          return false;
        }
        
        if (issue.deadline_at) {
          const deadline = new Date(issue.deadline_at);
          if (deadline >= new Date()) return false; 
        } else {
          return false; 
        }
      }

      return true;
    });
  }, [allIssues, debouncedSearch, appliedFilters]);

  // 📍 UPDATED: Pull-to-refresh forces a cursor reset
  const onRefresh = useCallback(async () => {
    if (!isOnline) {
      setToastMessage("Can't refresh while offline");
      setTimeout(() => setToastMessage(''), 3000);
      return;
    }
    const now = Date.now();
    if (lastRefresh && now - lastRefresh < 5000) {
      setToastMessage('Just refreshed. Wait a moment.');
      setTimeout(() => setToastMessage(''), 3000);
      return;
    }
    setRefreshing(true);
    
    if (user) {
      try {
        await Promise.allSettled([
          dispatch(fetchIssues({ reset: true }))
        ]);
      } finally {
        setLastRefresh(Date.now());
        setRefreshing(false);
      }
    } else {
      setRefreshing(false);
    }
  }, [user, isOnline, lastRefresh, dispatch]);

  // 📍 NEW: Trigger infinite scroll load
  const handleLoadMore = () => {
    if (!loadingMore && hasMore && isOnline) {
      dispatch(fetchIssues({ reset: false })); // Tells thunk to use stored cursor
    }
  };

  const handleIssuePress = (issue) => router.push({ pathname: '/(main)/(tabs)/issues/issue-detail', params: { id: issue.id } });
  const handleApplyFilters = (filters) => setAppliedFilters(filters);
  const handleClearFilters = () => {
    setSearchText('');
    setAppliedFilters({ statuses: [], priorities: [], categories: [], site: null, dateRange: 'all', overdueOnly: false });
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (appliedFilters.statuses.length > 0) count++;
    if (appliedFilters.priorities.length > 0) count++;
    if (appliedFilters.categories.length > 0) count++;
    if (appliedFilters.site) count++;
    if (appliedFilters.dateRange !== 'all') count++;
    if (appliedFilters.overdueOnly) count++;
    return count;
  };

  const hasActiveFilters = getActiveFilterCount() > 0 || searchText !== '';
  const activeFilterCount = getActiveFilterCount();

  const activeBg = isDark ? '#ffffff' : '#101010';
  const inactiveBg = isDark ? 'rgba(255,255,255,0.06)' : '#f4f4f4';
  const borderColor = isDark ? '#333333' : '#e5e5e5';

  const renderActiveFilterChips = () => {
    const chips = [];
    const chipStyle = [styles.activeChip, { backgroundColor: inactiveBg, borderColor }];
    const textStyle = [styles.activeChipText, { color: theme.text }];
    const iconColor = theme.textSecondary;

    // 📍 DYNAMIC COLOR CHIPS FOR STATUS
    if (appliedFilters.statuses && appliedFilters.statuses.length > 0) {
      appliedFilters.statuses.forEach(status => {
        const color = STATUS_COLORS[status] || theme.textSecondary;
        chips.push(
          <View key={`status-${status}`} style={[styles.activeChip, { backgroundColor: `${color}15`, borderColor: `${color}30` }]}>
            <Text style={[styles.activeChipText, { color }]}>{formatStatusText(status)}</Text>
            <TouchableOpacity onPress={() => setAppliedFilters(prev => ({ ...prev, statuses: prev.statuses.filter(s => s !== status) }))}>
              <Ionicons name="close" size={14} color={color} />
            </TouchableOpacity>
          </View>
        );
      });
    }

    if (appliedFilters.priorities.length > 0) {
      chips.push(
        <View key="priority" style={chipStyle}>
          <Text style={textStyle}>Priority: {appliedFilters.priorities.length}</Text>
          <TouchableOpacity onPress={() => setAppliedFilters(prev => ({ ...prev, priorities: [] }))}>
            <Ionicons name="close" size={14} color={iconColor} />
          </TouchableOpacity>
        </View>
      );
    }
    if (appliedFilters.categories.length > 0) {
      chips.push(
        <View key="category" style={chipStyle}>
          <Text style={textStyle}>Category: {appliedFilters.categories.length}</Text>
          <TouchableOpacity onPress={() => setAppliedFilters(prev => ({ ...prev, categories: [] }))}>
            <Ionicons name="close" size={14} color={iconColor} />
          </TouchableOpacity>
        </View>
      );
    }
   if (appliedFilters.site) {
      const selectedSiteObj = realSites.find(s => s.id === appliedFilters.site);
      const siteDisplayName = selectedSiteObj ? selectedSiteObj.name : 'Site Selected';

      chips.push(
        <View key="site" style={chipStyle}>
          <Text style={textStyle}>Site: {siteDisplayName}</Text>
          <TouchableOpacity onPress={() => setAppliedFilters(prev => ({ ...prev, site: null }))}>
            <Ionicons name="close" size={14} color={iconColor} />
          </TouchableOpacity>
        </View>
      );
    }
    if (appliedFilters.overdueOnly) {
      chips.push(
        <View key="overdue" style={[chipStyle, { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.1)' : '#fef2f2', borderColor: isDark ? 'rgba(239, 68, 68, 0.2)' : '#fee2e2' }]}>
          <Text style={[styles.activeChipText, { color: '#ef4444' }]}>Overdue Only</Text>
          <TouchableOpacity onPress={() => setAppliedFilters(prev => ({ ...prev, overdueOnly: false }))}>
            <Ionicons name="close" size={14} color="#ef4444" />
          </TouchableOpacity>
        </View>
      );
    }
    return chips;
  };

  if (loading && allIssues.length === 0 && !refreshing) return <Loader message="Loading issues..." />;

  return (
    <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: isDark ? '#1a1a1a' : '#ffffff' }]}>

      {/* ── HEADER ── */}
      <View style={[styles.header, { borderBottomColor: borderColor }]}>
        <View>
          <Text style={[styles.headerTitle, { color: theme.text }]}>All Issues</Text>
          <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>
            {user?.role === 'manager' ? 'All Sites' : `${user?.role === 'supervisor' ? 'Your Sites' : 'Assigned to You'}`}
          </Text>
        </View>
        
        <View style={styles.headerActions}>
          {Platform.OS === 'web' && (
            <TouchableOpacity onPress={onRefresh} disabled={refreshing} style={styles.webRefreshButton}>
              <Ionicons name="sync" size={22} color={refreshing ? theme.primary : theme.textSecondary} />
            </TouchableOpacity>
          )}

          <TouchableOpacity onPress={() => router.push('/(main)/(tabs)/chat')} activeOpacity={0.7} style={{ marginRight: 4, padding: 4 }}>
            <Ionicons name="arrow-undo-outline" size={24} color={theme.text} />
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.push('/(main)/profile')} activeOpacity={0.7}>
            <Avatar uri={user?.avatar} name={user?.name} size="medium" />
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={filteredIssues}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => <IssueCard issue={item} onPress={() => handleIssuePress(item)} />}
        contentContainerStyle={styles.listContent}
        
        // 📍 NEW: Infinite Scroll Props Hooked Up
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5} 
        ListFooterComponent={
          loadingMore ? (
            <View style={styles.loadingFooter}>
              <ActivityIndicator size="small" color={theme.primary} />
            </View>
          ) : null
        }

        ListHeaderComponent={
          <View style={styles.headerComponentWrapper}>

            {/* ── SEARCH & FILTER ROW ── */}
            <View style={styles.searchContainer}>
              <View style={[styles.searchInput, { backgroundColor: inactiveBg, borderColor }]}>
                <Ionicons name="search" size={18} color={theme.textSecondary} />
                <TextInput
                  style={[styles.searchTextInput, { color: theme.text }]}
                  placeholder="Search issues..."
                  placeholderTextColor={theme.textSecondary}
                  value={searchText}
                  onChangeText={setSearchText}
                />
                {searchText !== '' && (
                  <TouchableOpacity onPress={() => setSearchText('')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Ionicons name="close-circle" size={18} color={theme.textSecondary} />
                  </TouchableOpacity>
                )}
              </View>

              <TouchableOpacity
                activeOpacity={0.7}
                style={[
                  styles.filterButton,
                  {
                    backgroundColor: activeFilterCount > 0 ? activeBg : inactiveBg,
                    borderColor: activeFilterCount > 0 ? activeBg : borderColor,
                  }
                ]}
                onPress={() => setShowFilterModal(true)}
              >
                <Ionicons
                  name="options-outline"
                  size={20}
                  color={activeFilterCount > 0 ? (isDark ? '#000' : '#fff') : theme.text}
                />
                {activeFilterCount > 0 && (
                  <View style={styles.filterBadge}>
                    <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            {/* ── ACTIVE FILTER CHIPS ── */}
            {hasActiveFilters && (
              <View style={styles.activeFiltersContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.activeChipsScroll}>
                  {renderActiveFilterChips()}
                  <TouchableOpacity style={styles.clearAllButton} onPress={handleClearFilters}>
                    <Text style={[styles.clearAllText, { color: theme.textSecondary }]}>Clear All</Text>
                  </TouchableOpacity>
                </ScrollView>
              </View>
            )}

            {/* ── RESULTS COUNT ── */}
            <View style={styles.resultsHeader}>
              {/* 📍 UPDATED: Changed to show exactly how many issues are loaded into the app */}
              <Text style={[styles.resultsCount, { color: theme.textSecondary }]}>
                {filteredIssues.length} loaded issue{filteredIssues.length !== 1 ? 's' : ''}
              </Text>
            </View>
          </View>
        }

        ListEmptyComponent={
          <EmptyState
            icon="document-text-outline"
            title="No issues found"
            message={hasActiveFilters ? "Try adjusting your filters." : "There are no issues to display."}
          />
        }
        showsVerticalScrollIndicator={false}
        refreshControl={
          Platform.OS === 'web' ? undefined : (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.textSecondary}
            />
          )
        }
      />

      <FilterModal
        visible={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        onApply={handleApplyFilters}
        initialFilters={appliedFilters}
        sites={realSites}
      />

      <FullScreenSpinner visible={refreshing} message="Updating Issues..." color={theme.primary} />

      {toastMessage !== '' && <Toast message={toastMessage} />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth
  },
  headerTitle: { fontSize: 28, fontWeight: '700', letterSpacing: -0.5 },
  headerSubtitle: { fontSize: 14, fontWeight: '500', marginTop: 4 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 12 }, 
  webRefreshButton: { padding: 4 }, 

  headerComponentWrapper: {
    paddingBottom: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    gap: 12
  },
  searchInput: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    height: 44, // Fixed height for exact alignment
    borderRadius: 12, // Squircle 
    borderWidth: 1,
    gap: 8
  },
  searchTextInput: { flex: 1, fontSize: 15 },
  filterButton: {
    width: 44,
    height: 44,
    borderRadius: 12, // Match input squircle
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative'
  },
  filterBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#ef4444', // Kept red for high-alert visibility
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ffffff', // Cuts into the button shape elegantly
  },
  filterBadgeText: { color: '#fff', fontSize: 9, fontWeight: '800' },

  activeFiltersContainer: { paddingHorizontal: 16, marginBottom: 8 },
  activeChipsScroll: { flexDirection: 'row', gap: 8, paddingRight: 16, alignItems: 'center' },
  activeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6
  },
  activeChipText: { fontSize: 13, fontWeight: '500' },
  clearAllButton: { paddingHorizontal: 8, paddingVertical: 6 },
  clearAllText: { fontSize: 13, fontWeight: '600' },

  resultsHeader: { paddingHorizontal: 20, paddingVertical: 8 },
  resultsCount: { fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },

  listContent: { paddingBottom: 24 },
  
  // 📍 NEW: Style for the bottom spinner
  loadingFooter: {
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center'
  }
});
```

## C:\Users\head user\Desktop\Hamthan\v3\AI-Operation-Kaizen\FullStack\frontend\app\(main)\(tabs)\issues\issue-detail.js

```javascript
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Animated,
  Platform,
  Alert,
  RefreshControl,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker'; 
import * as Location from 'expo-location'; // 📍 IMPORTED FOR NATIVE GPS

import { useTheme } from '../../../../src/theme/ThemeContext';
import { selectCurrentUser } from '../../../../src/store/slices/authSlice';
import { 
  fetchIssueById, 
  fetchIssueTimeline, 
  selectIssueById, 
  selectCurrentIssue, 
  selectIssueTimeline,
  selectIssuesLoading,
  clearCurrentIssue
} from '../../../../src/store/slices/issuesSlice';
import { formatDate, formatDateTime } from '../../../../src/utils/formatters';
import { calculateOverdueDays } from '../../../../src/utils/overdue';
import StatusBadge from '../../../../src/components/common/StatusBadge';
import Avatar from '../../../../src/components/common/Avatar';
import Loader from '../../../../src/components/common/Loader';
import IssueTimeline from '../../../../src/components/issue/IssueTimeline';
import Button from '../../../../src/components/common/Button'; 

import { selectIsOnline } from '../../../../src/store/slices/offlineSlice';
import Toast from '../../../../src/components/common/Toast';
import FullScreenSpinner from '../../../../src/components/common/FullScreenSpinner';

export default function IssueDetailScreen() {
  const { theme, isDark } = useTheme(); 
  const router = useRouter();
  const { id, highlighted } = useLocalSearchParams();
  
  const dispatch = useDispatch();

  const user = useSelector(selectCurrentUser);
  const cachedIssue = useSelector((state) => selectIssueById(state, parseInt(id)));
  const fullIssue = useSelector(selectCurrentIssue);
  const timeline = useSelector(selectIssueTimeline) || [];
  const loading = useSelector(selectIssuesLoading);
  const isOnline = useSelector(selectIsOnline);

  const [refreshing, setRefreshing] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // 📍 NEW CAMERA & LOCATION STATES
  const [selectedImage, setSelectedImage] = useState(null);
  const [isCapturingLocation, setIsCapturingLocation] = useState(false);
  const [capturedLocation, setCapturedLocation] = useState(null);

  const issue = (fullIssue && fullIssue.id === parseInt(id)) ? fullIssue : cachedIssue;

  useEffect(() => {
    if (id) {
      dispatch(fetchIssueById(parseInt(id)));
      dispatch(fetchIssueTimeline(parseInt(id)));
    }
    return () => { dispatch(clearCurrentIssue()); };
  }, [id, dispatch]);
  
  const [highlightAnim] = useState(new Animated.Value(highlighted === 'true' ? 1 : 0));

  useEffect(() => {
    if (highlighted === 'true') {
      Animated.timing(highlightAnim, {
        toValue: 0,
        duration: 2000,
        delay: 500,
        useNativeDriver: false,
      }).start();
    }
  }, [highlighted, highlightAnim]);

  const onRefresh = useCallback(async () => {
    if (!isOnline) {
      setToastMessage("Can't refresh while offline");
      setTimeout(() => setToastMessage(''), 3000);
      return;
    }
    if (!id) return;
    
    setRefreshing(true);
    try {
      await Promise.allSettled([
        dispatch(fetchIssueById(parseInt(id))),
        dispatch(fetchIssueTimeline(parseInt(id)))
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [id, isOnline, dispatch]);

  // 📍 CAMERA LOGIC
  const handleTakePhoto = async () => {
    console.log("\n[DEBUG] --- STARTING PHOTO CAPTURE FLOW ---");
    setIsCapturingLocation(true); 

    try {
      let loc = null;
      if (Platform.OS !== 'web') {
        try {
          console.log("[DEBUG] Native Device: Requesting GPS...");
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status === 'granted') {
            const locationPromise = Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
            const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 8000));
            const position = await Promise.race([locationPromise, timeoutPromise]);
            loc = { latitude: position.coords.latitude, longitude: position.coords.longitude };
          }
        } catch(e) {
          console.log("[DEBUG] Native location fetch failed:", e.message);
        }
      }

      if (loc) {
        setCapturedLocation(loc);
      } else if (Platform.OS !== 'web') {
        Alert.alert("Location Required", "We need your location to verify the fix.");
        setIsCapturingLocation(false);
        return; 
      }

      let result;
      if (Platform.OS === 'web') {
        console.log("[DEBUG] Web: Triggering File Picker.");
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [4, 3],
          quality: 0.8,
        });
      } else {
        const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
        if (permissionResult.granted === false) {
          Alert.alert("Permission Required", "Camera access is needed.");
          setIsCapturingLocation(false);
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [4, 3],
          quality: 0.8,
        });
      }

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setSelectedImage(result.assets[0].uri);
        setCapturedLocation(loc);
      } else {
        setCapturedLocation(null); 
      }
    } catch (error) {
      if (Platform.OS === 'web') alert("Error opening file picker.");
    } finally {
      setIsCapturingLocation(false); 
    }
  };

  const handleSubmitPhoto = () => {
    console.log("\n=============================================");
    console.log("📸 FIX PHOTO UPLOADED");
    console.log(`Issue ID:      ${issue.id}`);
    console.log(`Solver:        ${user?.name}`);
    console.log(`Location:      ${capturedLocation ? `${capturedLocation.latitude}, ${capturedLocation.longitude}` : 'Bypassed (Web)'}`);
    console.log("=============================================\n");

    setSelectedImage(null);
    setCapturedLocation(null);
    
    if (Platform.OS === 'web') {
      alert("Sent Successfully! Fix photo uploaded for review.");
    } else {
      Alert.alert("Sent Successfully!", "Fix photo uploaded for review.", [{ text: "OK" }]);
    }
  };

  // 📍 REVIEW LOGIC
  const handleReviewAction = (actionType) => {
    console.log(`[DEBUG] Supervisor Action: ${actionType} on Issue #${issue?.id}`);

    if (actionType === 'APPROVE') {
      if (Platform.OS === 'web') {
        if (window.confirm("Approve this fix? Issue will be marked as COMPLETED.")) {
          alert("Success! Issue has been approved and closed.");
          router.back();
        }
      } else {
        Alert.alert("Approve Fix", "Approve this fix? Issue will be marked as COMPLETED.", [
          { text: "Cancel", style: "cancel" },
          { text: "Approve", onPress: () => { Alert.alert("Success", "Issue approved."); router.back(); } }
        ]);
      }
    } else if (actionType === 'REJECT') {
      if (Platform.OS === 'web') {
        if (window.confirm("Reject this fix? Issue will return to the solver.")) {
          alert("Rejected! Issue returned to solver.");
          router.back();
        }
      } else {
        Alert.alert("Reject Fix", "Reject this fix? Issue will return to the solver.", [
          { text: "Cancel", style: "cancel" },
          { text: "Reject", style: "destructive", onPress: () => { Alert.alert("Rejected", "Issue returned."); router.back(); } }
        ]);
      }
    }
  };

  if (loading && !refreshing && !issue) return <Loader message="Loading issue details..." />;
  if (!issue) return <Loader message="Loading issue details..." />;

  // ── SMART DATA EXTRACTION ──
  const siteName = issue.site_name || issue.site?.name || 'N/A';
  const siteLocation = issue.site_location || issue.site?.location || null;
  const category = issue.issue_type || 'General Maintenance';
  const raisedByName = issue.supervisor_name || issue.raised_by?.name || 'N/A';

  const currentAssignment = issue.assignments && issue.assignments.length > 0 
    ? issue.assignments[0] 
    : issue.assignment || null;

  const solverName = currentAssignment?.solver_name || currentAssignment?.assigned_to?.name || null;
  const solverPhone = currentAssignment?.solver_phone || currentAssignment?.assigned_to?.phone || null;
  const dueDate = currentAssignment?.due_date || issue.deadline_at || null;

  const overdueDays = calculateOverdueDays(issue.deadline_at);
  const isOverdue = overdueDays > 0 && issue.status !== 'COMPLETED';

  // ── ROLE + STATUS DERIVED FLAGS ──
  const isProblemSolver = user?.role === 'problemsolver' || user?.role === 'problem_solver';
  const isSupervisor    = user?.role === 'supervisor';
  const isManager       = user?.role === 'manager';

  const showMarkDoneBtn = isProblemSolver && issue.status === 'IN_PROGRESS';
  const showApproveBtn  = (isSupervisor || isManager) && issue.status === 'RESOLVED_PENDING_REVIEW';

  const getInitials = (name) => {
    if (!name || name === 'N/A') return 'NA';
    return name.substring(0, 2).toUpperCase();
  };

  const getStatusColor = (status) => {
    const colors = { OPEN: '#3b82f6', ASSIGNED: '#f59e0b', IN_PROGRESS: '#8b5cf6', RESOLVED_PENDING_REVIEW: '#eab308', COMPLETED: '#10a37f', REOPENED: '#ef4444', ESCALATED: '#ef4444' };
    return colors[status] || '#8e8ea0';
  };

  const getPriorityColor = (priority) => {
    const colors = { high: '#ef4444', medium: '#f59e0b', low: '#10a37f' };
    return colors[priority] || '#8e8ea0';
  };

  const bgColor = isDark ? '#212121' : '#f9f9f9';
  const surfaceColor = isDark ? '#171717' : '#ffffff';
  const borderColor = isDark ? '#333333' : '#e5e5e5';
  const iconBg = isDark ? 'rgba(255,255,255,0.05)' : '#f4f4f4';
  const successAccent = '#10a37f';

  const highlightColor = highlightAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [surfaceColor, isDark ? '#3f3f46' : '#fef9c3'],
  });

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]}>
      
      <View style={[styles.header, { backgroundColor: bgColor, borderBottomColor: borderColor }]}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.6} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.textSecondary }]}>Issue #{issue.id}</Text>
        
        <View style={styles.headerRight}>
          {Platform.OS === 'web' ? (
            <TouchableOpacity onPress={onRefresh} disabled={refreshing} style={styles.webRefreshButton}>
              <Ionicons name="sync" size={22} color={refreshing ? theme.primary : theme.textSecondary} />
            </TouchableOpacity>
          ) : (
            <View style={styles.placeholder} />
          )}
        </View>
      </View>

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          Platform.OS === 'web' ? undefined : (
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.textSecondary} />
          )
        }
      >
        
        <Animated.View style={[styles.card, styles.flatCard, { backgroundColor: highlightColor, borderColor }]}>
          <Text style={[styles.issueTitle, { color: theme.text }]}>{issue.title}</Text>
          <View style={styles.badgeRow}>
            <StatusBadge label={issue.status.replace(/_/g, ' ')} color={getStatusColor(issue.status)} />
            <StatusBadge label={issue.priority.toUpperCase()} color={getPriorityColor(issue.priority)} />
            {isOverdue && <StatusBadge label={`${overdueDays}d overdue`} color="#ef4444" />}
          </View>
        </Animated.View>

        <View style={[styles.card, styles.flatCard, { backgroundColor: surfaceColor, borderColor }]}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Description</Text>
          <Text style={[styles.description, { color: theme.text }]}>{issue.description}</Text>
        </View>

        <View style={[styles.card, styles.flatCard, { backgroundColor: surfaceColor, borderColor }]}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Details</Text>
          
          <View style={styles.infoRow}>
            <View style={[styles.iconWrapper, { backgroundColor: iconBg }]}><Ionicons name="location-outline" size={18} color={theme.textSecondary} /></View>
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Site</Text>
              <Text style={[styles.infoValue, { color: theme.text }]}>{siteName}</Text>
            </View>
          </View>
          
          {siteLocation && (
            <View style={styles.infoRow}>
              <View style={[styles.iconWrapper, { backgroundColor: iconBg }]}><Ionicons name="map-outline" size={18} color={theme.textSecondary} /></View>
              <View style={styles.infoContent}>
                <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Location</Text>
                <Text style={[styles.infoValue, { color: theme.text }]}>{siteLocation}</Text>
              </View>
            </View>
          )}

          {dueDate && (
            <View style={styles.infoRow}>
              <View style={[styles.iconWrapper, { backgroundColor: iconBg }]}><Ionicons name="calendar-outline" size={18} color={theme.textSecondary} /></View>
              <View style={styles.infoContent}>
                <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Deadline</Text>
                <Text style={[styles.infoValue, { color: theme.text }]}>{formatDate(dueDate)}</Text>
              </View>
            </View>
          )}
          
          <View style={[styles.infoRow, { marginBottom: 0 }]}>
            <View style={[styles.iconWrapper, { backgroundColor: iconBg }]}><Ionicons name="construct-outline" size={18} color={theme.textSecondary} /></View>
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Category</Text>
              <Text style={[styles.infoValue, { color: theme.text }]}>{category}</Text>
            </View>
          </View>
        </View>

        <View style={[styles.card, styles.flatCard, { backgroundColor: surfaceColor, borderColor }]}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>People Involved</Text>
          <View style={styles.peopleGrid}>
            <View style={[styles.personRow, solverName && { borderBottomColor: borderColor, borderBottomWidth: StyleSheet.hairlineWidth }]}>
              <View style={[styles.avatarCircle, { backgroundColor: '#3b82f6' }]}><Text style={styles.avatarText}>{getInitials(raisedByName)}</Text></View>
              <View style={styles.personInfo}>
                <Text style={[styles.personName, { color: theme.text }]} numberOfLines={1}>{raisedByName}</Text>
                <Text style={[styles.personRole, { color: theme.textSecondary }]}>Raised By</Text>
              </View>
            </View>
            
            {solverName && (
              <View style={[styles.personRow, { paddingTop: 12, paddingBottom: 0 }]}>
                <View style={[styles.avatarCircle, { backgroundColor: '#10a37f' }]}><Text style={styles.avatarText}>{getInitials(solverName)}</Text></View>
                <View style={styles.personInfo}>
                  <Text style={[styles.personName, { color: theme.text }]} numberOfLines={1}>{solverName}</Text>
                  <Text style={[styles.personRole, { color: theme.textSecondary }]}>Assigned To</Text>
                </View>
                {solverPhone && (
                   <View style={styles.phoneBadge}>
                     <Ionicons name="call" size={12} color="#fff" />
                     <Text style={styles.phoneBadgeText}>{solverPhone}</Text>
                   </View>
                )}
              </View>
            )}
          </View>
        </View>

        <View style={[styles.card, styles.flatCard, { backgroundColor: surfaceColor, borderColor }]}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Metadata</Text>

          {issue.complaints_count !== undefined && (
            <View style={styles.infoRow}>
              <View style={[styles.iconWrapper, { backgroundColor: issue.complaints_count > 0 ? 'rgba(239,68,68,0.1)' : iconBg }]}><Ionicons name="warning-outline" size={18} color={issue.complaints_count > 0 ? '#ef4444' : theme.textSecondary} /></View>
              <View style={styles.infoContent}>
                <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Complaints Filed</Text>
                <Text style={[styles.infoValue, { color: issue.complaints_count > 0 ? '#ef4444' : theme.text }]}>{issue.complaints_count}</Text>
              </View>
            </View>
          )}

          {issue.track_status && (
            <View style={styles.infoRow}>
              <View style={[styles.iconWrapper, { backgroundColor: iconBg }]}><Ionicons name="analytics-outline" size={18} color={theme.textSecondary} /></View>
              <View style={styles.infoContent}>
                <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Tracking Status</Text>
                <Text style={[styles.infoValue, { color: theme.text, textTransform: 'capitalize' }]}>{issue.track_status.replace(/_/g, ' ')}</Text>
              </View>
            </View>
          )}
          
          <View style={styles.infoRow}>
            <View style={[styles.iconWrapper, { backgroundColor: isOverdue ? 'rgba(239,68,68,0.1)' : iconBg }]}><Ionicons name="flag-outline" size={18} color={isOverdue ? '#ef4444' : theme.textSecondary} /></View>
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Deadline</Text>
              <Text style={[styles.infoValue, { color: isOverdue ? '#ef4444' : theme.text }]}>{formatDate(issue.deadline_at)}{isOverdue && ` (${overdueDays} days overdue)`}</Text>
            </View>
          </View>
          
          <View style={styles.infoRow}>
            <View style={[styles.iconWrapper, { backgroundColor: iconBg }]}><Ionicons name="add-outline" size={18} color={theme.textSecondary} /></View>
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Created</Text>
              <Text style={[styles.infoValue, { color: theme.text }]}>{formatDateTime(issue.created_at)}</Text>
            </View>
          </View>
          
          <View style={[styles.infoRow, { marginBottom: 0 }]}>
            <View style={[styles.iconWrapper, { backgroundColor: iconBg }]}><Ionicons name="refresh-outline" size={18} color={theme.textSecondary} /></View>
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Last Updated</Text>
              <Text style={[styles.infoValue, { color: theme.text }]}>{formatDateTime(issue.updated_at)}</Text>
            </View>
          </View>
        </View>

        {/* ── IMAGES ── */}
        {issue.images && issue.images.length > 0 && (
          <View style={[styles.card, styles.flatCard, { backgroundColor: surfaceColor, borderColor }]}>
            <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Media Attached</Text>
            {issue.images.map((img, index) => (
              <View key={index} style={styles.imageContainer}>
                <View style={styles.imageHeader}>
                  <StatusBadge label={img.image_type} color={img.image_type === 'BEFORE' ? '#f59e0b' : '#10a37f'} />
                  {img.ai_flag && img.ai_flag !== 'NOT_CHECKED' && (
                    <StatusBadge label={`AI: ${img.ai_flag}`} color={img.ai_flag === 'OK' ? '#10a37f' : '#ef4444'} />
                  )}
                </View>
                <View style={[styles.imageWrapper, { backgroundColor: isDark ? '#2a2a2a' : '#f0f0f0', borderColor }]}><Image source={{ uri: img.image_url }} style={styles.image} resizeMode="cover" /></View>
                <View style={styles.imageFooter}>
                  <Text style={[styles.uploaderName, { color: theme.text }]}>Uploaded by: {img.uploader_name || 'System'}</Text>
                  <Text style={[styles.imageDate, { color: theme.textSecondary }]}>{formatDateTime(img.created_at)}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* ── CALL STATUS ── */}
        {currentAssignment && (currentAssignment.total_call_attempts > 0 || currentAssignment.last_call_status) && (
          <View style={[styles.card, styles.flatCard, { backgroundColor: surfaceColor, borderColor }]}>
            <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Call Status</Text>
            <View style={styles.infoRow}>
              <View style={[styles.iconWrapper, { backgroundColor: iconBg }]}><Ionicons name="call-outline" size={18} color={theme.textSecondary} /></View>
              <View style={styles.infoContent}>
                <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Total Attempts</Text>
                <Text style={[styles.infoValue, { color: theme.text }]}>{currentAssignment.total_call_attempts || 0}</Text>
              </View>
            </View>
            <View style={[styles.infoRow, { marginBottom: 0 }]}>
              <View style={[styles.iconWrapper, { backgroundColor: iconBg }]}><Ionicons name="pulse-outline" size={18} color={theme.textSecondary} /></View>
              <View style={styles.infoContent}>
                <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Last Call Result</Text>
                <Text style={[styles.infoValue, { color: currentAssignment.last_call_status === 'ANSWERED' ? '#10a37f' : '#ef4444', textTransform: 'capitalize' }]}>{currentAssignment.last_call_status ? currentAssignment.last_call_status.toLowerCase() : 'Unknown'}</Text>
              </View>
            </View>
          </View>
        )}

        {/* ── ACTIONS ── */}
        <View style={styles.actions}>

          {/* 📍 PROBLEM SOLVER: Camera Flow (IN_PROGRESS) */}
          {showMarkDoneBtn && (
            <View style={styles.solverActionContainer}>
              {!selectedImage ? (
                <TouchableOpacity
                  activeOpacity={0.8}
                  style={[styles.primaryActionBtn, { backgroundColor: successAccent, opacity: isCapturingLocation ? 0.7 : 1 }]}
                  onPress={handleTakePhoto}
                  disabled={isCapturingLocation}
                >
                  <View style={styles.primaryActionBtnInner}>
                    {isCapturingLocation ? <ActivityIndicator color="#fff" size="small" /> : <Ionicons name="camera" size={24} color="#fff" />}
                    <Text style={styles.primaryActionBtnText}>{isCapturingLocation ? "Preparing..." : "Take Fix Photo"}</Text>
                  </View>
                </TouchableOpacity>
              ) : (
                <View style={[styles.previewContainer, { backgroundColor: surfaceColor, borderColor }]}>
                  <View style={styles.previewHeader}>
                    <Ionicons name="image-outline" size={20} color={theme.text} />
                    <Text style={[styles.previewTitle, { color: theme.text }]}>Photo Ready</Text>
                  </View>
                  <Image source={{ uri: selectedImage }} style={[styles.previewImage, { borderColor }]} />
                  <Text style={[styles.previewSubtext, { color: theme.textSecondary }]}>Does this photo clearly show the resolved issue?</Text>
                  <View style={styles.previewActions}>
                    <TouchableOpacity style={[styles.previewBtn, { backgroundColor: iconBg, borderColor, borderWidth: 1 }]} onPress={() => { setSelectedImage(null); setCapturedLocation(null); }}>
                      <Text style={[styles.previewBtnText, { color: theme.text }]}>Retake</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.previewBtn, { backgroundColor: successAccent, flex: 2 }]} onPress={handleSubmitPhoto}>
                      <Ionicons name="send" size={18} color="#fff" style={{ marginRight: 6 }} />
                      <Text style={[styles.previewBtnText, { color: '#fff' }]}>Send Photo</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          )}

          {/* 📍 SUPERVISOR / MANAGER: Approve/Reject (RESOLVED_PENDING_REVIEW) */}
          {showApproveBtn && (
            <View style={{ gap: 12, marginTop: showMarkDoneBtn ? 12 : 0 }}>
              <Button 
                title="Approve & Close" 
                variant="success" 
                icon="checkmark-done-circle-outline" 
                onPress={() => handleReviewAction('APPROVE')} 
                style={{ backgroundColor: '#10a37f', borderColor: '#10a37f', borderRadius: 10 }} 
              />
              <Button 
                title="Reject Fix" 
                variant="danger" 
                icon="close-circle-outline" 
                onPress={() => handleReviewAction('REJECT')} 
                style={{ borderRadius: 10 }} 
              />
            </View>
          )}

          {/* SUPERVISOR: Raise Complaint */}
          {(isSupervisor || isManager) && issue.status === 'COMPLETED' && (
            <Button 
              title="Raise Complaint" 
              variant="danger" 
              icon="alert-circle-outline" 
              onPress={() => Alert.alert('Coming Soon', 'Phase 2-3')}
              style={styles.buttonMargin}
            />
          )}

        </View>
        <View style={styles.bottomPadding} />
      </ScrollView>

      <FullScreenSpinner visible={refreshing} message="Updating Issue..." color={theme.primary} />
      {toastMessage !== '' && <Toast message={toastMessage} />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  backButton: { padding: 4, marginLeft: -4 },
  headerTitle: { fontSize: 14, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  headerRight: { width: 32, alignItems: 'flex-end' },
  placeholder: { width: 32 },
  webRefreshButton: { padding: 4 },
  content: { flex: 1 },
  card: { marginHorizontal: 16, marginTop: 16, padding: 20 },
  flatCard: { borderRadius: 16, borderWidth: 1, ...Platform.select({ ios: { shadowOpacity: 0 }, android: { elevation: 0 } }) },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  issueTitle: { fontSize: 22, fontWeight: '700', letterSpacing: -0.5, marginBottom: 8, lineHeight: 28 },
  description: { fontSize: 15, lineHeight: 24, letterSpacing: -0.1 },
  sectionTitle: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 16 },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 14 },
  iconWrapper: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  infoContent: { flex: 1, justifyContent: 'center' },
  infoLabel: { fontSize: 12, fontWeight: '500', marginBottom: 2 },
  infoValue: { fontSize: 15, fontWeight: '600', letterSpacing: -0.2 },
  peopleGrid: { flexDirection: 'column' },
  personRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingBottom: 12 },
  avatarCircle: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
  personInfo: { flex: 1, justifyContent: 'center' },
  personName: { fontSize: 15, fontWeight: '600', letterSpacing: -0.2, marginBottom: 2 },
  personRole: { fontSize: 13 },
  phoneBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#8b5cf6', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, gap: 4 },
  phoneBadgeText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  imageContainer: { marginBottom: 24 },
  imageHeader: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  imageWrapper: { width: '100%', height: 220, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  image: { width: '100%', height: '100%' },
  imageFooter: { marginTop: 10 },
  uploaderName: { fontSize: 14, fontWeight: '600', marginBottom: 2 },
  imageDate: { fontSize: 12 },
  actions: { marginHorizontal: 16, marginTop: 32 },
  buttonMargin: { marginTop: 12 },
  solverActionContainer: { width: '100%' },
  primaryActionBtn: { borderRadius: 16, paddingVertical: 18, paddingHorizontal: 20, ...Platform.select({ ios: { shadowColor: '#10a37f', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 12 }, android: { elevation: 4 } }) },
  primaryActionBtnInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  primaryActionBtnText: { color: '#fff', fontSize: 17, fontWeight: '700', letterSpacing: -0.2 },
  previewContainer: { borderRadius: 16, borderWidth: 1, padding: 16, alignItems: 'center', ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 8 }, android: { elevation: 2 } }) },
  previewHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16, alignSelf: 'flex-start' },
  previewTitle: { fontSize: 16, fontWeight: '700', letterSpacing: -0.2 },
  previewImage: { width: '100%', height: 220, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, marginBottom: 12 },
  previewSubtext: { fontSize: 13, textAlign: 'center', marginBottom: 16 },
  previewActions: { flexDirection: 'row', gap: 12, width: '100%' },
  previewBtn: { flex: 1, flexDirection: 'row', paddingVertical: 14, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  previewBtnText: { fontSize: 15, fontWeight: '700', letterSpacing: -0.2 },
  bottomPadding: { height: 40 },
});
```

## C:\Users\head user\Desktop\Hamthan\v3\AI-Operation-Kaizen\FullStack\frontend\app\(main)\(tabs)\issues\_layout.js

```javascript
import { Stack } from 'expo-router';

export default function IssuesLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="issue-detail" />
    </Stack>
  );
}
```

## C:\Users\head user\Desktop\Hamthan\v3\AI-Operation-Kaizen\FullStack\frontend\app\(main)\(tabs)\chat.js

```javascript
import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Dimensions,
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../src/theme/ThemeContext';
import { selectCurrentUser } from '../../../src/store/slices/authSlice';
import {
  selectAllMessages,
  selectChatHistory,
  addMessage,
  loadChatHistory,
  loadConversation,
  startNewConversation,
  selectCurrentConversationId,
  selectConversationLoading 
} from '../../../src/store/slices/chatSlice';
import { selectUnreadCount, selectNotifications, markAllAsRead, markAsRead, setNotifications } from '../../../src/store/slices/notificationsSlice';
import NotificationBanner from '../../../src/components/chat/NotificationBanner';
import ChatMessage from '../../../src/components/chat/ChatMessage';
import ChatInput from '../../../src/components/chat/ChatInput';
import ChatHistorySidebar from '../../../src/components/chat/ChatHistorySidebar';
import Avatar from '../../../src/components/common/Avatar';
import { navigateToNotification } from '../../../src/utils/notificationNavigation';
import { sendChatMessage } from '../../../src/services/api';

import { selectIsOnline } from '../../../src/store/slices/offlineSlice';
import Toast from '../../../src/components/common/Toast';
import FullScreenSpinner from '../../../src/components/common/FullScreenSpinner';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DRAWER_WIDTH = 280;

const SUGGESTIONS = [
  { icon: 'document-text-outline', text: 'Show overdue issues' },
  { icon: 'bar-chart-outline', text: 'Weekly analytics report' },
  { icon: 'people-outline', text: 'Team performance summary' },
  { icon: 'alert-circle-outline', text: 'Unresolved complaints' },
];

export default function ChatScreen() {
  const { theme, isDark } = useTheme();
  const router = useRouter();
  const dispatch = useDispatch();
  
  const user = useSelector(selectCurrentUser);
  const messages = useSelector(selectAllMessages);
  const chatHistory = useSelector(selectChatHistory);
  const unreadCount = useSelector(selectUnreadCount);
  const notifications = useSelector(selectNotifications);
  const currentSessionId = useSelector(selectCurrentConversationId);
  const isConversationLoading = useSelector(selectConversationLoading);
  const isOnline = useSelector(selectIsOnline);

  const scrollViewRef = useRef(null);
  const [isLoading, setIsLoading] = useState(false); 
  const [refreshing, setRefreshing] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const drawerAnimation = useRef(new Animated.Value(-DRAWER_WIDTH)).current;

  useEffect(() => {
    if (user?.id) {
      dispatch(loadChatHistory());
      dispatch(startNewConversation()); 
      setSelectedConversation(null);
    }

    dispatch(setNotifications([
      { id: 1, type: 'issue_assigned', title: 'New issue assigned', body: 'Issue #8 has been assigned to you', data: { issueId: 8 }, read: false },
      { id: 2, type: 'issue_reopened', title: 'Issue reopened', body: 'Issue #15 was reopened by supervisor', data: { issueId: 15 }, read: false },
      { id: 3, type: 'complaint_created', title: 'Complaint raised', body: 'A new complaint has been filed', data: { complaintId: 1 }, read: false },
    ]));
  }, [user?.id, dispatch]);

  const toggleDrawer = useCallback(() => {
    const toValue = drawerOpen ? -DRAWER_WIDTH : 0;
    Animated.timing(drawerAnimation, {
      toValue,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      if (drawerOpen) setDrawerOpen(false);
    });
    if (!drawerOpen) setDrawerOpen(true);
  }, [drawerOpen, drawerAnimation]);

  const handleSelectConversation = async (conversationId) => {
    toggleDrawer(); 
    
    try {
      await dispatch(loadConversation(conversationId)).unwrap();
      setSelectedConversation(conversationId);
    } catch (error) {
      console.warn("Failed to load session:", error);
      dispatch(startNewConversation());
      setSelectedConversation(null);
      dispatch(loadChatHistory());
      Alert.alert("Session Not Found", "This conversation no longer exists or was deleted.");
    }
  };

  const handleNewChat = () => {
    dispatch(startNewConversation());
    setSelectedConversation(null);
    toggleDrawer();
  };

  const onRefresh = useCallback(async () => {
    if (!isOnline) {
      setToastMessage("Can't refresh while offline");
      setTimeout(() => setToastMessage(''), 3000);
      return;
    }
    
    setRefreshing(true);
    try {
      const fetches = [dispatch(loadChatHistory())];
      if (currentSessionId) {
        fetches.push(dispatch(loadConversation(currentSessionId)));
      }
      
      await Promise.allSettled(fetches);
    } finally {
      setRefreshing(false);
    }
  }, [isOnline, currentSessionId, dispatch]);

  const handleSendMessage = async (text, imageUri = null,location = null,intent = null) => { //updatwd by hamthan,intent = null
    const userMessage = {
      id: Date.now(),
      message: text || '', 
      image: imageUri,     
      role_in_chat: 'user',
      created_at: new Date().toISOString(),
    };

    dispatch(addMessage(userMessage));
    setIsLoading(true); 

    try {
      const result = await sendChatMessage( // by hamthan , added intent as parameter
        text || 'Uploaded an image',
        currentSessionId,
        null,
        imageUri,
        intent
      );

      if (!result.success) return;

      const response = result.data;

      if (!currentSessionId && response.session_id) {
        dispatch({
          type: 'chat/setCurrentConversationId',
          payload: response.session_id,
        });
      }

      const aiMessage = {
        id: Date.now() + 1,
        message: response.message,
        role_in_chat: 'AI',
        created_at: new Date().toISOString(),
      };

      dispatch(addMessage(aiMessage));
    } catch (error) {
      console.error(error);
    }
    finally {
      setIsLoading(false); 
    }
  };

  const handleSuggestionPress = (text) => {
    handleSendMessage(text);
  };

  const handleNotificationPress = (notification) => {
    if (!notification) return;
    dispatch(markAsRead(notification.id));
    navigateToNotification(notification);
  };

  const handleNotificationDismiss = () => {
    dispatch(markAllAsRead());
  };

  const showCamera = user?.role !== 'manager';

  const screenBg = isDark ? '#212121' : '#ffffff';
  const headerBg = screenBg;
  const logoBg = isDark ? '#ffffff' : '#000000';
  const logoIconColor = isDark ? '#000000' : '#ffffff';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: screenBg }]}>
      <View style={[styles.header, { backgroundColor: headerBg }]}>
        <TouchableOpacity style={styles.menuButton} onPress={toggleDrawer}>
          <Ionicons name="menu-outline" size={26} color={theme.text} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.titleButton} activeOpacity={0.7}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Kairox Ai Opex</Text>
          <Ionicons name="chevron-down" size={14} color={theme.textSecondary} />
        </TouchableOpacity>

        <View style={styles.headerActions}>
          {Platform.OS === 'web' && (
            <TouchableOpacity onPress={onRefresh} disabled={refreshing} style={styles.webRefreshButton}>
              <Ionicons name="sync" size={22} color={refreshing ? theme.primary : theme.textSecondary} />
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={() => router.push('/(main)/profile')}>
            <Avatar uri={user?.avatar} name={user?.name} size="small" />
          </TouchableOpacity>
        </View>
      </View>

      <NotificationBanner
        count={unreadCount}
        notifications={notifications}
        onPress={handleNotificationPress}
        onDismiss={handleNotificationDismiss}
        onMarkRead={(id) => dispatch(markAsRead(id))}
      />

      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={[
            styles.messagesContent,
            (messages.length === 0 || isConversationLoading) && styles.messagesContentEmpty,
          ]}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
          showsVerticalScrollIndicator={false}
          refreshControl={
            Platform.OS === 'web' ? undefined : (
              <RefreshControl 
                refreshing={refreshing} 
                onRefresh={onRefresh} 
                tintColor={theme.textSecondary} 
              />
            )
          }
        >
          {isConversationLoading ? (
            <View style={styles.loadingHistoryContainer}>
              <ActivityIndicator size="large" color={theme.textSecondary} />
              <Text style={[styles.loadingHistoryText, { color: theme.textSecondary }]}>
                Loading conversation...
              </Text>
            </View>
          ) : messages.length === 0 ? (
            <View style={styles.emptyChat}>
              <View style={[styles.emptyLogo, { backgroundColor: logoBg }]}>
                <Ionicons name="sparkles" size={28} color={logoIconColor} />
              </View>

              <Text style={[styles.emptyTitle, { color: theme.text }]}>
                How can I help you today?
              </Text>

              <View style={styles.suggestionsGrid}>
                {SUGGESTIONS.map((suggestion, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.suggestionChip,
                      {
                        backgroundColor: 'transparent',
                        borderColor: isDark ? '#424242' : '#e5e5e5',
                      },
                    ]}
                    onPress={() => handleSuggestionPress(suggestion.text)}
                    activeOpacity={0.5}
                  >
                    <Ionicons
                      name={suggestion.icon}
                      size={18}
                      color={theme.textSecondary}
                      style={styles.suggestionIcon}
                    />
                    <Text style={[styles.suggestionText, { color: theme.textSecondary }]}>
                      {suggestion.text}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ) : (
            messages.map((msg) => (
              <ChatMessage
                key={msg.id}
                message={msg.message}
                image={msg.image || (msg.attachments?.length > 0 ? msg.attachments[0] : null)}
                location={msg.location} 
                isUser={msg.role_in_chat?.toLowerCase() === 'user'} 
                timestamp={msg.created_at}
              />
            ))
          )}

          {isLoading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={theme.textSecondary} />
              <Text style={[styles.loadingText, { color: theme.textSecondary }]}>AI is typing...</Text>
            </View>
          )}
        </ScrollView>

        {/* 📍 FIX: Passed userRole explicitly into ChatInput */}
        <ChatInput 
          onSend={handleSendMessage} 
          showCamera={showCamera} 
          userRole={user?.role} 
        />
      </KeyboardAvoidingView>

      {drawerOpen && (
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={toggleDrawer}
        />
      )}

      <Animated.View
        style={[
          styles.drawer,
          {
            backgroundColor: isDark ? '#171717' : '#f9f9f9',
            transform: [{ translateX: drawerAnimation }],
          },
        ]}
      >
        <ChatHistorySidebar
          conversations={chatHistory}
          onSelectConversation={handleSelectConversation}
          onNewChat={handleNewChat}
          selectedId={selectedConversation}
        />
      </Animated.View>

      <FullScreenSpinner visible={refreshing} message="Syncing Chat..." color={theme.primary} />

      {toastMessage !== '' && <Toast message={toastMessage} />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  keyboardAvoid: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 12 }, 
  webRefreshButton: { padding: 4 }, 
  menuButton: { padding: 4 },
  titleButton: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  headerTitle: { fontSize: 18, fontWeight: '600', letterSpacing: 0.2 },
  messagesContainer: { flex: 1 },
  messagesContent: { paddingVertical: 16, paddingBottom: 24 },
  messagesContentEmpty: { flex: 1, justifyContent: 'center' },
  emptyChat: { alignItems: 'center', paddingHorizontal: 24 },
  emptyLogo: { width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  emptyTitle: { fontSize: 24, fontWeight: '600', marginBottom: 40, textAlign: 'center', letterSpacing: 0.3 },
  suggestionsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 12, maxWidth: 600 },
  suggestionChip: { flexDirection: 'column', alignItems: 'flex-start', paddingVertical: 14, paddingHorizontal: 16, borderRadius: 16, borderWidth: 1, width: '47%', minWidth: 150, minHeight: 80, justifyContent: 'space-between' },
  suggestionIcon: { marginBottom: 8, opacity: 0.8 },
  suggestionText: { fontSize: 14, fontWeight: '500', lineHeight: 20 },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 10 },
  drawer: { position: 'absolute', top: 0, left: 0, bottom: 0, width: DRAWER_WIDTH, zIndex: 20, paddingTop: Platform.OS === 'ios' ? 50 : 30 },
  
  loadingHistoryContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingHistoryText: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: '500',
  },

  loadingContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 20, 
    paddingVertical: 10,
    gap: 8,
  },
  loadingText: { 
    fontSize: 14, 
    fontStyle: 'italic',
  },
});
```

## C:\Users\head user\Desktop\Hamthan\v3\AI-Operation-Kaizen\FullStack\frontend\app\(main)\(tabs)\_layout.js

```javascript
import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../src/theme/ThemeContext';
import { useSelector } from 'react-redux';
import { selectIsOnline } from '../../../src/store/slices/offlineSlice';
import OfflineBanner from '../../../src/components/common/OfflineBanner';
import { useSafeAreaInsets } from 'react-native-safe-area-context'; // 📍 ADDED THIS

export default function TabsLayout() {
  const { theme, isDark } = useTheme();
  const isOnline = useSelector(selectIsOnline);
  const insets = useSafeAreaInsets(); // 📍 GRABS DYNAMIC SCREEN INSETS

  // ── STRICT MONOCHROME PALETTE ──
  const activeColor = isDark ? '#ffffff' : '#101010';
  const inactiveColor = isDark ? '#8e8ea0' : '#8e8ea0'; // Signature GPT muted gray
  const bgColor = isDark ? '#171717' : '#ffffff';
  const borderColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)';

  // 📍 DYNAMIC RESPONSIVE SIZING
  // Ensures at least 16px of padding on Web, or standard 10 on Android, while fully respecting iOS notches
  const bottomPadding = Math.max(insets.bottom, Platform.OS === 'web' ? 16 : 10);
  const tabHeight = 55 + bottomPadding; 

  return (
    <>
      <View style={{ position: 'absolute', top: 0, width: '100%', zIndex: 9999, elevation: 9999 }}>
        <OfflineBanner />
      </View>

      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: activeColor,
          tabBarInactiveTintColor: inactiveColor,

          // ── PREMIUM FLAT STYLING ──
          tabBarStyle: {
            backgroundColor: bgColor,
            borderTopColor: borderColor,
            borderTopWidth: StyleSheet.hairlineWidth, // Ultra-thin, crisp border
            height: tabHeight, // 📍 RESPONSIVE HEIGHT
            paddingBottom: bottomPadding, // 📍 RESPONSIVE PADDING
            paddingTop: 8,
            elevation: 0, // Strips away Android default drop-shadow
            shadowOpacity: 0, // Strips away iOS default shadow
          },
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '600',
            letterSpacing: -0.1,
            marginTop: 4,
          },
        }}
      >
        <Tabs.Screen
          name="chat"
          options={{
            title: 'Chat',
            // 🚀 DYNAMIC ICONS: Outline when inactive, Solid when active
            tabBarIcon: ({ color, focused }) => (
              <Ionicons 
                name={focused ? "chatbubbles" : "chatbubbles-outline"} 
                size={24} 
                color={color} 
              />
            ),
          }}
        />
        <Tabs.Screen
          name="issues"
          options={{
            title: 'Issues',
            // 🚀 DYNAMIC ICONS: Outline when inactive, Solid when active
            tabBarIcon: ({ color, focused }) => (
              <Ionicons 
                name={focused ? "document-text" : "document-text-outline"} 
                size={24} 
                color={color} 
              />
            ),
          }}
        />
        <Tabs.Screen
          name="dashboard"
          options={{
            title: 'Dashboard',
            // 🚀 DYNAMIC ICONS: Outline when inactive, Solid when active
            tabBarIcon: ({ color, focused }) => (
              <Ionicons 
                name={focused ? "grid" : "grid-outline"} 
                size={24} 
                color={color} 
              />
            ),
          }}
        />
      </Tabs>
    </>
  );
}
```

## C:\Users\head user\Desktop\Hamthan\v3\AI-Operation-Kaizen\FullStack\frontend\app\(main)\profile.js

```javascript
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/theme/ThemeContext';
import { selectCurrentUser, logoutUser } from '../../src/store/slices/authSlice';
import Avatar from '../../src/components/common/Avatar';
import { ROLE_LABELS } from '../../src/utils/constants';

export default function ProfileScreen() {
  const { theme, isDark, toggleTheme } = useTheme();
  const router = useRouter();
  const dispatch = useDispatch();
  const user = useSelector(selectCurrentUser);

  const handleLogout = async () => {
    await dispatch(logoutUser());
    router.replace('/(auth)/login');
  };

  // Logic untouched
  const getStats = () => {
    switch (user?.role) {
      case 'manager':
        return [
          { label: 'Total Issues', value: '145', icon: 'document-text-outline' },
          { label: 'Escalations', value: '8', icon: 'warning-outline' },
          { label: 'Sites Monitored', value: '5', icon: 'business-outline' },
          { label: 'Resolution Rate', value: '87%', icon: 'analytics-outline' },
        ];
      case 'supervisor':
        return [
          { label: 'Issues Created', value: '45', icon: 'add-circle-outline' },
          { label: 'Pending Verifications', value: '3', icon: 'eye-outline' },
          { label: 'Complaints Raised', value: '7', icon: 'alert-circle-outline' },
          { label: 'My Sites', value: user?.sites?.length || '2', icon: 'business-outline' },
        ];
      case 'problem_solver':
        return [
          { label: 'Assigned', value: '3', icon: 'clipboard-outline' },
          { label: 'Completed Today', value: '2', icon: 'checkmark-done-outline' },
          { label: 'Total Completed', value: '156', icon: 'trophy-outline' },
          { label: 'Avg Time', value: '4.2 hrs', icon: 'time-outline' },
        ];
      default:
        return [];
    }
  };

  const stats = getStats();

  // Premium Palette
  const bgColor = isDark ? '#212121' : '#f9f9f9';
  const surfaceColor = isDark ? '#171717' : '#ffffff';
  const borderColor = isDark ? '#333333' : '#e5e5e5';
  const iconBg = isDark ? 'rgba(255,255,255,0.05)' : '#f4f4f4';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]}>
      
      {/* ── HEADER ── */}
      <View style={[styles.header, { backgroundColor: bgColor }]}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.6} style={styles.iconButton}>
          <Ionicons name="chevron-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Settings</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        
        {/* ── PROFILE IDENTITY ── */}
        <View style={styles.profileSection}>
          <View style={styles.avatarWrapper}>
            <Avatar uri={user?.avatar} name={user?.name} size="xlarge" />
            <View style={[styles.onlineIndicator, { borderColor: bgColor }]} />
          </View>
          <Text style={[styles.name, { color: theme.text }]}>{user?.name}</Text>
          <View style={[styles.roleBadge, { backgroundColor: isDark ? '#333' : '#e5e5e5' }]}>
            <Text style={[styles.roleText, { color: theme.textSecondary }]}>
              {ROLE_LABELS[user?.role] || user?.role?.toUpperCase()}
            </Text>
          </View>
        </View>

        {/* ── PERFORMANCE METRICS ── */}
        {stats.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Performance Metrics</Text>
            <View style={styles.statsGrid}>
              {stats.map((stat, index) => (
                <View key={index} style={[styles.statCard, { backgroundColor: surfaceColor, borderColor }]}>
                  <View style={[styles.statIconContainer, { backgroundColor: iconBg }]}>
                    <Ionicons name={stat.icon} size={18} color={theme.textSecondary} />
                  </View>
                  <View style={styles.statInfo}>
                    <Text style={[styles.statValue, { color: theme.text }]}>{stat.value}</Text>
                    <Text style={[styles.statLabel, { color: theme.textSecondary }]}>{stat.label}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ── ACCOUNT SETTINGS ── */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Account Details</Text>
          <View style={[styles.settingsGroup, { backgroundColor: surfaceColor, borderColor }]}>
            
            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <Ionicons name="call-outline" size={20} color={theme.textSecondary} />
                <Text style={[styles.settingText, { color: theme.text }]}>{user?.phone || 'No phone added'}</Text>
              </View>
            </View>

            <View style={[styles.separator, { backgroundColor: borderColor }]} />
            
            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <Ionicons name="mail-outline" size={20} color={theme.textSecondary} />
                <Text style={[styles.settingText, { color: theme.text }]}>{user?.email || 'No email added'}</Text>
              </View>
            </View>

          </View>
        </View>

        {/* ── PREFERENCES ── */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Preferences</Text>
          <View style={[styles.settingsGroup, { backgroundColor: surfaceColor, borderColor }]}>
            
            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <Ionicons name={isDark ? 'moon' : 'sunny'} size={20} color={theme.textSecondary} />
                <Text style={[styles.settingText, { color: theme.text }]}>Appearance</Text>
              </View>
              <View style={styles.settingRight}>
                <Text style={[styles.settingValue, { color: theme.textSecondary, marginRight: 8 }]}>
                  {isDark ? 'Dark' : 'Light'}
                </Text>
                <Switch
                  value={isDark}
                  onValueChange={toggleTheme}
                  trackColor={{ false: '#e5e5e5', true: '#10a37f' }} // OpenAI Green
                  thumbColor="#ffffff"
                  ios_backgroundColor="#e5e5e5"
                />
              </View>
            </View>

          </View>
        </View>

        {/* ── DANGER ZONE (Logout) ── */}
        <View style={styles.section}>
          <TouchableOpacity
            activeOpacity={0.7}
            style={[styles.logoutButton, { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.1)' : '#fef2f2', borderColor: isDark ? 'rgba(239, 68, 68, 0.2)' : '#fee2e2' }]}
            onPress={handleLogout}
          >
            <Ionicons name="log-out-outline" size={20} color="#ef4444" />
            <Text style={styles.logoutText}>Log Out</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  iconButton: {
    padding: 4,
    marginLeft: -4,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  placeholder: {
    width: 32,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  profileSection: {
    alignItems: 'center',
    marginBottom: 40,
    marginTop: 20,
  },
  avatarWrapper: {
    position: 'relative',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#10a37f', // Active Green
    borderWidth: 3,
  },
  name: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.5,
    marginTop: 16,
    marginBottom: 8,
  },
  roleBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8, // Modern squircle badge
  },
  roleText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 12,
    marginLeft: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  statCard: {
    width: '48%',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'column',
    alignItems: 'flex-start',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.02, shadowRadius: 4 },
      android: { elevation: 1 },
    }),
  },
  statIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8, // Squircle icon background
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statInfo: {
    width: '100%',
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.5,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  settingsGroup: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.02, shadowRadius: 4 },
      android: { elevation: 1 },
    }),
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingText: {
    fontSize: 15,
    fontWeight: '500',
  },
  settingValue: {
    fontSize: 15,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 48, // Indents separator to align with text, exactly like iOS/Native UI
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 8,
  },
  logoutText: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: '600',
  },
  bottomPadding: {
    height: 60,
  },
});
```

## C:\Users\head user\Desktop\Hamthan\v3\AI-Operation-Kaizen\FullStack\frontend\app\(main)\_layout.js

```javascript
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
```

## C:\Users\head user\Desktop\Hamthan\v3\AI-Operation-Kaizen\FullStack\frontend\app\index.js

```javascript
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
```

## C:\Users\head user\Desktop\Hamthan\v3\AI-Operation-Kaizen\FullStack\frontend\app\_layout.js

```javascript
import React, { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router'; // ✅ Added router hooks
import { Provider, useDispatch, useSelector } from 'react-redux'; // ✅ Added useSelector
import { store } from '../src/store';
import { ThemeProvider } from '../src/theme/ThemeContext';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet } from 'react-native';
import { checkAuthStatus, selectIsInitialized, selectIsAuthenticated } from '../src/store/slices/authSlice'; // ✅ Import upgraded Redux actions/selectors
import { SafeAreaProvider } from 'react-native-safe-area-context';

// ── IMPORT UPGRADED COMPONENTS ──
import Loader from '../src/components/common/Loader';
import OfflineBanner from '../src/components/common/OfflineBanner';
import useNetworkStatus from '../src/hooks/useNetworkStatus'; 

function AppContent() {
  const [isSplashVisible, setIsSplashVisible] = useState(true);
  const dispatch = useDispatch();
  const router = useRouter();
  const segments = useSegments();
  
  // ✅ Pull auth state from Redux
  const isInitialized = useSelector(selectIsInitialized);
  const isAuthenticated = useSelector(selectIsAuthenticated);
  
  // 🚀 ACTIVATE THE ENGINE: This hook now listens for network changes globally
  const { isConnected } = useNetworkStatus();

  // 1. Kick off Redux Auth Check on mount
  useEffect(() => {
    dispatch(checkAuthStatus()).finally(() => {
      // Keep your 500ms visual delay for a smooth entrance
      setTimeout(() => setIsSplashVisible(false), 500);
    });
  }, [dispatch]);

  // 2. THE AUTH GUARD (Stops the refresh bug)
  useEffect(() => {
    // Don't attempt to route until storage is checked and splash is done
    if (!isInitialized || isSplashVisible) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!isAuthenticated && !inAuthGroup) {
      // ❌ Not logged in? Protect the main screens and kick to login
      router.replace('/(auth)/login');
    } else if (isAuthenticated && inAuthGroup) {
      // ✅ Logged in but stuck on the login screen? Send to chat
      router.replace('/(main)/(tabs)/chat');
    }
  }, [isInitialized, isAuthenticated, segments, isSplashVisible]);

  // Show Loader while initializing
  if (!isInitialized || isSplashVisible) {
    return <Loader message="Making Your Work Easy..." fullScreen={true} />;
  }

  return (
    <>
      <StatusBar style="auto" />
      
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(main)" />
        <Stack.Screen name="index" />
      </Stack>

      {/* 🚀 GLOBAL UI LAYER */}
      <OfflineBanner />
    </>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider> 
        <Provider store={store}>
          <ThemeProvider>
            <AppContent />
          </ThemeProvider>
        </Provider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
```
