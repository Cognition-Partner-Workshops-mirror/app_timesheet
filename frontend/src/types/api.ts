// TypeScript interfaces for the ecommerce API

// User model returned from auth endpoints
export interface User {
  id: number;
  name: string;
  email: string;
  role: 'customer' | 'admin';
}

// Product category with optional product count
export interface Category {
  id: number;
  name: string;
  description: string;
  image_url: string;
  product_count?: number;
}

// Product listing from the catalog
export interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  image_url: string;
  category_id: number;
  category_name: string;
  stock_quantity: number;
  featured: number;
  created_at: string;
  updated_at: string;
}

// Single item in the shopping cart
export interface CartItem {
  id: number;
  product_id: number;
  quantity: number;
  name: string;
  price: number;
  image_url: string;
  stock_quantity: number;
}

// Cart response including items and calculated totals
export interface CartResponse {
  items: CartItem[];
  summary: {
    itemCount: number;
    total: number;
  };
}

// Line item within a placed order
export interface OrderItem {
  id: number;
  order_id: number;
  product_id: number;
  product_name: string;
  product_price: number;
  quantity: number;
}

// Order record with shipping, payment, and status details
export interface Order {
  id: number;
  user_id: number;
  total_amount: number;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  shipping_name: string;
  shipping_address: string;
  shipping_city: string;
  shipping_state: string;
  shipping_zip: string;
  shipping_phone: string;
  payment_method: string;
  created_at: string;
  updated_at: string;
  customer_name?: string;
  customer_email?: string;
  items?: OrderItem[];
}

// Pagination metadata returned from list endpoints
export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// Auth response containing token and user info
export interface AuthResponse {
  message: string;
  token: string;
  user: User;
}

// Paginated product list response
export interface ProductsResponse {
  products: Product[];
  pagination: Pagination;
}

// Paginated order list response
export interface OrdersResponse {
  orders: Order[];
  pagination: Pagination;
}
