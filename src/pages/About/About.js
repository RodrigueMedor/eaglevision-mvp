import React from 'react';
import { Box, Container, Typography, Grid, List, Paper, useMediaQuery, useTheme, Link } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { Phone, Email, LocationOn, CheckCircle } from '@mui/icons-material';
import Button from '@mui/material/Button';

const team = [
  {
    name: 'Rodrigue Medor',
    role: 'Founder & Tax Professional',
    bio: 'With a passion for helping individuals and small businesses navigate the complexities of tax preparation and business registration, Rod brings a personal touch to every client interaction.',
    image: '/images/rodrigue-medor.jpg' // You may want to add your photo here
  },
  {
    name: 'Our Network',
    role: 'Trusted Partners',
    bio: 'We work with a select group of trusted professionals including CPAs, immigration attorneys, and business consultants to provide comprehensive support for all your needs.',
    image: '/images/team-network.jpg' // Generic team/network image
  }
];

const features = [
  'Over 20 years of combined experience',
  'Bilingual support (English, Spanish, French)',
  'Personalized service for each client',
  'Up-to-date with latest tax laws and regulations',
  'Strong track record of successful cases',
  'Committed to client confidentiality'
];

const About = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  return (
    <Box sx={{ py: 8 }}>
      {/* Hero Section */}
      <Box 
        sx={{ 
          bgcolor: 'primary.main',
          color: 'white',
          py: 8,
          mb: 6,
          backgroundImage: 'linear-gradient(rgba(0, 86, 179, 0.9), rgba(0, 86, 179, 0.9)), url(/images/about-banner.jpg)',
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
              mb: 3,
              textAlign: 'center',
              fontSize: isMobile ? '2.5rem' : '3.5rem',
            }}
          >
            About Eagle Vision Edge LLC
          </Typography>
          <Typography 
            variant="h5" 
            component="h2" 
            sx={{ 
              maxWidth: '800px',
              mx: 'auto',
              textAlign: 'center',
              opacity: 0.9,
              fontWeight: 400,
            }}
          >
            Your trusted partner for professional tax and immigration services
          </Typography>
        </Container>
      </Box>

      <Container maxWidth="lg">
        {/* Our Story */}
        <Box mb={8}>
          <Typography variant="h3" component="h2" gutterBottom sx={{ fontWeight: 600, color: 'primary.main', mb: 4 }}>
            Our Story
          </Typography>
          <Grid container spacing={4} alignItems="center">
            <Grid item xs={12} md={6}>
              <Typography variant="body1" paragraph>
                Founded in 2010, Eagle Vision Edge LLC has been providing exceptional tax and immigration services to individuals and businesses in the community. What started as a small practice has grown into a trusted name, thanks to our commitment to excellence and personalized service.
              </Typography>
              <Typography variant="body1" paragraph>
                Our team of experienced professionals brings together expertise in tax preparation, business registration, and immigration services, offering comprehensive solutions under one roof. We understand the challenges our clients face and are dedicated to making complex processes simple and stress-free.
              </Typography>
              <Typography variant="body1" paragraph>
                At Eagle Vision Edge, we believe in building lasting relationships with our clients based on trust, integrity, and outstanding results. Whether you're an individual needing help with tax filing or an immigrant navigating the complex U.S. immigration system, we're here to guide you every step of the way.
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Box
                component="img"
                src="/images/about-office.jpg"
                alt="Our Office"
                sx={{
                  width: '100%',
                  height: 'auto',
                  borderRadius: 2,
                  boxShadow: 3,
                }}
              />
            </Grid>
          </Grid>
        </Box>

        {/* Our Values */}
        <Box mb={8}>
          <Typography variant="h3" component="h2" gutterBottom sx={{ fontWeight: 600, color: 'primary.main', mb: 4, textAlign: 'center' }}>
            Our Values
          </Typography>
          <Grid container spacing={4}>
            {[
              {
                title: 'Integrity',
                description: 'We conduct our business with the highest ethical standards and transparency.'
              },
              {
                title: 'Excellence',
                description: 'We are committed to delivering exceptional service and achieving the best outcomes for our clients.'
              },
              {
                title: 'Compassion',
                description: 'We understand your unique situation and provide personalized support with empathy.'
              },
              {
                title: 'Expertise',
                description: 'Our team stays current with the latest regulations and best practices in our field.'
              },
              {
                title: 'Respect',
                description: 'We value diversity and treat every client with dignity and respect.'
              },
              {
                title: 'Reliability',
                description: 'You can count on us to be there when you need us, with consistent, dependable service.'
              }
            ].map((value, index) => (
              <Grid item xs={12} sm={6} md={4} key={index}>
                <Paper 
                  elevation={2} 
                  sx={{ 
                    p: 3, 
                    height: '100%',
                    borderRadius: 2,
                    transition: 'transform 0.3s',
                    '&:hover': {
                      transform: 'translateY(-5px)',
                    },
                  }}
                >
                  <Typography variant="h5" component="h3" color="primary" gutterBottom sx={{ fontWeight: 600 }}>
                    {value.title}
                  </Typography>
                  <Typography variant="body1">
                    {value.description}
                  </Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Box>

        {/* Our Team */}
        <Box mb={8}>
          <Typography variant="h3" component="h2" gutterBottom sx={{ fontWeight: 600, color: 'primary.main', mb: 6, textAlign: 'center' }}>
            Meet Our Team
          </Typography>
          <Grid container spacing={4} justifyContent="center">
            {team.map((member, index) => (
              <Grid item xs={12} sm={6} md={4} key={index}>
                <Box 
                  sx={{ 
                    textAlign: 'center',
                    '&:hover .team-member-img': {
                      transform: 'scale(1.05)',
                    },
                  }}
                >
                  <Box 
                    className="team-member-img"
                    sx={{
                      width: 200,
                      height: 200,
                      borderRadius: '50%',
                      overflow: 'hidden',
                      margin: '0 auto 20px',
                      border: '5px solid',
                      borderColor: 'primary.main',
                      transition: 'transform 0.3s',
                    }}
                  >
                    <img 
                      src={member.image} 
                      alt={member.name} 
                      style={{ 
                        width: '100%', 
                        height: '100%', 
                        objectFit: 'cover' 
                      }} 
                    />
                  </Box>
                  <Typography variant="h5" component="h3" gutterBottom sx={{ fontWeight: 600 }}>
                    {member.name}
                  </Typography>
                  <Typography variant="subtitle1" color="primary" gutterBottom sx={{ fontWeight: 500, mb: 2 }}>
                    {member.role}
                  </Typography>
                  <Typography variant="body1" color="text.secondary">
                    {member.bio}
                  </Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Box>

        {/* Why Choose Us */}
        <Box 
          sx={{ 
            backgroundColor: 'rgba(0, 86, 179, 0.05)', 
            p: 6, 
            borderRadius: 2,
            mb: 8,
          }}
        >
          <Typography variant="h3" component="h2" gutterBottom sx={{ fontWeight: 600, color: 'primary.main', mb: 4, textAlign: 'center' }}>
            Why Choose Eagle Vision Edge?
          </Typography>
          
          <Grid container spacing={4}>
            <Grid item xs={12} md={6}>
              <Typography variant="h5" component="h3" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
                Our Approach
              </Typography>
              <Typography variant="body1" paragraph>
                We take a personalized approach to every case, understanding that each client has unique needs and circumstances. Our team takes the time to listen, assess, and provide tailored solutions that work best for you.
              </Typography>
              <Typography variant="body1" paragraph>
                Our commitment to staying current with changing laws and regulations ensures that you receive the most accurate and up-to-date advice and services.
              </Typography>
              
              <Box sx={{ mt: 4 }}>
                <Button
                  component={Link}
                  to="/services"
                  variant="contained"
                  color="primary"
                  size="large"
                  sx={{
                    px: 4,
                    py: 1.5,
                    fontSize: '1rem',
                    textTransform: 'none',
                    borderRadius: '8px',
                    fontWeight: 600,
                  }}
                >
                  View Our Services
                </Button>
              </Box>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Typography variant="h5" component="h3" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
                What Sets Us Apart
              </Typography>
              
              <List disablePadding>
                {features.map((feature, index) => (
                  <Box 
                    key={index} 
                    sx={{ 
                      display: 'flex', 
                      alignItems: 'flex-start',
                      mb: 2,
                    }}
                  >
                    <CheckCircle color="primary" sx={{ mr: 2, mt: '2px', flexShrink: 0 }} />
                    <Typography variant="body1">
                      {feature}
                    </Typography>
                  </Box>
                ))}
              </List>
            </Grid>
          </Grid>
          
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 3, flexWrap: 'wrap', mt: 4 }}>
            <Button
              component="a"
              href="tel:6414514536"
              color="primary"
              size="large"
              startIcon={<Phone />}
              sx={{
                px: 4,
                py: 1.5,
                fontSize: '1rem',
                textTransform: 'none',
                borderRadius: '8px',
                fontWeight: 600,
              }}
            >
              Call Us: (641) 451-4536
            </Button>
            
            <Button
              component={Link}
              to="/contact"
              variant="outlined"
              color="primary"
              size="large"
              startIcon={<Email />}
              sx={{
                px: 4,
                py: 1.5,
                fontSize: '1rem',
                textTransform: 'none',
                borderRadius: '8px',
                fontWeight: 600,
                borderWidth: '2px',
                '&:hover': {
                  borderWidth: '2px',
                },
              }}
            >
              Send Us a Message
            </Button>
          </Box>
          
          <Box sx={{ mt: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
            <LocationOn color="primary" />
            <Typography variant="body1">
              Serving clients in [Your Location] and surrounding areas
            </Typography>
          </Box>
        </Box>
      </Container>
    </Box>
  );
};

export default About;
