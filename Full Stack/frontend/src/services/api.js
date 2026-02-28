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

// // API Base URL - Backend is on port 8001
// const getBaseUrl = () => {
//   // For production/preview deployments, use the EXPO_PUBLIC_BACKEND_URL
//   const backendUrl = 'http://127.0.0.1:8000';
  
//   // if (backendUrl) {
//   //   return `${backendUrl}/api`;
//   // }
  
//   // // For local development
//   // if (Platform.OS === 'web') {
//   //   // Use relative URL which will be proxied
//   //   return 'http://localhost:8001/api';
//   // }
  
//   // Native apps need full URL
//   return 'http://localhost:8001/api';
// };

const backendUrl = 'http://127.0.0.1:8000';

const API_BASE_URL = backendUrl;

console.log('API Base URL:', API_BASE_URL);

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
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
export const fetchIssues = async (filters = {}) => {
  try {
    const params = new URLSearchParams();
    if (filters.status) params.append('status', filters.status);
    if (filters.priority) params.append('priority', filters.priority);
    if (filters.site_id) params.append('site_id', filters.site_id);

    const response = await withRetry(
      () => api.get(`/issues?${params.toString()}`),
      { maxRetries: 2 }
    );

    // Transform response to match frontend expectations
    const issues = response.data.map(issue => ({
      ...issue,
      site: issue.site ? {
        ...issue.site,
        name: issue.site.name,
      } : null,
      raised_by: issue.raised_by ? {
        ...issue.raised_by,
        avatar: issue.raised_by.avatar_url,
      } : null,
    }));

    return {
      success: true,
      issues,
    };
  } catch (error) {
    console.error('Fetch issues error:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.detail || 'Failed to fetch issues',
      issues: [],
    };
  }
};

/**
 * Fetch single issue by ID
 */
export const fetchIssueById = async (issueId) => {
  try {
    const response = await api.get(`/issues/${issueId}`);
    
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

// ==================== DASHBOARD API ====================

/**
 * Fetch dashboard statistics
 */
export const fetchDashboardStats = async () => {
  try {
    const response = await withRetry(
      () => api.get('/dashboard/stats'),
      { maxRetries: 2 }
    );

    return {
      success: true,
      stats: response.data,
    };
  } catch (error) {
    console.error('Fetch dashboard error:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.detail || 'Failed to fetch dashboard',
      stats: {
        totalIssues: 0,
        notFixedIssues: 0,
        fixedIssues: 0,
        complaints: 0,
      },
    };
  }
};

// ==================== COMPLAINTS API ====================

/**
 * Fetch all complaints
 */
export const fetchComplaints = async () => {
  try {
    const response = await withRetry(
      () => api.get('/complaints'),
      { maxRetries: 2 }
    );

    return {
      success: true,
      complaints: response.data,
    };
  } catch (error) {
    console.error('Fetch complaints error:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.detail || 'Failed to fetch complaints',
      complaints: [],
    };
  }
};

// ==================== SITES API ====================

/**
 * Fetch all sites
 */
export const fetchSites = async () => {
  try {
    const response = await api.get('/sites');
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

// ==================== CHATBOT API ====================

/**
 * Send message to chatbot
 */
// chatService.js 
export const sendChatMessage = async (
  text,
  sessionId = null,
  currentIssueId = null,
  imageUrl = null
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
      }
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
