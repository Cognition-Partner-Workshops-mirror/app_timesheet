/**
 * CareAI Admin API Service
 * Centralized Axios client for backend API communication.
 * Handles auth headers, token storage, and error handling.
 */

import axios from 'axios';

// API base URL - proxied through Vite in dev, direct in production
const API_BASE = '/api/v1';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to every request if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 errors by redirecting to login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('admin_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;

// Auth API calls
export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  getProfile: () => api.get('/auth/me'),
};

// Admin dashboard API calls
export const adminApi = {
  getDashboard: () => api.get('/admin/dashboard'),
  getUsers: (params?: Record<string, string>) => api.get('/admin/users', { params }),
  getPendingDoctors: () => api.get('/admin/doctors/pending'),
  verifyDoctor: (id: number) => api.post(`/admin/doctors/${id}/verify`),
  toggleUserActive: (id: number) => api.post(`/admin/users/${id}/toggle-active`),
  getAnalytics: (days?: number) => api.get('/admin/analytics', { params: { days } }),
};

// Doctor API calls
export const doctorApi = {
  search: (params?: Record<string, string>) => api.get('/doctors/search', { params }),
  getById: (id: number) => api.get(`/doctors/${id}`),
  getSpecializations: () => api.get('/doctors/specializations'),
};

// Appointment API calls
export const appointmentApi = {
  getAll: (params?: Record<string, string>) => api.get('/appointments/my', { params }),
};
