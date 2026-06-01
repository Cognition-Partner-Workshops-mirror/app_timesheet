/**
 * Root application component with routing configuration.
 * Provides navigation between Dashboard, Transactions, and Fraud Detection pages.
 */

import React from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import FraudDetection from './pages/FraudDetection';

function App() {
  return (
    <div className="app">
      {/* Navigation header */}
      <nav className="navbar">
        <h1 className="logo">Multi-Service Platform</h1>
        <div className="nav-links">
          <Link to="/">Dashboard</Link>
          <Link to="/transactions">Transactions</Link>
          <Link to="/fraud">Fraud Detection</Link>
        </div>
      </nav>

      {/* Main content area with route-based rendering */}
      <main className="content">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/fraud" element={<FraudDetection />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
