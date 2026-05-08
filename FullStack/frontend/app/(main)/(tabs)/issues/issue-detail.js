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
        } catch (e) {
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
  const isSupervisor = user?.role === 'supervisor';
  const isManager = user?.role === 'manager';

  const showMarkDoneBtn = isProblemSolver && issue.status === 'IN_PROGRESS';
  const showApproveBtn = (isSupervisor || isManager) && issue.status === 'RESOLVED_PENDING_REVIEW';

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