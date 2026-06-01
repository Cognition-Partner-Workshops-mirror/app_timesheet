/**
 * Dashboard page - Uses GraphQL for flexible data fetching.
 * Demonstrates the advantage of GraphQL: clients can request exactly
 * the fields they need for complex dashboard UIs.
 */

import React from 'react';
import { useQuery, gql } from '@apollo/client';

// GraphQL query to fetch multiple data sources in a single request.
// This is the key advantage of GraphQL for dashboards - one request, all data.
const DASHBOARD_QUERY = gql`
  query DashboardData($userId: String!) {
    accounts(user_id: $userId) {
      account_id
      account_type
      balance
      currency
      status
    }
    modelInfo {
      model_name
      model_version
      accuracy
      total_predictions
    }
    serviceHealth {
      name
      status
      latency_ms
    }
  }
`;

function Dashboard() {
  // Fetch dashboard data via GraphQL
  const { loading, error, data } = useQuery(DASHBOARD_QUERY, {
    variables: { userId: 'user-001' },
  });

  if (loading) return <div className="loading">Loading dashboard...</div>;
  if (error) return <div className="error">Error: {error.message}</div>;

  return (
    <div className="dashboard">
      <h2>System Dashboard</h2>

      {/* Account overview section */}
      <section className="card">
        <h3>Accounts Overview</h3>
        <div className="grid">
          {data?.accounts?.map((account) => (
            <div key={account.account_id} className="account-card">
              <div className="account-type">{account.account_type}</div>
              <div className="account-balance">
                {account.currency} {account.balance.toFixed(2)}
              </div>
              <div className={`status status-${account.status.toLowerCase()}`}>
                {account.status}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ML Model status section */}
      <section className="card">
        <h3>Fraud Detection Model</h3>
        {data?.modelInfo && (
          <div className="model-info">
            <p><strong>Model:</strong> {data.modelInfo.model_name} v{data.modelInfo.model_version}</p>
            <p><strong>Accuracy:</strong> {(data.modelInfo.accuracy * 100).toFixed(1)}%</p>
            <p><strong>Total Predictions:</strong> {data.modelInfo.total_predictions}</p>
          </div>
        )}
      </section>

      {/* Service health section */}
      <section className="card">
        <h3>Service Health</h3>
        <div className="health-grid">
          {data?.serviceHealth?.map((service) => (
            <div key={service.name} className="health-item">
              <span className={`health-dot ${service.status}`}></span>
              <span>{service.name}</span>
              {service.latency_ms !== null && (
                <span className="latency">{service.latency_ms}ms</span>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export default Dashboard;
