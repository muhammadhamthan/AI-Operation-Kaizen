import React, { useState, useRef, useEffect } from 'react';
import { useSelector } from 'react-redux';
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
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { useDispatch } from 'react-redux';
import { setLocation } from '../../store/slices/offlineSlice';
import { reverseGeocode } from '../../utils/locationCapture';
import { selectIsOnline } from '../../store/slices/offlineSlice';

const ChatInput = ({ onSend, showCamera = true }) => {
  const { theme, isDark } = useTheme();
  const dispatch = useDispatch();

  const [message, setMessage] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [stagedLocation, setStagedLocation] = useState(null);
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);
  const isOnline = useSelector(selectIsOnline);
  const [inputHeight, setInputHeight] = useState(24);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const sendScale = useRef(new Animated.Value(0)).current;
  const menuAnim = useRef(new Animated.Value(0)).current;
  const inputRef = useRef(null);

  const hasContent = message.trim().length > 0 || selectedImage !== null;
  const canSend = hasContent && isOnline;

  useEffect(() => {
    Animated.spring(sendScale, {
      toValue: hasContent ? 1 : 0,
      friction: 8,
      tension: 100,
      useNativeDriver: true,
    }).start();
  }, [hasContent, sendScale]);

  const toggleAttachMenu = () => {
    if (!isOnline) {
      Alert.alert("Offline", "Please reconnect to attach media.");
      return;
    }
    const toValue = isMenuOpen ? 0 : 1;
    setIsMenuOpen(!isMenuOpen);
    if (!isMenuOpen) Keyboard.dismiss();

    Animated.spring(menuAnim, {
      toValue,
      friction: 7,
      tension: 80,
      useNativeDriver: true,
    }).start();
  };

  const closeMenu = () => {
    if (isMenuOpen) {
      setIsMenuOpen(false);
      Animated.spring(menuAnim, {
        toValue: 0,
        friction: 7,
        tension: 80,
        useNativeDriver: true,
      }).start();
    }
  };

  useEffect(() => {
    console.log("📍 Captured Location Data:", stagedLocation);
  }, [stagedLocation]);

  const removeStagedItems = () => {
    setSelectedImage(null);
    setStagedLocation(null);
  };

  const handleSend = () => {
    if (canSend) {
      onSend(message.trim(), selectedImage, stagedLocation);
      setMessage('');
      setSelectedImage(null);
      setStagedLocation(null);
      setInputHeight(24);
      if (inputRef.current) inputRef.current.blur();
    }
  };

  const requestMediaAndLocation = async (type) => {
    closeMenu();
    try {
      let imageUri = null;

      if (type === 'camera') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') return Alert.alert('Denied', 'We need camera access.');
        const result = await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 });
        if (!result.canceled) imageUri = result.assets[0].uri;
      } else if (type === 'gallery') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') return Alert.alert('Denied', 'We need gallery access.');
        const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 });
        if (!result.canceled) imageUri = result.assets[0].uri;
      }

      if (imageUri) {
        setSelectedImage(imageUri);
        setIsFetchingLocation(true);

        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          const addr = await reverseGeocode(loc.coords.latitude, loc.coords.longitude);

          const locationData = { ...loc.coords, address: addr };
          setStagedLocation(locationData);

          dispatch(setLocation({
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
            timestamp: loc.timestamp,
          }));
        }
        setIsFetchingLocation(false);
      }
    } catch (error) {
      setIsFetchingLocation(false);
      Alert.alert('Error', 'An error occurred while accessing media or location.');
    }
  };

  // ── Color Palette ──
  const inputBg = isDark ? '#1e1e1e' : '#f7f7f8';
  const inputBorder = isDark ? '#333333' : '#e2e2e5';
  const inputBorderFocused = isDark ? '#555555' : '#c8c8d0';
  const sendBg = isDark ? '#ffffff' : '#111111';
  const sendIconColor = isDark ? '#111111' : '#ffffff';
  const plusCircleBg = isDark ? '#2e2e2e' : '#ebebec';
  const menuBg = isDark ? '#1e1e1e' : '#ffffff';
  const wrapperBg = isDark ? '#1e1e1e' : '#fafafa';

  const rotatePlus = menuAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '45deg'] });
  const menuTranslateY = menuAnim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] });

  return (
    <View style={[styles.wrapper, { backgroundColor: wrapperBg }]}>

      {/* ── Floating Menu ── */}
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
                { scale: menuAnim.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }) }
              ],
              pointerEvents: isMenuOpen ? 'auto' : 'none',
            }
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

      {/* ── Main Input Bar ── */}
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

        {/* Inner Wrapper */}
        <View style={styles.inputInnerWrapper}>

          {/* Staged Items */}
          {selectedImage && (
            <View style={styles.stagedContainer}>
              <View style={styles.previewWrapper}>
                <Image source={{ uri: selectedImage }} style={styles.previewImage} />
                <TouchableOpacity style={styles.removeBtn} onPress={removeStagedItems}>
                  <View style={[styles.removeBtnInner, { backgroundColor: isDark ? '#1e1e1e' : '#fff' }]}>
                    <Ionicons name="close" size={11} color={theme.text} />
                  </View>
                </TouchableOpacity>
              </View>

              {/* Location Pill */}
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

          <TextInput
            ref={inputRef}
            style={[
              styles.input,
              { color: theme.text, height: Math.max(24, inputHeight) },
              !showCamera && { paddingLeft: 14 }
            ]}
            placeholder={isOnline ? "Type to experience the power of AI" : "Waiting for connection..."}
            editable={isOnline}
            placeholderTextColor={isDark ? '#4a4a4a' : '#b0b0b8'}
            value={message}
            onChangeText={setMessage}
            onContentSizeChange={(e) => setInputHeight(Math.max(24, Math.min(e.nativeEvent.contentSize.height, 120)))}
            onFocus={closeMenu}
            multiline
            maxLength={2000}
          />
        </View>

        {/* Send Button */}
        <Animated.View style={[styles.sendButtonWrapper, { transform: [{ scale: sendScale }], opacity: sendScale, width: hasContent ? 36 : 0 }]}>
          <TouchableOpacity style={[styles.sendButton, { backgroundColor: canSend ? sendBg : isDark ? '#2a2a2a' : '#e0e0e2' }]} onPress={handleSend} disabled={!hasContent}>
            <Ionicons name="arrow-up" size={16} color={canSend ? sendIconColor : theme.textSecondary} />
          </TouchableOpacity>
        </Animated.View>
      </View>

      {/* Offline label */}
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
    // Top separator line
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(128,128,128,0.15)',
  },

  // Floating Menu — cleaner card
  floatingMenu: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 82 : 86,
    left: 16,
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
  menuDivider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 8,
  },
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
  menuText: {
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: -0.1,
  },

  // Main container — pill shape with hairline border
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

  // Staged items
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

  // Text input
  input: {
    fontSize: 15,
    lineHeight: 21,
    paddingHorizontal: 8,
    paddingTop: Platform.OS === 'ios' ? 7 : 5,
    paddingBottom: Platform.OS === 'ios' ? 7 : 5,
    marginVertical: 1,
    letterSpacing: -0.1,
  },

  // Send button
  sendButtonWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 1,
    marginRight: 1,
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