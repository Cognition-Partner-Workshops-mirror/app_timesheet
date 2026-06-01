# Multi-stage Dockerfile for the Go logging/metrics service.
# Generates proper protobuf Go code from shared .proto definitions,
# then builds a minimal binary for the runtime stage.

# Build stage - generate proto code and compile the Go binary
FROM golang:1.21-alpine AS builder

WORKDIR /app

# Install protoc for generating Go protobuf code from .proto definitions
RUN apk add --no-cache protobuf-dev
RUN go install google.golang.org/protobuf/cmd/protoc-gen-go@v1.32.0
RUN go install google.golang.org/grpc/cmd/protoc-gen-go-grpc@v1.3.0

# Copy Go module definition
COPY services/logging-service/go.mod .

# Copy source code (main.go only, proto dir will be generated)
COPY services/logging-service/main.go .

# Copy shared proto definition and generate proper Go protobuf code
# This produces proto/logging.pb.go and proto/logging_grpc.pb.go
COPY proto/logging.proto proto/logging.proto
RUN mkdir -p proto && \
    protoc --go_out=. --go_opt=paths=source_relative \
           --go-grpc_out=. --go-grpc_opt=paths=source_relative \
           proto/logging.proto

# Regenerate go.sum with correct dependencies and download modules
RUN go mod tidy && go mod download

# Build a statically linked binary
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
