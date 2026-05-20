# ShopHub - E-Commerce Web Application

A full-stack ecommerce web application built with React, Node.js/Express, and SQLite database.

## Features

- User registration and authentication (JWT-based)
- Product catalog with categories, search, and filtering
- Featured products showcase on the homepage
- Product detail pages with stock tracking
- Shopping cart with quantity management
- Checkout flow with shipping and payment
- Order history and order detail views
- Admin support for product and order management
- Responsive design with Material UI

## Tech Stack

### Frontend
- **React 19** with TypeScript
- **Vite** for build tooling
- **Material UI** for responsive UI components
- **React Router** for client-side navigation
- **React Query** for server state management
- **Axios** for JSON API calls

### Backend
- **Node.js** with Express
- **SQLite** in-memory SQL database
- **JWT** for authentication
- **Joi** for request validation
- **Helmet** for security headers
- **Morgan** for request logging

## Project Structure

```
.
├── backend/
│   ├── src/
│   │   ├── database/
│   │   │   ├── init.js           # SQL schema initialization
│   │   │   └── seed.js           # Sample data seeding
│   │   ├── middleware/
│   │   │   ├── auth.js           # JWT authentication & admin guard
│   │   │   └── errorHandler.js   # Global error handler
│   │   ├── routes/
│   │   │   ├── auth.js           # Register, login, me
│   │   │   ├── products.js       # Product CRUD with filtering
│   │   │   ├── categories.js     # Category listing
│   │   │   ├── cart.js           # Cart management
│   │   │   └── orders.js         # Order placement & history
│   │   ├── validation/
│   │   │   └── schemas.js        # Joi validation schemas
│   │   └── server.js             # Express server entry point
│   └── package.json
│
└── frontend/
    ├── src/
    │   ├── api/
    │   │   └── client.ts         # Axios API client with JWT
    │   ├── components/
    │   │   ├── Layout.tsx         # App layout with navbar & footer
    │   │   └── ProductCard.tsx    # Reusable product card
    │   ├── contexts/
    │   │   └── AuthContext.tsx    # Auth state provider
    │   ├── pages/
    │   │   ├── HomePage.tsx       # Landing page with hero & featured
    │   │   ├── ProductsPage.tsx   # Product listing with filters
    │   │   ├── ProductDetailPage.tsx
    │   │   ├── CartPage.tsx       # Shopping cart
    │   │   ├── CheckoutPage.tsx   # Checkout with shipping form
    │   │   ├── OrdersPage.tsx     # Order history
    │   │   ├── OrderDetailPage.tsx
    │   │   ├── LoginPage.tsx
    │   │   └── RegisterPage.tsx
    │   ├── types/
    │   │   └── api.ts            # TypeScript interfaces
    │   └── App.tsx               # Router & providers
    └── package.json
```

## Getting Started

### Prerequisites
- Node.js 18+
- npm

### Backend Setup

```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

Backend runs at `http://localhost:3001`

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at `http://localhost:5173`

## Demo Accounts

| Email | Password | Role |
|-------|----------|------|
| demo@shop.com | demo123 | Customer |
| admin@shop.com | admin123 | Admin |

## API Endpoints

### Authentication
- `POST /api/auth/register` - Create new account
- `POST /api/auth/login` - Login with email/password
- `GET /api/auth/me` - Get current user

### Products
- `GET /api/products` - List products (supports search, category, sort, pagination)
- `GET /api/products/:id` - Get product details
- `POST /api/products` - Create product (admin)
- `PUT /api/products/:id` - Update product (admin)
- `DELETE /api/products/:id` - Delete product (admin)

### Categories
- `GET /api/categories` - List categories with product counts
- `GET /api/categories/:id` - Get category details

### Cart
- `GET /api/cart` - Get cart contents
- `POST /api/cart` - Add item to cart
- `PUT /api/cart/:id` - Update item quantity
- `DELETE /api/cart/:id` - Remove item
- `DELETE /api/cart` - Clear cart

### Orders
- `POST /api/orders` - Place order from cart
- `GET /api/orders` - List orders
- `GET /api/orders/:id` - Get order details
- `PUT /api/orders/:id/status` - Update status (admin)

All authenticated endpoints require `Authorization: Bearer <token>` header.

## Database Schema

The application uses SQLite with the following tables:
- **users** - Customer and admin accounts with hashed passwords
- **categories** - Product categories
- **products** - Product catalog with pricing and stock
- **cart_items** - Shopping cart per user
- **orders** - Completed orders with shipping info
- **order_items** - Individual items within each order
