require('dotenv').config();
const { ApolloServer } = require('@apollo/server');
const { expressMiddleware } = require('@apollo/server/express4');
const { ApolloServerPluginDrainHttpServer } = require('@apollo/server/plugin/drainHttpServer');
const express = require('express');
const http = require('http');
const cors = require('cors');
const { json } = require('body-parser');
const { typeDefs, resolvers } = require('./schema/index');
const firebase = require('./firebase');
const emailRoutes = require('./routes/email');

async function initializeFirebase() {
  console.log('Starting Firebase initialization...');
  try {
    // Initialize Firebase
    console.log('Calling firebase.initialize()...');
    const firebaseInit = firebase.initialize();
    console.log('Firebase initialize() returned:', firebaseInit);
    
    // Log available methods
    console.log('Available firebase methods:', Object.keys(firebase).join(', '));
    
    // Access services
    console.log('Attempting to access firebase.db...');
    const db = firebase.db;
    if (!db) throw new Error('Firebase DB not available');
    console.log('Firebase db: ✅ Available');
    
    console.log('Attempting to access firebase.auth...');
    const auth = firebase.auth;
    if (!auth) throw new Error('Firebase Auth not available');
    console.log('Firebase auth: ✅ Available');
    
    console.log('✅ Firebase initialized successfully');
    return { db, auth };
  } catch (error) {
    console.error('❌ Failed to initialize Firebase:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    process.exit(1);
  }
}

// Main function to start the server
async function main() {
  // Initialize Firebase before starting the server
  const firebaseApp = await initializeFirebase();
  
  const PORT = process.env.PORT || 4000;
  
  // Start the Apollo server
  await startApolloServer();
  
  console.log(`🚀 Server ready at http://localhost:${PORT}`);
}

// Start the application
main().catch(error => {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
});

async function startApolloServer() {
  const app = express();
  const httpServer = http.createServer(app);
  const PORT = process.env.PORT || 4000;

  // Set up CORS
  const corsOptions = {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  };

  // Create Apollo Server
  const server = new ApolloServer({
    typeDefs,
    resolvers,
    formatError: (error) => {
      console.error('GraphQL Error:', {
        message: error.message,
        path: error.path,
        extensions: error.extensions,
        originalError: error.originalError ? {
          message: error.originalError.message,
          stack: error.originalError.stack,
          ...error.originalError
        } : null
      });

      // Return a user-friendly error message
      if (error.extensions?.code === 'INTERNAL_SERVER_ERROR') {
        return new Error('Internal server error');
      }

      return error;
    },
    plugins: [
      ApolloServerPluginDrainHttpServer({ httpServer }),
      {
        async requestDidStart() {
          return {
            async didEncounterErrors({ errors }) {
              // Log any GraphQL errors
              errors.forEach(error => {
                console.error('GraphQL Error:', {
                  message: error.message,
                  path: error.path,
                  stack: error.stack,
                  extensions: error.extensions
                });
              });
            }
          };
        }
      }
    ]
  });

  // Start the Apollo Server
  await server.start();

  // Apply middleware
  app.use(
      '/graphql',
      cors(corsOptions),
      json(),
      expressMiddleware(server, {
        context: async ({ req }) => {
          const token = req.headers.authorization?.split(' ')[1];
          let user = null;
          if (token) {
            try {
              const info = await firebase.verifyToken(token);
              user = { id: info.uid, email: info.email };
            } catch (e) {
              console.error('Token verification error:', e);
            }
          }
          return {
            user,
            firebase: {
              db: firebase.db,
              auth: firebase.auth,
              admin: firebase.admin,
            },
          };
        }
      })
  );

  // Add email routes
  app.use('/api/email', emailRoutes);

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Start the server
  await new Promise((resolve) => httpServer.listen({ port: PORT }, resolve));
  console.log(`🚀 Server ready at http://localhost:${PORT}/graphql`);

  // Handle shutdown
  const shutdown = async () => {
    console.log('Shutting down server...');
    await server.stop();
    httpServer.close();
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}
