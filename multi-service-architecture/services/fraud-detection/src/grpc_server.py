"""
gRPC server implementation for the Fraud Detection ML service.
Exposes the FraudDetectionService defined in fraud.proto,
handling single and batch transaction analysis requests.
"""

import grpc
from concurrent import futures
import time
import os
import logging

from src.model import FraudDetectionModel
from src.proto import fraud_pb2, fraud_pb2_grpc

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s"
)
logger = logging.getLogger(__name__)


class FraudDetectionServicer(fraud_pb2_grpc.FraudDetectionServiceServicer):
    """
    gRPC service implementation for fraud detection.
    Handles transaction analysis using the ML model.
    """

    def __init__(self):
        # Initialize the ML model on server startup
        self.model = FraudDetectionModel()
        logger.info("Fraud detection model loaded successfully")

    def CheckTransaction(self, request, context):
        """
        Analyze a single transaction for fraud indicators.
        Returns risk score, level, and contributing factors.
        """
        # Convert protobuf message to dict for model processing
        transaction = {
            "transaction_id": request.transaction_id,
            "user_id": request.user_id,
            "amount": request.amount,
            "currency": request.currency,
            "merchant_id": request.merchant_id,
            "merchant_category": request.merchant_category,
            "location": request.location,
            "timestamp": request.timestamp,
            "card_type": request.card_type,
            "ip_address": request.ip_address,
        }

        # Run ML prediction
        risk_score, risk_level, risk_factors = self.model.predict(transaction)

        # Determine recommendation based on risk level
        recommendation = self._get_recommendation(risk_level)

        logger.info(
            f"Transaction {request.transaction_id}: "
            f"score={risk_score:.4f}, level={risk_level}, action={recommendation}"
        )

        return fraud_pb2.FraudCheckResponse(
            transaction_id=request.transaction_id,
            is_fraudulent=risk_score >= 0.7,
            risk_score=risk_score,
            risk_level=risk_level,
            risk_factors=risk_factors,
            recommendation=recommendation,
            model_version=self.model.model_version,
        )

    def CheckBatchTransactions(self, request, context):
        """
        Analyze multiple transactions in a batch for efficiency.
        Returns individual results plus summary statistics.
        """
        results = []
        flagged_count = 0

        for txn in request.transactions:
            transaction = {
                "transaction_id": txn.transaction_id,
                "user_id": txn.user_id,
                "amount": txn.amount,
                "currency": txn.currency,
                "merchant_id": txn.merchant_id,
                "merchant_category": txn.merchant_category,
                "location": txn.location,
                "timestamp": txn.timestamp,
                "card_type": txn.card_type,
                "ip_address": txn.ip_address,
            }

            risk_score, risk_level, risk_factors = self.model.predict(transaction)
            recommendation = self._get_recommendation(risk_level)
            is_fraudulent = risk_score >= 0.7

            if is_fraudulent:
                flagged_count += 1

            results.append(fraud_pb2.FraudCheckResponse(
                transaction_id=txn.transaction_id,
                is_fraudulent=is_fraudulent,
                risk_score=risk_score,
                risk_level=risk_level,
                risk_factors=risk_factors,
                recommendation=recommendation,
                model_version=self.model.model_version,
            ))

        logger.info(
            f"Batch analysis: {len(results)} transactions, "
            f"{flagged_count} flagged"
        )

        return fraud_pb2.BatchFraudCheckResponse(
            results=results,
            total_processed=len(results),
            flagged_count=flagged_count,
        )

    def StreamTransactions(self, request_iterator, context):
        """
        Handle streaming transactions for real-time analysis.
        Each incoming transaction gets an immediate fraud check response.
        """
        for txn in request_iterator:
            transaction = {
                "transaction_id": txn.transaction_id,
                "user_id": txn.user_id,
                "amount": txn.amount,
                "currency": txn.currency,
                "merchant_id": txn.merchant_id,
                "merchant_category": txn.merchant_category,
                "location": txn.location,
                "timestamp": txn.timestamp,
                "card_type": txn.card_type,
                "ip_address": txn.ip_address,
            }

            risk_score, risk_level, risk_factors = self.model.predict(transaction)
            recommendation = self._get_recommendation(risk_level)

            yield fraud_pb2.FraudCheckResponse(
                transaction_id=txn.transaction_id,
                is_fraudulent=risk_score >= 0.7,
                risk_score=risk_score,
                risk_level=risk_level,
                risk_factors=risk_factors,
                recommendation=recommendation,
                model_version=self.model.model_version,
            )

    def GetModelInfo(self, request, context):
        """Return metadata about the currently loaded ML model."""
        info = self.model.get_model_info()

        return fraud_pb2.ModelInfoResponse(
            model_name=info["model_name"],
            model_version=info["model_version"],
            last_trained=info["last_trained"],
            accuracy=info["accuracy"],
            precision=info["precision"],
            recall=info["recall"],
            total_predictions=info["total_predictions"],
        )

    def _get_recommendation(self, risk_level):
        """Map risk level to an action recommendation."""
        recommendations = {
            "LOW": "ALLOW",
            "MEDIUM": "ALLOW",
            "HIGH": "REVIEW",
            "CRITICAL": "BLOCK",
        }
        return recommendations.get(risk_level, "REVIEW")


def serve():
    """Start the gRPC server for the fraud detection service."""
    port = os.environ.get("FRAUD_SERVICE_PORT", "50052")

    # Create gRPC server with thread pool for concurrent request handling
    server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))
    fraud_pb2_grpc.add_FraudDetectionServiceServicer_to_server(
        FraudDetectionServicer(), server
    )

    server.add_insecure_port(f"[::]:{port}")
    server.start()

    logger.info(f"Python Fraud Detection ML Service started on port {port}")
    logger.info("Accepting gRPC connections for transaction fraud analysis")

    try:
        server.wait_for_termination()
    except KeyboardInterrupt:
        logger.info("Shutting down fraud detection service...")
        server.stop(grace=5)


if __name__ == "__main__":
    serve()
