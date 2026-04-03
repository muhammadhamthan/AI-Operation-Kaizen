
## C:\Users\head user\Desktop\Hamthan\v3\AI-Operation-Kaizen\FullStack\frontend\src\components\chat\ChatHistorySidebar.js

```javascript
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { formatRelativeTime } from '../../utils/formatters';

const ChatHistorySidebar = ({ conversations, onSelectConversation, onNewChat, selectedId }) => {
  const { theme, isDark } = useTheme();

  // OpenAI's specific color palette for the sidebar
  const sidebarBg = isDark ? '#171717' : '#f9f9f9';
  const selectedBg = isDark ? '#2a2a2a' : '#ececec'; // Soft selection color
  const textColor = isDark ? '#ececec' : '#0d0d0d';
  const mutedColor = isDark ? '#8e8ea0' : '#8e8ea0'; // OpenAI uses this exact gray for both modes
  const borderColor = isDark ? '#2f2f2f' : '#e5e5e5';

  const renderItem = ({ item }) => {
    const isSelected = selectedId === item.id;

    // Helper to format just the time from a timestamp string
    const formatTimeOnly = (dateString) => {
      if (!dateString) return '';
      const date = new Date(dateString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    return (
      <TouchableOpacity
        style={[
          styles.item,
          { backgroundColor: isSelected ? selectedBg : 'transparent' },
        ]}
        onPress={() => onSelectConversation(item.id)}
        activeOpacity={0.7}
      >
        <Ionicons
          name={isSelected ? 'chatbubble' : 'chatbubble-outline'}
          size={18}
          color={isSelected ? textColor : mutedColor}
          style={styles.itemIcon}
        />
        <View style={styles.itemContent}>
          <Text
            style={[
              styles.itemText,
              {
                color: isSelected ? textColor : textColor, // Unselected still uses main text color
                fontWeight: isSelected ? '600' : '400',
              },
            ]}
            numberOfLines={1}
          >
            {item.title}
          </Text>
          <View style={styles.metaRow}>
            <Text style={[styles.timeText, { color: mutedColor }]}>
              {formatRelativeTime(item.created_at)}
            </Text>
            
            {/* 📍 NEW: Displaying the Last Updated Time */}
            {item.updated_at && (
              <>
                <Text style={[styles.timeDivider, { color: mutedColor }]}> • </Text>
                <Text style={[styles.timeText, { color: mutedColor }]}>
                  {formatTimeOnly(item.updated_at)}
                </Text>
              </>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <View style={[styles.emptyIconWrapper, { backgroundColor: 'transparent' }]}>
        <Ionicons name="chatbox-outline" size={32} color={mutedColor} />
      </View>
      <Text style={[styles.emptyTitle, { color: textColor }]}>No conversations</Text>
      <Text style={[styles.emptySubtitle, { color: mutedColor }]}>
        Start a new chat to get help
      </Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: sidebarBg }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={[styles.headerIconWrapper, { backgroundColor: isDark ? '#ffffff' : '#000000' }]}>
            <Ionicons name="sparkles" size={14} color={isDark ? '#000000' : '#ffffff'} />
          </View>
          <Text style={[styles.title, { color: textColor }]}>New chat</Text>
        </View>

        <TouchableOpacity
          style={styles.newButton}
          onPress={onNewChat}
          activeOpacity={0.6}
        >
          <Ionicons name="create-outline" size={22} color={textColor} />
        </TouchableOpacity>
      </View>

      {/* Conversations count */}
      {conversations?.length > 0 && (
        <View style={styles.countRow}>
          <Text style={[styles.countText, { color: mutedColor }]}>
            Previous 7 Days
          </Text>
        </View>
      )}

      {/* List */}
      <FlatList
        data={conversations}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()} // Ensure ID is a string for key
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.list,
          !conversations?.length && styles.listEmpty,
        ]}
        ListEmptyComponent={renderEmpty}
        ItemSeparatorComponent={() => (
          // Replaced hard lines with invisible spacing to match ChatGPT's modern look
          <View style={styles.separator} />
        )}
      />

      {/* Footer */}
      <View style={[styles.footer, { backgroundColor: sidebarBg }]}>
        <Ionicons name="information-circle-outline" size={14} color={mutedColor} />
        <Text style={[styles.footerText, { color: mutedColor }]}>
          Conversations are secured.
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    // Removed borderBottomWidth for a seamless look
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIconWrapper: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  newButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },

  countRow: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: 8,
  },
  countText: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.3,
  },

  list: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  listEmpty: {
    flex: 1,
  },
  separator: {
    height: 2, // Invisible spacing instead of a solid line
    backgroundColor: 'transparent',
  },

  item: {
    flexDirection: 'row',
    alignItems: 'center', // Centered vertically
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8, // Softer rounding for list items
    marginVertical: 1,
  },
  itemIcon: {
    flexShrink: 0,
  },
  itemContent: {
    flex: 1,
    gap: 4,
  },
  itemText: {
    fontSize: 14,
    lineHeight: 18,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeText: {
    fontSize: 12,
    fontWeight: '400',
  },
  timeDivider: {
    fontSize: 10,
    marginHorizontal: 4,
    opacity: 0.5,
  },

  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    gap: 8,
    paddingBottom: 40, // Lifted slightly
  },
  emptyIconWrapper: {
    width: 56,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },

  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 16,
    paddingHorizontal: 14,
    // Removed top border, seamlessly blends with background
  },
  footerText: {
    fontSize: 12,
    fontWeight: '400',
  },
});

export default ChatHistorySidebar;
```

## C:\Users\head user\Desktop\Hamthan\v3\AI-Operation-Kaizen\FullStack\frontend\src\components\chat\ChatInput.js

```javascript
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
  ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { setLocation } from '../../store/slices/offlineSlice';
import { reverseGeocode } from '../../utils/locationCapture';
import { selectIsOnline } from '../../store/slices/offlineSlice';

// 📍 THE AVAILABLE ACTIONS
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
  const [selectedImage, setSelectedImage] = useState(null);
  const [stagedLocation, setStagedLocation] = useState(null);
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);
  const isOnline = useSelector(selectIsOnline);
  const [inputHeight, setInputHeight] = useState(24);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // 📍 ACTION MENU STATES
  const [selectedAction, setSelectedAction] = useState(null);
  const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);

  const sendScale = useRef(new Animated.Value(0)).current;
  const menuAnim = useRef(new Animated.Value(0)).current;
  const inputRef = useRef(null);

  const hasContent = message.trim().length > 0 || selectedImage !== null;
  const canSend = hasContent && isOnline;

  // 📍 DYNAMIC ROLE FILTERING
  const availableActions = useMemo(() => {
    const role = (userRole || '').toLowerCase().replace(/_/g, '');
    if (role === 'problemsolver') {
      return ALL_ACTIONS.filter(a => ['solver_complete_work', 'solver_report_blocker'].includes(a.id));
    }
    return ALL_ACTIONS; // Managers and Supervisors see everything
  }, [userRole]);

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
    if (isActionMenuOpen) setIsActionMenuOpen(false); // Close other menu
    
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

  const toggleActionMenu = () => {
    if (isMenuOpen) closeMenu(); // Close attachment menu
    setIsActionMenuOpen(!isActionMenuOpen);
    if (!isActionMenuOpen) Keyboard.dismiss();
  };

  const removeStagedItems = () => {
    setSelectedImage(null);
    setStagedLocation(null);
  };

  const handleSend = () => {
    if (canSend) {
      // 📍 ATTACH ACTION INTENT TO STRING
      let finalMessage = message.trim();
      if (selectedAction) {
        finalMessage = `[Action: ${selectedAction.id}]\n${finalMessage}`;
      }

      // 📍 LOGGING PAYLOAD FOR BACKEND VISIBILITY
      console.log("\n=============================================");
      console.log("🚀 SENDING PAYLOAD TO BACKEND:");
      console.log(`Text Sent:  \n${finalMessage}`);
      console.log(`Image URI:  ${selectedImage ? selectedImage : 'None'}`);
      console.log(`Location:   ${stagedLocation ? `Lat: ${stagedLocation.latitude}, Lon: ${stagedLocation.longitude}` : 'None'}`);
      console.log("=============================================\n");

      const intentToSend = selectedAction?.id || "general_query";
      onSend(finalMessage, selectedImage, stagedLocation, intentToSend);
      console.log("=============================================",selectedAction?.id); // by hamthan , selectedAction?.id
      
      // Cleanup States
      setMessage('');
      setSelectedImage(null);
      setStagedLocation(null);
      setSelectedAction(null); 
      setIsActionMenuOpen(false);
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
  const sendBg = isDark ? '#ffffff' : '#111111';
  const sendIconColor = isDark ? '#111111' : '#ffffff';
  const plusCircleBg = isDark ? '#2e2e2e' : '#ebebec';
  const menuBg = isDark ? '#1e1e1e' : '#ffffff';
  const wrapperBg = isDark ? '#1e1e1e' : '#fafafa';

  const rotatePlus = menuAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '45deg'] });
  const menuTranslateY = menuAnim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] });

  return (
    <View style={[styles.wrapper, { backgroundColor: wrapperBg }]}>

      {/* ── ACTION PILL AND DROPDOWN ── */}
      <View style={styles.actionPillContainer}>
        <TouchableOpacity 
          style={[styles.actionPill, { backgroundColor: isDark ? '#2a2a2a' : '#ececed', borderColor: inputBorder }]} 
          onPress={toggleActionMenu}
          activeOpacity={0.7}
        >
          <Ionicons name={selectedAction ? selectedAction.icon : "flash"} size={14} color={selectedAction ? theme.primary : theme.textSecondary} />
          <Text style={[styles.actionPillText, { color: selectedAction ? theme.text : theme.textSecondary }]}>
            {selectedAction ? selectedAction.label : "General Query"}
          </Text>
          <Ionicons name={isActionMenuOpen ? "chevron-up" : "chevron-down"} size={14} color={theme.textSecondary} />
        </TouchableOpacity>

        {isActionMenuOpen && (
          <View style={[styles.actionDropdownMenu, { backgroundColor: menuBg, borderColor: inputBorder }]}>
            <ScrollView 
              style={styles.actionScroll} 
              keyboardShouldPersistTaps="handled" 
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled={true} // 📍 FIX: Enables inner scrolling on Android
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

      {/* ── Floating Media Menu ── */}
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
            onFocus={() => { closeMenu(); setIsActionMenuOpen(false); }}
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
      web: { boxShadow: '0px 6px 16px rgba(0,0,0,0.15)' } 
    }),
  },
  actionScroll: {
    paddingVertical: 4,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 12,
  },
  actionItemText: {
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: -0.1,
  },

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
      web: { boxShadow: '0px 6px 16px rgba(0,0,0,0.15)' }
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
```

## C:\Users\head user\Desktop\Hamthan\v3\AI-Operation-Kaizen\FullStack\frontend\src\components\chat\ChatMessage.js

```javascript
import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard'; // 📍 IMPORTED CLIPBOARD
import { useTheme } from '../../theme/ThemeContext';
import { formatRelativeTime } from '../../utils/formatters';

// NEW: Added `image` to the destructured props
const ChatMessage = ({ message, image, isUser, timestamp, status = 'sent' }) => {
  const { theme, isDark } = useTheme();
  
  // 📍 STATE for copy animation
  const [copied, setCopied] = useState(false);

  // Smart detection: Handle legacy cases where the image URI is passed as the message string
  const isMessageStringAnImage = 
    typeof message === 'string' &&
    (message.startsWith('file://') || 
     message.startsWith('content://') || 
     message.match(/\.(jpeg|jpg|gif|png)$/i));

  // Determine exactly what to render
  const imageUrl = image || (isMessageStringAnImage ? message : null);
  const textContent = isMessageStringAnImage ? null : message;

  // Exact ChatGPT Color Palette
  const userBubbleBg = isDark ? '#2f2f2f' : '#f4f4f4';
  const aiAvatarBg = isDark ? '#ffffff' : '#000000';
  const aiIconColor = isDark ? '#000000' : '#ffffff';

  // 📍 COPY FUNCTION
  const handleCopy = async () => {
    if (!textContent) return;
    await Clipboard.setStringAsync(textContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000); // Reset after 2 seconds
  };

  return (
    <View style={[styles.container, isUser ? styles.userContainer : styles.aiContainer]}>
      
      {/* ── AI Avatar (ChatGPT 4o Style) ── */}
      {!isUser && (
        <View style={[styles.avatar, { backgroundColor: aiAvatarBg }]}>
          <Ionicons name="sparkles" size={16} color={aiIconColor} />
        </View>
      )}

      <View style={[styles.contentWrapper, isUser ? styles.userContentWrapper : styles.aiContentWrapper]}>
        
        {/* Label (ChatGPT removed these for a cleaner look, so we make it super subtle) */}
        {!isUser && (
          <Text style={[styles.label, { color: theme.textSecondary }]}>Kairox Ai Opex AI</Text>
        )}

        {/* ── Message Bubble ── */}
        <View
          style={[
            styles.bubble,
            isUser ? [styles.userBubble, { backgroundColor: userBubbleBg }] : styles.aiBubble,
          ]}
        >
          {/* 1. Render Image if it exists */}
          {imageUrl && (
            <Image 
              source={{ uri: imageUrl }} 
              style={styles.mediaImage} 
              resizeMode="cover"
            />
          )}

          {/* 2. Render Text if it exists */}
          {textContent ? (
            <Text 
              style={[
                styles.text, 
                { 
                  color: theme.text,
                  // Add margin to separate text from image if BOTH exist
                  marginTop: imageUrl ? 10 : 0 
                }
              ]}
            >
              {textContent}
            </Text>
          ) : null}
        </View>

        {/* ── Footer: Timestamp & Read Receipts ── */}
        <View style={[styles.footer, isUser ? styles.footerUser : styles.footerAi]}>
          {timestamp && (
            <Text style={[styles.timestamp, { color: theme.textSecondary }]}>
              {formatRelativeTime(timestamp)}
            </Text>
          )}

          {/* 📍 NEW COPY BUTTON */}
          {textContent && (
            <TouchableOpacity 
              onPress={handleCopy} 
              activeOpacity={0.6} 
              style={styles.copyButton}
            >
              <Ionicons 
                name={copied ? "checkmark-done" : "copy-outline"} 
                size={12} 
                color={copied ? "#10a37f" : theme.textSecondary} 
              />
              {copied && <Text style={[styles.copiedText, { color: "#10a37f" }]}>Copied</Text>}
            </TouchableOpacity>
          )}

          {isUser && status && (
            <View style={styles.statusContainer}>
              {status === 'sending' && (
                <Ionicons name="time-outline" size={12} color={theme.textSecondary} />
              )}
              {status === 'sent' && (
                <Ionicons name="checkmark" size={12} color={theme.textSecondary} />
              )}
              {status === 'delivered' && (
                <Ionicons name="checkmark-done" size={12} color={theme.textSecondary} />
              )}
              {status === 'read' && (
                <Ionicons name="checkmark-done" size={12} color="#10a37f" /> // OpenAI Green
              )}
            </View>
          )}
        </View>

      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginVertical: 14, 
    paddingHorizontal: 16,
  },
  userContainer: {
    justifyContent: 'flex-end',
  },
  aiContainer: {
    justifyContent: 'flex-start',
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14, 
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 2, 
  },
  contentWrapper: {
    flexShrink: 1,
  },
  userContentWrapper: {
    maxWidth: '85%', 
  },
  aiContentWrapper: {
    maxWidth: '90%', 
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
    opacity: 0.5, 
  },
  bubble: {
    // Pure flat UI
  },
  userBubble: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20, 
    borderBottomRightRadius: 6, 
  },
  aiBubble: {
    paddingHorizontal: 0, 
    paddingVertical: 4,
    backgroundColor: 'transparent', 
  },
  mediaImage: {
    width: 220,
    height: 280,
    borderRadius: 12, // Slightly tighter curves to fit inside the bubble natively
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)', 
  },
  text: {
    fontSize: 16, 
    lineHeight: 24, 
    letterSpacing: 0.1,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  footerUser: {
    justifyContent: 'flex-end',
  },
  footerAi: {
    justifyContent: 'flex-start',
  },
  timestamp: {
    fontSize: 11,
    fontWeight: '400',
    opacity: 0.6,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 2,
  },
  // 📍 NEW STYLES FOR COPY BUTTON
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginLeft: 4,
  },
  copiedText: {
    fontSize: 11,
    fontWeight: '600',
  },
});

export default ChatMessage;
```

## C:\Users\head user\Desktop\Hamthan\v3\AI-Operation-Kaizen\FullStack\frontend\src\components\chat\NotificationBanner.js

```javascript
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { navigateToNotification, getNavigationPreview } from '../../utils/notificationNavigation';

const NotificationBanner = ({ count, notifications = [], onPress, onDismiss, onMarkRead }) => {
  const { theme, isDark } = useTheme();
  const [showList, setShowList] = useState(false);

  if (!count || count === 0) return null;

  const handleBannerPress = () => {
    if (notifications.length > 0) {
      setShowList(true);
    } else {
      onPress?.();
    }
  };

  const handleNotificationPress = (notification) => {
    onMarkRead?.(notification.id);
    navigateToNotification(notification);
    setShowList(false);
  };

  const getNotificationIcon = (type) => {
    const icons = {
      issue_created: 'document-text',
      issue_assigned: 'person-add',
      issue_status_changed: 'sync',
      issue_escalated: 'warning',
      issue_completed: 'checkmark-circle',
      issue_reopened: 'refresh-circle',
      complaint_created: 'alert-circle',
      complaint_resolved: 'shield-checkmark',
      chat_message: 'chatbubble',
      overdue_issues: 'time',
      daily_summary: 'bar-chart',
    };
    return icons[type] || 'notifications';
  };

  // Exact ChatGPT-style colors
  const bannerBg = isDark ? '#2f2f2f' : '#f4f4f4'; // Soft flat gray
  const modalBg = isDark ? '#212121' : '#ffffff';
  const modalOverlayBg = isDark ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0.3)';
  const unreadBg = isDark ? '#343541' : '#f7f7f8'; // OpenAI's specific alternating row colors
  const borderColor = isDark ? '#424242' : '#e5e5e5';
  const accentColor = '#10a37f'; // The official OpenAI Green

  const renderNotificationItem = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.notificationItem,
        {
          backgroundColor: item.read ? 'transparent' : unreadBg,
        },
      ]}
      onPress={() => handleNotificationPress(item)}
      activeOpacity={0.7}
    >
      <View style={[styles.notificationDot, { backgroundColor: item.read ? 'transparent' : accentColor }]} />
      <View style={styles.notificationContent}>
        <Text style={[styles.notificationTitle, { color: theme.text }]} numberOfLines={1}>
          {item.title || item.message}
        </Text>
        <Text style={[styles.notificationBody, { color: theme.textSecondary }]} numberOfLines={2}>
          {item.body || getNavigationPreview(item)}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} />
    </TouchableOpacity>
  );

  return (
    <>
      {/* ── Banner — subtle inline strip ── */}
      <TouchableOpacity
        style={[
          styles.banner,
          {
            backgroundColor: bannerBg,
            // Removed borders entirely for the "flat" look
          },
        ]}
        onPress={handleBannerPress}
        activeOpacity={0.8}
      >
        <View style={styles.bannerLeft}>
          <View style={[styles.bannerDot, { backgroundColor: accentColor }]} />
          <Text style={[styles.bannerText, { color: theme.text }]}>
            {count} new notification{count > 1 ? 's' : ''}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.bannerClose}
          onPress={(e) => {
            e.stopPropagation();
            onDismiss?.();
          }}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="close" size={18} color={theme.textSecondary} />
        </TouchableOpacity>
      </TouchableOpacity>

      {/* ── Notifications Modal ── */}
      <Modal
        visible={showList}
        transparent
        animationType="fade"
        onRequestClose={() => setShowList(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: modalOverlayBg }]}>
          <View style={[styles.modalContent, { backgroundColor: modalBg, borderColor: borderColor }]}>
            
            {/* Modal Header */}
            <View style={[styles.modalHeader, { borderBottomColor: borderColor }]}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Notifications</Text>
              <TouchableOpacity
                onPress={() => setShowList(false)}
                style={styles.modalClose}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={22} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Notification List */}
            <FlatList
              data={notifications}
              keyExtractor={(item) => item.id.toString()}
              renderItem={renderNotificationItem}
              contentContainerStyle={styles.listContent}
              ItemSeparatorComponent={() => (
                <View style={styles.separator} /> // Invisible spacer instead of lines
              )}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Ionicons name="notifications-outline" size={32} color={theme.textSecondary} style={{ opacity: 0.5 }} />
                  <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                    No notifications
                  </Text>
                </View>
              }
            />
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  // ── Banner ────────
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12, // Slightly taller
    paddingHorizontal: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12, // Soft rounded corners
  },
  bannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  bannerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  bannerText: {
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  bannerClose: {
    padding: 2,
  },

  // ── Modal ────────
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    borderRadius: 16, // Beautiful large curves
    borderWidth: 1, // Subtle border helps it pop without shadows
    width: '100%',
    maxWidth: 480,
    maxHeight: '75%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  modalClose: {
    padding: 4,
    borderRadius: 8,
  },

  // ── Notification Items ────────
  listContent: {
    padding: 8,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center', // Centers dot, text, and chevron vertically
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12, // Soft item curves
    gap: 14,
  },
  notificationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    flexShrink: 0,
  },
  notificationContent: {
    flex: 1,
    gap: 4, // Space between title and body
  },
  notificationTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  notificationBody: {
    fontSize: 13,
    lineHeight: 18,
  },
  separator: {
    height: 4, // Using invisible gap spacing instead of hard lines
    backgroundColor: 'transparent',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
  },
});

export default NotificationBanner;
```

## C:\Users\head user\Desktop\Hamthan\v3\AI-Operation-Kaizen\FullStack\frontend\src\components\common\AnimatedButton.js

```javascript
import React, { useRef } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  Animated,
  ActivityIndicator,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { mediumImpact } from '../../utils/haptics';

/**
 * Animated Button with haptic feedback
 * 
 * @param {string} title - Button text
 * @param {Function} onPress - Press handler
 * @param {string} variant - 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
 * @param {string} size - 'small' | 'medium' | 'large'
 * @param {string} icon - Ionicons icon name
 * @param {boolean} loading - Show loading indicator
 * @param {boolean} disabled - Disable button
 * @param {boolean} fullWidth - Take full width
 * @param {Object} style - Additional styles
 */
const AnimatedButton = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  icon,
  iconPosition = 'left',
  loading = false,
  disabled = false,
  fullWidth = false,
  haptic = true,
  style,
}) => {
  const { theme } = useTheme();
  const scaleValue = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleValue, {
      toValue: 0.96,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleValue, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  };

  const handlePress = () => {
    if (haptic) {
      mediumImpact();
    }
    onPress?.();
  };

  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return {
          button: { backgroundColor: theme.primary },
          text: { color: '#ffffff' },
          icon: '#ffffff',
        };
      case 'secondary':
        return {
          button: { backgroundColor: theme.inputBackground },
          text: { color: theme.text },
          icon: theme.text,
        };
      case 'outline':
        return {
          button: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: theme.primary },
          text: { color: theme.primary },
          icon: theme.primary,
        };
      case 'ghost':
        return {
          button: { backgroundColor: 'transparent' },
          text: { color: theme.primary },
          icon: theme.primary,
        };
      case 'danger':
        return {
          button: { backgroundColor: '#ef4444' },
          text: { color: '#ffffff' },
          icon: '#ffffff',
        };
      default:
        return {
          button: { backgroundColor: theme.primary },
          text: { color: '#ffffff' },
          icon: '#ffffff',
        };
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return {
          button: { paddingVertical: 8, paddingHorizontal: 14 },
          text: { fontSize: 13 },
          iconSize: 16,
        };
      case 'large':
        return {
          button: { paddingVertical: 16, paddingHorizontal: 24 },
          text: { fontSize: 17 },
          iconSize: 22,
        };
      default:
        return {
          button: { paddingVertical: 12, paddingHorizontal: 20 },
          text: { fontSize: 15 },
          iconSize: 18,
        };
    }
  };

  const variantStyles = getVariantStyles();
  const sizeStyles = getSizeStyles();

  const isDisabled = disabled || loading;

  return (
    <Animated.View style={[{ transform: [{ scale: scaleValue }] }, fullWidth && styles.fullWidth]}>
      <TouchableOpacity
        style={[
          styles.button,
          variantStyles.button,
          sizeStyles.button,
          fullWidth && styles.fullWidth,
          isDisabled && styles.disabled,
          style,
        ]}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={isDisabled}
        activeOpacity={0.8}
      >
        {loading ? (
          <ActivityIndicator size="small" color={variantStyles.icon} />
        ) : (
          <View style={styles.content}>
            {icon && iconPosition === 'left' && (
              <Ionicons
                name={icon}
                size={sizeStyles.iconSize}
                color={isDisabled ? theme.textSecondary : variantStyles.icon}
                style={styles.iconLeft}
              />
            )}
            {title && (
              <Text
                style={[
                  styles.text,
                  variantStyles.text,
                  sizeStyles.text,
                  isDisabled && { color: theme.textSecondary },
                ]}
              >
                {title}
              </Text>
            )}
            {icon && iconPosition === 'right' && (
              <Ionicons
                name={icon}
                size={sizeStyles.iconSize}
                color={isDisabled ? theme.textSecondary : variantStyles.icon}
                style={styles.iconRight}
              />
            )}
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  fullWidth: {
    width: '100%',
  },
  disabled: {
    opacity: 0.5,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontWeight: '600',
  },
  iconLeft: {
    marginRight: 8,
  },
  iconRight: {
    marginLeft: 8,
  },
});

export default AnimatedButton;
```

## C:\Users\head user\Desktop\Hamthan\v3\AI-Operation-Kaizen\FullStack\frontend\src\components\common\Avatar.js

```javascript
import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';

const Avatar = ({ uri, name, size = 'medium', showName = false }) => {
  const { theme, isDark } = useTheme();

  const getSize = () => {
    switch (size) {
      case 'small': return 32;
      case 'large': return 64;
      case 'xlarge': return 120;
      default: return 44; // medium
    }
  };

  const getFontSize = () => {
    switch (size) {
      case 'small': return 12;
      case 'large': return 24;
      case 'xlarge': return 40;
      default: return 16;
    }
  };

  const avatarSize = getSize();
  // Ensures we only get max 2 letters, perfectly capitalized
  const initials = name 
    ? name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() 
    : '?';

  // Premium flat color palette for placeholders
  const placeholderBg = isDark ? '#343541' : '#e5e5e5'; 
  const placeholderText = isDark ? '#ececec' : '#4b5563';
  const imageBg = isDark ? '#2f2f2f' : '#f4f4f4';

  return (
    <View style={[styles.container, showName && styles.containerWithName]}>
      {uri ? (
        <Image
          source={{ uri }}
          style={[
            styles.image,
            { 
              width: avatarSize, 
              height: avatarSize, 
              borderRadius: avatarSize / 2,
              backgroundColor: imageBg, // Shows cleanly while loading
            },
          ]}
        />
      ) : (
        <View
          style={[
            styles.placeholder,
            {
              width: avatarSize,
              height: avatarSize,
              borderRadius: avatarSize / 2,
              backgroundColor: placeholderBg,
            },
          ]}
        >
          <Text 
            style={[
              styles.initials, 
              { 
                fontSize: getFontSize(), 
                color: placeholderText 
              }
            ]}
          >
            {initials}
          </Text>
        </View>
      )}
      
      {showName && name && (
        <Text 
          style={[styles.name, { color: theme.text }]} 
          numberOfLines={1}
        >
          {name}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  containerWithName: {
    gap: 8, // Modern flex gap
  },
  image: {
    // Subtle border to define the image boundary, especially helpful for dark images in dark mode
    borderWidth: 1,
    borderColor: 'rgba(128,128,128,0.1)',
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(128,128,128,0.1)', // Matches image border logic
  },
  initials: {
    fontWeight: '600',
    letterSpacing: 0.5, // Slight tracking makes initials look much more intentional
  },
  name: {
    fontSize: 14,
    fontWeight: '500',
    maxWidth: 100,
    textAlign: 'center',
    letterSpacing: 0.2,
  },
});

export default Avatar;
```

## C:\Users\head user\Desktop\Hamthan\v3\AI-Operation-Kaizen\FullStack\frontend\src\components\common\Button.js

```javascript
import React, { useRef } from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, View, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';

const Button = ({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  icon,
  iconPosition = 'left',
  size = 'large', // Defaulted to large for the premium feel
  fullWidth = true,
  style,
}) => {
  const { theme, isDark } = useTheme();
  
  // Animation for a premium tactile click feel
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.96,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 4,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  // ── ChatGPT Style Color Logic ──
  const getBackgroundColor = () => {
    if (disabled) return isDark ? '#2f2f2f' : '#e5e5e5';
    switch (variant) {
      case 'primary': return isDark ? '#ffffff' : '#000000'; // High contrast
      case 'secondary': return isDark ? '#2f2f2f' : '#f4f4f4'; // Soft gray
      case 'danger': return '#ef4444';
      case 'success': return '#10a37f'; // OpenAI Green
      case 'outline': return 'transparent';
      default: return isDark ? '#ffffff' : '#000000';
    }
  };

  const getTextColor = () => {
    if (disabled) return isDark ? '#666666' : '#9ca3af';
    switch (variant) {
      case 'primary': return isDark ? '#000000' : '#ffffff';
      case 'secondary': return theme.text;
      case 'danger': return '#ffffff';
      case 'success': return '#ffffff';
      case 'outline': return theme.text;
      default: return isDark ? '#000000' : '#ffffff';
    }
  };

  const getBorderColor = () => {
    switch (variant) {
      case 'outline': return isDark ? '#424242' : '#e5e5e5';
      default: return 'transparent';
    }
  };

  const getPadding = () => {
    switch (size) {
      case 'small': return { paddingVertical: 10, paddingHorizontal: 16 };
      case 'large': return { paddingVertical: 16, paddingHorizontal: 24 };
      default: return { paddingVertical: 14, paddingHorizontal: 20 };
    }
  };

  const getFontSize = () => {
    switch (size) {
      case 'small': return 14;
      case 'large': return 16;
      default: return 15;
    }
  };

  return (
    <Animated.View style={[{ transform: [{ scale: scaleAnim }] }, fullWidth && styles.fullWidth, style]}>
      <TouchableOpacity
        style={[
          styles.button,
          {
            backgroundColor: getBackgroundColor(),
            borderColor: getBorderColor(),
            borderWidth: variant === 'outline' ? 1 : 0,
            ...getPadding(),
          },
        ]}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || loading}
        activeOpacity={0.9} // Relies on the scale animation rather than fading out
      >
        {loading ? (
          <ActivityIndicator color={getTextColor()} size="small" />
        ) : (
          <View style={styles.content}>
            {icon && iconPosition === 'left' && (
              <Ionicons name={icon} size={getFontSize() + 4} color={getTextColor()} style={styles.iconLeft} />
            )}
            <Text style={[styles.text, { color: getTextColor(), fontSize: getFontSize() }]}>
              {title}
            </Text>
            {icon && iconPosition === 'right' && (
              <Ionicons name={icon} size={getFontSize() + 4} color={getTextColor()} style={styles.iconRight} />
            )}
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: 16, // Smoother squircle shape
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullWidth: {
    width: '100%',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  iconLeft: {
    marginRight: 8,
  },
  iconRight: {
    marginLeft: 8,
  },
});

export default Button;
```

## C:\Users\head user\Desktop\Hamthan\v3\AI-Operation-Kaizen\FullStack\frontend\src\components\common\Card.js

```javascript
import React, { useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Animated, Platform } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { mediumImpact } from '../../utils/haptics'; // Utilizing your haptics!

const Card = ({ 
  children, 
  style, 
  onPress, 
  disabled = false,
  variant = 'outlined', // 'outlined' | 'filled' | 'elevated'
}) => {
  const { theme, isDark } = useTheme();
  
  // Physics-based animations
  const scaleValue = useRef(new Animated.Value(1)).current;
  const opacityValue = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    if (!disabled) {
      mediumImpact();
      Animated.parallel([
        Animated.spring(scaleValue, {
          toValue: 0.97, // Slightly deeper physical press
          useNativeDriver: true,
          speed: 50,
          bounciness: 4,
        }),
        Animated.timing(opacityValue, {
          toValue: 0.85, // Smooth optical fade
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();
    }
  };

  const handlePressOut = () => {
    Animated.parallel([
      Animated.spring(scaleValue, {
        toValue: 1,
        useNativeDriver: true,
        speed: 50,
        bounciness: 4,
      }),
      Animated.timing(opacityValue, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
  };

  // ── High-End UI Logic ──
  const getCardStyles = () => {
    // Premium Dark Mode / Light Mode Palettes
    const bgFilled = isDark ? '#2a2a2a' : '#f7f7f8'; // ChatGPT off-gray
    const bgOutlined = isDark ? '#212121' : '#ffffff';
    
    // Dynamic glass borders (lighter on top to catch light in dark mode)
    const borderTop = isDark ? 'rgba(255,255,255,0.08)' : '#e5e5e5';
    const borderBottom = isDark ? 'rgba(255,255,255,0.02)' : '#e5e5e5';

    switch (variant) {
      case 'filled':
        return {
          backgroundColor: bgFilled,
          borderWidth: 0,
        };
      case 'elevated':
        return {
          backgroundColor: bgOutlined,
          borderWidth: 1,
          borderTopColor: borderTop,
          borderColor: borderBottom, // Uses lighter top, darker bottom
          ...Platform.select({
            ios: {
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 12 },
              shadowOpacity: isDark ? 0.3 : 0.08,
              shadowRadius: 24, // Massive blur radius for that modern floating feel
            },
            android: {
              elevation: 8,
            },
          }),
        };
      case 'outlined':
      default:
        return {
          backgroundColor: bgOutlined,
          borderWidth: 1,
          borderTopColor: borderTop,
          borderLeftColor: borderBottom,
          borderRightColor: borderBottom,
          borderBottomColor: borderBottom,
        };
    }
  };

  const baseStyle = [styles.card, getCardStyles(), style];

  if (onPress) {
    return (
      <Animated.View 
        style={[
          { 
            transform: [{ scale: scaleValue }],
            opacity: opacityValue,
          }
        ]}
      >
        <TouchableOpacity
          style={baseStyle}
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          disabled={disabled}
          activeOpacity={1} // Overrides default RN opacity flash since we handle it smoothly via Animated.View
        >
          {children}
        </TouchableOpacity>
      </Animated.View>
    );
  }

  // Non-pressable static card
  return <View style={baseStyle}>{children}</View>;
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 20, // Huge, luxurious curves
    padding: 20, 
    width: '100%',
    overflow: 'hidden', // Keeps any internal elements perfectly clipped to the curve
  },
});

export default Card;
```

