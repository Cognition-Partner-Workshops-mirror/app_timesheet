# Multi-stage Dockerfile for the Java Spring Boot business logic service.
# Uses protobuf-maven-plugin to generate Java stubs from shared .proto files,
# then builds a Spring Boot JAR with Maven and runs on a slim JRE.

# Build stage - compile the Java application with Maven
FROM maven:3.9-eclipse-temurin-17 AS builder

WORKDIR /app

# Copy POM first for dependency caching
COPY services/business-logic/pom.xml .
RUN mvn dependency:go-offline -B

# Copy source code
COPY services/business-logic/src ./src

# Copy shared proto definitions for protobuf code generation
# protobuf-maven-plugin reads from src/main/proto/ by default
COPY proto/ ./src/main/proto/

# Build the application (protobuf-maven-plugin generates Java stubs during compile)
RUN mvn package -DskipTests -B

# Runtime stage - minimal JRE image
FROM eclipse-temurin:17-jre-alpine

WORKDIR /app

# Copy the built JAR from the builder stage
COPY --from=builder /app/target/*.jar app.jar

# Expose REST and gRPC ports
EXPOSE 8080 50053

# Run the Spring Boot application
ENTRYPOINT ["java", "-jar", "app.jar"]
