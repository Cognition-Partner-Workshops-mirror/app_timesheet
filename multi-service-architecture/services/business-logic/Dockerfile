# Multi-stage Dockerfile for the Java Spring Boot business logic service.
# Uses Maven for building and a slim JRE image for runtime.

# Build stage - compile the Java application with Maven
FROM maven:3.9-eclipse-temurin-17 AS builder

WORKDIR /app

# Copy POM first for dependency caching
COPY pom.xml .
RUN mvn dependency:go-offline -B

# Copy source and build the application
COPY src ./src
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
