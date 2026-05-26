# Multi-stage Dockerfile for the React frontend.
# Builds the static assets with Vite and serves them with nginx.

# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files for dependency caching
COPY package.json package-lock.json* ./
RUN npm install

# Copy source and build static assets
COPY . .
RUN npm run build

# Runtime stage - serve with nginx
FROM nginx:alpine

# Copy built assets to nginx html directory
COPY --from=builder /app/dist /usr/share/nginx/html

# Custom nginx config for SPA routing
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
