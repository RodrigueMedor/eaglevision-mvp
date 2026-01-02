const express = require('express');
const { ApolloServer } = require('@apollo/server');
const { expressMiddleware } = require('@apollo/server/express4');
const { ApolloServerPluginDrainHttpServer } = require('@apollo/server/plugin/drainHttpServer');
const serverless = require('serverless-http');
const cors = require('cors');
const { typeDefs, resolvers } = require('../../backend/src/schema');
const { initializeFirebase } = require('../../backend/src/firebase');

// Initialize Firebase
initializeFirebase();

// Create express app
const app = express();

// Create HTTP server for Apollo Server
express.request.rawBody = ''; // Add rawBody to request object
const httpServer = require('http').createServer(app);

// Create Apollo Server
const server = new ApolloServer({
  typeDefs,
  resolvers,
  introspection: true,
  plugins: [ApolloServerPluginDrainHttpServer({ httpServer })],
  formatError: (error) => {
    console.error('GraphQL Error:', error);
    return error;
  },
});

// Apply middleware
const startServer = async () => {
  await server.start();
  
  // Apply Apollo Server middleware to Express app
  app.use(
    '/',
    cors({
      origin: '*',
      credentials: true,
      methods: ['POST', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    }),
    express.json(),
    expressMiddleware(server, {
      context: async ({ req }) => {
        // You can add authentication context here if needed
        return { 
          req,
          user: req.user || null, // User will be null if not authenticated
          db: require('firebase-admin').firestore(),
        };
      },
    })
  );

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  // Log all requests
  app.use((req, res, next) => {
    console.log('Incoming request:', {
      method: req.method,
      path: req.path,
      headers: req.headers,
      body: req.body,
    });
    next();
  });

  // Error handling middleware
  app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({
      error: 'Internal Server Error',
      message: err.message,
    });
  });
};

// Initialize the server and create the handler
let handler;
startServer()
  .then(() => {
    handler = serverless(app);
  })
  .catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });

// Netlify function handler
exports.handler = async (event, context) => {
  // If the handler isn't ready yet, wait a bit
  if (!handler) {
    await new Promise((resolve) => setTimeout(resolve, 100));
    if (!handler) {
      return {
        statusCode: 503,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          error: 'Service Unavailable',
          message: 'Server is still starting up',
        }),
      };
    }
  }

  try {
    // Handle preflight requests
    if (event.httpMethod === 'OPTIONS') {
      return {
        statusCode: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
        },
        body: '',
      };
    }

    // Get the result from the handler
    const result = await handler(event, context);

    // Ensure CORS headers are set
    if (result.headers) {
      result.headers['Access-Control-Allow-Origin'] = '*';
      result.headers['Access-Control-Allow-Credentials'] = 'true';
    } else {
      result.headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': 'true',
      };
    }

    return result;
  } catch (error) {
    console.error('Error in handler:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        error: 'Internal Server Error',
        message: error.message,
      }),
    };
  }
};
