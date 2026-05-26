/**
 * Admin Dashboard Page - Platform overview with key metrics.
 * Shows stats cards, revenue data, and quick status overview.
 */

import { useState, useEffect } from 'react';
import { adminApi } from '../services/api';

// Dashboard stats type from API
interface DashboardStats {
  total_patients: number;
  total_doctors: number;
  total_appointments: number;
  completed_appointments: number;
  total_revenue: number;
  monthly_revenue: number;
  pending_doctor_verifications: number;
  todays_appointments: number;
}

function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi.getDashboard()
      .then(res => setStats(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center' }}>Loading dashboard...</div>;
  }

  return (
    <div>
      <div className="top-bar">
        <h2>Dashboard Overview</h2>
        <div style={{ fontSize: 14, color: '#757575' }}>
          {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>

      {/* Stats Cards Grid */}
      <div className="stats-grid">
        <StatCard
          icon="👥"
          label="Total Patients"
          value={stats?.total_patients || 0}
          color="#1a73e8"
        />
        <StatCard
          icon="👨‍⚕️"
          label="Total Doctors"
          value={stats?.total_doctors || 0}
          color="#00bfa5"
        />
        <StatCard
          icon="📅"
          label="Total Appointments"
          value={stats?.total_appointments || 0}
          color="#f57c00"
        />
        <StatCard
          icon="✅"
          label="Completed Consultations"
          value={stats?.completed_appointments || 0}
          color="#43a047"
        />
      </div>

      {/* Revenue and Status Row */}
      <div className="stats-grid">
        <StatCard
          icon="💰"
          label="Total Revenue"
          value={`₹${(stats?.total_revenue || 0).toLocaleString()}`}
          color="#7b1fa2"
          isText
        />
        <StatCard
          icon="📊"
          label="Monthly Revenue"
          value={`₹${(stats?.monthly_revenue || 0).toLocaleString()}`}
          color="#1565c0"
          isText
        />
        <StatCard
          icon="⏳"
          label="Pending Verifications"
          value={stats?.pending_doctor_verifications || 0}
          color="#e53935"
        />
        <StatCard
          icon="📋"
          label="Today's Appointments"
          value={stats?.todays_appointments || 0}
          color="#00897b"
        />
      </div>

      {/* Quick Actions */}
      <div className="card">
        <div className="card-header">
          <h3>Quick Actions</h3>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <a href="/doctors" className="btn btn-primary">Review Pending Doctors</a>
          <a href="/users" className="btn btn-outline">Manage Users</a>
          <a href="/analytics" className="btn btn-outline">View Analytics</a>
        </div>
      </div>

      {/* Platform Summary */}
      <div className="card">
        <div className="card-header">
          <h3>Platform Summary</h3>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <SummaryItem label="Appointment Completion Rate"
            value={stats && stats.total_appointments > 0
              ? `${((stats.completed_appointments / stats.total_appointments) * 100).toFixed(1)}%`
              : '0%'} />
          <SummaryItem label="Average Revenue per Consultation"
            value={stats && stats.completed_appointments > 0
              ? `₹${(stats.total_revenue / stats.completed_appointments).toFixed(0)}`
              : '₹0'} />
          <SummaryItem label="Doctor-Patient Ratio"
            value={stats && stats.total_patients > 0
              ? `1:${Math.round(stats.total_patients / Math.max(stats.total_doctors, 1))}`
              : '0'} />
          <SummaryItem label="Platform Status" value="🟢 All Systems Operational" />
        </div>
      </div>
    </div>
  );
}

// Stat card component for dashboard metrics
function StatCard({ icon, label, value, color, isText = false }: {
  icon: string; label: string; value: number | string; color: string; isText?: boolean;
}) {
  return (
    <div className="stat-card">
      <div className="stat-icon" style={{ background: `${color}15` }}>
        <span style={{ fontSize: 24 }}>{icon}</span>
      </div>
      <div className="stat-value" style={{ color }}>
        {isText ? value : typeof value === 'number' ? value.toLocaleString() : value}
      </div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

// Summary item for platform info section
function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ padding: 16, background: '#f8f9fa', borderRadius: 12 }}>
      <div style={{ fontSize: 13, color: '#757575', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 600 }}>{value}</div>
    </div>
  );
}

export default DashboardPage;
