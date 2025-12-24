import axios from 'axios';

// API configuration
export const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

// We'll store the refresh token function here to avoid circular dependencies
let refreshTokenFunction = null;

// This function will be called by auth.js to set the refresh token function
export const setRefreshToken = (fn) => {
  refreshTokenFunction = fn;
};

// Create axios instance with default config
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  withCredentials: true,
  timeout: 10000, // 10 seconds
});

// Request interceptor for API calls
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    
    // Log request in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[API] ${config.method?.toUpperCase() || 'GET'} ${config.url}`, {
        headers: config.headers,
        data: config.data,
        params: config.params,
      });
    }
    
    return config;
  },
  (error) => {
    console.error('[API] Request error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for API calls
api.interceptors.response.use(
  (response) => {
    // Log successful response in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[API] ${response.config.method?.toUpperCase() || 'GET'} ${response.config.url} - ${response.status}`, {
        data: response.data,
        headers: response.headers,
      });
    }
    return response;
  },
  async (error) => {
    // If there's no response, it's a network error
    if (!error.response) {
      console.error('[API] Network error:', error.message);
      return Promise.reject(error);
    }

    const originalRequest = error.config;
    
    // Log error response
    console.error('[API] Response error:', {
      url: originalRequest?.url,
      method: originalRequest?.method,
      status: error.response?.status,
      data: error.response?.data,
    });

    // Handle 401 Unauthorized
    if (error.response?.status === 401 && !originalRequest._retry && refreshTokenFunction) {
      originalRequest._retry = true;
      
      try {
        // Try to refresh the token using the provided function
        const { access_token } = await refreshTokenFunction();
        
        if (access_token) {
          // Update the authorization header
          originalRequest.headers['Authorization'] = `Bearer ${access_token}`;
          
          // Retry the original request with the new token
          return api(originalRequest);
        }
      } catch (refreshError) {
        console.error('[API] Token refresh failed:', refreshError);
        // Clear tokens and redirect to login
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        window.location.href = '/login';
      }
    }
    
    return Promise.reject(error);
  }
);

// Helper function to get auth headers
export const getAuthHeaders = () => {
  const token = localStorage.getItem('access_token');
  return {
    'Authorization': token ? `Bearer ${token}` : '',
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };
};

// Helper function to make authenticated requests
export const fetchWithAuth = async (url, options = {}) => {
  const headers = {
    'Content-Type': 'application/json',
    ...getAuthHeaders(),
    ...(options.headers || {})
  };

  try {
    const response = await api({
      url,
      ...options,
      headers,
    });
    return response.data;
  } catch (error) {
    console.error('[API] fetchWithAuth error:', error);
    throw error;
  }
};

// Export the API instance
export const appointmentApi = {
  // Create a new appointment
  createAppointment: async (appointmentData) => {
    return api.post('/api/appointments', appointmentData);
  },

  // Get available time slots for a given date
  getAvailableSlots: async (date) => {
    return api.get(
      `/api/appointments/availability?date=${date.toISOString().split('T')[0]}`
    );
  },

  // Get all appointments (for admin view)
  getAppointments: async (params = {}) => {
    return api.get('/api/appointments', { params });
  },

  // Update appointment status
  updateAppointmentStatus: async (appointmentId, status) => {
    return api.patch(`/api/appointments/${appointmentId}/status`, { status });
  },

  // Cancel an appointment
  cancelAppointment: async (appointmentId) => {
    return api.delete(`/api/appointments/${appointmentId}`);
  },
};

// Auth API
export const authApi = {
  login: async (credentials) => {
    return api.post('/auth/login', credentials);
  },
  
  // Refresh token is already imported and exported above
};

export default api;
