/**
 * Real API Service - Connects to PostgreSQL Backend
 * * All API calls to the FastAPI backend
 */

import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { withRetry } from '../utils/networkRetry';
import { uploadImageToImageKit } from './imagekitService';

// Import mocks for stability fallback
import { users as mockUsers } from '../mocks/users';
import { issues as mockIssues } from '../mocks/issues';
import { sites as mockSites } from '../mocks/sites';
import { complaints as mockComplaints } from '../mocks/complaints';

const backendUrl = 'https://api.kairoxaitech.com';
const API_BASE_URL = backendUrl;

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

// Request interceptor
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem(TOKEN_KEY);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await AsyncStorage.removeItem(TOKEN_KEY);
      await AsyncStorage.removeItem(USER_KEY);
    }
    return Promise.reject(error);
  }
);

// ==================== AUTH API ====================

export const loginUser = async (username, password) => {
  try {
    const response = await api.post('/api/v1/auth/login', { phone: username, password });
    const { access_token, user } = response.data;
    await AsyncStorage.setItem(TOKEN_KEY, access_token);
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
    return { success: true, user: { ...user, avatar: user.avatar_url }, token: access_token };
  } catch (error) {
    return { success: false, error: error.response?.data?.detail || 'Invalid credentials' };
  }
};

export const getCurrentUser = async () => {
  try {
    const response = await api.get('/api/v1/auth/me');
    return { success: true, user: { ...response.data, avatar: response.data.avatar_url } };
  } catch (error) {
    return { success: false, error: 'Failed' };
  }
};

export const logoutUser = async () => {
  await AsyncStorage.removeItem(TOKEN_KEY);
  await AsyncStorage.removeItem(USER_KEY);
  return { success: true };
};

export const isAuthenticated = async () => {
  const token = await AsyncStorage.getItem(TOKEN_KEY);
  return !!token;
};

export const getStoredUser = async () => {
  try {
    const userJson = await AsyncStorage.getItem(USER_KEY);
    if (userJson) {
      const user = JSON.parse(userJson);
      return { ...user, avatar: user.avatar_url };
    }
    return null;
  } catch (error) {
    return null;
  }
};

// ==================== ISSUES API (BACKEND) ====================

export const fetchIssues = async (filters = {}) => {
  try {
    const queryParams = { ...filters };
    if (filters.status) queryParams.status_filter = filters.status;
    const response = await api.get('/api/v1/issues', { params: queryParams });
    const data = response.data;
    const items = data.items || data.issues || [];
    const issues = items.map((issue) => ({
      ...issue,
      site: issue.site || { name: issue.site_name || 'Unknown Site' },
      raised_by: issue.raised_by || { name: issue.supervisor_name || 'Supervisor' },
    }));
    return { success: true, issues, next_cursor: data.next_cursor, has_more: data.has_more };
  } catch (error) {
    return { success: false, issues: [] };
  }
};

export const fetchIssueById = async (issueId) => {
  try {
    const response = await api.get(`/api/v1/issues/${issueId}`);
    const raw = response.data;
    const issue = {
      ...raw,
      site: raw.site || { name: raw.site_name || 'Unknown Site' },
      raised_by: raw.raised_by || { name: raw.supervisor_name || 'Supervisor' },
      images: raw.images || [],
      call_logs: raw.call_logs || [],
    };
    return { success: true, issue };
  } catch (error) {
    return { success: false, error: 'Not found' };
  }
};

export const fetchIssueTimeline = async (issueId) => {
  try {
    const response = await api.get(`/api/v1/issues/${issueId}/timeline`);
    return { success: true, timeline: response.data?.timeline || [] };
  } catch (error) {
    return { success: false, timeline: [] };
  }
};

// ==================== DASHBOARD API ====================

export const fetchDashboardStats = async () => {
  try {
    const response = await api.get('/api/v1/dashboard');
    return { success: true, data: response.data };
  } catch (error) {
    return { success: false, error: 'Failed' };
  }
};

