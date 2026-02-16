import axios from 'axios';

// Configure backend URL - update this to your actual backend server
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';

const chatService = axios.create({
  baseURL: BACKEND_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for logging
chatService.interceptors.request.use(
  (config) => {
    console.log('[ChatService] Request:', {
      method: config.method.toUpperCase(),
      url: config.url,
      data: config.data,
    });
    return config;
  },
  (error) => {
    console.error('[ChatService] Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for logging and error handling
chatService.interceptors.response.use(
  (response) => {
    console.log('[ChatService] Response Success:', {
      status: response.status,
      data: response.data,
    });
    return response;
  },
  (error) => {
    console.error('[ChatService] Response Error:', {
      status: error.response?.status,
      message: error.message,
      data: error.response?.data,
    });
    return Promise.reject(error);
  }
);

/**
 * Send chat message to backend
 * @param {string} message - User's message/question
 * @param {string} userId - Optional user ID
 * @param {string} conversationId - Optional conversation ID
 * @returns {Promise} Backend response with bot answer
 */
export const sendChatMessage = async (message, userId = null, conversationId = null) => {
  try {
    const response = await chatService.post('/api/chatInput', {
      message
    });

    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    console.error('[ChatService] Error sending message:', error);
    return {
      success: false,
      error: error.response?.data?.detail || error.message || 'Unknown error occurred',
    };
  }
};

/**
 * Check backend health
 * @returns {Promise} Backend status
 */
export const checkBackendHealth = async () => {
  try {
    const response = await chatService.get('/api/health');
    return {
      success: true,
      status: response.data.status,
    };
  } catch (error) {
    console.error('[ChatService] Backend health check failed:', error);
    return {
      success: false,
      error: 'Backend is not responding',
    };
  }
};

export default chatService;
