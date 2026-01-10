import React, { useState, useEffect } from 'react';
import { useMutation } from '@apollo/client';
import { gql } from 'graphql-tag';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  Button,
  Typography,
  CircularProgress,
  Box,
  Alert,
  Tabs,
  Tab,
  InputAdornment,
  IconButton,
  Divider
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Visibility,
  VisibilityOff,
  Person as PersonIcon,
  Email as EmailIcon,
  Lock as LockIcon
} from '@mui/icons-material';

// Define the mutations
const SIGNUP_MUTATION = gql`
  mutation signUp($input: SignUpInput!) {
    signUp(input: $input) {
      success
      message
      token
      refreshToken
      user {
        id
        email
        emailVerified
        firstName
        lastName
        phone
        role
        createdAt
        updatedAt
      }
    }
  }
`;


const EmailSignInModal = ({ open, onClose, onEmailSubmit, onSuccess }) => {
  const [login] = useMutation(LOGIN_MUTATION, {
    onCompleted: (data) => {
      console.log('Login response:', data);
      const token = data?.login?.token;
      if (token) {
        localStorage.setItem('token', token);
        if (data.login.refreshToken) {
          localStorage.setItem('refreshToken', data.login.refreshToken);
        }
        if (onSuccess) onSuccess(data.login.user || { email });
        handleClose();
      } else {
        setError('Login failed. Please try again.');
      }
    },
    onError: (error) => {
      console.error('Login error:', error);
      setError(error.message || 'Failed to sign in. Please check your credentials and try again.');
    }
  });

  const [signup] = useMutation(SIGNUP_MUTATION, {
    onCompleted: (data) => {
      console.log('Signup response (onCompleted):', data);
      
      if (!data || !data.signup) {
        console.error('Unexpected response format from server:', data);
        setError('Received an unexpected response from the server. Please try again.');
        return;
      }
      
      if (data.signup.success) {
        // If we have tokens, handle login automatically
        if (data.signup.token && data.signup.refreshToken) {
          // Store tokens
          localStorage.setItem('token', data.signup.token);
          localStorage.setItem('refreshToken', data.signup.refreshToken);
          
          // Call onSuccess with user data
          if (onSuccess) {
            onSuccess(data.signup.user);
          }
          
          // Close the modal
          handleClose();
        } else {
          // Fallback to old behavior if tokens aren't available
          console.log('Signup successful, but no tokens received. Please sign in manually.');
          setSuccessMessage('Account created successfully! Please sign in.');
          setActiveTab(0);
        }
        
        // Clear the form
        setEmail('');
        setPassword('');
        setFirstName('');
        setLastName('');
        setConfirmPassword('');
        setError('');
      } else {
        console.error('Server returned unsuccessful signup:', data.signup);
        const errorMessage = data.signup.message || 'Failed to complete signup. Please try again.';
        setError(errorMessage);
        setSuccessMessage('');
      }
    },
    onError: (error) => {
      // Log the full error for debugging
      console.error('Signup error details:', {
        message: error.message,
        graphQLErrors: error.graphQLErrors,
        networkError: error.networkError,
        extraInfo: error.extraInfo,
        stack: error.stack
      });
      
      // Handle GraphQL errors
      let errorMessage = 'Failed to sign up. Please try again.';
      
      if (error.graphQLErrors && error.graphQLErrors.length > 0) {
        const graphQLError = error.graphQLErrors[0];
        
        // Check for specific error codes
        if (graphQLError.extensions) {
          // Handle specific error codes
          switch(graphQLError.extensions.code) {
            case 'INTERNAL_SERVER_ERROR':
              errorMessage = 'A server error occurred. Please try again later.';
              break;
            case 'UNAUTHENTICATED':
              errorMessage = 'Authentication failed. Please check your credentials.';
              break;
            case 'FORBIDDEN':
              errorMessage = 'You do not have permission to perform this action.';
              break;
            case 'BAD_USER_INPUT':
              errorMessage = graphQLError.message || 'Invalid input. Please check your information.';
              break;
            default:
              errorMessage = graphQLError.message || errorMessage;
          }
          
          // Log additional error details for debugging
          if (graphQLError.extensions.exception) {
            console.error('Server exception details:', graphQLError.extensions.exception);
          }
        } else if (graphQLError.message) {
          errorMessage = graphQLError.message;
        }
      } 
      // Handle network errors
      else if (error.networkError) {
        console.error('Network error details:', error.networkError);
        if (error.networkError.statusCode === 401) {
          errorMessage = 'Authentication failed. Please log in again.';
        } else if (error.networkError.statusCode === 403) {
          errorMessage = 'You do not have permission to perform this action.';
        } else if (error.networkError.statusCode >= 500) {
          errorMessage = 'Server error. Please try again later.';
        } else {
          errorMessage = 'Network error. Please check your connection and try again.';
        }
      }
      
      // Set the error message in the UI
      setError(errorMessage);
      
      // Clear the error after 10 seconds
      setTimeout(() => setError(''), 10000);
    },
  });
  const [activeTab, setActiveTab] = useState(0);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [verificationSent, setVerificationSent] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError('');
    setVerificationSent(false);
    setEmail('');
    setPassword('');
    setFirstName('');
    setLastName('');
    setConfirmPassword('');
    setActiveTab(0);
  }, [open]);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
    setError('');
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleSignIn = async (e) => {
    e.preventDefault();
    if (!email) {
      setError('Please enter your email');
      return;
    }
    if (!password) {
      setError('Please enter your password');
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');
      
      await login({
        variables: {
          input: {
            email: email.toLowerCase().trim(),
            password: password
          }
        }
      });
    } catch (err) {
      // Handle specific error cases
      if (err.graphQLErrors && err.graphQLErrors.length > 0) {
        const [graphQLError] = err.graphQLErrors;
        
        // Handle specific error codes from the server
        if (graphQLError.extensions?.code === 'USER_NOT_FOUND') {
          setError('No account found with this email. Please check your email or sign up.');
        } else if (graphQLError.extensions?.code === 'INVALID_PASSWORD') {
          setError('Incorrect password. Please try again.');
        } else if (graphQLError.message) {
          setError(graphQLError.message);
        } else {
          setError('An error occurred during sign in. Please try again.');
        }
      } else if (err.networkError) {
        setError('Network error. Please check your connection and try again.');
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
      
      console.error('Sign in error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    const requiredFields = { email, password, firstName, lastName };
    const missingFields = Object.entries(requiredFields)
      .filter(([_, value]) => !value)
      .map(([key]) => key);
      
    if (missingFields.length > 0) {
      setError(`Missing required fields: ${missingFields.join(', ')}`);
      return;
    }

    setIsSubmitting(true);
    setError('');
    setSuccessMessage('');
    
    try {
      console.log('Attempting signup with:', {
        email: email.toLowerCase().trim(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        password: '••••••' // Don't log actual password
      });

      const result = await signup({
        variables: {
          input: {
            email: email.toLowerCase().trim(),
            password: password,
            firstName: firstName.trim(),
            lastName: lastName.trim()
          }
        },
        // Skip caching to avoid issues with the response
        fetchPolicy: 'no-cache'
      });

      console.log('Signup response:', result);

      // Handle the response based on the server's structure
      if (result.data?.signup?.success) {
        const successMsg = result.data.signup.message || 'Account created successfully! Please sign in.';
        console.log('Signup successful:', successMsg);
        
        setSuccessMessage(successMsg);
        setActiveTab(0); // Switch to sign in tab
        
        // Clear the form
        setEmail('');
        setPassword('');
        setFirstName('');
        setLastName('');
        setConfirmPassword('');
      } else {
        const errorMsg = result.data?.signup?.message || 'Failed to complete signup. Please try again.';
        console.error('Signup failed:', errorMsg);
        setError(errorMsg);
      }
    } catch (err) {
      console.error('Signup error:', err);
      setError(err.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEmailVerification = async (e) => {
    e.preventDefault();

    if (!email) {
      setError('Please enter your email address');
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');

      const response = await fetch('/api/auth/send-verification-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send verification email');
      }

      setVerificationSent(true);
      localStorage.setItem('pendingVerificationEmail', email);

      if (onEmailSubmit) await onEmailSubmit(email);
      if (onSuccess) onSuccess({ email });

    } catch (err) {
      setError(err.message || 'Failed to send verification email');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setEmail('');
    setPassword('');
    setFirstName('');
    setLastName('');
    setConfirmPassword('');
    setError('');
    setSuccessMessage('');
    setVerificationSent(false);
    setActiveTab(0);
    onClose();
  };

  const renderSignInForm = () => (
    <form onSubmit={handleSignIn}>
      <TextField
        fullWidth
        margin="normal"
        label="Email Address"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <EmailIcon color="action" />
            </InputAdornment>
          ),
        }}
      />
      <TextField
        fullWidth
        margin="normal"
        label="Password"
        type={showPassword ? 'text' : 'password'}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <LockIcon color="action" />
            </InputAdornment>
          ),
          endAdornment: (
            <InputAdornment position="end">
              <IconButton
                onClick={togglePasswordVisibility}
                edge="end"
              >
                {showPassword ? <VisibilityOff /> : <Visibility />}
              </IconButton>
            </InputAdornment>
          ),
        }}
      />
      <Box sx={{ mt: 2, textAlign: 'right' }}>
        <Button 
          color="primary" 
          size="small"
          onClick={() => {
            // TODO: Implement forgot password flow
            console.log('Forgot password clicked');
          }}
        >
          Forgot Password?
        </Button>
      </Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {successMessage && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {successMessage}
        </Alert>
      )}
      <Button
        fullWidth
        variant="contained"
        color="primary"
        type="submit"
        disabled={isSubmitting}
        sx={{ mt: 2, py: 1.5 }}
      >
        {isSubmitting ? <CircularProgress size={24} /> : 'Sign In'}
      </Button>
    </form>
  );

  const renderSignUpForm = () => (
    <form onSubmit={handleSignUp}>
      <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
        <TextField
          fullWidth
          label="First Name"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          required
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <PersonIcon color="action" />
              </InputAdornment>
            ),
          }}
        />
        <TextField
          fullWidth
          label="Last Name"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          required
        />
      </Box>
      <TextField
        fullWidth
        margin="normal"
        label="Email Address"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <EmailIcon color="action" />
            </InputAdornment>
          ),
        }}
      />
      <TextField
        fullWidth
        margin="normal"
        label="Password"
        type={showPassword ? 'text' : 'password'}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <LockIcon color="action" />
            </InputAdornment>
          ),
          endAdornment: (
            <InputAdornment position="end">
              <IconButton
                onClick={togglePasswordVisibility}
                edge="end"
              >
                {showPassword ? <VisibilityOff /> : <Visibility />}
              </IconButton>
            </InputAdornment>
          ),
        }}
      />
      <TextField
        fullWidth
        margin="normal"
        label="Confirm Password"
        type={showPassword ? 'text' : 'password'}
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        required
        error={password !== confirmPassword && confirmPassword !== ''}
        helperText={password !== confirmPassword && confirmPassword !== '' ? 'Passwords do not match' : ''}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <LockIcon color="action" />
            </InputAdornment>
          ),
        }}
      />
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {successMessage && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {successMessage}
        </Alert>
      )}
      <Button
        fullWidth
        variant="contained"
        color="primary"
        type="submit"
        disabled={isSubmitting || password !== confirmPassword}
        sx={{ mt: 3, py: 1.5 }}
      >
        {isSubmitting ? <CircularProgress size={24} /> : 'Create Account'}
      </Button>
    </form>
  );

  return (
    <Dialog 
      open={open} 
      onClose={handleClose} 
      maxWidth="sm" 
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          p: 1
        }
      }}
    >
      <DialogTitle>Sign In to Book an Appointment</DialogTitle>
      
      <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 3 }}>
        <Tabs 
          value={activeTab} 
          onChange={handleTabChange} 
          aria-label="sign in tabs"
          variant="fullWidth"
        >
          <Tab label="Sign In" />
          <Tab label="Create Account" />
        </Tabs>
      </Box>
      
      <DialogContent sx={{ py: 3 }}>
        {verificationSent ? (
          <Box textAlign="center" py={2}>
            <CheckCircleIcon color="success" sx={{ fontSize: 60, mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              Check Your Email
            </Typography>
            <Typography variant="body1" color="text.secondary" paragraph>
              We've sent a verification link to <strong>{email}</strong>.
              Please check your inbox and click the link to continue booking your appointment.
            </Typography>
            <Button
              variant="contained"
              color="primary"
              onClick={handleClose}
              sx={{ mt: 2 }}
            >
              Close
            </Button>
          </Box>
        ) : (
          <>
            {activeTab === 0 ? renderSignInForm() : renderSignUpForm()}
            <Divider sx={{ my: 3 }}>OR</Divider>
            <Button
              fullWidth
              variant="outlined"
              onClick={handleEmailVerification}
              disabled={isSubmitting || !email}
              startIcon={<EmailIcon />}
            >
              Continue with Email Link
            </Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default EmailSignInModal;