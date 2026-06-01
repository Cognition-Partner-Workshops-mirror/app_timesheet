# Dockerfile for the Node.js API Gateway service.
# Uses a slim Node.js image for production deployment.
# Build context is set to the project root in docker-compose.yml

FROM node:20-alpine

WORKDIR /app

# Copy package files first for dependency caching
COPY api-gateway/package.json api-gateway/package-lock.json* ./
RUN npm install --production

# Copy source code and proto definitions
COPY api-gateway/src ./src
COPY proto ./proto

# Expose REST/GraphQL port
EXPOSE 4000

# Run the API Gateway
CMD ["node", "src/index.js"]
