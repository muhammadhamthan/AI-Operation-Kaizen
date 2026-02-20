// src/services/api.js

import axios from 'axios';
import { Platform } from 'react-native';

// ==================================================
// 🔐 API BASE URL
// ==================================================
const getBaseUrl = () => {
  if (Platform.OS === 'web') {
    return 'http://localhost:8000/api/v1';
  }
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:8000/api/v1';
  }
  return 'http://localhost:8000/api/v1';
};

const API_BASE_URL = getBaseUrl();
console.log('API Base URL:', API_BASE_URL);

// ==================================================
// 📡 AXIOS INSTANCE
// ==================================================
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ✅ Simple error logging interceptor — no auth references
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error(
      `❌ API Error: ${error.config?.method?.toUpperCase()} ${error.config?.url}`,
      error.response?.status,
      error.response?.data
    );
    return Promise.reject(error);
  }
);

// ==================== CHATBOT API ====================

export const sendChatMessage = async (message, issueId = null, imageUrl = null) => {
  try {
    const payload = {
      message: message,
      image_url: imageUrl,
      issue_id: issueId,
      metadata: null,
    };

    console.log('💬 Sending:', payload);

    const response = await api.post('/chat/message', payload);

    console.log('🤖 Response:', response.data);

    return {
      success: true,
      message: response.data.message,
      intent: response.data.intent,
      issueId: response.data.issue_id,
      actions: response.data.actions_taken || [],
      data: response.data.data || null,
    };
  } catch (error) {
    console.error('Chat error:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.detail || error.message || 'Failed to send message',
    };
  }
};

export const fetchChatHistory = async (issueId = null, skip = 0, limit = 50) => {
  try {
    const params = new URLSearchParams();
    if (issueId) params.append('issue_id', issueId);
    params.append('skip', skip.toString());
    params.append('limit', limit.toString());

    const response = await api.get(`/chat/history?${params.toString()}`);

    return {
      success: true,
      total: response.data.total,
      messages: response.data.messages || [],
    };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.detail || 'Failed to fetch history',
      messages: [],
    };
  }
};

export const checkHealth = async () => {
  try {
    const response = await api.get('/health');
    return { success: true, ...response.data };
  } catch (error) {
    return { success: false, error: 'API not available' };
  }
};

// ==================== DEFAULT EXPORT ====================

export default {
  sendChatMessage,
  fetchChatHistory,
  checkHealth,
};