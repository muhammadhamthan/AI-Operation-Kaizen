/**
 * Real API Service - Connects to PostgreSQL Backend
 * * All API calls to the FastAPI backend
 */

import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { withRetry } from '../utils/networkRetry';
import  { uploadImageToImageKit } from './imagekitService';

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
//   return 'http://localhost:8001/api';//https://api.kairoxaitech.com
// };

const backendUrl = 'https://api.kairoxaitech.com';


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

// NOTE: Login is mock-only for this build (user directive: "frontend only,
// use mock data"). The real backend call is preserved below, commented out,
// so the switch back is one-line when the AWS backend is production-ready.
// Every mock-backed call emits a [BACKEND-GAP] warn on first invocation.
import { users as mockUsers } from '../mocks/users';

let _mockLoginWarned = false;

/**
 * Login user with username and password (mock).
 *
 * Matches against `src/mocks/users.js`. Generates a fake JWT-shaped token
 * so the rest of the app (interceptors, storage, auth-gate) works unchanged.
 */
export const loginUser = async (username, password) => {
  if (!_mockLoginWarned) {
    // eslint-disable-next-line no-console
    console.warn('[BACKEND-GAP] auth/login: using mock users; switch api.js loginUser back to POST /api/v1/auth/login when AWS backend is ready');
    _mockLoginWarned = true;
  }

  // Simulated latency so redux loading states exercise correctly.
  await new Promise((r) => setTimeout(r, 250));

  const matched = mockUsers.find(
    (u) =>
      (u.username === username || u.phone === username || u.email === username) &&
      u.password === password
  );

  if (!matched) {
    return { success: false, error: 'Invalid credentials' };
  }

  // Fake bearer token — opaque string; interceptors only check truthiness.
  const access_token = `mock.${matched.id}.${Date.now()}`;

  // Strip password before persisting.
  // eslint-disable-next-line no-unused-vars
  const { password: _pw, ...safeUser } = matched;
  const user = { ...safeUser, avatar_url: safeUser.avatar };

  await AsyncStorage.setItem(TOKEN_KEY, access_token);
  await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));

  return {
    success: true,
    user: { ...user, avatar: user.avatar_url },
    token: access_token,
  };
};

// TODO(backend): restore the real call once AWS endpoint is live:
// export const loginUser = async (username, password) => {
//   try {
//     const response = await api.post('/api/v1/auth/login', { phone: username, password });
//     const { access_token, user } = response.data;
//     await AsyncStorage.setItem(TOKEN_KEY, access_token);
//     await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
//     return { success: true, user: { ...user, avatar: user.avatar_url }, token: access_token };
//   } catch (error) {
//     return { success: false, error: error.response?.data?.detail || 'Invalid credentials' };
//   }
// };

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
 * Fetch all issues using Cursor-Based Pagination
 */


// /**
//  * Fetch all issues using Cursor-Based Pagination
//  */
// export const fetchIssues = async (filters = {}) => {
//   try {
//     const queryParams = {};
    
//     // Map filters to match backend expectations exactly
//     if (filters.status) queryParams.status_filter = filters.status; 
//     if (filters.priority) queryParams.priority = filters.priority;
//     if (filters.site_id) queryParams.site_id = filters.site_id;
//     if (filters.search) queryParams.search = filters.search;
    
//     // 📍 THE FIX: Translate Redux cursor to Backend 'skip'
//     const limit = filters.limit || 10;
//     const currentSkip = filters.cursor ? parseInt(filters.cursor, 10) : 0;
    
//     queryParams.skip = currentSkip;
//     queryParams.limit = limit;

//     // Hit the exact URL that worked for you, passing params as an object
//     const response = await withRetry(
//       () => api.get('/api/v1/issues', { params: queryParams }),
//       { maxRetries: 2 }
//     );
    
//     const data = response.data;
    
//     // Extract the list of issues and total count
//     const rawItems = data.issues || data.items || [];
//     const totalItems = data.total || 0;

//     // 📍 Calculate Next Cursor for Redux
//     const nextSkip = currentSkip + limit;
//     const hasMore = nextSkip < totalItems;
//     const nextCursor = hasMore ? nextSkip.toString() : null;

//     // Map backend fields to frontend format
//     const issues = rawItems.map(issue => ({ 
//       ...issue,
//       site: { name: issue.site_name },
//       raised_by: { name: issue.supervisor_name }
//     }));

