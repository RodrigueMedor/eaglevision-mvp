import React, { useState } from 'react';
import { styled, useTheme } from '@mui/material/styles';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  List,
  Typography,
  Divider,
  IconButton,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  useMediaQuery,
  Tooltip,
  Avatar,
  Menu,
  MenuItem,
  Badge,
  Paper,
  Breadcrumbs,
  Link as MuiLink
} from '@mui/material';
import {
  Menu as MenuIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  Dashboard as DashboardIcon,
  CalendarMonth as AppointmentsIcon,
  CalendarMonth as CalendarIcon,
  Message as MessagesIcon,
  Assessment as ReportsIcon,
  Analytics as AnalyticsIcon,
  Settings as SettingsIcon,
  Notifications as NotificationsIcon,
  Person as PersonIcon,
  Logout as LogoutIcon,
  Home as HomeIcon
} from '@mui/icons-material';

const drawerWidth = 240;
const collapsedWidth = 64;

const Main = styled('main', { shouldForwardProp: (prop) => prop !== 'open' })(({ theme, open }) => ({
  flex: '1 1 auto',
  width: '100%',
  marginLeft: 0,
  paddingLeft: collapsedWidth,
  minHeight: 'calc(100vh - 64px)',
  transition: theme.transitions.create(['padding-left', 'width'], {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  ...(open && {
    paddingLeft: drawerWidth,
  }),
}));

const AppBarStyled = styled(AppBar, {
  shouldForwardProp: (prop) => prop !== 'open',
})(({ theme, open }) => ({
  zIndex: theme.zIndex.drawer + 1,
  backgroundColor: theme.palette.background.paper,
  color: theme.palette.text.primary,
  boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
  transition: theme.transitions.create(['margin', 'width'], {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  ...(open && {
    width: `calc(100% - ${drawerWidth}px)`,
    marginLeft: `${drawerWidth}px`,
    transition: theme.transitions.create(['margin', 'width'], {
      easing: theme.transitions.easing.easeOut,
      duration: theme.transitions.duration.enteringScreen,
    }),
  }),
}));

const DrawerHeader = styled('div')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  padding: theme.spacing(0, 1),
  ...theme.mixins.toolbar,
  justifyContent: 'flex-end',
}));

const menuItems = [
  { text: 'Dashboard', icon: <DashboardIcon />, path: '/admin/dashboard' },
  { text: 'Appointments', icon: <AppointmentsIcon />, path: '/admin/appointments' },
  { text: 'View Calendar', icon: <CalendarIcon />, path: '/admin/calendar' },
  { text: 'Messages', icon: <MessagesIcon />, path: '/admin/messages' },
  { text: 'Reports', icon: <ReportsIcon />, path: '/admin/reports' },
  { text: 'Analytics', icon: <AnalyticsIcon />, path: '/admin/analytics' },
  { divider: true },
  { text: 'Settings', icon: <SettingsIcon />, path: '/admin/settings' },
];

const StyledListItem = styled(ListItem, {
  shouldForwardProp: (prop) => prop !== 'open',
})(({ theme, open }) => ({  
  padding: theme.spacing(1, 2),
  '& .MuiListItemButton-root': {
    borderRadius: theme.shape.borderRadius,
    padding: theme.spacing(1, 1.5),
    minHeight: 48,
    justifyContent: open ? 'initial' : 'center',
  },
  '& .MuiListItemIcon-root': {
    minWidth: 0,
    marginRight: open ? theme.spacing(2) : 'auto',
    justifyContent: 'center',
  },
  '& .MuiListItemText-root': {
    opacity: open ? 1 : 0,
    transition: theme.transitions.create('opacity', {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.leavingScreen,
    }),
  },
}));

const AdminLayout = ({ children }) => {
  const theme = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [open, setOpen] = useState(!isMobile);
  const [anchorElUser, setAnchorElUser] = useState(null);
  const [anchorElNotif, setAnchorElNotif] = useState(null);
  
  // Get auth context
  const { user, logout } = useAuth();

  const handleDrawerOpen = () => {
    setOpen(true);
  };

  const handleDrawerClose = () => {
    setOpen(false);
  };

  const handleOpenUserMenu = (event) => {
    setAnchorElUser(event.currentTarget);
  };
  
  const handleCloseUserMenu = () => {
    setAnchorElUser(null);
  };
  
  const handleProfileClick = () => {
    handleCloseUserMenu();
    navigate('/admin/profile');
  };
  
  const handleSettingsClick = () => {
    handleCloseUserMenu();
    navigate('/admin/settings');
  };
  
  const handleLogoutClick = () => {
    handleCloseUserMenu();
    handleLogout();
  };

  const handleOpenNotifMenu = (event) => {
    setAnchorElNotif(event.currentTarget);
  };

  const handleCloseNotifMenu = () => {
    setAnchorElNotif(null);
  };

  const handleLogout = () => {
    // Call the logout function from AuthContext
    logout();
  };

  const getPageTitle = () => {
    // Handle appointments page title
    if (location.pathname.startsWith('/admin/appointments')) {
      return 'All Appointments';
    }
    
    // For other admin pages, find the matching menu item
    const currentPage = menuItems.find(item => 
      item.path === location.pathname || 
      location.pathname.startsWith(`${item.path}/`)
    );
    
    return currentPage ? currentPage.text : 'Dashboard';
  };

  const getBreadcrumbs = () => {
    // Get the current path and split into segments
    const pathSegments = location.pathname.split('/').filter(Boolean);
    
    // Create breadcrumbs array starting with Home
    const breadcrumbs = [
      <MuiLink component={Link} key="home" to="/" color="inherit" sx={{ display: 'flex', alignItems: 'center' }}>
        <HomeIcon sx={{ mr: 0.5 }} fontSize="inherit" />
        Home
      </MuiLink>
    ];
    
    // Only add Admin and the current page if we're in the admin section
    if (pathSegments[0] === 'admin') {
      // Add Admin link
      breadcrumbs.push(
        <MuiLink component={Link} key="admin" to="/admin" color="inherit">
          Admin
        </MuiLink>
      );
      
      // Add current page if it's not the admin dashboard
      if (pathSegments.length > 1) {
        const currentPage = pathSegments[pathSegments.length - 1];
        // Only add the current page if it's not 'appointments' to avoid duplicate text
        if (currentPage !== 'appointments') {
          breadcrumbs.push(
            <Typography key={currentPage} color="text.primary">
              {currentPage.charAt(0).toUpperCase() + currentPage.slice(1).replace(/-/g, ' ')}
            </Typography>
          );
        }
      }
    }
    
    return breadcrumbs;
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AppBarStyled position="fixed" open={open}>
        <Toolbar disableGutters sx={{ 
          minHeight: '64px !important',
          px: 3,
          display: 'flex',
          justifyContent: 'space-between'
        }}>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            onClick={handleDrawerOpen}
            edge="start"
            sx={{ mr: 2, ...(open && { display: 'none' }) }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1, lineHeight: '1.5' }}>
            {getPageTitle()}
          </Typography>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Tooltip title="Notifications">
              <IconButton 
                onClick={handleOpenNotifMenu} 
                color="inherit"
                sx={{
                  color: 'text.primary',
                  '&:hover': {
                    backgroundColor: 'action.hover'
                  }
                }}
              >
                <Badge badgeContent={4} color="error">
                  <NotificationsIcon />
                </Badge>
              </IconButton>
            </Tooltip>
            
            <Tooltip title="Account settings">
              <IconButton 
                onClick={handleOpenUserMenu} 
                sx={{ 
                  p: 0,
                  '&:hover': {
                    backgroundColor: 'transparent'
                  }
                }}
              >
                <Avatar 
                  alt="Admin User" 
                  src="/static/images/avatar/1.jpg"
                  sx={{
                    width: 36,
                    height: 36,
                    border: '2px solid',
                    borderColor: 'divider',
                    '&:hover': {
                      borderColor: 'primary.main'
                    }
                  }}
                />
              </IconButton>
            </Tooltip>
          </Box>
          
          <Menu
            sx={{ mt: '45px' }}
            id="user-menu"
            anchorEl={anchorElUser}
            anchorOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
            keepMounted
            transformOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
            open={Boolean(anchorElUser)}
            onClose={handleCloseUserMenu}
            PaperProps={{
              elevation: 3,
              sx: {
                minWidth: '200px',
                overflow: 'visible',
                mt: 1.5,
                '& .MuiAvatar-root': {
                  width: 32,
                  height: 32,
                  ml: -0.5,
                  mr: 1,
                },
                '&:before': {
                  content: '""',
                  display: 'block',
                  position: 'absolute',
                  top: 0,
                  right: 14,
                  width: 10,
                  height: 10,
                  bgcolor: 'background.paper',
                  transform: 'translateY(-50%) rotate(45deg)',
                  zIndex: 0,
                },
              },
            }}
          >
            <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
              <Typography variant="subtitle2" noWrap>Admin User</Typography>
              <Typography variant="body2" color="text.secondary" noWrap>
                admin@example.com
              </Typography>
            </Box>
            
            <MenuItem 
              onClick={handleProfileClick} 
              sx={{ 
                py: 1.5,
                '&:hover': {
                  backgroundColor: 'action.hover'
                }
              }}
            >
              <ListItemIcon sx={{ minWidth: '36px' }}>
                <PersonIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Profile</ListItemText>
            </MenuItem>
            <MenuItem 
              onClick={handleSettingsClick}
              sx={{ 
                py: 1.5,
                '&:hover': {
                  backgroundColor: 'action.hover'
                }
              }}
            >
              <ListItemIcon sx={{ minWidth: '36px' }}>
                <SettingsIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Settings</ListItemText>
            </MenuItem>
            <Divider />
            <MenuItem 
              onClick={handleLogoutClick} 
              sx={{ 
                py: 1.5,
                color: 'error.main',
                '&:hover': {
                  backgroundColor: 'rgba(211, 47, 47, 0.08)'
                }
              }}
            >
              <ListItemIcon sx={{ minWidth: '36px', color: 'inherit' }}>
                <LogoutIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Logout</ListItemText>
            </MenuItem>
          </Menu>
          
          <Menu
            sx={{ mt: '45px' }}
            id="notifications-menu"
            anchorEl={anchorElNotif}
            anchorOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
            keepMounted
            transformOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
            open={Boolean(anchorElNotif)}
            onClose={handleCloseNotifMenu}
          >
            <MenuItem onClick={handleCloseNotifMenu}>
              <ListItemText primary="New appointment request" secondary="5 minutes ago" />
            </MenuItem>
            <Divider />
            <MenuItem onClick={handleCloseNotifMenu}>
              <ListItemText primary="New message from John" secondary="1 hour ago" />
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBarStyled>

      <Drawer
        variant="permanent"
        sx={{
          width: open ? drawerWidth : collapsedWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            position: 'absolute',
            height: '100vh',
            width: open ? drawerWidth : collapsedWidth,
            boxSizing: 'border-box',
            transition: theme.transitions.create('width', {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.enteringScreen,
            }),
            overflowX: 'hidden',
            borderRight: 'none',
            boxShadow: theme.shadows[1],
            zIndex: theme.zIndex.drawer,
          },
        }}
      >
        <DrawerHeader open={open}>
          {open && (
            <Typography variant="h6" noWrap component="div">
              Admin
            </Typography>
          )}
          <IconButton onClick={handleDrawerClose}>
            {open ? <ChevronLeftIcon /> : <MenuIcon />}
          </IconButton>
        </DrawerHeader>
        <Divider />
        <List>
          {menuItems.map((item, index) =>
            item.divider ? (
              <Divider key={`divider-${index}`} sx={{ my: 1 }} />
            ) : (
              <StyledListItem key={item.text} disablePadding open={open}>
                <ListItemButton
                  component={Link}
                  to={item.path}
                  selected={location.pathname === item.path}
                  onClick={isMobile ? handleDrawerClose : undefined}
                >
                  <ListItemIcon sx={{ minWidth: 40 }}>
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText primary={item.text} />
                </ListItemButton>
              </StyledListItem>
            )
          )}
        </List>
      </Drawer>

      <Main open={open}>
        <Box sx={{ 
          p: 3, 
          minHeight: 'calc(100vh - 64px)', 
          display: 'flex', 
          flexDirection: 'column'
        }}>
          <Box sx={{ mb: 3 }}>
            <Breadcrumbs aria-label="breadcrumb">
              <MuiLink component={Link} to="/" color="inherit" sx={{ display: 'flex', alignItems: 'center' }}>
                <HomeIcon sx={{ mr: 0.5 }} fontSize="inherit" />
                Home
              </MuiLink>
              {getBreadcrumbs()}
            </Breadcrumbs>
            <Typography variant="h4" component="h1" sx={{ mt: 1 }}>
              {getPageTitle()}
            </Typography>
          </Box>
          <Box sx={{ 
            flex: 1,
            minHeight: 0, // Allows the content to scroll if needed
            overflow: 'auto' // Adds scroll if content is too long
          }}>
            {children}
          </Box>
          {/* Footer */}
          <Box sx={{ 
            mt: 3,
            pt: 2,
            pb: 1,
            textAlign: 'center',
            color: 'text.secondary',
            fontSize: '0.875rem',
            borderTop: '1px solid',
            borderColor: 'divider',
            position: 'sticky',
            bottom: 0,
            backgroundColor: 'background.paper',
            zIndex: 1
          }}>
            <Typography variant="body2">
              © {new Date().getFullYear()} Eagle Vision Edge LLC. All rights reserved.
            </Typography>
          </Box>
        </Box>
      </Main>
    </Box>
  );
};

export default AdminLayout;
