// Store the JWT token in localStorage
export const setAuthToken = (token) => {
  localStorage.setItem('authToken', token);};

// Get the stored JWT token
export const getAuthToken = () => {
  return localStorage.getItem('authToken');};

// Remove the JWT token
// export const removeAuthToken = () => {
//   localStorage.removeItem('authToken');
// };

// Check if the user is authenticated
export const isAuthenticated = () => {
  const token = getAuthToken();
  if (!token) return false;

  try {
    // Decode the token to check expiration
    const decoded = JSON.parse(atob(token.split('.')[1]));
    return decoded.exp * 1000 > Date.now();
  } catch (e) {
    return false;
  }
};
