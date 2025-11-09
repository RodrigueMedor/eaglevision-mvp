import React from 'react';
import { Box, Container, Typography, Grid, TextField, Button, Paper } from '@mui/material';
import { Phone, Email, LocationOn } from '@mui/icons-material';

const Contact = () => {
  const handleSubmit = (e) => {
    e.preventDefault();
    // Form submission logic will go here
  };

  return (
    <Box sx={{ py: 8 }}>
      <Container maxWidth="lg">
        <Typography variant="h2" component="h1" gutterBottom align="center">
          Contact Us
        </Typography>
        <Typography variant="h6" color="textSecondary" align="center" paragraph>
          Get in touch with us for any questions or to schedule a consultation
        </Typography>

        <Grid container spacing={6} sx={{ mt: 4 }}>
          <Grid item xs={12} md={6}>
            <Paper elevation={3} sx={{ p: 4, height: '100%' }}>
              <form onSubmit={handleSubmit} name="contact" method="POST" data-netlify="true">
                <input type="hidden" name="form-name" value="contact" />
                <Grid container spacing={3}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      required
                      fullWidth
                      label="Full Name"
                      name="name"
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
                      variant="outlined"
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      required
                      fullWidth
                      label="Phone Number"
                      name="phone"
                      type="tel"
                      variant="outlined"
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      required
                      fullWidth
                      select
                      label="Service Needed"
                      name="service"
                      variant="outlined"
                      SelectProps={{ native: true }}
                    >
                      <option value="">Select a service</option>
                      <option value="tax">Tax Filing & Business Registration</option>
                      <option value="immigration">Immigration Form Assistance</option>
                      <option value="document">Document & Application Support</option>
                      <option value="other">Other</option>
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
                    >
                      Send Message
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
  );
};

export default Contact;