## C:\Users\head user\Desktop\Hamthan\v3\AI-Operation-Kaizen\FullStack\frontend\src\components\common\EmptyState.js

```javascript
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import Button from './Button'; // This will automatically use your beautifully upgraded Button!

const EmptyState = ({
  icon = 'document-text-outline',
  title = 'No data found',
  message = 'There is nothing to display at the moment.',
  actionLabel,
  onAction,
}) => {
  const { theme, isDark } = useTheme();

  // Premium Muted Palette
  const iconBg = isDark ? '#2a2a2a' : '#f7f7f8';
  const iconColor = isDark ? '#8e8ea0' : '#6e6e80'; // OpenAI's signature muted gray

  return (
    <View style={styles.container}>
      <View style={[styles.iconContainer, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={42} color={iconColor} />
      </View>
      
      <Text style={[styles.title, { color: theme.text }]}>
        {title}
      </Text>
      
      <Text style={[styles.message, { color: theme.textSecondary }]}>
        {message}
      </Text>
      
      {actionLabel && onAction && (
        <Button
          title={actionLabel}
          onPress={onAction}
          variant="secondary" // Uses the sleek flat-gray variant we just built
          size="medium"
          fullWidth={false}
          style={styles.button}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    maxWidth: 400, // Keeps the text from stretching too wide on tablets
    alignSelf: 'center',
    width: '100%',
  },
  iconContainer: {
    width: 80, // Slightly more refined size
    height: 80,
    borderRadius: 40, // Perfect circle
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(128,128,128,0.08)', // Subtle edge definition
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
    letterSpacing: 0.3, // Premium typography tracking
  },
  message: {
    fontSize: 15, // Slightly larger for readability
    textAlign: 'center',
    lineHeight: 24, // Generous breathing room
    marginBottom: 12,
    maxWidth: '85%', // Prevents orphans (single words on a new line)
  },
  button: {
    marginTop: 20,
    minWidth: 160, // Ensures the button doesn't look too tiny with short words
  },
});

export default EmptyState;
```

## C:\Users\head user\Desktop\Hamthan\v3\AI-Operation-Kaizen\FullStack\frontend\src\components\common\ErrorState.js

```javascript
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import Button from './Button'; // Uses our newly upgraded Animated Button

const ErrorState = ({
  title = 'Something went wrong',
  message = 'An error occurred. Please try again.',
  onRetry,
}) => {
  const { theme, isDark } = useTheme();

  // Premium, ultra-subtle red tint for the icon background
  const iconBg = isDark ? 'rgba(239, 68, 68, 0.1)' : 'rgba(239, 68, 68, 0.08)';
  const iconColor = '#ef4444'; // Clean, flat red

  return (
    <View style={styles.container}>
      <View style={[styles.iconContainer, { backgroundColor: iconBg }]}>
        <Ionicons name="warning" size={38} color={iconColor} />
      </View>
      
      <Text style={[styles.title, { color: theme.text }]}>
        {title}
      </Text>
      
      <Text style={[styles.message, { color: theme.textSecondary }]}>
        {message}
      </Text>
      
      {onRetry && (
        <Button
          title="Try Again"
          onPress={onRetry}
          variant="secondary" // Changed from 'danger' to a calm, premium 'secondary' gray
          size="medium"
          fullWidth={false}
          icon="refresh"
          style={styles.button}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    maxWidth: 400, // Keeps the layout tight on larger screens/tablets
    alignSelf: 'center',
    width: '100%',
  },
  iconContainer: {
    width: 80, // Refined proportion
    height: 80,
    borderRadius: 40, // Perfect circle
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.1)', // Subtle boundary definition
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  message: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 24, // High-end paragraph spacing
    marginBottom: 12,
    maxWidth: '85%', // Prevents text from stretching too wide
  },
  button: {
    marginTop: 20,
    minWidth: 160, // Gives the button substantial click area
  },
});

export default ErrorState;
```

## C:\Users\head user\Desktop\Hamthan\v3\AI-Operation-Kaizen\FullStack\frontend\src\components\common\FullScreenSpinner.js

```javascript
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext'; // Adjust path if needed

export default function FullScreenSpinner({ visible, message = "Updating..." }) {
  const { theme, isDark } = useTheme();
  const spinValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.loop(
        Animated.timing(spinValue, {
          toValue: 1,
          duration: 1000,
          easing: Easing.linear,
          useNativeDriver: Platform.OS !== 'web',
        })
      ).start();
    } else {
      spinValue.stopAnimation();
      spinValue.setValue(0);
    }
  }, [visible, spinValue]);

  if (!visible) return null;

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg']
  });

  return (
    <View style={[styles.overlay, { backgroundColor: isDark ? '#212121' : '#f9f9f9' }]}>
      <Animated.View style={{ transform: [{ rotate: spin }] }}>
        <Ionicons name="sync" size={54} color={theme.primary} />
      </Animated.View>
      <Text style={[styles.text, { color: theme.text }]}>
        {message}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    marginTop: 20,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
```

## C:\Users\head user\Desktop\Hamthan\v3\AI-Operation-Kaizen\FullStack\frontend\src\components\common\Input.js

```javascript
import React, { useState } from 'react';
import { View, TextInput, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';

const Input = ({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry = false,
  error,
  icon,
  rightIcon,
  onRightIconPress,
  multiline = false,
  numberOfLines = 1,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
  editable = true,
  style,
}) => {
  const { theme, isDark } = useTheme();
  const [showPassword, setShowPassword] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  // Exact OpenAI minimalist color palette
  const inputBg = isDark ? '#2f2f2f' : '#f4f4f4';
  const defaultBorder = isDark ? '#2f2f2f' : '#f4f4f4'; // Blends in until focused
  const focusedBorder = isDark ? '#555555' : '#d1d5db'; 
  const placeholderColor = isDark ? '#8e8ea0' : '#8e8ea0';
  const labelColor = isDark ? '#ececec' : '#333333';

  return (
    <View style={[styles.container, style]}>
      {label && (
        <Text style={[styles.label, { color: labelColor }]}>{label}</Text>
      )}
      
      <View
        style={[
          styles.inputContainer,
          {
            backgroundColor: inputBg,
            borderColor: error ? theme.danger : (isFocused ? focusedBorder : defaultBorder),
          },
          multiline && styles.multilineContainer,
        ]}
      >
        {icon && (
          <Ionicons
            name={icon}
            size={20}
            color={isFocused ? theme.text : placeholderColor}
            style={styles.icon}
          />
        )}
        
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={placeholderColor}
          secureTextEntry={secureTextEntry && !showPassword}
          multiline={multiline}
          numberOfLines={numberOfLines}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          editable={editable}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          style={[
            styles.input,
            { color: theme.text },
            multiline && styles.multilineInput,
          ]}
        />

        {secureTextEntry && (
          <TouchableOpacity
            onPress={() => setShowPassword(!showPassword)}
            style={styles.rightIcon}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons
              name={showPassword ? 'eye-off' : 'eye'}
              size={20}
              color={placeholderColor}
            />
          </TouchableOpacity>
        )}

        {rightIcon && !secureTextEntry && (
          <TouchableOpacity 
            onPress={onRightIconPress} 
            style={styles.rightIcon}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name={rightIcon} size={20} color={placeholderColor} />
          </TouchableOpacity>
        )}
      </View>

      {error && (
        <Text style={[styles.error, { color: theme.danger }]}>{error}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 6, // Reduced outer margin, relies on screen layout for spacing
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    marginLeft: 4, // Aligns perfectly with the inner text
    letterSpacing: 0.3,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16, // Smooth squircle edges
    borderWidth: 1.5, // Slightly thicker border for focus states
    paddingHorizontal: 16,
    minHeight: 56, // Taller, more premium feel
  },
  multilineContainer: {
    alignItems: 'flex-start',
    paddingVertical: 14,
  },
  icon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 0,
    minHeight: 24,
  },
  multilineInput: {
    textAlignVertical: 'top',
    minHeight: 100,
  },
  rightIcon: {
    padding: 4,
    marginLeft: 8,
  },
  error: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 6,
    marginLeft: 4,
  },
});

export default Input;
```

## C:\Users\head user\Desktop\Hamthan\v3\AI-Operation-Kaizen\FullStack\frontend\src\components\common\Loader.js

```javascript
import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';

const Loader = ({ message = 'Loading...', fullScreen = true }) => {
  const { theme, isDark } = useTheme();

  // Premium OpenAI Style Palette
  const spinnerColor = isDark ? '#ffffff' : '#000000'; // High contrast
  const textColor = isDark ? '#8e8ea0' : '#6e6e80'; // Signature muted gray
  const bgFullScreen = isDark ? '#212121' : '#ffffff'; // Seamless background match

  const content = (
    <View style={[styles.content, !fullScreen && styles.inline]}>
      <ActivityIndicator size="large" color={spinnerColor} />
      {message && (
        <Text style={[styles.message, { color: textColor }]}>
          {message}
        </Text>
      )}
    </View>
  );

  if (fullScreen) {
    return (
      <View style={[styles.container, { backgroundColor: bgFullScreen }]}>
        {content}
      </View>
    );
  }

  return content;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  inline: {
    padding: 40, // Generous padding so it doesn't crowd lists or cards
  },
  message: {
    marginTop: 20, // Extra breathing room below the spinner
    fontSize: 14, // Refined, slightly smaller text
    fontWeight: '500', // Medium weight for legibility
    letterSpacing: 0.5, // Premium tracking
    textTransform: 'uppercase', // Optional: Gives a very system-level, technical feel
  },
});

export default Loader;
```

## C:\Users\head user\Desktop\Hamthan\v3\AI-Operation-Kaizen\FullStack\frontend\src\components\common\LocationCapture.js

```javascript
import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import {
  getCurrentLocation,
  verifySiteProximity,
  formatDistance,
  reverseGeocode,
} from '../../utils/locationCapture';

const LocationCapture = ({
  onLocationCaptured,
  siteLocation = null, // { latitude, longitude, name }
  required = false,
  label = 'Location Verification',
}) => {
  const { theme, isDark } = useTheme();
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState(null);
  const [address, setAddress] = useState(null);
  const [verification, setVerification] = useState(null);
  const [error, setError] = useState(null);

  // ── Animations ──
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const refreshScale = useRef(new Animated.Value(1)).current;

  const animatePressIn = (anim) => {
    Animated.spring(anim, { toValue: 0.97, useNativeDriver: true }).start();
  };
  const animatePressOut = (anim) => {
    Animated.spring(anim, { toValue: 1, friction: 5, tension: 40, useNativeDriver: true }).start();
  };

  const handleCaptureLocation = async () => {
    setLoading(true);
    setError(null);

    try {
      const loc = await getCurrentLocation();
      
      if (loc) {
        setLocation(loc);
        
        // Get address
        const addr = await reverseGeocode(loc.latitude, loc.longitude);
        setAddress(addr);
        
        // Verify site proximity if site location provided
        if (siteLocation) {
          const result = verifySiteProximity(loc, siteLocation);
          setVerification(result);
        }
        
        // Callback with location data
        if (onLocationCaptured) {
          onLocationCaptured({
            ...loc,
            address: addr,
            verification: siteLocation ? verifySiteProximity(loc, siteLocation) : null,
          });
        }
      } else {
        setError('Failed to get location. Please try again.');
      }
    } catch (err) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  // ── Premium Color Palette ──
  const successColor = '#10a37f'; // OpenAI Green
  const dangerColor = '#ef4444'; // Clean Red
  
  const getStatusColor = () => {
    if (!verification) return theme.textSecondary;
    return verification.isVerified ? successColor : dangerColor;
  };

  const getStatusIcon = () => {
    if (!verification) return 'location';
    return verification.isVerified ? 'checkmark-circle' : 'warning';
  };

  const cardBg = isDark ? '#212121' : '#ffffff';
  const cardBorder = isDark ? '#424242' : '#e5e5e5';
  const innerCardBg = isDark ? '#2f2f2f' : '#f7f7f8';
  const iconBg = isDark ? '#ffffff' : '#000000';
  const iconColor = isDark ? '#000000' : '#ffffff';

  return (
    <View style={styles.container}>
      {/* Label */}
      <Text style={[styles.label, { color: theme.text }]}>
        {label}
        {required && <Text style={styles.required}> *</Text>}
      </Text>

      {/* Capture Button */}
      {!location ? (
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
          <TouchableOpacity
            style={[
              styles.captureButton, 
              { backgroundColor: innerCardBg, borderColor: cardBorder }
            ]}
            onPress={handleCaptureLocation}
            onPressIn={() => animatePressIn(scaleAnim)}
            onPressOut={() => animatePressOut(scaleAnim)}
            disabled={loading}
            activeOpacity={0.9}
          >
            {loading ? (
              <ActivityIndicator size="small" color={theme.text} />
            ) : (
              <>
                <View style={[styles.iconContainer, { backgroundColor: iconBg }]}>
                  <Ionicons name="navigate" size={20} color={iconColor} />
                </View>
                <View style={styles.captureTextContainer}>
                  <Text style={[styles.captureTitle, { color: theme.text }]}>
                    Capture Current Location
                  </Text>
                  <Text style={[styles.captureSubtitle, { color: theme.textSecondary }]}>
                    Tap to verify your position
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
              </>
            )}
          </TouchableOpacity>
        </Animated.View>
      ) : (
        <View style={[styles.locationCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
          
          {/* Location Header */}
          <View style={styles.locationHeader}>
            <View style={[styles.statusIcon, { backgroundColor: `${getStatusColor()}15` }]}>
              <Ionicons name={getStatusIcon()} size={24} color={getStatusColor()} />
            </View>
            <View style={styles.locationInfo}>
              {verification ? (
                <Text style={[styles.verificationStatus, { color: getStatusColor() }]}>
                  {verification.isVerified ? 'Location Verified' : 'Not at Site'}
                </Text>
              ) : (
                <Text style={[styles.verificationStatus, { color: theme.text }]}>
                  Location Captured
                </Text>
              )}
              {address && (
                <Text style={[styles.addressText, { color: theme.textSecondary }]} numberOfLines={2}>
                  {address.formattedAddress}
                </Text>
              )}
            </View>
          </View>

          {/* Coordinates Grid (Sleek Inner Card) */}
          <View style={[styles.coordsContainer, { backgroundColor: innerCardBg }]}>
            <View style={styles.coordItem}>
              <Text style={[styles.coordLabel, { color: theme.textSecondary }]}>LATITUDE</Text>
              <Text style={[styles.coordValue, { color: theme.text }]}>
                {location.latitude.toFixed(6)}
              </Text>
            </View>
            <View style={[styles.coordDivider, { backgroundColor: cardBorder }]} />
            <View style={styles.coordItem}>
              <Text style={[styles.coordLabel, { color: theme.textSecondary }]}>LONGITUDE</Text>
              <Text style={[styles.coordValue, { color: theme.text }]}>
                {location.longitude.toFixed(6)}
              </Text>
            </View>
            <View style={[styles.coordDivider, { backgroundColor: cardBorder }]} />
            <View style={styles.coordItem}>
              <Text style={[styles.coordLabel, { color: theme.textSecondary }]}>ACCURACY</Text>
              <Text style={[styles.coordValue, { color: theme.text }]}>
                ±{Math.round(location.accuracy)}m
              </Text>
            </View>
          </View>

          {/* Distance to Site Message */}
          {verification && !verification.isVerified && (
            <View style={styles.distanceRow}>
              <Text style={[styles.distanceText, { color: dangerColor }]}>
                {verification.message}
              </Text>
            </View>
          )}

          {/* Refresh Button */}
          <Animated.View style={{ transform: [{ scale: refreshScale }] }}>
            <TouchableOpacity
              style={[styles.refreshButton, { borderTopColor: cardBorder }]}
              onPress={handleCaptureLocation}
              onPressIn={() => animatePressIn(refreshScale)}
              onPressOut={() => animatePressOut(refreshScale)}
              disabled={loading}
              activeOpacity={0.7}
            >
              {loading ? (
                <ActivityIndicator size="small" color={theme.textSecondary} />
              ) : (
                <>
                  <Ionicons name="refresh" size={16} color={theme.textSecondary} />
                  <Text style={[styles.refreshText, { color: theme.textSecondary }]}>Refresh Location</Text>
                </>
              )}
            </TouchableOpacity>
          </Animated.View>
        </View>
      )}

      {/* Error */}
      {error && (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={16} color={dangerColor} />
          <Text style={[styles.errorText, { color: dangerColor }]}>{error}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    marginLeft: 4,
    letterSpacing: 0.3,
  },
  required: {
    color: '#ef4444',
  },
  captureButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16, // Squircle
    borderWidth: 1,
    gap: 14,
    minHeight: 72, // Generous height
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureTextContainer: {
    flex: 1,
  },
  captureTitle: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  captureSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  locationCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden', // Keeps the inner borders clean
  },
  locationHeader: {
    flexDirection: 'row',
    padding: 16,
    gap: 14,
  },
  statusIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  locationInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  verificationStatus: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
    letterSpacing: 0.2,
  },
  addressText: {
    fontSize: 13,
    lineHeight: 18,
  },
  coordsContainer: {
    flexDirection: 'row',
    paddingVertical: 14,
    paddingHorizontal: 12,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12, // Inner nested squircle
  },
  coordItem: {
    flex: 1,
    alignItems: 'center',
  },
  coordLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8, // All-caps premium tracking
    marginBottom: 6,
  },
  coordValue: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  coordDivider: {
    width: 1,
    opacity: 0.5, // Softens the lines
  },
  distanceRow: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  distanceText: {
    fontSize: 13,
    fontWeight: '500',
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderTopWidth: 1,
  },
  refreshText: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    marginLeft: 4,
  },
  errorText: {
    fontSize: 13,
    fontWeight: '500',
  },
});

export default LocationCapture;
```

## C:\Users\head user\Desktop\Hamthan\v3\AI-Operation-Kaizen\FullStack\frontend\src\components\common\OfflineBanner.js

```javascript
import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { selectIsOnline } from '../../store/slices/offlineSlice';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeContext'; // NEW: Imported theme

const OfflineBanner = () => {
  const isOnline = useSelector(selectIsOnline);
  const { isDark } = useTheme(); // NEW: Grabbing dark mode status
  
  const [showBackOnline, setShowBackOnline] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);
  
  // Advanced Animations
  const slideAnim = useRef(new Animated.Value(-100)).current; // Starts hidden above screen
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!isOnline) {
      // Show offline pill
      setWasOffline(true);
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: Math.max(insets.top + 12, 20), // Drops just below status bar
          useNativeDriver: true,
          tension: 40,
          friction: 6,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else if (wasOffline) {
      // Show "Back online" message briefly, then slide up
      setShowBackOnline(true);
      
      setTimeout(() => {
        Animated.parallel([
          Animated.spring(slideAnim, {
            toValue: -100, // Slides back out of view
            useNativeDriver: true,
            tension: 20,
            friction: 7,
          }),
          Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start(() => {
          setShowBackOnline(false);
          setWasOffline(false);
        });
      }, 2500); // Gives them 2.5 seconds to see it's back online
    }
  }, [isOnline, insets.top, slideAnim, fadeAnim]);

  if (isOnline && !showBackOnline) return null;

  // Premium Pill Colors
  const pillBg = isDark ? '#333333' : '#171717'; 
  const pillBorder = isDark ? '#424242' : 'transparent';
  const iconColor = isOnline ? '#10a37f' : '#ef4444'; // OpenAI Green / Clean Red

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
      pointerEvents="none" // Ensures the banner never blocks user taps on the app underneath
    >
      <View 
        style={[
          styles.pill, 
          { 
            backgroundColor: pillBg,
            borderColor: pillBorder,
            borderWidth: isDark ? 1 : 0, 
          }
        ]}
      >
        <Ionicons
          name={isOnline ? 'wifi' : 'wifi-outline'} // Swapped to cleaner wifi icons
          size={16}
          color={iconColor}
        />
        <Text style={styles.text}>
          {isOnline ? 'Back online' : 'No internet connection'}
        </Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    alignItems: 'center', // Centers the floating pill
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 30, // Perfect rounded pill shape
    gap: 8,
    // Subtle shadow to detach it from the screen content
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  text: {
    color: '#ffffff', // Always white for maximum contrast on the dark pill
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.2, // Premium tracking
  },
});

export default OfflineBanner;
```

## C:\Users\head user\Desktop\Hamthan\v3\AI-Operation-Kaizen\FullStack\frontend\src\components\common\PhotoUploader.js

```javascript
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import {
  capturePhoto,
  selectPhoto,
  showImagePickerOptions,
  getFileInfo,
  formatFileSize,
} from '../../utils/photoUpload';

const PhotoUploader = ({
  photos = [],
  onPhotosChange,
  maxPhotos = 5,
  label = 'Add Photos',
  required = false,
  showInfo = true,
}) => {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(false);

  const handleAddPhoto = () => {
    if (photos.length >= maxPhotos) {
      Alert.alert('Limit Reached', `You can only add up to ${maxPhotos} photos.`);
      return;
    }

    showImagePickerOptions(
      async () => {
        setLoading(true);
        const result = await capturePhoto();
        if (result) {
          const fileInfo = await getFileInfo(result.uri);
          onPhotosChange([
            ...photos,
            {
              uri: result.uri,
              width: result.width,
              height: result.height,
              size: fileInfo?.size || 0,
              type: 'camera',
            },
          ]);
        }
        setLoading(false);
      },
      async () => {
        setLoading(true);
        const result = await selectPhoto();
        if (result) {
          const fileInfo = await getFileInfo(result.uri);
          onPhotosChange([
            ...photos,
            {
              uri: result.uri,
              width: result.width,
              height: result.height,
              size: fileInfo?.size || 0,
              type: 'gallery',
            },
          ]);
        }
        setLoading(false);
      }
    );
  };

  const handleRemovePhoto = (index) => {
    Alert.alert(
      'Remove Photo',
      'Are you sure you want to remove this photo?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            const newPhotos = [...photos];
            newPhotos.splice(index, 1);
            onPhotosChange(newPhotos);
          },
        },
      ]
    );
  };

  const totalSize = photos.reduce((sum, photo) => sum + (photo.size || 0), 0);

  return (
    <View style={styles.container}>
      {/* Label */}
      <View style={styles.labelRow}>
        <Text style={[styles.label, { color: theme.text }]}>
          {label}
          {required && <Text style={styles.required}> *</Text>}
        </Text>
        <Text style={[styles.count, { color: theme.textSecondary }]}>
          {photos.length}/{maxPhotos}
        </Text>
      </View>

      {/* Photos Grid */}
      <View style={styles.photosGrid}>
        {/* Existing Photos */}
        {photos.map((photo, index) => (
          <View key={index} style={styles.photoContainer}>
            <Image source={{ uri: photo.uri }} style={styles.photo} />
            <TouchableOpacity
              style={[styles.removeButton, { backgroundColor: theme.error || '#ef4444' }]}
              onPress={() => handleRemovePhoto(index)}
            >
              <Ionicons name="close" size={16} color="#fff" />
            </TouchableOpacity>
            {photo.type === 'camera' && (
              <View style={[styles.photoTypeBadge, { backgroundColor: theme.primary }]}>
                <Ionicons name="camera" size={10} color="#fff" />
              </View>
            )}
          </View>
        ))}

        {/* Add Button */}
        {photos.length < maxPhotos && (
          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: theme.inputBackground, borderColor: theme.border }]}
            onPress={handleAddPhoto}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color={theme.primary} />
            ) : (
              <>
                <Ionicons name="add" size={28} color={theme.primary} />
                <Text style={[styles.addText, { color: theme.textSecondary }]}>Add</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* Info */}
      {showInfo && photos.length > 0 && (
        <View style={[styles.infoRow, { backgroundColor: theme.inputBackground }]}>
          <Ionicons name="information-circle" size={16} color={theme.textSecondary} />
          <Text style={[styles.infoText, { color: theme.textSecondary }]}>
            Total size: {formatFileSize(totalSize)}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
  },
  required: {
    color: '#ef4444',
  },
  count: {
    fontSize: 13,
  },
  photosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  photoContainer: {
    position: 'relative',
  },
  photo: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#e5e7eb',
  },
  removeButton: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoTypeBadge: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButton: {
    width: 80,
    height: 80,
    borderRadius: 8,
    borderWidth: 2,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addText: {
    fontSize: 11,
    marginTop: 2,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 12,
  },
  infoText: {
    fontSize: 12,
  },
});

export default PhotoUploader;
```

## C:\Users\head user\Desktop\Hamthan\v3\AI-Operation-Kaizen\FullStack\frontend\src\components\common\Shimmer.js

```javascript
import React from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';

const Shimmer = ({ width = '100%', height = 20, borderRadius = 8, style }) => {
  const { theme, isDark } = useTheme();
  const animatedValue = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(animatedValue, {
        toValue: 1,
        duration: 1500,
        useNativeDriver: true,
      })
    );
    animation.start();
    return () => animation.stop();
  }, []);

  const translateX = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [-200, 200],
  });

  const colors = isDark
    ? ['#3A3A3A', '#2A2A2A', '#3A3A3A']
    : ['#E0E0E0', '#F5F5F5', '#E0E0E0'];

  return (
    <View
      style={[
        styles.container,
        { width, height, borderRadius, backgroundColor: colors[0] },
        style,
      ]}
    >
      <Animated.View
        style={[
          styles.shimmer,
          { transform: [{ translateX }] },
        ]}
      >
        <LinearGradient
          colors={colors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.gradient}
        />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  shimmer: {
    ...StyleSheet.absoluteFillObject,
  },
  gradient: {
    flex: 1,
    width: 200,
  },
});

export default Shimmer;
```

## C:\Users\head user\Desktop\Hamthan\v3\AI-Operation-Kaizen\FullStack\frontend\src\components\common\SkeletonLoaders.js

```javascript
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import Shimmer from './Shimmer';

/**
 * Skeleton loading component for Issue Cards
 */
export const IssueCardSkeleton = () => {
  const { theme } = useTheme();
  
  return (
    <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={styles.cardHeader}>
        <Shimmer width={60} height={24} borderRadius={12} />
        <Shimmer width={50} height={20} borderRadius={10} />
      </View>
      <Shimmer width="80%" height={20} style={styles.titleShimmer} />
      <View style={styles.infoRow}>
        <Shimmer width={100} height={16} borderRadius={8} />
        <Shimmer width={80} height={16} borderRadius={8} />
      </View>
      <Shimmer width={120} height={14} style={styles.dateShimmer} />
    </View>
  );
};

/**
 * Skeleton loading component for Dashboard Cards
 */
export const DashboardCardSkeleton = () => {
  const { theme } = useTheme();
  
  return (
    <View style={[styles.dashboardCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <Shimmer width={40} height={40} borderRadius={20} />
      <Shimmer width={60} height={32} style={styles.countShimmer} />
      <Shimmer width={80} height={14} />
    </View>
  );
};

/**
 * Skeleton loading for list screen
 */
export const ListScreenSkeleton = ({ count = 5 }) => {
  return (
    <View style={styles.listContainer}>
      {/* Search bar skeleton */}
      <View style={styles.searchSkeleton}>
        <Shimmer width="100%" height={44} borderRadius={10} />
      </View>
      
      {/* Cards skeleton */}
      {Array.from({ length: count }).map((_, index) => (
        <IssueCardSkeleton key={index} />
      ))}
    </View>
  );
};

/**
 * Skeleton loading for Dashboard
 */
export const DashboardSkeleton = () => {
  const { theme } = useTheme();
  
  return (
    <View style={styles.dashboardContainer}>
      {/* Header skeleton */}
      <View style={styles.headerSkeleton}>
        <View>
          <Shimmer width={100} height={14} style={styles.headerSubtitle} />
          <Shimmer width={150} height={24} />
        </View>
        <Shimmer width={44} height={44} borderRadius={22} />
      </View>
      
      {/* Stats cards skeleton */}
      <View style={styles.statsRow}>
        <DashboardCardSkeleton />
        <DashboardCardSkeleton />
      </View>
      <View style={styles.statsRow}>
        <View style={[styles.fullWidthCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Shimmer width={40} height={40} borderRadius={20} />
          <Shimmer width={60} height={32} style={styles.countShimmer} />
          <Shimmer width={80} height={14} />
        </View>
      </View>
      
      {/* Chart skeleton */}
      <View style={[styles.chartSkeleton, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Shimmer width={180} height={20} style={styles.chartTitle} />
        <Shimmer width="100%" height={180} borderRadius={12} />
        <Shimmer width={120} height={36} borderRadius={8} style={styles.chartButton} />
      </View>
    </View>
  );
};

/**
 * Skeleton for Chat message
 */
export const ChatMessageSkeleton = ({ isUser = false }) => {
  const { theme } = useTheme();
  
  return (
    <View style={[styles.messageContainer, isUser && styles.userMessage]}>
      {!isUser && <Shimmer width={32} height={32} borderRadius={16} />}
      <View style={[
        styles.messageBubble, 
        { backgroundColor: isUser ? `${theme.primary}30` : theme.inputBackground },
        isUser && styles.userBubble
      ]}>
        <Shimmer width={isUser ? 150 : 200} height={14} />
        <Shimmer width={isUser ? 100 : 180} height={14} style={styles.messageLine} />
        {!isUser && <Shimmer width={120} height={14} style={styles.messageLine} />}
      </View>
    </View>
  );
};

/**
 * Skeleton for Notification item
 */
export const NotificationSkeleton = () => {
  const { theme } = useTheme();
  
  return (
    <View style={[styles.notificationItem, { backgroundColor: theme.card }]}>
      <Shimmer width={40} height={40} borderRadius={20} />
      <View style={styles.notificationContent}>
        <Shimmer width="70%" height={16} />
        <Shimmer width="90%" height={14} style={styles.notificationBody} />
      </View>
    </View>
  );
};

/**
 * Profile screen skeleton
 */
export const ProfileSkeleton = () => {
  const { theme } = useTheme();
  
  return (
    <View style={styles.profileContainer}>
      {/* Avatar */}
      <View style={styles.profileHeader}>
        <Shimmer width={100} height={100} borderRadius={50} />
        <Shimmer width={150} height={24} style={styles.profileName} />
        <Shimmer width={100} height={16} />
      </View>
      
      {/* Info cards */}
      {Array.from({ length: 4 }).map((_, index) => (
        <View key={index} style={[styles.profileCard, { backgroundColor: theme.card }]}>
          <Shimmer width={24} height={24} borderRadius={12} />
          <View style={styles.profileCardContent}>
            <Shimmer width={80} height={12} />
            <Shimmer width={150} height={16} style={styles.profileCardValue} />
          </View>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  // Issue Card
  card: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  titleShimmer: {
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 8,
  },
  dateShimmer: {
    marginTop: 4,
  },
  
  // Dashboard Card
  dashboardCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  countShimmer: {
    marginVertical: 8,
  },
  
  // List Screen
  listContainer: {
    padding: 16,
  },
  searchSkeleton: {
    marginBottom: 16,
  },
  
  // Dashboard
  dashboardContainer: {
    padding: 16,
  },
  headerSkeleton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  headerSubtitle: {
    marginBottom: 8,
  },
  statsRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  fullWidthCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  chartSkeleton: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 16,
  },
  chartTitle: {
    marginBottom: 16,
  },
  chartButton: {
    alignSelf: 'center',
    marginTop: 16,
  },
  
  // Chat Message
  messageContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 16,
    gap: 8,
  },
  userMessage: {
    flexDirection: 'row-reverse',
  },
  messageBubble: {
    padding: 12,
    borderRadius: 16,
    maxWidth: '70%',
  },
  userBubble: {
    borderBottomRightRadius: 4,
  },
  messageLine: {
    marginTop: 6,
  },
  
  // Notification
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    gap: 12,
  },
  notificationContent: {
    flex: 1,
  },
  notificationBody: {
    marginTop: 6,
  },
  
  // Profile
  profileContainer: {
    padding: 16,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 32,
  },
  profileName: {
    marginTop: 16,
    marginBottom: 8,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    gap: 12,
  },
  profileCardContent: {
    flex: 1,
  },
  profileCardValue: {
    marginTop: 4,
  },
});

export default {
  IssueCardSkeleton,
  DashboardCardSkeleton,
  ListScreenSkeleton,
  DashboardSkeleton,
  ChatMessageSkeleton,
  NotificationSkeleton,
  ProfileSkeleton,
};
```

## C:\Users\head user\Desktop\Hamthan\v3\AI-Operation-Kaizen\FullStack\frontend\src\components\common\StatusBadge.js

