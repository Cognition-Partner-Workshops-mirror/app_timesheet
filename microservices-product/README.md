# Product Microservices

A microservices-based product catalog system built with **Node.js**, **Express**, **PostgreSQL**, and **Docker**. This project demonstrates modern microservices architecture patterns with a focus on the Product Service.

## Architecture Overview

```
┌─────────────────┐
│   Client Apps    │
│  (Web/Mobile)    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   API Gateway    │  Port 3000 - Central entry point
│  (Express +      │  - Request routing & proxying
│   Rate Limiting) │  - Rate limiting (express-rate-limit)
└────────┬────────┘  - Security headers (Helmet)
         │
         ▼
┌─────────────────┐
│ Product Service  │  Port 3001 - Product catalog CRUD
│  (Express +      │  - RESTful API endpoints
│   Sequelize)     │  - Input validation (express-validator)
└────────┬────────┘  - Structured logging (Winston)
         │
         ▼
┌─────────────────┐
│   PostgreSQL     │  Port 5432 - Persistent data store
│   Database       │  - Product catalog storage
└─────────────────┘
```

## Tech Stack

| Component        | Technology              | Purpose                          |
|-----------------|-------------------------|----------------------------------|
| Runtime         | Node.js 20              | JavaScript server runtime        |
| Framework       | Express.js 4            | HTTP server and routing          |
| Database        | PostgreSQL 16           | Relational data persistence      |
| ORM             | Sequelize 6             | Database abstraction and models  |
| Validation      | express-validator 7     | Request input validation         |
| Proxy           | http-proxy-middleware 3 | API Gateway request forwarding   |
| Rate Limiting   | express-rate-limit 7    | Request throttling               |
| Security        | Helmet 7                | HTTP security headers            |
| Logging         | Winston 3               | Structured application logging   |
| Testing         | Jest + Supertest        | Unit and integration testing     |
| Containerization| Docker + Docker Compose | Container orchestration          |
| CI/CD           | GitHub Actions          | Automated testing and builds     |

## Project Structure

```
microservices-product/
├── api-gateway/                 # API Gateway service
│   ├── src/
│   │   ├── config/              # Logger and service registry
│   │   ├── middleware/           # Rate limiter
│   │   ├── routes/              # Proxy route setup
│   │   └── index.js             # Gateway entry point
│   ├── Dockerfile
│   └── package.json
├── product-service/             # Product microservice
│   ├── src/
│   │   ├── config/              # Database and logger config
│   │   ├── controllers/         # Request handlers
│   │   ├── middleware/          # Error handler
│   │   ├── models/              # Sequelize data models
│   │   ├── routes/              # Express route definitions
│   │   ├── validators/          # Input validation rules
│   │   └── index.js             # Service entry point
│   ├── tests/                   # Jest test suites
│   ├── Dockerfile
│   └── package.json
├── .github/workflows/ci.yml    # GitHub Actions CI pipeline
├── docker-compose.yml           # Multi-service orchestration
└── README.md
```

## Getting Started

### Prerequisites

- **Node.js** >= 20
- **PostgreSQL** >= 14 (or Docker)
- **Docker** and **Docker Compose** (for containerized deployment)

### Option 1: Run with Docker Compose (Recommended)

The easiest way to run the full stack:

```bash
cd microservices-product

# Build and start all services (PostgreSQL, Product Service, API Gateway)
docker-compose up --build

# Run in detached mode
docker-compose up --build -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down

# Stop and remove volumes (clears database data)
docker-compose down -v
```

### Option 2: Run Locally

#### 1. Start PostgreSQL

```bash
# Using Docker for just the database
docker run -d --name product-db \
  -e POSTGRES_DB=product_db \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -p 5432:5432 \
  postgres:16-alpine
```

#### 2. Start the Product Service

```bash
cd product-service
cp .env.example .env    # Configure environment variables
npm install
npm run dev             # Starts on port 3001
```

#### 3. Start the API Gateway

```bash
cd api-gateway
cp .env.example .env    # Configure environment variables
npm install
npm run dev             # Starts on port 3000
```

## API Reference

All endpoints are accessible through the **API Gateway** at `http://localhost:3000` or directly via the **Product Service** at `http://localhost:3001`.

### Health Checks

| Method | Endpoint   | Description            |
|--------|-----------|------------------------|
| GET    | `/health` | Service health status  |

### Product Endpoints

| Method | Endpoint                 | Description                     |
|--------|-------------------------|---------------------------------|
| GET    | `/api/products`          | List products (paginated)       |
| GET    | `/api/products/:id`      | Get product by ID               |
| POST   | `/api/products`          | Create a new product            |
| PUT    | `/api/products/:id`      | Update a product                |
| DELETE | `/api/products/:id`      | Delete a product                |
| GET    | `/api/products/categories` | List all product categories   |

### Gateway Endpoints

| Method | Endpoint         | Description                    |
|--------|-----------------|--------------------------------|
| GET    | `/api/services`  | List registered microservices  |

### Query Parameters (GET /api/products)

| Parameter  | Type    | Description                                         |
|-----------|---------|-----------------------------------------------------|
| `page`     | integer | Page number (default: 1)                            |
| `limit`    | integer | Items per page (default: 10, max: 100)              |
| `category` | string  | Filter by category                                  |
| `minPrice` | number  | Minimum price filter                                |
| `maxPrice` | number  | Maximum price filter                                |
| `search`   | string  | Search in product name and description              |
| `sortBy`   | string  | Sort field: name, price, category, createdAt, quantity |
| `order`    | string  | Sort order: ASC or DESC                             |

### Example Requests

```bash
# Create a product
curl -X POST http://localhost:3000/api/products \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Wireless Keyboard",
    "description": "Ergonomic wireless keyboard with backlight",
    "price": 49.99,
    "sku": "KB-WIRELESS-001",
    "category": "Electronics",
    "quantity": 150
  }'

# List all products
curl http://localhost:3000/api/products

# Search products by name
curl "http://localhost:3000/api/products?search=keyboard&sortBy=price&order=ASC"

# Filter by category and price range
curl "http://localhost:3000/api/products?category=Electronics&minPrice=20&maxPrice=100"

# Get a specific product
curl http://localhost:3000/api/products/<product-uuid>

# Update a product
curl -X PUT http://localhost:3000/api/products/<product-uuid> \
  -H "Content-Type: application/json" \
  -d '{"price": 44.99, "quantity": 200}'

# Delete a product
curl -X DELETE http://localhost:3000/api/products/<product-uuid>
```

## Testing

```bash
cd product-service

# Run tests
npm test

# Run tests with coverage report
npm test -- --coverage

# Run tests in watch mode
npm run test:watch
```

## Extending the Architecture

This project is designed to be extensible. To add a new microservice:

1. **Create the service** directory with its own `package.json`, `Dockerfile`, and source code.
2. **Register the service** in `api-gateway/src/config/services.js`:
   ```javascript
   orders: {
     url: process.env.ORDER_SERVICE_URL || 'http://localhost:3002',
     pathPrefix: '/api/orders',
     description: 'Order management service',
   }
   ```
3. **Add to Docker Compose** in `docker-compose.yml` with the appropriate environment variables and dependencies.
4. **Update the CI pipeline** in `.github/workflows/ci.yml` with a new job for the service.

## License

This project is open-source and uses only open-source dependencies.