export const fetchSolversPerformanceAPI = async () => {
  try {
    const response = await api.get('/api/v1/solvers');
    // Backend returns { total, solvers: [...] } — extract the array
    const raw = response.data;
    const rawSolvers = Array.isArray(raw) ? raw : Array.isArray(raw?.solvers) ? raw.solvers : [];

    // Normalize: backend list endpoint returns SolverListItem (score/label at top level)
    // but frontend expects SolverWithPerformance shape (performance sub-object).
    const solvers = rawSolvers.map(solver => {
      if (solver.performance) return solver; // Already has performance sub-object
      return {
        ...solver,
        performance: {
          score: solver.score ?? 0,
          label: solver.label || 'No Rating',
          label_color: solver.label_color || '#f59e0b',
          // Fill other defaults for metrics shown in the list
          active_count: solver.active_count || 0,
          completed_count: solver.completed_count || 0,
          complaint_count: solver.complaint_count || 0,
          completion_rate: solver.completion_rate || 0,
          on_time_rate: solver.on_time_rate || 0,
        },
      };
    });

    return { success: true, solvers };
  } catch (error) {
    return { success: false, solvers: [] };
  }
};

// 📍 DASHBOARD CARD ENDPOINTS
export const fetchResolvedIssuesCard = async (params) => {
  try {
    const response = await api.get('/api/v1/dashboard-cards/resolved', { params });
    const data = response.data;
    const items = (data.items || []).map(issue => ({
      ...issue,
      solver_name: issue.solver_name || issue.assignments?.[0]?.solver_name || issue.solver?.name || null,
      supervisor_name: issue.supervisor_name || issue.raised_by?.name || 'N/A'
    }));
    return { success: true, data: { ...data, items } };
  } catch (error) {
    return { success: false, error: 'Failed' };
  }
};

export const fetchPendingIssuesCard = async (params) => {
  try {
    const response = await api.get('/api/v1/dashboard-cards/pending-issues', { params });
    const data = response.data;
    const items = (data.items || []).map(issue => ({
      ...issue,
      solver_name: issue.solver_name || issue.assignments?.[0]?.solver_name || issue.solver?.name || null,
      supervisor_name: issue.supervisor_name || issue.raised_by?.name || 'N/A'
    }));
    return { success: true, data: { ...data, items } };
  } catch (error) {
    return { success: false, error: 'Failed' };
  }
};

export const fetchEscalatedIssuesCard = async (params) => {
  try {
    const response = await api.get('/api/v1/dashboard-cards/escalated', { params });
    const data = response.data;
    const items = (data.items || []).map(issue => ({
      ...issue,
      solver_name: issue.solver_name || issue.assignments?.[0]?.solver_name || issue.solver?.name || null,
      supervisor_name: issue.supervisor_name || issue.raised_by?.name || 'N/A'
    }));
    return { success: true, data: { ...data, items } };
  } catch (error) {
    return { success: false, error: 'Failed' };
  }
};

export const fetchResolvedPendingIssuesCard = async (params) => {
  try {
    const response = await api.get('/api/v1/dashboard-cards/resolved-pending-review', { params });
    const data = response.data;
    const items = (data.items || []).map(issue => ({
      ...issue,
      solver_name: issue.solver_name || issue.assignments?.[0]?.solver_name || issue.solver?.name || null,
      supervisor_name: issue.supervisor_name || issue.raised_by?.name || 'N/A'
    }));
    return { success: true, data: { ...data, items } };
  } catch (error) {
    return { success: false, error: 'Failed' };
  }
};

export const fetchDashboardCardIssueDetail = async (cardType, issueId) => {
  try {
    const response = await api.get(`/api/v1/dashboard-cards/${cardType}/${issueId}`);
    return { success: true, issue: response.data };
  } catch (error) {
    return { success: false, error: 'Failed' };
  }
};

// ==================== SUPERVISORS API (TEMPORARY MOCK) ====================

export const fetchSupervisors = async () => {
  console.warn('[BACKEND-GAP] supervisors/list: using temporary mock data');
  const supervisors = mockUsers.filter(u => u.role === 'supervisor');
  return { success: true, supervisors };
};

export const fetchSupervisorById = async (id) => {
  console.warn('[BACKEND-GAP] supervisors/detail: using temporary mock data');
  const supervisor = mockUsers.find(u => String(u.id) === String(id));
  return { success: true, supervisor };
};

// ==================== SITES & OTHERS ====================

