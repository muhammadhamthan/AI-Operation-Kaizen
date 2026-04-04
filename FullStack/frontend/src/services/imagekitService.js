/**
 * src/services/imagekitService.js
 * ─────────────────────────────────────────────────────────────────
 * Handles direct-to-ImageKit uploads from the frontend.
 */

import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';

const BACKEND_URL = 'https://api.kairoxaitech.com';
const IMAGEKIT_UPLOAD_URL = 'https://upload.imagekit.io/api/v1/files/upload';

/**
 * 📍 FIXED: Removed the 25-minute cache.
 * ImageKit strictly requires a brand new UUID token for EVERY upload 
 * to prevent replay attacks. We must fetch a fresh signature every time.
 */
const getImageKitAuth = async () => {
  console.log('🔑 [Auth] Fetching fresh auth token from backend...');
  const token = await AsyncStorage.getItem('auth_token');
  const response = await axios.get(`${BACKEND_URL}/api/v1/images/imagekit-auth`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log('✅ [Auth] Successfully fetched new auth token');
  return response.data; // { token, expire, signature, public_key }
};

const buildFolder = (issueId, imageType) => {
  const folder = issueId ? issueId : 'temp';
  return `issues/${folder}/${imageType.toLowerCase()}/`;
};

const sanitizeFilename = (originalName) => {
  const name = originalName.toLowerCase().replace(/[^a-z0-9._-]/g, '_').replace(/_+/g, '_');
  const timestamp = Date.now();
  return `${timestamp}_${name}`;
};

/**
 * Safely converts any image URI to a Base64 Data URL.
 * This completely avoids React Native's FormData binary corruption bugs.
 */
const preparePayload = async (uri, safeFilename) => {
  if (Platform.OS === 'web') {
    console.log('📦 [Prepare] Creating Web File object...');
    const res = await fetch(uri);
    const blob = await res.blob();
    // ImageKit strictly requires a File object on web so it can read the name!
    return new File([blob], safeFilename, { type: blob.type || 'image/jpeg' });
  }

  console.log('📦 [Prepare] Creating Native Base64 string...');
  const base64Str = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const ext = uri.split('.').pop()?.toLowerCase() || 'jpg';
  const mimeMap = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };
  const mime = mimeMap[ext] || 'image/jpeg';
  return `data:${mime};base64,${base64Str}`;
};

export const uploadImageToImageKit = async (localUri, options = {}) => {
  console.log('\n🚀 ─── STARTING IMAGE UPLOAD ───');
  const { imageType = 'BEFORE', issueId = null, onProgress = null } = options;

  try {
    // 1. Get a FRESH auth token
    const auth = await getImageKitAuth();

    // 2. Prepare filename
    const uriParts = localUri.split('/');
    const rawFilename = uriParts[uriParts.length - 1] || 'photo.jpg';
    const safeFilename = sanitizeFilename(rawFilename);

    console.log('📝 [Upload] Safe filename:', safeFilename);
    
    // 3. Prepare payload (File for Web, Base64 for Native)
    const payloadData = await preparePayload(localUri, safeFilename);

    // 4. Build Form Data
    const formData = new FormData();
    formData.append('file', payloadData); 
    formData.append('fileName', safeFilename);
    formData.append('publicKey', auth.public_key);
    formData.append('signature', auth.signature);
    formData.append('expire', String(auth.expire));
    formData.append('token', auth.token);
    formData.append('folder', buildFolder(issueId, imageType));
    formData.append('useUniqueFileName', 'false');

    console.log('🌐 [Network] Sending POST to ImageKit...');
    
    // 5. Send Request
    const response = await axios.post(IMAGEKIT_UPLOAD_URL, formData, {
      headers: {
        ...(Platform.OS === 'web' ? { 'Content-Type': 'multipart/form-data' } : {}),
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          if (percent % 20 === 0) console.log(`⏳ [Network] Progress: ${percent}%`);
          onProgress(percent);
        }
      },
      timeout: 60000,
    });

    console.log('✅ [Success] URL:', response.data.url);
    console.log('🚀 ─── UPLOAD COMPLETE ───\n');
    return response.data.url;

  } catch (error) {
    console.error('\n❌ ─── UPLOAD FAILED ───');
    if (error.response) {
      console.error('🚨 Status:', error.response.status);
      console.error('🚨 EXACT IMAGEKIT ERROR DATA:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('🚨 Error:', error.message);
    }
    throw error;
  }
};

export const getThumbUrl = (imageUrl, width = 200, height = 200) => {
  if (!imageUrl) return null;
  return `${imageUrl}?tr=w-${width},h-${height},fo-auto`;
};

export default {
  uploadImageToImageKit,
  getThumbUrl,
};