import React from 'react';
import { 
  Box, 
  Container, 
  Grid, 
  Typography, 
  Paper, 
  Button, 
  useTheme,
  useMediaQuery,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip
} from '@mui/material';
import { 
  Receipt as ReceiptIcon,
  Assignment as AssignmentIcon,
  Translate as TranslateIcon,
  CheckCircle as CheckCircleIcon
} from '@mui/icons-material';
import { Link } from 'react-router-dom';

const services = [
  {
    title: 'Individual & Business Tax Preparation',
    icon: <ReceiptIcon color="primary" sx={{ fontSize: 50 }} />,
    description: 'Expert tax preparation services for both individuals and businesses. We maximize your refunds and ensure compliance with all tax regulations.',
    features: [
      'Personal Tax Returns',
      'Business Tax Returns',
      'Tax Planning',
      'IRS Representation',
      'Tax Resolution Services'
    ]
  },
  {
    title: 'ITIN Application Assistance',
    icon: <AssignmentIcon color="primary" sx={{ fontSize: 50 }} />,
    description: 'Professional help with Individual Taxpayer Identification Number applications and renewals for non-residents and foreign nationals.',
    features: [
      'New ITIN Applications',
      'ITIN Renewals',
      'Document Certification',
      'Fast Processing',
      'Expert Guidance'
    ]
  },
  {
    title: 'Immigration Services',
    icon: <AssignmentIcon color="primary" sx={{ fontSize: 50 }} />,
    description: 'Comprehensive USCIS form preparation and filing assistance for all your immigration needs.',
    features: [
      'Family-Based Immigration (I-130, I-485, I-751, I-864)',
      'Citizenship & Naturalization (N-400, N-600)',
      'Green Card Renewal/Replacement (I-90)',
      'Work Authorization (I-765)',
      'Travel Documents (I-131)',
      'DACA Renewals',
      'Visa Petitions (I-129F, I-140)',
      'Removal of Conditions (I-751)',
      'Waivers (I-601, I-601A, I-212)',
      'U.S. Passport Applications'
    ]
  },
  {
    title: 'Translation & Notary Services',
    icon: <TranslateIcon color="primary" sx={{ fontSize: 50 }} />,
    description: 'Certified document translation and notary services with flexible scheduling and bilingual support.',
    features: [
      'Document Translation',
      'Certified Notary',
      'Bilingual Support',
      'Mobile Service Available',
      'Legal Document Support'
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
