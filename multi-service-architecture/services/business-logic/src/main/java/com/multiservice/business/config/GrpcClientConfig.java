package com.multiservice.business.config;

import io.grpc.ManagedChannel;
import io.grpc.ManagedChannelBuilder;
import jakarta.annotation.PreDestroy;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Configuration for gRPC client connections to downstream services.
 * Sets up managed channels for communicating with the fraud detection
 * and logging services via gRPC.
 */
@Configuration
public class GrpcClientConfig {

    private static final Logger logger = LoggerFactory.getLogger(GrpcClientConfig.class);

    @Value("${grpc.client.fraud-detection.host:localhost}")
    private String fraudServiceHost;

    @Value("${grpc.client.fraud-detection.port:50052}")
    private int fraudServicePort;

    @Value("${grpc.client.logging-service.host:localhost}")
    private String loggingServiceHost;

    @Value("${grpc.client.logging-service.port:50051}")
    private int loggingServicePort;

    private ManagedChannel fraudChannel;
    private ManagedChannel loggingChannel;

    /**
     * Create a gRPC channel to the fraud detection Python service.
     * Used for real-time transaction fraud analysis.
     */
    @Bean(name = "fraudDetectionChannel")
    public ManagedChannel fraudDetectionChannel() {
        fraudChannel = ManagedChannelBuilder
                .forAddress(fraudServiceHost, fraudServicePort)
                .usePlaintext() // No TLS for internal service communication
                .build();
        logger.info("gRPC channel to Fraud Detection service: {}:{}",
                fraudServiceHost, fraudServicePort);
        return fraudChannel;
    }

    /**
     * Create a gRPC channel to the Go logging service.
     * Used for sending structured logs and metrics.
     */
    @Bean(name = "loggingServiceChannel")
    public ManagedChannel loggingServiceChannel() {
        loggingChannel = ManagedChannelBuilder
                .forAddress(loggingServiceHost, loggingServicePort)
                .usePlaintext() // No TLS for internal service communication
                .build();
        logger.info("gRPC channel to Logging service: {}:{}",
                loggingServiceHost, loggingServicePort);
        return loggingChannel;
    }

    /**
     * Gracefully shutdown gRPC channels on application exit.
     */
    @PreDestroy
    public void shutdown() {
        if (fraudChannel != null && !fraudChannel.isShutdown()) {
            fraudChannel.shutdown();
        }
        if (loggingChannel != null && !loggingChannel.isShutdown()) {
            loggingChannel.shutdown();
        }
        logger.info("gRPC client channels shut down");
    }
}
