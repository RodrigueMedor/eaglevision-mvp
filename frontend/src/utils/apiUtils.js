// Cache configuration
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Simple in-memory cache
const cache = new Map();

export const getCached = (key) => {
  const entry = cache.get(key);
  if (!entry) return null;
  
  const { data, timestamp } = entry;
  if (Date.now() - timestamp > CACHE_TTL) {
    cache.delete(key);
    return null;
  }
  
  return data;
};

export const setCached = (key, data) => {
  cache.set(key, {
    data,
    timestamp: Date.now()
  });
};

// Exponential backoff for retries
export const withRetry = async (fn, retries = 3, delay = 1000) => {
  try {
    return await fn();
  } catch (error) {
    if (retries === 0) throw error;
    
    // Don't retry for these status codes
    if ([400, 401, 403, 404].includes(error.response?.status)) {
      throw error;
    }
    
    // Exponential backoff
    await new Promise(resolve => setTimeout(resolve, delay));
    return withRetry(fn, retries - 1, delay * 2);
  }
};
