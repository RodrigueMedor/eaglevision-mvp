import React, { createContext, useState, useContext, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const AuthContext = createContext(null);

// Session timeout settings
const DEFAULT_SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
const REMEMBER_ME_SESSION_TIMEOUT = 30 * 24 * 60 * 60 * 1000; // 30 days

// Move isRememberMeEnabled outside the component to avoid initialization issues
const isRememberMeEnabled = () => {
  return localStorage.getItem('remember_me') === '1';
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';
  const logoutTimer = useRef(null);
  const logoutRef = useRef(null);
  
  // Get session timeout based on remember me setting
  const getSessionTimeout = useCallback(() => {
    return isRememberMeEnabled() ? REMEMBER_ME_SESSION_TIMEOUT : DEFAULT_SESSION_TIMEOUT;
  }, []);

  // Initialize axios instance with auth token
  const api = axios.create({
    baseURL: API_URL,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // Create a ref for the logout function to break the circular dependency
  const logout = useCallback(() => {
    // Clear tokens and user data
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('last_activity');
    setUser(null);

    // Clear any existing timers
    if (logoutTimer.current) {
      clearTimeout(logoutTimer.current);
      logoutTimer.current = null;
    }

    // Redirect to login page
    navigate('/login');
  }, [navigate]);

  // Store the logout function in a ref
  useEffect(() => {
    logoutRef.current = logout;
  }, [logout]);

  // Function to update activity timestamp
  const updateActivity = useCallback(() => {
    const now = Date.now();
    localStorage.setItem('last_activity', now.toString());
    console.log('Activity updated at:', new Date(now).toISOString());
  }, []);

  // Function to handle successful login
  const handleLoginSuccess = useCallback(({ access_token, refresh_token, user }) => {
    if (access_token && refresh_token) {
      localStorage.setItem('access_token', access_token);
      localStorage.setItem('refresh_token', refresh_token);
      updateActivity();
      setUser(user);
      setError(null);
      return true;
    }
    return false;
  }, [updateActivity]);


  // Function to check authentication status
  const checkAuth = useCallback(async () => {
    setIsLoading(true);
    const token = localStorage.getItem('access_token');
    const refreshToken = localStorage.getItem('refresh_token');
    const lastActivity = localStorage.getItem('last_activity');

    // If no tokens exist, set loading to false and return
    if (!token || !refreshToken) {
      console.log('No valid tokens found');
      setIsLoading(false);
      return false;
    }

    // Check if session is expired
    const now = Date.now();
    const lastActivityTime = lastActivity ? parseInt(lastActivity, 10) : 0;
    const timeSinceLastActivity = now - lastActivityTime;
    
    // If we're within the session window, try to use the current token
    const sessionTimeout = getSessionTimeout();
    if (timeSinceLastActivity < sessionTimeout) {
      try {
        // Try to fetch user data with the current token
        const response = await api.get('/auth/me');
        setUser(response.data);
        updateActivity();
        setIsLoading(false);
        return true;
      } catch (err) {
        console.log('Failed to fetch user with current token, trying refresh...');
        // Continue to refresh token flow
      }
    }

    // If we get here, either the session expired or the current token is invalid
    // Try to refresh the token
    try {
      console.log('Attempting to refresh token...');
      const response = await axios.post(
        `${API_URL}/auth/refresh-token`,
        { refresh_token: refreshToken },
        { 
          headers: { 
            'Content-Type': 'application/json'
          } 
        }
      );
      
      const { access_token, refresh_token, user } = response.data;
      
      // If we got new tokens, update them
      if (access_token) {
        localStorage.setItem('access_token', access_token);
        if (refresh_token) {
          localStorage.setItem('refresh_token', refresh_token);
        }
        updateActivity();
        
        // If we have user data, update the user state
        if (user) {
          setUser(user);
        } else {
          // If no user data in response, fetch it
          const userResponse = await api.get('/auth/me');
          setUser(userResponse.data);
        }
        
        setIsLoading(false);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Token refresh failed:', error);
      // Clear all auth data on error
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('last_activity');
      setUser(null);
      setError('Your session has expired. Please log in again.');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [API_URL]);

  // Store the logout function in a ref
  useEffect(() => {
    logoutRef.current = logout;
  }, [logout]);

  // Function to handle user activity
  const resetInactivityTimer = useCallback(() => {
    // Clear existing timer
    if (logoutTimer.current) {
      clearTimeout(logoutTimer.current);
    }

    // Get the appropriate timeout based on remember me setting
    const sessionTimeout = isRememberMeEnabled() ? REMEMBER_ME_SESSION_TIMEOUT : DEFAULT_SESSION_TIMEOUT;

    // Set new timer
    logoutTimer.current = setTimeout(() => {
      console.log('User inactive, logging out...');
      if (logoutRef.current) {
        logoutRef.current();
      }
    }, sessionTimeout);
  }, [isRememberMeEnabled]);

  // Set up event listeners for user activity
  useEffect(() => {
    if (user) {
      // Add event listeners when user is logged in
      const events = ['mousemove', 'keydown', 'mousedown', 'scroll', 'touchstart', 'click', 'input'];
      const handleActivity = () => {
        updateActivity();
        resetInactivityTimer();
      };
      
      events.forEach(event => window.addEventListener(event, handleActivity));
      
      // Start the timer
      resetInactivityTimer();
      console.log('Activity listeners initialized');

      // Clean up event listeners and timer
      return () => {
        events.forEach(event => window.removeEventListener(event, handleActivity));
        if (logoutTimer.current) {
          clearTimeout(logoutTimer.current);
        }
      };
    }
  }, [user, resetInactivityTimer, updateActivity]);

  // Add request interceptor to add auth token to requests
  api.interceptors.request.use(
    (config) => {
      const token = localStorage.getItem('access_token');
      if (token) {
        config.headers['Authorization'] = `Bearer ${token}`;
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  // Add response interceptor to handle token refresh
  api.interceptors.response.use(
    (response) => response,
    async (error) => {
      // Handle network errors (CORS, no internet, etc.)
      if (!error.response) {
        console.error('Network error:', error.message);
        return Promise.reject(error);
      }

      const originalRequest = error.config;

      // If error is 401 and we haven't tried to refresh yet
      if (error.response?.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;

        try {
          const refreshToken = localStorage.getItem('refresh_token');
          if (!refreshToken) {
            // No refresh token, log out
            logout();
            return Promise.reject(error);
          }

          // Try to refresh the token
          const response = await axios.post(`${API_URL}/auth/refresh-token`, {
            refresh_token: refreshToken
          });

          const { access_token, refresh_token } = response.data;

          // Update tokens in localStorage
          localStorage.setItem('access_token', access_token);
          if (refresh_token) {
            localStorage.setItem('refresh_token', refresh_token);
          }

          // Update the authorization header
          originalRequest.headers['Authorization'] = `Bearer ${access_token}`;

          // Retry the original request
          return api(originalRequest);
        } catch (err) {
          // Refresh token failed, log out
          logout();
          return Promise.reject(err);
        }
      }

      return Promise.reject(error);
    }
  );

  // Initial authentication check on app load
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Check for existing session
        const token = localStorage.getItem('access_token');
        const refreshToken = localStorage.getItem('refresh_token');
        
        if (token && refreshToken) {
          // We have tokens, verify them
          const isValid = await checkAuth();
          
          if (isValid) {
            console.log('Session restored successfully');
          } else {
            console.log('Session expired or invalid, redirecting to login');
            navigate('/login');
          }
        } else {
          // No tokens, only redirect to login if we're on a protected route
          const isProtectedRoute = window.location.pathname.startsWith('/admin');
          if (isProtectedRoute && window.location.pathname !== '/login') {
            navigate('/login');
          }
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        setIsLoading(false);
      }
    };

    initializeAuth();

    // Set up activity listeners
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    const handleActivity = () => {
      updateActivity();
      resetInactivityTimer();
    };

    events.forEach(event => window.addEventListener(event, handleActivity));
    
    return () => {
      events.forEach(event => window.removeEventListener(event, handleActivity));
      if (logoutTimer.current) {
        clearTimeout(logoutTimer.current);
      }
    };
  }, [checkAuth, navigate, resetInactivityTimer, updateActivity]);

  // Handle token refresh on focus
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        const lastActivity = localStorage.getItem('last_activity');
        if (lastActivity) {
          const timeSinceLastActivity = Date.now() - parseInt(lastActivity, 10);
          const sessionTimeout = getSessionTimeout();
          
          // If we're within 5 minutes of the session timeout, refresh the token
          if (timeSinceLastActivity > (sessionTimeout - 5 * 60 * 1000)) {
            console.log('Window focused, refreshing token...');
            try {
              await checkAuth();
            } catch (error) {
              console.error('Error refreshing token on focus:', error);
            }
          }
        }
      }
    };

    window.addEventListener('visibilitychange', handleVisibilityChange);
    return () => window.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [checkAuth, getSessionTimeout]);

  const login = async (email, password, rememberMe = false) => {
    try {
      setError(null);
      setIsLoading(true);
      
      // Use the login-json endpoint instead of token endpoint
      const response = await api.post('/auth/login-json', {
        username: email,
        password: password,
        remember_me: rememberMe
      }, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const { access_token, refresh_token, user: userData, remember_me } = response.data;

      if (!access_token) {
        throw new Error('No access token received');
      }

      console.log('Login successful, tokens received');
      
      // Store tokens in localStorage
      localStorage.setItem('access_token', access_token);
      if (refresh_token) {
        localStorage.setItem('refresh_token', refresh_token);
      }
      
      // Store remember_me preference
      localStorage.setItem('remember_me', remember_me ? '1' : '0');

      // Store login timestamp
      updateActivity();

      // Set user data
      setUser(userData);
      
      console.log('User data set:', userData);

      // Reset inactivity timer with appropriate timeout
      resetInactivityTimer();

      return userData;
    } catch (err) {
      console.error('Login error:', err);
      const errorMessage = err.response?.data?.detail || 'Login failed. Please check your credentials.';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const register = async (userData) => {
    try {
      setError(null);
      const response = await api.post('/auth/register', userData);
      
      // Auto-login after registration
      if (userData.password) {
        await login(userData.email, userData.password);
      }
      
      return response.data;
    } catch (err) {
      console.error('Registration error:', err);
      const errorMessage = err.response?.data?.detail || 'Registration failed. Please try again.';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const value = {
    user,
    isAuthenticated: !!user,
    isLoading,
    error,
    setError, // Expose setError to allow components to clear errors
    login,
    logout,
    register,
    api, // Export the configured axios instance
  };

  return (
    <AuthContext.Provider value={value}>
      {!isLoading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
