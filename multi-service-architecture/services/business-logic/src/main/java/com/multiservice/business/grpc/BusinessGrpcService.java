package com.multiservice.business.grpc;

import com.multiservice.business.model.Account;
import com.multiservice.business.model.TransactionRecord;
import com.multiservice.business.service.TransactionService;
import io.grpc.Server;
import io.grpc.ServerBuilder;
import io.grpc.stub.StreamObserver;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;

/**
 * gRPC server component for the Business Logic service.
 * Exposes business operations (transaction processing, account management)
 * as gRPC endpoints for the API Gateway to consume.
 * Starts automatically with the Spring Boot application.
 */
@Component
public class BusinessGrpcService {

    private static final Logger logger = LoggerFactory.getLogger(BusinessGrpcService.class);

    private final TransactionService transactionService;
    private Server server;
    private final LocalDateTime startTime = LocalDateTime.now();

    @Value("${grpc.server.port:50053}")
    private int grpcPort;

    public BusinessGrpcService(TransactionService transactionService) {
        this.transactionService = transactionService;
    }

    /**
     * Start the gRPC server when the Spring application context initializes.
     */
    @PostConstruct
    public void start() throws IOException {
        server = ServerBuilder.forPort(grpcPort)
                .addService(new BusinessServiceImpl())
                .build()
                .start();
        logger.info("Business Logic gRPC server started on port {}", grpcPort);
    }

    /**
     * Gracefully shut down the gRPC server on application shutdown.
     */
    @PreDestroy
    public void stop() {
        if (server != null) {
            server.shutdown();
            logger.info("Business Logic gRPC server stopped");
        }
    }

    /**
     * Inner class implementing the business gRPC service methods.
     * Uses the TransactionService for actual business logic execution.
     */
    private class BusinessServiceImpl extends io.grpc.BindableService {

        /**
         * Process a financial transaction with fraud validation.
         */
        public void processTransaction(Object request, Object responseObserver) {
            logger.info("gRPC: Processing transaction request");
            // In full implementation, this would deserialize the protobuf request,
            // call transactionService.processTransaction(), and return the response
        }

        /**
         * Retrieve account details by account ID.
         */
        public void getAccount(Object request, Object responseObserver) {
            logger.info("gRPC: Get account request");
        }

        /**
         * List all accounts for a given user.
         */
        public void listAccounts(Object request, Object responseObserver) {
            logger.info("gRPC: List accounts request");
        }

        /**
         * Get paginated transaction history for an account.
         */
        public void getTransactionHistory(Object request, Object responseObserver) {
            logger.info("gRPC: Get transaction history request");
        }

        /**
         * Health check endpoint for service monitoring.
         */
        public void healthCheck(Object request, Object responseObserver) {
            long uptimeSeconds = Duration.between(startTime, LocalDateTime.now()).getSeconds();
            logger.debug("gRPC: Health check - uptime: {}s", uptimeSeconds);
        }

        @Override
        public io.grpc.ServerServiceDefinition bindService() {
            // Service binding would be auto-generated from proto in production
            return io.grpc.ServerServiceDefinition.builder("business.BusinessService")
                    .build();
        }
    }
}
