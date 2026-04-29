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

export const uploadImageToImageKit = async (
  localUri,
  issueId,
  imageType,
) => {
  console.log('\n🚀 ─── STARTING IMAGE UPLOAD ───');

  validateUploadInputs(localUri, issueId);

  const auth = await getImageKitAuth();

  const safeFilename = generateSafeFilename(localUri);

  const payloadData = await preparePayload(localUri, safeFilename);

  const formData = buildImageKitFormData({
    payloadData,
    safeFilename,
    auth,
    issueId,
    imageType
  });

  const response = await uploadToImageKit(formData);

  console.log('✅ [Success] URL:', response.data.url);
  return response.data.url;
};

const getImageKitAuth = async () => {
  console.log('🔑 [Auth] Fetching fresh auth token from backend...');

  const token = await AsyncStorage.getItem('auth_token');

  if (!token) {
    throw new Error("❌ No auth token found. User not logged in.");
  }

  const response = await axios.get(
    `${BACKEND_URL}/api/v1/images/imagekit-auth`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  console.log('✅ [Auth] Received ImageKit auth');

  return response.data; 
  // { token, expire, signature, public_key }
};

const validateUploadInputs = (localUri, issueId) => {
  if (!localUri) {
    throw new Error("❌ localUri is required");
  }

  if (!issueId) {
    throw new Error("❌ issueId is required");
  }
};

const sanitizeFilename = (originalName) => {
  const name = originalName
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '_')   // remove special chars
    .replace(/_+/g, '_');            // remove duplicate underscores

  const timestamp = Date.now();

  return `${timestamp}_${name}`;
};

const generateSafeFilename = (localUri) => {
  const uriParts = localUri.split('/');
  const rawFilename = uriParts[uriParts.length - 1] || 'photo.jpg';
  return sanitizeFilename(rawFilename);
};

const preparePayload = async (uri, safeFilename) => {
  if (Platform.OS === 'web') {
    console.log('📦 [Prepare] Web → File object');

    const res = await fetch(uri);
    const blob = await res.blob();

    return new File([blob], safeFilename, {
      type: blob.type || 'image/jpeg',
    });
  }

  console.log('📦 [Prepare] Native → Base64');

  const base64Str = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  const ext = uri.split('.').pop()?.toLowerCase() || 'jpg';

  const mimeMap = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
  };

  const mime = mimeMap[ext] || 'image/jpeg';

  return `data:${mime};base64,${base64Str}`;
};

const buildImageKitFormData = ({
  payloadData,
  safeFilename,
  auth,
  issueId,
  imageType
}) => {
  const formData = new FormData();

  formData.append('file', payloadData);
  formData.append('fileName', safeFilename);
  formData.append('publicKey', auth.public_key);
  formData.append('signature', auth.signature);
  formData.append('expire', String(auth.expire));
  formData.append('token', auth.token);

  formData.append(
    'folder',
    `issues/${issueId}/${imageType.toLowerCase()}/`
  );

  formData.append('useUniqueFileName', 'false');

  return formData;
};

const uploadToImageKit = async (formData) => {
  return axios.post(IMAGEKIT_UPLOAD_URL, formData, {
    headers: {
      ...(Platform.OS === 'web'
        ? { 'Content-Type': 'multipart/form-data' }
        : {}),
    },
    timeout: 60000,
  });
};
