# Product Service Dockerfile
# Multi-stage build for optimized production image

# --- Build stage ---
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency manifests first for better Docker layer caching
COPY package*.json ./
RUN npm ci --only=production

# --- Production stage ---
FROM node:20-alpine

WORKDIR /app

# Create non-root user for security best practices
RUN addgroup -g 1001 -S appgroup && \
    adduser -S appuser -u 1001 -G appgroup

# Copy built dependencies from builder stage
COPY --from=builder /app/node_modules ./node_modules
COPY . .

# Switch to non-root user
USER appuser

# Expose the service port
EXPOSE 3001

# Health check to verify the service is running
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/health || exit 1

CMD ["node", "src/index.js"]
