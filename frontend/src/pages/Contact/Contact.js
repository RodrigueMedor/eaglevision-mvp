import React, { useState, useEffect } from 'react';
import { useMutation } from '@apollo/client';
import { Box, Container, Typography, Grid, TextField, Button, Paper, Snackbar, Alert } from '@mui/material';
import { Phone, Email, LocationOn } from '@mui/icons-material';
import { CREATE_CONTACT } from '../../graphql/mutations';
import ErrorBoundary from '../../ErrorBoundary';

// Suppress extension-related errors
if (typeof window !== 'undefined') {
  const originalAddEventListener = window.addEventListener;
  window.addEventListener = function(type, listener, options) {
    if (type === 'error' && typeof listener === 'function' && 
        listener.toString().includes('content_script.js')) {
      return () => {}; // Return a no-op function
    }
    return originalAddEventListener.call(window, type, listener, options);
  };
}

const Contact = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: 'General Inquiry',
    message: ''
  });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const [createContact, { loading }] = useMutation(CREATE_CONTACT, {
    onCompleted: () => {
      setSnackbar({ open: true, message: 'Message sent successfully!', severity: 'success' });
      // Reset form
      setFormData({
        name: '',
        email: '',
        phone: '',
        subject: 'General Inquiry',
        message: ''
      });
    },
    onError: (error) => {
      console.error('Error sending message:', error);
      setSnackbar({ 
        open: true, 
        message: 'Failed to send message. Please try again.', 
        severity: 'error' 
      });
    }
  });

  const formatPhoneNumber = (value) => {
    // If empty, return just the +1
    if (!value) return '+1 ';
    
    // If user tries to delete the +1, keep it there
    if (value === '+1' || value === '+1 ') return '+1 ';
    
    // Remove all non-digit characters
    const cleaned = String(value).replace(/\D/g, '');
    
    // If it's a new number, add +1
    if (!value.startsWith('+1')) {
      const formatted = `+1 (${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6, 10)}`;
      console.log('Formatted new number:', formatted);
      return formatted;
    }
    
    // Format as +1 (XXX) XXX-XXXX
    const digits = cleaned.startsWith('1') ? cleaned.slice(1) : cleaned;
    const areaCode = digits.slice(0, 3);
    const firstPart = digits.slice(3, 6);
    const secondPart = digits.slice(6, 10);
    
    let formatted;
    if (digits.length <= 3) {
      formatted = `+1 (${areaCode}`;
    } else if (digits.length <= 6) {
      formatted = `+1 (${areaCode}) ${firstPart}`;
    } else {
      formatted = `+1 (${areaCode}) ${firstPart}-${secondPart}`;
    }
    
    console.log('Formatted number:', formatted);
    return formatted;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'phone') {
      // If user tries to delete the +1, keep it there
      if (value === '+' || value === '+1') {
        setFormData(prev => ({ ...prev, phone: '+1 ' }));
        return;
      }
      
      // Format the phone number as user types
      const formattedValue = formatPhoneNumber(value);
      
      setFormData(prev => ({
        ...prev,
        [name]: formattedValue
      }));
    } else {
      // For other fields, update normally
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const isValidUSPhone = (phone) => {
    // Check if phone matches +1 (XXX) XXX-XXXX format
    const usPhoneRegex = /^\+1\s\(\d{3}\)\s\d{3}-\d{4}$/;
    console.log('Validating phone:', phone, 'Result:', usPhoneRegex.test(phone));
    return usPhoneRegex.test(phone);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Ensure phone number is in the correct format
    const formattedPhone = formatPhoneNumber(formData.phone);
    
    // Validate phone number format
    if (!isValidUSPhone(formattedPhone)) {
      console.log('Invalid phone format:', formData.phone);
      setSnackbar({
        open: true,
        message: 'Please enter a valid US phone number in the format +1 (XXX) XXX-XXXX',
        severity: 'error'
      });
      return;
    }
    
    // Update form data with formatted phone number
    setFormData(prev => ({
      ...prev,
      phone: formattedPhone
    }));
    
    console.log('Form submitted with data:', formData);
    
    if (!createContact) {
      console.error('createContact mutation is not defined');
      setSnackbar({ 
        open: true, 
        message: 'Form submission error. Please try again.', 
        severity: 'error' 
      });
      return;
    }
    
    try {
      const result = await createContact({
        variables: {
          input: {
            ...formData,
            subject: formData.subject || 'General Inquiry'
          }
        }
      });
      
      console.log('Mutation result:', result);
      
      // Show success message
      setSnackbar({
        open: true,
        message: 'Your message has been sent successfully! We will get back to you soon.',
        severity: 'success'
      });
      
      // Reset form
      setFormData({
        name: '',
        email: '',
        phone: '',
        subject: 'General Inquiry',
        message: ''
      });
      
    } catch (error) {
      console.error('Error in form submission:', error);
      setSnackbar({ 
        open: true, 
        message: error.message || 'An error occurred while sending your message. Please try again later.', 
        severity: 'error' 
      });
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  // Add a global error handler for uncaught errors
  useEffect(() => {
    const handleGlobalError = (event) => {
      // Ignore errors from content scripts
      if (event.filename && event.filename.includes('content_script.js')) {
        event.preventDefault();
        return false;
      }
      return true;
    };

    window.addEventListener('error', handleGlobalError);
    return () => {
      window.removeEventListener('error', handleGlobalError);
    };
  }, []);

  return (
    <ErrorBoundary>
      <Box sx={{ py: 8 }}>
        <Snackbar 
          open={snackbar.open} 
          autoHideDuration={6000} 
          onClose={handleCloseSnackbar}
        >
          <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
            {snackbar.message}
          </Alert>
        </Snackbar>
        
        <Container maxWidth="lg">
          <Typography variant="h3" component="h1" align="center" gutterBottom>
            Contact Us
          </Typography>
        <Typography variant="h6" color="textSecondary" align="center" paragraph>
          Get in touch with us for any questions or to schedule a consultation
        </Typography>

        <Grid container spacing={6} sx={{ mt: 4 }}>
          <Grid item xs={12} md={6}>
            <Paper elevation={3} sx={{ p: 4, height: '100%' }}>
              <form onSubmit={handleSubmit} noValidate>
                <Grid container spacing={3}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      required
                      fullWidth
                      label="Full Name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      variant="outlined"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      required
                      fullWidth
                      label="Email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleChange}
                      variant="outlined"
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Phone Number"
                      name="phone"
                      type="tel"
                      placeholder="+1 (123) 456-7890"
                      value={formData.phone || '+1 '}
                      onChange={handleChange}
                      variant="outlined"
                      inputProps={{
                        maxLength: 17 // +1 (123) 456-7890 is 17 characters
                      }}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      required
                      fullWidth
                      select
                      label="Subject"
                      name="subject"
                      value={formData.subject}
                      onChange={handleChange}
                      variant="outlined"
                      SelectProps={{ native: true }}
                    >
                      <option value="General Inquiry">General Inquiry</option>
                      <option value="Tax Filing & Business Registration">Tax Filing & Business Registration</option>
                      <option value="Immigration Form Assistance">Immigration Form Assistance</option>
                      <option value="Document & Application Support">Document & Application Support</option>
                      <option value="Other">Other</option>
                    </TextField>
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      required
                      fullWidth
                      multiline
                      rows={4}
                      label="Message"
                      name="message"
                      value={formData.message}
                      onChange={handleChange}
                      variant="outlined"
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Button
                      type="submit"
                      variant="contained"
                      color="primary"
                      size="large"
                      fullWidth
                      disabled={loading}
                    >
                      {loading ? 'Sending...' : 'Send Message'}
                    </Button>
                  </Grid>
                </Grid>
              </form>
            </Paper>
          </Grid>
          <Grid item xs={12} md={6}>
            <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Paper elevation={3} sx={{ p: 4, flex: 1 }}>
                <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
                  Contact Information
                </Typography>
                <Box sx={{ mt: 3, display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Phone color="primary" />
                    <Box>
                      <Typography variant="subtitle2" color="textSecondary">Phone</Typography>
                      <Typography component="a" href="tel:6414514536" sx={{ color: 'text.primary', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>
                        (641) 451-4536
                      </Typography>
                    </Box>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Email color="primary" />
                    <Box>
                      <Typography variant="subtitle2" color="textSecondary">Email</Typography>
                      <Typography component="a" href="mailto:info@eaglevisionedge.com" sx={{ color: 'text.primary', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>
                        info@eaglevisionedge.com
                      </Typography>
                    </Box>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                    <LocationOn color="primary" sx={{ mt: 0.5 }} />
                    <Box>
                      <Typography variant="subtitle2" color="textSecondary">Location</Typography>
                      <Typography>123 Business Ave, Suite 100</Typography>
                      <Typography>Anytown, IA 50001</Typography>
                    </Box>
                  </Box>
                </Box>
              </Paper>
              <Box sx={{ flex: 1, minHeight: '300px' }}>
                <iframe
                  title="Business Location"
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3022.2152090573!2d-73.9873196845938!3d40.75798517932699!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zNDDCsDQ1JzI4LjciTiA3M8KwNTknMTYuNyJX!5e0!3m2!1sen!2sus!4v1620000000000!5m2!1sen!2sus"
                  width="100%"
                  height="100%"
                  style={{ border: 0, borderRadius: '4px' }}
                  allowFullScreen
                  loading="lazy"
                ></iframe>
              </Box>
            </Box>
          </Grid>
        </Grid>
      </Container>
      </Box>
    </ErrorBoundary>
  );
};

export default Contact;
