import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Tabs, 
  Tab, 
  TextField, 
  Button, 
  Grid, 
  FormControlLabel, 
  Switch,
  Divider,
  Alert,
  Snackbar
} from '@mui/material';
import { Save as SaveIcon, Receipt as TaxIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';

const Settings = () => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, isLoading, navigate]);

  const [tabValue, setTabValue] = useState(0);
  const [settings, setSettings] = useState({
    emailNotifications: true,
    pushNotifications: false,
    darkMode: false,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    language: 'en',
  });
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success',
  });

  useEffect(() => {
    // Load saved settings from localStorage or API
    const savedSettings = localStorage.getItem('adminSettings');
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings));
    }
  }, []);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleSettingChange = (setting, value) => {
    setSettings(prev => ({
      ...prev,
      [setting]: value
    }));
  };

  const handleSaveSettings = () => {
    // Save to localStorage or make API call
    localStorage.setItem('adminSettings', JSON.stringify(settings));
    
    setSnackbar({
      open: true,
      message: 'Settings saved successfully!',
      severity: 'success'
    });
  };

  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({
      ...prev,
      open: false
    }));
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Settings
      </Typography>
      
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={6} lg={4}>
          <Paper 
            onClick={() => navigate('/admin/settings/tax')}
            sx={{ 
              p: 3, 
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              '&:hover': {
                boxShadow: 3,
                transform: 'translateY(-2px)'
              }
            }}
          >
            <Box display="flex" alignItems="center">
              <TaxIcon color="primary" sx={{ fontSize: 40, mr: 2 }} />
              <Box>
                <Typography variant="h6">Tax Settings</Typography>
                <Typography variant="body2" color="textSecondary">
                  Configure tax rates, regions, and exemptions
                </Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>
      </Grid>
      
      <Divider sx={{ my: 3 }} />
      
      <Typography variant="h5" gutterBottom>
        General Settings
      </Typography>
      
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label="General" />
          <Tab label="Notifications" />
          <Tab label="Security" />
          <Tab label="Appearance" />
        </Tabs>
        
        <Box sx={{ p: 3 }}>
          {tabValue === 0 && (
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>Profile Information</Typography>
                <TextField
                  fullWidth
                  label="Full Name"
                  value={user?.name || ''}
                  margin="normal"
                  disabled
                />
                <TextField
                  fullWidth
                  label="Email"
                  value={user?.email || ''}
                  margin="normal"
                  disabled
                />
                <TextField
                  fullWidth
                  select
                  label="Timezone"
                  value={settings.timezone}
                  onChange={(e) => handleSettingChange('timezone', e.target.value)}
                  margin="normal"
                  SelectProps={{
                    native: true,
                  }}
                >
                  <option value="America/New_York">Eastern Time (ET)</option>
                  <option value="America/Chicago">Central Time (CT)</option>
                  <option value="America/Denver">Mountain Time (MT)</option>
                  <option value="America/Los_Angeles">Pacific Time (PT)</option>
                </TextField>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>Preferences</Typography>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.darkMode}
                      onChange={(e) => handleSettingChange('darkMode', e.target.checked)}
                    />
                  }
                  label="Dark Mode"
                />
                <Box mt={2}>
                  <TextField
                    fullWidth
                    select
                    label="Language"
                    value={settings.language}
                    onChange={(e) => handleSettingChange('language', e.target.value)}
                    margin="normal"
                    SelectProps={{
                      native: true,
                    }}
                  >
                    <option value="en">English</option>
                    <option value="es">Español</option>
                    <option value="fr">Français</option>
                  </TextField>
                </Box>
              </Grid>
            </Grid>
          )}
          
          {tabValue === 1 && (
            <Box>
              <Typography variant="h6" gutterBottom>Notification Preferences</Typography>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.emailNotifications}
                    onChange={(e) => handleSettingChange('emailNotifications', e.target.checked)}
                  />
                }
                label="Email Notifications"
              />
              <Box mt={2}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.pushNotifications}
                      onChange={(e) => handleSettingChange('pushNotifications', e.target.checked)}
                    />
                  }
                  label="Push Notifications"
                />
              </Box>
            </Box>
          )}
          
          {tabValue === 2 && (
            <Box>
              <Typography variant="h6" gutterBottom>Security Settings</Typography>
              <Button 
                variant="outlined" 
                color="primary" 
                onClick={() => {}}
                sx={{ mt: 2 }}
              >
                Change Password
              </Button>
              <Box mt={3}>
                <Typography variant="subtitle2" gutterBottom>
                  Active Sessions
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Current session: {new Date().toLocaleString()}
                </Typography>
              </Box>
            </Box>
          )}
          
          {tabValue === 3 && (
            <Box>
              <Typography variant="h6" gutterBottom>Appearance</Typography>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.darkMode}
                    onChange={(e) => handleSettingChange('darkMode', e.target.checked)}
                  />
                }
                label={settings.darkMode ? 'Dark Mode Enabled' : 'Light Mode Enabled'}
              />
              <Box mt={3}>
                <Typography variant="subtitle2" gutterBottom>
                  Theme Color
                </Typography>
                <Box display="flex" gap={2} mt={1}>
                  {['#1976d2', '#9c27b0', '#2e7d32', '#d32f2f', '#ed6c02'].map((color) => (
                    <Box
                      key={color}
                      onClick={() => {}}
                      sx={{
                        width: 40,
                        height: 40,
                        borderRadius: '50%',
                        bgcolor: color,
                        cursor: 'pointer',
                        border: '2px solid',
                        borderColor: 'transparent',
                        '&:hover': {
                          borderColor: 'primary.main'
                        }
                      }}
                    />
                  ))}
                </Box>
              </Box>
            </Box>
          )}
          
          <Box mt={4} pt={2} borderTop={1} borderColor="divider">
            <Button
              variant="contained"
              color="primary"
              startIcon={<SaveIcon />}
              onClick={handleSaveSettings}
            >
              Save Changes
            </Button>
          </Box>
        </Box>
      </Paper>
      
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Settings;
