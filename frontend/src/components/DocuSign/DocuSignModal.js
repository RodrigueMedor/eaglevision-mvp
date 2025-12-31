import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  CircularProgress,
  Paper,
  IconButton,
  Snackbar,
  Alert
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

export default function DocuSignModal({ open, onClose, onSigningComplete, formData }) {
  const [isLoading, setIsLoading] = useState(true);
  const [isSigning, setIsSigning] = useState(false);
  const [error, setError] = useState(null);
  const [envelopeId, setEnvelopeId] = useState('');
  const [signingUrl, setSigningUrl] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const createEnvelope = async () => {
      if (!open) return;

      try {
        setIsLoading(true);
        setError(null);

        // Prepare appointment data to be included in the document
        const appointmentData = {
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phone: formData.phone,
          service: formData.service,
          date: formData.date ? formData.date.toISOString() : null,
          time: formData.time ? formData.time.toLocaleTimeString() : null,
          notes: formData.notes
        };

        console.log('Sending request to create envelope with data:', {
          signer: {
            email: formData.email,
            name: `${formData.firstName} ${formData.lastName}`,
            client_user_id: formData.email
          },
          return_url: `${window.location.origin}/appointments`,
          appointment: appointmentData
        });

        const response = await fetch(`${API_BASE_URL}/api/docusign/envelope`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            signer: {
              email: formData.email,
              name: `${formData.firstName} ${formData.lastName}`,
              client_user_id: formData.email
            },
            return_url: `${window.location.origin}/`,
            appointment: appointmentData
          })
        });

        const responseData = await response.json().catch(() => ({}));
        
        if (!response.ok) {
          console.error('Server responded with error:', {
            status: response.status,
            statusText: response.statusText,
            data: responseData
          });
          throw new Error(responseData.detail || responseData.message || 'Failed to create signing session');
        }

        console.log('Envelope created successfully:', responseData);
        
        if (isMounted) {
          setEnvelopeId(responseData.envelope_id);
          setSigningUrl(responseData.redirect_url);
        }
      } catch (err) {
        console.error('DocuSign Error Details:', {
          error: err,
          message: err.message,
          stack: err.stack,
          response: err.response
        });
        
        if (isMounted) {
          // If we have a detailed error message from the server, show it
          if (err.message && err.message !== 'Failed to create signing session') {
            setError(`Error: ${err.message}`);
          } else {
            setError('Failed to prepare document for signing. Please try again.');
          }
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    if (open) {
      createEnvelope();
    }

    return () => {
      isMounted = false;
    };
  }, [open, formData]);

  const handleSigningComplete = (signedData = {}) => {
    setShowSuccess(true);
    // Pass the envelope ID and any additional signed data to the parent
    onSigningComplete({
      envelopeId,
      documentUrl: signedData.documentUrl,
      signedAt: new Date().toISOString()
    });
  };

  const handleCloseSuccess = () => {
    setShowSuccess(false);
    onClose();
  };

  const handleSignDocument = () => {
    if (!signingUrl) return;
    
    setIsSigning(true);
    const newWindow = window.open(signingUrl, '_blank', 'noopener,noreferrer');
    
    if (newWindow) {
      let checkCount = 0;
      const maxChecks = 60; // 5 minutes (300 seconds / 5 second interval)
      
      // Check if the document was signed every 5 seconds
      const checkStatus = setInterval(async () => {
        try {
          checkCount++;
          
          // If window is closed or we've reached max checks
          if (newWindow.closed || checkCount >= maxChecks) {
            clearInterval(checkStatus);
            
            if (checkCount >= maxChecks) {
              // If we've reached max checks but window is still open
              newWindow.close();
              setError('Signing session timed out. Please try again.');
              setIsSigning(false);
            } else {
              // Window was closed, check if signing was completed
              try {
                const response = await fetch(`${API_BASE_URL}/api/docusign/envelope/${envelopeId}`, {
                  method: 'GET',
                  headers: { 'Content-Type': 'application/json' }
                });
                
                if (response.ok) {
                  const envelopeData = await response.json();
                  if (envelopeData.status === 'completed') {
                    handleSigningComplete({
                      documentUrl: envelopeData.documentUrl
                    });
                  } else {
                    // Document wasn't completed
                    setError('Document signing was not completed. Please try again.');
                  }
                } else {
                  throw new Error('Failed to check signing status');
                }
              } catch (err) {
                console.error('Error checking envelope status:', err);
                setError('Unable to verify signing status. Please contact support.');
              } finally {
                setIsSigning(false);
              }
            }
          }
        } catch (err) {
          console.error('Error in signing process:', err);
          clearInterval(checkStatus);
          setError('An error occurred during the signing process.');
          setIsSigning(false);
        }
      }, 5000);
    } else {
      setError('Please allow popups for this website to sign the document.');
      setIsSigning(false);
    }
  };

  if (!open) return null;

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">Sign Service Agreement</Typography>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent>
        {isLoading ? (
          <Box display="flex" justifyContent="center" my={4}>
            <CircularProgress />
            <Typography variant="body1" ml={2}>
              Preparing your document for signing...
            </Typography>
          </Box>
        ) : error ? (
          <Box textAlign="center" my={4}>
            <Typography color="error">{error}</Typography>
            <Button 
              variant="contained" 
              color="primary" 
              onClick={() => window.location.reload()}
              sx={{ mt: 2 }}
            >
              Try Again
            </Button>
          </Box>
        ) : (
          <Box>
            <Paper elevation={3} sx={{ p: 2, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Service Agreement
              </Typography>
              <Typography paragraph>
                Please review and sign the service agreement to proceed with your appointment.
              </Typography>
              <Typography variant="body2" color="textSecondary">
                By signing, you agree to our terms of service and privacy policy.
              </Typography>
            </Paper>
            
            <Box textAlign="center" my={3}>
              <Button
                variant="contained"
                color="primary"
                size="large"
                onClick={handleSignDocument}
                disabled={isSigning}
                startIcon={isSigning ? <CircularProgress size={20} color="inherit" /> : null}
                sx={{ minWidth: 200 }}
              >
                {isSigning ? 'Opening Signing...' : 'Sign Document'}
              </Button>
            </Box>
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button 
          onClick={onClose} 
          disabled={isLoading || isSigning}
          color="inherit"
        >
          {isSigning ? 'Signing in progress...' : 'Cancel'}
        </Button>
        {!isLoading && !error && !isSigning && (
          <Button
            variant="contained"
            color="primary"
            onClick={handleSignDocument}
            disabled={!signingUrl}
          >
            Open Signing
          </Button>
        )}
      </DialogActions>

      <Snackbar
        open={showSuccess}
        autoHideDuration={6000}
        onClose={handleCloseSuccess}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseSuccess} severity="success" sx={{ width: '100%' }}>
          Document signed successfully!
        </Alert>
      </Snackbar>
    </Dialog>
  );
}
