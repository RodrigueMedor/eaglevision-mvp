import React, { useState } from 'react';
import {
  Box,
  Button,
  TextField,
  Typography,
  Paper,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  useTheme,
  useMediaQuery,
  Snackbar,
  Alert
} from '@mui/material';
import { Send as SendIcon, Clear as ClearIcon } from '@mui/icons-material';
import { useMutation, gql } from '@apollo/client';

const MessageForm = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  const [formData, setFormData] = useState({
    recipientType: 'all',
    recipientId: '',
    subject: '',
    message: ''
  });
  
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });
  
  const SEND_MESSAGE = gql`
    mutation SendMessage($input: MessageInput!) {
      sendMessage(input: $input) {
        id
        subject
        content
        sentAt
      }
    }
  `;

  const [sendMessage, { loading }] = useMutation(SEND_MESSAGE, {
    onCompleted: () => {
      setSnackbar({
        open: true,
        message: 'Message sent successfully!',
        severity: 'success'
      });
      // Reset form
      setFormData({
        recipientType: 'all',
        recipientId: '',
        subject: '',
        message: ''
      });
    },
    onError: (error) => {
      setSnackbar({
        open: true,
        message: `Error sending message: ${error.message}`,
        severity: 'error'
      });
    }
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    sendMessage({
      variables: {
        input: {
          ...formData,
          // Only include recipientId if not sending to all
          ...(formData.recipientType === 'all' ? { recipientId: null } : {})
        }
      }
    });
  };

  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  return (
    <Box sx={{ p: isMobile ? 1 : 3, maxWidth: 800, mx: 'auto' }}>
      <Paper elevation={3} sx={{ p: 3 }}>
        <Typography variant="h5" component="h1" gutterBottom>
          Send Message
        </Typography>
        
        <form onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth margin="normal">
                <InputLabel id="recipient-type-label">Recipient Type</InputLabel>
                <Select
                  labelId="recipient-type-label"
                  id="recipientType"
                  name="recipientType"
                  value={formData.recipientType}
                  onChange={handleChange}
                  label="Recipient Type"
                >
                  <MenuItem value="all">All Users</MenuItem>
                  <MenuItem value="client">Specific Client</MenuItem>
                  <MenuItem value="staff">Staff Members</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            {formData.recipientType === 'client' && (
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth margin="normal">
                  <InputLabel id="client-label">Select Client</InputLabel>
                  <Select
                    labelId="client-label"
                    id="recipientId"
                    name="recipientId"
                    value={formData.recipientId}
                    onChange={handleChange}
                    label="Select Client"
                    required
                  >
                    {/* In a real app, you would map through your clients list */}
                    <MenuItem value="1">Client 1</MenuItem>
                    <MenuItem value="2">Client 2</MenuItem>
                    <MenuItem value="3">Client 3</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            )}
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                margin="normal"
                id="subject"
                name="subject"
                label="Subject"
                value={formData.subject}
                onChange={handleChange}
                required
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                margin="normal"
                id="message"
                name="message"
                label="Message"
                value={formData.message}
                onChange={handleChange}
                multiline
                rows={6}
                required
              />
            </Grid>
            
            <Grid item xs={12} sx={{ mt: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<ClearIcon />}
                  onClick={() => {
                    setFormData({
                      recipientType: 'all',
                      recipientId: '',
                      subject: '',
                      message: ''
                    });
                  }}
                >
                  Clear
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  color="primary"
                  startIcon={<SendIcon />}
                  disabled={loading}
                >
                  {loading ? 'Sending...' : 'Send Message'}
                </Button>
              </Box>
            </Grid>
          </Grid>
        </form>
      </Paper>
      
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default MessageForm;
