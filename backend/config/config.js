require('dotenv').config();

const isProduction = process.env.NODE_ENV === 'production';

module.exports = {
  app: {
    nodeEnv: process.env.NODE_ENV || 'development',
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
    apiUrl: process.env.API_URL || 'http://localhost:4000',
    cookieDomain: process.env.COOKIE_DOMAIN || 'localhost',
    secureCookie: process.env.NODE_ENV === 'production',
    sessionSecret: process.env.SESSION_SECRET || 'dev-session-secret',
    jwtSecret: process.env.JWT_SECRET || 'dev-jwt-secret'
  },
  email: {
    from: process.env.EMAIL_FROM || 'info@eaglevisionedge.com',
    service: process.env.EMAIL_SERVICE || 'gmail',
    user: process.env.EMAIL_USER,
    password: process.env.EMAIL_PASSWORD
  }
};