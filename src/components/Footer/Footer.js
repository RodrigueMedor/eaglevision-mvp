import React from 'react';
import { Box, Container, Grid, Typography, Link as MuiLink } from '@mui/material';
import { Link } from 'react-router-dom';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <Box
      component="footer"
      sx={{
        backgroundColor: 'primary.main',
        color: 'white',
        py: 4,
        mt: 'auto',
        borderTop: '1px solid rgba(255, 255, 255, 0.1)',
      }}
    >
      <Container maxWidth="lg">
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
              Eagle Vision Edge LLC
            </Typography>
            <Typography variant="body2" sx={{ mb: 1, opacity: 0.9, fontSize: '0.85rem' }}>
              Your Trusted Partner for Tax & Immigration Services
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, mt: 1 }}>
              <MuiLink 
                href="tel:6414514536" 
                color="inherit" 
                sx={{ 
                  fontSize: '0.85rem',
                  textDecoration: 'none', 
                  '&:hover': { textDecoration: 'underline' } 
                }}
              >
                (641) 451-4536
              </MuiLink>
              <MuiLink 
                href="mailto:info@eaglevisionedge.com" 
                color="inherit" 
                sx={{ 
                  fontSize: '0.85rem',
                  textDecoration: 'none', 
                  '&:hover': { textDecoration: 'underline' } 
                }}
              >
                info@eaglevisionedge.com
              </MuiLink>
            </Box>
          </Grid>
          
          <Grid item xs={6} sm={4} md={2}>
            <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600, mb: 1.5 }}>
              Quick Links
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
              {[
                { text: 'Services', to: '/services' },
                { text: 'About Us', to: '/about' },
                { text: 'FAQ', to: '/faq' },
                { text: 'Contact Us', to: '/contact' }
              ].map((item, index) => (
                <MuiLink 
                  key={index}
                  component={Link} 
                  to={item.to} 
                  color="inherit" 
                  sx={{ 
                    fontSize: '0.85rem',
                    textDecoration: 'none', 
                    opacity: 0.9,
                    '&:hover': { 
                      textDecoration: 'underline',
                      opacity: 1
                    } 
                  }}
                >
                  {item.text}
                </MuiLink>
              ))}
            </Box>
          </Grid>
          
          <Grid item xs={6} sm={4} md={2}>
            <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600, mb: 1.5 }}>
              Legal
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
              {[
                { text: 'Privacy Policy', to: '/privacy' },
                { text: 'Terms of Service', to: '/terms' }
              ].map((item, index) => (
                <MuiLink 
                  key={index}
                  component={Link} 
                  to={item.to} 
                  color="inherit" 
                  sx={{ 
                    fontSize: '0.85rem',
                    textDecoration: 'none', 
                    opacity: 0.9,
                    '&:hover': { 
                      textDecoration: 'underline',
                      opacity: 1
                    } 
                  }}
                >
                  {item.text}
                </MuiLink>
              ))}
            </Box>
          </Grid>
          
          <Grid item xs={12} sx={{ mt: { xs: 3, sm: 0 }, textAlign: { xs: 'center', sm: 'right' } }}>
            <Typography variant="body2" sx={{ opacity: 0.8, fontSize: '0.8rem' }}>
              © {currentYear} Eagle Vision Edge LLC. All rights reserved.
            </Typography>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};

export default Footer;
