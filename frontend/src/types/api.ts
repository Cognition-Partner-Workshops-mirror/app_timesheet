/**
 * TypeScript type definitions for the Event Services Marketplace.
 * Covers all API response types, entities, and form data shapes.
 */

// User roles in the platform
export type UserRole = 'admin' | 'business' | 'customer';

// Booking lifecycle statuses
export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed';

// User entity returned from API
export interface User {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  role: UserRole;
  is_approved: number;
  business_name: string | null;
  business_description: string | null;
  avatar_url: string | null;
  created_at: string;
}

// Service category (predefined types like Catering, Decorator, etc.)
export interface ServiceCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  created_at: string;
}

// Service listing created by a business user
export interface Service {
  id: string;
  business_user_id: string;
  category_id: string;
  name: string;
  description: string | null;
  price_min: number;
  price_max: number | null;
  location: string | null;
  city: string | null;
  image_url: string | null;
  is_active: number;
  capacity_min: number | null;
  capacity_max: number | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  category_name?: string;
  category_icon?: string;
  business_owner_name?: string;
  business_name?: string;
  business_phone?: string;
  avg_rating?: number;
  review_count?: number;
}

// Booking created by a customer for a service
export interface Booking {
  id: string;
  service_id: string;
  customer_user_id: string;
  event_date: string;
  event_type: string | null;
  guest_count: number | null;
  special_requests: string | null;
  status: BookingStatus;
  total_amount: number | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  service_name?: string;
  service_image?: string;
  service_description?: string;
  price_min?: number;
  price_max?: number;
  category_name?: string;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  business_owner_name?: string;
  business_name?: string;
  business_phone?: string;
  business_user_id?: string;
}

// Review left by a customer after a completed booking
export interface Review {
  id: string;
  booking_id: string;
  customer_user_id: string;
  service_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  reviewer_name?: string;
}

// Admin dashboard statistics
export interface DashboardStats {
  total_users: number;
  total_businesses: number;
  pending_approvals: number;
  total_services: number;
  total_bookings: number;
  total_revenue: number;
}

// Form data for creating/updating a service
export interface ServiceFormData {
  category_id: string;
  name: string;
  description: string;
  price_min: number;
  price_max: number | null;
  location: string;
  city: string;
  image_url: string;
  is_active?: boolean;
  capacity_min: number | null;
  capacity_max: number | null;
}

// Form data for creating a booking
export interface BookingFormData {
  service_id: string;
  event_date: string;
  event_type: string;
  guest_count: number | null;
  special_requests: string;
  total_amount: number | null;
}

// Auth API response shapes
export interface AuthResponse {
  token: string;
  user: User;
  message?: string;
}

export interface RegisterData {
  email: string;
  password: string;
  name: string;
  phone: string;
  role: 'customer' | 'business';
  business_name?: string;
  business_description?: string;
}
