import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/FirebaseAuthContext';
import { CircularProgress, Box, Typography } from '@mui/material';

const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { currentUser } = useAuth();
  const location = useLocation();
  const [loading, setLoading] = React.useState(true);

  // Check auth state on component mount
  React.useEffect(() => {
    // Set a small timeout to prevent flash of loading screen
    const timer = setTimeout(() => {
      setLoading(false);
    }, 300);
    
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    // Show a loading spinner while checking authentication
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
        flexDirection="column"
      >
        <CircularProgress size={60} thickness={4} />
        <Typography variant="h6" mt={2} color="textSecondary">
          Verifying your session...
        </Typography>
      </Box>
    );
  }

  if (!currentUser) {
    // Redirect to login page, but save the current location they were trying to go to
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check if user has the required role (if specified)
  // Note: You'll need to implement role-based access control with Firebase
  // This is a basic implementation that assumes all authenticated users have access
  // You can enhance this with custom claims in Firebase Auth or by storing roles in Firestore
  if (allowedRoles.length > 0) {
    // Example: Check user role from custom claims or Firestore
    // const userRole = await getUserRole(currentUser.uid);
    // if (!allowedRoles.includes(userRole)) {
    //   return (
    //     <Navigate 
    //       to="/unauthorized" 
    //       state={{ 
    //         from: location,
    //         message: 'You do not have permission to access this page.'
    //       }} 
    //       replace 
    //     />
    //   );
    // }
  }

  // User is authenticated and has the required role
  return children;
};

export default ProtectedRoute;
