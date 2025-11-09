import React from 'react';
import { Box } from '@mui/material';
import Header from '../Header/Header';
import Footer from '../Footer/Footer';

const Layout = ({ children }) => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        backgroundColor: '#ffffff',
      }}
    >
      <Header />
      <Box
        component="main"
        sx={{
          flex: '1 0 auto',
          width: '100%',
          paddingBottom: '60px', // Add padding at the bottom to prevent footer overlap
          position: 'relative',
          zIndex: 1,
        }}
      >
        {children}
      </Box>
      <Box sx={{
        flexShrink: 0,
        position: 'relative',
        zIndex: 2,
      }}>
        <Footer />
      </Box>
    </Box>
  );
};

export default Layout;
