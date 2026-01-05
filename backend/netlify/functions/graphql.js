const { ApolloServer } = require('@apollo/server');
const { ApolloServerPluginLandingPageLocalDefault, ApolloServerPluginLandingPageProductionDefault } = require('@apollo/server/plugin/landingPage/default');

console.log('Initializing GraphQL server...');
const { expressMiddleware } = require('@apollo/server/express4');
const express = require('express');
const serverless = require('serverless-http');
const cors = require('cors');
const { typeDefs, resolvers } = require('../../src/schema');
const firebaseService = require('../../src/firebase');

// Add request tracking for debugging
let requestCount = 0;

// Initialize Firebase
let firebase;
try {
  console.log('Initializing Firebase...');
  firebaseService.initialize();
  firebase = firebaseService;
  console.log('Firebase initialized successfully');
} catch (error) {
  console.error('Failed to initialize Firebase:', error);
  throw error; // Fail fast if Firebase initialization fails
}
// Access via getters after initialization

// Create Express app and router
const app = express();
const router = express.Router();

// Configure CORS options
const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = [
      'https://eaglevisionedge.com',
      'https://www.eaglevisionedge.com',
      'http://localhost:3000',
      'http://localhost:3001',
      /^\.netlify\.app$/, // Allow all Netlify preview deployments
      /^https?:\/\/[^.]+\.netlify\.app$/, // Allow all Netlify preview deployments
      'https://celebrated-daffodil-26463d.netlify.app' // Specific Netlify deployment
    ];
    
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Check if the origin matches any of the allowed patterns
    const isAllowed = allowedOrigins.some(allowedOrigin => {
      if (typeof allowedOrigin === 'string') {
        return origin === allowedOrigin;
      } else if (allowedOrigin instanceof RegExp) {
        return allowedOrigin.test(origin);
      }
      return false;
    });
    
    if (process.env.APP_ENV === 'development' || isAllowed) {
      callback(null, true);
    } else {
      console.warn('CORS blocked request from origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Apollo-Require-Preflight'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  optionsSuccessStatus: 200, // Some legacy browsers choke on 204
  maxAge: 86400 // 24 hours
};

// Apply CORS middleware to all routes
app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // Enable preflight for all routes

// Handle preflight requests
app.use((req, res, next) => {
  if (req.method === 'OPTIONS') {
    res.header('Access-Control-Allow-Origin', req.headers.origin);
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.header('Access-Control-Allow-Credentials', 'true');
    return res.status(200).end();
  }
  next();
});

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

// Create Apollo Server with CORS support
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
        ...error.extensions
      }
    };
  },
  plugins: [
    {
      async requestDidStart() {
        return {
          async willSendResponse({ response }) {
            // Ensure CORS headers are set on all responses
            if (response && response.http) {
              response.http.headers.set('Access-Control-Allow-Origin', response.http.headers.get('origin') || '*');
              response.http.headers.set('Access-Control-Allow-Credentials', 'true');
            }
          },
        };
      },
    },
  ],
});

const initializeApp = async () => {
  try {
    console.log('Starting Apollo Server...');
    await server.start();
    console.log('Apollo Server started successfully');
    
    // Apply middleware to the router
    router.use(express.json());
    
    // Request logging middleware
    router.use((req, res, next) => {
      const requestId = ++requestCount;
      const start = Date.now();
      console.log(`[${new Date().toISOString()}] [Request ${requestId}] ${req.method} ${req.path}`);
      
      res.on('finish', () => {
        console.log(`[${new Date().toISOString()}] [Request ${requestId}] Completed in ${Date.now() - start}ms with status ${res.statusCode}`);
      });
      
      next();
    });
    
    // Apply GraphQL middleware with CORS
    router.use(
      '/',
      cors(corsOptions),
      (req, res, next) => {
        console.log('Handling GraphQL request');
        next();
      },
      expressMiddleware(server, {
        context: async ({ req }) => {
          const token = req.headers.authorization?.split(' ')[1];
          let user = null;
          
          if (token) {
            try {
              console.log('Verifying token...');
              const decodedToken = await firebase.verifyToken(token);
              user = { uid: decodedToken.uid, email: decodedToken.email };
              console.log('User authenticated:', user.email);
            } catch (error) {
              console.error('Error verifying token:', error);
              // Don't throw here, just proceed with user as null
            }
          } else {
            console.log('No authentication token provided');
          }
          
          return { user, db: firebase.db, admin: firebase.admin };
        },
      })
    );
  } catch (error) {
    console.error('Error in initializeApp:', error);
    throw error; // Re-throw to be caught by the outer catch
  }
  
  // Mount the router to the app
  app.use(router);

  // Create the serverless handler
  handler = serverless(app);
  console.log('Server initialized with CORS support');
  return true;
};

// Initialize the app immediately
console.log('Starting application initialization...');
const initialization = initializeApp().catch(err => {
  console.error('FATAL: Failed to initialize app:', err);
  process.exit(1);
});

// Log when initialization is complete
initialization.then(() => {
  console.log('Application initialization completed successfully');
});

// Handle all other routes
app.all('*', (req, res) => {
  res.status(404).json({ error: 'Not Found', path: req.path });
});

// Error handling middleware
app.use((err, req, res, next) => {
  const errorId = Math.random().toString(36).substr(2, 9);
  console.error(`[${new Date().toISOString()}] [Error ${errorId}] Unhandled error:`, err);
  
  // Log the full error for debugging
  if (err.stack) {
    console.error(`[${new Date().toISOString()}] [Error ${errorId}] Stack:`, err.stack);
  }
  
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.APP_ENV === 'production' 
      ? `An unexpected error occurred. Error ID: ${errorId}` 
      : err.message,
    errorId: errorId
  });
});

// Export the handler for Netlify Functions
let handler;

const handlerFunction = async (event, context) => {
  try {
    console.log('Received event:', JSON.stringify(event, null, 2));
    
    // Handle preflight requests
    if (event.httpMethod === 'OPTIONS') {
      return {
        statusCode: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        },
        body: '',
      };
    }

    // Wait for the server to be ready
    await initialization;
    
    // Handle the request
    const response = await server.createHandler({
      expressApp: app,
      path: '/.netlify/functions/graphql',
      cors: false, // We're handling CORS in the Express app
    })(event, context);

    console.log('Response status:', response.statusCode);
    return response;
  } catch (error) {
    console.error('Error in GraphQL handler:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Internal Server Error',
        message: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      }),
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    };
  }
};

// Export the handler for Netlify Functions
module.exports.handler = (event, context) => handlerFunction(event, context);

// For local development
if (process.env.APP_ENV !== 'production') {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, async () => {
    await initialization;
    console.log(`Server running at http://localhost:${PORT}/.netlify/functions/graphql`);
    console.log(`Health check: http://localhost:${PORT}/.netlify/functions/graphql/health`);
  });
}