export const fetchSitesAnalytics = async () => {
  try {
    const response = await api.get('/api/v1/sites/analytics');
    // Backend returns { total, sites: [...] } — extract the array
    const raw = response.data;
    const rawSites = Array.isArray(raw) ? raw : Array.isArray(raw?.sites) ? raw.sites : [];
    
    // Normalize: backend list endpoint returns SiteListItem (score/health at top level)
    // but frontend expects SiteWithAnalytics shape (analytics sub-object).
    // Handle both shapes so the frontend always gets a consistent structure.
    const sites = rawSites.map(site => {
      if (site.analytics) return site; // Already has analytics sub-object
      return {
        ...site,
        analytics: {
          health: site.health || 'Healthy',
          score: site.score ?? 100,
          total_issues: site.total_issues || 0,
          open_issues: site.open_issues || 0,
          assigned_issues: site.assigned_issues || 0,
          in_progress_issues: site.in_progress_issues || 0,
          completed_issues: site.completed_issues || 0,
          escalated_issues: site.escalated_issues || 0,
          reopened_issues: site.reopened_issues || 0,
          overdue_count: site.overdue_count || 0,
          complaints_count: site.complaints_count || 0,
          solvers: site.solvers || [],
        },
      };
    });
    
    return { success: true, sites };
  } catch (error) {
    return { success: false, sites: [] };
  }
};

// For backward compatibility
export const fetchSites = fetchSitesAnalytics;

export const fetchComplaints = async ({ cursor = null, limit = 20, issue_id = null, solver_id = null } = {}) => {
  try {
    const params = { limit };
    if (cursor) params.cursor = cursor;
    if (issue_id) params.issue_id = issue_id;
    if (solver_id) params.solver_id = solver_id;

    const response = await api.get('/api/v1/complaints', { params });
    // CursorPage returns { items, next_cursor, has_more, total_returned }
    return { success: true, complaints: response.data };
  } catch (error) {
    console.error("fetchComplaints error:", error);
    return { success: false, complaints: { items: [], has_more: false } };
  }
};

export const fetchComplaintById = async (id) => {
  try {
    if (!id) throw new Error("Complaint ID is required");
    const response = await api.get(`/api/v1/complaints/${id}`);
    
    // Ensure the response data is a valid object
    if (!response.data || typeof response.data !== 'object') {
      throw new Error("Invalid response from server");
    }

    return { 
      success: true, 
      complaint: response.data 
    };
  } catch (error) {
    console.error(`fetchComplaintById(${id}) error:`, error.message);
    return { success: false, error: error.message || 'Failed to fetch complaint' };
  }
};

export const sendChatMessage = async (text, sessionId, currentIssueId, imageUrl, intent) => {
  try {
    const requestBody = { message: text, session_id: sessionId, issue_id: currentIssueId, image_url: imageUrl, intent: intent };
    const response = await api.post('/api/v1/chat/', requestBody);
    return { success: true, data: response.data };
  } catch (error) {
    return { success: false };
  }
};

export const sendChatWithImage = async ({ text, sessionId, imageUri, intent }) => {
  try {
    // If imageUri is provided, we might need to upload it first if it's a local path
    // For now, assuming it's already a URL or the backend handles it.
    // If it's a local path (starts with file://), you should call uploadImageToImageKit first.
    let finalImageUrl = imageUri;
    
    if (imageUri && (imageUri.startsWith('file://') || imageUri.startsWith('content://'))) {
      const uploadRes = await uploadImageToImageKit(imageUri);
      if (uploadRes.success) {
        finalImageUrl = uploadRes.url;
      }
    }

    return await sendChatMessage(text, sessionId, null, finalImageUrl, intent);
  } catch (error) {
    console.error("sendChatWithImage error:", error);
    return { success: false };
  }
};

export default {
  loginUser, getCurrentUser, logoutUser, isAuthenticated, getStoredUser,
  fetchIssues, fetchIssueById, fetchIssueTimeline, fetchDashboardStats, fetchSolversPerformanceAPI,
  fetchResolvedIssuesCard, fetchPendingIssuesCard, fetchEscalatedIssuesCard, fetchResolvedPendingIssuesCard, fetchDashboardCardIssueDetail,
  fetchSupervisors, fetchSupervisorById, fetchSites, fetchSitesAnalytics, fetchComplaints, fetchComplaintById, sendChatMessage, sendChatWithImage
};