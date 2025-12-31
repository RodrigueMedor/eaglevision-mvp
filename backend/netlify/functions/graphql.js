const { ApolloServer } = require('@apollo/server');
const { expressMiddleware } = require('@apollo/server/express4');
const express = require('express');
const serverless = require('serverless-http');
const cors = require('cors');
const { typeDefs, resolvers } = require('../../src/schema');
const { initializeFirebase } = require('../../src/firebase');

// Initialize Firebase
const firebase = initializeFirebase();
const { db, admin, verifyToken } = firebase;

// Create Express app and router
const app = express();
const router = express.Router();

// Apply CORS middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Handle preflight requests
app.options('*', cors());

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Test endpoint
router.get('/test', (req, res) => {
  res.status(200).json({ message: 'Test endpoint is working' });
});

// Mount the router at the base path
app.use('/.netlify/functions/graphql', router);

// Create Apollo Server
const server = new ApolloServer({
  typeDefs,
  resolvers,
  introspection: true,
  formatError: (error) => {
    console.error('GraphQL Error:', error);
    return {
      message: error.message,
      locations: error.locations,
      path: error.path,
      extensions: {
        code: error.extensions?.code || 'INTERNAL_SERVER_ERROR',
      },
    };
  },
});

// Initialize the server and create the handler
let handler;

const initializeApp = async () => {
  await server.start();
  
  // Apply middleware to the router
  router.use(express.json());
  router.use(
    '/',
    expressMiddleware(server, {
      context: async ({ req }) => {
        const token = req.headers.authorization?.split(' ')[1];
        let user = null;
        
        if (token) {
          try {
            const decodedToken = await verifyToken(token);
            user = { uid: decodedToken.uid, email: decodedToken.email };
          } catch (error) {
            console.error('Error verifying token:', error);
          }
        }
        
        return { user, db, admin };
      },
    })
  );

  // Create the serverless handler
  handler = serverless(app);
  console.log('Server initialized');
  return true;
};

// Initialize the app immediately
const initialization = initializeApp().catch(err => {
  console.error('Failed to initialize app:', err);
  process.exit(1);
});

// Handle all other routes
app.all('*', (req, res) => {
  res.status(404).json({ error: 'Not Found', path: req.path });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'production' ? 'Something went wrong' : err.message
  });
});

// Export the handler for Netlify Functions
module.exports.handler = async (event, context) => {
  // Wait for initialization to complete
  await initialization;
  return handler(event, context);
};

// For local development
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, async () => {
    await initialization;
    console.log(`Server running at http://localhost:${PORT}/.netlify/functions/graphql`);
    console.log(`Health check: http://localhost:${PORT}/.netlify/functions/graphql/health`);
  });
}