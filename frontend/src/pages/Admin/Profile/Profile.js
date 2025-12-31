import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Avatar, 
  TextField, 
  Button, 
  Grid, 
  IconButton,
  Snackbar,
  Alert,
  CircularProgress
} from '@mui/material';
import { Person as PersonIcon, Save as SaveIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { 
  getProfile, 
  updateProfile, 
  changePassword, 
  uploadProfilePicture,
  deleteProfilePicture 
} from '../../../services/profileService';

// Validation schema for profile form
const profileSchema = Yup.object().shape({
  first_name: Yup.string().required('First name is required'),
  last_name: Yup.string().required('Last name is required'),
  email: Yup.string().email('Invalid email').required('Email is required'),
  phone_number: Yup.string(),
});

// Validation schema for password change form
const passwordSchema = Yup.object().shape({
  currentPassword: Yup.string().required('Current password is required'),
  newPassword: Yup.string()
    .min(8, 'Password must be at least 8 characters')
    .required('New password is required'),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref('newPassword'), null], 'Passwords must match')
    .required('Please confirm your password'),
});

const Profile = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success',
  });
  const [isUploading, setIsUploading] = useState(false);
  const [profileImage, setProfileImage] = useState(null);
  const [isEditingPassword, setIsEditingPassword] = useState(false);

  // Initialize formik for profile form
  const profileForm = useFormik({
    initialValues: {
      first_name: '',
      last_name: '',
      email: '',
      phone_number: '',
    },
    validationSchema: profileSchema,
    onSubmit: async (values, { setSubmitting, setFieldError }) => {
      try {
        await updateProfile(values);
        showSnackbar('Profile updated successfully', 'success');
      } catch (error) {
        console.error('Error updating profile:', error);
        const message = error.response?.data?.detail || 'Failed to update profile';
        showSnackbar(message, 'error');
      } finally {
        setSubmitting(false);
      }
    },
  });

  // Initialize formik for password form
  const passwordForm = useFormik({
    initialValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
    validationSchema: passwordSchema,
    onSubmit: async (values, { setSubmitting, resetForm }) => {
      try {
        await changePassword(values.currentPassword, values.newPassword);
        resetForm();
        setIsEditingPassword(false);
        showSnackbar('Password updated successfully', 'success');
      } catch (error) {
        console.error('Error changing password:', error);
        const message = error.response?.data?.detail || 'Failed to change password';
        showSnackbar(message, 'error');
      } finally {
        setSubmitting(false);
      }
    },
  });

  // Fetch profile data on component mount
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const data = await getProfile();
        profileForm.setValues({
          first_name: data.first_name || '',
          last_name: data.last_name || '',
          email: data.email || '',
          phone_number: data.phone_number || '',
        });
        if (data.profile_picture_url) {
          setProfileImage(data.profile_picture_url);
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
        showSnackbar('Failed to load profile', 'error');
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, []);

  // Show snackbar notification
  const showSnackbar = (message, severity = 'info') => {
    setSnackbar({
      open: true,
      message,
      severity,
    });
  };

  // Handle file upload
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const result = await uploadProfilePicture(file);
      setProfileImage(result.profile_picture_url);
      showSnackbar('Profile picture updated successfully', 'success');
    } catch (error) {
      console.error('Error uploading profile picture:', error);
      const message = error.response?.data?.detail || 'Failed to upload profile picture';
      showSnackbar(message, 'error');
    } finally {
      setIsUploading(false);
    }
  };

  // Handle remove profile picture
  const handleRemovePicture = async () => {
    if (!profileImage) return;
    
    setIsUploading(true);
    try {
      await deleteProfilePicture();
      setProfileImage(null);
      showSnackbar('Profile picture removed', 'success');
    } catch (error) {
      console.error('Error removing profile picture:', error);
      const message = error.response?.data?.detail || 'Failed to remove profile picture';
      showSnackbar(message, 'error');
    } finally {
      setIsUploading(false);
    }
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          My Profile
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Manage your account information and settings
        </Typography>
      </Box>

      <Paper sx={{ p: 3, mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <Avatar sx={{ width: 80, height: 80, mr: 3 }}>
            {profileImage ? (
              <img src={profileImage} alt="Profile Picture" />
            ) : (
              <PersonIcon sx={{ fontSize: 40 }} />
            )}
          </Avatar>
          <Box>
            <input type="file" onChange={handleFileUpload} />
            <Button variant="outlined" size="small" sx={{ mr: 2 }}>
              Upload New Photo
            </Button>
            <Button variant="outlined" size="small" color="error" onClick={handleRemovePicture}>
              Remove
            </Button>
          </Box>
        </Box>

        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="First Name"
              value={profileForm.values.first_name}
              onChange={profileForm.handleChange}
              error={profileForm.touched.first_name && Boolean(profileForm.errors.first_name)}
              helperText={profileForm.touched.first_name && profileForm.errors.first_name}
              margin="normal"
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Last Name"
              value={profileForm.values.last_name}
              onChange={profileForm.handleChange}
              error={profileForm.touched.last_name && Boolean(profileForm.errors.last_name)}
              helperText={profileForm.touched.last_name && profileForm.errors.last_name}
              margin="normal"
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Email Address"
              type="email"
              value={profileForm.values.email}
              onChange={profileForm.handleChange}
              error={profileForm.touched.email && Boolean(profileForm.errors.email)}
              helperText={profileForm.touched.email && profileForm.errors.email}
              margin="normal"
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Phone Number"
              type="tel"
              value={profileForm.values.phone_number}
              onChange={profileForm.handleChange}
              error={profileForm.touched.phone_number && Boolean(profileForm.errors.phone_number)}
              helperText={profileForm.touched.phone_number && profileForm.errors.phone_number}
              margin="normal"
            />
          </Grid>
          <Grid item xs={12}>
            <Button
              variant="contained"
              startIcon={<SaveIcon />}
              sx={{ mt: 2 }}
              onClick={profileForm.handleSubmit}
            >
              Save Changes
            </Button>
          </Grid>
        </Grid>
      </Paper>

      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Change Password
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Current Password"
              type="password"
              value={passwordForm.values.currentPassword}
              onChange={passwordForm.handleChange}
              error={passwordForm.touched.currentPassword && Boolean(passwordForm.errors.currentPassword)}
              helperText={passwordForm.touched.currentPassword && passwordForm.errors.currentPassword}
              margin="normal"
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="New Password"
              type="password"
              value={passwordForm.values.newPassword}
              onChange={passwordForm.handleChange}
              error={passwordForm.touched.newPassword && Boolean(passwordForm.errors.newPassword)}
              helperText={passwordForm.touched.newPassword && passwordForm.errors.newPassword}
              margin="normal"
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Confirm New Password"
              type="password"
              value={passwordForm.values.confirmPassword}
              onChange={passwordForm.handleChange}
              error={passwordForm.touched.confirmPassword && Boolean(passwordForm.errors.confirmPassword)}
              helperText={passwordForm.touched.confirmPassword && passwordForm.errors.confirmPassword}
              margin="normal"
            />
          </Grid>
          <Grid item xs={12}>
            <Button
              variant="contained"
              color="primary"
              sx={{ mt: 2 }}
              onClick={passwordForm.handleSubmit}
            >
              Update Password
            </Button>
          </Grid>
        </Grid>
      </Paper>
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Profile;
