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
    
    if (process.env.NODE_ENV === 'development' || isAllowed) {
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
  await server.start();
  
  // Apply middleware to the router
  router.use(express.json());
  
  // Apply GraphQL middleware with CORS
  router.use(
    '/',
    cors(corsOptions),
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
  
  // Mount the router to the app
  app.use(router);

  // Create the serverless handler
  handler = serverless(app);
  console.log('Server initialized with CORS support');
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