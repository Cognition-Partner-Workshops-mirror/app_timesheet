/**
 * Transactions page - Uses REST API for standard CRUD operations.
 * Demonstrates REST API usage: straightforward HTTP methods for
 * creating and retrieving transaction resources.
 */

import React, { useState, useEffect } from 'react';
import axios from 'axios';

// REST API base URL (proxied to API Gateway in development)
const API_BASE = '/api/v1';

function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Form state for new transaction
  const [formData, setFormData] = useState({
    from_account_id: 'acc-001',
    to_account_id: 'acc-003',
    amount: '',
    currency: 'USD',
    description: '',
  });

  const [submitResult, setSubmitResult] = useState(null);

  // Fetch transaction history on mount via REST GET
  useEffect(() => {
    fetchTransactions();
  }, []);

  /**
   * Fetch transaction history using REST API.
   * GET /api/v1/transactions/:accountId/history
   */
  async function fetchTransactions() {
    try {
      setLoading(true);
      const response = await axios.get(
        `${API_BASE}/transactions/acc-001/history?page=0&page_size=20`
      );
      setTransactions(response.data.transactions || []);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  }

  /**
   * Submit a new transaction using REST API.
   * POST /api/v1/transactions
   * This endpoint performs fraud check + transaction processing.
   */
  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitResult(null);

    try {
      const response = await axios.post(`${API_BASE}/transactions`, {
        ...formData,
        amount: parseFloat(formData.amount),
      });

      setSubmitResult({
        success: true,
        data: response.data,
      });

      // Refresh transaction list after successful submission
      fetchTransactions();
    } catch (err) {
      setSubmitResult({
        success: false,
        error: err.response?.data || { error: err.message },
      });
    }
  }

  return (
    <div className="transactions-page">
      <h2>Transactions</h2>

      {/* New transaction form */}
      <section className="card">
        <h3>New Transaction (REST API)</h3>
        <form onSubmit={handleSubmit} className="transaction-form">
          <div className="form-group">
            <label>From Account:</label>
            <input
              type="text"
              value={formData.from_account_id}
              onChange={(e) => setFormData({ ...formData, from_account_id: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label>To Account:</label>
            <input
              type="text"
              value={formData.to_account_id}
              onChange={(e) => setFormData({ ...formData, to_account_id: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label>Amount:</label>
            <input
              type="number"
              step="0.01"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label>Description:</label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>
          <button type="submit" className="btn-primary">Process Transaction</button>
        </form>

        {/* Transaction result display */}
        {submitResult && (
          <div className={`result ${submitResult.success ? 'success' : 'error'}`}>
            {submitResult.success ? (
              <div>
                <p><strong>Status:</strong> {submitResult.data.status}</p>
                <p><strong>Transaction ID:</strong> {submitResult.data.transaction_id}</p>
                <p><strong>Risk Score:</strong> {submitResult.data.fraud_check?.risk_score?.toFixed(4)}</p>
                <p><strong>Risk Level:</strong> {submitResult.data.fraud_check?.risk_level}</p>
              </div>
            ) : (
              <div>
                <p><strong>Error:</strong> {submitResult.error.error}</p>
                {submitResult.error.risk_score && (
                  <p><strong>Risk Score:</strong> {submitResult.error.risk_score}</p>
                )}
              </div>
            )}
          </div>
        )}
      </section>

      {/* Transaction history table */}
      <section className="card">
        <h3>Transaction History</h3>
        {loading && <div className="loading">Loading transactions...</div>}
        {error && <div className="error">{error}</div>}
        {!loading && !error && (
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>From</th>
                <th>To</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {transactions.length === 0 ? (
                <tr><td colSpan="6">No transactions found</td></tr>
              ) : (
                transactions.map((txn) => (
                  <tr key={txn.transaction_id}>
                    <td>{txn.transaction_id?.slice(0, 8)}...</td>
                    <td>{txn.from_account_id}</td>
                    <td>{txn.to_account_id}</td>
                    <td>{txn.currency} {txn.amount}</td>
                    <td className={`status-${txn.status?.toLowerCase()}`}>{txn.status}</td>
                    <td>{txn.created_at}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

export default Transactions;
