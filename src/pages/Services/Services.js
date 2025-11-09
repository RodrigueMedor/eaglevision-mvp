import React from 'react';
import { Box, Container, Grid, Typography, Paper, List, ListItem, ListItemIcon, ListItemText } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import GavelIcon from '@mui/icons-material/Gavel';
import AssignmentIcon from '@mui/icons-material/Assignment';
import ContactSupportIcon from '@mui/icons-material/ContactSupport';
import Button from '@mui/material/Button';
import { Link } from 'react-router-dom';

const services = [
  {
    icon: <AssignmentIcon color="primary" sx={{ fontSize: 50 }} />,
    title: 'Tax Filing & Business Registration',
    description: 'Professional tax preparation services for individuals and businesses, ensuring accuracy and maximizing your returns.',
    features: [
      'Individual and business tax preparation',
      'Tax planning and consulting',
      'Business registration and EIN acquisition',
      'Quarterly tax estimates and filings',
      'Tax resolution services'
    ]
  },
  {
    icon: <GavelIcon color="primary" sx={{ fontSize: 50 }} />,
    title: 'Immigration Form Assistance',
    description: 'Expert guidance through the complex immigration process with careful attention to detail and accuracy.',
    features: [
      'Family-based petitions (I-130, I-485, etc.)',
      'Work visas and employment authorization',
      'Naturalization and citizenship applications',
      'DACA renewals',
      'Permanent resident card renewals'
    ]
  },
  {
    icon: <ContactSupportIcon color="primary" sx={{ fontSize: 50 }} />,
    title: 'Document & Application Support',
    description: 'Comprehensive assistance with various legal documents and applications.',
    features: [
      'Document translation and notarization',
      'Application review and preparation',
      'Case status updates and follow-up',
      'Document organization and management',
      'Consultation for complex cases'
    ]
  }
];

const Services = () => {
  return (
    <Box>
      {/* Banner Section */}
      <Box 
        sx={{ 
          bgcolor: 'primary.main',
          color: 'white',
          py: 8,
          mb: 6,
          backgroundImage: 'linear-gradient(rgba(0, 86, 179, 0.9), rgba(0, 86, 179, 0.9)), url(/images/services-banner.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          minHeight: '300px',
          display: 'flex',
          alignItems: 'center'
        }}
      >
        <Container maxWidth="lg">
          <Typography 
            variant="h2" 
            component="h1" 
            sx={{ 
              fontWeight: 700,
              mb: 2,
              textAlign: 'center',
              color: 'white'
            }}
          >
            Our Services
          </Typography>
          <Typography 
            variant="h6" 
            sx={{ 
              textAlign: 'center',
              maxWidth: '800px',
              mx: 'auto',
              color: 'rgba(255, 255, 255, 0.9)'
            }}
          >
            Professional, reliable, and confidential services tailored to meet your tax and immigration needs.
          </Typography>
        </Container>
      </Box>
      
      <Container maxWidth="lg" sx={{ py: 6 }}>
      

        <Grid container spacing={6}>
          {services.map((service, index) => (
            <Grid item xs={12} key={index}>
              <Paper 
                elevation={3} 
                sx={{ 
                  p: 4, 
                  borderRadius: 2,
                  height: '100%',
                  transition: 'transform 0.3s, box-shadow 0.3s',
                  '&:hover': {
                    transform: 'translateY(-5px)',
                    boxShadow: 6,
                  },
                }}
              >
                <Box display="flex" flexDirection={{ xs: 'column', md: 'row' }} alignItems="center" mb={3}>
                  <Box mr={{ md: 4 }} mb={{ xs: 2, md: 0 }}>
                    {service.icon}
                  </Box>
                  <Box flex={1}>
                    <Typography variant="h4" component="h2" gutterBottom sx={{ fontWeight: 600, color: 'primary.main' }}>
                      {service.title}
                    </Typography>
                    <Typography variant="body1" paragraph>
                      {service.description}
                    </Typography>
                  </Box>
                </Box>
                
                <Typography variant="h6" gutterBottom sx={{ mt: 3, fontWeight: 600 }}>
                  What we offer:
                </Typography>
                <List dense>
                  {service.features.map((feature, idx) => (
                    <ListItem key={idx} disableGutters>
                      <ListItemIcon sx={{ minWidth: 36 }}>
                        <CheckCircleIcon color="primary" />
                      </ListItemIcon>
                      <ListItemText primary={feature} />
                    </ListItem>
                  ))}
                </List>
              </Paper>
            </Grid>
          ))}
        </Grid>

        <Box textAlign="center" mt={8}>
          <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
            Ready to get started with our services?
          </Typography>
          <Button
            component={Link}
            to="/contact"
            variant="contained"
            color="primary"
            size="large"
            sx={{
              px: 6,
              py: 1.5,
              fontSize: '1.1rem',
              textTransform: 'none',
              borderRadius: '8px',
              fontWeight: 600,
            }}
          >
            Contact Us Today
          </Button>
        </Box>
      </Container>
    </Box>
  );
};

export default Services;
