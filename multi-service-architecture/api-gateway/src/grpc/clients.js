/**
 * gRPC Client Manager - Establishes and manages gRPC connections
 * to all backend microservices (Java business logic, Python fraud detection,
 * Go logging). Uses @grpc/grpc-js for high-performance binary protocol communication.
 */

const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');

// Proto file loading options for consistent behavior
const PROTO_OPTIONS = {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
};

class GrpcClients {
  constructor() {
    // Service connection configuration from environment variables
    this.businessHost = process.env.BUSINESS_SERVICE_HOST || 'localhost';
    this.businessPort = process.env.BUSINESS_SERVICE_PORT || '50053';
    this.fraudHost = process.env.FRAUD_SERVICE_HOST || 'localhost';
    this.fraudPort = process.env.FRAUD_SERVICE_PORT || '50052';
    this.loggingHost = process.env.LOGGING_SERVICE_HOST || 'localhost';
    this.loggingPort = process.env.LOGGING_SERVICE_PORT || '50051';

    // Initialize gRPC client stubs
    this._initBusinessClient();
    this._initFraudClient();
    this._initLoggingClient();

    console.log('[gRPC] Client connections initialized');
  }

  /**
   * Initialize the gRPC client for the Java business logic service.
   * Handles transactions, accounts, and user management.
   */
  _initBusinessClient() {
    const protoPath = path.resolve(__dirname, '../../../proto/business.proto');
    const packageDef = protoLoader.loadSync(protoPath, PROTO_OPTIONS);
    const businessProto = grpc.loadPackageDefinition(packageDef).business;

    this.businessClient = new businessProto.BusinessService(
      `${this.businessHost}:${this.businessPort}`,
      grpc.credentials.createInsecure()
    );

    console.log(`[gRPC] Business service client -> ${this.businessHost}:${this.businessPort}`);
  }

  /**
   * Initialize the gRPC client for the Python fraud detection service.
   * Used for real-time transaction risk analysis.
   */
  _initFraudClient() {
    const protoPath = path.resolve(__dirname, '../../../proto/fraud.proto');
    const packageDef = protoLoader.loadSync(protoPath, PROTO_OPTIONS);
    const fraudProto = grpc.loadPackageDefinition(packageDef).fraud;

    this.fraudClient = new fraudProto.FraudDetectionService(
      `${this.fraudHost}:${this.fraudPort}`,
      grpc.credentials.createInsecure()
    );

    console.log(`[gRPC] Fraud detection client -> ${this.fraudHost}:${this.fraudPort}`);
  }

  /**
   * Initialize the gRPC client for the Go logging/metrics service.
   * Used for centralized structured logging from the API gateway.
   */
  _initLoggingClient() {
    const protoPath = path.resolve(__dirname, '../../../proto/logging.proto');
    const packageDef = protoLoader.loadSync(protoPath, PROTO_OPTIONS);
    const loggingProto = grpc.loadPackageDefinition(packageDef).logging;

    this.loggingClient = new loggingProto.LoggingService(
      `${this.loggingHost}:${this.loggingPort}`,
      grpc.credentials.createInsecure()
    );

    console.log(`[gRPC] Logging service client -> ${this.loggingHost}:${this.loggingPort}`);
  }

  /**
   * Send a structured log entry to the Go logging service.
   * Called from REST/GraphQL handlers for centralized observability.
   */
  sendLog(serviceName, level, message, metadata = {}) {
    const entry = {
      service_name: serviceName,
      level,
      message,
      timestamp: new Date().toISOString(),
      metadata,
      trace_id: `trace-${Date.now()}`,
    };

    this.loggingClient.SendLog(entry, (err, response) => {
      if (err) {
        console.error('[gRPC] Failed to send log:', err.message);
      }
    });
  }

  /**
   * Send a metric data point to the Go logging service.
   */
  sendMetric(serviceName, metricName, value, metricType = 'GAUGE', labels = {}) {
    const entry = {
      service_name: serviceName,
      metric_name: metricName,
      value,
      metric_type: metricType,
      timestamp: new Date().toISOString(),
      labels,
    };

    this.loggingClient.SendMetric(entry, (err, response) => {
      if (err) {
        console.error('[gRPC] Failed to send metric:', err.message);
      }
    });
  }

  /**
   * Check a transaction for fraud via the Python ML service.
   * Returns a promise with the fraud analysis result.
   */
  checkFraud(transaction) {
    return new Promise((resolve, reject) => {
      this.fraudClient.CheckTransaction(transaction, (err, response) => {
        if (err) {
          reject(err);
        } else {
          resolve(response);
        }
      });
    });
  }

  /**
   * Process a transaction via the Java business service.
   * Returns a promise with the transaction result.
   */
  processTransaction(request) {
    return new Promise((resolve, reject) => {
      this.businessClient.ProcessTransaction(request, (err, response) => {
        if (err) {
          reject(err);
        } else {
          resolve(response);
        }
      });
    });
  }

  /**
   * Get account details from the Java business service.
   */
  getAccount(accountId) {
    return new Promise((resolve, reject) => {
      this.businessClient.GetAccount({ account_id: accountId }, (err, response) => {
        if (err) {
          reject(err);
        } else {
          resolve(response);
        }
      });
    });
  }

  /**
   * List accounts for a user from the Java business service.
   */
  listAccounts(userId) {
    return new Promise((resolve, reject) => {
      this.businessClient.ListAccounts({ user_id: userId }, (err, response) => {
        if (err) {
          reject(err);
        } else {
          resolve(response);
        }
      });
    });
  }
}

module.exports = { GrpcClients };
