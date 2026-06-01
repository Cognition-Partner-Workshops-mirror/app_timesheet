package com.multiservice.business;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * Main entry point for the Business Logic microservice.
 * This Spring Boot application provides core business operations
 * including transaction processing, user management, and account operations.
 * It communicates with the fraud detection service via gRPC for transaction validation.
 */
@SpringBootApplication
public class BusinessApplication {

    public static void main(String[] args) {
        SpringApplication.run(BusinessApplication.class, args);
    }
}
