require('dotenv').config();
const { ApolloServer } = require('@apollo/server');
const { expressMiddleware } = require('@apollo/server/express4');
const { ApolloServerPluginDrainHttpServer } = require('@apollo/server/plugin/drainHttpServer');
const express = require('express');
const http = require('http');
const cors = require('cors');
const { typeDefs, resolvers } = require('./schema');
const { initializeFirebase } = require('./firebase');

// Initialize Firebase
const { db, admin, verifyToken } = initializeFirebase();

const PORT = process.env.PORT || 4000;

async function startApolloServer() {
  const app = express();
  const httpServer = http.createServer(app);

  // Set up CORS
  const corsOptions = {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  };

  // Create Apollo Server
  const server = new ApolloServer({
    typeDefs,
    resolvers,
    plugins: [ApolloServerPluginDrainHttpServer({ httpServer })],
  });

  await server.start();

  // Apply middleware
  app.use(
    '/graphql',
    cors(corsOptions),
    express.json(),
    expressMiddleware(server, {
      context: async ({ req }) => {
        // For public access to the appointments query
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

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
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
