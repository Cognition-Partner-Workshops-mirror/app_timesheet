/**
 * User Management Page - Admin user listing with role filters.
 * Supports searching, role filtering, and activating/deactivating users.
 */

import { useState, useEffect } from 'react';
import { adminApi } from '../services/api';

// User type from API
interface User {
  id: number;
  email: string;
  full_name: string;
  phone: string | null;
  role: string;
  city: string | null;
  is_active: boolean;
  is_verified: boolean;
  created_at: string;
}

function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Load users with optional filters
  const loadUsers = () => {
    setLoading(true);
    const params: Record<string, string> = {};
    if (roleFilter) params.role = roleFilter;
    if (searchQuery) params.search = searchQuery;

    adminApi.getUsers(params)
      .then(res => setUsers(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadUsers(); }, [roleFilter]);

  // Toggle user active status
  const handleToggleActive = async (userId: number) => {
    try {
      await adminApi.toggleUserActive(userId);
      loadUsers(); // Refresh list
    } catch (err) {
      console.error('Failed to toggle user status:', err);
    }
  };

  return (
    <div>
      <div className="top-bar">
        <h2>User Management</h2>
        <div style={{ display: 'flex', gap: 12 }}>
          {/* Search input */}
          <input
            type="text"
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && loadUsers()}
            style={{
              padding: '10px 16px', borderRadius: 10, border: '1px solid #e0e0e0',
              fontSize: 14, width: 240,
            }}
          />
          {/* Role filter */}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            style={{ padding: '10px 16px', borderRadius: 10, border: '1px solid #e0e0e0', fontSize: 14 }}
          >
            <option value="">All Roles</option>
            <option value="patient">Patients</option>
            <option value="doctor">Doctors</option>
            <option value="admin">Admins</option>
          </select>
        </div>
      </div>

      {/* Users count */}
      <div style={{ marginBottom: 16, color: '#757575', fontSize: 14 }}>
        Showing {users.length} user{users.length !== 1 ? 's' : ''}
      </div>

      {/* Users table */}
      <div className="data-table">
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center' }}>Loading users...</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Role</th>
                <th>City</th>
                <th>Status</th>
                <th>Verified</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.id}>
                  <td>#{user.id}</td>
                  <td style={{ fontWeight: 500 }}>{user.full_name}</td>
                  <td>{user.email}</td>
                  <td>{user.phone || '—'}</td>
                  <td>
                    <span className={`badge ${
                      user.role === 'admin' ? 'badge-error' :
                      user.role === 'doctor' ? 'badge-info' : 'badge-success'
                    }`}>
                      {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                    </span>
                  </td>
                  <td>{user.city || '—'}</td>
                  <td>
                    <span className={`badge ${user.is_active ? 'badge-success' : 'badge-error'}`}>
                      {user.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>{user.is_verified ? '✓' : '✗'}</td>
                  <td>
                    <button
                      onClick={() => handleToggleActive(user.id)}
                      className={`btn ${user.is_active ? 'btn-danger' : 'btn-success'}`}
                      style={{ padding: '6px 12px', fontSize: 12 }}
                    >
                      {user.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: 40, color: '#757575' }}>
                    No users found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default UsersPage;
