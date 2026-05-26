/**
 * REST API routes for transaction operations.
 * Exposes standard HTTP endpoints (GET, POST) for transaction management.
 * Internally communicates with Java business service and Python fraud service via gRPC.
 */

const express = require('express');
const { v4: uuidv4 } = require('uuid');

/**
 * Creates transaction router with gRPC client dependency injection.
 * @param {GrpcClients} grpcClients - Initialized gRPC client connections
 */
module.exports = function transactionRoutes(grpcClients) {
  const router = express.Router();

  /**
   * POST /api/v1/transactions
   * Process a new financial transaction.
   * Performs fraud check before execution.
   *
   * Request body:
   *   - from_account_id: Source account identifier
   *   - to_account_id: Destination account identifier
   *   - amount: Transaction amount
   *   - currency: Currency code (default: USD)
   *   - description: Optional transaction description
   */
  router.post('/', async (req, res) => {
    try {
      const { from_account_id, to_account_id, amount, currency, description } = req.body;

      // Validate required fields
      if (!from_account_id || !to_account_id || !amount) {
        return res.status(400).json({
          error: 'Missing required fields: from_account_id, to_account_id, amount',
        });
      }

      // Log the incoming transaction request
      grpcClients.sendLog('api-gateway', 'INFO',
        `Transaction request: ${from_account_id} -> ${to_account_id}, amount=${amount}`,
        { endpoint: 'POST /transactions' }
      );

      // Step 1: Check for fraud via the Python ML service
      const fraudCheck = await grpcClients.checkFraud({
        transaction_id: uuidv4(),
        user_id: req.headers['x-user-id'] || 'unknown',
        amount: parseFloat(amount),
        currency: currency || 'USD',
        merchant_id: to_account_id,
        merchant_category: 'transfer',
        location: req.headers['x-location'] || 'unknown',
        timestamp: new Date().toISOString(),
        card_type: 'debit',
        ip_address: req.ip,
      });

      // If fraud detected, block the transaction
      if (fraudCheck.is_fraudulent) {
        grpcClients.sendLog('api-gateway', 'WARN',
          `Transaction BLOCKED by fraud detection: score=${fraudCheck.risk_score}`,
          { risk_level: fraudCheck.risk_level }
        );
        return res.status(403).json({
          error: 'Transaction blocked',
          reason: 'Fraud detection flagged this transaction',
          risk_score: fraudCheck.risk_score,
          risk_level: fraudCheck.risk_level,
          risk_factors: fraudCheck.risk_factors,
        });
      }

      // Step 2: Process the transaction via the Java business service
      const result = await grpcClients.processTransaction({
        from_account_id,
        to_account_id,
        amount: parseFloat(amount),
        currency: currency || 'USD',
        description: description || '',
        initiated_by: req.headers['x-user-id'] || 'unknown',
      });

      // Record metrics
      grpcClients.sendMetric('api-gateway', 'transaction_processed', 1, 'COUNTER');
      grpcClients.sendMetric('api-gateway', 'transaction_amount', parseFloat(amount), 'HISTOGRAM');

      res.status(201).json({
        transaction_id: result.transaction_id,
        status: result.status,
        message: result.message,
        new_balance: result.new_balance,
        processed_at: result.processed_at,
        fraud_check: {
          risk_score: fraudCheck.risk_score,
          risk_level: fraudCheck.risk_level,
          recommendation: fraudCheck.recommendation,
        },
      });
    } catch (error) {
      grpcClients.sendLog('api-gateway', 'ERROR',
        `Transaction processing failed: ${error.message}`,
        { stack: error.stack }
      );
      res.status(500).json({ error: 'Internal server error', details: error.message });
    }
  });

  /**
   * GET /api/v1/transactions/:accountId/history
   * Retrieve paginated transaction history for an account.
   *
   * Query params:
   *   - page: Page number (default: 0)
   *   - page_size: Results per page (default: 20)
   */
  router.get('/:accountId/history', async (req, res) => {
    try {
      const { accountId } = req.params;
      const page = parseInt(req.query.page) || 0;
      const pageSize = parseInt(req.query.page_size) || 20;

      grpcClients.sendLog('api-gateway', 'INFO',
        `Transaction history request for account: ${accountId}`,
        { endpoint: 'GET /transactions/history' }
      );

      // Fetch history from the Java business service
      const result = await new Promise((resolve, reject) => {
        grpcClients.businessClient.GetTransactionHistory({
          account_id: accountId,
          page,
          page_size: pageSize,
        }, (err, response) => {
          if (err) reject(err);
          else resolve(response);
        });
      });

      res.json({
        transactions: result.transactions,
        total_count: result.total_count,
        page: result.page,
        page_size: result.page_size,
      });
    } catch (error) {
      grpcClients.sendLog('api-gateway', 'ERROR',
        `Failed to fetch transaction history: ${error.message}`
      );
      res.status(500).json({ error: 'Internal server error', details: error.message });
    }
  });

  return router;
};
