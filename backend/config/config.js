// Load environment variables from .env file
require('dotenv').config();

const isProduction = process.env.NODE_ENV === 'production';

module.exports = {
  // Firebase config (moved to file)
  firebase: {
    apiKey: process.env.REACT_APP_FIREBASE_API_KEY || 'your-firebase-api-key',
    authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || 'your-project.firebaseapp.com',
    projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || 'your-project-id',
    storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || 'your-project.appspot.com',
    messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || 'your-messaging-sender-id',
    appId: process.env.REACT_APP_FIREBASE_APP_ID || 'your-app-id',
    measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID || 'G-XXXXXXXXXX'
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
  docusign: {
    enabled: process.env.USE_DOCUSIGN === 'true',
    clientId: process.env.DOCUSIGN_CLIENT_ID || 'your-docusign-client-id',
    userId: process.env.DOCUSIGN_USER_ID || 'your-docusign-user-id',
    accountId: process.env.DOCUSIGN_ACCOUNT_ID || 'your-docusign-account-id',
    authServer: process.env.DOCUSIGN_AUTH_SERVER || 'account-d.docusign.com',
    privateKeyPath: process.env.DOCUSIGN_PRIVATE_KEY_PATH || 'path/to/private/key.pem',
    oauthBaseUrl: process.env.DOCUSIGN_OAUTH_BASE_URL || 'https://account-d.docusign.com/oauth',
    apiBaseUrl: process.env.DOCUSIGN_API_BASE_URL || 'https://demo.docusign.net/restapi',
    redirectUri: process.env.DOCUSIGN_REDIRECT_URI || 'https://eaglevisionedge.com/docusign/callback',
    webhookUrl: process.env.DOCUSIGN_WEBHOOK_URL || 'https://eaglevisionedge.com/api/docusign/webhook',
    webhookSecret: process.env.DOCUSIGN_WEBHOOK_SECRET || 'your-docusign-webhook-secret'
  }
};