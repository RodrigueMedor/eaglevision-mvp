import { GlobalStyles as MuiGlobalStyles } from '@mui/material';

const GlobalStyles = () => {
  return (
    <MuiGlobalStyles
      styles={(theme) => ({
        '*': {
          margin: 0,
          padding: 0,
          boxSizing: 'border-box',
        },
        'html, body, #root': {
          height: '100%',
          width: '100%',
        },
        body: {
          WebkitFontSmoothing: 'antialiased',
          MozOsxFontSmoothing: 'grayscale',
          backgroundColor: theme.palette.background.default,
          color: theme.palette.text.primary,
          lineHeight: 1.5,
        },
        'h1, h2, h3, h4, h5, h6': {
          margin: 0,
          padding: 0,
          fontWeight: 500,
          lineHeight: 1.2,
        },
        a: {
          textDecoration: 'none',
          color: 'inherit',
        },
        'ul, ol': {
          listStyle: 'none',
          margin: 0,
          padding: 0,
        },
        img: {
          maxWidth: '100%',
          height: 'auto',
          display: 'block',
        },
        // Add any additional global styles here
        '.MuiContainer-root': {
          paddingLeft: theme.spacing(2),
          paddingRight: theme.spacing(2),
          [theme.breakpoints.up('sm')]: {
            paddingLeft: theme.spacing(3),
            paddingRight: theme.spacing(3),
          },
        },
      })}
    />
  );
};

export default GlobalStyles;
