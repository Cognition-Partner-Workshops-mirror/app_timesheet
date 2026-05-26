# Multi-stage Dockerfile for the Go logging/metrics service.
# Uses a minimal scratch image for the final binary to reduce attack surface and image size.

# Build stage - compile the Go binary
FROM golang:1.21-alpine AS builder

WORKDIR /app

# Copy dependency files first for better Docker layer caching
COPY go.mod go.sum ./
RUN go mod download

# Copy source code and build a statically linked binary
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o logging-service .

# Runtime stage - minimal image with just the binary
FROM alpine:3.19

RUN apk --no-cache add ca-certificates

WORKDIR /root/

# Copy the compiled binary from the builder stage
COPY --from=builder /app/logging-service .

# Expose gRPC port
EXPOSE 50051

# Run the logging service
CMD ["./logging-service"]
