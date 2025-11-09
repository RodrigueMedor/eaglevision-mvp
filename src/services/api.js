// API service for handling all API calls
const API_BASE_URL = 'https://api.eaglevisiontax.com'; // Replace with your actual API URL

// Helper function to handle API responses
const handleResponse = async (response) => {
  const data = await response.json();
  if (!response.ok) {
    const error = new Error(data.message || 'Something went wrong');
    error.status = response.status;
    throw error;
  }
  return data;
};

// Appointment API
export const appointmentApi = {
  // Create a new appointment
  createAppointment: async (appointmentData) => {
    const response = await fetch(`${API_BASE_URL}/api/appointments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(appointmentData),
    });
    return handleResponse(response);
  },

  // Get available time slots for a given date
  getAvailableSlots: async (date) => {
    const response = await fetch(
      `${API_BASE_URL}/api/appointments/availability?date=${date.toISOString().split('T')[0]}`
    );
    return handleResponse(response);
  },

  // Get all appointments (for admin view)
  getAppointments: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const response = await fetch(`${API_BASE_URL}/api/appointments?${query}`);
    return handleResponse(response);
  },

  // Update appointment status
  updateAppointmentStatus: async (appointmentId, status) => {
    const response = await fetch(`${API_BASE_URL}/api/appointments/${appointmentId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status }),
    });
    return handleResponse(response);
  },

  // Cancel an appointment
  cancelAppointment: async (appointmentId) => {
    const response = await fetch(`${API_BASE_URL}/api/appointments/${appointmentId}`, {
      method: 'DELETE',
    });
    return handleResponse(response);
  },
};

// Add more API services as needed
export const authApi = {
  login: async (credentials) => {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    });
    return handleResponse(response);
  },

  // Add other auth-related methods
};

// Add more API services as needed (e.g., for services, users, etc.)
