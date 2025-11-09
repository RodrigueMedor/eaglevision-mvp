import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Button, 
  Card,
  CardContent,
  Container, 
  Divider,
  Grid, 
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Paper,
  Stack, 
  Typography, 
  useTheme,
  useMediaQuery,
  Fade,
  Grow,
  Zoom,
  useScrollTrigger,
  Chip
} from '@mui/material';
import PhoneIcon from '@mui/icons-material/Phone';
import ScheduleIcon from '@mui/icons-material/Schedule';
import { Link } from 'react-router-dom';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import AppointmentModal from '../../components/AppointmentModal/AppointmentModal';
import { 
  CheckCircle as CheckCircleIcon, 
  Email as EmailIcon,
  Gavel as GavelIcon,
  AccountBalance as AccountBalanceIcon,
  Description as DescriptionIcon,
  ArrowForward as ArrowForwardIcon,
  Star as StarIcon,
  People as PeopleIcon,
  VerifiedUser as VerifiedUserIcon,
  Receipt as ReceiptIcon,
  Assignment as AssignmentIcon,
  Business as BusinessIcon,
  Translate as TranslateIcon,
  Security as SecurityIcon,
  Speed as SpeedIcon,
  ThumbUp as ThumbUpIcon
} from '@mui/icons-material';

// Service data with detailed descriptions and icons
const services = [
  {
    title: 'Tax Preparation',
    description: 'Professional tax filing for individuals and businesses with maximum refunds guaranteed. We handle all forms including 1040, 1120, 1065, and more.',
    icon: <ReceiptIcon fontSize="large" color="primary" />,
    features: ['Personal & Business Taxes', 'Tax Planning', 'IRS Problem Resolution', 'Year-Round Support']
  },
  {
    title: 'Immigration Services',
    description: 'Comprehensive assistance with all immigration forms and documentation, including green cards, citizenship, work visas, and family petitions.',
    icon: <AssignmentIcon fontSize="large" color="primary" />,
    features: ['Green Cards', 'Citizenship', 'Work Visas', 'Family Petitions']
  },
  {
    title: 'Business Services',
    description: 'Complete business formation, registration, and compliance services to help your business thrive in today\'s competitive market.',
    icon: <BusinessIcon fontSize="large" color="primary" />,
    features: ['LLC Formation', 'EIN Registration', 'Annual Reports', 'Business Licensing']
  },
  {
    title: 'Notary Services',
    description: 'Certified notary services for all your document needs, available with flexible scheduling options.',
    icon: <VerifiedUserIcon fontSize="large" color="primary" />,
    features: ['Document Notarization', 'Mobile Service Available', 'Evening/Weekend Appts', 'Bilingual Support']
  }
];

// Why Choose Us features with unique icons
const features = [
  { 
    text: 'Licensed & Certified', 
    description: 'Our team consists of licensed tax professionals and accredited representatives.',
    icon: <VerifiedUserIcon color="primary" /> 
  },
  { 
    text: 'Affordable & Transparent', 
    description: 'No hidden fees with clear, upfront pricing for all our services.',
    icon: <ThumbUpIcon color="primary" /> 
  },
  { 
    text: 'Bilingual Team', 
    description: 'Fluent in English and Spanish to serve our diverse community.',
    icon: <TranslateIcon color="primary" /> 
  },
  { 
    text: 'Personalized Service', 
    description: 'Customized solutions tailored to your specific needs and goals.',
    icon: <PeopleIcon color="primary" /> 
  },
  { 
    text: 'Fast & Reliable', 
    description: 'Efficient service with a track record of on-time submissions and approvals.',
    icon: <SpeedIcon color="primary" /> 
  },
  { 
    text: 'Secure & Confidential', 
    description: 'Your privacy is our priority with secure document handling.',
    icon: <SecurityIcon color="primary" /> 
  }
];

// Testimonials data
const testimonials = [
  {
    name: 'Maria G.',
    role: 'Small Business Owner',
    content: 'Eagle Vision helped me with my business taxes and saved me thousands. Their team is knowledgeable and professional.',
    rating: 5
  },
  {
    name: 'James R.',
    role: 'Individual Taxpayer',
    content: 'The best tax service I\'ve ever used. They made the process so easy and got me a much bigger refund than I expected!',
    rating: 5
  },
  {
    name: 'Sofia M.',
    role: 'Immigration Client',
    content: 'They guided me through the entire green card process. Couldn\'t have done it without their expertise and support.',
    rating: 5
  }
];

