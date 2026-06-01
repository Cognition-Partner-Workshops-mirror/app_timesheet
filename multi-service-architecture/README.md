# Multi-Service Architecture

A polyglot microservices system demonstrating modern API patterns (REST, GraphQL, gRPC) across multiple technology stacks.

## Architecture Overview

```
Frontend (React - JS)
        ↓ REST + GraphQL
Node.js API Gateway (JS)
        ↓ gRPC
Java Microservices (business logic)
        ↓ gRPC
Python ML Service (fraud detection)
        ↓ gRPC
Go Service (high-performance logging / metrics)
```

## Services

| Service | Technology | Port | Protocol | Purpose |
|---------|-----------|------|----------|---------|
| Frontend | React, Vite | 3000 | HTTP | User interface |
| API Gateway | Node.js, Express, Apollo | 4000 | REST + GraphQL | Request routing, API aggregation |
| Business Logic | Java, Spring Boot | 8080/50053 | REST + gRPC | Transaction processing, accounts |
| Fraud Detection | Python, scikit-learn | 50052 | gRPC | ML-based fraud analysis |
| Logging Service | Go | 50051 | gRPC | Centralized logging & metrics |

## API Types Used

| API Type | Description | Best Use Case | Where Used |
|----------|-------------|---------------|------------|
| REST | Standard HTTP-based (GET, POST, PUT, DELETE) | Web apps, microservices | Frontend ↔ API Gateway |
| GraphQL | Client chooses exact data | Complex UI, dashboards | Frontend ↔ API Gateway |
| gRPC / RPC | High-performance binary protocol | Microservices internal communication | API Gateway ↔ All backend services |

## Communication Flow

1. **Frontend → API Gateway**: REST for simple CRUD operations, GraphQL for complex dashboard queries
2. **API Gateway → Business Logic**: gRPC for high-performance internal calls
3. **API Gateway → Fraud Detection**: gRPC for real-time ML inference
4. **All Services → Logging**: gRPC for efficient structured log shipping

## Project Structure

```
multi-service-architecture/
├── proto/                          # Shared Protocol Buffer definitions
│   ├── logging.proto               # Logging service contract
│   ├── fraud.proto                 # Fraud detection service contract
│   └── business.proto              # Business logic service contract
├── frontend/                       # React frontend (Vite)
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx       # GraphQL-powered dashboard
│   │   │   ├── Transactions.jsx    # REST API transactions
│   │   │   └── FraudDetection.jsx  # GraphQL mutations for fraud checks
│   │   ├── App.jsx
│   │   └── main.jsx
│   └── Dockerfile
├── api-gateway/                    # Node.js API Gateway
│   ├── src/
│   │   ├── routes/                 # REST API endpoints
│   │   ├── graphql/                # GraphQL schema & resolvers
│   │   └── grpc/                   # gRPC client connections
│   └── Dockerfile
├── services/
│   ├── business-logic/             # Java Spring Boot service
│   │   ├── src/main/java/
│   │   ├── pom.xml
│   │   └── Dockerfile
│   ├── fraud-detection/            # Python ML service
│   │   ├── src/
│   │   │   ├── model.py            # Random Forest fraud model
│   │   │   └── grpc_server.py      # gRPC service implementation
│   │   ├── requirements.txt
│   │   └── Dockerfile
│   └── logging-service/            # Go logging service
│       ├── main.go
│       ├── go.mod
│       └── Dockerfile
└── docker-compose.yml              # Full stack orchestration
```

## Getting Started

### Prerequisites

- Docker and Docker Compose
- (Optional for local development without Docker):
  - Node.js 20+
  - Go 1.21+
  - Python 3.11+
  - Java 17+ with Maven
  - Protocol Buffers compiler (protoc)

### Run with Docker Compose

```bash
# Start all services
cd multi-service-architecture
docker-compose up --build

# Services will be available at:
# - Frontend: http://localhost:3000
# - API Gateway (REST): http://localhost:4000/api/v1
# - API Gateway (GraphQL): http://localhost:4000/graphql
# - Business Logic: http://localhost:8080
# - Fraud Detection (gRPC): localhost:50052
# - Logging Service (gRPC): localhost:50051
```

### Local Development (Individual Services)

```bash
# Go Logging Service
cd services/logging-service
go run main.go

# Python Fraud Detection
cd services/fraud-detection
pip install -r requirements.txt
python -m src.grpc_server

# Java Business Logic
cd services/business-logic
mvn spring-boot:run

# Node.js API Gateway
cd api-gateway
npm install && npm run dev

# React Frontend
cd frontend
npm install && npm run dev
```

## API Examples

### REST API

```bash
# Process a transaction
curl -X POST http://localhost:4000/api/v1/transactions \
  -H "Content-Type: application/json" \
  -d '{
    "from_account_id": "acc-001",
    "to_account_id": "acc-003",
    "amount": 150.00,
    "currency": "USD",
    "description": "Payment for services"
  }'

# Get transaction history
curl http://localhost:4000/api/v1/transactions/acc-001/history?page=0&page_size=20

# Get account details
curl http://localhost:4000/api/v1/accounts/acc-001

# Health check
curl http://localhost:4000/api/v1/health
```

### GraphQL API

```graphql
# Query: Fetch dashboard data (client selects exact fields needed)
query {
  accounts(user_id: "user-001") {
    account_id
    balance
    account_type
  }
  modelInfo {
    model_name
    accuracy
    total_predictions
  }
}

# Mutation: Process a transaction with fraud check
mutation {
  processTransaction(input: {
    from_account_id: "acc-001"
    to_account_id: "acc-003"
    amount: 250.00
    description: "Transfer"
  }) {
    transaction_id
    status
    fraud_check {
      risk_score
      risk_level
      recommendation
    }
  }
}

# Mutation: Run standalone fraud analysis
mutation {
  checkFraud(amount: 5000, merchant_category: "gambling", location: "international") {
    is_fraudulent
    risk_score
    risk_level
    risk_factors
    recommendation
  }
}
```

## Key Design Decisions

1. **REST for External APIs**: Simple, well-understood HTTP verbs for frontend-to-gateway communication
2. **GraphQL for Complex Queries**: Dashboard and fraud detection pages benefit from requesting exactly the data they need
3. **gRPC for Internal Services**: Binary protocol with strong typing, ideal for high-throughput inter-service calls
4. **Proto-first Design**: Shared `.proto` files define service contracts, ensuring type safety across languages
5. **Centralized Logging**: All services stream logs to the Go service via gRPC for unified observability
6. **Docker Compose**: Simple local orchestration without requiring Kubernetes for development

## Technology Stack

- **Frontend**: React 18, Vite, Apollo Client, Axios, React Router
- **API Gateway**: Node.js, Express, Apollo Server, @grpc/grpc-js
- **Business Logic**: Java 17, Spring Boot 3.2, gRPC-Java, H2/PostgreSQL
- **Fraud Detection**: Python 3.11, scikit-learn, gRPC, FastAPI
- **Logging Service**: Go 1.21, gRPC-Go
- **Infrastructure**: Docker, Docker Compose, Nginx, Protocol Buffers
