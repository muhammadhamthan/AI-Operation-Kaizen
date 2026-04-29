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