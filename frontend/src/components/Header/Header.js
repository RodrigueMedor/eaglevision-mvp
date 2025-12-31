import React, { useState } from 'react';
import { 
  AppBar, 
  Toolbar, 
  Typography, 
  Button, 
  Box, 
  Container, 
  IconButton, 
  useMediaQuery, 
  useTheme,
  Drawer,
  List,
  ListItem,
  ListItemText,
  Divider
} from '@mui/material';
import { Phone, Menu, Close } from '@mui/icons-material';
import { Link as RouterLink } from 'react-router-dom';
import { styled } from '@mui/material/styles';

const StyledLink = styled(RouterLink)(({ theme }) => ({
  color: theme.palette.text.primary,
  textDecoration: 'none',
  fontWeight: 500,
  '&:hover': {
    color: theme.palette.primary.main,
  },
}));

const Header = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const navItems = [
    { text: 'Home', to: '/' },
    { text: 'Services', to: '/services' },
    { text: 'About', to: '/about' },
    { text: 'FAQ', to: '/faq' },
    { text: 'Contact', to: '/contact' },
  ];

  const drawer = (
    <Box sx={{ width: 250 }}>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', p: 2 }}>
        <IconButton onClick={handleDrawerToggle}>
          <Close />
        </IconButton>
      </Box>
      <Divider />
      <List>
        {navItems.map((item) => (
          <ListItem 
            button 
            key={item.text} 
            component={RouterLink} 
            to={item.to}
            onClick={handleDrawerToggle}
            sx={{
              '&:hover': {
                backgroundColor: 'rgba(0, 0, 0, 0.04)',
              },
            }}
          >
            <ListItemText primary={item.text} />
          </ListItem>
        ))}
        <ListItem 
          button 
          component="a" 
          href="tel:6414514536"
          sx={{
            color: 'primary.main',
            '&:hover': {
              backgroundColor: 'rgba(0, 0, 0, 0.04)',
            },
          }}
        >
          <Phone sx={{ mr: 1 }} />
          <ListItemText primary="(641) 451-4536" />
        </ListItem>
      </List>
    </Box>
  );

  return (
    <>
      <AppBar 
        position="sticky" 
        elevation={0} 
        sx={{ 
          backgroundColor: 'white', 
          color: 'text.primary',
          borderBottom: `1px solid ${theme.palette.divider}`,
        }}
      >
        <Container maxWidth="xl">
          <Toolbar disableGutters sx={{ py: { xs: 1, md: 2 } }}>
            <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center' }}>
              <Box
                component={RouterLink}
                to="/"
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  textDecoration: 'none',
                  '&:hover': {
                    opacity: 0.9,
                  },
                }}
              >
                <img 
                  src="/logoNew.png" 
                  alt="Eagle Vision Edge" 
                  style={{ 
                    height: '60px',
                    width: 'auto',
                    maxWidth: '400px',
                    objectFit: 'contain',
                  }}
                />
                <Box sx={{ 
                  ml: 3,
                  display: { xs: 'none', sm: 'flex' },
                  flexDirection: 'column',
                  justifyContent: 'center',
                  borderLeft: `2px solid ${theme.palette.primary.main}20`,
                  pl: 3,
                  height: '60%'
                }}>
                  <Typography
                    variant="h6"
                    component="div"
                    sx={{
                      fontWeight: 700,
                      color: 'primary.main',
                      lineHeight: 1.1,
                      fontSize: { sm: '1.25rem', md: '1.5rem' },
                      letterSpacing: '0.5px',
                      textTransform: 'uppercase'
                    }}
                  >
                    Eagle Vision Edge
                  </Typography>
                  <Typography
                    variant="subtitle1"
                    component="div"
                    sx={{
                      fontWeight: 500,
                      color: 'text.secondary',
                      fontSize: { sm: '0.85rem', md: '1rem' },
                      letterSpacing: '0.3px',
                      mt: 0.5
                    }}
                  >
                    Tax & Immigration Services
                  </Typography>
                </Box>
              </Box>
            </Box>

            {!isMobile ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                {navItems.map((item) => (
                  <StyledLink key={item.text} to={item.to}>
                    {item.text}
                  </StyledLink>
                ))}
                <Button
                  variant="contained"
                  color="secondary"
                  href="tel:6414514536"
                  startIcon={<Phone />}
                  sx={{
                    ml: 2,
                    textTransform: 'none',
                    borderRadius: 2,
                    px: 3,
                    py: 1,
                    fontWeight: 600,
                    boxShadow: 'none',
                    '&:hover': {
                      boxShadow: `0 4px 12px ${theme.palette.secondary.main}40`,
                      backgroundColor: theme.palette.secondary.dark,
                    },
                  }}
                >
                  (641) 451-4536
                </Button>
              </Box>
            ) : (
              <IconButton
                color="inherit"
                aria-label="open menu"
                edge="end"
                onClick={handleDrawerToggle}
                sx={{
                  color: 'text.primary',
                  p: 1,
                  '&:hover': {
                    backgroundColor: 'action.hover',
                  },
                }}
              >
                <Menu />
              </IconButton>
            )}
          </Toolbar>
        </Container>
      </AppBar>
      <nav>
        <Drawer
          variant="temporary"
          anchor="right"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true, // Better open performance on mobile
          }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: 280,
            },
          }}
        >
          {drawer}
        </Drawer>
      </nav>
    </>
  );
};

export default Header;
