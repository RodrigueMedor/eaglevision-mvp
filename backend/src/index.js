require('dotenv').config();
const { ApolloServer } = require('@apollo/server');
const { expressMiddleware } = require('@apollo/server/express4');
const { ApolloServerPluginDrainHttpServer } = require('@apollo/server/plugin/drainHttpServer');
const express = require('express');
const http = require('http');
const cors = require('cors');
const { typeDefs, resolvers } = require('./schema/index');
const { initializeFirebase } = require('./firebase');

// Initialize Firebase (optional)
const { db, admin, verifyToken } = initializeFirebase();

if (!db || !admin) {
  console.warn('WARNING: Running without Firebase. Some features may be limited.');
}

const PORT = process.env.PORT || 4000;

async function startApolloServer() {
  const app = express();
  const httpServer = http.createServer(app);

  // Set up CORS
  const corsOptions = {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  };

  // Format error responses
  const formatError = (error) => {
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
  };

  // Create Apollo Server
  const server = new ApolloServer({
    typeDefs,
    resolvers,
    formatError,
    plugins: [ApolloServerPluginDrainHttpServer({ httpServer })],
  });

  await server.start();

  // Apply middleware
  app.use(cors(corsOptions));
  app.use(express.json());
  
  // Add request IP to the request object
  app.use((req, res, next) => {
    // Get IP from X-Forwarded-For header if behind a proxy
    const forwarded = req.headers['x-forwarded-for'];
    req.ip = forwarded 
      ? (typeof forwarded === 'string' ? forwarded.split(/, /)[0] : forwarded[0])
      : req.connection.remoteAddress;
    next();
  });
  
  // GraphQL endpoint
  app.use(
    '/graphql',
    expressMiddleware(server, {
      context: async ({ req, res }) => {
        const context = { 
          db, 
          admin,
          isMockDb: !db, // If db is not properly initialized, we're using mock
          req,          // Include the request object
          res,          // Include the response object
          ip: req.ip    // Include the IP address
        };
        
        // Get token from Authorization header
        const authHeader = req.headers.authorization || '';
        const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : '';
        
        if (token) {
          try {
            // Verify the JWT token
            const { verifyToken } = require('./utils/auth');
            const decoded = verifyToken(token);
            
            if (decoded && decoded.userId) {
              // Get user from database
              let userData;
              if (context.isMockDb) {
                // Mock user data
                userData = db.collections?.users?.[decoded.userId];
              } else {
                const userDoc = await db.collection('users').doc(decoded.userId).get();
                userData = userDoc.data();
              }
              
              if (userData) {
                context.user = {
                  id: decoded.userId,
                  ...userData
                };
                context.token = token;
              }
            }
          } catch (error) {
            // Token verification failed, but we'll continue without authentication
            console.warn('Token verification failed:', error.message);
          }
        }
        
        return context;
      },
    })
  );

  // Email routes
  app.use('/api', emailRoutes);

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
  });
  
  // Error handling middleware
  app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({ 
      error: 'Internal Server Error',
      message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  });

  // Start the server
  await new Promise((resolve) => httpServer.listen({ port: PORT }, resolve));
  console.log(`🚀 Server ready at http://localhost:${PORT}/graphql`);
  
  return { server, app };
}

startApolloServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