```javascript
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { STATUS_COLORS, STATUS_LABELS, PRIORITY_COLORS, PRIORITY_LABELS } from '../../utils/constants';

const StatusBadge = ({ status, type = 'status', size = 'medium' }) => {
  const isStatus = type === 'status';
  const colors = isStatus ? STATUS_COLORS : PRIORITY_COLORS;
  const labels = isStatus ? STATUS_LABELS : PRIORITY_LABELS;

  const color = colors[status] || '#6b7280';
  const label = labels[status] || status;

  const getIcon = () => {
    if (type === 'priority') {
      switch (status) {
        case 'high': return 'alert-circle';
        case 'medium': return 'remove-circle';
        case 'low': return 'checkmark-circle';
        default: return 'ellipse';
      }
    }
    switch (status) {
      case 'OPEN': return 'radio-button-off';
      case 'ASSIGNED': return 'person';
      case 'IN_PROGRESS': return 'time';
      case 'COMPLETED': return 'checkmark-circle';
      case 'ESCALATED': return 'warning';
      case 'REOPENED': return 'refresh';
      default: return 'ellipse';
    }
  };

  const getPadding = () => {
    switch (size) {
      case 'small': return { paddingHorizontal: 8, paddingVertical: 2 };
      case 'large': return { paddingHorizontal: 16, paddingVertical: 8 };
      default: return { paddingHorizontal: 12, paddingVertical: 4 };
    }
  };

  const getFontSize = () => {
    switch (size) {
      case 'small': return 10;
      case 'large': return 14;
      default: return 12;
    }
  };

  return (
    <View style={[styles.badge, { backgroundColor: `${color}15` }, getPadding()]}>
      <Ionicons name={getIcon()} size={getFontSize() + 2} color={color} style={styles.icon} />
      <Text style={[styles.text, { color, fontSize: getFontSize() }]}>
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  icon: {
    marginRight: 4,
  },
  text: {
    fontWeight: '600',
    textTransform: 'capitalize',
  },
});

export default StatusBadge;
```

## C:\Users\head user\Desktop\Hamthan\v3\AI-Operation-Kaizen\FullStack\frontend\src\components\common\Toast.js

```javascript
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const Toast = ({ message, type = 'info', duration = 3000, onHide }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    // Fade in
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    // Auto hide
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 50,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => {
        if (onHide) onHide();
      });
    }, duration);

    return () => clearTimeout(timer);
  }, [message]);

  const getConfig = () => {
    switch (type) {
      case 'success':
        return { icon: 'checkmark-circle', color: '#10a37f' };
      case 'error':
        return { icon: 'alert-circle', color: '#ef4444' };
      case 'warning':
        return { icon: 'warning', color: '#f59e0b' };
      default:
        return { icon: 'information-circle', color: '#8e8ea0' };
    }
  };

  const config = getConfig();

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [{ translateY }],
        },
      ]}
    >
      <Ionicons name={config.icon} size={16} color={config.color} />
      <Text style={styles.message}>{message}</Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 100,
    left: 24,
    right: 24,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 10,
    gap: 9,
    backgroundColor: '#2f2f2f',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  message: {
    flex: 1,
    fontSize: 13.5,
    fontWeight: '400',
    color: '#ececec',
    letterSpacing: -0.1,
    lineHeight: 18,
  },
});

export default Toast;
```

## C:\Users\head user\Desktop\Hamthan\v3\AI-Operation-Kaizen\FullStack\frontend\src\components\dashboard\ChartDownloadButton.js

```javascript
import React, { useState } from 'react';
import { TouchableOpacity, Text, StyleSheet, View, ActivityIndicator, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { exportChartToPDF } from '../../utils/pdfExport';

// 🚀 Only import captureRef if we are NOT on the web to be extra safe
let captureRef;
if (Platform.OS !== 'web') {
  captureRef = require('react-native-view-shot').captureRef;
}

const ChartDownloadButton = ({ viewShotRef, chartType }) => {
  const { theme, isDark } = useTheme();
  const [isExporting, setIsExporting] = useState(false);

 const handlePress = async () => {
    setIsExporting(true);
    
    try {
      // 🌐 WEB: Seamlessly open the browser's native Print/Save as PDF menu
      if (Platform.OS === 'web') {
        // A tiny timeout allows React to update the UI (showing the loader) 
        // before the browser freezes the DOM to open the print dialog.
        setTimeout(() => {
          window.print();
          setIsExporting(false); // Reset the button after the print dialog closes
        }, 150);
        return;
      }

      // 📱 NATIVE LOGIC (iOS / Android)
      if (!viewShotRef?.current) {
        console.warn("No viewShotRef provided to ChartDownloadButton");
        return;
      }

      const uri = await captureRef(viewShotRef, {
        format: 'jpg',
        quality: 0.9,
      });
      
      await exportChartToPDF(uri, chartType);
    } catch (error) {
      console.error("Export failed", error);
      if (Platform.OS !== 'web') {
        alert("Failed to export the chart.");
      }
    } finally {
      if (Platform.OS !== 'web') {
        setTimeout(() => setIsExporting(false), 800);
      }
    }
  };

  // Premium ChatGPT Palette
  const btnBg = isDark ? 'rgba(255, 255, 255, 0.08)' : '#f4f4f4';
  const textColor = isDark ? '#ececec' : '#424242';
  const iconColor = isDark ? '#b4b4b4' : '#666666';

  return (
    <TouchableOpacity
      style={[styles.button, { backgroundColor: btnBg }]}
      onPress={handlePress}
      disabled={isExporting}
      activeOpacity={0.6}
    >
      {isExporting ? (
        <ActivityIndicator size="small" color={iconColor} style={styles.loader} />
      ) : (
        <Ionicons name="download-outline" size={15} color={iconColor} />
      )}
      
      <Text style={[styles.text, { color: textColor }]}>
        {isExporting && Platform.OS !== 'web' ? 'Exporting PDF...' : 'Download Chart'}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12, 
    alignSelf: 'flex-start', 
    marginTop: 16,
    borderWidth: 1,
    borderColor: 'rgba(128, 128, 128, 0.1)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
      web: {
        cursor: 'pointer',
      }
    }),
  },
  loader: {
    marginRight: 2,
    transform: [{ scale: 0.8 }],
  },
  text: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
});

export default ChartDownloadButton;
```

## C:\Users\head user\Desktop\Hamthan\v3\AI-Operation-Kaizen\FullStack\frontend\src\components\dashboard\DashboardCard.js

```javascript
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';

const DashboardCard = ({ title, count, icon, color, onPress, style }) => {
  const { theme, isDark } = useTheme();

  return (
    <TouchableOpacity
      style={[
        styles.card,
        { 
          backgroundColor: isDark ? '#2f2f2f' : '#ffffff', 
          borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' 
        },
        style
      ]}
      onPress={onPress}
      activeOpacity={0.6}
    >
      <View style={styles.content}>
        {/* Top Row: Icon and Title */}
        <View style={styles.header}>
          <View style={[styles.iconWrapper, { backgroundColor: `${color}15` }]}>
            <Ionicons name={icon} size={18} color={color} />
          </View>
          <Text style={[styles.title, { color: theme.textSecondary }]} numberOfLines={1}>
            {title}
          </Text>
        </View>

        {/* Bottom Row: Large Count and Trend (Visual only) */}
        <View style={styles.statsRow}>
          <Text style={[styles.count, { color: theme.text }]}>{count}</Text>
          <Ionicons 
            name="arrow-forward-circle-outline" 
            size={20} 
            color={isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)'} 
          />
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    margin: 6,
    // Modern ChatGPT shadow
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.04,
        shadowRadius: 10,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  content: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20, // Spacious look
    gap: 10,
  },
  iconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 8, // Modern rounded square instead of circle
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: -0.2,
    flex: 1,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  count: {
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: -1, // Tight tracking for modern look
    lineHeight: 36,
  },
});

export default DashboardCard;
```

## C:\Users\head user\Desktop\Hamthan\v3\AI-Operation-Kaizen\FullStack\frontend\src\components\issue\CallHistorySection.js

```javascript
import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import Card from '../common/Card';
import { formatTime, formatDuration } from '../../utils/formatters';

const CallHistorySection = ({ callLogs }) => {
  const { theme, isDark } = useTheme();

  if (!callLogs || callLogs.length === 0) return null;

  // Logic untouched, only swapped the icon name to look slightly sharper
  const getStatusIcon = (status) => {
    switch (status) {
      case 'ANSWERED': return 'call';
      case 'MISSED': return 'call-outline';
      default: return 'call-outline';
    }
  };

  // Logic untouched, but updated colors to the premium palette
  const getStatusColor = (status) => {
    switch (status) {
      case 'ANSWERED': return '#10a37f'; // 🚀 ChatGPT/OpenAI Green
      case 'MISSED': return '#ef4444';   // Clean Red
      default: return '#8e8ea0';         // Premium Gray
    }
  };

  return (
    <Card style={[
      styles.card, 
      { backgroundColor: isDark ? '#171717' : '#ffffff', borderColor: isDark ? '#333' : '#e5e5e5' }
    ]}>
      
      {/* ── Header ── */}
      <View style={styles.header}>
        <View style={[styles.headerIconWrapper, { backgroundColor: isDark ? '#2f2f2f' : '#f4f4f4' }]}>
          <Ionicons name="cellular-outline" size={16} color={theme.textSecondary} />
        </View>
        <Text style={[styles.title, { color: theme.text }]}>
          Automatic Call Attempts
        </Text>
      </View>
      
      {/* ── Log List ── */}
      <View style={styles.listContainer}>
        {callLogs.map((log, index) => {
          // UI Logic: Remove the bottom border for the very last item for a cleaner look
          const isLastItem = index === callLogs.length - 1;

          return (
            <View 
              key={log.id} 
              style={[
                styles.logItem, 
                !isLastItem && { 
                  borderBottomWidth: StyleSheet.hairlineWidth, 
                  borderBottomColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' 
                }
              ]}
            >
              <View style={styles.logLeft}>
                <View style={[styles.statusIcon, { backgroundColor: `${getStatusColor(log.status)}15` }]}>
                  <Ionicons name={getStatusIcon(log.status)} size={16} color={getStatusColor(log.status)} />
                </View>
                <View>
                  <Text style={[styles.attempt, { color: theme.text }]}>
                    Attempt {log.attempt_number}
                  </Text>
                  <Text style={[styles.time, { color: theme.textSecondary }]}>
                    {formatTime(log.initiated_at)}
                  </Text>
                </View>
              </View>
              
              <View style={styles.logRight}>
                <Text style={[styles.status, { color: getStatusColor(log.status) }]}>
                  {log.status === 'ANSWERED' ? 'Answered' : 'Missed'}
                </Text>
                {log.status === 'ANSWERED' && log.ended_at && log.answered_at && (
                  <Text style={[styles.duration, { color: theme.textSecondary }]}>
                    {formatDuration((new Date(log.ended_at) - new Date(log.answered_at)) / 1000)}
                  </Text>
                )}
              </View>
            </View>
          );
        })}
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginTop: 20,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    // Overriding the generic Card shadow to make it flat/modern
    ...Platform.select({
      ios: { shadowOpacity: 0 },
      android: { elevation: 0 },
    }),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  headerIconWrapper: {
    width: 28,
    height: 28,
    borderRadius: 8, // Modern rounded square
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  listContainer: {
    marginTop: 4,
  },
  logItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
  },
  logLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusIcon: {
    width: 36,
    height: 36,
    borderRadius: 10, // Squircle instead of a perfect circle
    justifyContent: 'center',
    alignItems: 'center',
  },
  attempt: {
    fontSize: 14,
    fontWeight: '600', // Bolder to match GPT typography
    letterSpacing: -0.1,
  },
  time: {
    fontSize: 12,
    marginTop: 2,
  },
  logRight: {
    alignItems: 'flex-end',
  },
  status: {
    fontSize: 13,
    fontWeight: '600',
  },
  duration: {
    fontSize: 12,
    marginTop: 4,
    fontVariant: ['tabular-nums'], // Keeps numbers aligned perfectly
  },
});

export default CallHistorySection;
```

## C:\Users\head user\Desktop\Hamthan\v3\AI-Operation-Kaizen\FullStack\frontend\src\components\issue\ImageGallery.js

```javascript
import React from 'react';
import { View, Text, Image, StyleSheet, ScrollView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';

const ImageGallery = ({ images, showLabels = true }) => {
  const { theme, isDark } = useTheme();

  // Logic remains entirely untouched
  const beforeImage = images?.find(img => img.image_type === 'BEFORE');
  const afterImage = images?.find(img => img.image_type === 'AFTER');

  if (!images || images.length === 0) {
    return (
      <View style={[
        styles.emptyContainer, 
        { 
          backgroundColor: isDark ? 'rgba(255, 255, 255, 0.02)' : '#fafafa',
          borderColor: isDark ? '#333' : '#e5e5e5'
        }
      ]}>
        <Ionicons name="image-outline" size={24} color={theme.textSecondary} style={{ opacity: 0.6 }} />
        <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
          No media attached
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {beforeImage && (
          <View style={[styles.imageContainer, { borderColor: isDark ? '#333' : '#e5e5e5' }]}>
            {showLabels && (
              <View style={styles.labelPill}>
                <View style={[styles.statusDot, { backgroundColor: '#ef4444' }]} />
                <Text style={styles.labelText}>Before</Text>
              </View>
            )}
            <Image
              source={{ uri: beforeImage.image_url }}
              style={styles.image}
              resizeMode="cover"
            />
          </View>
        )}
        
        {afterImage && (
          <View style={[styles.imageContainer, { borderColor: isDark ? '#333' : '#e5e5e5' }]}>
            {showLabels && (
              <View style={styles.labelPill}>
                <View style={[styles.statusDot, { backgroundColor: '#10a37f' }]} />
                <Text style={styles.labelText}>After</Text>
              </View>
            )}
            <Image
              source={{ uri: afterImage.image_url }}
              style={styles.image}
              resizeMode="cover"
            />
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 12,
  },
  scrollContent: {
    paddingRight: 16, // Prevents the last image from cutting off against the screen edge
    gap: 12,
  },
  imageContainer: {
    position: 'relative',
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    backgroundColor: '#1a1a1a', // Shows briefly while image loads
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
      android: { elevation: 2 },
    }),
  },
  image: {
    width: 220, // Wider, more cinematic aspect ratio
    height: 140,
  },
  labelPill: {
    position: 'absolute',
    bottom: 10, // Moved to bottom-left for a more modern camera-app feel
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.65)', // Premium translucent dark background
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20, // Full pill shape
    zIndex: 1,
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  labelText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.2,
    textTransform: 'uppercase',
  },
  emptyContainer: {
    height: 100,
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: 'dashed', // Dashed border indicates a "drop zone" or missing data clearly
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginVertical: 8,
  },
  emptyText: {
    fontSize: 13,
    fontWeight: '500',
  },
});

export default ImageGallery;
```

## C:\Users\head user\Desktop\Hamthan\v3\AI-Operation-Kaizen\FullStack\frontend\src\components\issue\IssueCard.js

```javascript
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import StatusBadge from '../common/StatusBadge';
import { formatOverdueText, getDeadlineColor } from '../../utils/overdue';

// ── BOLD PROFESSIONAL STATUS PALETTE ──
const getStatusTheme = (status, isDark) => {
  const themes = {
    OPEN: { base: '#3b82f6' },
    ASSIGNED: { base: '#8b5cf6' },
    IN_PROGRESS: { base: '#eab308' },
    RESOLVED_PENDING_REVIEW: { base: '#f97316' },
    COMPLETED: { base: '#10a37f' },
    REOPENED: { base: '#ef4444' },
    ESCALATED: { base: '#dc2626' },
  };

  const selected = themes[status] || { base: '#8e8ea0' };
  const baseColor = selected.base;

  return {
    accent: baseColor,
    bgBody: isDark ? `${baseColor}20` : `${baseColor}15`,
    border: isDark ? `${baseColor}40` : `${baseColor}35`,
    pillBg: isDark ? `${baseColor}30` : `${baseColor}25`,
  };
};

const IssueCard = ({ issue, onPress }) => {
  const { theme, isDark } = useTheme();

  const deadlineText = formatOverdueText(issue.deadline_at, issue.status);
  const deadlineColor = getDeadlineColor(issue.deadline_at, issue.status);
  const cardTheme = getStatusTheme(issue.status, isDark);

  const formatTrackStatus = (statusStr) => {
    if (!statusStr) return '';
    return statusStr.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const thumbnailUri = issue.images && issue.images.length > 0 ? issue.images[0].image_url : null;

  // ── Per-theme card surface ──
  // Dark:  deep slate with a whisper of the accent tint + a glass-edge top highlight
  // Light: pure white, lifted by a soft directional shadow + faint accent wash
  const cardBg = isDark
    ? `${cardTheme.accent}0D`   // ~5% accent over transparent — layered on dark base below
    : '#ffffff';

  const cardBase = isDark ? '#18181f' : '#ffffff'; // true base (drawn first)

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={[
        styles.card,
        {
          // Light: crisp shadow. Dark: accent-tinted shadow for depth.
          ...Platform.select({
            ios: {
              shadowColor: isDark ? cardTheme.accent : '#000',
              shadowOffset: { width: 0, height: isDark ? 6 : 3 },
              shadowOpacity: isDark ? 0.22 : 0.09,
              shadowRadius: isDark ? 18 : 10,
            },
            android: { elevation: isDark ? 6 : 3 },
          }),
        }
      ]}
    >
      {/* ── Base surface layer ── */}
      <View style={[StyleSheet.absoluteFill, styles.baseSurface, { backgroundColor: cardBase }]} />

      {/* ── Accent tint wash (gives the card its identity colour) ── */}
      <View style={[StyleSheet.absoluteFill, styles.baseSurface, { backgroundColor: isDark ? `${cardTheme.accent}0F` : `${cardTheme.accent}07` }]} />

      {/* ── Glass-edge top highlight (dark only) ──
           Simulates the bright top rim of a frosted glass object. */}
      {isDark && (
        <View style={styles.glassEdge} />
      )}

      {/* ── Left accent bar ── */}
      <View style={[styles.accentBar, { backgroundColor: cardTheme.accent }]} />

      {/* ── Outer border ── */}
      <View style={[
        styles.outerBorder,
        {
          borderColor: isDark
            ? `${cardTheme.accent}28`
            : `${cardTheme.accent}22`,
        }
      ]} />

      {/* ── Content ── */}
      <View style={styles.contentContainer}>

        {/* ── Header: ID & Badges ── */}
        <View style={styles.header}>
          <View style={styles.idContainer}>
            <Text style={[styles.issueId, { color: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.3)' }]}>
              #{issue.id}
            </Text>
            <StatusBadge status={issue.status} size="small" />
            <StatusBadge status={issue.priority} type="priority" size="small" />
          </View>
        </View>

        {/* ── Body: Title, Meta & Thumbnail ── */}
        <View style={styles.body}>
          <View style={styles.bodyLeft}>
            <Text
              style={[
                styles.title,
                { color: isDark ? 'rgba(255,255,255,0.92)' : 'rgba(0,0,0,0.87)' }
              ]}
              numberOfLines={2}
            >
              {issue.title}
            </Text>

            <View style={styles.details}>
              {/* Site Name */}
              <View style={styles.detailRow}>
                <Ionicons
                  name="location"
                  size={13}
                  color={isDark ? 'rgba(255,255,255,0.38)' : 'rgba(0,0,0,0.38)'}
                />
                <Text
                  style={[styles.detailText, { color: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)' }]}
                  numberOfLines={1}
                >
                  {issue.site_name || 'Unknown Site'}
                </Text>
              </View>

              <View style={[styles.dot, { backgroundColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)' }]} />

              {/* Raised By */}
              <View style={styles.detailRow}>
                <Ionicons
                  name="person"
                  size={13}
                  color={isDark ? 'rgba(255,255,255,0.38)' : 'rgba(0,0,0,0.38)'}
                />
                <Text
                  style={[styles.detailText, { color: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)' }]}
                  numberOfLines={1}
                >
                  {issue.supervisor_name || 'System'}
                </Text>
              </View>
            </View>

            {/* Track Status Sub-badge */}
            {issue.track_status && (
              <View style={[
                styles.trackStatusContainer,
                {
                  backgroundColor: isDark
                    ? `${cardTheme.accent}1A`
                    : `${cardTheme.accent}12`,
                  borderColor: isDark
                    ? `${cardTheme.accent}30`
                    : `${cardTheme.accent}25`,
                }
              ]}>
                <View style={[styles.trackStatusDot, { backgroundColor: cardTheme.accent }]} />
                <Text style={[
                  styles.trackStatusText,
                  { color: isDark ? `${cardTheme.accent}` : cardTheme.accent }
                ]}>
                  {formatTrackStatus(issue.track_status)}
                </Text>
              </View>
            )}
          </View>

          {/* Thumbnail */}
          {thumbnailUri && (
            <View style={[
              styles.thumbnailWrapper,
              {
                borderColor: isDark
                  ? `${cardTheme.accent}35`
                  : `${cardTheme.accent}28`,
                ...Platform.select({
                  ios: {
                    shadowColor: cardTheme.accent,
                    shadowOffset: { width: 0, height: 3 },
                    shadowOpacity: 0.25,
                    shadowRadius: 6,
                  },
                  android: { elevation: 3 },
                }),
              }
            ]}>
              <Image
                source={{ uri: thumbnailUri }}
                style={styles.thumbnail}
                resizeMode="cover"
              />
            </View>
          )}
        </View>

        {/* ── Footer ── */}
        <View style={[
          styles.footer,
          {
            borderTopColor: isDark
              ? 'rgba(255,255,255,0.06)'
              : 'rgba(0,0,0,0.06)',
          }
        ]}>
          <View style={styles.deadline}>
            <Ionicons name="time-outline" size={14} color={deadlineColor} />
            <Text style={[styles.deadlineText, { color: deadlineColor }]}>
              {deadlineText}
            </Text>
          </View>
          <View style={styles.actionRow}>
            <Text style={[styles.actionText, { color: cardTheme.accent }]}>View Details</Text>
            <Ionicons name="arrow-forward" size={15} color={cardTheme.accent} />
          </View>
        </View>

      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: 14,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
  },

  // ── Layered surface system ──
  baseSurface: {
    borderRadius: 16,
  },

  // Thin bright line on the very top of the card — the "glass rim"
  glassEdge: {
    position: 'absolute',
    top: 0,
    left: 16,
    right: 16,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderRadius: 1,
  },

  // 3px solid left accent strip
  accentBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
  },

  // Full card border overlay
  outerBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 16,
    borderWidth: 1,
  },

  // ── Content ──
  contentContainer: {
    paddingLeft: 18,   // extra left padding to clear the accent bar
    paddingRight: 16,
    paddingTop: 14,
    paddingBottom: 14,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  idContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  issueId: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  body: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 14,
  },
  bodyLeft: {
    flex: 1,
  },
  title: {
    fontSize: 15.5,
    fontWeight: '600',
    marginBottom: 8,
    lineHeight: 22,
    letterSpacing: -0.3,
  },
  details: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  detailText: {
    fontSize: 12.5,
    fontWeight: '500',
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
  },
  trackStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 7,
    borderWidth: 1,
  },
  trackStatusDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  trackStatusText: {
    fontSize: 11.5,
    fontWeight: '600',
    letterSpacing: 0.15,
  },

  // ── Thumbnail ──
  thumbnailWrapper: {
    borderRadius: 11,
    borderWidth: 1.5,
    overflow: 'hidden',
  },
  thumbnail: {
    width: 62,
    height: 62,
  },

  // ── Footer ──
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    marginTop: 12,
    borderTopWidth: 1,
  },
  deadline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  deadlineText: {
    fontSize: 12.5,
    fontWeight: '600',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  actionText: {
    fontSize: 12.5,
    fontWeight: '600',
  },
});

export default IssueCard;
```

## C:\Users\head user\Desktop\Hamthan\v3\AI-Operation-Kaizen\FullStack\frontend\src\components\issue\IssueTimeline.js

```javascript
import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import Avatar from '../common/Avatar';
import { formatDateTime, formatRelativeTime } from '../../utils/formatters';
import { getUserById } from '../../mocks/users';

const IssueTimeline = ({ history }) => {
  const { theme, isDark } = useTheme();

  // Logic untouched
  const getIcon = (actionType) => {
    switch (actionType) {
      case 'CREATED': return 'add';
      case 'AUTO_ASSIGNED': return 'flash-outline';
      case 'STATUS_CHANGE': return 'swap-horizontal';
      case 'FIX_UPLOADED': return 'camera-outline';
      case 'VERIFIED': return 'checkmark';
      case 'ESCALATED': return 'warning-outline';
      case 'REOPENED': return 'refresh-outline';
      case 'COMPLETED': return 'checkmark-done';
      default: return 'ellipse';
    }
  };

  // Upgraded to premium palette
  const getColor = (actionType) => {
    switch (actionType) {
      case 'CREATED': return '#3b82f6';
      case 'AUTO_ASSIGNED': return '#8b5cf6';
      case 'FIX_UPLOADED': return '#f59e0b';
      case 'VERIFIED': return '#10a37f'; // 🚀 OpenAI Green
      case 'COMPLETED': return '#10a37f'; // 🚀 OpenAI Green
      case 'ESCALATED': return '#ef4444';
      case 'REOPENED': return '#f97316';
      default: return '#8e8ea0';
    }
  };

  return (
    <View style={styles.container}>
      {history.map((item, index) => {
        const user = item.changed_by_user_id ? getUserById(item.changed_by_user_id) : null;
        const isLast = index === history.length - 1;

        return (
          <View key={item.id} style={styles.item}>
            
            {/* ── Left Timeline Track ── */}
            <View style={styles.left}>
              <View style={[styles.iconContainer, { backgroundColor: `${getColor(item.action_type)}15` }]}>
                <Ionicons name={getIcon(item.action_type)} size={14} color={getColor(item.action_type)} />
              </View>
              {!isLast && <View style={[styles.line, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }]} />}
            </View>

            {/* ── Right Content Area ── */}
            <View style={styles.content}>
              
              {/* Header Row */}
              <View style={styles.header}>
                <View style={styles.headerLeft}>
                  {user ? (
                    <Avatar uri={user.avatar} name={user.name} size="small" />
                  ) : (
                    <View style={[styles.systemAvatar, { backgroundColor: isDark ? '#2f2f2f' : '#f0f0f0' }]}>
                      <Ionicons name="hardware-chip" size={14} color={theme.textSecondary} />
                    </View>
                  )}
                  <Text style={[styles.userName, { color: theme.text }]}>
                    {user ? user.name : 'System AI'}
                  </Text>
                </View>
                
                {/* Time moved to the right for a cleaner layout */}
                <Text style={[styles.time, { color: theme.textSecondary }]}>
                  {formatRelativeTime(item.created_at)}
                </Text>
              </View>

              {/* Details Text */}
              <View style={[styles.detailsBox, { backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : '#fcfcfc', borderColor: isDark ? '#333' : '#f0f0f0' }]}>
                <Text style={[styles.details, { color: theme.textSecondary }]}>
                  {item.details}
                </Text>
              </View>

            </View>
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 12,
  },
  item: {
    flexDirection: 'row',
  },
  left: {
    width: 32,
    alignItems: 'center',
    marginRight: 12,
  },
  iconContainer: {
    width: 26, // Smaller, more refined node
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4, // Align with text
  },
  line: {
    width: 1, // Ultra-thin thread
    flex: 1,
    marginTop: 6,
    marginBottom: -4,
  },
  content: {
    flex: 1,
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between', // Pushes time to the right
    marginBottom: 8,
    marginTop: 6, // Aligns header with the timeline node
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  systemAvatar: {
    width: 28,
    height: 28,
    borderRadius: 8, // Modern Squircle shape
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(128,128,128,0.2)',
  },
  userName: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  time: {
    fontSize: 12,
    fontWeight: '500',
  },
  detailsBox: {
    marginTop: 4,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  details: {
    fontSize: 14,
    lineHeight: 22,
    letterSpacing: -0.1,
  },
});

export default IssueTimeline;
```

## C:\Users\head user\Desktop\Hamthan\v3\AI-Operation-Kaizen\FullStack\frontend\src\components\modals\FilterModal.js

```javascript
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TouchableWithoutFeedback,
  Animated,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';

// ── EXACT COLOR PALETTE MAPPED TO CARDS ──
const STATUS_OPTIONS = [
  { label: 'Open', value: 'OPEN', color: '#3b82f6' },
  { label: 'Assigned', value: 'ASSIGNED', color: '#8b5cf6' },
  { label: 'In Progress', value: 'IN_PROGRESS', color: '#eab308' },
  { label: 'Resolved (Pending Review)', value: 'RESOLVED_PENDING_REVIEW', color: '#f97316' },
  { label: 'Completed', value: 'COMPLETED', color: '#10a37f' },
  { label: 'Reopened', value: 'REOPENED', color: '#ef4444' },
  { label: 'Escalated', value: 'ESCALATED', color: '#dc2626' },
];

const PRIORITY_OPTIONS = [
  { label: 'High', value: 'high', color: '#ef4444' },
  { label: 'Medium', value: 'medium', color: '#f59e0b' },
  { label: 'Low', value: 'low', color: '#10a37f' },
];

const CATEGORY_OPTIONS = [
  { label: 'Electrical', value: 'Electrical' },
  { label: 'Plumbing', value: 'Plumbing' },
  { label: 'Safety', value: 'Safety' },
  { label: 'HVAC', value: 'HVAC' },
  { label: 'Mechanical', value: 'Mechanical' },
  { label: 'Building', value: 'Building' },
  { label: 'Other', value: 'Other' },
];

const DATE_RANGE_OPTIONS = [
  { label: 'Today', value: 'today' },
  { label: 'This Week', value: 'week' },
  { label: 'This Month', value: 'month' },
  { label: 'Last 3 Months', value: '3months' },
  { label: 'All Time', value: 'all' },
];

const FilterModal = ({
  visible,
  onClose,
  onApply,
  initialFilters = {},
  sites = [],
}) => {
  const { theme, isDark } = useTheme();
  const [slideAnim] = useState(new Animated.Value(0));
  
  const [selectedStatuses, setSelectedStatuses] = useState(initialFilters.statuses || []);
  const [selectedPriorities, setSelectedPriorities] = useState(initialFilters.priorities || []);
  const [selectedCategories, setSelectedCategories] = useState(initialFilters.categories || []);
  const [selectedSite, setSelectedSite] = useState(initialFilters.site || null);
  const [selectedDateRange, setSelectedDateRange] = useState(initialFilters.dateRange || 'all');
  const [showOverdueOnly, setShowOverdueOnly] = useState(initialFilters.overdueOnly || false);

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }).start();
    } else {
      slideAnim.setValue(0);
    }
  }, [visible]);

  const toggleStatus = (status) => setSelectedStatuses(prev => prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]);
  const togglePriority = (priority) => setSelectedPriorities(prev => prev.includes(priority) ? prev.filter(p => p !== priority) : [...prev, priority]);
  const toggleCategory = (category) => setSelectedCategories(prev => prev.includes(category) ? prev.filter(c => c !== category) : [...prev, category]);

  const handleReset = () => {
    setSelectedStatuses([]);
    setSelectedPriorities([]);
    setSelectedCategories([]);
    setSelectedSite(null);
    setSelectedDateRange('all');
    setShowOverdueOnly(false);
  };

  const handleApply = () => {
    onApply({
      statuses: selectedStatuses,
      priorities: selectedPriorities,
      categories: selectedCategories,
      site: selectedSite,
      dateRange: selectedDateRange,
      overdueOnly: showOverdueOnly,
    });
    onClose();
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (selectedStatuses.length > 0) count++;
    if (selectedPriorities.length > 0) count++;
    if (selectedCategories.length > 0) count++;
    if (selectedSite) count++;
    if (selectedDateRange !== 'all') count++;
    if (showOverdueOnly) count++;
    return count;
  };

  const translateY = slideAnim.interpolate({ inputRange: [0, 1], outputRange: [600, 0] });

  // ── STRICT MONOCHROME PALETTE (Fallbacks) ──
  const activeBg = isDark ? '#ffffff' : '#101010'; 
  const activeText = isDark ? '#000000' : '#ffffff';
  const inactiveBg = isDark ? '#212121' : '#f9f9f9';
  const inactiveBorder = isDark ? '#333333' : '#e5e5e5';
  const inactiveText = isDark ? '#a1a1aa' : '#52525b';

  // ── PREMIUM CHIP RENDERER ──
  const renderChip = (option, isSelected, onToggle, hasColorTheme = false) => {
    
    // Default colors for generic chips (Categories, Sites, Dates)
    let chipBg = isSelected ? activeBg : inactiveBg;
    let chipBorder = isSelected ? activeBg : inactiveBorder;
    let chipTextColor = isSelected ? activeText : inactiveText;

    // Apply bright, obvious background if the option has a color (Status & Priority)
    if (hasColorTheme && option.color) {
      if (isSelected) {
        // Active State: Highly visible solid background tint (approx 20-30% opacity)
        chipBg = isDark ? `${option.color}40` : `${option.color}33`; 
        chipBorder = option.color; // Pure color border
        chipTextColor = isDark ? '#ffffff' : option.color; // High contrast text
      } else {
        // Inactive State: Obvious but secondary tint (approx 10-15% opacity)
        chipBg = isDark ? `${option.color}1A` : `${option.color}15`; 
        chipBorder = isDark ? `${option.color}40` : `${option.color}30`; 
        chipTextColor = option.color; // Pure color text, not faded!
      }
    }

    return (
      <TouchableOpacity
        key={option.value}
        activeOpacity={0.7}
        style={[
          styles.chip,
          { 
            backgroundColor: chipBg,
            borderColor: chipBorder,
            borderWidth: 1,
          },
        ]}
        onPress={onToggle}
      >
        <Text
          style={[
            styles.chipText,
            { color: chipTextColor },
          ]}
        >
          {option.label}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <Animated.View style={[styles.modalContainer, { backgroundColor: isDark ? '#1a1a1a' : '#ffffff', transform: [{ translateY }] }]}>
              
              <View style={styles.dragHandleContainer}>
                <View style={[styles.dragHandle, { backgroundColor: isDark ? '#333' : '#e5e5e5' }]} />
              </View>

              <View style={[styles.header, { borderBottomColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
                <TouchableOpacity onPress={handleReset} activeOpacity={0.6}>
                  <Text style={[styles.resetText, { color: theme.textSecondary }]}>Reset</Text>
                </TouchableOpacity>
                <Text style={[styles.title, { color: theme.text }]}>Filters</Text>
                <TouchableOpacity onPress={onClose} activeOpacity={0.6} style={styles.closeBtn}>
                  <Ionicons name="close-circle" size={26} color={isDark ? '#444' : '#e5e5e5'} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                
                <View style={styles.section}>
                  <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Status</Text>
                  <View style={styles.chipsContainer}>
                    {/* ✅ Passed "true" for hasColorTheme */}
                    {STATUS_OPTIONS.map(option => renderChip(option, selectedStatuses.includes(option.value), () => toggleStatus(option.value), true))}
                  </View>
                </View>

                <View style={styles.section}>
                  <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Priority</Text>
                  <View style={styles.chipsContainer}>
                    {PRIORITY_OPTIONS.map(option => renderChip(option, selectedPriorities.includes(option.value), () => togglePriority(option.value), true))}
                  </View>
                </View>

                {sites.length > 0 && (
                  <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Site</Text>
                    <View style={styles.chipsContainer}>
                      <TouchableOpacity
                        style={[
                          styles.chip,
                          { 
                            backgroundColor: !selectedSite ? activeBg : inactiveBg,
                            borderColor: !selectedSite ? activeBg : inactiveBorder,
                            borderWidth: 1,
                          },
                        ]}
                        onPress={() => setSelectedSite(null)}
                      >
                        <Text style={[styles.chipText, { color: !selectedSite ? activeText : inactiveText }]}>
                          All Sites
                        </Text>
                      </TouchableOpacity>
                      {sites.map(site => (
                        <TouchableOpacity
                          key={site.id}
                          style={[
                            styles.chip,
                            { 
                              backgroundColor: selectedSite === site.id ? activeBg : inactiveBg,
                              borderColor: selectedSite === site.id ? activeBg : inactiveBorder,
                              borderWidth: 1,
                            },
                          ]}
                          onPress={() => setSelectedSite(site.id)}
                        >
                          <Text style={[styles.chipText, { color: selectedSite === site.id ? activeText : inactiveText }]}>
                            {site.name}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}

                <View style={styles.section}>
                  <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Date Range</Text>
                  <View style={styles.chipsContainer}>
                    {DATE_RANGE_OPTIONS.map(option => renderChip(option, selectedDateRange === option.value, () => setSelectedDateRange(option.value)))}
                  </View>
                </View>

                <TouchableOpacity
                  activeOpacity={0.8}
                  style={[styles.toggleRow, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : '#f9f9f9', borderColor: isDark ? '#333' : '#f0f0f0' }]}
                  onPress={() => setShowOverdueOnly(!showOverdueOnly)}
                >
                  <View style={styles.toggleContent}>
                    <View style={[styles.iconWrapper, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
                      <Ionicons name="time" size={18} color="#ef4444" />
                    </View>
                    <Text style={[styles.toggleText, { color: theme.text }]}>Show Overdue Only</Text>
                  </View>
                  {/* Semantic Green used strictly for active toggle state */}
                  <View style={[styles.toggle, { backgroundColor: showOverdueOnly ? '#10a37f' : (isDark ? '#444' : '#e5e5e5') }]}>
                    <View style={[styles.toggleKnob, { transform: [{ translateX: showOverdueOnly ? 20 : 0 }] }]} />
                  </View>
                </TouchableOpacity>

                <View style={styles.bottomPadding} />
              </ScrollView>

              <View style={[styles.footer, { borderTopColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  style={[styles.applyButton, { backgroundColor: activeBg }]}
                  onPress={handleApply}
                >
                  <Text style={[styles.applyButtonText, { color: activeText }]}>
                    Apply Filters
                    {getActiveFilterCount() > 0 && ` (${getActiveFilterCount()})`}
                  </Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '88%',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 12 },
      android: { elevation: 10 },
    }),
  },
  dragHandleContainer: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 4,
  },
  dragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  resetText: {
    fontSize: 15,
    fontWeight: '500',
  },
  closeBtn: {
    padding: 2,
  },
  content: {
    paddingHorizontal: 20,
  },
  section: {
    marginTop: 28,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 14,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12, 
    gap: 6,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '700', // BUMPED TO 700 so text is loud and proud
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 28,
  },
  toggleContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  toggleText: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
  toggle: {
    width: 44,
    height: 24,
    borderRadius: 12,
    padding: 2,
    justifyContent: 'center',
  },
  toggleKnob: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#ffffff',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 2 },
      android: { elevation: 2 },
    }),
  },
  bottomPadding: {
    height: 40,
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
  },
  applyButton: {
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
});

export default FilterModal;
```

