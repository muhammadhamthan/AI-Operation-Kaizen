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
