# Dockerfile for the Node.js API Gateway service.
# Uses a slim Node.js image for production deployment.

FROM node:20-alpine

WORKDIR /app

# Copy package files first for dependency caching
COPY package.json package-lock.json* ./
RUN npm install --production

# Copy source code and proto definitions
COPY src ./src
COPY ../proto ./proto

# Expose REST/GraphQL port
EXPOSE 4000

# Run the API Gateway
CMD ["node", "src/index.js"]
