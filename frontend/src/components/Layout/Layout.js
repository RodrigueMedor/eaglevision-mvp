import React, { useContext } from 'react';
import { Box } from '@mui/material';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Header from '../Header/Header';
import Footer from '../Footer/Footer';

const Layout = ({ children }) => {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();
  
  // Check if the current route is an admin route or if user is an admin
  const isAdminRoute = location.pathname.startsWith('/admin');
  const isAdminUser = isAuthenticated && user?.role === 'admin';
  
  // Don't show header/footer for admin users or on admin routes
  const hideLayout = isAdminRoute || isAdminUser;

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        backgroundColor: '#ffffff',
      }}
    >
      {!hideLayout && <Header />}
      <Box
        component="main"
        sx={{
          flex: '1 0 auto',
          width: '100%',
          paddingBottom: hideLayout ? 0 : '60px', // No bottom padding for admin layout
          position: 'relative',
          zIndex: 1,
          backgroundColor: hideLayout ? 'transparent' : '#ffffff',
        }}
      >
        {children}
      </Box>
      {!hideLayout && (
        <Box sx={{
          flexShrink: 0,
          position: 'relative',
          zIndex: 2,
        }}>
          <Footer />
        </Box>
      )}
    </Box>
  );
};

export default Layout;
