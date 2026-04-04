/**
 * src/components/chat/ChatInput.js
 *
 * WHAT CHANGED vs original:
 * 1. Added uploadImageToImageKit import from imagekitService
 * 2. Added uploadProgress state (0-100) for the upload progress bar
 * 3. requestMediaAndLocation() now calls ImageKit directly after picking
 * the image. Once the permanent URL is returned, it is stored in
 * `uploadedImageUrl` (separate from `selectedImage` which is the
 * local preview URI).
 * 4. handleSend() passes `uploadedImageUrl` (CDN URL) instead of the
 * local file URI — so the backend only ever sees the ImageKit URL.
 * 5. A thin progress bar appears at the top of the input bar during upload.
 * 6. The send button is disabled while an upload is in progress.
 * 7. 📍 ADDED CROSS-PLATFORM VOICE DICTATION: Dedicated mic button added next to Send.
 *
 * Everything else (action menu, location capture, offline guard, etc.)
 * is exactly the same as before.
 */

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Alert,
  Platform,
  Keyboard,
  Image,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { setLocation } from '../../store/slices/offlineSlice';
import { reverseGeocode } from '../../utils/locationCapture';
import { selectIsOnline } from '../../store/slices/offlineSlice';

// ── NEW: ImageKit direct upload ────────────────────────────────────
import { uploadImageToImageKit } from '../../services/imagekitService';

// ── 📍 NEW: Voice Import ──────────────────────────────────────────
import { startVoiceDictation, stopVoiceDictation, destroyVoiceDictation } from '../../utils/voiceUtils';

// ── Available actions (unchanged) ─────────────────────────────────
const ALL_ACTIONS = [
  { id: 'general_query', label: 'General Query', icon: 'chatbubbles-outline' },
  { id: 'sql_query', label: 'Database Query / Reports', icon: 'analytics-outline' },
  { id: 'create_issue', label: 'Report a problem at a site', icon: 'alert-circle-outline' },
  { id: 'approve_completion', label: 'Approve completed work', icon: 'checkmark-done-outline' },
  { id: 'update_priority', label: 'Change issue priority', icon: 'trending-up-outline' },
  { id: 'extend_deadlines', label: 'Extend deadline', icon: 'calendar-outline' },
  { id: 'solver_complete_work', label: 'Mark work as finished', icon: 'checkmark-circle-outline' },
  { id: 'solver_report_blocker', label: 'Report a blocker', icon: 'hand-left-outline' },
  { id: 'raise_complaint', label: 'Raise a complaint', icon: 'warning-outline' },
  { id: 'reassign_solver', label: 'Reassign solver', icon: 'people-outline' },
];

