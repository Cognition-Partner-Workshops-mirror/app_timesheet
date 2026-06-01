package com.multiservice.business.grpc;

import com.multiservice.business.service.TransactionService;
import com.multiservice.proto.business.Business;
import com.multiservice.proto.business.BusinessServiceGrpc;
import io.grpc.Server;
import io.grpc.ServerBuilder;
import io.grpc.Status;
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
 * Extends the protobuf-generated BusinessServiceImplBase to implement
 * all RPC methods defined in business.proto (health check, accounts,
 * transactions). Starts automatically with the Spring Boot application.
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
     * Inner class implementing the generated BusinessServiceImplBase.
     * Maps gRPC calls to the TransactionService for business logic execution.
     */
    private class BusinessServiceImpl extends BusinessServiceGrpc.BusinessServiceImplBase {

        /**
         * Health check endpoint - returns service status and uptime.
         */
        @Override
        public void healthCheck(Business.HealthCheckRequest request,
                                StreamObserver<Business.HealthCheckResponse> responseObserver) {
            long uptimeSeconds = Duration.between(startTime, LocalDateTime.now()).getSeconds();
            logger.debug("gRPC: Health check - uptime: {}s", uptimeSeconds);

            responseObserver.onNext(Business.HealthCheckResponse.newBuilder()
                    .setStatus("SERVING")
                    .setVersion("1.0.0")
                    .setUptimeSeconds(uptimeSeconds)
                    .build());
            responseObserver.onCompleted();
        }

        /**
         * List all accounts for a given user, converting from JPA entities
         * to protobuf Account messages.
         */
        @Override
        public void listAccounts(Business.ListAccountsRequest request,
                                 StreamObserver<Business.ListAccountsResponse> responseObserver) {
            logger.info("gRPC: List accounts for user {}", request.getUserId());

            List<com.multiservice.business.model.Account> accounts =
                    transactionService.listAccountsByUser(request.getUserId());

            // Build protobuf response from JPA entities
            Business.ListAccountsResponse.Builder responseBuilder =
                    Business.ListAccountsResponse.newBuilder();

            for (com.multiservice.business.model.Account account : accounts) {
                responseBuilder.addAccounts(Business.Account.newBuilder()
                        .setAccountId(account.getAccountId())
                        .setUserId(account.getUserId())
                        .setAccountType(account.getAccountType())
                        .setBalance(account.getBalance())
                        .setCurrency(account.getCurrency())
                        .setStatus(account.getStatus())
                        .setCreatedAt(account.getCreatedAt().toString())
                        .build());
            }

            responseObserver.onNext(responseBuilder.build());
            responseObserver.onCompleted();
        }

        /**
         * Retrieve a single account by ID and return as protobuf message.
         */
        @Override
        public void getAccount(Business.GetAccountRequest request,
                               StreamObserver<Business.Account> responseObserver) {
            logger.info("gRPC: Get account {}", request.getAccountId());
            try {
                com.multiservice.business.model.Account account =
                        transactionService.getAccount(request.getAccountId());

                responseObserver.onNext(Business.Account.newBuilder()
                        .setAccountId(account.getAccountId())
                        .setUserId(account.getUserId())
                        .setAccountType(account.getAccountType())
                        .setBalance(account.getBalance())
                        .setCurrency(account.getCurrency())
                        .setStatus(account.getStatus())
                        .setCreatedAt(account.getCreatedAt().toString())
                        .build());
                responseObserver.onCompleted();
            } catch (IllegalArgumentException e) {
                responseObserver.onError(Status.NOT_FOUND
                        .withDescription(e.getMessage()).asException());
            }
        }

        /**
         * Process a financial transaction with fraud validation.
         * Delegates to TransactionService for business logic execution.
         */
        @Override
        public void processTransaction(Business.TransactionRequest request,
                                       StreamObserver<Business.TransactionResponse> responseObserver) {
            logger.info("gRPC: Process transaction {} -> {}",
                    request.getFromAccountId(), request.getToAccountId());
            try {
                com.multiservice.business.model.TransactionRecord txn =
                        transactionService.processTransaction(
                                request.getFromAccountId(),
                                request.getToAccountId(),
                                request.getAmount(),
                                request.getCurrency(),
                                request.getDescription()
                        );

                responseObserver.onNext(Business.TransactionResponse.newBuilder()
                        .setTransactionId(txn.getTransactionId())
                        .setStatus(txn.getStatus())
                        .setMessage("Transaction " + txn.getStatus().toLowerCase())
                        .setProcessedAt(txn.getCreatedAt().toString())
                        .build());
                responseObserver.onCompleted();
            } catch (IllegalArgumentException e) {
                responseObserver.onError(Status.INVALID_ARGUMENT
                        .withDescription(e.getMessage()).asException());
            }
        }

        /**
         * Retrieve user details by user ID. Returns demo user for demonstration.
         */
        @Override
        public void getUser(Business.GetUserRequest request,
                            StreamObserver<Business.User> responseObserver) {
            logger.info("gRPC: Get user {}", request.getUserId());
            // Return a demo user for this demonstration
            responseObserver.onNext(Business.User.newBuilder()
                    .setUserId(request.getUserId())
                    .setEmail(request.getUserId() + "@example.com")
                    .setName("Demo User")
                    .setRole("USER")
                    .setStatus("ACTIVE")
                    .setCreatedAt(LocalDateTime.now().toString())
                    .build());
            responseObserver.onCompleted();
        }

        /**
         * Get paginated transaction history for an account.
         * Converts JPA TransactionRecord entities to protobuf messages.
         */
        @Override
        public void getTransactionHistory(Business.TransactionHistoryRequest request,
                                          StreamObserver<Business.TransactionHistoryResponse> responseObserver) {
            logger.info("gRPC: Get transaction history for account {}", request.getAccountId());

            List<com.multiservice.business.model.TransactionRecord> history =
                    transactionService.getTransactionHistory(
                            request.getAccountId(), request.getPage(), request.getPageSize());

            // Build protobuf response from JPA entities
            Business.TransactionHistoryResponse.Builder responseBuilder =
                    Business.TransactionHistoryResponse.newBuilder();

            for (com.multiservice.business.model.TransactionRecord txn : history) {
                responseBuilder.addTransactions(Business.TransactionRecord.newBuilder()
                        .setTransactionId(txn.getTransactionId())
                        .setFromAccountId(txn.getFromAccountId())
                        .setToAccountId(txn.getToAccountId())
                        .setAmount(txn.getAmount())
                        .setCurrency(txn.getCurrency())
                        .setDescription(txn.getDescription() != null ? txn.getDescription() : "")
                        .setStatus(txn.getStatus())
                        .setCreatedAt(txn.getCreatedAt().toString())
                        .build());
            }

            responseBuilder.setTotalCount(history.size());
            responseBuilder.setPage(request.getPage());
            responseBuilder.setPageSize(request.getPageSize());

            responseObserver.onNext(responseBuilder.build());
            responseObserver.onCompleted();
        }
    }
}