## C:\Users\head user\Desktop\Hamthan\v3\AI-Operation-Kaizen\FullStack\frontend\src\components\skeletons\DashboardCardSkeleton.js

```javascript
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import Shimmer from '../common/Shimmer';

const DashboardCardSkeleton = () => {
  const { theme } = useTheme();

  return (
    <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <Shimmer width={48} height={48} borderRadius={24} style={{ marginBottom: 12 }} />
      <Shimmer width={50} height={28} style={{ marginBottom: 4 }} />
      <Shimmer width={70} height={14} />
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    minWidth: '45%',
    marginHorizontal: 4,
    marginVertical: 4,
  },
});

export default DashboardCardSkeleton;
```

## C:\Users\head user\Desktop\Hamthan\v3\AI-Operation-Kaizen\FullStack\frontend\src\components\skeletons\IssueCardSkeleton.js

```javascript
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import Shimmer from '../common/Shimmer';

const IssueCardSkeleton = () => {
  const { theme } = useTheme();

  return (
    <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={styles.header}>
        <Shimmer width={60} height={20} />
        <Shimmer width={80} height={24} borderRadius={12} />
      </View>
      <Shimmer width="90%" height={18} style={{ marginBottom: 8 }} />
      <Shimmer width="70%" height={14} style={{ marginBottom: 12 }} />
      <View style={styles.footer}>
        <Shimmer width={48} height={48} borderRadius={8} />
        <Shimmer width={100} height={14} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
});

export default IssueCardSkeleton;
```

## C:\Users\head user\Desktop\Hamthan\v3\AI-Operation-Kaizen\FullStack\frontend\src\hooks\useDebounce.js

```javascript
import { useState, useEffect, useRef } from 'react';

export const useDebounce = (value, delay = 500) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
};

export default useDebounce;
```

## C:\Users\head user\Desktop\Hamthan\v3\AI-Operation-Kaizen\FullStack\frontend\src\hooks\useNetworkStatus.js

```javascript
import { useState, useEffect, useCallback } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { useDispatch } from 'react-redux';
import { setOnlineStatus } from '../store/slices/offlineSlice';
import { Platform } from 'react-native';

export const useNetworkStatus = () => {
  const [isConnected, setIsConnected] = useState(true);
  const dispatch = useDispatch();

  const updateStatus = useCallback((status) => {
    setIsConnected(status);
    dispatch(setOnlineStatus(status));
    console.log("🌐 Redux Updated - Is Online:", status);
  }, [dispatch]);

  useEffect(() => {
    // 1. Standard NetInfo Listener (Works best on Mobile)
    const unsubscribe = NetInfo.addEventListener(state => {
      // On Web, isInternetReachable is often null, so we fallback to isConnected
      const connected = state.isConnected && state.isInternetReachable !== false;
      updateStatus(connected);
    });

    // 2. Native Browser Listeners (Standard for Web)
    if (Platform.OS === 'web') {
      const goOnline = () => updateStatus(true);
      const goOffline = () => updateStatus(false);

      window.addEventListener('online', goOnline);
      window.addEventListener('offline', goOffline);

      return () => {
        unsubscribe();
        window.removeEventListener('online', goOnline);
        window.removeEventListener('offline', goOffline);
      };
    }

    return () => unsubscribe();
  }, [updateStatus]);

  const checkConnection = useCallback(async () => {
    const state = await NetInfo.fetch();
    return state.isConnected && state.isInternetReachable !== false;
  }, []);

  return { isConnected, checkConnection };
};

export default useNetworkStatus;
```

## C:\Users\head user\Desktop\Hamthan\v3\AI-Operation-Kaizen\FullStack\frontend\src\hooks\useSmartBack.js

```javascript
import { useCallback } from 'react';
import { BackHandler, Platform } from 'react-native';
import { useFocusEffect } from 'expo-router';

export const useSmartBack = (customBackAction) => {
  useFocusEffect(
    useCallback(() => {
      const onHardwareBackPress = () => {
        if (customBackAction) {
          customBackAction();
          return true; // Blocks default Android back behavior
        }
        return false;
      };

      let subscription;
      
      if (Platform.OS === 'android') {
        subscription = BackHandler.addEventListener('hardwareBackPress', onHardwareBackPress);
      }

      return () => {
        if (Platform.OS === 'android') {
          // Bulletproof cleanup: safely supports both old and new React Native versions
          if (subscription && typeof subscription.remove === 'function') {
            subscription.remove();
          } else if (typeof BackHandler.removeEventListener === 'function') {
            BackHandler.removeEventListener('hardwareBackPress', onHardwareBackPress);
          }
        }
      };
    }, [customBackAction])
  );
};
```

## C:\Users\head user\Desktop\Hamthan\v3\AI-Operation-Kaizen\FullStack\frontend\src\mocks\apiService.js

```javascript
// Mock API Service with simulated delays
import { users, getUserByUsername, getUserById } from './users';
import { sites, getSiteById } from './sites';
import { issues, getIssueById } from './issues';
import { issueAssignments, getAssignmentByIssueId, getIssueIdsBySolverId } from './issueAssignments';
import { complaints, getComplaintById, getComplaintsBySupervisorId, getComplaintsBySolverId } from './complaints';
import { issueImages, getImagesByIssueId } from './issueImages';
import { issueHistory, getHistoryByIssueId } from './issueHistory';
import { callLogs, getCallLogsByAssignmentId } from './callLogs';
import { chatMessages, getConversationsList, getChatMessagesByConversationId } from './chatMessages';
import { NOT_FIXED_STATUSES, FIXED_STATUSES } from '../utils/constants';

const delay = (ms = 200) => new Promise(resolve => setTimeout(resolve, ms));
const SAFE_NOT_FIXED_STATUSES = ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'REOPENED', 'ESCALATED'];
const SAFE_FIXED_STATUSES = ['COMPLETED', 'RESOLVED_PENDING_REVIEW'];

// Auth
export const loginUser = async (username, password) => {
  await delay();
  console.log('🔍 loginUser called with:', username, password);
  const user = getUserByUsername(username);
  console.log('🔍 user found:', user?.username || 'NOT FOUND');
  
  if (!user || user.password !== password) {
    return { success: false, error: 'Invalid credentials' };
  }
  const { password: _, ...userWithoutPassword } = user;
  const result = {
    success: true,
    user: userWithoutPassword,
    token: `mock-token-${user.id}-${Date.now()}`,
  };
  console.log('🔍 loginUser returning:', result.success);
  return result;
};

// Auth - Logout
export const logoutUser = async () => {
  await delay();
  return { success: true };
};

// Auth - Get stored user (simulates checking AsyncStorage/localStorage)
export const getStoredUser = async () => {
  await delay();
  return null; // No persisted session in mock
};

// Auth - Get current user (simulates verifying token with server)
export const getCurrentUser = async () => {
  await delay();
  return { success: false }; // No active session in mock
};

// Issues - with role-based filtering
// Issues - with role-based filtering
export const fetchIssues = async (user) => {
  await delay();
  let filteredIssues = [...issues];
  
  // 🚨 THE FIX: Redux might pass an incomplete user object. 
  // Let's grab the full user from the mock DB using their ID to ensure we have their 'sites' array.
  const fullUser = user?.id ? getUserById(user.id) : user;
  
  if (fullUser?.role === 'supervisor') {
    // Fallback to sites [1,2,3,4,5] just in case the mock DB is missing the array too
    const userSites = fullUser?.sites?.length > 0 ? fullUser.sites : [1, 2, 3, 4, 5];
    filteredIssues = issues.filter(issue => userSites.includes(issue.site_id));
    
  } else if (fullUser?.role === 'problem_solver') {
    const assignedIssueIds = getIssueIdsBySolverId(fullUser.id);
    filteredIssues = issues.filter(issue => assignedIssueIds.includes(issue.id));
  }
  
  const mappedIssues = filteredIssues.map(issue => ({
    ...issue,
    site: getSiteById(issue.site_id),
    assignment: getAssignmentByIssueId(issue.id),
    beforeImage: getImagesByIssueId(issue.id).find(img => img.image_type === 'BEFORE'),
  }));

  return { success: true, issues: mappedIssues };
};

export const fetchIssueById = async (id) => {
  await delay();
  const issue = getIssueById(id);
  if (!issue) return { success: false, error: 'Issue not found' };
  
  const assignment = getAssignmentByIssueId(id);
  return {
    success: true,
    issue: {
      ...issue,
      site: getSiteById(issue.site_id),
      assignment,
      images: getImagesByIssueId(id),
      history: getHistoryByIssueId(id),
      callLogs: assignment ? getCallLogsByAssignmentId(assignment.id) : [],
      raisedBy: getUserById(issue.raised_by_supervisor_id),
      solver: assignment ? getUserById(assignment.assigned_to_solver_id) : null,
    },
  };
};



export const fetchNotFixedIssues = async (user) => {
  await delay();
  const result = await fetchIssues(user);
  
  // Extract the issues array from the result object safely
  const issuesList = result.issues || []; 
  
  // Apply the uppercase safety check
  return issuesList.filter(issue => 
    SAFE_NOT_FIXED_STATUSES.includes(issue.status?.toUpperCase())
  );
};

export const fetchFixedIssues = async (user) => {
  await delay();
  const result = await fetchIssues(user);
  
  // Extract the issues array from the result object safely
  const issuesList = result.issues || []; 
  
  // Apply the uppercase safety check
  return issuesList.filter(issue => 
    SAFE_FIXED_STATUSES.includes(issue.status?.toUpperCase())
  );
};

// Complaints - with role-based filtering
export const fetchComplaints = async (user) => {
  await delay();
  let filteredComplaints = [...complaints];

  if (user?.role === 'supervisor') {
    filteredComplaints = getComplaintsBySupervisorId(user.id);
  } else if (user?.role === 'problem_solver') {
    filteredComplaints = getComplaintsBySolverId(user.id);
  }

  const mappedComplaints = filteredComplaints.map(complaint => ({
    ...complaint,
    issue: getIssueById(complaint.issue_id),
    raisedBy: getUserById(complaint.raised_by_supervisor_id),
    targetSolver: complaint.target_solver_id
      ? getUserById(complaint.target_solver_id)
      : null,
  }));

  return { success: true, complaints: mappedComplaints };  // ✅ wrapped
};
export const fetchComplaintById = async (id) => {
  await delay();
  const complaint = getComplaintById(id);
  if (!complaint) throw new Error('Complaint not found');

  return {
    ...complaint,
    issue: getIssueById(complaint.issue_id),
    raisedBy: getUserById(complaint.raised_by_supervisor_id),
    targetSolver: complaint.target_solver_id ? getUserById(complaint.target_solver_id) : null,
  };
};

// Dashboard
// Dashboard
export const fetchDashboardData = async (user) => {
  await delay(300);
  console.log('📊 --- DASHBOARD DATA FETCH START ---');
  console.log('👤 User fetching dashboard:', user?.username, '| Role:', user?.role);

  const allIssues = await fetchIssues(user);
  const allComplaints = await fetchComplaints(user);

  const issuesList = allIssues.issues || [];
  const complaintsList = allComplaints.complaints || [];

  console.log(`📦 Raw Issues fetched: ${issuesList.length}`);
  if (issuesList.length > 0) {
      // Let's see exactly what the statuses look like in the raw data
      console.log('🏷️ Raw statuses found:', issuesList.map(i => i.status));
  } else {
      console.log('⚠️ WARNING: issuesList is empty! Check user role filtering in fetchIssues.');
  }

  // Define safe statuses that perfectly match your mock data
  const safeNotFixedStatuses = ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'REOPENED', 'ESCALATED'];
  const safeFixedStatuses = ['COMPLETED', 'RESOLVED_PENDING_REVIEW'];

  const totalIssues = issuesList.length;
  
  const notFixedIssues = issuesList.filter(i => {
    const isMatch = safeNotFixedStatuses.includes(i.status?.toUpperCase());
    if (!isMatch && !safeFixedStatuses.includes(i.status?.toUpperCase())) {
        console.log(`❓ UNKNOWN STATUS FOUND: ${i.status}`);
    }
    return isMatch;
  }).length;

  const fixedIssues = issuesList.filter(i => 
    safeFixedStatuses.includes(i.status?.toUpperCase())
  ).length;

  const complaintsCount = complaintsList.length;

  console.log(`🧮 Calculated -> Total: ${totalIssues} | Pending: ${notFixedIssues} | Resolved: ${fixedIssues} | Complaints: ${complaintsCount}`);

  const trendData = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toLocaleDateString('en-US', { weekday: 'short' });
    trendData.push({
      day: dateStr,
      created: Math.floor(Math.random() * 5) + 1,
      completed: Math.floor(Math.random() * 4) + 1,
    });
  }

  const issueTypeCounts = {};
  issuesList.forEach(issue => {
    issueTypeCounts[issue.issue_type] = (issueTypeCounts[issue.issue_type] || 0) + 1;
  });
  const issueTypes = Object.entries(issueTypeCounts).map(([name, count]) => ({ name, count }));

  const sitesComparison = sites.map(site => {
    const siteIssues = issuesList.filter(i => i.site_id === site.id);
    return {
      siteName: site.name.split(' ')[0],
      open: siteIssues.filter(i => safeNotFixedStatuses.includes(i.status?.toUpperCase())).length,
      completed: siteIssues.filter(i => safeFixedStatuses.includes(i.status?.toUpperCase())).length,
    };
  });

  const finalResult = {
    success: true,
    stats: {
      totalIssues,
      notFixedIssues,
      fixedIssues,
      complaints: complaintsCount,
    },
    charts: {
      trend: trendData,
      issueTypes,
      sitesComparison,
    },
  };

  console.log('📤 Returning final payload stats:', finalResult.stats);
  console.log('📊 --- DASHBOARD DATA FETCH END ---');
  return finalResult;
};

// Chat
export const fetchChatHistory = async () => {
  await delay();
  return getConversationsList();
};

export const fetchChatMessages = async (conversationId) => {
  await delay();
  return getChatMessagesByConversationId(conversationId);
};

// Sites
export const fetchSites = async () => {
  await delay();
  return sites;
};

// Users
export const fetchUserById = async (id) => {
  await delay();
  const user = getUserById(id);
  if (!user) throw new Error('User not found');
  const { password: _, ...userWithoutPassword } = user;
  return userWithoutPassword;
};
```

## C:\Users\head user\Desktop\Hamthan\v3\AI-Operation-Kaizen\FullStack\frontend\src\mocks\callLogs.js

```javascript
// Call Logs Mock Data - 2-4 call attempts per assignment
export const callLogs = [
  // Assignment 1 calls
  {
    id: 1,
    assignment_id: 1,
    solver_id: 6,
    attempt_number: 1,
    initiated_at: '2025-06-14T09:05:00Z',
    answered_at: null,
    ended_at: '2025-06-14T09:05:30Z',
    status: 'MISSED',
    created_at: '2025-06-14T09:05:00Z',
    updated_at: '2025-06-14T09:05:30Z',
  },
  {
    id: 2,
    assignment_id: 1,
    solver_id: 6,
    attempt_number: 2,
    initiated_at: '2025-06-14T09:15:00Z',
    answered_at: '2025-06-14T09:15:05Z',
    ended_at: '2025-06-14T09:17:30Z',
    status: 'ANSWERED',
    created_at: '2025-06-14T09:15:00Z',
    updated_at: '2025-06-14T09:17:30Z',
  },
  // Assignment 2 calls
  {
    id: 3,
    assignment_id: 2,
    solver_id: 7,
    attempt_number: 1,
    initiated_at: '2025-06-18T09:10:00Z',
    answered_at: '2025-06-18T09:10:03Z',
    ended_at: '2025-06-18T09:12:00Z',
    status: 'ANSWERED',
    created_at: '2025-06-18T09:10:00Z',
    updated_at: '2025-06-18T09:12:00Z',
  },
  // Assignment 6 calls (in progress)
  {
    id: 4,
    assignment_id: 6,
    solver_id: 8,
    attempt_number: 1,
    initiated_at: new Date(Date.now() - 3 * 86400000 + 3600000).toISOString(),
    answered_at: null,
    ended_at: new Date(Date.now() - 3 * 86400000 + 3630000).toISOString(),
    status: 'MISSED',
    created_at: new Date(Date.now() - 3 * 86400000 + 3600000).toISOString(),
    updated_at: new Date(Date.now() - 3 * 86400000 + 3630000).toISOString(),
  },
  {
    id: 5,
    assignment_id: 6,
    solver_id: 8,
    attempt_number: 2,
    initiated_at: new Date(Date.now() - 3 * 86400000 + 4200000).toISOString(),
    answered_at: null,
    ended_at: new Date(Date.now() - 3 * 86400000 + 4230000).toISOString(),
    status: 'MISSED',
    created_at: new Date(Date.now() - 3 * 86400000 + 4200000).toISOString(),
    updated_at: new Date(Date.now() - 3 * 86400000 + 4230000).toISOString(),
  },
  {
    id: 6,
    assignment_id: 6,
    solver_id: 8,
    attempt_number: 3,
    initiated_at: new Date(Date.now() - 3 * 86400000 + 4800000).toISOString(),
    answered_at: new Date(Date.now() - 3 * 86400000 + 4805000).toISOString(),
    ended_at: new Date(Date.now() - 3 * 86400000 + 4920000).toISOString(),
    status: 'ANSWERED',
    created_at: new Date(Date.now() - 3 * 86400000 + 4800000).toISOString(),
    updated_at: new Date(Date.now() - 3 * 86400000 + 4920000).toISOString(),
  },
  // Assignment 7 calls
  {
    id: 7,
    assignment_id: 7,
    solver_id: 6,
    attempt_number: 1,
    initiated_at: new Date(Date.now() - 2 * 86400000 + 3600000).toISOString(),
    answered_at: new Date(Date.now() - 2 * 86400000 + 3605000).toISOString(),
    ended_at: new Date(Date.now() - 2 * 86400000 + 3780000).toISOString(),
    status: 'ANSWERED',
    created_at: new Date(Date.now() - 2 * 86400000 + 3600000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 86400000 + 3780000).toISOString(),
  },
  // Assignment 10 calls
  {
    id: 8,
    assignment_id: 10,
    solver_id: 9,
    attempt_number: 1,
    initiated_at: new Date(Date.now() - 86400000 + 3600000).toISOString(),
    answered_at: null,
    ended_at: new Date(Date.now() - 86400000 + 3630000).toISOString(),
    status: 'MISSED',
    created_at: new Date(Date.now() - 86400000 + 3600000).toISOString(),
    updated_at: new Date(Date.now() - 86400000 + 3630000).toISOString(),
  },
  {
    id: 9,
    assignment_id: 10,
    solver_id: 9,
    attempt_number: 2,
    initiated_at: new Date(Date.now() - 86400000 + 4200000).toISOString(),
    answered_at: new Date(Date.now() - 86400000 + 4205000).toISOString(),
    ended_at: new Date(Date.now() - 86400000 + 4380000).toISOString(),
    status: 'ANSWERED',
    created_at: new Date(Date.now() - 86400000 + 4200000).toISOString(),
    updated_at: new Date(Date.now() - 86400000 + 4380000).toISOString(),
  },
];

export const getCallLogsByAssignmentId = (assignmentId) => 
  callLogs.filter(log => log.assignment_id === assignmentId);

export const getCallLogsBySolverId = (solverId) => 
  callLogs.filter(log => log.solver_id === solverId);
```

## C:\Users\head user\Desktop\Hamthan\v3\AI-Operation-Kaizen\FullStack\frontend\src\mocks\chatMessages.js

```javascript
// Chat Messages Mock Data - Sample conversations
export const chatMessages = [
  // Conversation 1 - Supervisor asking about issues
  {
    id: 1,
    conversation_id: 'conv_001',
    user_id: 1,
    issue_id: null,
    role_in_chat: 'user',
    message: 'Show me all high priority issues at Vepery',
    attachments: null,
    created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 86400000).toISOString(),
  },
  {
    id: 2,
    conversation_id: 'conv_001',
    user_id: null,
    issue_id: null,
    role_in_chat: 'assistant',
    message: 'I found 3 high priority issues at Vepery Industrial Complex:\n\n1. **Issue #6** - Fire alarm system failure (ESCALATED)\n2. **Issue #24** - Door lock jammed (IN_PROGRESS)\n3. **Issue #9** - Flickering lights (OPEN)\n\nWould you like me to provide more details on any of these?',
    attachments: null,
    created_at: new Date(Date.now() - 2 * 86400000 + 5000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 86400000 + 5000).toISOString(),
  },
  // Conversation 2 - Manager asking for stats
  {
    id: 3,
    conversation_id: 'conv_002',
    user_id: 4,
    issue_id: null,
    role_in_chat: 'user',
    message: 'What is the overall completion rate this week?',
    attachments: null,
    created_at: new Date(Date.now() - 86400000).toISOString(),
    updated_at: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 4,
    conversation_id: 'conv_002',
    user_id: null,
    issue_id: null,
    role_in_chat: 'assistant',
    message: 'Here are this weeks statistics:\n\n📊 **Weekly Performance Summary**\n- Issues Created: 12\n- Issues Completed: 8\n- Completion Rate: **66.7%**\n- Average Resolution Time: 4.2 hours\n- Overdue Issues: 5\n\nThe completion rate is slightly below the target of 75%. Main delays are in HVAC and Safety categories.',
    attachments: null,
    created_at: new Date(Date.now() - 86400000 + 5000).toISOString(),
    updated_at: new Date(Date.now() - 86400000 + 5000).toISOString(),
  },
  // Conversation 3 - Solver checking assignments
  {
    id: 5,
    conversation_id: 'conv_003',
    user_id: 6,
    issue_id: null,
    role_in_chat: 'user',
    message: 'What issues are assigned to me today?',
    attachments: null,
    created_at: new Date(Date.now() - 3600000).toISOString(),
    updated_at: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 6,
    conversation_id: 'conv_003',
    user_id: null,
    issue_id: null,
    role_in_chat: 'assistant',
    message: 'You have 2 active assignments today:\n\n1. **Issue #14** - Plumbing repair at cafeteria\n   - Status: IN_PROGRESS\n   - Priority: Medium\n   - Due: Today\n\n2. **Issue #19** - Roof leak during rain\n   - Status: IN_PROGRESS\n   - Priority: Medium\n   - Due: Yesterday (OVERDUE)\n\n⚠️ Please prioritize Issue #19 as it is overdue.',
    attachments: null,
    created_at: new Date(Date.now() - 3600000 + 5000).toISOString(),
    updated_at: new Date(Date.now() - 3600000 + 5000).toISOString(),
  },
  // Conversation 4 - General query
  {
    id: 7,
    conversation_id: 'conv_004',
    user_id: 2,
    issue_id: null,
    role_in_chat: 'user',
    message: 'How many complaints were raised this month?',
    attachments: null,
    created_at: new Date(Date.now() - 7200000).toISOString(),
    updated_at: new Date(Date.now() - 7200000).toISOString(),
  },
  {
    id: 8,
    conversation_id: 'conv_004',
    user_id: null,
    issue_id: null,
    role_in_chat: 'assistant',
    message: '📋 **Complaints Summary (This Month)**\n\nTotal Complaints: 8\n\n- Open: 4\n- Investigating: 2\n- Escalated: 2\n\n**By Site:**\n- Vepery: 3\n- Ambattur: 1\n- Guindy: 2\n- Perungudi: 1\n- Taramani: 1\n\nMost complaints are related to delayed responses and reopened issues.',
    attachments: null,
    created_at: new Date(Date.now() - 7200000 + 5000).toISOString(),
    updated_at: new Date(Date.now() - 7200000 + 5000).toISOString(),
  },
];

export const getChatMessagesByUserId = (userId) => 
  chatMessages.filter(m => m.user_id === userId || m.role_in_chat === 'assistant');

export const getChatMessagesByConversationId = (conversationId) => 
  chatMessages.filter(m => m.conversation_id === conversationId);

export const getConversationsList = () => {
  const conversations = {};
  chatMessages.forEach(msg => {
    if (!conversations[msg.conversation_id]) {
      conversations[msg.conversation_id] = {
        id: msg.conversation_id,
        firstMessage: msg.message,
        created_at: msg.created_at,
        user_id: msg.user_id,
      };
    }
  });
  return Object.values(conversations).sort((a, b) => 
    new Date(b.created_at) - new Date(a.created_at)
  );
};
```

## C:\Users\head user\Desktop\Hamthan\v3\AI-Operation-Kaizen\FullStack\frontend\src\mocks\complaints.js

```javascript
// Complaints Mock Data - 8+ complaints with target_solver_id
export const complaints = [
  {
    id: 1,
    issue_id: 15,
    assignment_id: 16,
    raised_by_supervisor_id: 1,
    target_solver_id: 10,
    complaint_details: 'The ceiling fan noise issue was not properly resolved. The problem reoccurred within 2 days of the repair.',
    complaint_image_url: 'https://placehold.co/600x400/ef4444/white?text=Fan+Still+Noisy',
    status: 'OPEN',
    created_at: new Date(Date.now() - 86400000).toISOString(),
    updated_at: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 2,
    issue_id: 6,
    assignment_id: null,
    raised_by_supervisor_id: 1,
    target_solver_id: null,
    complaint_details: 'Fire alarm system issue has been pending for over a week. This is a critical safety concern.',
    complaint_image_url: 'https://placehold.co/600x400/991b1b/white?text=Fire+Alarm+Critical',
    status: 'ESCALATED',
    created_at: new Date(Date.now() - 3 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 3,
    issue_id: 7,
    assignment_id: null,
    raised_by_supervisor_id: 1,
    target_solver_id: 6,
    complaint_details: 'Sewage backup was not handled promptly. Area remained unusable for extended period.',
    complaint_image_url: 'https://placehold.co/600x400/f97316/white?text=Sewage+Delay',
    status: 'INVESTIGATING',
    created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 4,
    issue_id: 16,
    assignment_id: 8,
    raised_by_supervisor_id: 2,
    target_solver_id: 7,
    complaint_details: 'Emergency exit sign repair is significantly overdue. Compliance issue.',
    complaint_image_url: 'https://placehold.co/600x400/ef4444/white?text=Exit+Sign+Overdue',
    status: 'OPEN',
    created_at: new Date(Date.now() - 86400000).toISOString(),
    updated_at: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 5,
    issue_id: 17,
    assignment_id: 13,
    raised_by_supervisor_id: 2,
    target_solver_id: 9,
    complaint_details: 'Water cooler issue assigned but no action taken for several days.',
    complaint_image_url: 'https://placehold.co/600x400/eab308/white?text=No+Action+Taken',
    status: 'OPEN',
    created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 86400000).toISOString(),
  },
  {
    id: 6,
    issue_id: 8,
    assignment_id: null,
    raised_by_supervisor_id: 2,
    target_solver_id: null,
    complaint_details: 'Generator failure remains unresolved. Escalated to management.',
    complaint_image_url: 'https://placehold.co/600x400/991b1b/white?text=Generator+Critical',
    status: 'ESCALATED',
    created_at: new Date(Date.now() - 86400000).toISOString(),
    updated_at: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 7,
    issue_id: 18,
    assignment_id: null,
    raised_by_supervisor_id: 3,
    target_solver_id: null,
    complaint_details: 'Sparking power socket is a fire hazard. Has not been assigned yet.',
    complaint_image_url: 'https://placehold.co/600x400/ef4444/white?text=Fire+Hazard',
    status: 'OPEN',
    created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 86400000).toISOString(),
  },
  {
    id: 8,
    issue_id: 19,
    assignment_id: 9,
    raised_by_supervisor_id: 1,
    target_solver_id: 6,
    complaint_details: 'Roof leak repair taking too long. Deadline passed.',
    complaint_image_url: 'https://placehold.co/600x400/3b82f6/white?text=Roof+Leak+Delay',
    status: 'INVESTIGATING',
    created_at: new Date(Date.now() - 86400000).toISOString(),
    updated_at: new Date(Date.now() - 86400000).toISOString(),
  },
];

export const getComplaintById = (id) => complaints.find(c => c.id === id);
export const getComplaintsByIssueId = (issueId) => complaints.filter(c => c.issue_id === issueId);
export const getComplaintsBySupervisorId = (supervisorId) => 
  complaints.filter(c => c.raised_by_supervisor_id === supervisorId);
export const getComplaintsBySolverId = (solverId) => 
  complaints.filter(c => c.target_solver_id === solverId);
```

## C:\Users\head user\Desktop\Hamthan\v3\AI-Operation-Kaizen\FullStack\frontend\src\mocks\issueAssignments.js