//     return {
//       success: true,
//       issues,
//       next_cursor: nextCursor, // Redux gets the stringified skip value
//       has_more: hasMore,
//     };
//   } catch (error) {
//     console.error('❌ Fetch issues error:', error.response?.data || error.message);
//     return {
//       success: false,
//       error: error.response?.data?.detail || 'Failed to fetch issues',
//       issues: [],
//       next_cursor: null,
//       has_more: false,
//     };
//   }
// };


export const fetchIssues = async (filters = {}) => {
  try {
    const queryParams = {};
    
    if (filters.status) queryParams.status_filter = filters.status;
    if (filters.priority) queryParams.priority = filters.priority;
    if (filters.site_id) queryParams.site_id = filters.site_id;
    if (filters.search) queryParams.search = filters.search;

    queryParams.limit = filters.limit || 10;

    // ✅ Correct cursor usage
    if (filters.cursor) {
      queryParams.cursor = filters.cursor;
    }

    const response = await api.get('/api/v1/issues', { params: queryParams });
    const data = response.data;

    const issues = (data.items || []).map(issue => ({
      ...issue,
      site: { name: issue.site_name },
      raised_by: { name: issue.supervisor_name }
    }));

    return {
      success: true,
      issues,
      next_cursor: data.next_cursor,
      has_more: data.has_more,
    };
  } catch (error) {
    return {
      success: false,
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

export const fetchComplaints = async ({ cursor = null, limit = 20 } = {}) => {
  try {
    const queryParams = { limit };
    
    // 📍 THE FIX: Translate Redux cursor to Backend 'skip'
    const currentSkip = cursor ? parseInt(cursor, 10) : 0;
    queryParams.skip = currentSkip;

    const response = await api.get('/api/v1/complaints', { params: queryParams });
    const data = response.data || {};
    
    const rawItems = data.complaints || data.items || [];
    const totalItems = data.total || 0;

    // 📍 Calculate Next Cursor for Redux
    const nextSkip = currentSkip + limit;
    const hasMore = nextSkip < totalItems;
    const nextCursor = hasMore ? nextSkip.toString() : null;

    // Return the whole object exactly as backend sent it
    const complaintsData = response.data || {};
    console.log(complaintsData)
    
    return {
      success: true,
      complaints: { 
        items: rawItems, 
        next_cursor: nextCursor, 
        has_more: hasMore 
      },
    };

  } catch (error) {
    console.error("❌ Fetch complaints error:", error.response?.data || error.message);
    return {
      success: false,
      complaints: { items: [], next_cursor: null, has_more: false },
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

// ==================== CHATBOT API ====================

/**
 * Send message to chatbot
 */
export const sendChatMessage = async (
  text,
  sessionId = null,
  currentIssueId = null,
  imageUrl = null, 
  intent = null 
) => {
  console.log('\n💬 ─── 1. SENDING CHAT MESSAGE ───');

  try {
    const requestBody = {
      message: text,
      session_id: sessionId,
      issue_id: currentIssueId,
      image_url: imageUrl, 
      metadata: {
        platform: Platform.OS,
        timestamp: new Date().toISOString(),
      },
      intent: intent
    };

    console.log('🚨 PROOF: THIS IS THE EXACT PAYLOAD WE ARE SENDING TO /api/v1/chat/ 🚨');
    console.log(JSON.stringify(requestBody, null, 2));

    const response = await api.post('/api/v1/chat/', requestBody);
    
    console.log('\n✅ Chat Response Success!');
    console.log('🚨 PROOF: THIS IS EXACTLY WHAT THE BACKEND RETURNED 🚨');
    console.log(JSON.stringify(response.data, null, 2));

    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    console.error("\n❌ Chat send error:", error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.detail || "Failed to send message",
    };
  }
};


export const sendChatWithImage = async ({
  text,
  sessionId,
  imageUri,
  intent,
  currentIssueId = null
}) => {
  console.log('\n🚀 ─── START: SEND CHAT WITH IMAGE FLOW ───');

  try {
    // 🟢 STEP 1: Send chat
    console.log('\n▶️ STEP 1: Sending text AND local imageUri to chat endpoint first...');
    const chatRes = await sendChatMessage(
      text,
      sessionId,
      currentIssueId,
      imageUri, 
      intent
    );

    if (!chatRes.success) {
      console.error('❌ Chat request failed. Aborting image upload.');
      return chatRes;
    }

    // 📍 CRITICAL CHECK: Extract the issue ID
    const rawData = chatRes.data || {};
    const issueId = rawData.issue_id || rawData.data?.issue_id || currentIssueId;
    
    console.log('\n▶️ STEP 1.5: Extracted Issue ID for Image Upload:', issueId);

    // 🟡 STEP 2: Handle image
    if (imageUri && issueId) {
      // 🔥 Decide image type
      let imageType = "BEFORE";
      if (intent === "complete_work") {
        imageType = "AFTER";
      }

      console.log(`\n▶️ STEP 2: Preparing to upload to ImageKit as [${imageType}] for Issue #${issueId}`);

      // 🟣 Upload to ImageKit
      let imageUrl;
      try {
        imageUrl = await uploadImageToImageKit(imageUri, issueId, imageType);
        console.log(`✅ SUCCESS: ImageKit returned CDN URL: ${imageUrl}`);
      } catch (ikError) {
        console.error('❌ FAILED: ImageKit Upload Crashed:', ikError);
        throw ikError; 
      }

      // 🔵 Save to DB
      console.log('\n▶️ STEP 3: Telling Backend to save CDN URL to database...');
      const dbPayload = {
        image_url: imageUrl,
        issue_id: issueId,
        image_type: imageType
      };

      try {
        const dbRes = await api.post('/api/v1/images/save', dbPayload);
        console.log(`✅ SUCCESS: Backend confirmed ${imageType} image saved! DB Response:`, dbRes.data);
      } catch (dbError) {
        console.error('❌ FAILED: Backend refused to save image to DB:', dbError.response?.data || dbError.message);
      }
      
    } else if (imageUri && !issueId) {
      console.warn('⚠️ WARNING: We sent the image, but the backend did not return an issue_id to upload it to!');
    } else {
      console.log('\nℹ️ No image attached. Skipping ImageKit steps.');
    }

    console.log('\n🏁 ─── END: SEND CHAT WITH IMAGE FLOW ───\n');
    return chatRes;

  } catch (error) {
    console.error("\n❌ FAILED: Fatal error in sendChatWithImage:", error);
    return { success: false };
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





/**
 * Fetch Pending Issues Card
 */
export const fetchPendingIssuesCard = async ({
  cursor = null,
  limit = 20,
  site_id = null,
  priority = null,
  search = null,
} = {}) => {
  console.log('\n⏳ ─── FETCH PENDING ISSUES ───');
  try {
    const params = { limit };
    if (cursor) params.cursor = cursor;
    if (site_id) params.site_id = site_id;
    if (priority) params.priority = priority;
    if (search) params.search = search;

    console.log('📤 [Request] Params:', params);
    console.log('🌐 [Network] GET /api/v1/dashboard-cards/pending-issues');

    const response = await api.get(
      '/api/v1/dashboard-cards/pending-issues',
      { params }
    );

    console.log('✅ [Success] Data received from backend:');
    console.log(`📊 Items count: ${response.data?.items?.length || 0}`);
    console.log(`👉 Next Cursor: ${response.data?.next_cursor}`);
    console.log(`🔄 Has More: ${response.data?.has_more}`);
    console.log('────────────────────────────────\n');

    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    console.error('\n❌ ─── FETCH PENDING FAILED ───');
    if (error.response) {
      console.error('🚨 Status:', error.response.status);
      console.error('🚨 Backend Error Data:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('🚨 Network/Axios Error:', error.message);
    }
    console.error('────────────────────────────────\n');

    return {
      success: false,
      data: { items: [], next_cursor: null, has_more: false },
    };
  }
};

/**
 * Fetch Resolved Issues Card
 */
/**
 * Fetch Resolved Issues Card
 */
export const fetchResolvedIssuesCard = async ({
  cursor = null,
  limit = 20,
  site_id = null,
  priority = null,
  search = null,
} = {}) => {
  console.log('\n🔍 ─── FETCH RESOLVED ISSUES ───');
  try {
    const params = { limit };
    if (cursor) params.cursor = cursor;
    if (site_id) params.site_id = site_id;
    if (priority) params.priority = priority;
    if (search) params.search = search;

    console.log('📤 [Request] Params:', params);
    console.log('🌐 [Network] GET /api/v1/dashboard-cards/resolved');

    const response = await api.get(
      '/api/v1/dashboard-cards/resolved/',
      { params }
    );

    console.log('✅ [Success] Data received from backend:');
    console.log(`📊 Items count: ${response.data?.items?.length || 0}`);
    console.log(`👉 Next Cursor: ${response.data?.next_cursor}`);
    console.log(`🔄 Has More: ${response.data?.has_more}`);
    console.log('────────────────────────────────\n');

    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    console.error('\n❌ ─── FETCH RESOLVED FAILED ───');
    if (error.response) {
      console.error('🚨 Status:', error.response.status);
      console.error('🚨 Backend Error Data:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('🚨 Network/Axios Error:', error.message);
    }
;
    console.error('────────────────────────────────\n');

    return {
      success: false,
      data: { items: [], next_cursor: null, has_more: false },
    };
  }
}
/**
 * Fetch Escalated Issues Card
 */
/**
 * Fetch Escalated Issues Card
 */
export const fetchEscalatedIssuesCard = async ({
  cursor = null,
  limit = 20,
  site_id = null,
  priority = null,
  search = null,
} = {}) => {
  console.log('\n🔥 ─── FETCH ESCALATED ISSUES ───');
  try {
    const params = { limit };
    if (cursor) params.cursor = cursor;
    if (site_id) params.site_id = site_id;
    if (priority) params.priority = priority;
    if (search) params.search = search;

    console.log('📤 [Request] Params:', params);
    console.log('🌐 [Network] GET /api/v1/dashboard-cards/escalated');

    const response = await api.get(
      '/api/v1/dashboard-cards/escalated',
      { params }
    );

    console.log('✅ [Success] Data received from backend:');
    console.log(`📊 Items count: ${response.data?.items?.length || 0}`);
    console.log(`👉 Next Cursor: ${response.data?.next_cursor}`);
    console.log(`🔄 Has More: ${response.data?.has_more}`);
    console.log('────────────────────────────────\n');

    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    console.error('\n❌ ─── FETCH ESCALATED FAILED ───');
    if (error.response) {
      console.error('🚨 Status:', error.response.status);
      console.error('🚨 Backend Error Data:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('🚨 Network/Axios Error:', error.message);
    }
    console.error('────────────────────────────────\n');

    return {
      success: false,
      data: { items: [], next_cursor: null, has_more: false },
    };
  }
};



/**
 * Fetch Resolved Pending Review Issues Card
 */
export const fetchResolvedPendingIssuesCard = async ({
  cursor = null,
  limit = 20,
  site_id = null,
  priority = null,
  search = null,
} = {}) => {
  console.log('\n👀 ─── FETCH RESOLVED PENDING REVIEW ISSUES ───');
  try {
    const params = { limit };
    if (cursor) params.cursor = cursor;
    if (site_id) params.site_id = site_id;
    if (priority) params.priority = priority;
    if (search) params.search = search;

    console.log('📤 [Request] Params:', params);
    console.log('🌐 [Network] GET /api/v1/dashboard-cards/resolved-pending-review');

    const response = await api.get(
      '/api/v1/dashboard-cards/resolved-pending-review',
      { params }
    );

    console.log('✅ [Success] Data received from backend:');
    console.log(`📊 Items count: ${response.data?.items?.length || 0}`);
    console.log(`👉 Next Cursor: ${response.data?.next_cursor}`);
    console.log(`🔄 Has More: ${response.data?.has_more}`);
    console.log('────────────────────────────────\n');

    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    console.error('\n❌ ─── FETCH RESOLVED PENDING REVIEW FAILED ───');
    if (error.response) {
      console.error('🚨 Status:', error.response.status);
      console.error('🚨 Backend Error Data:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('🚨 Network/Axios Error:', error.message);
    }
    console.error('────────────────────────────────\n');

    return {
      success: false,
      data: { items: [], next_cursor: null, has_more: false },
    };
  }
};

/**
 * Fetch specific Dashboard Card Issue Detail
 * Routes dynamically to the role-aware dashboard endpoints.
 * @param {string} cardType - 'pending-issues', 'resolved', 'escalated', or 'resolved-pending-review'
 * @param {number} issueId 
 */
export const fetchDashboardCardIssueDetail = async (cardType, issueId) => {
  console.log(`\n📄 ─── FETCH DASHBOARD CARD DETAIL (${cardType.toUpperCase()}) ───`);
  try {
    console.log(`🌐 [Network] GET /api/v1/dashboard-cards/${cardType}/${issueId}`);
    
    const response = await api.get(`/api/v1/dashboard-cards/${cardType}/${issueId}`);

    console.log('✅ [Success] Detail data received successfully');
    
    // Map backend fields to frontend format identically to fetchIssueById
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
    console.error('\n❌ ─── FETCH CARD DETAIL FAILED ───');
    if (error.response) {
      console.error('🚨 Status:', error.response.status);
      console.error('🚨 Error Data:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('🚨 Network Error:', error.message);
    }
    console.error('────────────────────────────────\n');
    
    return {
      success: false,
      error: error.response?.data?.detail || 'Failed to fetch issue detail',
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


  //pending issues, resolved issues, escalatedIssues

  fetchPendingIssuesCard,
  fetchResolvedIssuesCard,
  fetchEscalatedIssuesCard,

  
  fetchResolvedPendingIssuesCard,
  fetchDashboardCardIssueDetail
};