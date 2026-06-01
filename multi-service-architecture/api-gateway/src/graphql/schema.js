/**
 * GraphQL Schema and Resolvers for the API Gateway.
 * GraphQL is the best choice for complex UI dashboards where clients
 * need to choose exactly what data to fetch, reducing over-fetching.
 *
 * This schema exposes account, transaction, and fraud detection queries/mutations
 * backed by gRPC calls to the respective microservices.
 */

const typeDefs = `#graphql
  """
  Financial account belonging to a user.
  Supports multiple account types (checking, savings, credit).
  """
  type Account {
    account_id: String!
    user_id: String!
    account_type: String!
    balance: Float!
    currency: String!
    status: String!
    created_at: String
  }

  """
  Record of a processed financial transaction.
  """
  type Transaction {
    transaction_id: String!
    from_account_id: String!
    to_account_id: String!
    amount: Float!
    currency: String!
    description: String
    status: String!
    created_at: String
  }

  """
  Fraud analysis result from the ML service.
  Contains risk score, level, and recommended action.
  """
  type FraudCheckResult {
    transaction_id: String!
    is_fraudulent: Boolean!
    risk_score: Float!
    risk_level: String!
    risk_factors: [String!]!
    recommendation: String!
    model_version: String
  }

  """
  ML model metadata from the fraud detection service.
  """
  type ModelInfo {
    model_name: String!
    model_version: String!
    last_trained: String!
    accuracy: Float!
    precision: Float!
    recall: Float!
    total_predictions: Int!
  }

  """
  Transaction processing result including fraud check details.
  """
  type TransactionResult {
    transaction_id: String!
    status: String!
    message: String
    new_balance: Float
    fraud_check: FraudCheckResult
  }

  """
  Paginated transaction history response.
  """
  type TransactionHistory {
    transactions: [Transaction!]!
    total_count: Int!
    page: Int!
    page_size: Int!
  }

  """
  Service health status information.
  """
  type ServiceHealth {
    name: String!
    status: String!
    latency_ms: Int
  }

  """
  Input for creating a new transaction.
  """
  input TransactionInput {
    from_account_id: String!
    to_account_id: String!
    amount: Float!
    currency: String
    description: String
  }

  """
  Root Query type - read operations.
  Clients can request exactly the fields they need (GraphQL advantage).
  """
  type Query {
    "Get a specific account by ID"
    account(account_id: String!): Account

    "List all accounts for a user"
    accounts(user_id: String!): [Account!]!

    "Get paginated transaction history for an account"
    transactionHistory(
      account_id: String!
      page: Int
      page_size: Int
    ): TransactionHistory

    "Get ML model information from the fraud detection service"
    modelInfo: ModelInfo

    "Check health of all downstream services"
    serviceHealth: [ServiceHealth!]!
  }

  """
  Root Mutation type - write operations.
  """
  type Mutation {
    "Process a new financial transaction with automatic fraud checking"
    processTransaction(input: TransactionInput!): TransactionResult

    "Run fraud analysis on a transaction without processing it"
    checkFraud(
      amount: Float!
      merchant_category: String
      location: String
    ): FraudCheckResult
  }
`;

/**
 * GraphQL resolvers - map schema operations to gRPC service calls.
 * Each resolver function receives the gRPC clients via context.
 */
const resolvers = {
  Query: {
    // Fetch a single account from the Java business service
    account: async (_, { account_id }, { grpcClients }) => {
      try {
        return await grpcClients.getAccount(account_id);
      } catch (error) {
        throw new Error(`Failed to fetch account: ${error.message}`);
      }
    },

    // List accounts for a user from the Java business service
    accounts: async (_, { user_id }, { grpcClients }) => {
      try {
        const result = await grpcClients.listAccounts(user_id);
        return result.accounts || [];
      } catch (error) {
        throw new Error(`Failed to list accounts: ${error.message}`);
      }
    },

    // Fetch transaction history from the Java business service
    transactionHistory: async (_, { account_id, page = 0, page_size = 20 }, { grpcClients }) => {
      try {
        return await new Promise((resolve, reject) => {
          grpcClients.businessClient.GetTransactionHistory({
            account_id,
            page,
            page_size,
          }, (err, response) => {
            if (err) reject(err);
            else resolve(response);
          });
        });
      } catch (error) {
        throw new Error(`Failed to fetch history: ${error.message}`);
      }
    },

    // Get ML model metadata from the Python fraud service
    modelInfo: async (_, __, { grpcClients }) => {
      try {
        return await new Promise((resolve, reject) => {
          grpcClients.fraudClient.GetModelInfo({}, (err, response) => {
            if (err) reject(err);
            else resolve(response);
          });
        });
      } catch (error) {
        throw new Error(`Failed to get model info: ${error.message}`);
      }
    },

    // Health check all services
    serviceHealth: async (_, __, { grpcClients }) => {
      const services = [
        { name: 'api-gateway', status: 'healthy', latency_ms: 0 },
      ];
      // Additional service checks would be added here
      return services;
    },
  },

  Mutation: {
    // Process a transaction with fraud check via gRPC
    processTransaction: async (_, { input }, { grpcClients, userId }) => {
      try {
        // First, perform fraud check
        const fraudResult = await grpcClients.checkFraud({
          transaction_id: `txn-${Date.now()}`,
          user_id: userId,
          amount: input.amount,
          currency: input.currency || 'USD',
          merchant_id: input.to_account_id,
          merchant_category: 'transfer',
          location: 'unknown',
          timestamp: new Date().toISOString(),
          card_type: 'debit',
          ip_address: '127.0.0.1',
        });

        if (fraudResult.is_fraudulent) {
          return {
            transaction_id: '',
            status: 'BLOCKED',
            message: 'Transaction blocked by fraud detection',
            fraud_check: fraudResult,
          };
        }

        // Process via business service
        const result = await grpcClients.processTransaction({
          from_account_id: input.from_account_id,
          to_account_id: input.to_account_id,
          amount: input.amount,
          currency: input.currency || 'USD',
          description: input.description || '',
          initiated_by: userId,
        });

        return {
          ...result,
          fraud_check: fraudResult,
        };
      } catch (error) {
        throw new Error(`Transaction failed: ${error.message}`);
      }
    },

    // Check fraud without processing
    checkFraud: async (_, { amount, merchant_category, location }, { grpcClients, userId }) => {
      try {
        return await grpcClients.checkFraud({
          transaction_id: `check-${Date.now()}`,
          user_id: userId,
          amount,
          currency: 'USD',
          merchant_id: 'check',
          merchant_category: merchant_category || 'unknown',
          location: location || 'unknown',
          timestamp: new Date().toISOString(),
          card_type: 'debit',
          ip_address: '127.0.0.1',
        });
      } catch (error) {
        throw new Error(`Fraud check failed: ${error.message}`);
      }
    },
  },
};

module.exports = { typeDefs, resolvers };
