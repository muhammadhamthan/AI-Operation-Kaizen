// Network utilities with retry logic

const DEFAULT_RETRY_CONFIG = {
  maxAttempts: 4,
  baseDelay: 2000,
  maxDelay: 16000,
};

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export const isRetryableError = (error) => {
  // Retry on network errors and 5xx server errors
  if (!error.response) return true; // Network error
  const status = error.response?.status;
  if (status >= 500) return true;
  return false;
};

export const retryWithBackoff = async (fn, options = {}) => {
  const config = { ...DEFAULT_RETRY_CONFIG, ...options };
  let lastError;

  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      // Don't retry 401, 404, 400 errors
      if (error.response) {
        const status = error.response.status;
        if (status === 401 || status === 404 || status === 400) {
          throw error;
        }
      }

      if (attempt < config.maxAttempts && isRetryableError(error)) {
        const waitTime = Math.min(
          config.baseDelay * Math.pow(2, attempt - 1),
          config.maxDelay
        );
        console.log(`Retry attempt ${attempt} after ${waitTime}ms`);
        await delay(waitTime);
      }
    }
  }

  throw lastError;
};

export const checkNetworkConnectivity = async () => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    await fetch('https://www.google.com/generate_204', {
      method: 'HEAD',
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    return true;
  } catch {
    return false;
  }
};
