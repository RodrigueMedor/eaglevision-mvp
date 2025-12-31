import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button, Typography, Container, Box, Paper } from '@mui/material';
import { useAuth } from '../context/AuthContext';

const Unauthorized = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const from = location.state?.from?.pathname || '/';
  const message = location.state?.message || 'You are not authorized to view this page.';

  const handleGoBack = () => {
    navigate(-1);
  };

  const handleGoHome = () => {
    navigate('/');
  };

  return (
    <Container component="main" maxWidth="md">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Paper elevation={3} sx={{ p: 4, width: '100%', textAlign: 'center' }}>
          <Typography component="h1" variant="h3" color="error" gutterBottom>
            403 - Unauthorized
          </Typography>
          
          <Typography variant="h6" color="textSecondary" paragraph>
            {message}
          </Typography>
          
          {user && (
            <Typography variant="body1" color="textSecondary" paragraph>
              Logged in as: <strong>{user.email}</strong> (Role: {user.role})
            </Typography>
          )}
          
          <Box sx={{ mt: 4, display: 'flex', justifyContent: 'center', gap: 2 }}>
            <Button 
              variant="outlined" 
              color="primary" 
              onClick={handleGoBack}
              sx={{ minWidth: 150 }}
            >
              Go Back
            </Button>
            
            <Button 
              variant="contained" 
              color="primary" 
              onClick={handleGoHome}
              sx={{ minWidth: 150 }}
            >
              Go to Home
            </Button>
          </Box>
          
          <Box sx={{ mt: 4, textAlign: 'left' }}>
            <Typography variant="subtitle2" color="textSecondary">
              Additional Information:
            </Typography>
            <Typography variant="body2" color="textSecondary" component="div" sx={{ mt: 1 }}>
              <ul>
                <li>You tried to access: <code>{from}</code></li>
                <li>If you believe this is an error, please contact support.</li>
                <li>Make sure you have the correct permissions to access this resource.</li>
              </ul>
            </Typography>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default Unauthorized;