```javascript
// Issue Assignments Mock Data
export const issueAssignments = [
  // Completed issues assignments
  {
    id: 1,
    issue_id: 1,
    assigned_to_solver_id: 6,
    assigned_by_supervisor_id: 1,
    due_date: '2025-06-15T18:00:00Z',
    status: 'COMPLETED',
    created_at: '2025-06-14T09:00:00Z',
    updated_at: '2025-06-15T16:00:00Z',
  },
  {
    id: 2,
    issue_id: 2,
    assigned_to_solver_id: 7,
    assigned_by_supervisor_id: 1,
    due_date: '2025-06-20T18:00:00Z',
    status: 'COMPLETED',
    created_at: '2025-06-18T09:00:00Z',
    updated_at: '2025-06-20T14:00:00Z',
  },
  {
    id: 3,
    issue_id: 3,
    assigned_to_solver_id: 8,
    assigned_by_supervisor_id: 2,
    due_date: '2025-06-25T18:00:00Z',
    status: 'COMPLETED',
    created_at: '2025-06-22T09:00:00Z',
    updated_at: '2025-06-25T15:00:00Z',
  },
  {
    id: 4,
    issue_id: 4,
    assigned_to_solver_id: 9,
    assigned_by_supervisor_id: 2,
    due_date: '2025-06-28T18:00:00Z',
    status: 'COMPLETED',
    created_at: '2025-06-26T09:00:00Z',
    updated_at: '2025-06-28T12:00:00Z',
  },
  {
    id: 5,
    issue_id: 5,
    assigned_to_solver_id: 9,
    assigned_by_supervisor_id: 3,
    due_date: '2025-06-27T18:00:00Z',
    status: 'COMPLETED',
    created_at: '2025-06-22T09:00:00Z',
    updated_at: '2025-06-27T14:00:00Z',
  },
  // In Progress assignments
  {
    id: 6,
    issue_id: 13,
    assigned_to_solver_id: 8,
    assigned_by_supervisor_id: 1,
    due_date: new Date(Date.now() + 86400000).toISOString(),
    status: 'IN_PROGRESS',
    created_at: new Date(Date.now() - 3 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 7,
    issue_id: 14,
    assigned_to_solver_id: 6,
    assigned_by_supervisor_id: 3,
    due_date: new Date().toISOString(),
    status: 'IN_PROGRESS',
    created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 8,
    issue_id: 16,
    assigned_to_solver_id: 7,
    assigned_by_supervisor_id: 2,
    due_date: new Date(Date.now() - 3 * 86400000).toISOString(),
    status: 'IN_PROGRESS',
    created_at: new Date(Date.now() - 7 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 86400000).toISOString(),
  },
  {
    id: 9,
    issue_id: 19,
    assigned_to_solver_id: 6,
    assigned_by_supervisor_id: 1,
    due_date: new Date(Date.now() - 86400000).toISOString(),
    status: 'IN_PROGRESS',
    created_at: new Date(Date.now() - 7 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 10,
    issue_id: 24,
    assigned_to_solver_id: 9,
    assigned_by_supervisor_id: 1,
    due_date: new Date(Date.now() + 86400000).toISOString(),
    status: 'IN_PROGRESS',
    created_at: new Date(Date.now() - 86400000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  // Assigned but not started
  {
    id: 11,
    issue_id: 11,
    assigned_to_solver_id: 9,
    assigned_by_supervisor_id: 2,
    due_date: new Date(Date.now() + 2 * 86400000).toISOString(),
    status: 'ASSIGNED',
    created_at: new Date(Date.now() - 86400000).toISOString(),
    updated_at: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 12,
    issue_id: 12,
    assigned_to_solver_id: 10,
    assigned_by_supervisor_id: 2,
    due_date: new Date(Date.now() + 2 * 86400000).toISOString(),
    status: 'ASSIGNED',
    created_at: new Date(Date.now() - 86400000).toISOString(),
    updated_at: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 13,
    issue_id: 17,
    assigned_to_solver_id: 9,
    assigned_by_supervisor_id: 2,
    due_date: new Date(Date.now() - 2 * 86400000).toISOString(),
    status: 'ASSIGNED',
    created_at: new Date(Date.now() - 7 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 3 * 86400000).toISOString(),
  },
  {
    id: 14,
    issue_id: 23,
    assigned_to_solver_id: 8,
    assigned_by_supervisor_id: 3,
    due_date: new Date(Date.now() + 2 * 86400000).toISOString(),
    status: 'ASSIGNED',
    created_at: new Date(Date.now() - 86400000).toISOString(),
    updated_at: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 15,
    issue_id: 26,
    assigned_to_solver_id: 7,
    assigned_by_supervisor_id: 2,
    due_date: new Date(Date.now() + 86400000).toISOString(),
    status: 'ASSIGNED',
    created_at: new Date(Date.now() - 86400000).toISOString(),
    updated_at: new Date(Date.now() - 86400000).toISOString(),
  },
  // Reopened
  {
    id: 16,
    issue_id: 15,
    assigned_to_solver_id: 10,
    assigned_by_supervisor_id: 1,
    due_date: new Date(Date.now() - 86400000).toISOString(),
    status: 'REOPENED',
    created_at: new Date(Date.now() - 7 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 86400000).toISOString(),
  },
];

export const getAssignmentByIssueId = (issueId) => 
  issueAssignments.find(a => a.issue_id === issueId);

export const getAssignmentsBySolverId = (solverId) => 
  issueAssignments.filter(a => a.assigned_to_solver_id === solverId);

export const getIssueIdsBySolverId = (solverId) => 
  issueAssignments.filter(a => a.assigned_to_solver_id === solverId).map(a => a.issue_id);
```

## C:\Users\head user\Desktop\Hamthan\v3\AI-Operation-Kaizen\FullStack\frontend\src\mocks\issueHistory.js

```javascript
// Issue History Mock Data - Full lifecycle for issues
// Note: NO updated_at for history records per spec
export const issueHistory = [
  // Issue 1 - Complete lifecycle
  {
    id: 1,
    issue_id: 1,
    changed_by_user_id: 1,
    old_status: null,
    new_status: 'OPEN',
    action_type: 'CREATED',
    details: 'Issue created by supervisor',
    created_at: '2025-06-14T08:30:00Z',
  },
  {
    id: 2,
    issue_id: 1,
    changed_by_user_id: 0,
    old_status: 'OPEN',
    new_status: 'ASSIGNED',
    action_type: 'AUTO_ASSIGNED',
    details: 'System auto-assigned to Suresh Babu',
    created_at: '2025-06-14T08:32:00Z',
  },
  {
    id: 3,
    issue_id: 1,
    changed_by_user_id: 6,
    old_status: 'ASSIGNED',
    new_status: 'IN_PROGRESS',
    action_type: 'STATUS_CHANGE',
    details: 'Work started by solver',
    created_at: '2025-06-14T10:00:00Z',
  },
  {
    id: 4,
    issue_id: 1,
    changed_by_user_id: 6,
    old_status: 'IN_PROGRESS',
    new_status: 'RESOLVED_PENDING_REVIEW',
    action_type: 'FIX_UPLOADED',
    details: 'Fix photo uploaded for review',
    created_at: '2025-06-15T15:30:00Z',
  },
  {
    id: 5,
    issue_id: 1,
    changed_by_user_id: 1,
    old_status: 'RESOLVED_PENDING_REVIEW',
    new_status: 'COMPLETED',
    action_type: 'VERIFIED',
    details: 'Supervisor verified and closed',
    created_at: '2025-06-15T16:00:00Z',
  },
  // Issue 2 - Complete lifecycle
  {
    id: 6,
    issue_id: 2,
    changed_by_user_id: 1,
    old_status: null,
    new_status: 'OPEN',
    action_type: 'CREATED',
    details: 'Issue created - electrical panel malfunction',
    created_at: '2025-06-17T09:00:00Z',
  },
  {
    id: 7,
    issue_id: 2,
    changed_by_user_id: 0,
    old_status: 'OPEN',
    new_status: 'ASSIGNED',
    action_type: 'AUTO_ASSIGNED',
    details: 'Auto-assigned to Karthik Rajan (Electrical specialist)',
    created_at: '2025-06-17T09:02:00Z',
  },
  {
    id: 8,
    issue_id: 2,
    changed_by_user_id: 7,
    old_status: 'ASSIGNED',
    new_status: 'IN_PROGRESS',
    action_type: 'STATUS_CHANGE',
    details: 'Solver acknowledged and started work',
    created_at: '2025-06-18T10:00:00Z',
  },
  {
    id: 9,
    issue_id: 2,
    changed_by_user_id: 7,
    old_status: 'IN_PROGRESS',
    new_status: 'COMPLETED',
    action_type: 'COMPLETED',
    details: 'Panel repaired and tested',
    created_at: '2025-06-20T14:00:00Z',
  },
  // Issue 6 - Escalated
  {
    id: 10,
    issue_id: 6,
    changed_by_user_id: 1,
    old_status: null,
    new_status: 'OPEN',
    action_type: 'CREATED',
    details: 'Critical: Fire alarm system failure',
    created_at: '2025-06-22T10:00:00Z',
  },
  {
    id: 11,
    issue_id: 6,
    changed_by_user_id: 4,
    old_status: 'OPEN',
    new_status: 'ESCALATED',
    action_type: 'ESCALATED',
    details: 'Manager escalated due to safety concern',
    created_at: '2025-06-23T09:00:00Z',
  },
  // Issue 15 - Reopened
  {
    id: 12,
    issue_id: 15,
    changed_by_user_id: 1,
    old_status: null,
    new_status: 'OPEN',
    action_type: 'CREATED',
    details: 'Ceiling fan making noise',
    created_at: '2025-06-22T09:00:00Z',
  },
  {
    id: 13,
    issue_id: 15,
    changed_by_user_id: 0,
    old_status: 'OPEN',
    new_status: 'ASSIGNED',
    action_type: 'AUTO_ASSIGNED',
    details: 'Assigned to Ravi Shankar',
    created_at: '2025-06-22T09:02:00Z',
  },
  {
    id: 14,
    issue_id: 15,
    changed_by_user_id: 10,
    old_status: 'ASSIGNED',
    new_status: 'IN_PROGRESS',
    action_type: 'STATUS_CHANGE',
    details: 'Started repair',
    created_at: '2025-06-23T10:00:00Z',
  },
  {
    id: 15,
    issue_id: 15,
    changed_by_user_id: 10,
    old_status: 'IN_PROGRESS',
    new_status: 'RESOLVED_PENDING_REVIEW',
    action_type: 'FIX_UPLOADED',
    details: 'Fan bearing replaced',
    created_at: '2025-06-24T14:00:00Z',
  },
  {
    id: 16,
    issue_id: 15,
    changed_by_user_id: 1,
    old_status: 'RESOLVED_PENDING_REVIEW',
    new_status: 'COMPLETED',
    action_type: 'VERIFIED',
    details: 'Verified and closed',
    created_at: '2025-06-24T15:00:00Z',
  },
  {
    id: 17,
    issue_id: 15,
    changed_by_user_id: 1,
    old_status: 'COMPLETED',
    new_status: 'REOPENED',
    action_type: 'REOPENED',
    details: 'Noise returned after 2 days',
    created_at: new Date(Date.now() - 86400000).toISOString(),
  },
  // Issue 13 - In Progress
  {
    id: 18,
    issue_id: 13,
    changed_by_user_id: 1,
    old_status: null,
    new_status: 'OPEN',
    action_type: 'CREATED',
    details: 'AC duct cleaning required',
    created_at: new Date(Date.now() - 3 * 86400000).toISOString(),
  },
  {
    id: 19,
    issue_id: 13,
    changed_by_user_id: 0,
    old_status: 'OPEN',
    new_status: 'ASSIGNED',
    action_type: 'AUTO_ASSIGNED',
    details: 'Assigned to Mohammed Ali (HVAC specialist)',
    created_at: new Date(Date.now() - 3 * 86400000 + 120000).toISOString(),
  },
  {
    id: 20,
    issue_id: 13,
    changed_by_user_id: 8,
    old_status: 'ASSIGNED',
    new_status: 'IN_PROGRESS',
    action_type: 'STATUS_CHANGE',
    details: 'Cleaning in progress',
    created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
  },
];

export const getHistoryByIssueId = (issueId) => 
  issueHistory.filter(h => h.issue_id === issueId).sort((a, b) => 
    new Date(a.created_at) - new Date(b.created_at)
  );

export const getLatestStatusChange = (issueId) => {
  const history = getHistoryByIssueId(issueId);
  return history[history.length - 1];
};
```

## C:\Users\head user\Desktop\Hamthan\v3\AI-Operation-Kaizen\FullStack\frontend\src\mocks\issueImages.js

```javascript
// Issue Images Mock Data - Before and After are SEPARATE rows
export const issueImages = [
  // Issue 1 images (Completed)
  {
    id: 1,
    issue_id: 1,
    uploaded_by_user_id: 1,
    image_url: 'https://placehold.co/600x400/ef4444/white?text=Water+Leak+Before',
    image_type: 'BEFORE',
    ai_flag: false,
    ai_details: null,
    created_at: '2025-06-14T08:30:00Z',
    updated_at: '2025-06-14T08:30:00Z',
  },
  {
    id: 2,
    issue_id: 1,
    uploaded_by_user_id: 6,
    image_url: 'https://placehold.co/600x400/22c55e/white?text=Water+Leak+Fixed',
    image_type: 'AFTER',
    ai_flag: false,
    ai_details: null,
    created_at: '2025-06-15T15:30:00Z',
    updated_at: '2025-06-15T15:30:00Z',
  },
  // Issue 2 images (Completed)
  {
    id: 3,
    issue_id: 2,
    uploaded_by_user_id: 1,
    image_url: 'https://placehold.co/600x400/eab308/white?text=Panel+Fault+Before',
    image_type: 'BEFORE',
    ai_flag: false,
    ai_details: null,
    created_at: '2025-06-18T08:00:00Z',
    updated_at: '2025-06-18T08:00:00Z',
  },
  {
    id: 4,
    issue_id: 2,
    uploaded_by_user_id: 7,
    image_url: 'https://placehold.co/600x400/22c55e/white?text=Panel+Repaired',
    image_type: 'AFTER',
    ai_flag: false,
    ai_details: null,
    created_at: '2025-06-20T14:00:00Z',
    updated_at: '2025-06-20T14:00:00Z',
  },
  // Issue 3 images (Completed)
  {
    id: 5,
    issue_id: 3,
    uploaded_by_user_id: 2,
    image_url: 'https://placehold.co/600x400/3b82f6/white?text=AC+Unit+Before',
    image_type: 'BEFORE',
    ai_flag: false,
    ai_details: null,
    created_at: '2025-06-22T09:00:00Z',
    updated_at: '2025-06-22T09:00:00Z',
  },
  {
    id: 6,
    issue_id: 3,
    uploaded_by_user_id: 8,
    image_url: 'https://placehold.co/600x400/22c55e/white?text=AC+Working',
    image_type: 'AFTER',
    ai_flag: false,
    ai_details: null,
    created_at: '2025-06-25T15:00:00Z',
    updated_at: '2025-06-25T15:00:00Z',
  },
  // Issue 6 images (Escalated - only before)
  {
    id: 7,
    issue_id: 6,
    uploaded_by_user_id: 1,
    image_url: 'https://placehold.co/600x400/991b1b/white?text=Fire+Alarm+Issue',
    image_type: 'BEFORE',
    ai_flag: true,
    ai_details: 'Sensor damage detected',
    created_at: '2025-06-22T10:00:00Z',
    updated_at: '2025-06-22T10:00:00Z',
  },
  // Issue 13 images (In Progress)
  {
    id: 8,
    issue_id: 13,
    uploaded_by_user_id: 1,
    image_url: 'https://placehold.co/600x400/f97316/white?text=AC+Duct+Dirty',
    image_type: 'BEFORE',
    ai_flag: false,
    ai_details: null,
    created_at: new Date(Date.now() - 3 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 3 * 86400000).toISOString(),
  },
  // Issue 16 images (In Progress - Overdue)
  {
    id: 9,
    issue_id: 16,
    uploaded_by_user_id: 2,
    image_url: 'https://placehold.co/600x400/ef4444/white?text=Exit+Sign+Broken',
    image_type: 'BEFORE',
    ai_flag: false,
    ai_details: null,
    created_at: new Date(Date.now() - 7 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 7 * 86400000).toISOString(),
  },
  // Issue 24 images (In Progress)
  {
    id: 10,
    issue_id: 24,
    uploaded_by_user_id: 1,
    image_url: 'https://placehold.co/600x400/8b5cf6/white?text=Door+Lock+Stuck',
    image_type: 'BEFORE',
    ai_flag: false,
    ai_details: null,
    created_at: new Date(Date.now() - 86400000).toISOString(),
    updated_at: new Date(Date.now() - 86400000).toISOString(),
  },
  // More completed issue images
  {
    id: 11,
    issue_id: 4,
    uploaded_by_user_id: 2,
    image_url: 'https://placehold.co/600x400/6b7280/white?text=Door+Handle+Before',
    image_type: 'BEFORE',
    ai_flag: false,
    ai_details: null,
    created_at: '2025-06-26T08:00:00Z',
    updated_at: '2025-06-26T08:00:00Z',
  },
  {
    id: 12,
    issue_id: 4,
    uploaded_by_user_id: 9,
    image_url: 'https://placehold.co/600x400/22c55e/white?text=Door+Handle+Fixed',
    image_type: 'AFTER',
    ai_flag: false,
    ai_details: null,
    created_at: '2025-06-28T12:00:00Z',
    updated_at: '2025-06-28T12:00:00Z',
  },
  {
    id: 13,
    issue_id: 5,
    uploaded_by_user_id: 3,
    image_url: 'https://placehold.co/600x400/6b7280/white?text=Elevator+Before',
    image_type: 'BEFORE',
    ai_flag: false,
    ai_details: null,
    created_at: '2025-06-22T08:00:00Z',
    updated_at: '2025-06-22T08:00:00Z',
  },
  {
    id: 14,
    issue_id: 5,
    uploaded_by_user_id: 9,
    image_url: 'https://placehold.co/600x400/22c55e/white?text=Elevator+Maintained',
    image_type: 'AFTER',
    ai_flag: false,
    ai_details: null,
    created_at: '2025-06-27T14:00:00Z',
    updated_at: '2025-06-27T14:00:00Z',
  },
];

export const getImagesByIssueId = (issueId) => 
  issueImages.filter(img => img.issue_id === issueId);

export const getBeforeImage = (issueId) => 
  issueImages.find(img => img.issue_id === issueId && img.image_type === 'BEFORE');

export const getAfterImage = (issueId) => 
  issueImages.find(img => img.issue_id === issueId && img.image_type === 'AFTER');
```

## C:\Users\head user\Desktop\Hamthan\v3\AI-Operation-Kaizen\FullStack\frontend\src\mocks\issues.js

```javascript
// Issues Mock Data - 25+ issues with various statuses
const now = new Date();
const yesterday = new Date(now.getTime() - 86400000);
const twoDaysAgo = new Date(now.getTime() - 2 * 86400000);
const threeDaysAgo = new Date(now.getTime() - 3 * 86400000);
const oneWeekAgo = new Date(now.getTime() - 7 * 86400000);
const twoWeeksAgo = new Date(now.getTime() - 14 * 86400000);

const inTwoDays = new Date(now.getTime() + 2 * 86400000);
const inOneDay = new Date(now.getTime() + 86400000);

export const issues = [
  // COMPLETED issues (5+)
  {
    id: 1,
    site_id: 1,
    raised_by_supervisor_id: 1,
    title: 'Water leakage in main hall',
    description: 'Major water leakage detected near the entrance of the main hall. Ceiling tiles are damaged.',
    issue_type: 'Plumbing',
    priority: 'high',
    deadline_at: twoWeeksAgo.toISOString(),
    status: 'COMPLETED',
    track_status: 'AUTO_ASSIGNED',
    created_at: new Date(twoWeeksAgo.getTime() - 86400000).toISOString(),
    updated_at: twoWeeksAgo.toISOString(),
  },
  {
    id: 2,
    site_id: 2,
    raised_by_supervisor_id: 1,
    title: 'Electrical panel malfunction',
    description: 'Panel B-12 showing intermittent faults. Circuit breaker trips frequently.',
    issue_type: 'Electrical',
    priority: 'high',
    deadline_at: oneWeekAgo.toISOString(),
    status: 'COMPLETED',
    track_status: 'AUTO_ASSIGNED',
    created_at: new Date(oneWeekAgo.getTime() - 3 * 86400000).toISOString(),
    updated_at: oneWeekAgo.toISOString(),
  },
  {
    id: 3,
    site_id: 3,
    raised_by_supervisor_id: 2,
    title: 'AC unit not cooling',
    description: 'Central AC unit in server room not providing adequate cooling. Temperature rising.',
    issue_type: 'HVAC',
    priority: 'high',
    deadline_at: threeDaysAgo.toISOString(),
    status: 'COMPLETED',
    track_status: 'AUTO_ASSIGNED',
    created_at: oneWeekAgo.toISOString(),
    updated_at: threeDaysAgo.toISOString(),
  },
  {
    id: 4,
    site_id: 4,
    raised_by_supervisor_id: 2,
    title: 'Broken door handle - Conference Room A',
    description: 'Door handle is loose and not functioning properly. Difficult to open/close.',
    issue_type: 'Maintenance',
    priority: 'low',
    deadline_at: yesterday.toISOString(),
    status: 'COMPLETED',
    track_status: 'AUTO_ASSIGNED',
    created_at: threeDaysAgo.toISOString(),
    updated_at: yesterday.toISOString(),
  },
  {
    id: 5,
    site_id: 5,
    raised_by_supervisor_id: 3,
    title: 'Elevator maintenance completed',
    description: 'Annual maintenance for elevator #2 completed successfully.',
    issue_type: 'Maintenance',
    priority: 'medium',
    deadline_at: twoDaysAgo.toISOString(),
    status: 'COMPLETED',
    track_status: 'AUTO_ASSIGNED',
    created_at: oneWeekAgo.toISOString(),
    updated_at: twoDaysAgo.toISOString(),
  },
  // ESCALATED issues (3+)
  {
    id: 6,
    site_id: 1,
    raised_by_supervisor_id: 1,
    title: 'Fire alarm system failure',
    description: 'Fire alarm sensors in Zone C not responding. Critical safety issue.',
    issue_type: 'Safety',
    priority: 'high',
    deadline_at: twoDaysAgo.toISOString(),
    status: 'ESCALATED',
    track_status: 'ESCALATED',
    created_at: oneWeekAgo.toISOString(),
    updated_at: yesterday.toISOString(),
  },
  {
    id: 7,
    site_id: 2,
    raised_by_supervisor_id: 1,
    title: 'Sewage backup - urgent',
    description: 'Major sewage backup in basement level. Area cordoned off.',
    issue_type: 'Plumbing',
    priority: 'high',
    deadline_at: threeDaysAgo.toISOString(),
    status: 'ESCALATED',
    track_status: 'ESCALATED',
    created_at: oneWeekAgo.toISOString(),
    updated_at: twoDaysAgo.toISOString(),
  },
  {
    id: 8,
    site_id: 3,
    raised_by_supervisor_id: 2,
    title: 'Generator not starting',
    description: 'Backup generator failed to start during power outage test.',
    issue_type: 'Electrical',
    priority: 'high',
    deadline_at: yesterday.toISOString(),
    status: 'ESCALATED',
    track_status: 'ESCALATED',
    created_at: threeDaysAgo.toISOString(),
    updated_at: yesterday.toISOString(),
  },
  // OPEN issues
  {
    id: 9,
    site_id: 1,
    raised_by_supervisor_id: 1,
    title: 'Flickering lights in corridor',
    description: 'Multiple lights in south corridor flickering intermittently.',
    issue_type: 'Electrical',
    priority: 'medium',
    deadline_at: inOneDay.toISOString(),
    status: 'OPEN',
    track_status: null,
    created_at: yesterday.toISOString(),
    updated_at: yesterday.toISOString(),
  },
  {
    id: 10,
    site_id: 2,
    raised_by_supervisor_id: 1,
    title: 'Toilet flush not working',
    description: 'Flush mechanism broken in mens restroom, 2nd floor.',
    issue_type: 'Plumbing',
    priority: 'medium',
    deadline_at: inTwoDays.toISOString(),
    status: 'OPEN',
    track_status: null,
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
  },
  // ASSIGNED issues
  {
    id: 11,
    site_id: 3,
    raised_by_supervisor_id: 2,
    title: 'Window glass cracked',
    description: 'Large crack in window glass, 4th floor east wing.',
    issue_type: 'Maintenance',
    priority: 'low',
    deadline_at: inTwoDays.toISOString(),
    status: 'ASSIGNED',
    track_status: 'AUTO_ASSIGNED',
    created_at: yesterday.toISOString(),
    updated_at: yesterday.toISOString(),
  },
  {
    id: 12,
    site_id: 4,
    raised_by_supervisor_id: 2,
    title: 'Parking lot light out',
    description: 'Street light #7 in parking lot B not working.',
    issue_type: 'Electrical',
    priority: 'low',
    deadline_at: inTwoDays.toISOString(),
    status: 'ASSIGNED',
    track_status: 'AUTO_ASSIGNED',
    created_at: yesterday.toISOString(),
    updated_at: yesterday.toISOString(),
  },
  // IN_PROGRESS issues
  {
    id: 13,
    site_id: 1,
    raised_by_supervisor_id: 1,
    title: 'AC duct cleaning required',
    description: 'Annual AC duct cleaning overdue for 3rd floor.',
    issue_type: 'HVAC',
    priority: 'medium',
    deadline_at: inOneDay.toISOString(),
    status: 'IN_PROGRESS',
    track_status: 'AUTO_ASSIGNED',
    created_at: threeDaysAgo.toISOString(),
    updated_at: yesterday.toISOString(),
  },
  {
    id: 14,
    site_id: 5,
    raised_by_supervisor_id: 3,
    title: 'Plumbing repair - cafeteria',
    description: 'Multiple faucets leaking in cafeteria kitchen.',
    issue_type: 'Plumbing',
    priority: 'medium',
    deadline_at: now.toISOString(),
    status: 'IN_PROGRESS',
    track_status: 'AUTO_ASSIGNED',
    created_at: twoDaysAgo.toISOString(),
    updated_at: now.toISOString(),
  },
  // REOPENED issues
  {
    id: 15,
    site_id: 2,
    raised_by_supervisor_id: 1,
    title: 'Ceiling fan noise - reoccurred',
    description: 'Ceiling fan in meeting room still making noise after repair.',
    issue_type: 'Electrical',
    priority: 'low',
    deadline_at: yesterday.toISOString(),
    status: 'REOPENED',
    track_status: 'REASSIGNED',
    created_at: oneWeekAgo.toISOString(),
    updated_at: yesterday.toISOString(),
  },
  // More OVERDUE issues (past deadlines)
  {
    id: 16,
    site_id: 3,
    raised_by_supervisor_id: 2,
    title: 'Emergency exit sign broken',
    description: 'Illuminated exit sign not working near stairwell B.',
    issue_type: 'Safety',
    priority: 'high',
    deadline_at: threeDaysAgo.toISOString(),
    status: 'IN_PROGRESS',
    track_status: 'AUTO_ASSIGNED',
    created_at: oneWeekAgo.toISOString(),
    updated_at: twoDaysAgo.toISOString(),
  },
  {
    id: 17,
    site_id: 4,
    raised_by_supervisor_id: 2,
    title: 'Water cooler not cooling',
    description: 'Water cooler on 2nd floor dispensing warm water.',
    issue_type: 'Maintenance',
    priority: 'low',
    deadline_at: twoDaysAgo.toISOString(),
    status: 'ASSIGNED',
    track_status: 'AUTO_ASSIGNED',
    created_at: oneWeekAgo.toISOString(),
    updated_at: threeDaysAgo.toISOString(),
  },
  {
    id: 18,
    site_id: 5,
    raised_by_supervisor_id: 3,
    title: 'Power socket sparking',
    description: 'Electrical socket near reception desk sparking when used.',
    issue_type: 'Electrical',
    priority: 'high',
    deadline_at: twoDaysAgo.toISOString(),
    status: 'OPEN',
    track_status: null,
    created_at: threeDaysAgo.toISOString(),
    updated_at: threeDaysAgo.toISOString(),
  },
  {
    id: 19,
    site_id: 1,
    raised_by_supervisor_id: 1,
    title: 'Roof leak during rain',
    description: 'Water dripping from ceiling in storage area during heavy rain.',
    issue_type: 'Plumbing',
    priority: 'medium',
    deadline_at: yesterday.toISOString(),
    status: 'IN_PROGRESS',
    track_status: 'AUTO_ASSIGNED',
    created_at: oneWeekAgo.toISOString(),
    updated_at: yesterday.toISOString(),
  },
  // Additional COMPLETED for Fixed Issues screen variety
  {
    id: 20,
    site_id: 2,
    raised_by_supervisor_id: 1,
    title: 'Intercom system repair',
    description: 'Intercom system restored to full functionality.',
    issue_type: 'Electrical',
    priority: 'medium',
    deadline_at: oneWeekAgo.toISOString(),
    status: 'COMPLETED',
    track_status: 'AUTO_ASSIGNED',
    created_at: twoWeeksAgo.toISOString(),
    updated_at: oneWeekAgo.toISOString(),
  },
  {
    id: 21,
    site_id: 3,
    raised_by_supervisor_id: 2,
    title: 'Floor tiles replaced',
    description: 'Damaged floor tiles in lobby replaced successfully.',
    issue_type: 'Maintenance',
    priority: 'low',
    deadline_at: threeDaysAgo.toISOString(),
    status: 'COMPLETED',
    track_status: 'AUTO_ASSIGNED',
    created_at: oneWeekAgo.toISOString(),
    updated_at: threeDaysAgo.toISOString(),
  },
  {
    id: 22,
    site_id: 4,
    raised_by_supervisor_id: 2,
    title: 'CCTV camera fixed',
    description: 'Non-functional CCTV camera in parking area repaired.',
    issue_type: 'Electrical',
    priority: 'medium',
    deadline_at: twoDaysAgo.toISOString(),
    status: 'COMPLETED',
    track_status: 'AUTO_ASSIGNED',
    created_at: oneWeekAgo.toISOString(),
    updated_at: twoDaysAgo.toISOString(),
  },
  // More issues for variety
  {
    id: 23,
    site_id: 5,
    raised_by_supervisor_id: 3,
    title: 'Ventilation fan noisy',
    description: 'Exhaust fan in restroom making loud rattling noise.',
    issue_type: 'HVAC',
    priority: 'low',
    deadline_at: inTwoDays.toISOString(),
    status: 'ASSIGNED',
    track_status: 'AUTO_ASSIGNED',
    created_at: yesterday.toISOString(),
    updated_at: yesterday.toISOString(),
  },
  {
    id: 24,
    site_id: 1,
    raised_by_supervisor_id: 1,
    title: 'Door lock jammed',
    description: 'Electronic door lock on server room not responding.',
    issue_type: 'Maintenance',
    priority: 'high',
    deadline_at: inOneDay.toISOString(),
    status: 'IN_PROGRESS',
    track_status: 'AUTO_ASSIGNED',
    created_at: yesterday.toISOString(),
    updated_at: now.toISOString(),
  },
  {
    id: 25,
    site_id: 2,
    raised_by_supervisor_id: 1,
    title: 'Paint peeling - hallway',
    description: 'Paint peeling off walls in main hallway due to moisture.',
    issue_type: 'Maintenance',
    priority: 'low',
    deadline_at: inTwoDays.toISOString(),
    status: 'OPEN',
    track_status: null,
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
  },
  {
    id: 26,
    site_id: 3,
    raised_by_supervisor_id: 2,
    title: 'Fire extinguisher expired',
    description: 'Fire extinguisher near elevator needs replacement - expired.',
    issue_type: 'Safety',
    priority: 'high',
    deadline_at: inOneDay.toISOString(),
    status: 'ASSIGNED',
    track_status: 'AUTO_ASSIGNED',
    created_at: yesterday.toISOString(),
    updated_at: yesterday.toISOString(),
  },
  {
    id: 27,
    site_id: 4,
    raised_by_supervisor_id: 2,
    title: 'Cleaning supplies needed',
    description: 'Janitor closet running low on cleaning supplies.',
    issue_type: 'Cleaning',
    priority: 'low',
    deadline_at: inTwoDays.toISOString(),
    status: 'OPEN',
    track_status: null,
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
  },
];

export const getIssueById = (id) => issues.find(issue => issue.id === id);
export const getIssuesBySiteId = (siteId) => issues.filter(issue => issue.site_id === siteId);
export const getIssuesByStatus = (status) => issues.filter(issue => issue.status === status);
export const getIssuesBySupervisorId = (supervisorId) => 
  issues.filter(issue => issue.raised_by_supervisor_id === supervisorId);
```

## C:\Users\head user\Desktop\Hamthan\v3\AI-Operation-Kaizen\FullStack\frontend\src\mocks\sites.js

```javascript
// Sites Mock Data - 5 Chennai locations
export const sites = [
  {
    id: 1,
    name: 'Vepery Industrial Complex',
    location: 'Vepery, Chennai',
    coordinates: { lat: 13.0827, lon: 80.2707 },
    created_at: '2023-01-01T09:00:00Z',
    updated_at: '2025-01-01T09:00:00Z',
  },
  {
    id: 2,
    name: 'Ambattur Manufacturing Unit',
    location: 'Ambattur, Chennai',
    coordinates: { lat: 13.1143, lon: 80.1548 },
    created_at: '2023-02-01T09:00:00Z',
    updated_at: '2025-01-01T09:00:00Z',
  },
  {
    id: 3,
    name: 'Guindy Tech Park',
    location: 'Guindy, Chennai',
    coordinates: { lat: 13.0067, lon: 80.2206 },
    created_at: '2023-03-01T09:00:00Z',
    updated_at: '2025-01-01T09:00:00Z',
  },
  {
    id: 4,
    name: 'Perungudi IT Corridor',
    location: 'Perungudi, Chennai',
    coordinates: { lat: 12.9645, lon: 80.2486 },
    created_at: '2023-04-01T09:00:00Z',
    updated_at: '2025-01-01T09:00:00Z',
  },
  {
    id: 5,
    name: 'Taramani Innovation Hub',
    location: 'Taramani, Chennai',
    coordinates: { lat: 12.9831, lon: 80.2432 },
    created_at: '2023-05-01T09:00:00Z',
    updated_at: '2025-01-01T09:00:00Z',
  },
];

export const getSiteById = (id) => sites.find(site => site.id === id);
export const getSitesByIds = (ids) => sites.filter(site => ids.includes(site.id));
```

## C:\Users\head user\Desktop\Hamthan\v3\AI-Operation-Kaizen\FullStack\frontend\src\mocks\solverSkills.js