const ChatInput = ({ onSend, showCamera = true, userRole }) => {
  const { theme, isDark } = useTheme();
  const dispatch = useDispatch();

  const [message, setMessage] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);       // local preview URI
  const [uploadedImageUrl, setUploadedImageUrl] = useState(null); // permanent CDN URL
  const [uploadProgress, setUploadProgress] = useState(0);        // 0-100
  const [isUploading, setIsUploading] = useState(false);
  const [stagedLocation, setStagedLocation] = useState(null);
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);
  const isOnline = useSelector(selectIsOnline);
  const [inputHeight, setInputHeight] = useState(24);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [selectedAction, setSelectedAction] = useState(null);
  const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);
  
  // 📍 NEW: Voice State
  const [isListening, setIsListening] = useState(false);

  const sendScale = useRef(new Animated.Value(0)).current;
  const menuAnim = useRef(new Animated.Value(0)).current;
  const inputRef = useRef(null);

  const hasContent = message.trim().length > 0 || selectedImage !== null;
  // Can't send while an image is still uploading
  const canSend = hasContent && isOnline && !isUploading;

  const availableActions = useMemo(() => {
    const role = (userRole || '').toLowerCase().replace(/_/g, '');
    if (role === 'problemsolver') {
      return ALL_ACTIONS.filter(a => ['solver_complete_work', 'solver_report_blocker'].includes(a.id));
    }
    return ALL_ACTIONS;
  }, [userRole]);

  useEffect(() => {
    Animated.spring(sendScale, {
      toValue: hasContent ? 1 : 0,
      friction: 8,
      tension: 100,
      useNativeDriver: true,
    }).start();
  }, [hasContent, sendScale]);

  // 📍 CLEANUP VOICE ON UNMOUNT
  useEffect(() => {
    return () => destroyVoiceDictation();
  }, []);

  // 📍 VOICE TOGGLE FUNCTION
  const toggleListening = async () => {
    if (!isOnline) {
      Alert.alert('Offline', 'Speech recognition requires an internet connection.');
      return;
    }
    if (isListening) {
      await stopVoiceDictation();
      setIsListening(false);
    } else {
      if (Platform.OS === 'web') setMessage(''); // Clear box on web to prevent text jumping
      await startVoiceDictation(
        (results) => {
          if (Platform.OS === 'web') {
            setMessage(results[0]);
          } else {
            setMessage((prev) => (prev ? prev + ' ' : '') + results[0]);
          }
        },
        () => setIsListening(true),
        () => setIsListening(false)
      );
    }
  };

  const toggleAttachMenu = () => {
    if (!isOnline) {
      Alert.alert('Offline', 'Please reconnect to attach media.');
      return;
    }
    if (isActionMenuOpen) setIsActionMenuOpen(false);
    const toValue = isMenuOpen ? 0 : 1;
    setIsMenuOpen(!isMenuOpen);
    if (!isMenuOpen) Keyboard.dismiss();
    Animated.spring(menuAnim, { toValue, friction: 7, tension: 80, useNativeDriver: true }).start();
  };

  const closeMenu = () => {
    if (isMenuOpen) {
      setIsMenuOpen(false);
      Animated.spring(menuAnim, { toValue: 0, friction: 7, tension: 80, useNativeDriver: true }).start();
    }
  };

  const toggleActionMenu = () => {
    if (isMenuOpen) closeMenu();
    setIsActionMenuOpen(!isActionMenuOpen);
    if (!isActionMenuOpen) Keyboard.dismiss();
  };

  const removeStagedItems = () => {
    setSelectedImage(null);
    setUploadedImageUrl(null);
    setStagedLocation(null);
    setUploadProgress(0);
    setIsUploading(false);
  };

  // 📍 MADE ASYNC TO STOP LISTENING IF SENT
  const handleSend = async () => {
    if (canSend) {
      if (isListening) {
        await stopVoiceDictation();
        setIsListening(false);
      }

      let finalMessage = message.trim();
      if (selectedAction) {
        finalMessage = `${finalMessage}`;
      }

      const intentToSend = selectedAction?.id || 'general_query';

      // Pass the CDN URL (not the local URI) to the chat handler
      onSend(finalMessage, uploadedImageUrl, stagedLocation, intentToSend);

      setMessage('');
      setSelectedImage(null);
      setUploadedImageUrl(null);
      setStagedLocation(null);
      setSelectedAction(null);
      setIsActionMenuOpen(false);
      setUploadProgress(0);
      setInputHeight(24);
      if (inputRef.current) inputRef.current.blur();
    }
  };

  /**
   * Pick image from camera or gallery, then upload directly to ImageKit.
   * Shows a progress bar while uploading.
   */
  const requestMediaAndLocation = async (type) => {
    closeMenu();
    try {
      let imageUri = null;

      if (type === 'camera') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') return Alert.alert('Denied', 'We need camera access.');
        const result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 0.8,
        });
        if (!result.canceled) imageUri = result.assets[0].uri;
      } else if (type === 'gallery') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') return Alert.alert('Denied', 'We need gallery access.');
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 0.8,
        });
        if (!result.canceled) imageUri = result.assets[0].uri;
      }

      if (!imageUri) return;

      // Show local preview immediately while upload happens
      setSelectedImage(imageUri);
      setIsUploading(true);
      setUploadProgress(0);

      // ── Upload directly to ImageKit ────────────────────────────
      let cdnUrl = null;
      try {
        cdnUrl = await uploadImageToImageKit(imageUri, {
          imageType: 'BEFORE', // default; solver should pick AFTER separately if needed
          onProgress: (pct) => setUploadProgress(pct),
        });
        setUploadedImageUrl(cdnUrl);
      } catch (uploadError) {
        console.error('ImageKit upload failed:', uploadError);
        Alert.alert(
          'Upload Failed',
          'Could not upload the image. Please try again.',
          [{ text: 'OK' }]
        );
        // Clear the staged image so user can try again
        setSelectedImage(null);
        setIsUploading(false);
        setUploadProgress(0);
        return;
      } finally {
        setIsUploading(false);
      }

      // ── Capture location after image is staged ─────────────────
      setIsFetchingLocation(true);
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          const addr = await reverseGeocode(loc.coords.latitude, loc.coords.longitude);
          const locationData = { ...loc.coords, address: addr };
          setStagedLocation(locationData);
          dispatch(setLocation({
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
            timestamp: loc.timestamp,
          }));
        }
      } catch (locError) {
        // Location is optional — continue without it
      } finally {
        setIsFetchingLocation(false);
      }
    } catch (error) {
      setIsUploading(false);
      setIsFetchingLocation(false);
      Alert.alert('Error', 'An error occurred while accessing media.');
    }
  };

  // ── Color palette (unchanged) ──────────────────────────────────
  const inputBg = isDark ? '#1e1e1e' : '#f7f7f8';
  const inputBorder = isDark ? '#333333' : '#e2e2e5';
  const sendBg = isDark ? '#ffffff' : '#111111';
  const sendIconColor = isDark ? '#111111' : '#ffffff';
  const plusCircleBg = isDark ? '#2e2e2e' : '#ebebec';
  const menuBg = isDark ? '#1e1e1e' : '#ffffff';
  const wrapperBg = isDark ? '#1e1e1e' : '#fafafa';

  const rotatePlus = menuAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '45deg'] });
  const menuTranslateY = menuAnim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] });

  return (
    <View style={[styles.wrapper, { backgroundColor: wrapperBg }]}>

      {/* ── ACTION PILL AND DROPDOWN (unchanged) ── */}
      <View style={styles.actionPillContainer}>
        <TouchableOpacity
          style={[styles.actionPill, { backgroundColor: isDark ? '#2a2a2a' : '#ececed', borderColor: inputBorder }]}
          onPress={toggleActionMenu}
          activeOpacity={0.7}
        >
          <Ionicons
            name={selectedAction ? selectedAction.icon : 'flash'}
            size={14}
            color={selectedAction ? theme.primary : theme.textSecondary}
          />
          <Text style={[styles.actionPillText, { color: selectedAction ? theme.text : theme.textSecondary }]}>
            {selectedAction ? selectedAction.label : 'General Query'}
          </Text>
          <Ionicons name={isActionMenuOpen ? 'chevron-up' : 'chevron-down'} size={14} color={theme.textSecondary} />
        </TouchableOpacity>

        {isActionMenuOpen && (
          <View style={[styles.actionDropdownMenu, { backgroundColor: menuBg, borderColor: inputBorder }]}>
            <ScrollView
              style={styles.actionScroll}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled
            >
              <TouchableOpacity
                style={styles.actionItem}
                onPress={() => { setSelectedAction(null); setIsActionMenuOpen(false); }}
              >
                <Ionicons name="chatbubbles-outline" size={18} color={theme.textSecondary} />
                <Text style={[styles.actionItemText, { color: theme.textSecondary }]}>General Query (No Action)</Text>
              </TouchableOpacity>
              <View style={[styles.menuDivider, { backgroundColor: inputBorder }]} />
              {availableActions.map((action) => (
                <TouchableOpacity
                  key={action.id}
                  style={styles.actionItem}
                  onPress={() => { setSelectedAction(action); setIsActionMenuOpen(false); }}
                >
                  <Ionicons name={action.icon} size={18} color={theme.primary} />
                  <Text style={[styles.actionItemText, { color: theme.text }]}>{action.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
      </View>

      {/* ── FLOATING MEDIA MENU (unchanged) ── */}
      {showCamera && (
        <Animated.View
          style={[
            styles.floatingMenu,
            {
              backgroundColor: menuBg,
              borderColor: inputBorder,
              opacity: menuAnim,
              transform: [
                { translateY: menuTranslateY },
                { scale: menuAnim.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }) },
              ],
              pointerEvents: isMenuOpen ? 'auto' : 'none',
            },
          ]}
        >
          <TouchableOpacity style={styles.menuItem} onPress={() => requestMediaAndLocation('camera')}>
            <View style={[styles.menuIconBg, { backgroundColor: isDark ? '#2e2e2e' : '#f0f0f1' }]}>
              <Ionicons name="camera-outline" size={18} color={theme.text} />
            </View>
            <Text style={[styles.menuText, { color: theme.text }]}>Camera</Text>
          </TouchableOpacity>
          <View style={[styles.menuDivider, { backgroundColor: inputBorder }]} />
          <TouchableOpacity style={styles.menuItem} onPress={() => requestMediaAndLocation('gallery')}>
            <View style={[styles.menuIconBg, { backgroundColor: isDark ? '#2e2e2e' : '#f0f0f1' }]}>
              <Ionicons name="image-outline" size={18} color={theme.text} />
            </View>
            <Text style={[styles.menuText, { color: theme.text }]}>Upload Media</Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* ── MAIN INPUT BAR ── */}
      <View style={[styles.container, {
        backgroundColor: inputBg,
        borderColor: inputBorder,
        opacity: isOnline ? 1 : 0.55,
      }]}>

        {/* + Button */}
        {showCamera && (
          <TouchableOpacity style={styles.attachButton} activeOpacity={0.65} onPress={toggleAttachMenu}>
            <Animated.View style={[styles.attachCircle, { backgroundColor: plusCircleBg, transform: [{ rotate: rotatePlus }] }]}>
              <Ionicons name="add" size={20} color={theme.text} />
            </Animated.View>
          </TouchableOpacity>
        )}

        <View style={styles.inputInnerWrapper}>

          {/* Staged image preview + upload state */}
          {selectedImage && (
            <View style={styles.stagedContainer}>
              <View style={styles.previewWrapper}>
                <Image source={{ uri: selectedImage }} style={styles.previewImage} />

                {/* Upload progress overlay */}
                {isUploading && (
                  <View style={styles.uploadOverlay}>
                    <ActivityIndicator size="small" color="#ffffff" />
                    <Text style={styles.uploadPercent}>{uploadProgress}%</Text>
                  </View>
                )}

                {/* Uploaded checkmark */}
                {!isUploading && uploadedImageUrl && (
                  <View style={styles.uploadDoneIndicator}>
                    <Ionicons name="checkmark-circle" size={18} color="#10a37f" />
                  </View>
                )}

                {!isUploading && (
                  <TouchableOpacity style={styles.removeBtn} onPress={removeStagedItems}>
                    <View style={[styles.removeBtnInner, { backgroundColor: isDark ? '#1e1e1e' : '#fff' }]}>
                      <Ionicons name="close" size={11} color={theme.text} />
                    </View>
                  </TouchableOpacity>
                )}
              </View>

              {/* Location pill */}
              <View style={[styles.locationPill, { backgroundColor: isDark ? '#2a2a2a' : '#ececed' }]}>
                {isFetchingLocation ? (
                  <>
                    <ActivityIndicator size="small" color={theme.textSecondary} />
                    <Text style={[styles.locationPillText, { color: theme.textSecondary }]}>Locating...</Text>
                  </>
                ) : stagedLocation ? (
                  <>
                    <View style={styles.locationDot} />
                    <Text style={[styles.locationPillText, { color: theme.text }]} numberOfLines={1}>
                      {stagedLocation.address?.formattedAddress || 'Location Attached'}
                    </Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="location-outline" size={12} color={theme.textSecondary} />
                    <Text style={[styles.locationPillText, { color: theme.textSecondary }]}>No Location</Text>
                  </>
                )}
              </View>
            </View>
          )}

          {/* Upload progress bar (thin strip under staged image) */}
          {isUploading && (
            <View style={styles.progressBarTrack}>
              <View style={[styles.progressBarFill, { width: `${uploadProgress}%` }]} />
            </View>
          )}

          <TextInput
            ref={inputRef}
            style={[
              styles.input,
              { color: isListening ? '#10a37f' : theme.text, height: Math.max(24, inputHeight) },
              !showCamera && { paddingLeft: 14 },
            ]}
            placeholder={
              isListening 
                ? 'Listening... Speak now.'
                : isUploading
                ? 'Uploading image...'
                : isOnline
                ? 'Type to experience the power of AI'
                : 'Waiting for connection...'
            }
            editable={isOnline && !isUploading && !isListening}
            placeholderTextColor={isListening ? '#10a37f' : (isDark ? '#4a4a4a' : '#b0b0b8')}
            value={message}
            onChangeText={setMessage}
            onContentSizeChange={(e) =>
              setInputHeight(Math.max(24, Math.min(e.nativeEvent.contentSize.height, 120)))
            }
            onFocus={() => { closeMenu(); setIsActionMenuOpen(false); }}
            multiline
            maxLength={2000}
          />
        </View>

        {/* 📍 TWO BUTTON LAYOUT: MIC AND SEND */}
        <View style={styles.rightActionButtons}>
          
          {/* 1. Mic Button */}
          <TouchableOpacity
            style={[
              styles.micButton,
              { backgroundColor: isListening ? '#ef4444' : 'transparent' }
            ]}
            onPress={toggleListening}
          >
            <Ionicons 
              name={isListening ? "stop" : "mic"} 
              size={20} 
              color={isListening ? "#fff" : theme.textSecondary} 
            />
          </TouchableOpacity>

          {/* 2. Send button */}
          <Animated.View style={[styles.sendButtonWrapper, { transform: [{ scale: sendScale }], opacity: sendScale, width: hasContent ? 36 : 0 }]}>
            <TouchableOpacity
              style={[styles.sendButton, { backgroundColor: canSend ? sendBg : isDark ? '#2a2a2a' : '#e0e0e2' }]}
              onPress={handleSend}
              disabled={!canSend}
            >
              <Ionicons name="arrow-up" size={16} color={canSend ? sendIconColor : theme.textSecondary} />
            </TouchableOpacity>
          </Animated.View>
          
        </View>

      </View>

      {!isOnline && (
        <Text style={[styles.offlineLabel, { color: isDark ? '#555' : '#aaa' }]}>No connection</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 14 : 16,
    alignItems: 'center',
    width: '100%',
    position: 'relative',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(128,128,128,0.15)',
    zIndex: 9999,
    elevation: 9999,
  },
  actionPillContainer: {
    width: '100%',
    flexDirection: 'row',
    marginBottom: 8,
    zIndex: 9999,
  },
  actionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 6,
  },
  actionPillText: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  actionDropdownMenu: {
    position: 'absolute',
    bottom: '100%',
    left: 0,
    marginBottom: 4,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    maxHeight: 240,
    width: 280,
    zIndex: 10000,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.15, shadowRadius: 16 },
      android: { elevation: 8 },
    }),
  },
  actionScroll: { paddingVertical: 4 },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 12,
  },
  actionItemText: { fontSize: 14, fontWeight: '500', letterSpacing: -0.1 },
  floatingMenu: {
    position: 'absolute',
    bottom: '100%',
    left: 16,
    marginBottom: 8,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 4,
    paddingHorizontal: 4,
    width: 190,
    zIndex: 100,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.12, shadowRadius: 20 },
      android: { elevation: 10 },
    }),
  },
  menuDivider: { height: StyleSheet.hairlineWidth, marginHorizontal: 8 },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 10,
    gap: 10,
    borderRadius: 10,
  },
  menuIconBg: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuText: { fontSize: 14, fontWeight: '500', letterSpacing: -0.1 },
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 26,
    paddingRight: 6,
    paddingLeft: 2,
    paddingVertical: 6,
    width: '100%',
    maxWidth: 768,
    minHeight: 50,
    zIndex: 2,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 },
      android: { elevation: 2 },
    }),
  },
  attachButton: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingLeft: 7,
    marginBottom: 1,
  },
  attachCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputInnerWrapper: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'center',
  },
  stagedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
    marginLeft: 8,
    marginBottom: 6,
    flexWrap: 'wrap',
  },
  previewWrapper: {
    position: 'relative',
    width: 56,
    height: 56,
  },
  previewImage: {
    width: 56,
    height: 56,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(128,128,128,0.2)',
  },
  uploadOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 2,
  },
  uploadPercent: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
  },
  uploadDoneIndicator: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#fff',
    borderRadius: 9,
  },
  progressBarTrack: {
    height: 2,
    backgroundColor: 'rgba(128,128,128,0.2)',
    borderRadius: 1,
    marginHorizontal: 8,
    marginBottom: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#10a37f',
    borderRadius: 1,
  },
  removeBtn: {
    position: 'absolute',
    top: -6,
    right: -6,
  },
  removeBtnInner: {
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(128,128,128,0.25)',
  },
  locationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 20,
    gap: 5,
    maxWidth: '60%',
  },
  locationDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10a37f',
  },
  locationPillText: {
    fontSize: 11,
    fontWeight: '500',
    flexShrink: 1,
    letterSpacing: -0.1,
  },
  input: {
    fontSize: 15,
    lineHeight: 21,
    paddingHorizontal: 8,
    paddingTop: Platform.OS === 'ios' ? 7 : 5,
    paddingBottom: Platform.OS === 'ios' ? 7 : 5,
    marginVertical: 1,
    letterSpacing: -0.1,
  },
  
  // 📍 NEW CONTAINER FOR THE TWO BUTTONS
  rightActionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 1,
    marginRight: 1,
  },
  // 📍 MIC BUTTON STYLES
  micButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 4,
  },
  sendButtonWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  offlineLabel: {
    fontSize: 11,
    marginTop: 5,
    letterSpacing: 0.2,
  },
});

export default ChatInput;