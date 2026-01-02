// Load environment variables from .env file
require('dotenv').config();

const isProduction = process.env.NODE_ENV === 'production';

// Default configuration
const config = {
  // Firebase config (moved to file)
  firebase: {
    apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
    authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
    storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.REACT_APP_FIREBASE_APP_ID,
    measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID
  },
  // App config
  app: {
    nodeEnv: process.env.NODE_ENV || 'development',
    apiUrl: process.env.API_URL || (isProduction 
      ? 'https://eaglevisionedge.com/.netlify/functions' 
      : 'http://localhost:8888/.netlify/functions'
    ),
    frontendUrl: process.env.FRONTEND_URL || (
      isProduction 
        ? 'https://eaglevisionedge.com' 
        : 'http://localhost:3000'
    ),
    cookieDomain: process.env.COOKIE_DOMAIN || (
      isProduction ? '.eaglevisionedge.com' : 'localhost'
    ),
    secureCookie: process.env.SECURE_COOKIE !== 'false', // true by default
    // These will use the static values from netlify.toml in production
    // or the fallback values in development
    sessionSecret: process.env.SESSION_SECRET || 'dev-session-secret-12345',
    jwtSecret: process.env.JWT_SECRET || 'dev-jwt-secret-67890'
  },
  // Rate limiting
  rateLimit: {
    max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
    maxWebhooks: parseInt(process.env.RATE_LIMIT_MAX_WEBHOOKS || '1000', 10),
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10) // 15 minutes
  },
  // DocuSign
  docusign: process.env.USE_DOCUSIGN === 'true' ? {
    enabled: true,
    clientId: process.env.DOCUSIGN_CLIENT_ID,
    userId: process.env.DOCUSIGN_USER_ID,
    accountId: process.env.DOCUSIGN_ACCOUNT_ID,
    authServer: process.env.DOCUSIGN_AUTH_SERVER,
    privateKeyPath: process.env.DOCUSIGN_PRIVATE_KEY_PATH,
    oauthBaseUrl: process.env.DOCUSIGN_OAUTH_BASE_URL,
    apiBaseUrl: process.env.DOCUSIGN_API_BASE_URL,
    redirectUri: process.env.DOCUSIGN_REDIRECT_URI,
    webhookUrl: process.env.DOCUSIGN_WEBHOOK_URL,
    webhookSecret: process.env.DOCUSIGN_WEBHOOK_SECRET
  } : { enabled: false }
};

module.exports = config;