```javascript
// Solver Skills Mock Data - 20+ skill mappings
export const solverSkills = [
  // Suresh Babu (ID: 6) - Plumbing specialist
  {
    id: 1,
    solver_id: 6,
    skill_type: 'Plumbing',
    site_id: 1,
    priority: 1,
    is_available: true,
    created_at: '2024-04-01T09:00:00Z',
    updated_at: '2025-06-01T10:00:00Z',
  },
  {
    id: 2,
    solver_id: 6,
    skill_type: 'Plumbing',
    site_id: 2,
    priority: 1,
    is_available: true,
    created_at: '2024-04-01T09:00:00Z',
    updated_at: '2025-06-01T10:00:00Z',
  },
  {
    id: 3,
    solver_id: 6,
    skill_type: 'Plumbing',
    site_id: 5,
    priority: 2,
    is_available: true,
    created_at: '2024-04-01T09:00:00Z',
    updated_at: '2025-06-01T10:00:00Z',
  },
  {
    id: 4,
    solver_id: 6,
    skill_type: 'Maintenance',
    site_id: 1,
    priority: 3,
    is_available: true,
    created_at: '2024-04-01T09:00:00Z',
    updated_at: '2025-06-01T10:00:00Z',
  },
  // Karthik Rajan (ID: 7) - Electrical specialist
  {
    id: 5,
    solver_id: 7,
    skill_type: 'Electrical',
    site_id: 1,
    priority: 1,
    is_available: true,
    created_at: '2024-04-15T09:00:00Z',
    updated_at: '2025-06-01T10:00:00Z',
  },
  {
    id: 6,
    solver_id: 7,
    skill_type: 'Electrical',
    site_id: 2,
    priority: 1,
    is_available: true,
    created_at: '2024-04-15T09:00:00Z',
    updated_at: '2025-06-01T10:00:00Z',
  },
  {
    id: 7,
    solver_id: 7,
    skill_type: 'Electrical',
    site_id: 3,
    priority: 1,
    is_available: true,
    created_at: '2024-04-15T09:00:00Z',
    updated_at: '2025-06-01T10:00:00Z',
  },
  {
    id: 8,
    solver_id: 7,
    skill_type: 'Safety',
    site_id: 3,
    priority: 2,
    is_available: true,
    created_at: '2024-04-15T09:00:00Z',
    updated_at: '2025-06-01T10:00:00Z',
  },
  // Mohammed Ali (ID: 8) - HVAC specialist
  {
    id: 9,
    solver_id: 8,
    skill_type: 'HVAC',
    site_id: 1,
    priority: 1,
    is_available: true,
    created_at: '2024-05-01T09:00:00Z',
    updated_at: '2025-06-01T10:00:00Z',
  },
  {
    id: 10,
    solver_id: 8,
    skill_type: 'HVAC',
    site_id: 3,
    priority: 1,
    is_available: true,
    created_at: '2024-05-01T09:00:00Z',
    updated_at: '2025-06-01T10:00:00Z',
  },
  {
    id: 11,
    solver_id: 8,
    skill_type: 'HVAC',
    site_id: 5,
    priority: 1,
    is_available: true,
    created_at: '2024-05-01T09:00:00Z',
    updated_at: '2025-06-01T10:00:00Z',
  },
  {
    id: 12,
    solver_id: 8,
    skill_type: 'Maintenance',
    site_id: 3,
    priority: 2,
    is_available: true,
    created_at: '2024-05-01T09:00:00Z',
    updated_at: '2025-06-01T10:00:00Z',
  },
  // Deepak Verma (ID: 9) - Maintenance specialist
  {
    id: 13,
    solver_id: 9,
    skill_type: 'Maintenance',
    site_id: 1,
    priority: 1,
    is_available: true,
    created_at: '2024-05-15T09:00:00Z',
    updated_at: '2025-06-01T10:00:00Z',
  },
  {
    id: 14,
    solver_id: 9,
    skill_type: 'Maintenance',
    site_id: 4,
    priority: 1,
    is_available: true,
    created_at: '2024-05-15T09:00:00Z',
    updated_at: '2025-06-01T10:00:00Z',
  },
  {
    id: 15,
    solver_id: 9,
    skill_type: 'Maintenance',
    site_id: 5,
    priority: 1,
    is_available: true,
    created_at: '2024-05-15T09:00:00Z',
    updated_at: '2025-06-01T10:00:00Z',
  },
  {
    id: 16,
    solver_id: 9,
    skill_type: 'Cleaning',
    site_id: 4,
    priority: 2,
    is_available: true,
    created_at: '2024-05-15T09:00:00Z',
    updated_at: '2025-06-01T10:00:00Z',
  },
  // Ravi Shankar (ID: 10) - Electrical specialist (secondary)
  {
    id: 17,
    solver_id: 10,
    skill_type: 'Electrical',
    site_id: 2,
    priority: 2,
    is_available: true,
    created_at: '2024-06-01T09:00:00Z',
    updated_at: '2025-06-01T10:00:00Z',
  },
  {
    id: 18,
    solver_id: 10,
    skill_type: 'Electrical',
    site_id: 4,
    priority: 1,
    is_available: true,
    created_at: '2024-06-01T09:00:00Z',
    updated_at: '2025-06-01T10:00:00Z',
  },
  {
    id: 19,
    solver_id: 10,
    skill_type: 'Electrical',
    site_id: 5,
    priority: 2,
    is_available: true,
    created_at: '2024-06-01T09:00:00Z',
    updated_at: '2025-06-01T10:00:00Z',
  },
  {
    id: 20,
    solver_id: 10,
    skill_type: 'Safety',
    site_id: 4,
    priority: 2,
    is_available: true,
    created_at: '2024-06-01T09:00:00Z',
    updated_at: '2025-06-01T10:00:00Z',
  },
];

export const getSkillsBySolverId = (solverId) => 
  solverSkills.filter(s => s.solver_id === solverId);

export const getSolversBySkillType = (skillType) => 
  solverSkills.filter(s => s.skill_type === skillType);

export const getAvailableSolversForSite = (siteId, skillType) => 
  solverSkills.filter(s => 
    s.site_id === siteId && 
    s.skill_type === skillType && 
    s.is_available
  ).sort((a, b) => a.priority - b.priority);
```

## C:\Users\head user\Desktop\Hamthan\v3\AI-Operation-Kaizen\FullStack\frontend\src\mocks\supervisorSites.js

```javascript
// Supervisor-Sites junction table (NO timestamps per spec)
export const supervisorSites = [
  { supervisor_id: 1, site_id: 1 },
  { supervisor_id: 1, site_id: 2 },
  { supervisor_id: 2, site_id: 3 },
  { supervisor_id: 2, site_id: 4 },
  { supervisor_id: 3, site_id: 5 },
];

export const getSitesBySupervisorId = (supervisorId) => 
  supervisorSites.filter(ss => ss.supervisor_id === supervisorId).map(ss => ss.site_id);

export const getSupervisorsBySiteId = (siteId) => 
  supervisorSites.filter(ss => ss.site_id === siteId).map(ss => ss.supervisor_id);
```

## C:\Users\head user\Desktop\Hamthan\v3\AI-Operation-Kaizen\FullStack\frontend\src\mocks\users.js

```javascript
// Users Mock Data - 10 users
export const users = [
  // Supervisors (IDs 1-3)
  {
    id: 1,
    name: 'Rajesh Kumar',
    phone: '+91 98765 43210',
    email: 'rajesh.kumar@company.com',
    role: 'supervisor',
    username: 'supervisor1',
    password: 'super123',
    avatar: 'https://ui-avatars.com/api/?name=Rajesh+Kumar&background=2563eb&color=fff&size=128',
    sites: [1, 2],
    created_at: '2024-01-15T09:00:00Z',
    updated_at: '2025-06-01T10:30:00Z',
  },
  {
    id: 2,
    name: 'Priya Sharma',
    phone: '+91 98765 43211',
    email: 'priya.sharma@company.com',
    role: 'supervisor',
    username: 'supervisor2',
    password: 'super123',
    avatar: 'https://ui-avatars.com/api/?name=Priya+Sharma&background=8b5cf6&color=fff&size=128',
    sites: [3, 4],
    created_at: '2024-02-01T09:00:00Z',
    updated_at: '2025-06-01T10:30:00Z',
  },
  {
    id: 3,
    name: 'Arun Patel',
    phone: '+91 98765 43212',
    email: 'arun.patel@company.com',
    role: 'supervisor',
    username: 'supervisor3',
    password: 'super123',
    avatar: 'https://ui-avatars.com/api/?name=Arun+Patel&background=16a34a&color=fff&size=128',
    sites: [5],
    created_at: '2024-03-15T09:00:00Z',
    updated_at: '2025-06-01T10:30:00Z',
  },
  // Managers (IDs 4-5)
  {
    id: 4,
    name: 'Vikram Singh',
    phone: '+91 98765 43213',
    email: 'vikram.singh@company.com',
    role: 'manager',
    username: 'manager1',
    password: 'manager123',
    avatar: 'https://ui-avatars.com/api/?name=Vikram+Singh&background=ef4444&color=fff&size=128',
    created_at: '2023-06-01T09:00:00Z',
    updated_at: '2025-06-01T10:30:00Z',
  },
  {
    id: 5,
    name: 'Meera Reddy',
    phone: '+91 98765 43214',
    email: 'meera.reddy@company.com',
    role: 'manager',
    username: 'manager2',
    password: 'manager123',
    avatar: 'https://ui-avatars.com/api/?name=Meera+Reddy&background=f97316&color=fff&size=128',
    created_at: '2023-08-15T09:00:00Z',
    updated_at: '2025-06-01T10:30:00Z',
  },
  // Problem Solvers (IDs 6-10)
  {
    id: 6,
    name: 'Suresh Babu',
    phone: '+91 98765 43215',
    email: 'suresh.babu@company.com',
    role: 'problem_solver',
    username: 'solver1',
    password: 'solver123',
    avatar: 'https://ui-avatars.com/api/?name=Suresh+Babu&background=0ea5e9&color=fff&size=128',
    skill: 'Plumbing',
    created_at: '2024-04-01T09:00:00Z',
    updated_at: '2025-06-01T10:30:00Z',
  },
  {
    id: 7,
    name: 'Karthik Rajan',
    phone: '+91 98765 43216',
    email: 'karthik.rajan@company.com',
    role: 'problem_solver',
    username: 'solver2',
    password: 'solver123',
    avatar: 'https://ui-avatars.com/api/?name=Karthik+Rajan&background=22c55e&color=fff&size=128',
    skill: 'Electrical',
    created_at: '2024-04-15T09:00:00Z',
    updated_at: '2025-06-01T10:30:00Z',
  },
  {
    id: 8,
    name: 'Mohammed Ali',
    phone: '+91 98765 43217',
    email: 'mohammed.ali@company.com',
    role: 'problem_solver',
    username: 'solver3',
    password: 'solver123',
    avatar: 'https://ui-avatars.com/api/?name=Mohammed+Ali&background=eab308&color=fff&size=128',
    skill: 'HVAC',
    created_at: '2024-05-01T09:00:00Z',
    updated_at: '2025-06-01T10:30:00Z',
  },
  {
    id: 9,
    name: 'Deepak Verma',
    phone: '+91 98765 43218',
    email: 'deepak.verma@company.com',
    role: 'problem_solver',
    username: 'solver4',
    password: 'solver123',
    avatar: 'https://ui-avatars.com/api/?name=Deepak+Verma&background=ec4899&color=fff&size=128',
    skill: 'Maintenance',
    created_at: '2024-05-15T09:00:00Z',
    updated_at: '2025-06-01T10:30:00Z',
  },
  {
    id: 10,
    name: 'Ravi Shankar',
    phone: '+91 98765 43219',
    email: 'ravi.shankar@company.com',
    role: 'problem_solver',
    username: 'solver5',
    password: 'solver123',
    avatar: 'https://ui-avatars.com/api/?name=Ravi+Shankar&background=6366f1&color=fff&size=128',
    skill: 'Electrical',
    created_at: '2024-06-01T09:00:00Z',
    updated_at: '2025-06-01T10:30:00Z',
  },
];

export const getUserById = (id) => users.find(user => user.id === id);
export const getUserByUsername = (username) => users.find(user => user.username === username);
export const getUsersByRole = (role) => users.filter(user => user.role === role);
```

## C:\Users\head user\Desktop\Hamthan\v3\AI-Operation-Kaizen\FullStack\frontend\src\services\api.js

```javascript
/**
 * Real API Service - Connects to PostgreSQL Backend
 * 
 * All API calls to the FastAPI backend
 */

import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { withRetry } from '../utils/networkRetry';

// API Base URL - Backend is on port 8001
// const getBaseUrl = () => {
//   // For production/preview deployments, use the EXPO_PUBLIC_BACKEND_URL
//   const backendUrl = Constants.expoConfig?.extra?.backendUrl || 
//                      process.env.EXPO_PUBLIC_BACKEND_URL;
  
//   if (backendUrl) {
//     return `${backendUrl}/api`;
//   }
  
//   // For local development
//   if (Platform.OS === 'web') {
//     // Use relative URL which will be proxied
//     return 'http://localhost:8001/api';
//   }
  
//   // Native apps need full URL
//   return 'http://localhost:8001/api';
// };

const backendUrl = 'http://127.0.0.1:8000';


const API_BASE_URL = backendUrl;

console.log('API Base URL:', API_BASE_URL);

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000000000, // 50 minutes - increase for long-running requests
  headers: {
    'Content-Type': 'application/json',
  },
});

// Token storage keys
const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';

// Request interceptor - add auth token
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem(TOKEN_KEY);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - handle errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid - clear storage
      await AsyncStorage.removeItem(TOKEN_KEY);
      await AsyncStorage.removeItem(USER_KEY);
    }
    return Promise.reject(error);
  }
);

// ==================== AUTH API ====================

/**
 * Login user with username and password
 */
export const loginUser = async (username, password) => {
  try {
    const response = await api.post('/api/v1/auth/login', {
        phone: username,   // IMPORTANT: match backend field
        password: password,
    });
    const { access_token, user } = response.data;

    // Store token and user
    await AsyncStorage.setItem(TOKEN_KEY, access_token);
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));

    return {
      success: true,
      user: {
        ...user,
        avatar: user.avatar_url,
      },
      token: access_token,
    };
  } catch (error) {
    console.error('Login error:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.detail || 'Invalid credentials',
    };
  }
};

/**
 * Get current authenticated user
 */
export const getCurrentUser = async () => {
  try {
    const response = await api.get('/api/v1/auth/me');
    return {
      success: true,
      user: {
        ...response.data,
        avatar: response.data.avatar_url,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.detail || 'Failed to get user',
    };
  }
};

/**
 * Logout user - clear stored credentials
 */
export const logoutUser = async () => {
  await AsyncStorage.removeItem(TOKEN_KEY);
  await AsyncStorage.removeItem(USER_KEY);
  return { success: true };
};

/**
 * Check if user is authenticated
 */
export const isAuthenticated = async () => {
  const token = await AsyncStorage.getItem(TOKEN_KEY);
  return !!token;
};

/**
 * Get stored user from AsyncStorage
 */
export const getStoredUser = async () => {
  try {
    const userJson = await AsyncStorage.getItem(USER_KEY);
    if (userJson) {
      const user = JSON.parse(userJson);
      return {
        ...user,
        avatar: user.avatar_url,
      };
    }
    return null;
  } catch (error) {
    return null;
  }
};

// ==================== ISSUES API ====================

/**
 * Fetch all issues with optional filters
 */


/**
 * Fetch all issues using Cursor-Based Pagination
 */
export const fetchIssues = async (filters = {}) => {
  try {
    // 📍 Let Axios build the query string cleanly to avoid URL parsing errors
    const queryParams = {};
    if (filters.status) queryParams.status = filters.status;
    if (filters.priority) queryParams.priority = filters.priority;
    if (filters.site_id) queryParams.site_id = filters.site_id;
    
    // Add the boss's cursor and limit parameters
    if (filters.cursor) queryParams.cursor = filters.cursor;
    queryParams.limit = filters.limit || 10; // fallback to 20 if limit isn't passed

    // Hit the exact URL that worked for you, passing params as an object
    const response = await withRetry(
      () => api.get('/api/v1/issues/feed', { params: queryParams }),
      { maxRetries: 2 }
    );
    
    const data = response.data;
    console.log(data)
    
    // Fallback to empty array if items is missing
    const rawItems = data.items || [];

    // Map backend fields to frontend format
    const issues = rawItems.map(issue => ({ 
      ...issue,
      site: {
        name: issue.site_name,
      },
      raised_by: {
        name: issue.supervisor_name,
      }
    }));

    return {
      success: true,
      issues,
      next_cursor: data.next_cursor || null,
      has_more: data.has_more ?? false,
    };
  } catch (error) {
    console.error('Fetch issues error:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.detail || 'Failed to fetch issues',
      issues: [],
      next_cursor: null,
      has_more: false,
    };
  }
};


/**
 * Fetch single issue by ID
 */
export const fetchIssueById = async (issueId) => {
  try {
    const response = await api.get(`/api/v1/issues/${issueId}`); // URL HAS BEEN CHANGED NOW IT'S /api/v1/issues/{issue_id}

    const issue = {
      ...response.data,
      site: response.data.site ? {
        ...response.data.site,
        name: response.data.site.name,
      } : null,
      raised_by: response.data.raised_by ? {
        ...response.data.raised_by,
        avatar: response.data.raised_by.avatar_url,
      } : null,
    };

    return {
      success: true,
      issue,
    };
  } catch (error) {
    console.error('Fetch issue error:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.detail || 'Failed to fetch issue',
    };
  }
};

/**
 * Fetch single issue by ID along with its timeline entries
 */
export const fetchIssueTimeline = async (issueId) => {
  try {
    const response = await api.get(`/api/v1/issues/${issueId}/timeline`);

    return {
      success: true,
      timeline: response.data.entries,
    };
  } catch (error) {
    console.error("Timeline fetch error:", error.response?.data || error.message);

    return {
      success: false,
      timeline: [],
    };
  }
};
// ==================== DASHBOARD API ====================
/**
 * Fetch dashboard statistics
 */
export const fetchDashboardStats = async () => {
  try {
    const response = await api.get('/api/v1/dashboard');
    const data = response?.data || {};

    // 🕵️ DETECT PROBLEM SOLVER PAYLOAD
   if (data.active_assignments) {
      return {
        success: true,
        data: {
          isSolverView: true,
          stats: {
            totalIssues: (data.total_active || 0) + (data.total_completed || 0),
            notFixedIssues: data.total_active || 0,
            fixedIssues: data.total_completed || 0,
            complaints: data.complaints_against || 0
          },
          recentIssues: data.active_assignments.map(a => ({
            id: a.issue_id,
            title: a.issue_title,
            site_name: a.site_name,
            priority: a.priority,
            status: a.status || "ASSIGNED", 
            // ✅ FIXED: Map to actual created_at for the time-series chart
            created_at: a.due_date || a.created_at 
          }))
        }
      };
    }
      
    // 👔 MANAGER / SUPERVISOR PAYLOAD
    const summary = data.summary || {};
    return {
      success: true,
      data: {
        isSolverView: false,
        stats: {
          totalIssues: summary.total_issues || 0,
          notFixedIssues: 
            (summary.open_issues || 0) + 
            (summary.assigned_issues || 0) + 
            (summary.in_progress_issues || 0) + 
            (summary.reopened_issues || 0) + 
            (summary.escalated_issues || 0),
          fixedIssues: summary.completed_issues || 0,
          complaints: 0
        },
        rawSummary: summary,
        alerts: {
          // ✅ FIXED: Mapping to exact keys from your Manager JSON
          escalations: data.active_escalations || 0,
          deadlines: data.overdue_issues || 0,
          pendingReviews: summary.resolved_pending_review || 0
        },
        recentIssues: data.recent_issues || [],
        mySites: data.my_sites || []
      }
    };

  } catch (error) {
    console.error('Fetch dashboard error:', error.response?.data || error.message);
    return {
      success: true, // Fallback
      data: {
        isSolverView: false,
        stats: { totalIssues: 0, notFixedIssues: 0, fixedIssues: 0, complaints: 0 },
        rawSummary: {},
        alerts: { escalations: 0, deadlines: 0, pendingReviews: 0 },
        recentIssues: [],
        mySites: []
      }
    };
  }
};

// ==================== COMPLAINTS API ====================

/**
 * Fetch all complaints
 */
export const fetchComplaints = async () => {
  try {
    const response = await api.get('/api/v1/complaints/feed');

    // 📍 EXACT DATA: Pass the backend response directly without mutating it
    // Handle both { complaints: [...] } or direct array [...] responses
    const complaints = response.data.complaints || response.data || [];

    return {
      success: true,
      complaints,
    };

  } catch (error) {
    console.error("Fetch complaints error:", error);
    return {
      success: false,
      complaints: [],
    };
  }
};
export const fetchComplaintById = async (id) => {
  try {
    const response = await api.get(`/api/v1/complaints/${id}`);
    // 📍 EXACT DATA: Return the raw object exactly as backend sent it
    // No more mapping raisedBy or status="OPEN"
    return response.data;
  } catch (error) {
    throw error;
  }
};
// ==================== SITES API ====================

/**
 * Fetch all sites
 */
export const fetchSites = async () => {
  try {
    const response = await api.get('/api/v1/sites/analytics');
    return {
      success: true,
      sites: response.data,
    };
  } catch (error) {
    console.error('Fetch sites error:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.detail || 'Failed to fetch sites',
      sites: [],
    };
  }
};

//it have to be analytic with site id based
export const fetchSitesAnalytics = async () => {
 try {
    const response = await api.get('/api/v1/sites/analytics');

    return {
      success: true,
      sites: response.data.sites,
    };

  } catch (error) {
    console.error("Fetch sites error:", error.response?.data || error.message);

    return {
      success: false,
      sites: [],
      error: error.response?.data?.detail || "Failed to fetch sites",
    };
  }
};

// we have to add another function to fetch solvers performance based on solver id
export const fetchSolversPerformanceAPI = async () => {
  try {
    const response = await api.get('/api/v1/solvers');

    return {
      success: true,
      solvers: response.data.solvers,
    };

  } catch (error) {
    return {
      success: false,
      solvers: [],
      error: error.response?.data?.detail || "Failed to fetch solvers",
    };
  }
};

// ==================== CHATBOT API ====================

/**
 * Send message to chatbot
 */
// chatService.js 
export const sendChatMessage = async (
  text,
  sessionId = null,
  currentIssueId = null,
  imageUrl = null,
  intent = null // added by hamthan
) => {
  try {
    const requestBody = {
      message: text,
      session_id: sessionId,   // ✅ VERY IMPORTANT
      image_url: imageUrl,
      issue_id: currentIssueId,
      metadata: {
        platform: Platform.OS,
        timestamp: new Date().toISOString(),
      },
      intent: intent // added by hamthan
    };

    const response = await api.post('/api/v1/chat/', requestBody);

    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    console.error("Chat send error:", error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.detail || "Failed to send message",
    };
  }
};

export const fetchChatSessions = async () => {
  try {
    const response = await api.get('/api/v1/chat/sessions');
    return {
      success: true,
      sessions: response.data.sessions,
    };
  } catch (error) {
    console.error("Fetch sessions error:", error.response?.data || error.message);
    return {
      success: false,
      sessions: [],
    };
  }
};

export const fetchSessionDetail = async (sessionId) => {
  try {
    const response = await api.get(`/api/v1/chat/sessions/${sessionId}`);
    return {
      success: true,
      session: response.data,
    };
  } catch (error) {
    console.error("Fetch session detail error:", error.response?.data || error.message);
    return {
      success: false,
      session: null,
    };
  }
};

// ==================== HEALTH CHECK ====================

/**
 * Check API health
 */
export const checkHealth = async () => {
  try {
    const response = await api.get('/health');
    return {
      success: true,
      ...response.data,
    };
  } catch (error) {
    return {
      success: false,
      error: 'API not available',
    };
  }
};

export default {
  // Auth
  loginUser,
  getCurrentUser,
  logoutUser,
  isAuthenticated,
  getStoredUser,
  
  // Issues
  fetchIssues,
  fetchIssueById,
  
  // Dashboard
  fetchDashboardStats,
  
  // Complaints
  fetchComplaints,
  
  // Sites
  fetchSites,
  
  // Chatbot
  sendChatMessage,
  
  // Health
  checkHealth,
};
```

## C:\Users\head user\Desktop\Hamthan\v3\AI-Operation-Kaizen\FullStack\frontend\src\store\slices\authSlice.js

```javascript
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { 
  loginUser as loginUserApi, 
  logoutUser as logoutUserApi,
  getStoredUser,
  isAuthenticated as checkAuthToken // ✅ Imported to quickly check disk
} from '../../services/api'; 

const initialState = {
  isInitialized: false, // ✅ NEW: Tracks if we've checked local storage
  isAuthenticated: false,
  user: null,
  token: null,
  loading: false,
  error: null,
};

export const loginUser = createAsyncThunk(
  'auth/login',
  async ({ username, password }, { rejectWithValue }) => {
    try {
      console.log('🔍 Thunk calling loginUserApi...');
      const result = await loginUserApi(username, password);
      console.log('🔍 Thunk received:', JSON.stringify(result));
      if (!result.success) {
        return rejectWithValue(result.error);
      }
      return result;
    } catch (error) {
      console.log('🔍 Thunk caught error:', error.message);
      return rejectWithValue(error.message || 'Login failed');
    }
  }
);

// ✅ OPTIMISTIC HYDRATION: Check disk (fast), don't wait for server (slow)
export const checkAuthStatus = createAsyncThunk(
  'auth/checkStatus',
  async (_, { rejectWithValue }) => {
    try {
      const hasToken = await checkAuthToken();
      const storedUser = await getStoredUser();
      
      if (hasToken && storedUser) {
        // Boom! We have a user on disk. Log them in instantly.
        return { user: storedUser };
      }
      return null;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const logoutUser = createAsyncThunk(
  'auth/logout',
  async () => {
    await logoutUserApi();
    return null;
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser: (state, action) => {
      state.user = action.payload;
      state.isAuthenticated = !!action.payload;
    },
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    setError: (state, action) => {
      state.error = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.isAuthenticated = true;
        state.error = null;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Login failed';
        state.isAuthenticated = false;
      })
      .addCase(checkAuthStatus.fulfilled, (state, action) => {
        if (action.payload) {
          state.user = action.payload.user;
          state.isAuthenticated = true;
        } else {
          state.isAuthenticated = false;
        }
        state.isInitialized = true; // ✅ Done checking storage
        state.loading = false;
      })
      .addCase(checkAuthStatus.rejected, (state) => {
        state.isAuthenticated = false;
        state.isInitialized = true; // ✅ Done checking storage, even if it failed
        state.loading = false;
      })
      .addCase(logoutUser.fulfilled, (state) => {
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
        state.loading = false;
        state.error = null;
        // Note: isInitialized stays true because the app is already booted up
      });
  },
});

export const { setUser, setLoading, setError, clearError } = authSlice.actions;

// Selectors
export const selectIsInitialized = (state) => state.auth.isInitialized; // ✅ NEW Selector for layout
export const selectIsAuthenticated = (state) => state.auth.isAuthenticated;
export const selectCurrentUser = (state) => state.auth.user;
export const selectUserRole = (state) => state.auth.user?.role;
export const selectAuthLoading = (state) => state.auth.loading;
export const selectAuthError = (state) => state.auth.error;
export const selectAuthToken = (state) => state.auth.token;

export default authSlice.reducer;
```

## C:\Users\head user\Desktop\Hamthan\v3\AI-Operation-Kaizen\FullStack\frontend\src\store\slices\chatSlice.js

```javascript
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import {
  fetchChatSessions,
  fetchSessionDetail,
} from '../../services/api';

const initialState = {
  messages: [],
  chatHistory: [],
  currentConversationId: null,
  historyLoading: false,      // 📍 FIX: Dedicated state for sidebar
  conversationLoading: false, // 📍 FIX: Dedicated state for main chat
  error: null,
  context: null,
};

export const loadChatHistory = createAsyncThunk(
  'chat/loadHistory',
  async (_, { rejectWithValue }) => {
    try {
      const result = await fetchChatSessions();
      if (!result.success) throw new Error();
      return result.sessions;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const loadConversation = createAsyncThunk(
  'chat/loadConversation',
  async (sessionId, { rejectWithValue }) => {
    try {
      const result = await fetchSessionDetail(sessionId);
      // 📍 FIX: Actually throw the error so the frontend can catch the 404
      if (!result.success) throw new Error(result.error || "Session not found");

      return {
        sessionId,
        messages: result.session.messages,
      };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    addMessage: (state, action) => {
      state.messages.push(action.payload);
    },
    setMessages: (state, action) => {
      state.messages = action.payload;
    },
    clearMessages: (state) => {
      state.messages = [];
      state.currentConversationId = null;
    },
    startNewConversation: (state) => {
      state.messages = [];
      state.currentConversationId = null;  
    },
    setCurrentConversationId: (state, action) => {
      state.currentConversationId = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // ── SIDEBAR LOADING ──
      .addCase(loadChatHistory.pending, (state) => {
        state.historyLoading = true;
      })
      .addCase(loadChatHistory.fulfilled, (state, action) => {
        state.historyLoading = false;
        state.chatHistory = action.payload;
      })
      .addCase(loadChatHistory.rejected, (state, action) => {
        state.historyLoading = false;
        state.error = action.payload;
      })
      // ── CONVERSATION LOADING ──
      .addCase(loadConversation.pending, (state) => {
        state.conversationLoading = true;
        state.messages = []; // 📍 FIX: Clear old messages instantly
      })
      .addCase(loadConversation.fulfilled, (state, action) => {
        state.conversationLoading = false;
        state.messages = action.payload.messages;
        state.currentConversationId = action.payload.sessionId;
      })
      .addCase(loadConversation.rejected, (state, action) => {
        state.conversationLoading = false;
        state.error = action.payload;
      });
  },
});

export const { addMessage, setMessages, setContext, clearMessages, startNewConversation , setCurrentConversationId } = chatSlice.actions;

// Selectors
export const selectAllMessages = (state) => state.chat.messages;
export const selectChatHistory = (state) => state.chat.chatHistory;
export const selectCurrentConversationId = (state) => state.chat.currentConversationId;
// 📍 FIX: Exporting the new separated loading states
export const selectHistoryLoading = (state) => state.chat.historyLoading;
export const selectConversationLoading = (state) => state.chat.conversationLoading;
export const selectContext = (state) => state.chat.context;

export default chatSlice.reducer;
```

## C:\Users\head user\Desktop\Hamthan\v3\AI-Operation-Kaizen\FullStack\frontend\src\store\slices\complaintsSlice.js

```javascript
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import {
  fetchComplaints as fetchComplaintsApi,
  fetchComplaintById as fetchComplaintByIdApi,
} from '../../services/api';

const initialState = {
  complaints: [],
  currentComplaint: null,        // ✅ ADD
  loading: false,
  error: null,
  filters: {
    search: '',
    status: null,
  },
};

export const fetchComplaints = createAsyncThunk(
  'complaints/fetchAll',
  async (user, { rejectWithValue }) => {
    try {
      const result = await fetchComplaintsApi(user);    // ✅ pass user
      if (!result.success) {
        return rejectWithValue(result.error);
      }
      return result.complaints;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to fetch complaints');
    }
  }
);

// ✅ ADD this thunk
export const fetchComplaintById = createAsyncThunk(
  'complaints/fetchById',
  async (id, { rejectWithValue }) => {
    try {
      const result = await fetchComplaintByIdApi(id);
      return result;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to fetch complaint');
    }
  }
);

const complaintsSlice = createSlice({
  name: 'complaints',
  initialState,
  reducers: {
    setFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearFilters: (state) => {
      state.filters = initialState.filters;
    },
    // ✅ ADD this action
    clearCurrentComplaint: (state) => {
      state.currentComplaint = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchAll
      .addCase(fetchComplaints.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchComplaints.fulfilled, (state, action) => {
        state.loading = false;
        state.complaints = action.payload;
        state.error = null;
      })
      .addCase(fetchComplaints.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // ✅ ADD fetchById cases
      .addCase(fetchComplaintById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchComplaintById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentComplaint = action.payload;
        state.error = null;
      })
      .addCase(fetchComplaintById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { setFilters, clearFilters, clearCurrentComplaint } = complaintsSlice.actions;

// Selectors
export const selectAllComplaints = (state) => state.complaints.complaints;
export const selectCurrentComplaint = (state) => state.complaints.currentComplaint;  // ✅ ADD
export const selectComplaintsLoading = (state) => state.complaints.loading;
export const selectComplaintsError = (state) => state.complaints.error;
export const selectFilters = (state) => state.complaints.filters;
export const selectFilteredComplaints = (state) => {
  const { complaints, filters } = state.complaints;
  let filtered = [...complaints];
  
  if (filters.search) {
    const searchLower = filters.search.toLowerCase();
    filtered = filtered.filter(complaint =>
      // 📍 Match exact backend keys for searching
      complaint.issue_title?.toLowerCase().includes(searchLower) ||
      complaint.complaint_details?.toLowerCase().includes(searchLower) ||
      complaint.id?.toString().includes(searchLower) ||
      complaint.issue_id?.toString().includes(searchLower)
    );
  }
  
  return filtered;
};
export default complaintsSlice.reducer;
```

## C:\Users\head user\Desktop\Hamthan\v3\AI-Operation-Kaizen\FullStack\frontend\src\store\slices\dashboardSlice.js

