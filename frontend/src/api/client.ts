/**
 * API client for Event Services Marketplace.
 * Uses Axios with JWT auth interceptor. Automatically attaches Bearer token
 * from localStorage and redirects to login on 401 responses.
 */

import axios, { type AxiosInstance, type AxiosResponse } from 'axios';
import type {
  AuthResponse,
  RegisterData,
  Service,
  ServiceCategory,
  ServiceFormData,
  Booking,
  BookingFormData,
  Review,
  User,
  DashboardStats,
} from '../types/api';

// Empty base URL means requests go through Vite proxy to backend
const API_BASE_URL = '';

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Attach JWT token from localStorage to every request
    this.client.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('token');
        if (token) {
          config.headers['Authorization'] = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Redirect to login on 401 unauthorized responses
    this.client.interceptors.response.use(
      (response: AxiosResponse) => response,
      (error) => {
        if (error.response?.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  // ── Auth ──────────────────────────────────────────────────────────────
  async register(data: RegisterData): Promise<AuthResponse> {
    const response = await this.client.post('/api/auth/register', data);
    return response.data;
  }

  async login(email: string, password: string): Promise<AuthResponse> {
    const response = await this.client.post('/api/auth/login', { email, password });
    return response.data;
  }

  async getMe(): Promise<{ user: User }> {
    const response = await this.client.get('/api/auth/me');
    return response.data;
  }

  async updateProfile(data: Partial<User>): Promise<{ message: string }> {
    const response = await this.client.put('/api/auth/profile', data);
    return response.data;
  }

  // ── Services ──────────────────────────────────────────────────────────
  async getServices(params?: Record<string, string>): Promise<{ services: Service[] }> {
    const response = await this.client.get('/api/services', { params });
    return response.data;
  }

  async getServiceCategories(): Promise<{ categories: ServiceCategory[] }> {
    const response = await this.client.get('/api/services/categories');
    return response.data;
  }

  async getMyServices(): Promise<{ services: Service[] }> {
    const response = await this.client.get('/api/services/my');
    return response.data;
  }

  async getService(id: string): Promise<{ service: Service; reviews: Review[] }> {
    const response = await this.client.get(`/api/services/${id}`);
    return response.data;
  }

  async createService(data: ServiceFormData): Promise<{ message: string; id: string }> {
    const response = await this.client.post('/api/services', data);
    return response.data;
  }

  async updateService(id: string, data: ServiceFormData): Promise<{ message: string }> {
    const response = await this.client.put(`/api/services/${id}`, data);
    return response.data;
  }

  async deleteService(id: string): Promise<{ message: string }> {
    const response = await this.client.delete(`/api/services/${id}`);
    return response.data;
  }

  // ── Bookings ──────────────────────────────────────────────────────────
  async getBookings(): Promise<{ bookings: Booking[] }> {
    const response = await this.client.get('/api/bookings');
    return response.data;
  }

  async getBooking(id: string): Promise<{ booking: Booking }> {
    const response = await this.client.get(`/api/bookings/${id}`);
    return response.data;
  }

  async createBooking(data: BookingFormData): Promise<{ message: string; id: string }> {
    const response = await this.client.post('/api/bookings', data);
    return response.data;
  }

  async updateBookingStatus(id: string, status: string): Promise<{ message: string }> {
    const response = await this.client.put(`/api/bookings/${id}/status`, { status });
    return response.data;
  }

  // ── Reviews ───────────────────────────────────────────────────────────
  async createReview(data: { booking_id: string; rating: number; comment: string }): Promise<{ message: string; id: string }> {
    const response = await this.client.post('/api/reviews', data);
    return response.data;
  }

  async getServiceReviews(serviceId: string): Promise<{ reviews: Review[]; avg_rating: number; total: number }> {
    const response = await this.client.get(`/api/reviews/service/${serviceId}`);
    return response.data;
  }

  // ── Admin ─────────────────────────────────────────────────────────────
  async getAdminDashboard(): Promise<{ stats: DashboardStats; recent_bookings: Booking[] }> {
    const response = await this.client.get('/api/admin/dashboard');
    return response.data;
  }

  async getAdminUsers(params?: Record<string, string>): Promise<{ users: User[] }> {
    const response = await this.client.get('/api/admin/users', { params });
    return response.data;
  }

  async approveUser(id: string, approved: boolean): Promise<{ message: string }> {
    const response = await this.client.put(`/api/admin/users/${id}/approve`, { approved });
    return response.data;
  }

  async changeUserRole(id: string, role: string): Promise<{ message: string }> {
    const response = await this.client.put(`/api/admin/users/${id}/role`, { role });
    return response.data;
  }

  async deleteUser(id: string): Promise<{ message: string }> {
    const response = await this.client.delete(`/api/admin/users/${id}`);
    return response.data;
  }

  async getAdminServices(): Promise<{ services: Service[] }> {
    const response = await this.client.get('/api/admin/services');
    return response.data;
  }

  // Health check
  async healthCheck() {
    const response = await this.client.get('/health');
    return response.data;
  }
}

export const apiClient = new ApiClient();
export default apiClient;
