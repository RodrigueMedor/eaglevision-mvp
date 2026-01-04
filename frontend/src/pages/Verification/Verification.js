import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Box, CircularProgress, Typography, Button, Container, Paper } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import { setAuthToken } from '../../utils/auth';

const Verification = () => {
  const [status, setStatus] = useState('verifying');
  const [error, setError] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const verifyEmail = async () => {
      const params = new URLSearchParams(location.search);
      const token = params.get('token');

      if (!token) {
        setStatus('error');
        setError('No verification token provided');
        return;
      }

      try {
        // In a real app, you would verify the token with your backend
        // For now, we'll simulate a successful verification
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Store the token in localStorage
        setAuthToken(token);
        setStatus('success');
        
        // Redirect to the booking page after a short delay
        setTimeout(() => {
          navigate('/book-appointment');
        }, 2000);
        
      } catch (err) {
        console.error('Verification error:', err);
        setStatus('error');
        setError(err.message || 'Failed to verify email. Please try again.');
      }
    };

    verifyEmail();
  }, [location.search, navigate]);

  return (
    <Container maxWidth="sm" sx={{ mt: 8, mb: 8 }}>
      <Paper elevation={3} sx={{ p: 4, textAlign: 'center' }}>
        {status === 'verifying' && (
          <>
            <CircularProgress size={60} thickness={4} sx={{ mb: 3 }} />
            <Typography variant="h5" gutterBottom>
              Verifying your email...
            </Typography>
            <Typography color="textSecondary">
              Please wait while we verify your email address.
            </Typography>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircleIcon color="success" sx={{ fontSize: 60, mb: 2 }} />
            <Typography variant="h5" gutterBottom>
              Email Verified Successfully!
            </Typography>
            <Typography color="textSecondary" sx={{ mb: 3 }}>
              Your email has been verified. Redirecting you to the booking page...
            </Typography>
            <CircularProgress size={24} color="inherit" />
          </>
        )}

        {status === 'error' && (
          <>
            <ErrorIcon color="error" sx={{ fontSize: 60, mb: 2 }} />
            <Typography variant="h5" gutterBottom color="error">
              Verification Failed
            </Typography>
            <Typography color="textSecondary" sx={{ mb: 3 }}>
              {error || 'An error occurred during verification.'}
            </Typography>
            <Button 
              variant="contained" 
              color="primary" 
              onClick={() => window.location.href = '/'}
            >
              Return to Home
            </Button>
          </>
        )}
      </Paper>
    </Container>
  );
};

export default Verification;
