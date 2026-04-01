/**
 * src/services/imagekitService.js
 * ─────────────────────────────────────────────────────────────────
 * Handles direct-to-ImageKit uploads from the frontend.
 *
 * WHY DIRECT UPLOAD?
 *   Phone → Your Server → ImageKit  (old, slow, wastes server RAM)
 *   Phone → ImageKit directly        (new, fast, server only gets a URL string)
 *
 * HOW IT WORKS:
 *   1. Call your backend for a short-lived auth token (30 min)
 *   2. POST multipart form directly to ImageKit's upload API
 *   3. Get back a permanent CDN URL
 *   4. Pass that URL to ChatInput → sendChatMessage → backend
 *
 * USAGE in ChatInput.js:
 *   import { uploadImageToImageKit } from '../../services/imagekitService';
 *
 *   const imageUrl = await uploadImageToImageKit(localFileUri, {
 *     imageType: 'BEFORE',   // or 'AFTER'
 *     issueId: 5,            // optional, links to folder on CDN
 *     onProgress: (pct) => setUploadProgress(pct),
 *   });
 *
 *   // Then send imageUrl to backend via chat
 *   onSend(message, imageUrl, location, intent);
 */

import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';

// ─── Your backend base URL (same as api.js) ───────────────────────
const BACKEND_URL = 'http://127.0.0.1:8000';

// ─── ImageKit upload endpoint (their public API) ──────────────────
const IMAGEKIT_UPLOAD_URL = 'https://upload.imagekit.io/api/v1/files/upload';

// ─── Auth token cache ─────────────────────────────────────────────
// We cache the token for up to 25 minutes (expires in 30) to avoid
// hitting your backend for every single upload.
let _cachedAuth = null;
let _cachedAuthExpire = 0;

/**
 * Fetches a fresh ImageKit auth token from your backend.
 * Caches it for 25 minutes to minimise round-trips.
 */
const getImageKitAuth = async () => {
  const now = Math.floor(Date.now() / 1000);

  // Return cached token if still valid (with 5-min buffer)
  if (_cachedAuth && _cachedAuthExpire - now > 300) {
    return _cachedAuth;
  }

  const token = await AsyncStorage.getItem('auth_token');
  const response = await axios.get(`${BACKEND_URL}/api/v1/images/imagekit-auth`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  _cachedAuth = response.data;
  _cachedAuthExpire = response.data.expire;
  return _cachedAuth;
};

/**
 * Converts a local file URI to a Blob for multipart upload.
 * Works on both iOS and Android.
 */
const uriToBlob = async (uri) => {
  if (Platform.OS === 'web') {
    // On web, fetch the URI directly
    const res = await fetch(uri);
    return await res.blob();
  }

  // On native, read as base64 then convert
  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  // Detect MIME type from extension
  const ext = uri.split('.').pop()?.toLowerCase() || 'jpg';
  const mimeMap = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };
  const mime = mimeMap[ext] || 'image/jpeg';

  // Convert base64 to binary
  const binaryStr = atob(base64);
  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) {
    bytes[i] = binaryStr.charCodeAt(i);
  }
  return new Blob([bytes], { type: mime });
};

/**
 * Builds the ImageKit folder path.
 * Mirrors the backend's _build_folder() logic so files land
 * in the same folder structure whether uploaded from front or back.
 *
 *   issues/123/before/
 *   issues/123/after/
 *   issues/temp/before/   ← when issueId is unknown yet
 */
const buildFolder = (issueId, imageType) => {
  const folder = issueId ? issueId : 'temp';
  return `issues/${folder}/${imageType.toLowerCase()}/`;
};

/**
 * Generates a CDN-safe filename with a millisecond timestamp prefix.
 * Prevents stale CDN caching when the same filename is re-uploaded.
 */
const sanitizeFilename = (originalName) => {
  const name = originalName.toLowerCase().replace(/[^a-z0-9._-]/g, '_').replace(/_+/g, '_');
  const timestamp = Date.now();
  return `${timestamp}_${name}`;
};

/**
 * Main function: upload a local image URI directly to ImageKit.
 *
 * @param {string} localUri       - The file:// URI from ImagePicker
 * @param {Object} options
 * @param {string} options.imageType  - 'BEFORE' or 'AFTER'  (default: 'BEFORE')
 * @param {number} options.issueId    - Optional issue ID for folder structure
 * @param {Function} options.onProgress - (percent: number) => void
 *
 * @returns {string} Permanent ImageKit CDN URL
 * @throws  Error if upload fails
 */
export const uploadImageToImageKit = async (localUri, options = {}) => {
  const {
    imageType = 'BEFORE',
    issueId = null,
    onProgress = null,
  } = options;

  // ── Step 1: Get auth token ───────────────────────────────────
  const auth = await getImageKitAuth();

  // ── Step 2: Build the file blob ─────────────────────────────
  const blob = await uriToBlob(localUri);

  // ── Step 3: Extract original filename from URI ───────────────
  const uriParts = localUri.split('/');
  const rawFilename = uriParts[uriParts.length - 1] || 'photo.jpg';
  const safeFilename = sanitizeFilename(rawFilename);

  // ── Step 4: Build multipart form ────────────────────────────
  const formData = new FormData();
  formData.append('file', blob, safeFilename);
  formData.append('fileName', safeFilename);
  formData.append('publicKey', auth.public_key);
  formData.append('signature', auth.signature);
  formData.append('expire', String(auth.expire));
  formData.append('token', auth.token);
  formData.append('folder', buildFolder(issueId, imageType));
  formData.append('useUniqueFileName', 'false'); // we handle uniqueness with timestamp

  // ── Step 5: Upload directly to ImageKit ─────────────────────
  const response = await axios.post(IMAGEKIT_UPLOAD_URL, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    onUploadProgress: (progressEvent) => {
      if (onProgress && progressEvent.total) {
        const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        onProgress(percent);
      }
    },
    timeout: 60000, // 60 seconds
  });

  const { url } = response.data;
  if (!url) {
    throw new Error('ImageKit did not return a URL');
  }

  return url; // permanent CDN URL, e.g. https://ik.imagekit.io/yourid/issues/5/before/...
};

/**
 * Generates a thumbnail URL from any ImageKit CDN URL.
 * No re-upload needed — ImageKit resizes on-the-fly.
 *
 * @param {string} imageUrl - Full ImageKit CDN URL
 * @param {number} width    - Thumbnail width in px (default 200)
 * @param {number} height   - Thumbnail height in px (default 200)
 * @returns {string} Thumbnail URL
 */
export const getThumbUrl = (imageUrl, width = 200, height = 200) => {
  if (!imageUrl) return null;
  return `${imageUrl}?tr=w-${width},h-${height},fo-auto`;
};

export default {
  uploadImageToImageKit,
  getThumbUrl,
};