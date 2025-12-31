import { API_URL, setRefreshToken } from './api';

// Import the api instance at the bottom of the file to avoid circular dependencies
let api;

// This will be called after the api is initialized
const initializeApi = (apiInstance) => {
  api = apiInstance;
};

// Register the refresh token function with the API service
const registerRefreshToken = () => {
  setRefreshToken(refreshToken);
};

/**
 * Refreshes the access token using the refresh token
 * @returns {Promise<{access_token: string, refresh_token: string}>}
 */
const refreshToken = async () => {
  try {
    const refreshToken = localStorage.getItem('refresh_token');
    console.log('Attempting to refresh token...');
    
    if (!refreshToken) {
      console.error('No refresh token available');
      throw new Error('No refresh token available');
    }

    const response = await api.post('/auth/refresh-token', 
      { refresh_token: refreshToken },
      {
        skipAuthRefresh: true // Prevent infinite loop if refresh token is invalid
      }
    );

    console.log('Refresh token response:', response.data);
    
    if (!response.data) {
      throw new Error('Empty response from refresh token endpoint');
    }

    const { access_token, refresh_token } = response.data;

    if (!access_token) {
      throw new Error('No access token in refresh response');
    }

    console.log('New access token received, updating localStorage...');
    
    // Update tokens in localStorage
    localStorage.setItem('access_token', access_token);
    if (refresh_token) {
      localStorage.setItem('refresh_token', refresh_token);
    }

    console.log('Token refresh successful');
    return { access_token, refresh_token };
  } catch (error) {
    console.error('Error refreshing token:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status
    });
    
    // Clear tokens on error
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    
    // Rethrow with a more descriptive error
    const errorMessage = error.response?.data?.detail || 'Failed to refresh token';
    throw new Error(errorMessage);
  }
};

/**
 * Clears all auth tokens
 */
const clearAuthTokens = () => {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
};

/**
 * Checks if the user is authenticated
 * @returns {boolean}
 */
const isAuthenticated = () => {
  return !!localStorage.getItem('access_token');
};

// Export all functions at once
export {
  refreshToken,
  clearAuthTokens,
  isAuthenticated,
  initializeApi,
  registerRefreshToken
};

// This will be called when the api is imported in the app
// to break the circular dependency
if (typeof window !== 'undefined') {
  // This will be executed in the browser environment
  import('./api').then(({ default: apiInstance }) => {
    initializeApi(apiInstance);
    registerRefreshToken();
  });
}
