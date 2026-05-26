/**
 * Analytics Page - Platform metrics and trend analysis.
 * Shows appointment trends, revenue data, and growth statistics.
 */

import { useState, useEffect } from 'react';
import { adminApi } from '../services/api';

// Analytics data type from API
interface AnalyticsData {
  period_days: number;
  appointments: number;
  new_users: number;
  revenue: number;
  average_daily_appointments: number;
}

function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState(30);

  useEffect(() => {
    setLoading(true);
    adminApi.getAnalytics(period)
      .then(res => setData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [period]);

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center' }}>Loading analytics...</div>;
  }

  return (
    <div>
      <div className="top-bar">
        <h2>Platform Analytics</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          {[7, 30, 90, 365].map(days => (
            <button
              key={days}
              className={`btn ${period === days ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setPeriod(days)}
            >
              {days === 7 ? '7 Days' : days === 30 ? '30 Days' : days === 90 ? '90 Days' : '1 Year'}
            </button>
          ))}
        </div>
      </div>

      {/* Metrics cards */}
      <div className="stats-grid">
        <MetricCard
          icon="📅"
          label="Appointments"
          value={data?.appointments || 0}
          subtitle={`${data?.average_daily_appointments || 0} per day avg`}
          color="#1a73e8"
        />
        <MetricCard
          icon="👤"
          label="New Users"
          value={data?.new_users || 0}
          subtitle={`In last ${period} days`}
          color="#00bfa5"
        />
        <MetricCard
          icon="💰"
          label="Revenue"
          value={`₹${(data?.revenue || 0).toLocaleString()}`}
          subtitle={`In last ${period} days`}
          color="#7b1fa2"
          isText
        />
        <MetricCard
          icon="📊"
          label="Daily Average"
          value={data?.average_daily_appointments || 0}
          subtitle="Appointments per day"
          color="#f57c00"
        />
      </div>

      {/* Revenue Breakdown */}
      <div className="charts-grid">
        <div className="card">
          <div className="card-header">
            <h3>Revenue Insights</h3>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <InsightRow
              label="Total Revenue"
              value={`₹${(data?.revenue || 0).toLocaleString()}`}
              color="#7b1fa2"
            />
            <InsightRow
              label="Avg Revenue/Day"
              value={`₹${data ? Math.round(data.revenue / data.period_days).toLocaleString() : 0}`}
              color="#1565c0"
            />
            <InsightRow
              label="Avg Revenue/Appointment"
              value={`₹${data && data.appointments > 0 ? Math.round(data.revenue / data.appointments).toLocaleString() : 0}`}
              color="#00897b"
            />
            <InsightRow
              label="Projected Monthly"
              value={`₹${data ? Math.round((data.revenue / data.period_days) * 30).toLocaleString() : 0}`}
              color="#ef6c00"
            />
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3>Growth Metrics</h3>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <InsightRow
              label="New Users"
              value={`${data?.new_users || 0}`}
              color="#43a047"
            />
            <InsightRow
              label="New Users/Day"
              value={`${data ? (data.new_users / data.period_days).toFixed(1) : 0}`}
              color="#1a73e8"
            />
            <InsightRow
              label="Total Appointments"
              value={`${data?.appointments || 0}`}
              color="#f57c00"
            />
            <InsightRow
              label="Avg Appointments/Day"
              value={`${data?.average_daily_appointments || 0}`}
              color="#e53935"
            />
          </div>
        </div>
      </div>

      {/* AI Analytics Summary */}
      <div className="card">
        <div className="card-header">
          <h3>AI Platform Insights</h3>
        </div>
        <div style={{
          padding: 24, background: 'linear-gradient(135deg, #e3f2fd 0%, #f3e5f5 100%)',
          borderRadius: 12, marginTop: 8,
        }}>
          <p style={{ fontSize: 15, lineHeight: 1.8, color: '#37474f' }}>
            📊 <strong>Period Summary ({period} days):</strong> The platform processed <strong>{data?.appointments || 0} appointments</strong> with{' '}
            <strong>{data?.new_users || 0} new user registrations</strong>. Average daily appointment rate is{' '}
            <strong>{data?.average_daily_appointments || 0}</strong> consultations per day. Total revenue generated:{' '}
            <strong>₹{(data?.revenue || 0).toLocaleString()}</strong>.
            {data && data.appointments > 0 && (
              <> The platform is tracking well with an average revenue of <strong>₹{Math.round(data.revenue / data.appointments)}</strong> per consultation.</>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}

// Metric card component for top stats
function MetricCard({ icon, label, value, subtitle, color, isText = false }: {
  icon: string; label: string; value: number | string; subtitle: string; color: string; isText?: boolean;
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
      <div style={{ fontSize: 12, color: '#9e9e9e', marginTop: 4 }}>{subtitle}</div>
    </div>
  );
}

// Insight row component for data breakdown sections
function InsightRow({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ padding: 16, background: '#f8f9fa', borderRadius: 10 }}>
      <div style={{ fontSize: 12, color: '#757575', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700, color }}>{value}</div>
    </div>
  );
}

export default AnalyticsPage;
