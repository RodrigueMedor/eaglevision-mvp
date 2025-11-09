import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1A365D', // Dark blue
      light: '#2A4365',
      dark: '#0F1F3D',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#D69E2E', // Gold
      light: '#E3A82B',
      dark: '#B7791F',
      contrastText: '#1A202C',
    },
    background: {
      default: '#F7FAFC',
      paper: '#ffffff',
    },
    text: {
      primary: '#1A202C',
      secondary: '#4A5568',
    },
    success: {
      main: '#38A169',
    },
  },
  typography: {
    fontFamily: [
      'Inter',
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      'sans-serif',
    ].join(','),
    h1: {
      fontWeight: 800,
      fontSize: '3rem',
      lineHeight: 1.1,
      color: '#1A365D',
      marginBottom: '1.5rem',
    },
    h2: {
      fontWeight: 700,
      fontSize: '2.25rem',
      lineHeight: 1.2,
      color: '#1A365D',
      marginBottom: '1.25rem',
    },
    h3: {
      fontWeight: 600,
      fontSize: '1.5rem',
      lineHeight: 1.3,
      color: '#1A365D',
      marginBottom: '1rem',
    },
    button: {
      textTransform: 'none',
      fontWeight: 500,
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 4,
          padding: '8px 24px',
          fontWeight: 500,
          textTransform: 'none',
        },
        contained: {
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          },
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        },
      },
    },
  },
});

export default theme;
