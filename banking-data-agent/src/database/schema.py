"""
PostgreSQL warehouse schema definition.
Creates all tables for the banking data warehouse with proper indexing and constraints.
"""

# Schema DDL statements organized by banking domain
SCHEMA_SQL = """
-- ═══════════════════════════════════════════════════════════════════════════
-- Banking Data Warehouse Schema
-- Domains: Core Banking, Payments, Lending, Risk & Compliance
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── Core Banking ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS customers (
    customer_id       VARCHAR(50) PRIMARY KEY,
    first_name        VARCHAR(100) NOT NULL,
    last_name         VARCHAR(100) NOT NULL,
    email             VARCHAR(200),
    phone             VARCHAR(20) NOT NULL,
    date_of_birth     DATE NOT NULL,
    pan_number        VARCHAR(10),
    aadhaar_hash      VARCHAR(256),
    address           TEXT DEFAULT '',
    city              VARCHAR(100) DEFAULT '',
    state             VARCHAR(100) DEFAULT '',
    pincode           VARCHAR(10) DEFAULT '',
    kyc_status        VARCHAR(20) DEFAULT 'PENDING',
    created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ingested_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS accounts (
    account_id        VARCHAR(50) PRIMARY KEY,
    customer_id       VARCHAR(50) NOT NULL REFERENCES customers(customer_id),
    account_type      VARCHAR(30) NOT NULL,
    balance           NUMERIC(18,2) NOT NULL DEFAULT 0,
    currency          VARCHAR(3) DEFAULT 'INR',
    branch_code       VARCHAR(20) DEFAULT '',
    ifsc_code         VARCHAR(20) DEFAULT '',
    is_active         BOOLEAN DEFAULT TRUE,
    opened_date       DATE DEFAULT CURRENT_DATE,
    ingested_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS transactions (
    transaction_id    VARCHAR(50) PRIMARY KEY,
    account_id        VARCHAR(50) NOT NULL REFERENCES accounts(account_id),
    transaction_type  VARCHAR(20) NOT NULL,
    amount            NUMERIC(18,2) NOT NULL,
    currency          VARCHAR(3) DEFAULT 'INR',
    description       TEXT DEFAULT '',
    counterparty_account VARCHAR(50),
    timestamp         TIMESTAMP NOT NULL,
    status            VARCHAR(20) DEFAULT 'COMPLETED',
    ingested_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_transactions_account ON transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_timestamp ON transactions(timestamp);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(transaction_type);

-- ─── Payments ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS payments (
    payment_id        VARCHAR(50) PRIMARY KEY,
    channel           VARCHAR(20) NOT NULL,
    sender_account    VARCHAR(50) NOT NULL,
    receiver_account  VARCHAR(50) NOT NULL,
    amount            NUMERIC(18,2) NOT NULL,
    currency          VARCHAR(3) DEFAULT 'INR',
    reference_number  VARCHAR(100) DEFAULT '',
    status            VARCHAR(20) DEFAULT 'SUCCESS',
    failure_reason    TEXT,
    timestamp         TIMESTAMP NOT NULL,
    ingested_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_payments_channel ON payments(channel);
CREATE INDEX IF NOT EXISTS idx_payments_timestamp ON payments(timestamp);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);

CREATE TABLE IF NOT EXISTS card_transactions (
    transaction_id    VARCHAR(50) PRIMARY KEY,
    card_number_hash  VARCHAR(256) NOT NULL,
    card_type         VARCHAR(10) DEFAULT 'DEBIT',
    merchant_name     VARCHAR(200) DEFAULT '',
    merchant_category VARCHAR(100) DEFAULT '',
    amount            NUMERIC(18,2) NOT NULL,
    currency          VARCHAR(3) DEFAULT 'INR',
    location_city     VARCHAR(100) DEFAULT '',
    location_country  VARCHAR(5) DEFAULT 'IN',
    is_international  BOOLEAN DEFAULT FALSE,
    is_online         BOOLEAN DEFAULT FALSE,
    timestamp         TIMESTAMP NOT NULL,
    ingested_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_card_txn_card ON card_transactions(card_number_hash);
CREATE INDEX IF NOT EXISTS idx_card_txn_merchant ON card_transactions(merchant_category);
CREATE INDEX IF NOT EXISTS idx_card_txn_timestamp ON card_transactions(timestamp);

-- ─── Lending ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS loans (
    loan_id              VARCHAR(50) PRIMARY KEY,
    customer_id          VARCHAR(50) NOT NULL REFERENCES customers(customer_id),
    loan_type            VARCHAR(20) NOT NULL,
    principal_amount     NUMERIC(18,2) NOT NULL,
    interest_rate        NUMERIC(5,2) NOT NULL,
    tenure_months        INTEGER NOT NULL,
    emi_amount           NUMERIC(18,2) NOT NULL,
    disbursement_date    DATE NOT NULL,
    maturity_date        DATE NOT NULL,
    outstanding_balance  NUMERIC(18,2) NOT NULL,
    status               VARCHAR(20) DEFAULT 'ACTIVE',
    collateral_type      VARCHAR(50),
    collateral_value     NUMERIC(18,2),
    ingested_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_loans_customer ON loans(customer_id);
CREATE INDEX IF NOT EXISTS idx_loans_status ON loans(status);
CREATE INDEX IF NOT EXISTS idx_loans_type ON loans(loan_type);

CREATE TABLE IF NOT EXISTS emi_payments (
    emi_id               VARCHAR(50) PRIMARY KEY,
    loan_id              VARCHAR(50) NOT NULL REFERENCES loans(loan_id),
    installment_number   INTEGER NOT NULL,
    due_date             DATE NOT NULL,
    paid_date            DATE,
    amount               NUMERIC(18,2) NOT NULL,
    principal_component  NUMERIC(18,2) NOT NULL,
    interest_component   NUMERIC(18,2) NOT NULL,
    is_overdue           BOOLEAN DEFAULT FALSE,
    penalty_amount       NUMERIC(18,2) DEFAULT 0,
    ingested_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_emi_loan ON emi_payments(loan_id);
CREATE INDEX IF NOT EXISTS idx_emi_due_date ON emi_payments(due_date);

-- ─── Risk & Compliance ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS risk_alerts (
    alert_id          VARCHAR(50) PRIMARY KEY,
    alert_type        VARCHAR(30) NOT NULL,
    risk_level        VARCHAR(20) NOT NULL,
    customer_id       VARCHAR(50) NOT NULL REFERENCES customers(customer_id),
    account_id        VARCHAR(50),
    transaction_id    VARCHAR(50),
    description       TEXT DEFAULT '',
    rule_triggered    VARCHAR(200) DEFAULT '',
    amount_involved   NUMERIC(18,2),
    is_resolved       BOOLEAN DEFAULT FALSE,
    resolution_notes  TEXT,
    detected_at       TIMESTAMP NOT NULL,
    resolved_at       TIMESTAMP,
    ingested_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_alerts_type ON risk_alerts(alert_type);
CREATE INDEX IF NOT EXISTS idx_alerts_risk ON risk_alerts(risk_level);
CREATE INDEX IF NOT EXISTS idx_alerts_customer ON risk_alerts(customer_id);
CREATE INDEX IF NOT EXISTS idx_alerts_resolved ON risk_alerts(is_resolved);

CREATE TABLE IF NOT EXISTS suspicious_transactions (
    str_id            VARCHAR(50) PRIMARY KEY,
    customer_id       VARCHAR(50) NOT NULL REFERENCES customers(customer_id),
    transaction_ids   TEXT DEFAULT '',  -- Comma-separated transaction IDs
    total_amount      NUMERIC(18,2) NOT NULL,
    reason            TEXT DEFAULT '',
    reported_to_fiu   BOOLEAN DEFAULT FALSE,
    reporting_date    DATE,
    created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ingested_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_str_customer ON suspicious_transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_str_fiu ON suspicious_transactions(reported_to_fiu);

-- ─── Ingestion Metadata ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ingestion_log (
    id                SERIAL PRIMARY KEY,
    batch_id          VARCHAR(50) NOT NULL,
    domain            VARCHAR(50) NOT NULL,
    table_name        VARCHAR(100) NOT NULL,
    records_received  INTEGER DEFAULT 0,
    records_valid     INTEGER DEFAULT 0,
    records_invalid   INTEGER DEFAULT 0,
    records_loaded    INTEGER DEFAULT 0,
    status            VARCHAR(20) DEFAULT 'IN_PROGRESS',
    error_message     TEXT,
    ai_insights       TEXT,
    started_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at      TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ingestion_batch ON ingestion_log(batch_id);
CREATE INDEX IF NOT EXISTS idx_ingestion_domain ON ingestion_log(domain);
CREATE INDEX IF NOT EXISTS idx_ingestion_status ON ingestion_log(status);
"""
