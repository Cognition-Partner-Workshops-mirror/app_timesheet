/**
 * Doctor Onboarding Page - Manage doctor verification and approval.
 * Shows pending doctors for review and allows admin to verify profiles.
 */

import { useState, useEffect } from 'react';
import { adminApi, doctorApi } from '../services/api';

// Doctor profile type from API
interface Doctor {
  id: number;
  user_id: number;
  full_name: string | null;
  email: string | null;
  qualification: string;
  experience_years: number;
  license_number: string | null;
  bio: string | null;
  hospital_name: string | null;
  consultation_fee: number;
  rating: number;
  total_reviews: number;
  total_consultations: number;
  is_verified: boolean;
  is_available: boolean;
  specializations: { id: number; name: string }[];
}

function DoctorsPage() {
  const [pendingDoctors, setPendingDoctors] = useState<Doctor[]>([]);
  const [allDoctors, setAllDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pending' | 'all'>('pending');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [pendingRes, allRes] = await Promise.all([
        adminApi.getPendingDoctors(),
        doctorApi.search(),
      ]);
      setPendingDoctors(pendingRes.data);
      setAllDoctors(allRes.data);
    } catch (err) {
      console.error('Failed to load doctors:', err);
    }
    setLoading(false);
  };

  // Verify a doctor's profile
  const handleVerify = async (doctorId: number) => {
    try {
      await adminApi.verifyDoctor(doctorId);
      loadData(); // Refresh both lists
    } catch (err) {
      console.error('Failed to verify doctor:', err);
    }
  };

  return (
    <div>
      <div className="top-bar">
        <h2>Doctor Onboarding</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className={`btn ${activeTab === 'pending' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setActiveTab('pending')}
          >
            Pending ({pendingDoctors.length})
          </button>
          <button
            className={`btn ${activeTab === 'all' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setActiveTab('all')}
          >
            All Doctors ({allDoctors.length})
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center' }}>Loading doctors...</div>
      ) : activeTab === 'pending' ? (
        // Pending doctors for verification
        pendingDoctors.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: 60 }}>
            <div style={{ fontSize: 48 }}>✅</div>
            <h3 style={{ marginTop: 16, color: '#43a047' }}>All Clear!</h3>
            <p style={{ color: '#757575', marginTop: 8 }}>No pending doctor verifications.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 16 }}>
            {pendingDoctors.map(doc => (
              <DoctorCard key={doc.id} doctor={doc} onVerify={handleVerify} showVerify />
            ))}
          </div>
        )
      ) : (
        // All verified doctors
        <div className="data-table">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Specialization</th>
                <th>Experience</th>
                <th>Hospital</th>
                <th>Fee</th>
                <th>Rating</th>
                <th>Consultations</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {allDoctors.map(doc => (
                <tr key={doc.id}>
                  <td style={{ fontWeight: 500 }}>{doc.full_name || 'N/A'}</td>
                  <td>{doc.specializations.map(s => s.name).join(', ') || '—'}</td>
                  <td>{doc.experience_years} years</td>
                  <td>{doc.hospital_name || '—'}</td>
                  <td>₹{doc.consultation_fee}</td>
                  <td>⭐ {doc.rating}</td>
                  <td>{doc.total_consultations}</td>
                  <td>
                    <span className={`badge ${doc.is_verified ? 'badge-success' : 'badge-warning'}`}>
                      {doc.is_verified ? 'Verified' : 'Pending'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// Doctor card component for pending verification review
function DoctorCard({ doctor, onVerify, showVerify }: {
  doctor: Doctor; onVerify: (id: number) => void; showVerify?: boolean;
}) {
  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h3 style={{ marginBottom: 4 }}>{doctor.full_name || 'Doctor'}</h3>
          <p style={{ color: '#757575', fontSize: 14 }}>{doctor.email}</p>
        </div>
        {showVerify && (
          <button className="btn btn-success" onClick={() => onVerify(doctor.id)}>
            ✓ Verify Doctor
          </button>
        )}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginTop: 16 }}>
        <InfoItem label="Qualification" value={doctor.qualification} />
        <InfoItem label="Experience" value={`${doctor.experience_years} years`} />
        <InfoItem label="Hospital" value={doctor.hospital_name || 'Not specified'} />
        <InfoItem label="License" value={doctor.license_number || 'Not provided'} />
        <InfoItem label="Consultation Fee" value={`₹${doctor.consultation_fee}`} />
        <InfoItem label="Specializations"
          value={doctor.specializations.map(s => s.name).join(', ') || 'None'} />
      </div>
      {doctor.bio && (
        <div style={{ marginTop: 12, padding: 12, background: '#f8f9fa', borderRadius: 8, fontSize: 14 }}>
          <strong>Bio:</strong> {doctor.bio}
        </div>
      )}
    </div>
  );
}

// Info item for doctor card details
function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 12, color: '#757575', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 500 }}>{value}</div>
    </div>
  );
}

export default DoctorsPage;
