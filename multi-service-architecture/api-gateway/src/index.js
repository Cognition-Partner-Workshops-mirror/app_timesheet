/**
 * API Gateway - Main entry point.
 * This Node.js service acts as the single entry point for all client requests.
 * It exposes both REST and GraphQL APIs, routing requests to the appropriate
 * backend microservices via gRPC for internal communication.
 *
 * Architecture:
 *   Frontend (REST/GraphQL) -> API Gateway -> Java/Python/Go services (gRPC)
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { ApolloServer } = require('@apollo/server');
const { expressMiddleware } = require('@apollo/server/express4');

const { typeDefs, resolvers } = require('./graphql/schema');
const transactionRoutes = require('./routes/transactions');
const accountRoutes = require('./routes/accounts');
const healthRoutes = require('./routes/health');
const { GrpcClients } = require('./grpc/clients');

const app = express();
const PORT = process.env.API_GATEWAY_PORT || 4000;

// Initialize gRPC client connections to backend services
const grpcClients = new GrpcClients();

// Middleware stack
app.use(helmet()); // Security headers
app.use(cors());   // CORS for frontend access
app.use(morgan('combined')); // Request logging
app.use(express.json()); // JSON body parsing

// REST API Routes - Standard HTTP-based endpoints for web apps and microservices
app.use('/api/v1/transactions', transactionRoutes(grpcClients));
app.use('/api/v1/accounts', accountRoutes(grpcClients));
app.use('/api/v1/health', healthRoutes(grpcClients));

/**
 * Initialize and start the Apollo GraphQL server.
 * GraphQL is used for complex UI dashboards that need flexible data fetching.
 */
async function startServer() {
  // Create Apollo Server instance with schema and resolvers
  const apolloServer = new ApolloServer({
    typeDefs,
    resolvers,
  });

  await apolloServer.start();

  // Mount GraphQL endpoint at /graphql
  app.use('/graphql', expressMiddleware(apolloServer, {
    context: async ({ req }) => ({
      // Pass gRPC clients to resolvers for backend communication
      grpcClients,
      // Extract user context from headers for authentication
      userId: req.headers['x-user-id'] || 'anonymous',
    }),
  }));

  // Start Express server
  app.listen(PORT, () => {
    console.log(`[API Gateway] REST API available at http://localhost:${PORT}/api/v1`);
    console.log(`[API Gateway] GraphQL endpoint at http://localhost:${PORT}/graphql`);
    console.log(`[API Gateway] Health check at http://localhost:${PORT}/api/v1/health`);
  });
}

startServer().catch((err) => {
  console.error('[API Gateway] Failed to start:', err);
  process.exit(1);
});
