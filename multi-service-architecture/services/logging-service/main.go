// Package main implements the high-performance Go logging and metrics service.
// This service collects structured logs and metrics from all other microservices
// via gRPC, providing centralized observability for the entire system.
package main

import (
	"context"
	"fmt"
	"io"
	"log"
	"net"
	"os"
	"sync"
	"time"

	pb "github.com/multi-service-arch/logging-service/proto"
	"google.golang.org/grpc"
	"google.golang.org/grpc/reflection"
)

// LogStore provides thread-safe in-memory storage for log entries.
// In production, this would be backed by a time-series database like InfluxDB or Elasticsearch.
type LogStore struct {
	mu      sync.RWMutex
	entries []*pb.LogEntry
	metrics []*pb.MetricEntry
}

// NewLogStore creates a new instance of the log store
func NewLogStore() *LogStore {
	return &LogStore{
		entries: make([]*pb.LogEntry, 0, 10000),
		metrics: make([]*pb.MetricEntry, 0, 10000),
	}
}

// AddEntry appends a log entry to the store in a thread-safe manner
func (s *LogStore) AddEntry(entry *pb.LogEntry) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.entries = append(s.entries, entry)
}

// AddMetric appends a metric entry to the store in a thread-safe manner
func (s *LogStore) AddMetric(entry *pb.MetricEntry) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.metrics = append(s.metrics, entry)
}

// QueryEntries retrieves log entries matching the given filters
func (s *LogStore) QueryEntries(serviceName, level, startTime, endTime string, limit int32) ([]*pb.LogEntry, int32) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	var results []*pb.LogEntry
	for _, entry := range s.entries {
		// Apply filters
		if serviceName != "" && entry.ServiceName != serviceName {
			continue
		}
		if level != "" && entry.Level != level {
			continue
		}
		if startTime != "" && entry.Timestamp < startTime {
			continue
		}
		if endTime != "" && entry.Timestamp > endTime {
			continue
		}
		results = append(results, entry)
		if limit > 0 && int32(len(results)) >= limit {
			break
		}
	}
	return results, int32(len(results))
}

// loggingServer implements the LoggingService gRPC server
type loggingServer struct {
	pb.UnimplementedLoggingServiceServer
	store *LogStore
}

// SendLog handles a single log entry submission
func (s *loggingServer) SendLog(ctx context.Context, entry *pb.LogEntry) (*pb.LogResponse, error) {
	// Auto-fill timestamp if not provided
	if entry.Timestamp == "" {
		entry.Timestamp = time.Now().UTC().Format(time.RFC3339)
	}

	s.store.AddEntry(entry)

	// Print to stdout for real-time monitoring
	log.Printf("[%s] %s | %s: %s", entry.Level, entry.ServiceName, entry.Timestamp, entry.Message)

	return &pb.LogResponse{
		Success: true,
		Message: "Log entry received",
	}, nil
}

// SendBatchLogs handles batch submission of multiple log entries
func (s *loggingServer) SendBatchLogs(ctx context.Context, req *pb.BatchLogRequest) (*pb.LogResponse, error) {
	for _, entry := range req.Entries {
		if entry.Timestamp == "" {
			entry.Timestamp = time.Now().UTC().Format(time.RFC3339)
		}
		s.store.AddEntry(entry)
		log.Printf("[%s] %s | %s: %s", entry.Level, entry.ServiceName, entry.Timestamp, entry.Message)
	}

	return &pb.LogResponse{
		Success: true,
		Message: fmt.Sprintf("Batch of %d log entries received", len(req.Entries)),
	}, nil
}

// SendMetric handles a single metric data point submission
func (s *loggingServer) SendMetric(ctx context.Context, entry *pb.MetricEntry) (*pb.MetricResponse, error) {
	if entry.Timestamp == "" {
		entry.Timestamp = time.Now().UTC().Format(time.RFC3339)
	}

	s.store.AddMetric(entry)

	log.Printf("[METRIC] %s | %s = %.4f (%s)", entry.ServiceName, entry.MetricName, entry.Value, entry.MetricType)

	return &pb.MetricResponse{
		Success:         true,
		MetricsReceived: 1,
	}, nil
}

// SendBatchMetrics handles batch submission of multiple metric data points
func (s *loggingServer) SendBatchMetrics(ctx context.Context, req *pb.BatchMetricRequest) (*pb.MetricResponse, error) {
	for _, entry := range req.Entries {
		if entry.Timestamp == "" {
			entry.Timestamp = time.Now().UTC().Format(time.RFC3339)
		}
		s.store.AddMetric(entry)
		log.Printf("[METRIC] %s | %s = %.4f (%s)", entry.ServiceName, entry.MetricName, entry.Value, entry.MetricType)
	}

	return &pb.MetricResponse{
		Success:         true,
		MetricsReceived: int32(len(req.Entries)),
	}, nil
}

// StreamLogs handles streaming log entries from a client
func (s *loggingServer) StreamLogs(stream pb.LoggingService_StreamLogsServer) error {
	var count int32
	for {
		entry, err := stream.Recv()
		if err == io.EOF {
			// Client finished streaming, send response
			return stream.SendAndClose(&pb.LogResponse{
				Success: true,
				Message: fmt.Sprintf("Stream completed. Received %d entries", count),
			})
		}
		if err != nil {
			return err
		}

		if entry.Timestamp == "" {
			entry.Timestamp = time.Now().UTC().Format(time.RFC3339)
		}
		s.store.AddEntry(entry)
		count++
		log.Printf("[STREAM] [%s] %s: %s", entry.Level, entry.ServiceName, entry.Message)
	}
}

// QueryLogs retrieves historical log entries based on filters
func (s *loggingServer) QueryLogs(ctx context.Context, req *pb.QueryLogsRequest) (*pb.QueryLogsResponse, error) {
	entries, totalCount := s.store.QueryEntries(
		req.ServiceName,
		req.Level,
		req.StartTime,
		req.EndTime,
		req.Limit,
	)

	return &pb.QueryLogsResponse{
		Entries:    entries,
		TotalCount: totalCount,
	}, nil
}

func main() {
	// Configure the gRPC server port from environment or default to 50051
	port := os.Getenv("LOGGING_SERVICE_PORT")
	if port == "" {
		port = "50051"
	}

	listener, err := net.Listen("tcp", fmt.Sprintf(":%s", port))
	if err != nil {
		log.Fatalf("Failed to listen on port %s: %v", port, err)
	}

	// Create gRPC server with default options
	grpcServer := grpc.NewServer()

	// Register the logging service implementation
	store := NewLogStore()
	pb.RegisterLoggingServiceServer(grpcServer, &loggingServer{store: store})

	// Enable server reflection for debugging tools like grpcurl
	reflection.Register(grpcServer)

	log.Printf("Go Logging/Metrics Service started on port %s", port)
	log.Printf("Accepting gRPC connections for structured logging and metrics collection")

	// Start serving gRPC requests
	if err := grpcServer.Serve(listener); err != nil {
		log.Fatalf("Failed to serve: %v", err)
	}
}
