# Event Services Marketplace

A full-stack web application where event service providers (function decorators, caterers, function hall owners, photographers, etc.) can list and manage their services, and customers can browse and book them.

## Features

### Role-Based Access Control
- **Admin** — Full platform control: manage users, approve business accounts, view all bookings/services, platform analytics
- **Business** — Service providers: create/manage service listings, handle booking requests, view customer details
- **Customer** — Browse services, make bookings, leave reviews after completed events

### Core Functionality
- **Service Listings** — Browse services by category (Decorator, Catering, Function Hall, Photography, Music & DJ, Event Planner, Transport, Equipment Rental), city, search, and price range
- **Booking System** — Customers book services with event date, guest count, and special requests. Business owners confirm/complete/cancel bookings
- **Review System** — Customers can rate and review services after completed bookings
- **Business Approval** — Admin must approve new business accounts before they can list services
- **Dashboard Analytics** — Role-specific dashboards with key metrics

## Tech Stack
- **Frontend**: React 19, Vite, TypeScript, Material UI (MUI), React Router, TanStack Query, Axios
- **Backend**: Node.js, Express, SQLite3 (in-memory), JWT authentication, bcryptjs, Joi validation
- **Security**: Helmet, CORS, rate limiting, password hashing

## Getting Started

### Prerequisites
- Node.js 18+
- npm

### Installation

```bash
# Install backend dependencies
cd backend && npm install

# Install frontend dependencies
cd ../frontend && npm install
```

### Running the Application

```bash
# Start backend (port 3001)
cd backend && npm run dev

# Start frontend (port 5173)
cd frontend && npm run dev
```

### Default Admin Account
- **Email**: admin@eventmarket.com
- **Password**: admin123

## API Endpoints

### Auth
- `POST /api/auth/register` — Register (customer or business)
- `POST /api/auth/login` — Login (returns JWT)
- `GET /api/auth/me` — Get current user profile
- `PUT /api/auth/profile` — Update profile

### Services
- `GET /api/services` — Browse services (with filters: category, city, search, price)
- `GET /api/services/categories` — List service categories
- `GET /api/services/my` — Business: list own services
- `GET /api/services/:id` — Service detail with reviews
- `POST /api/services` — Business: create service
- `PUT /api/services/:id` — Business: update service
- `DELETE /api/services/:id` — Business/Admin: delete service

### Bookings
- `POST /api/bookings` — Customer: create booking
- `GET /api/bookings` — List bookings (role-filtered)
- `GET /api/bookings/:id` — Booking detail
- `PUT /api/bookings/:id/status` — Update status (confirm/complete/cancel)

### Reviews
- `POST /api/reviews` — Customer: review completed booking
- `GET /api/reviews/service/:id` — Get reviews for a service

### Admin
- `GET /api/admin/dashboard` — Platform statistics
- `GET /api/admin/users` — List all users
- `PUT /api/admin/users/:id/approve` — Approve/reject business
- `PUT /api/admin/users/:id/role` — Change user role
- `DELETE /api/admin/users/:id` — Delete user
- `GET /api/admin/services` — List all services

## Data Persistence
**This application uses SQLite in-memory database.**
- All data is lost when the backend server restarts
- Default categories and admin user are re-seeded on startup
- Suitable for development and demo purposes