```javascript
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { fetchDashboardStats as fetchDashboardDataApi } from '../../services/api';

const initialState = {
  isSolverView: false, // ✅ ADDED THIS
  stats: {
    totalIssues: 0,
    notFixedIssues: 0,
    fixedIssues: 0,
    complaints: 0,
  },
  alerts: {
    escalations: 0,
    deadlines: 0,
    pendingReviews: 0
  },
  recentIssues: [],
  charts: {
    issuesTrend: [],
    issuesByCategory: [],
    sitePerformance: [],
  },
  loading: false,
  error: null,
};

export const fetchDashboardData = createAsyncThunk(
  'dashboard/fetchData',
  async (_, { rejectWithValue }) => {
    try {
      const result = await fetchDashboardDataApi();
      console.log("Dashboard API Result:", result);
      if (!result.success) return rejectWithValue(result.error);
      return result.data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchDashboardData.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDashboardData.fulfilled, (state, action) => {
        const payload = action.payload;

        state.loading = false;
        state.isSolverView = payload.isSolverView || false; // ✅ ADDED THIS
        state.stats = payload.stats;
        state.alerts = payload.alerts || initialState.alerts;
        state.recentIssues = payload.recentIssues || [];

        // 📊 DYNAMIC PIE CHART (✅ ADDED IF/ELSE TO PREVENT CRASH)
        if (payload.isSolverView) {
          // Solver Pie Chart (Active vs Completed)
          state.charts.issuesByCategory = [
            { name: 'Active Tasks', count: payload.stats.notFixedIssues, color: '#3b82f6' },
            { name: 'Completed', count: payload.stats.fixedIssues, color: '#10a37f' }
          ].filter(item => item.count > 0);
        } else {
          // Manager/Supervisor Pie Chart
          const summary = payload.rawSummary || {};
          // ✅ Mapping specifically to the snake_case keys in your JSON
          state.charts.issuesByCategory = [
            { name: 'Open', count: summary.open_issues || 0, color: '#3b82f6' },
            { name: 'In Progress', count: (summary.in_progress_issues || 0) + (summary.assigned_issues || 0), color: '#8b5cf6' },
            { name: 'Completed', count: summary.completed_issues || 0, color: '#10a37f' },
            { name: 'Escalated', count: summary.escalated_issues || 0, color: '#ef4444' }
          ].filter(item => item.count > 0);
        }

        // 📈 DYNAMIC LINE CHART (Same for both roles)
        const dayCounts = {};
        const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

        if (payload.recentIssues && payload.recentIssues.length > 0) {
          payload.recentIssues.forEach(issue => {
            if (issue.created_at) {
              const date = new Date(issue.created_at);
              const dayName = daysOfWeek[date.getDay()];
              dayCounts[dayName] = (dayCounts[dayName] || 0) + 1;
            }
          });
        }

        // Map to expected chart format
        state.charts.issuesTrend = Object.keys(dayCounts).map(day => ({
          day,
          created: dayCounts[day]
        }));
      })
      .addCase(fetchDashboardData.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

// ✅ ADDED selectIsSolverView EXPORT
export const selectIsSolverView = (state) => state.dashboard.isSolverView;
export const selectStats = (state) => state.dashboard.stats;
export const selectAlerts = (state) => state.dashboard.alerts;
export const selectRecentIssues = (state) => state.dashboard.recentIssues;
export const selectCharts = (state) => state.dashboard.charts;
export const selectDashboardLoading = (state) => state.dashboard.loading;

export default dashboardSlice.reducer;
```

## C:\Users\head user\Desktop\Hamthan\v3\AI-Operation-Kaizen\FullStack\frontend\src\store\slices\issuesSlice.js

```javascript
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { fetchIssues as fetchIssuesApi, fetchIssueById as fetchIssueByIdApi , fetchIssueTimeline as fetchIssueTimelineApi } from '../../services/api';

// Initial state
const initialState = {
  issues: [],
  currentIssue: null,
  timeline: [], // New state for issue timeline
  loading: false,
  loadingMore: false, // 📍 NEW: For cursor pagination loading indicator
  nextCursor: null,   // 📍 NEW: Store the opaque cursor string
  hasMore: true,      // 📍 NEW: Stop condition tracker
  error: null,
  filters: {
    search: '',
    status: null,
    priority: null,
    site: null,
  },
};

export const fetchIssues = createAsyncThunk(
  'issues/fetchAll',
  async (params = {}, { getState, rejectWithValue }) => {
    try {
      const state = getState().issues;
      
      // Determine if we are doing a fresh load or an infinite scroll append
      const isReset = params?.reset !== false;
      
      // Stop condition: if scrolling and no more items, abort safely
      if (!isReset && !state.hasMore) {
        return rejectWithValue('No more items');
      }

      // Pass the cursor only if we are appending items
      const apiParams = {
        ...state.filters,
        limit: 10,
        cursor: isReset ? null : state.nextCursor, 
      };

      const result = await fetchIssuesApi(apiParams);
      
      if (!result.success) {
        return rejectWithValue(result.error);
      }
      
      return {
        issues: result.issues,
        next_cursor: result.next_cursor,
        has_more: result.has_more,
        isReset: isReset
      };
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to fetch issues');
    }
  }
);

export const fetchIssueById = createAsyncThunk(
  'issues/fetchById',
  async (issueId, { rejectWithValue }) => {
    try {
      const result = await fetchIssueByIdApi(issueId);
      if (!result.success) {
        return rejectWithValue(result.error);
      }
      return result.issue;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to fetch issue');
    }
  }
);

export const fetchIssueTimeline = createAsyncThunk(
  'issues/fetchTimeline',
  async (issueId, { rejectWithValue }) => {
    try {
      const result = await fetchIssueTimelineApi(issueId);

      if (!result.success) {
        return rejectWithValue('Failed to fetch timeline');
      }

      return result.timeline;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const issuesSlice = createSlice({
  name: 'issues',
  initialState,
  reducers: {
    setFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearFilters: (state) => {
      state.filters = initialState.filters;
    },
    setCurrentIssue: (state, action) => {
      state.currentIssue = action.payload;
    },
    clearCurrentIssue: (state) => {
      state.currentIssue = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchIssues.pending, (state, action) => {
        // Trigger full screen loader vs bottom spinner based on the reset flag
        const isReset = action.meta.arg?.reset !== false;
        if (isReset) {
          state.loading = true;
        } else {
          state.loadingMore = true;
        }
        state.error = null;
      })
      .addCase(fetchIssues.fulfilled, (state, action) => {
        state.loading = false;
        state.loadingMore = false;
        state.error = null;
        
        if (action.payload.isReset) {
          // Fresh load: overwrite existing issues
          state.issues = action.payload.issues;
        } else {
          // Infinite Scroll: Safely append new issues, filtering duplicates
          const existingIds = new Set(state.issues.map(i => i.id));
          const newItems = action.payload.issues.filter(i => !existingIds.has(i.id));
          state.issues = [...state.issues, ...newItems];
        }

        // 📍 Always update cursor and stop conditions after a successful fetch
        state.nextCursor = action.payload.next_cursor;
        state.hasMore = action.payload.has_more;
      })
      .addCase(fetchIssues.rejected, (state, action) => {
        state.loading = false;
        state.loadingMore = false;
        
        // Ignore the rejection if it was deliberately stopped by the stop condition
        if (action.payload !== 'No more items') {
          state.error = action.payload;
        }
      })
      .addCase(fetchIssueById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchIssueById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentIssue = action.payload;
        state.error = null;
      })
      .addCase(fetchIssueById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Timeline cases
      .addCase(fetchIssueTimeline.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchIssueTimeline.fulfilled, (state, action) => {
        state.loading = false;
        state.timeline = action.payload;
      })
      .addCase(fetchIssueTimeline.rejected, (state) => {
        state.loading = false;
      })
  },
});

export const { setFilters, clearFilters, setCurrentIssue, clearCurrentIssue } = issuesSlice.actions;

// Selectors
export const selectAllIssues = (state) => state.issues.issues;
export const selectCurrentIssue = (state) => state.issues.currentIssue;
export const selectIssuesLoading = (state) => state.issues.loading;
export const selectIssuesLoadingMore = (state) => state.issues.loadingMore; // 📍 NEW Selector
export const selectHasMoreIssues = (state) => state.issues.hasMore; // 📍 NEW Selector
export const selectIssuesError = (state) => state.issues.error;
export const selectFilters = (state) => state.issues.filters;
export const selectIssueById = (state, issueId) => 
  state.issues.issues.find(issue => issue.id === issueId) || state.issues.currentIssue;

// Filtered selectors
export const selectFilteredIssues = (state) => {
  const { issues, filters } = state.issues;
  let filtered = [...issues];

  // Search filter
  if (filters.search) {
    const searchLower = filters.search.toLowerCase();
    filtered = filtered.filter(issue =>
      issue.title?.toLowerCase().includes(searchLower) ||
      issue.description?.toLowerCase().includes(searchLower) ||
      issue.id?.toString().includes(searchLower) ||
      issue.site?.name?.toLowerCase().includes(searchLower)
    );
  }

  // Status filter
  if (filters.status) {
    filtered = filtered.filter(issue => issue.status === filters.status);
  }

  // Priority filter
  if (filters.priority) {
    filtered = filtered.filter(issue => issue.priority === filters.priority);
  }

  return filtered;
};

// Status-based selectors
export const selectNotFixedIssues = (state) => {
  const notFixedStatuses = ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'REOPENED', 'ESCALATED'];
  return state.issues.issues.filter(issue => notFixedStatuses.includes(issue.status));
};

export const selectFixedIssues = (state) => {
  return state.issues.issues.filter(issue => issue.status === 'COMPLETED');
};

export const selectAwaitingReviewIssues = (state) => {
  return state.issues.issues.filter(issue => issue.status === 'RESOLVED_PENDING_REVIEW');
};

export const selectEscalatedIssues = (state) => {
  return state.issues.issues.filter(issue => issue.status === 'ESCALATED');
};
export const selectIssueTimeline = (state) => state.issues.timeline; //new selector for issue timeline

export default issuesSlice.reducer;
```

## C:\Users\head user\Desktop\Hamthan\v3\AI-Operation-Kaizen\FullStack\frontend\src\store\slices\notificationsSlice.js

```javascript
import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  notifications: [],
  unreadCount: 0,
};

const notificationsSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    addNotification: (state, action) => {
      state.notifications.unshift(action.payload);
      state.unreadCount += 1;
    },
    markAsRead: (state, action) => {
      const notification = state.notifications.find(n => n.id === action.payload);
      if (notification && !notification.read) {
        notification.read = true;
        state.unreadCount = Math.max(0, state.unreadCount - 1);
      }
    },
    markAllAsRead: (state) => {
      state.notifications.forEach(n => { n.read = true; });
      state.unreadCount = 0;
    },
    clearNotifications: (state) => {
      state.notifications = [];
      state.unreadCount = 0;
    },
    setNotifications: (state, action) => {
      state.notifications = action.payload;
      state.unreadCount = action.payload.filter(n => !n.read).length;
    },
  },
});

export const { addNotification, markAsRead, markAllAsRead, clearNotifications, setNotifications } = notificationsSlice.actions;

// Selectors
export const selectNotifications = (state) => state.notifications.notifications;
export const selectUnreadCount = (state) => state.notifications.unreadCount;

export default notificationsSlice.reducer;
```

## C:\Users\head user\Desktop\Hamthan\v3\AI-Operation-Kaizen\FullStack\frontend\src\store\slices\offlineSlice.js

```javascript
import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  isOnline: true,
  lastChecked: null,
  pendingActions: [],
  lastSyncTime: null,
  location: null, // NEW: Added to store location
};

const offlineSlice = createSlice({
  name: 'offline',
  initialState,
  reducers: {
    setOnlineStatus: (state, action) => {
      state.isOnline = action.payload;
      state.lastChecked = new Date().toISOString();
    },
    addPendingAction: (state, action) => {
      state.pendingActions.push({
        ...action.payload,
        id: Date.now(),
        timestamp: new Date().toISOString(),
        retryCount: 0,
      });
    },
    removePendingAction: (state, action) => {
      state.pendingActions = state.pendingActions.filter(
        a => a.id !== action.payload
      );
    },
    incrementRetryCount: (state, action) => {
      const pendingAction = state.pendingActions.find(
        a => a.id === action.payload
      );
      if (pendingAction) {
        pendingAction.retryCount += 1;
      }
    },
    clearSyncedActions: (state) => {
      state.pendingActions = [];
      state.lastSyncTime = new Date().toISOString();
    },
    // NEW: Reducer to store the location
    setLocation: (state, action) => {
      state.location = action.payload;
    },
  },
});

export const {
  setOnlineStatus,
  addPendingAction,
  removePendingAction,
  incrementRetryCount,
  clearSyncedActions,
  setLocation, // Exported new action
} = offlineSlice.actions;

// Selectors
export const selectIsOnline = (state) => state.offline.isOnline;
export const selectPendingActions = (state) => state.offline.pendingActions;
export const selectLastSyncTime = (state) => state.offline.lastSyncTime;
export const selectLocation = (state) => state.offline.location; // Exported new selector

export default offlineSlice.reducer;
```

## C:\Users\head user\Desktop\Hamthan\v3\AI-Operation-Kaizen\FullStack\frontend\src\store\slices\performanceSlice.js

```javascript
import { createSlice, createAsyncThunk, createSelector } from '@reduxjs/toolkit';
// import { users } from '../../mocks/users';
// import { solverSkills } from '../../mocks/solverSkills';
// import { calculateSolverScore } from '../../utils/scoreEngine';
// import { supervisorSites } from "../../mocks/supervisorSites";
import { fetchSolversPerformanceAPI } from '../../services/api';

function getVisibleSolvers(user) {
  // Fix role typo
  const allSolvers = users.filter(u => u.role === 'problem_solver'); 
  if (!user) return [];
  if (user.role === 'manager') return allSolvers;

  if (user.role === 'supervisor') {
    const siteIds = supervisorSites
      .filter(ss => ss.supervisor_id === user.id)
      .map(ss => ss.site_id);

    if (siteIds.length === 0) return [];

    const solverIds = [
      ...new Set(
        solverSkills
          .filter(s => siteIds.includes(s.site_id)) // Fix site_id typo
          .map(s => s.solver_id)
      ),
    ];
    return allSolvers.filter(s => solverIds.includes(s.id));
  }

  // Fix role typo
  if (user.role === 'problem_solver') { 
    return allSolvers.filter(s => s.id === user.id);
  }

  return allSolvers;
}

export const fetchSolversPerformance = createAsyncThunk(
  'performance/fetchSolvers',
  async (_, { rejectWithValue }) => {
    try {
      const res = await fetchSolversPerformanceAPI();
      return res.solvers;
    } catch (e) {
      return rejectWithValue(e.message);
    }
  }
);

const performanceSlice = createSlice({
  name: 'performance',
  initialState: { solvers: [], loading: false, error: null },
  reducers: {},
  extraReducers: builder => {
    builder
      .addCase(fetchSolversPerformance.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSolversPerformance.fulfilled, (state, action) => {
        state.loading = false;
        state.solvers = action.payload;
      })
      .addCase(fetchSolversPerformance.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to load performance';
      });
  },
});

export default performanceSlice.reducer;

export const selectPerformanceState = state => state.performance;
export const selectAllSolvers = createSelector(selectPerformanceState, s => s.solvers);
export const selectPerformanceLoading = createSelector(selectPerformanceState, s => s.loading);
export const selectSolverById = (state, id) =>
  state.performance.solvers.find(s => s.id === id) || null;
```

## C:\Users\head user\Desktop\Hamthan\v3\AI-Operation-Kaizen\FullStack\frontend\src\store\slices\sitesSlice.js

```javascript
import { createSlice, createAsyncThunk, createSelector } from '@reduxjs/toolkit';
import { fetchSitesAnalytics } from '../../services/api';

export const fetchSitesWithAnalytics = createAsyncThunk(
  'sites/fetchWithAnalytics',
  async (_, { rejectWithValue }) => {
    try {
      const res = await fetchSitesAnalytics();

      if (!res.success) {
        return rejectWithValue(res.error);
      }

      // Return the array of sites directly from the backend
      return res.sites;
    } catch (e) {
      return rejectWithValue(e.message);
    }
  }
);

const sitesSlice = createSlice({
  name: 'sites',
  initialState: { items: [], loading: false, error: null },
  reducers: {},
  extraReducers: builder => {
    builder
      .addCase(fetchSitesWithAnalytics.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSitesWithAnalytics.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload || [];
      })
      .addCase(fetchSitesWithAnalytics.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to load sites';
      });
  },
});

export default sitesSlice.reducer;
export const selectSitesState = state => state.sites;
export const selectAllSites = createSelector(selectSitesState, s => s.items);
export const selectSitesLoading = createSelector(selectSitesState, s => s.loading);
export const selectSiteById = (state, id) => state.sites.items.find(s => s.id === id) || null;
```

## C:\Users\head user\Desktop\Hamthan\v3\AI-Operation-Kaizen\FullStack\frontend\src\store\slices\themeSlice.js

```javascript
import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  mode: 'light',
};

const themeSlice = createSlice({
  name: 'theme',
  initialState,
  reducers: {
    toggleTheme: (state) => {
      state.mode = state.mode === 'light' ? 'dark' : 'light';
    },
    setTheme: (state, action) => {
      state.mode = action.payload;
    },
  },
});

export const { toggleTheme, setTheme } = themeSlice.actions;

// Selectors
export const selectTheme = (state) => state.theme.mode;
export const selectIsDarkMode = (state) => state.theme.mode === 'dark';

export default themeSlice.reducer;
```

## C:\Users\head user\Desktop\Hamthan\v3\AI-Operation-Kaizen\FullStack\frontend\src\store\index.js

```javascript
import { configureStore, combineReducers } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import themeReducer from './slices/themeSlice';
import issuesReducer from './slices/issuesSlice';
import complaintsReducer from './slices/complaintsSlice';
import chatReducer from './slices/chatSlice';
import dashboardReducer from './slices/dashboardSlice';
import notificationsReducer from './slices/notificationsSlice';
import offlineReducer from './slices/offlineSlice';
import sitesReducer from "./slices/sitesSlice"
import performanceReducer from "./slices/performanceSlice"

// 1. Combine all your reducers into one app-level reducer
const appReducer = combineReducers({
  auth: authReducer,
  theme: themeReducer,
  issues: issuesReducer,
  complaints: complaintsReducer,
  chat: chatReducer,
  dashboard: dashboardReducer,
  notifications: notificationsReducer,
  offline: offlineReducer,
  sites: sitesReducer,
  performance: performanceReducer,
});

// 2. Wrap it in a root reducer to intercept actions
const rootReducer = (state, action) => {
  // Listen specifically for the fulfilled logout thunk
  if (action.type === 'auth/logout/fulfilled') {
    // Optional but good UX: Save the user's theme choice before nuking the state
    const { theme } = state;
    
    // Setting state to an object containing only the theme forces EVERY 
    // other slice (chat, dashboard, issues, etc.) back to its pure initialState.
    state = { theme }; 
  }
  
  return appReducer(state, action);
};

// 3. Feed the root wrapper into the store
export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

export default store;
```

## C:\Users\head user\Desktop\Hamthan\v3\AI-Operation-Kaizen\FullStack\frontend\src\theme\colors.js

```javascript
export const lightTheme = {
  background: '#ffffff',
  card: '#ffffff',
  surface: '#f9fafb',
  text: '#111827',
  textSecondary: '#6b7280',
  border: '#e5e7eb',
  primary: '#2563eb',
  primaryLight: '#dbeafe',
  success: '#16a34a',
  successLight: '#dcfce7',
  warning: '#eab308',
  warningLight: '#fef3c7',
  danger: '#ef4444',
  dangerLight: '#fee2e2',
  statusOpen: '#3b82f6',
  statusAssigned: '#8b5cf6',
  statusInProgress: '#eab308',
  statusCompleted: '#16a34a',
  statusEscalated: '#991b1b',
  statusReopened: '#f97316',
  priorityHigh: '#ef4444',
  priorityMedium: '#eab308',
  priorityLow: '#22c55e',
  inputBackground: '#f3f4f6',
  tabBar: '#ffffff',
  headerBackground: '#ffffff',
};

export const darkTheme = {
  background: '#0f1419',
  card: '#1f2937',
  surface: '#111827',
  text: '#f9fafb',
  textSecondary: '#9ca3af',
  border: '#374151',
  primary: '#3b82f6',
  primaryLight: '#1e3a5f',
  success: '#22c55e',
  successLight: '#14532d',
  warning: '#facc15',
  warningLight: '#422006',
  danger: '#f87171',
  dangerLight: '#7f1d1d',
  statusOpen: '#60a5fa',
  statusAssigned: '#a78bfa',
  statusInProgress: '#fbbf24',
  statusCompleted: '#4ade80',
  statusEscalated: '#fca5a5',
  statusReopened: '#fb923c',
  priorityHigh: '#f87171',
  priorityMedium: '#fbbf24',
  priorityLow: '#4ade80',
  inputBackground: '#1f2937',
  tabBar: '#1f2937',
  headerBackground: '#1f2937',
};
```

## C:\Users\head user\Desktop\Hamthan\v3\AI-Operation-Kaizen\FullStack\frontend\src\theme\ThemeContext.js

```javascript
import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { lightTheme, darkTheme } from './colors';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem('theme');
      if (savedTheme === 'dark') {
        setIsDark(true);
      }
    } catch (error) {
      console.error('Error loading theme:', error);
    }
  };

  const toggleTheme = async () => {
    const newTheme = !isDark;
    setIsDark(newTheme);
    try {
      await AsyncStorage.setItem('theme', newTheme ? 'dark' : 'light');
    } catch (error) {
      console.error('Error saving theme:', error);
    }
  };

  const theme = isDark ? darkTheme : lightTheme;

  return (
    <ThemeContext.Provider value={{ theme, isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
```

## C:\Users\head user\Desktop\Hamthan\v3\AI-Operation-Kaizen\FullStack\frontend\src\theme\typography.js

```javascript
export const typography = {
  h1: {
    fontSize: 32,
    fontWeight: '700',
    lineHeight: 40,
  },
  h2: {
    fontSize: 24,
    fontWeight: '600',
    lineHeight: 32,
  },
  h3: {
    fontSize: 20,
    fontWeight: '600',
    lineHeight: 28,
  },
  h4: {
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 24,
  },
  body: {
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 24,
  },
  bodySmall: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
  },
  caption: {
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 16,
  },
  button: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 24,
  },
  buttonSmall: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  },
};
```

## C:\Users\head user\Desktop\Hamthan\v3\AI-Operation-Kaizen\FullStack\frontend\src\utils\animations.js

```javascript
/**
 * Animation Utilities for React Native
 * 
 * Features:
 * - Button press animations
 * - Success/Error animations
 * - Fade in/out
 * - Scale animations
 * - Slide animations
 */

import { Animated, Easing } from 'react-native';
import * as Haptics from 'expo-haptics';

/**
 * Create a pressable animation (scale down on press)
 * 
 * @returns {Object} - Animation value and handlers
 */
export const usePressAnimation = () => {
  const scaleValue = new Animated.Value(1);

  const onPressIn = () => {
    Animated.spring(scaleValue, {
      toValue: 0.95,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  };

  const onPressOut = () => {
    Animated.spring(scaleValue, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  };

  return {
    scaleValue,
    onPressIn,
    onPressOut,
    style: { transform: [{ scale: scaleValue }] },
  };
};

/**
 * Create a shake animation (for errors)
 * 
 * @param {Animated.Value} value - Animation value
 * @returns {Function} - Trigger function
 */
export const createShakeAnimation = (value) => {
  return () => {
    Animated.sequence([
      Animated.timing(value, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(value, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(value, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(value, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(value, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
    
    // Haptic feedback
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  };
};

/**
 * Create a bounce animation (for success)
 * 
 * @param {Animated.Value} value - Animation value
 * @returns {Function} - Trigger function
 */
export const createBounceAnimation = (value) => {
  return () => {
    Animated.sequence([
      Animated.timing(value, { toValue: 1.2, duration: 150, useNativeDriver: true }),
      Animated.spring(value, { toValue: 1, useNativeDriver: true, friction: 3 }),
    ]).start();
    
    // Haptic feedback
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };
};

/**
 * Create a fade animation
 * 
 * @param {Animated.Value} value - Animation value (0 to 1)
 * @param {number} duration - Animation duration in ms
 * @returns {Object} - fadeIn and fadeOut functions
 */
export const createFadeAnimation = (value, duration = 300) => {
  return {
    fadeIn: (callback) => {
      Animated.timing(value, {
        toValue: 1,
        duration,
        useNativeDriver: true,
        easing: Easing.ease,
      }).start(callback);
    },
    fadeOut: (callback) => {
      Animated.timing(value, {
        toValue: 0,
        duration,
        useNativeDriver: true,
        easing: Easing.ease,
      }).start(callback);
    },
  };
};

/**
 * Create a slide animation
 * 
 * @param {Animated.Value} value - Animation value
 * @param {Object} options - Animation options
 * @returns {Object} - slideIn and slideOut functions
 */
export const createSlideAnimation = (value, options = {}) => {
  const { from = 100, to = 0, duration = 300 } = options;
  
  return {
    slideIn: (callback) => {
      value.setValue(from);
      Animated.timing(value, {
        toValue: to,
        duration,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }).start(callback);
    },
    slideOut: (callback) => {
      Animated.timing(value, {
        toValue: from,
        duration,
        useNativeDriver: true,
        easing: Easing.in(Easing.cubic),
      }).start(callback);
    },
  };
};

/**
 * Create a pulse animation (for attention)
 * 
 * @param {Animated.Value} value - Animation value
 * @returns {Function} - Start and stop functions
 */
export const createPulseAnimation = (value) => {
  let animation = null;
  
  return {
    start: () => {
      animation = Animated.loop(
        Animated.sequence([
          Animated.timing(value, { toValue: 1.1, duration: 500, useNativeDriver: true }),
          Animated.timing(value, { toValue: 1, duration: 500, useNativeDriver: true }),
        ])
      );
      animation.start();
    },
    stop: () => {
      if (animation) {
        animation.stop();
        value.setValue(1);
      }
    },
  };
};

/**
 * Animated button component wrapper
 */
export const AnimatedPressable = Animated.createAnimatedComponent(
  require('react-native').TouchableOpacity
);

/**
 * Spring config presets
 */
export const SPRING_CONFIG = {
  gentle: { tension: 100, friction: 10 },
  bouncy: { tension: 150, friction: 5 },
  stiff: { tension: 200, friction: 20 },
  slow: { tension: 50, friction: 10 },
};

/**
 * Easing presets
 */
export const EASING = {
  smooth: Easing.bezier(0.25, 0.1, 0.25, 1),
  snappy: Easing.bezier(0.4, 0, 0.2, 1),
  bounce: Easing.bounce,
  elastic: Easing.elastic(1),
};

export default {
  usePressAnimation,
  createShakeAnimation,
  createBounceAnimation,
  createFadeAnimation,
  createSlideAnimation,
  createPulseAnimation,
  AnimatedPressable,
  SPRING_CONFIG,
  EASING,
};
```

## C:\Users\head user\Desktop\Hamthan\v3\AI-Operation-Kaizen\FullStack\frontend\src\utils\constants.js

```javascript
export const STATUS_COLORS = {
  OPEN: '#3b82f6',
  ASSIGNED: '#8b5cf6',
  IN_PROGRESS: '#eab308',
  RESOLVED_PENDING_REVIEW: '#f97316',
  COMPLETED: '#16a34a',
  REOPENED: '#f97316',
  ESCALATED: '#991b1b',
};

export const STATUS_LABELS = {
  OPEN: 'Open',
  ASSIGNED: 'Assigned',
  IN_PROGRESS: 'In Progress',
  RESOLVED_PENDING_REVIEW: 'Pending Review',
  COMPLETED: 'Completed',
  REOPENED: 'Reopened',
  ESCALATED: 'Escalated',
};

export const PRIORITY_COLORS = {
  high: '#ef4444',
  medium: '#eab308',
  low: '#22c55e',
};

export const PRIORITY_LABELS = {
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};

export const PRIORITY_LEVELS = ['low', 'medium', 'high'];

export const ROLE_TYPES = ['manager', 'supervisor', 'problem_solver'];

export const ROLE_LABELS = {
  manager: 'Manager',
  supervisor: 'Supervisor',
  problem_solver: 'Problem Solver',
};

export const ISSUE_TYPES = ['Plumbing', 'Electrical', 'HVAC', 'Maintenance', 'Safety', 'Cleaning'];

export const NOT_FIXED_STATUSES = ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'REOPENED'];
export const FIXED_STATUSES = ['COMPLETED'];

export const TRACK_STATUS = {
  AUTO_ASSIGNED: 'AUTO_ASSIGNED',
  MANUALLY_ASSIGNED: 'MANUALLY_ASSIGNED',
  REASSIGNED: 'REASSIGNED',
  ESCALATED: 'ESCALATED',
};
```

## C:\Users\head user\Desktop\Hamthan\v3\AI-Operation-Kaizen\FullStack\frontend\src\utils\formatters.js

```javascript
export const formatDate = (timestamp) => {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

export const formatTime = (timestamp) => {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
};

export const formatDateTime = (timestamp) => {
  if (!timestamp) return '';
  return `${formatDate(timestamp)} ${formatTime(timestamp)}`;
};

export const formatRelativeTime = (timestamp) => {
  if (!timestamp) return '';
  const now = new Date();
  const date = new Date(timestamp);
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(timestamp);
};

export const formatDuration = (seconds) => {
  if (!seconds) return '0m';
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  }
  return `${mins}m`;
};

export const formatDurationFromDates = (start, end) => {
  if (!start || !end) return '';
  const diffMs = new Date(end) - new Date(start);
  const seconds = Math.floor(diffMs / 1000);
  return formatDuration(seconds);
};
```

## C:\Users\head user\Desktop\Hamthan\v3\AI-Operation-Kaizen\FullStack\frontend\src\utils\haptics.js

```javascript
/**
 * Haptic Feedback Utility
 * 
 * Provides haptic feedback for touch interactions
 * Falls back gracefully on unsupported devices
 */

import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

// Check if haptics are available
const isHapticsAvailable = Platform.OS === 'ios' || Platform.OS === 'android';

/**
 * Light haptic feedback - for subtle interactions
 * Use for: toggles, selections, minor UI changes
 */
export const lightImpact = async () => {
  if (!isHapticsAvailable) return;
  try {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } catch (error) {
    console.log('Haptics not available');
  }
};

/**
 * Medium haptic feedback - for standard interactions
 * Use for: button presses, card selections, navigation
 */
export const mediumImpact = async () => {
  if (!isHapticsAvailable) return;
  try {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  } catch (error) {
    console.log('Haptics not available');
  }
};

/**
 * Heavy haptic feedback - for significant interactions
 * Use for: important actions, confirmations, major state changes
 */
export const heavyImpact = async () => {
  if (!isHapticsAvailable) return;
  try {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  } catch (error) {
    console.log('Haptics not available');
  }
};

/**
 * Selection feedback - for selection changes
 * Use for: picker changes, slider adjustments, segment controls
 */
export const selection = async () => {
  if (!isHapticsAvailable) return;
  try {
    await Haptics.selectionAsync();
  } catch (error) {
    console.log('Haptics not available');
  }
};

/**
 * Success notification feedback
 * Use for: successful operations, completed actions
 */
export const success = async () => {
  if (!isHapticsAvailable) return;
  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } catch (error) {
    console.log('Haptics not available');
  }
};

/**
 * Warning notification feedback
 * Use for: warnings, cautions, attention needed
 */
export const warning = async () => {
  if (!isHapticsAvailable) return;
  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  } catch (error) {
    console.log('Haptics not available');
  }
};

/**
 * Error notification feedback
 * Use for: errors, failed operations, invalid inputs
 */
export const error = async () => {
  if (!isHapticsAvailable) return;
  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  } catch (error) {
    console.log('Haptics not available');
  }
};

/**
 * Custom haptic pattern
 * 
 * @param {Array} pattern - Array of haptic types and delays
 * Example: [{ type: 'light' }, { delay: 100 }, { type: 'medium' }]
 */
export const customPattern = async (pattern) => {
  if (!isHapticsAvailable) return;
  
  for (const item of pattern) {
    if (item.delay) {
      await new Promise(resolve => setTimeout(resolve, item.delay));
    } else if (item.type) {
      switch (item.type) {
        case 'light':
          await lightImpact();
          break;
        case 'medium':
          await mediumImpact();
          break;
        case 'heavy':
          await heavyImpact();
          break;
        case 'selection':
          await selection();
          break;
        case 'success':
          await success();
          break;
        case 'warning':
          await warning();
          break;
        case 'error':
          await error();
          break;
      }
    }
  }
};

/**
 * Preset haptic patterns
 */
export const patterns = {
  // Double tap feel
  doubleTap: async () => {
    await customPattern([
      { type: 'light' },
      { delay: 50 },
      { type: 'light' },
    ]);
  },
  
  // Button press with feedback
  buttonPress: async () => {
    await mediumImpact();
  },
  
  // Successful action
  actionSuccess: async () => {
    await customPattern([
      { type: 'medium' },
      { delay: 100 },
      { type: 'success' },
    ]);
  },
  
  // Failed action
  actionError: async () => {
    await customPattern([
      { type: 'error' },
      { delay: 100 },
      { type: 'light' },
      { delay: 50 },
      { type: 'light' },
    ]);
  },
  
  // Pull to refresh
  pullRefresh: async () => {
    await mediumImpact();
  },
  
  // Toggle switch
  toggle: async () => {
    await lightImpact();
  },
  
  // Slider/picker change
  sliderChange: async () => {
    await selection();
  },
};

export default {
  lightImpact,
  mediumImpact,
  heavyImpact,
  selection,
  success,
  warning,
  error,
  customPattern,
  patterns,
};
```

## C:\Users\head user\Desktop\Hamthan\v3\AI-Operation-Kaizen\FullStack\frontend\src\utils\location.js

```javascript
import * as Location from 'expo-location';
import { Alert, Linking } from 'react-native';

export const requestLocationPermission = async () => {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert(
      'Permission Required',
      'Location permission is needed to verify your presence at the site.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Open Settings', onPress: () => Linking.openSettings() },
      ]
    );
    return false;
  }
  return true;
};

export const getCurrentLocation = async () => {
  try {
    const hasPermission = await requestLocationPermission();
    if (!hasPermission) return null;

    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
      timeInterval: 30000,
    });

    return {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      accuracy: location.coords.accuracy,
    };
  } catch (error) {
    console.error('Error getting location:', error);
    Alert.alert(
      'Location Error',
      'Could not get your location. Please ensure GPS is enabled.',
      [{ text: 'OK' }]
    );
    return null;
  }
};

// Haversine formula to calculate distance between two coordinates
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
};

export const verifyLocationAtSite = (userLat, userLon, siteLat, siteLon) => {
  const distance = calculateDistance(userLat, userLon, siteLat, siteLon);
  
  if (distance < 500) {
    return { verified: true, distance, status: 'verified' };
  } else if (distance < 1000) {
    return { verified: true, distance, status: 'warning' };
  } else {
    return { verified: false, distance, status: 'alert' };
  }
};
```

## C:\Users\head user\Desktop\Hamthan\v3\AI-Operation-Kaizen\FullStack\frontend\src\utils\locationCapture.js

