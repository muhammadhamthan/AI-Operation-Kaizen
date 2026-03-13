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
//   return 'http://13.48.25.159:8000/api';
// };

const backendUrl = 'http://13.48.25.159:8000';
const backendUrl = 'http://localhost:8000';

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
export const fetchIssues = async (filters = {}) => {
  try {
    const params = new URLSearchParams();
    if (filters.status) params.append('status', filters.status);
    if (filters.priority) params.append('priority', filters.priority);
    if (filters.site_id) params.append('site_id', filters.site_id);

    const response = await withRetry(
      () => api.get(`/api/v1/issues?${params.toString()}`),// URL HAS BEEN CHANGED NOW IT'S /api/v1/issues/
      { maxRetries: 2 }
    );
    console.log(response)

    // Transform response to match frontend expectations
    // const issues = response.data.issues.map(issue => ({ // added .issues because backend response is { success: true, issues: [...] }
    //   ...issue,
    //   site: issue.site ? {
    //     ...issue.site,
    //     name: issue.site.name,
    //   } : null,
    //   raised_by: issue.raised_by ? {
    //     ...issue.raised_by,
    //     avatar: issue.raised_by.avatar_url,
    //   } : null,
    // }));

    const issues = response.data.issues.map(issue => ({ // Map backend fields to frontend format
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
    const response = await api.get('/api/v1/complaints');

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
