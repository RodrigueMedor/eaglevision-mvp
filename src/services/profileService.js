import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  };
};

const getFormDataHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'multipart/form-data',
    },
  };
};

export const getProfile = async () => {
  try {
    const response = await axios.get(`${API_URL}/api/profile`, getAuthHeaders());
    return response.data;
  } catch (error) {
    console.error('Error fetching profile:', error);
    throw error;
  }
};

export const updateProfile = async (profileData) => {
  try {
    const response = await axios.put(
      `${API_URL}/api/profile`,
      profileData,
      getAuthHeaders()
    );
    return response.data;
  } catch (error) {
    console.error('Error updating profile:', error);
    throw error;
  }
};

export const changePassword = async (currentPassword, newPassword) => {
  try {
    const response = await axios.post(
      `${API_URL}/api/profile/password`,
      { current_password: currentPassword, new_password: newPassword },
      getAuthHeaders()
    );
    return response.data;
  } catch (error) {
    console.error('Error changing password:', error);
    throw error;
  }
};

export const uploadProfilePicture = async (file) => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await axios.post(
      `${API_URL}/api/profile/picture`,
      formData,
      getFormDataHeaders()
    );
    return response.data;
  } catch (error) {
    console.error('Error uploading profile picture:', error);
    throw error;
  }
};

export const deleteProfilePicture = async () => {
  try {
    const response = await axios.delete(
      `${API_URL}/api/profile/picture`,
      getAuthHeaders()
    );
    return response.data;
  } catch (error) {
    console.error('Error deleting profile picture:', error);
    throw error;
  }
};
