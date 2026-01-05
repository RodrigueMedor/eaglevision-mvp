// Load environment variables with dotenv
require('dotenv').config({ path: '.env.local' });

// Application environment
const isProduction = process.env.NODE_ENV === 'production';

// Validate required environment variables in production
const requiredEnvVars = [
  'SESSION_SECRET',
  'JWT_SECRET'
];

if (isProduction) {
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }
}

// Default configuration
module.exports = {
  app: {
    environment: isProduction ? 'production' : 'development',
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
    apiUrl: process.env.API_URL || 'http://localhost:4000',
    cookieDomain: process.env.COOKIE_DOMAIN || 'localhost',
    secureCookie: process.env.NODE_ENV === 'production',
    sessionSecret: process.env.SESSION_SECRET || (process.env.NODE_ENV === 'production' ? null : 'dev-session-secret'),
    jwtSecret: process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' ? null : 'dev-jwt-secret')
  },
  email: {
    from: process.env.EMAIL_FROM || (process.env.NODE_ENV === 'production' ? null : 'noreply@eaglevisionedge.com'),
    service: 'sendgrid', // Using SendGrid as the default email service
    sendgridApiKey: process.env.SENDGRID_API_KEY
  }
};

// Ensure required config values are set in production
if (process.env.NODE_ENV === 'production') {
  const config = module.exports;
  if (!config.app.sessionSecret || !config.app.jwtSecret || !config.email.from) {
    throw new Error('Critical configuration values are missing. Please check your environment variables.');
  }
}