```javascript
/**
 * Location Capture Utility with GPS Verification
 * 
 * Features:
 * - Get current location
 * - Distance calculation
 * - Site proximity verification
 * - Address geocoding (reverse)
 */

import * as Location from 'expo-location';
import { Alert, Linking, Platform } from 'react-native';

// Location accuracy settings
const LOCATION_OPTIONS = {
  accuracy: Location.Accuracy.High,
  timeInterval: 5000,
  distanceInterval: 10,
};

// Max distance for site verification (in meters)
const MAX_DISTANCE_FROM_SITE = 500; // 500 meters

/**
 * Request location permissions
 * 
 * @returns {boolean} - Whether permission was granted
 */
export const requestLocationPermission = async () => {
  try {
    const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
    
    if (foregroundStatus !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Location access is needed to verify your position at the site.',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Open Settings', 
            onPress: () => Linking.openSettings() 
          },
        ]
      );
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Location permission error:', error);
    return false;
  }
};

/**
 * Get current location
 * 
 * @param {Object} options - Location options
 * @returns {Object|null} - Location object or null
 */
export const getCurrentLocation = async (options = {}) => {
  const hasPermission = await requestLocationPermission();
  if (!hasPermission) return null;
  
  try {
    const location = await Location.getCurrentPositionAsync({
      ...LOCATION_OPTIONS,
      ...options,
    });
    
    return {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      accuracy: location.coords.accuracy,
      altitude: location.coords.altitude,
      timestamp: location.timestamp,
    };
  } catch (error) {
    console.error('Get location error:', error);
    
    // Check if location services are enabled
    const enabled = await Location.hasServicesEnabledAsync();
    if (!enabled) {
      Alert.alert(
        'Location Services Disabled',
        'Please enable location services to continue.',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Open Settings', 
            onPress: () => {
              if (Platform.OS === 'ios') {
                Linking.openURL('app-settings:');
              } else {
                Linking.openSettings();
              }
            }
          },
        ]
      );
    } else {
      Alert.alert('Error', 'Failed to get your location. Please try again.');
    }
    
    return null;
  }
};

/**
 * Calculate distance between two coordinates (Haversine formula)
 * 
 * @param {number} lat1 - Latitude of point 1
 * @param {number} lon1 - Longitude of point 1
 * @param {number} lat2 - Latitude of point 2
 * @param {number} lon2 - Longitude of point 2
 * @returns {number} - Distance in meters
 */
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
};

/**
 * Format distance to human readable
 * 
 * @param {number} meters - Distance in meters
 * @returns {string} - Formatted distance
 */
export const formatDistance = (meters) => {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
};

/**
 * Verify user is at site location
 * 
 * @param {Object} userLocation - User's current location
 * @param {Object} siteLocation - Site's location
 * @param {number} maxDistance - Maximum allowed distance in meters
 * @returns {Object} - Verification result
 */
export const verifySiteProximity = (userLocation, siteLocation, maxDistance = MAX_DISTANCE_FROM_SITE) => {
  if (!userLocation || !siteLocation) {
    return {
      isVerified: false,
      distance: null,
      message: 'Location data not available',
    };
  }
  
  const distance = calculateDistance(
    userLocation.latitude,
    userLocation.longitude,
    siteLocation.latitude,
    siteLocation.longitude
  );
  
  const isVerified = distance <= maxDistance;
  
  return {
    isVerified,
    distance,
    distanceFormatted: formatDistance(distance),
    message: isVerified 
      ? `You are ${formatDistance(distance)} from the site.`
      : `You are ${formatDistance(distance)} away. Please move closer to the site (within ${formatDistance(maxDistance)}).`,
  };
};

/**
 * Get address from coordinates (reverse geocoding)
 * 
 * @param {number} latitude - Latitude
 * @param {number} longitude - Longitude
 * @returns {Object|null} - Address object or null
 */
export const reverseGeocode = async (latitude, longitude) => {
  try {
    const addresses = await Location.reverseGeocodeAsync({
      latitude,
      longitude,
    });
    
    if (addresses.length > 0) {
      const addr = addresses[0];
      return {
        street: addr.street,
        city: addr.city,
        region: addr.region,
        country: addr.country,
        postalCode: addr.postalCode,
        formattedAddress: [
          addr.street,
          addr.city,
          addr.region,
          addr.postalCode,
        ].filter(Boolean).join(', '),
      };
    }
    
    return null;
  } catch (error) {
    console.error('Reverse geocode error:', error);
    return null;
  }
};

/**
 * Watch location updates
 * 
 * @param {Function} callback - Callback for location updates
 * @returns {Function} - Cleanup function
 */
export const watchLocation = async (callback) => {
  const hasPermission = await requestLocationPermission();
  if (!hasPermission) return () => {};
  
  try {
    const subscription = await Location.watchPositionAsync(
      LOCATION_OPTIONS,
      (location) => {
        callback({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          accuracy: location.coords.accuracy,
          timestamp: location.timestamp,
        });
      }
    );
    
    return () => subscription.remove();
  } catch (error) {
    console.error('Watch location error:', error);
    return () => {};
  }
};

/**
 * Get location with timeout
 * 
 * @param {number} timeout - Timeout in milliseconds
 * @returns {Object|null} - Location or null if timed out
 */
export const getLocationWithTimeout = async (timeout = 15000) => {
  return Promise.race([
    getCurrentLocation(),
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Location request timed out')), timeout)
    ),
  ]).catch((error) => {
    console.error('Location timeout:', error);
    Alert.alert('Timeout', 'Getting location is taking too long. Please try again.');
    return null;
  });
};

export default {
  requestLocationPermission,
  getCurrentLocation,
  calculateDistance,
  formatDistance,
  verifySiteProximity,
  reverseGeocode,
  watchLocation,
  getLocationWithTimeout,
  MAX_DISTANCE_FROM_SITE,
};
```

## C:\Users\head user\Desktop\Hamthan\v3\AI-Operation-Kaizen\FullStack\frontend\src\utils\network.js

```javascript
// Network utilities with retry logic

const DEFAULT_RETRY_CONFIG = {
  maxAttempts: 4,
  baseDelay: 2000,
  maxDelay: 16000,
};

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export const isRetryableError = (error) => {
  // Retry on network errors and 5xx server errors
  if (!error.response) return true; // Network error
  const status = error.response?.status;
  if (status >= 500) return true;
  return false;
};

export const retryWithBackoff = async (fn, options = {}) => {
  const config = { ...DEFAULT_RETRY_CONFIG, ...options };
  let lastError;

  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      // Don't retry 401, 404, 400 errors
      if (error.response) {
        const status = error.response.status;
        if (status === 401 || status === 404 || status === 400) {
          throw error;
        }
      }

      if (attempt < config.maxAttempts && isRetryableError(error)) {
        const waitTime = Math.min(
          config.baseDelay * Math.pow(2, attempt - 1),
          config.maxDelay
        );
        console.log(`Retry attempt ${attempt} after ${waitTime}ms`);
        await delay(waitTime);
      }
    }
  }

  throw lastError;
};

export const checkNetworkConnectivity = async () => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    await fetch('https://www.google.com/generate_204', {
      method: 'HEAD',
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    return true;
  } catch {
    return false;
  }
};
```

## C:\Users\head user\Desktop\Hamthan\v3\AI-Operation-Kaizen\FullStack\frontend\src\utils\networkRetry.js

```javascript
/**
 * Network Retry Utility with Exponential Backoff
 * 
 * Features:
 * - Configurable max retries
 * - Exponential backoff with jitter
 * - Retry only on network errors or 5xx responses
 * - Progress callback for UI updates
 */

const DEFAULT_CONFIG = {
  maxRetries: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 30000, // 30 seconds
  retryOn: [408, 500, 502, 503, 504], // HTTP status codes to retry
};

/**
 * Calculate delay with exponential backoff and jitter
 */
const calculateDelay = (attempt, baseDelay, maxDelay) => {
  // Exponential backoff: baseDelay * 2^attempt
  const exponentialDelay = baseDelay * Math.pow(2, attempt);
  // Add jitter (random factor between 0.5 and 1.5)
  const jitter = 0.5 + Math.random();
  const delay = Math.min(exponentialDelay * jitter, maxDelay);
  return Math.round(delay);
};

/**
 * Check if error is retryable
 */
const isRetryableError = (error, retryOn) => {
  // Network errors (no response)
  if (!error.response) {
    return error.message === 'Network Error' || 
           error.code === 'ECONNABORTED' ||
           error.code === 'ETIMEDOUT' ||
           error.message.includes('timeout');
  }
  
  // HTTP status codes
  if (error.response?.status) {
    return retryOn.includes(error.response.status);
  }
  
  return false;
};

/**
 * Execute a function with retry logic
 * 
 * @param {Function} fn - Async function to execute
 * @param {Object} config - Configuration options
 * @param {Function} onRetry - Callback called on each retry (attempt, delay, error)
 * @returns {Promise} - Result of the function
 */
export const withRetry = async (fn, config = {}, onRetry = null) => {
  const { maxRetries, baseDelay, maxDelay, retryOn } = { ...DEFAULT_CONFIG, ...config };
  let lastError;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      // Check if we should retry
      if (attempt < maxRetries && isRetryableError(error, retryOn)) {
        const delay = calculateDelay(attempt, baseDelay, maxDelay);
        
        // Call retry callback if provided
        if (onRetry) {
          onRetry(attempt + 1, delay, error);
        }
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        throw error;
      }
    }
  }
  
  throw lastError;
};

/**
 * Create a retryable API client
 * 
 * @param {Function} apiCall - The API call function
 * @param {Object} config - Retry configuration
 * @returns {Function} - Wrapped function with retry logic
 */
export const createRetryableApi = (apiCall, config = {}) => {
  return async (...args) => {
    return withRetry(() => apiCall(...args), config);
  };
};

/**
 * Retry queue for offline operations
 */
class RetryQueue {
  constructor() {
    this.queue = [];
    this.isProcessing = false;
  }
  
  add(operation) {
    this.queue.push({
      id: Date.now().toString(),
      operation,
      retries: 0,
      createdAt: new Date().toISOString(),
    });
  }
  
  async processQueue(isOnline) {
    if (!isOnline || this.isProcessing || this.queue.length === 0) {
      return;
    }
    
    this.isProcessing = true;
    
    while (this.queue.length > 0 && isOnline) {
      const item = this.queue[0];
      
      try {
        await withRetry(item.operation, { maxRetries: 2 });
        this.queue.shift(); // Remove successful item
      } catch (error) {
        item.retries++;
        if (item.retries >= 3) {
          this.queue.shift(); // Remove failed item after max retries
          console.error('Operation failed after max retries:', error);
        } else {
          break; // Stop processing, will retry later
        }
      }
    }
    
    this.isProcessing = false;
  }
  
  getQueueSize() {
    return this.queue.length;
  }
  
  clearQueue() {
    this.queue = [];
  }
}

export const retryQueue = new RetryQueue();

export default {
  withRetry,
  createRetryableApi,
  retryQueue,
};
```

## C:\Users\head user\Desktop\Hamthan\v3\AI-Operation-Kaizen\FullStack\frontend\src\utils\notificationNavigation.js

```javascript
/**
 * Notification Navigation Service
 * * Handles navigation when user taps on notifications
 * Supports deep linking to specific screens
 */

import { router } from 'expo-router';

// Notification types and their target routes — ALL inside dashboard
const NOTIFICATION_ROUTES = {
  // Issue-related notifications
  issue_created: (data) => ({
    route: '/(main)/(tabs)/dashboard/issue-detail',
    params: { id: data.issueId, highlighted: 'true', fromNotification: 'true' }, // ADDED FLAG
  }),
  issue_assigned: (data) => ({
    route: '/(main)/(tabs)/dashboard/issue-detail',
    params: { id: data.issueId, highlighted: 'true', fromNotification: 'true' }, // ADDED FLAG
  }),
  issue_status_changed: (data) => ({
    route: '/(main)/(tabs)/dashboard/issue-detail',
    params: { id: data.issueId, highlighted: 'true', fromNotification: 'true' }, // ADDED FLAG
  }),
  issue_escalated: (data) => ({
    route: '/(main)/(tabs)/dashboard/issue-detail',
    params: { id: data.issueId, highlighted: 'true', fromNotification: 'true' }, // ADDED FLAG
  }),
  issue_completed: (data) => ({
    route: '/(main)/(tabs)/dashboard/issue-detail',
    params: { id: data.issueId, fromNotification: 'true' }, // ADDED FLAG
  }),
  issue_reopened: (data) => ({
    route: '/(main)/(tabs)/dashboard/issue-detail',
    params: { id: data.issueId, fromNotification: 'true' }, // ADDED FLAG
  }),
  
  // Complaint-related notifications
  complaint_created: (data) => ({
    route: '/(main)/(tabs)/dashboard/complaint-detail',
    params: { id: data.complaintId, fromNotification: 'true' }, // ADDED FLAG
  }),
  complaint_resolved: (data) => ({
    route: '/(main)/(tabs)/dashboard/complaint-detail',
    params: { id: data.complaintId, fromNotification: 'true' }, // ADDED FLAG
  }),
  
  // Chat-related notifications (No flag needed, chat acts as its own root)
  chat_message: (data) => ({
    route: '/(main)/(tabs)/chat',
    params: { conversationId: data.conversationId },
  }),
  
  // Dashboard notifications
  overdue_issues: () => ({
    route: '/(main)/(tabs)/dashboard',
    params: { filter: 'overdue' },
  }),
  daily_summary: () => ({
    route: '/(main)/(tabs)/dashboard',
    params: {},
  }),
  
  // Default - go to dashboard
  default: () => ({
    route: '/(main)/(tabs)/dashboard',
    params: {},
  }),
};

/**
 * Navigate to the appropriate screen based on notification type
 */
export const navigateToNotification = (notification) => {
  try {
    const { type, data = {} } = notification;
    
    // Get route handler
    const getRoute = NOTIFICATION_ROUTES[type] || NOTIFICATION_ROUTES.default;
    const { route, params } = getRoute(data);
    
    // Navigate to the route
    router.navigate({
      pathname: route,
      params,
    });
    
    return true;
  } catch (error) {
    console.error('Navigation error:', error);
    // Fallback to dashboard using navigate
    router.navigate('/(main)/(tabs)/dashboard');
    return false;
  }
};

/**
 * Create a notification object with navigation data
 */
export const createNotification = (type, title, body, data = {}) => {
  return {
    id: Date.now().toString(),
    type,
    title,
    body,
    data,
    read: false,
    createdAt: new Date().toISOString(),
  };
};

/**
 * Get navigation preview text for a notification
 */
export const getNavigationPreview = (notification) => {
  const { type } = notification;
  
  const previews = {
    issue_created: 'Tap to view issue',
    issue_assigned: 'Tap to view assignment',
    issue_status_changed: 'Tap to see updates',
    issue_escalated: 'Tap to view escalation',
    issue_completed: 'Tap to view completed issue',
    issue_reopened: 'Tap to view reopened issue',
    complaint_created: 'Tap to view complaint',
    complaint_resolved: 'Tap to view resolution',
    chat_message: 'Tap to open chat',
    overdue_issues: 'Tap to view overdue issues',
    daily_summary: 'Tap to view dashboard',
  };
  
  return previews[type] || 'Tap to view';
};

/**
 * Parse deep link URL and extract navigation params
 */
export const parseDeepLink = (url) => {
  try {
    // Expected format: kairox ai opex://issue/123 or kairox ai opex://complaint/456
    const match = url.match(/kairox ai opex:\/\/(\w+)\/(\d+)/);
    
    if (match) {
      const [, type, id] = match;
      
      const routes = {
        issue: {
          route: '/(main)/(tabs)/dashboard/issue-detail',
          params: { id, highlighted: 'true', fromNotification: 'true' }, // ADDED FLAG
        },
        complaint: {
          route: '/(main)/(tabs)/dashboard/complaint-detail',
          params: { id, fromNotification: 'true' }, // ADDED FLAG
        },
        chat: {
          route: '/(main)/(tabs)/chat',
          params: { conversationId: id },
        },
      };
      
      return routes[type] || null;
    }
    
    return null;
  } catch (error) {
    console.error('Deep link parse error:', error);
    return null;
  }
};

export default {
  navigateToNotification,
  createNotification,
  getNavigationPreview,
  parseDeepLink,
  NOTIFICATION_ROUTES,
};
```

## C:\Users\head user\Desktop\Hamthan\v3\AI-Operation-Kaizen\FullStack\frontend\src\utils\overdue.js

```javascript
export const calculateOverdueDays = (deadline_at, status) => {
  if (!deadline_at) return null;
  if (status === 'COMPLETED') return null;
  
  const now = new Date();
  const deadline = new Date(deadline_at);
  const diffMs = now - deadline;
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffDays > 0) {
    return diffDays;
  }
  return null;
};

export const isOverdue = (deadline_at, status) => {
  if (!deadline_at) return false;
  if (status === 'COMPLETED') return false;
  
  const now = new Date();
  const deadline = new Date(deadline_at);
  return now > deadline;
};

export const formatOverdueText = (deadline_at, status) => {
  if (!deadline_at) return '';
  if (status === 'COMPLETED') return 'Completed';
  
  const now = new Date();
  const deadline = new Date(deadline_at);
  const diffMs = deadline - now;
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMs < 0) {
    const overdueDays = Math.abs(Math.floor(diffMs / 86400000));
    const overdueHours = Math.abs(Math.floor(diffMs / 3600000));
    if (overdueDays > 0) {
      return `Overdue ${overdueDays} day${overdueDays > 1 ? 's' : ''}`;
    }
    return `Overdue ${overdueHours} hour${overdueHours > 1 ? 's' : ''}`;
  }
  
  if (diffDays > 0) {
    return `Due in ${diffDays} day${diffDays > 1 ? 's' : ''}`;
  }
  if (diffHours > 0) {
    return `Due in ${diffHours} hour${diffHours > 1 ? 's' : ''}`;
  }
  return 'Due soon';
};

export const getDeadlineColor = (deadline_at, status) => {
  if (!deadline_at || status === 'COMPLETED') return '#6b7280';
  
  const now = new Date();
  const deadline = new Date(deadline_at);
  const diffMs = deadline - now;
  const diffHours = diffMs / 3600000;
  
  if (diffMs < 0) return '#ef4444'; // Red - overdue
  if (diffHours < 24) return '#f97316'; // Orange - urgent
  if (diffHours < 72) return '#eab308'; // Yellow - approaching
  return '#6b7280'; // Gray - normal
};
```

## C:\Users\head user\Desktop\Hamthan\v3\AI-Operation-Kaizen\FullStack\frontend\src\utils\pdfExport.js

```javascript
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Alert, Platform } from 'react-native';

/**
 * Exports a chart or data to a PDF
 * @param {string} chartUri - The base64 or URI of the captured chart image
 * @param {string} chartType - Title of the chart (e.g., "Weekly Analytics")
 */
export const exportChartToPDF = async (chartUri, chartType) => {
  try {
    // 1. Web Protection Check
    if (Platform.OS === 'web') {
      window.print(); // Triggers browser's native print-to-pdf dialog
      return;
    }

    // 2. Check if a chart image was provided
    if (!chartUri) {
      Alert.alert("Error", "No chart data found to export.");
      return;
    }

    // 3. Create the HTML Template
    const htmlContent = `
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
          <style>
            body { font-family: 'Helvetica Neue', Helvetica; padding: 40px; color: #1a1a1a; }
            .header { border-bottom: 2px solid #10a37f; padding-bottom: 20px; margin-bottom: 30px; }
            .title { fontSize: 28px; font-weight: bold; margin: 0; color: #1a1a1a; }
            .subtitle { color: #666; font-size: 14px; margin-top: 5px; }
            .chart-container { text-align: center; margin: 20px 0; }
            .chart-img { width: 100%; border-radius: 12px; border: 1px solid #eee; }
            .footer { margin-top: 50px; border-top: 1px solid #eee; padding-top: 20px; font-size: 10px; color: #999; text-align: center; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1 class="title">Kairox Ai Opex AI</h1>
            <p class="subtitle">${chartType} Report • Generated ${new Date().toLocaleDateString()}</p>
          </div>

          <div class="chart-container">
            <img src="${chartUri}" class="chart-img" />
          </div>

          <div class="footer">
            <p>© 2026 Kaizen Operations • Internal Maintenance Document • Confidential</p>
          </div>
        </body>
      </html>
    `;

    // 4. Generate the PDF file
    const { uri } = await Print.printToFileAsync({ html: htmlContent, base64: false });

    // 5. Check if sharing is available (protects against some Android simulators)
    const isSharingAvailable = await Sharing.isAvailableAsync();
    if (isSharingAvailable) {
      await Sharing.shareAsync(uri, { 
        mimeType: 'application/pdf', 
        dialogTitle: `Download ${chartType} Report`,
        UTI: 'com.adobe.pdf' 
      });
    } else {
      Alert.alert("Export Successful", "The PDF was generated but your device doesn't support sharing right now.");
    }

  } catch (error) {
    console.error("PDF Export Error:", error);
    Alert.alert("Export Failed", "Something went wrong while generating the PDF.");
  }
};

/**
 * Placeholder for table-based reports (Phase 2-3 logic)
 */
export const exportReportToPDF = async (reportData) => {
  if (Platform.OS === 'web') {
    window.print();
    return;
  }
  Alert.alert("Coming Soon", "Detailed tabular reports are being optimized for Phase 2.");
};
```

## C:\Users\head user\Desktop\Hamthan\v3\AI-Operation-Kaizen\FullStack\frontend\src\utils\permissions.js

```javascript
import * as ImagePicker from 'expo-image-picker';
import { Alert, Linking, Platform } from 'react-native';

export const requestCameraPermission = async () => {
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert(
      'Permission Required',
      'Camera permission is needed to take photos. Please enable it in settings.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Open Settings', onPress: () => Linking.openSettings() },
      ]
    );
    return false;
  }
  return true;
};

export const requestMediaLibraryPermission = async () => {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert(
      'Permission Required',
      'Media library permission is needed to select photos. Please enable it in settings.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Open Settings', onPress: () => Linking.openSettings() },
      ]
    );
    return false;
  }
  return true;
};

export const pickImageFromCamera = async () => {
  const hasPermission = await requestCameraPermission();
  if (!hasPermission) return null;

  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    aspect: [4, 3],
    quality: 0.8,
    base64: true,
  });

  if (!result.canceled && result.assets[0]) {
    return result.assets[0];
  }
  return null;
};

export const pickImageFromGallery = async () => {
  const hasPermission = await requestMediaLibraryPermission();
  if (!hasPermission) return null;

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    aspect: [4, 3],
    quality: 0.8,
    base64: true,
  });

  if (!result.canceled && result.assets[0]) {
    return result.assets[0];
  }
  return null;
};
```

## C:\Users\head user\Desktop\Hamthan\v3\AI-Operation-Kaizen\FullStack\frontend\src\utils\photoUpload.js

```javascript
/**
 * Photo Upload Utility with Compression and Camera Integration
 * 
 * Features:
 * - Camera capture
 * - Gallery selection
 * - Image compression
 * - Base64 encoding
 * - Progress tracking
 */

import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { Alert, Platform } from 'react-native';

// Compression quality settings
const COMPRESSION_QUALITY = {
  high: 0.8,
  medium: 0.6,
  low: 0.4,
};

// Max dimensions
const MAX_DIMENSION = 1920;

/**
 * Request camera permissions
 */
export const requestCameraPermission = async () => {
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert(
      'Permission Required',
      'Camera access is needed to take photos of issues.',
      [{ text: 'OK' }]
    );
    return false;
  }
  return true;
};

/**
 * Request media library permissions
 */
export const requestMediaLibraryPermission = async () => {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert(
      'Permission Required',
      'Photo library access is needed to select images.',
      [{ text: 'OK' }]
    );
    return false;
  }
  return true;
};

/**
 * Launch camera to capture photo
 * 
 * @param {Object} options - Camera options
 * @returns {Object|null} - Image result or null if cancelled
 */
export const capturePhoto = async (options = {}) => {
  const hasPermission = await requestCameraPermission();
  if (!hasPermission) return null;
  
  const defaultOptions = {
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    aspect: [4, 3],
    quality: COMPRESSION_QUALITY.medium,
    base64: false,
  };
  
  try {
    const result = await ImagePicker.launchCameraAsync({
      ...defaultOptions,
      ...options,
    });
    
    if (result.canceled) {
      return null;
    }
    
    return result.assets[0];
  } catch (error) {
    console.error('Camera error:', error);
    Alert.alert('Error', 'Failed to capture photo. Please try again.');
    return null;
  }
};

/**
 * Select photo from gallery
 * 
 * @param {Object} options - Picker options
 * @returns {Object|null} - Image result or null if cancelled
 */
export const selectPhoto = async (options = {}) => {
  const hasPermission = await requestMediaLibraryPermission();
  if (!hasPermission) return null;
  
  const defaultOptions = {
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    aspect: [4, 3],
    quality: COMPRESSION_QUALITY.medium,
    base64: false,
  };
  
  try {
    const result = await ImagePicker.launchImageLibraryAsync({
      ...defaultOptions,
      ...options,
    });
    
    if (result.canceled) {
      return null;
    }
    
    return result.assets[0];
  } catch (error) {
    console.error('Gallery error:', error);
    Alert.alert('Error', 'Failed to select photo. Please try again.');
    return null;
  }
};

/**
 * Select multiple photos from gallery
 * 
 * @param {Object} options - Picker options
 * @returns {Array|null} - Array of images or null if cancelled
 */
export const selectMultiplePhotos = async (options = {}) => {
  const hasPermission = await requestMediaLibraryPermission();
  if (!hasPermission) return null;
  
  const defaultOptions = {
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsMultipleSelection: true,
    selectionLimit: 5,
    quality: COMPRESSION_QUALITY.medium,
  };
  
  try {
    const result = await ImagePicker.launchImageLibraryAsync({
      ...defaultOptions,
      ...options,
    });
    
    if (result.canceled) {
      return null;
    }
    
    return result.assets;
  } catch (error) {
    console.error('Gallery error:', error);
    Alert.alert('Error', 'Failed to select photos. Please try again.');
    return null;
  }
};

/**
 * Convert image URI to base64
 * 
 * @param {string} uri - Image URI
 * @returns {string} - Base64 encoded string
 */
export const convertToBase64 = async (uri) => {
  try {
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return `data:image/jpeg;base64,${base64}`;
  } catch (error) {
    console.error('Base64 conversion error:', error);
    throw new Error('Failed to process image');
  }
};

/**
 * Get file info (size, etc.)
 * 
 * @param {string} uri - File URI
 * @returns {Object} - File info
 */
export const getFileInfo = async (uri) => {
  try {
    const info = await FileSystem.getInfoAsync(uri);
    return {
      exists: info.exists,
      size: info.size,
      sizeFormatted: formatFileSize(info.size),
      uri: info.uri,
    };
  } catch (error) {
    console.error('File info error:', error);
    return null;
  }
};

/**
 * Format file size to human readable
 * 
 * @param {number} bytes - Size in bytes
 * @returns {string} - Formatted size
 */
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Show image picker action sheet
 * 
 * @param {Function} onCapture - Callback for camera capture
 * @param {Function} onSelect - Callback for gallery selection
 */
export const showImagePickerOptions = (onCapture, onSelect) => {
  Alert.alert(
    'Add Photo',
    'Choose how to add a photo',
    [
      {
        text: 'Take Photo',
        onPress: onCapture,
      },
      {
        text: 'Choose from Gallery',
        onPress: onSelect,
      },
      {
        text: 'Cancel',
        style: 'cancel',
      },
    ],
    { cancelable: true }
  );
};

/**
 * Complete photo capture flow with options
 * 
 * @param {Object} options - Options for capture/select
 * @returns {Object|null} - Processed image or null
 */
export const captureOrSelectPhoto = async (options = {}) => {
  return new Promise((resolve) => {
    showImagePickerOptions(
      async () => {
        const result = await capturePhoto(options);
        resolve(result);
      },
      async () => {
        const result = await selectPhoto(options);
        resolve(result);
      }
    );
  });
};

export default {
  requestCameraPermission,
  requestMediaLibraryPermission,
  capturePhoto,
  selectPhoto,
  selectMultiplePhotos,
  convertToBase64,
  getFileInfo,
  formatFileSize,
  showImagePickerOptions,
  captureOrSelectPhoto,
  COMPRESSION_QUALITY,
};
```

## C:\Users\head user\Desktop\Hamthan\v3\AI-Operation-Kaizen\FullStack\frontend\src\utils\scoreEngine.js

```javascript
import { issueAssignments } from '../mocks/issueAssignments';
import { callLogs } from '../mocks/callLogs';
import { complaints } from '../mocks/complaints';
import { issues } from '../mocks/issues';

// Include both completed statuses to match your API
export const FIXEDSTATUSES = ['COMPLETED', 'RESOLVED_PENDING_REVIEW'];

const wasCompletedOnTime = (assignment) => {
  if (!FIXEDSTATUSES.includes(assignment.status?.toUpperCase())) return false;
  
  // ✅ REVERTED TO SNAKE CASE: due_date (or deadline_at) and updated_at
  const due = assignment.due_date || assignment.deadline_at; 
  if (!due || !assignment.updated_at) return false;
  
  return new Date(assignment.updated_at) <= new Date(due);
};

export const calculateSolverScore = (solverId) => {
  // ✅ REVERTED TO SNAKE CASE: assigned_to_solver_id
  const solverAssignments = issueAssignments.filter(
    (a) => a.assigned_to_solver_id === solverId
  );
  const totalAssigned = solverAssignments.length;

  const completedAssignments = solverAssignments.filter(
    (a) => FIXEDSTATUSES.includes(a.status?.toUpperCase())
  );
  const completedCount = completedAssignments.length;
  const completionRate = totalAssigned > 0 ? completedCount / totalAssigned : 0;
  const completionScore = completionRate * 40;

  const onTimeCount = completedAssignments.filter(wasCompletedOnTime).length;
  const onTimeRate = completedCount > 0 ? onTimeCount / completedCount : 0;
  const onTimeScore = onTimeRate * 30;

  // ✅ REVERTED TO SNAKE CASE: solver_id
  const solverCalls = callLogs.filter((log) => log.solver_id === solverId);
  const totalCalls = solverCalls.length;
  const answeredCalls = solverCalls.filter(
    (log) => log.status?.toUpperCase() === 'ANSWERED'
  ).length;
  const callAnswerRate = totalCalls > 0 ? answeredCalls / totalCalls : 1;
  const callScore = callAnswerRate * 20;

  // ✅ REVERTED TO SNAKE CASE: target_solver_id
  const solverComplaints = complaints.filter(
    (c) => c.target_solver_id === solverId
  );
  const complaintCount = solverComplaints.length;
  const complaintPenalty = Math.min(complaintCount * 3, 10);
  const complaintScore = 10 - complaintPenalty;

  const totalScore = Math.round(
    completionScore + onTimeScore + callScore + complaintScore
  );

  let label = 'Needs Attention';
  let labelColor = '#ef4444';
  if (totalScore >= 80) {
    label = 'Top Performer';
    labelColor = '#10a37f';
  } else if (totalScore >= 55) {
    label = 'Good';
    labelColor = '#f59e0b';
  }

  // ✅ FIXED: IN_PROGRESS (with underscore)
  const inProgressCount = solverAssignments.filter((a) => a.status?.toUpperCase() === 'IN_PROGRESS').length;
  const assignedNotStartedCount = solverAssignments.filter((a) => a.status?.toUpperCase() === 'ASSIGNED').length;
  const reopenedCount = solverAssignments.filter((a) => a.status?.toUpperCase() === 'REOPENED').length;

  // ✅ REVERTED TO SNAKE CASE: issue_id
  const escalatedCount = solverAssignments.filter((a) => {
    const relatedIssue = issues.find(i => i.id === a.issue_id);
    return relatedIssue && relatedIssue.status?.toUpperCase() === 'ESCALATED';
  }).length;

  const activeAssignments = solverAssignments.filter((a) =>
    ['ASSIGNED', 'IN_PROGRESS', 'REOPENED'].includes(a.status?.toUpperCase())
  );

  const overdueAssignments = solverAssignments.filter((a) => {
    const due = a.due_date || a.deadline_at;
    if (!due) return false;
    if (FIXEDSTATUSES.includes(a.status?.toUpperCase())) return false;
    return new Date(due) < new Date();
  });

  return {
    solverId,
    score: totalScore || 0,
    label,
    labelColor,
    totalAssigned,
    completedCount,
    activeCount: activeAssignments.length,
    overdueCount: overdueAssignments.length,
    complaintCount,
    inProgressCount,
    assignedNotStartedCount,
    reopenedCount,
    escalatedCount,
    completionRate: Math.round(completionRate * 100) || 0,
    onTimeRate: Math.round(onTimeRate * 100) || 0,
    callAnswerRate: Math.round(callAnswerRate * 100) || 0,
    totalCalls,
    answeredCalls,
    missedCalls: totalCalls - answeredCalls,
  };
};

export const calculateAllSolverScores = (solverIds) => {
  return solverIds.reduce((acc, id) => {
    acc[id] = calculateSolverScore(id);
    return acc;
  }, {});
};

export default calculateSolverScore;
```

## C:\Users\head user\Desktop\Hamthan\v3\AI-Operation-Kaizen\FullStack\frontend\src\utils\storage.js

```javascript
import AsyncStorage from '@react-native-async-storage/async-storage';

const USER_KEY = '@maintenance_app_user';
const THEME_KEY = '@maintenance_app_theme';

export const saveUser = async (user) => {
  try {
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
    return true;
  } catch (error) {
    console.error('Error saving user:', error);
    return false;
  }
};

export const loadUser = async () => {
  try {
    const userJson = await AsyncStorage.getItem(USER_KEY);
    return userJson ? JSON.parse(userJson) : null;
  } catch (error) {
    console.error('Error loading user:', error);
    return null;
  }
};

export const removeUser = async () => {
  try {
    await AsyncStorage.removeItem(USER_KEY);
    return true;
  } catch (error) {
    console.error('Error removing user:', error);
    return false;
  }
};

export const saveTheme = async (theme) => {
  try {
    await AsyncStorage.setItem(THEME_KEY, theme);
    return true;
  } catch (error) {
    console.error('Error saving theme:', error);
    return false;
  }
};

export const loadTheme = async () => {
  try {
    return await AsyncStorage.getItem(THEME_KEY);
  } catch (error) {
    console.error('Error loading theme:', error);
    return null;
  }
};
```
