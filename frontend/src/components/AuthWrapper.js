import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/FirebaseAuthContext';
import { CircularProgress, Box } from '@mui/material';

const AuthWrapper = ({ children }) => {
  const { currentUser, loading } = useAuth();
  const isAuthenticated = !!currentUser;
  const isLoading = loading;
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      // If user is already authenticated, redirect to dashboard
      navigate('/admin/dashboard', { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate]);

  // Show loading state while checking auth status
  if (isLoading || isAuthenticated) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  // If not authenticated, show the login form
  return children;
};

export default AuthWrapper;
