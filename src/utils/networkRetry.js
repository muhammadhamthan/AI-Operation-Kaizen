/**
 * Network Retry Utility with Exponential Backoff
 * 
 * Features:
 * - Configurable max retries
 * - Exponential backoff with jitter
 * - Retry only on network errors or 5xx responses
 * - Progress callback for UI updates
 */

const DEFAULT_CONFIG = {
  maxRetries: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 30000, // 30 seconds
  retryOn: [408, 500, 502, 503, 504], // HTTP status codes to retry
};

/**
 * Calculate delay with exponential backoff and jitter
 */
const calculateDelay = (attempt, baseDelay, maxDelay) => {
  // Exponential backoff: baseDelay * 2^attempt
  const exponentialDelay = baseDelay * Math.pow(2, attempt);
  // Add jitter (random factor between 0.5 and 1.5)
  const jitter = 0.5 + Math.random();
  const delay = Math.min(exponentialDelay * jitter, maxDelay);
  return Math.round(delay);
};

/**
 * Check if error is retryable
 */
const isRetryableError = (error, retryOn) => {
  // Network errors (no response)
  if (!error.response) {
    return error.message === 'Network Error' || 
           error.code === 'ECONNABORTED' ||
           error.code === 'ETIMEDOUT' ||
           error.message.includes('timeout');
  }
  
  // HTTP status codes
  if (error.response?.status) {
    return retryOn.includes(error.response.status);
  }
  
  return false;
};

/**
 * Execute a function with retry logic
 * 
 * @param {Function} fn - Async function to execute
 * @param {Object} config - Configuration options
 * @param {Function} onRetry - Callback called on each retry (attempt, delay, error)
 * @returns {Promise} - Result of the function
 */
export const withRetry = async (fn, config = {}, onRetry = null) => {
  const { maxRetries, baseDelay, maxDelay, retryOn } = { ...DEFAULT_CONFIG, ...config };
  let lastError;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      // Check if we should retry
      if (attempt < maxRetries && isRetryableError(error, retryOn)) {
        const delay = calculateDelay(attempt, baseDelay, maxDelay);
        
        // Call retry callback if provided
        if (onRetry) {
          onRetry(attempt + 1, delay, error);
        }
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        throw error;
      }
    }
  }
  
  throw lastError;
};

/**
 * Create a retryable API client
 * 
 * @param {Function} apiCall - The API call function
 * @param {Object} config - Retry configuration
 * @returns {Function} - Wrapped function with retry logic
 */
export const createRetryableApi = (apiCall, config = {}) => {
  return async (...args) => {
    return withRetry(() => apiCall(...args), config);
  };
};

/**
 * Retry queue for offline operations
 */
class RetryQueue {
  constructor() {
    this.queue = [];
    this.isProcessing = false;
  }
  
  add(operation) {
    this.queue.push({
      id: Date.now().toString(),
      operation,
      retries: 0,
      createdAt: new Date().toISOString(),
    });
  }
  
  async processQueue(isOnline) {
    if (!isOnline || this.isProcessing || this.queue.length === 0) {
      return;
    }
    
    this.isProcessing = true;
    
    while (this.queue.length > 0 && isOnline) {
      const item = this.queue[0];
      
      try {
        await withRetry(item.operation, { maxRetries: 2 });
        this.queue.shift(); // Remove successful item
      } catch (error) {
        item.retries++;
        if (item.retries >= 3) {
          this.queue.shift(); // Remove failed item after max retries
          console.error('Operation failed after max retries:', error);
        } else {
          break; // Stop processing, will retry later
        }
      }
    }
    
    this.isProcessing = false;
  }
  
  getQueueSize() {
    return this.queue.length;
  }
  
  clearQueue() {
    this.queue = [];
  }
}

export const retryQueue = new RetryQueue();

export default {
  withRetry,
  createRetryableApi,
  retryQueue,
};
