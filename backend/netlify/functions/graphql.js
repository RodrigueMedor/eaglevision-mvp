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

// Apply middleware to the router
router.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Test endpoint
router.get('/test', (req, res) => {
  res.status(200).json({ message: 'Test endpoint is working' });
});

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


// Apply middleware to the router
const applyMiddleware = async () => {
  await server.start();
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

  // Apply the router to the app at the Netlify Functions path
  app.use('/.netlify/functions/graphql', router);
  
  console.log('GraphQL middleware applied');
  return true;
};

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

// Initialize and start the server
const startServer = async () => {
  try {
    await applyMiddleware();
    console.log('Server started successfully');
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Export the handler for Netlify Functions
const handler = serverless(app);

module.exports.handler = async (event, context) => {
  await applyMiddleware();
  return handler(event, context);
};

// For local development
if (process.env.NODE_ENV !== 'production') {
  app.listen(process.env.PORT || 3000, () => {
    console.log(`Server running at http://localhost:${process.env.PORT || 3000}`);
  });
}