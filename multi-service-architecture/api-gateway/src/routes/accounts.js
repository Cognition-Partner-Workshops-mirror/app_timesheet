/**
 * REST API routes for account management operations.
 * Provides standard HTTP endpoints for account queries.
 * Communicates with the Java business service via gRPC.
 */

const express = require('express');

/**
 * Creates account router with gRPC client dependency injection.
 * @param {GrpcClients} grpcClients - Initialized gRPC client connections
 */
module.exports = function accountRoutes(grpcClients) {
  const router = express.Router();

  /**
   * GET /api/v1/accounts/:accountId
   * Retrieve details for a specific account.
   */
  router.get('/:accountId', async (req, res) => {
    try {
      const { accountId } = req.params;

      grpcClients.sendLog('api-gateway', 'INFO',
        `Account details request: ${accountId}`,
        { endpoint: 'GET /accounts/:id' }
      );

      const account = await grpcClients.getAccount(accountId);

      res.json({
        account_id: account.account_id,
        user_id: account.user_id,
        account_type: account.account_type,
        balance: account.balance,
        currency: account.currency,
        status: account.status,
        created_at: account.created_at,
      });
    } catch (error) {
      grpcClients.sendLog('api-gateway', 'ERROR',
        `Failed to fetch account: ${error.message}`
      );

      if (error.code === 5) { // gRPC NOT_FOUND
        return res.status(404).json({ error: 'Account not found' });
      }
      res.status(500).json({ error: 'Internal server error', details: error.message });
    }
  });

  /**
   * GET /api/v1/accounts/user/:userId
   * List all accounts belonging to a specific user.
   */
  router.get('/user/:userId', async (req, res) => {
    try {
      const { userId } = req.params;

      grpcClients.sendLog('api-gateway', 'INFO',
        `List accounts for user: ${userId}`,
        { endpoint: 'GET /accounts/user/:id' }
      );

      const result = await grpcClients.listAccounts(userId);

      res.json({
        accounts: result.accounts || [],
        count: (result.accounts || []).length,
      });
    } catch (error) {
      grpcClients.sendLog('api-gateway', 'ERROR',
        `Failed to list accounts: ${error.message}`
      );
      res.status(500).json({ error: 'Internal server error', details: error.message });
    }
  });

  return router;
};
