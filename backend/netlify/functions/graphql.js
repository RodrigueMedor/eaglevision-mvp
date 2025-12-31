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

// Create Express app
const app = express();

// Enable CORS
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

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


// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Test endpoint
app.get('/test', (req, res) => {
  res.status(200).json({ message: 'Test endpoint is working' });
});

// Apply GraphQL middleware
const applyMiddleware = async () => {
  await server.start();
  
  // Apply middleware at the root path
  app.use(
    '/',
    express.json(),
    expressMiddleware(server, {
      context: async ({ req }) => {
        const context = { db, admin };
        
        // Verify token if present
        const authHeader = req.headers.authorization || '';
        if (authHeader) {
          try {
            const token = authHeader.replace('Bearer ', '');
            if (token) {
              const user = await verifyToken(token);
              if (user) {
                context.user = user;
                context.token = token;
              }
            }
          } catch (error) {
            console.error('Error verifying token:', error);
          }
        }
        
        return context;
      },
    })
  );
  
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

// Start the server
startServer();

// Export the handler for Netlify Functions
exports.handler = serverless(app, {
  binary: ['image/*', 'application/pdf', 'application/octet-stream']
});