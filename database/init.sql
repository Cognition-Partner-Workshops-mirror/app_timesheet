-- CareAI PostgreSQL Initialization Script
-- Runs automatically on first docker-compose up
-- Creates database extensions and sets up initial configuration

-- Enable UUID generation extension for PostgreSQL
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable full-text search extension for doctor search
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Grant all privileges to the careai user on the database
GRANT ALL PRIVILEGES ON DATABASE careai_db TO careai;

-- Set default timezone to UTC for consistent timestamp handling
ALTER DATABASE careai_db SET timezone TO 'UTC';
