/**
 * Fraud Detection page - Uses both GraphQL queries and mutations.
 * Demonstrates GraphQL mutations for fraud checking and queries for model info.
 * Shows how GraphQL handles complex, interactive UI use cases.
 */

import React, { useState } from 'react';
import { useQuery, useMutation, gql } from '@apollo/client';

// GraphQL query to fetch ML model metadata
const MODEL_INFO_QUERY = gql`
  query ModelInfo {
    modelInfo {
      model_name
      model_version
      last_trained
      accuracy
      precision
      recall
      total_predictions
    }
  }
`;

// GraphQL mutation to run a fraud check without processing
const CHECK_FRAUD_MUTATION = gql`
  mutation CheckFraud($amount: Float!, $merchantCategory: String, $location: String) {
    checkFraud(amount: $amount, merchant_category: $merchantCategory, location: $location) {
      transaction_id
      is_fraudulent
      risk_score
      risk_level
      risk_factors
      recommendation
      model_version
    }
  }
`;

function FraudDetection() {
  // Form state for fraud check
  const [checkData, setCheckData] = useState({
    amount: '',
    merchantCategory: 'retail',
    location: 'domestic',
  });

  // GraphQL query for model info
  const { loading: modelLoading, data: modelData } = useQuery(MODEL_INFO_QUERY);

  // GraphQL mutation for fraud check
  const [checkFraud, { data: fraudResult, loading: checking }] = useMutation(CHECK_FRAUD_MUTATION);

  /**
   * Run fraud analysis using GraphQL mutation.
   * Sends transaction details to the API Gateway, which calls
   * the Python ML service via gRPC internally.
   */
  async function handleFraudCheck(e) {
    e.preventDefault();
    try {
      await checkFraud({
        variables: {
          amount: parseFloat(checkData.amount),
          merchantCategory: checkData.merchantCategory,
          location: checkData.location,
        },
      });
    } catch (err) {
      console.error('Fraud check failed:', err);
    }
  }

  return (
    <div className="fraud-page">
      <h2>Fraud Detection</h2>

      {/* ML Model Information Panel */}
      <section className="card">
        <h3>ML Model Status</h3>
        {modelLoading ? (
          <div className="loading">Loading model info...</div>
        ) : modelData?.modelInfo ? (
          <div className="model-stats">
            <div className="stat">
              <label>Model</label>
              <span>{modelData.modelInfo.model_name} v{modelData.modelInfo.model_version}</span>
            </div>
            <div className="stat">
              <label>Last Trained</label>
              <span>{modelData.modelInfo.last_trained}</span>
            </div>
            <div className="stat">
              <label>Accuracy</label>
              <span>{(modelData.modelInfo.accuracy * 100).toFixed(1)}%</span>
            </div>
            <div className="stat">
              <label>Precision</label>
              <span>{(modelData.modelInfo.precision * 100).toFixed(1)}%</span>
            </div>
            <div className="stat">
              <label>Recall</label>
              <span>{(modelData.modelInfo.recall * 100).toFixed(1)}%</span>
            </div>
            <div className="stat">
              <label>Total Predictions</label>
              <span>{modelData.modelInfo.total_predictions}</span>
            </div>
          </div>
        ) : (
          <p>Unable to fetch model information</p>
        )}
      </section>

      {/* Fraud Check Form */}
      <section className="card">
        <h3>Run Fraud Analysis (GraphQL Mutation)</h3>
        <form onSubmit={handleFraudCheck} className="fraud-form">
          <div className="form-group">
            <label>Transaction Amount ($):</label>
            <input
              type="number"
              step="0.01"
              value={checkData.amount}
              onChange={(e) => setCheckData({ ...checkData, amount: e.target.value })}
              placeholder="Enter amount to check"
              required
            />
          </div>
          <div className="form-group">
            <label>Merchant Category:</label>
            <select
              value={checkData.merchantCategory}
              onChange={(e) => setCheckData({ ...checkData, merchantCategory: e.target.value })}
            >
              <option value="retail">Retail</option>
              <option value="grocery">Grocery</option>
              <option value="travel">Travel</option>
              <option value="gambling">Gambling</option>
              <option value="crypto">Crypto</option>
              <option value="wire_transfer">Wire Transfer</option>
            </select>
          </div>
          <div className="form-group">
            <label>Location:</label>
            <select
              value={checkData.location}
              onChange={(e) => setCheckData({ ...checkData, location: e.target.value })}
            >
              <option value="domestic">Domestic</option>
              <option value="international">International</option>
            </select>
          </div>
          <button type="submit" className="btn-primary" disabled={checking}>
            {checking ? 'Analyzing...' : 'Run Fraud Analysis'}
          </button>
        </form>

        {/* Fraud check results display */}
        {fraudResult?.checkFraud && (
          <div className={`fraud-result risk-${fraudResult.checkFraud.risk_level.toLowerCase()}`}>
            <h4>Analysis Result</h4>
            <div className="result-grid">
              <div className="result-item">
                <label>Fraudulent:</label>
                <span className={fraudResult.checkFraud.is_fraudulent ? 'danger' : 'safe'}>
                  {fraudResult.checkFraud.is_fraudulent ? 'YES' : 'NO'}
                </span>
              </div>
              <div className="result-item">
                <label>Risk Score:</label>
                <span>{(fraudResult.checkFraud.risk_score * 100).toFixed(2)}%</span>
              </div>
              <div className="result-item">
                <label>Risk Level:</label>
                <span className={`risk-badge ${fraudResult.checkFraud.risk_level.toLowerCase()}`}>
                  {fraudResult.checkFraud.risk_level}
                </span>
              </div>
              <div className="result-item">
                <label>Recommendation:</label>
                <span>{fraudResult.checkFraud.recommendation}</span>
              </div>
              {fraudResult.checkFraud.risk_factors.length > 0 && (
                <div className="result-item full-width">
                  <label>Risk Factors:</label>
                  <ul>
                    {fraudResult.checkFraud.risk_factors.map((factor, i) => (
                      <li key={i}>{factor}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

export default FraudDetection;