const Home = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleBookAppointment = (appointmentData) => {
    console.log('Appointment booked:', appointmentData);
    // Here you would typically send the data to your backend
    // For now, we'll just log it to the console
  };

  const handleOpenModal = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };
  
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  // Testimonials section has been removed
  const isMobileView = isMobile; // Keep isMobile to prevent warning

  return (
    <Box sx={{ 
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      marginTop: { xs: '-40px', sm: '-30px' } // Pull content up
    }}>
      {/* Hero Section with Overlay */}
      <Box sx={{
        background: `linear-gradient(rgba(26, 54, 93, 0.85), rgba(13, 29, 49, 0.85)), url('/images/office-banner.jpg')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        pt: { xs: 4, md: 6 },
        pb: { xs: 6, md: 8 },
        display: 'flex',
        alignItems: 'flex-start',
        color: 'white',
        position: 'relative',
        zIndex: 1,
        boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
        minHeight: '60vh',
        justifyContent: 'center',
        flexDirection: 'column'
      }}>
        <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 2, py: { xs: 0, md: 2 } }}>
          <Grid container spacing={4} alignItems="center">
            <Grid item xs={12} lg={7}>
              <Chip 
                label="Trusted Since 2010" 
                color="secondary" 
                size="small" 
                sx={{ 
                  mb: 2, 
                  color: 'white',
                  fontWeight: 600,
                  px: 1,
                  '& .MuiChip-label': { px: 1.5 }
                }} 
              />
              
              <Typography 
                variant="h1" 
                component="h1"
                sx={{
                  fontWeight: 700,
                  mb: 2,
                  fontSize: { xs: '1.8rem', sm: '2.2rem', md: '2.5rem' },
                  lineHeight: 1.2,
                  color: 'white',
                }}
              >
                Expert Tax & Immigration Services in Your Area
              </Typography>
              
              <Typography 
                variant="body1" 
                component="p" 
                sx={{ 
                  mb: 3,
                  color: 'rgba(255, 255, 255, 0.9)',
                  fontSize: { xs: '0.95rem', md: '1.05rem' },
                  lineHeight: 1.6,
                  maxWidth: '100%'
                }}
              >
                Professional, affordable, and reliable assistance with tax preparation, 
                immigration forms, and business services. Your success is our priority.
              </Typography>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 4, maxWidth: '90%' }}>
                <Button
                  variant="contained"
                  color="secondary"
                  component="a"
                  href="tel:6414514536"
                  size="large"
                  startIcon={<PhoneIcon />}
                  sx={{
                    py: 1.8,
                    px: 4,
                    borderRadius: '8px',
                    textTransform: 'none',
                    fontWeight: 600,
                    fontSize: '1.1rem',
                    whiteSpace: 'nowrap',
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      boxShadow: 3,
                      backgroundColor: theme.palette.secondary.dark
                    },
                    transition: 'all 0.3s ease',
                  }}
                >
                  Call Now (641) 451-4536
                </Button>
                
                <Button
                  variant="outlined"
                  color="inherit"
                  component={Link}
                  to="/contact"
                  size="large"
                  endIcon={<ArrowForwardIcon />}
                  sx={{
                    py: 1.8,
                    px: 4,
                    borderRadius: '8px',
                    textTransform: 'none',
                    fontWeight: 600,
                    fontSize: '1.1rem',
                    borderWidth: '2px',
                    color: 'white',
                    borderColor: 'rgba(255, 255, 255, 0.3)',
                    '&:hover': {
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      borderColor: 'white',
                      transform: 'translateY(-2px)'
                    },
                    transition: 'all 0.3s ease',
                    whiteSpace: 'nowrap'
                  }}
                >
                  Free Consultation
                </Button>
                
              </Stack>

              <Box sx={{ mt: 2, textAlign: 'center' }}>
                <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.8)', mb: 2, fontSize: '1rem' }}>
                  Or book your appointment online now
                </Typography>
                
                <Button
                  variant="contained"
                  color="secondary"
                  onClick={handleOpenModal}
                  size="large"
                  startIcon={<ScheduleIcon />}
                  sx={{
                    py: 1.5,
                    px: 5,
                    borderRadius: '8px',
                    textTransform: 'none',
                    fontWeight: 600,
                    fontSize: '1.1rem',
                    whiteSpace: 'nowrap',
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      boxShadow: 3,
                      backgroundColor: theme.palette.secondary.dark
                    },
                    transition: 'all 0.3s ease',
                  }}
                >
                  Book Your Appointment
                </Button>
                
                <LocalizationProvider dateAdapter={AdapterDateFns}>
                  <AppointmentModal 
                    open={isModalOpen} 
                    onClose={handleCloseModal}
                    onSubmit={handleBookAppointment}
                  />
                </LocalizationProvider>
              </Box>
              
              <Box sx={{ mt: 3, mb: 2 }}>
                <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.8)', mb: 1, fontSize: '0.9rem' }}>
                  We're here to help with all your tax and immigration needs
                </Typography>
              </Box>
              
              {/* Trust Badges */}
              <Box sx={{ 
                display: 'flex', 
                flexWrap: 'wrap', 
                gap: 3, 
                mt: 3,
                '& > *': {
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  color: 'rgba(255, 255, 255, 0.9)',
                  fontSize: '0.95rem',
                  '& svg': {
                    color: theme.palette.secondary.main
                  }
                }
              }}>
                <Box>
                  <CheckCircleIcon fontSize="small" />
                  <span>Licensed & Certified</span>
                </Box>
                <Box>
                  <CheckCircleIcon fontSize="small" />
                  <span>Bilingual Support</span>
                </Box>
                <Box>
                  <CheckCircleIcon fontSize="small" />
                  <span>Affordable Rates</span>
                </Box>
              </Box>
            </Grid>

            {/* Appointment Card removed from here */}
          </Grid>
        </Container>
        
        {/* Animated elements */}
        <Box 
          sx={{
            position: 'absolute',
            bottom: -30,
            left: 0,
            right: 0,
            height: '60px',
            background: 'white',
            transform: 'skewY(-1.5deg)',
            transformOrigin: 'top left',
            zIndex: 1
          }}
        />
      </Box>
      <Box sx={{ mt: 8 }} />

      {/* Services Section */}
      <Box component="section" id="services" sx={{ py: { xs: 8, md: 12 }, backgroundColor: 'background.paper' }}>
        <Container maxWidth="lg">
          <Box textAlign="center" sx={{ mb: { xs: 6, md: 8 } }}>
            <Chip 
              label="OUR SERVICES" 
              color="secondary" 
              size="small" 
              sx={{ 
                mb: 2, 
                color: 'white',
                fontWeight: 600,
                px: 1,
                '& .MuiChip-label': { px: 1.5 }
              }} 
            />
            <Typography
              variant="h2"
              component="h2"
              sx={{
                fontWeight: 700,
                fontSize: { xs: '2rem', sm: '2.5rem', md: '3rem' },
                mb: 2,
                color: 'text.primary'
              }}
            >
              Comprehensive Tax & Immigration Solutions
            </Typography>
            <Divider 
              sx={{ 
                width: 100, 
                height: 4, 
                backgroundColor: 'secondary.main', 
                mx: 'auto', 
                my: 3 
              }} 
            />
            <Typography 
              variant="h6" 
              color="text.secondary" 
              sx={{ 
                maxWidth: 700, 
                mx: 'auto',
                fontSize: { xs: '1rem', md: '1.1rem' },
                lineHeight: 1.7
              }}
            >
              We provide expert assistance for all your tax and immigration needs with personalized service and attention to detail.
            </Typography>
          </Box>
          
          <Grid container spacing={4}>
            {services.map((service, index) => (
              <Grid item xs={12} sm={6} lg={3} key={index}>
                <Grow in={true} timeout={index * 200}>
                  <Card 
                    elevation={0}
                    sx={{
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 2,
                      overflow: 'hidden',
                      transition: 'all 0.3s cubic-bezier(.25,.8,.25,1)',
                      '&:hover': {
                        transform: 'translateY(-8px)',
                        boxShadow: 6,
                        borderColor: 'primary.main',
                        '& .service-icon': {
                          backgroundColor: 'primary.main',
                          color: 'primary.contrastText',
                          transform: 'scale(1.1)'
                        }
                      },
                      '&:hover .service-learn-more': {
                        color: 'primary.main',
                        transform: 'translateX(5px)'
                      }
                    }}
                  >
                    <Box 
                      className="service-icon"
                      sx={{
                        p: 3,
                        display: 'flex',
                        justifyContent: 'center',
                        backgroundColor: 'primary.light',
                        color: 'primary.main',
                        transition: 'all 0.3s ease',
                      }}
                    >
                      {service.icon}
                    </Box>
                    <CardContent sx={{ p: 4, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                      <Typography 
                        variant="h5" 
                        component="h3" 
                        gutterBottom 
                        sx={{ 
                          fontWeight: 700,
                          color: 'text.primary',
                          mb: 2
                        }}
                      >
                        {service.title}
                      </Typography>
                      <Typography 
                        variant="body1" 
                        color="text.secondary" 
                        sx={{ 
                          mb: 3,
                          flexGrow: 1
                        }}
                      >
                        {service.description}
                      </Typography>
                      
                      <List dense disablePadding sx={{ mb: 3 }}>
                        {service.features.map((feature, idx) => (
                          <ListItem key={idx} disableGutters sx={{ py: 0.5, px: 0 }}>
                            <ListItemIcon sx={{ minWidth: 32 }}>
                              <CheckCircleIcon color="primary" fontSize="small" />
                            </ListItemIcon>
                            <ListItemText 
                              primary={feature} 
                              primaryTypographyProps={{ 
                                variant: 'body2',
                                color: 'text.primary'
                              }} 
                            />
                          </ListItem>
                        ))}
                      </List>
                      
                      <Button 
                        component={Link}
                        to="/services"
                        color="primary"
                        size="small"
                        endIcon={<ArrowForwardIcon />}
                        className="service-learn-more"
                        sx={{
                          mt: 'auto',
                          alignSelf: 'flex-start',
                          fontWeight: 600,
                          textTransform: 'none',
                          px: 0,
                          color: 'text.primary',
                          transition: 'all 0.3s ease',
                          '&:hover': {
                            backgroundColor: 'transparent',
                            textDecoration: 'underline',
                            textDecorationThickness: '2px',
                            textUnderlineOffset: '3px'
                          }
                        }}
                      >
                        Learn More
                      </Button>
                    </CardContent>
                  </Card>
                </Grow>
              </Grid>
            ))}
          </Grid>
          
          <Box sx={{ textAlign: 'center', mt: 8 }}>
            <Button 
              variant="outlined" 
              color="primary" 
              size="large"
              component={Link}
              to="/services"
              endIcon={<ArrowForwardIcon />}
              sx={{
                px: 5,
                py: 1.5,
                borderRadius: '8px',
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '1.1rem',
                '&:hover': {
                  backgroundColor: 'primary.main',
                  color: 'white',
                  transform: 'translateY(-2px)',
                  boxShadow: 3
                },
                transition: 'all 0.3s ease'
              }}
            >
              View All Services
            </Button>
          </Box>
        </Container>
      </Box>

      {/* Why Choose Us Section */}
      <Box sx={{ py: { xs: 8, md: 10 }, backgroundColor: 'background.default' }}>
        <Container maxWidth="lg">
          <Box textAlign="center" sx={{ mb: { xs: 6, md: 8 } }}>
            <Chip 
              label="WHY CHOOSE US" 
              color="secondary" 
              size="small" 
              sx={{ 
                mb: 2, 
                color: 'white',
                fontWeight: 600,
                px: 1,
                '& .MuiChip-label': { px: 1.5 }
              }} 
            />
            <Typography
              variant="h2"
              component="h2"
              sx={{
                fontWeight: 700,
                fontSize: { xs: '2rem', sm: '2.5rem', md: '3rem' },
                mb: 2,
                color: 'text.primary'
              }}
            >
              Why Clients Trust Eagle Vision
            </Typography>
            <Divider 
              sx={{ 
                width: 100, 
                height: 4, 
                backgroundColor: 'secondary.main', 
                mx: 'auto', 
                my: 3 
              }} 
            />
            <Typography 
              variant="h6" 
              color="text.secondary" 
              sx={{ 
                maxWidth: 700, 
                mx: 'auto',
                fontSize: { xs: '1rem', md: '1.1rem' },
                lineHeight: 1.7,
                mb: 4
              }}
            >
              We're committed to providing exceptional service with a personal touch that sets us apart.
            </Typography>
          </Box>

          <Grid container spacing={4} alignItems="flex-start">
            <Grid item xs={12} md={8}>
              <Grid container spacing={4}>
                {features.map((feature, index) => (
              <Grid item xs={12} sm={6} md={4} key={index}>
                <Fade in={true} timeout={index * 200}>
                  <Paper 
                    elevation={0}
                    sx={{
                      p: 4,
                      height: '100%',
                      borderRadius: 2,
                      border: '1px solid',
                      borderColor: 'divider',
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        transform: 'translateY(-5px)',
                        boxShadow: 3,
                        borderColor: 'primary.main',
                        '& .feature-icon': {
                          backgroundColor: 'primary.main',
                          color: 'white'
                        }
                      }
                    }}
                  >
                    <Box 
                      className="feature-icon"
                      sx={{
                        display: 'inline-flex',
                        p: 2,
                        mb: 3,
                        borderRadius: '50%',
                        backgroundColor: 'primary.light',
                        color: 'primary.main',
                        transition: 'all 0.3s ease',
                      }}
                    >
                      {React.cloneElement(feature.icon, { fontSize: 'large' })}
                    </Box>
                    <Typography 
                      variant="h5" 
                      component="h3" 
                      gutterBottom 
                      sx={{ 
                        fontWeight: 700,
                        color: 'text.primary',
                        mb: 2
                      }}
                    >
                      {feature.text}
                    </Typography>
                    <Typography 
                      variant="body1" 
                      color="text.secondary"
                      sx={{ lineHeight: 1.7 }}
                    >
                      {feature.description}
                    </Typography>
                  </Paper>
                  </Fade>
                </Grid>
              ))}
              </Grid>
            </Grid>
            
            {/* Book Your Appointment Card */}
            <Grid item xs={12} md={4} sx={{ position: 'sticky', top: 32 }}>
              <Fade in={true} timeout={1000}>
                <Paper 
                  elevation={6} 
                  sx={{ 
                    p: 3, 
                    borderRadius: 2,
                    background: 'white',
                    border: '1px solid',
                    borderColor: 'divider',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      transform: 'translateY(-5px)',
                      boxShadow: 3,
                      borderColor: 'primary.main'
                    },
                    position: 'relative',
                    overflow: 'hidden',
                    '&::before': {
                      content: '""',
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      height: '5px',
                      background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`
                    }
                  }}
                >
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h5" component="h3" sx={{ 
                      mb: 3, 
                      color: theme.palette.primary.main,
                      fontWeight: 700,
                      fontSize: '1.5rem'
                    }}>
                      Book Your Appointment
                    </Typography>
                    
                    <List sx={{ mb: 3, textAlign: 'left' }}>
                      {[
                        { text: 'Free Initial Consultation', icon: <CheckCircleIcon color="primary" /> },
                        { text: 'Flexible Scheduling', icon: <ScheduleIcon color="primary" /> },
                        { text: 'Virtual Appointments', icon: <PhoneIcon color="primary" /> }
                      ].map((item, index) => (
                        <ListItem key={index} disableGutters sx={{ px: 0, py: 0.5 }}>
                          <ListItemIcon sx={{ minWidth: 36 }}>{item.icon}</ListItemIcon>
                          <ListItemText 
                            primary={item.text} 
                            primaryTypographyProps={{ 
                              variant: 'body2',
                              color: 'text.primary'
                            }} 
                          />
                        </ListItem>
                      ))}
                    </List>
                    
                    <Button 
                      variant="contained" 
                      color="primary" 
                      fullWidth 
                      size="large"
                      component={Link}
                      to="/contact"
                      startIcon={<ScheduleIcon />}
                      sx={{
                        py: 1.5,
                        borderRadius: '8px',
                        textTransform: 'none',
                        fontWeight: 600,
                        '&:hover': {
                          backgroundColor: theme.palette.primary.dark,
                          transform: 'translateY(-2px)'
                        },
                        transition: 'all 0.3s ease'
                      }}
                    >
                      Schedule Now
                    </Button>
                  </Box>
                </Paper>
              </Fade>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* CTA Section */}
      <Box sx={{ backgroundColor: 'primary.light', py: 8, color: 'white' }}>
        <Container maxWidth="md" sx={{ textAlign: 'center' }}>
          <Typography variant="h3" component="h2" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
            Ready to Get Started?
          </Typography>
          <Typography variant="h6" sx={{ mb: 4, opacity: 0.9 }}>
            Contact us today for a free consultation and let us help you with your tax and immigration needs.
          </Typography>
          <Button
            component={Link}
            to="/contact"
            variant="contained"
            color="secondary"
            size="large"
            sx={{
              px: 6,
              py: 1.5,
              fontSize: '1.1rem',
              textTransform: 'none',
              borderRadius: '8px',
              fontWeight: 600,
              color: 'text.primary',
            }}
          >
            Contact Us Today
          </Button>
        </Container>
      </Box>
    </Box>
  );
};

export default Home;
