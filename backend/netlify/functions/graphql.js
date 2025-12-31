const { ApolloServer } = require('@apollo/server');
const { expressMiddleware } = require('@apollo/server/express4');
const express = require('express');
const serverless = require('serverless-http');
const cors = require('cors');
const { typeDefs, resolvers } = require('../../src/schema');
const { initializeFirebase } = require('../../src/firebase');

// Initialize Firebase
const { db, admin, verifyToken } = initializeFirebase();

// Create Express app
const app = express();

// Create Apollo Server
const server = new ApolloServer({
  typeDefs,
  resolvers,
  introspection: true, // Enable introspection in production
});

// Start the Apollo Server
const startServer = async () => {
  await server.start();
  
  // Apply middleware
  app.use(
    '/.netlify/functions/graphql',
    cors({
      origin: process.env.FRONTEND_URL || '*',
      credentials: true,
    }),
    express.json(),
    expressMiddleware(server, {
      context: async ({ req }) => {
        const context = { db, admin };
        
        // Only verify token if present
        const token = req.headers.authorization || '';
        if (token) {
          const user = await verifyToken(token);
          if (user) {
            context.user = user;
            context.token = token;
          }
        }
        
        return context;
      },
    })
  );
};

// Initialize the server
startServer();

// Create a simple health check endpoint
app.get('/.netlify/functions/graphql/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Handle all other routes
app.all('*', (req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

// Export the handler for Netlify Functions
exports.handler = serverless(app);
