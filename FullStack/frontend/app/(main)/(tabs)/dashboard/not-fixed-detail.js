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
  fetchDashboardIssueDetail, // 📍 SWAPPED IN NEW DYNAMIC THUNK
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
      // 📍 PASSED EXACT CARD TYPE
      dispatch(fetchDashboardIssueDetail({ cardType: 'pending-issues', issueId: parseInt(id) }));
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
        // 📍 PASSED EXACT CARD TYPE
        dispatch(fetchDashboardIssueDetail({ cardType: 'pending-issues', issueId: parseInt(id) })),
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