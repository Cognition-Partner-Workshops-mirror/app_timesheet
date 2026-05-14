"""
Validation script for the RFQ Classification Agent.
Runs classification on test data and compares results to expected outcomes.

Usage:
    python validate.py [--test-data ./tests/test_data] [--expected-results ./tests/test_data/expected.json]
"""

import argparse
import json
import os
import sys
import time
from pathlib import Path

# Add project root to path for imports
sys.path.insert(0, os.path.dirname(__file__))

from agents.classification_agent.ingestion import EmailHandler, FormHandler, PDFHandler
from agents.classification_agent.orchestrator import ClassificationOrchestrator
from shared.utils.logger import setup_logger

logger = setup_logger("validate", log_format="text")


def load_expected_results(expected_path: str) -> dict:
    """Load expected classification results from JSON file."""
    with open(expected_path, "r") as f:
        return json.load(f)


def classify_test_file(
    file_path: str,
    input_type: str,
    orchestrator: ClassificationOrchestrator,
    pdf_handler: PDFHandler,
    email_handler: EmailHandler,
    form_handler: FormHandler,
) -> dict:
    """
    Classify a single test file through the full pipeline.

    Returns:
        Dictionary with classification result, timing, and status
    """
    start_time = time.time()
    filename = Path(file_path).name

    try:
        # Ingest based on input type
        if input_type == "pdf":
            doc = pdf_handler.ingest(file_path)
        elif input_type == "email":
            doc = email_handler.ingest(file_path)
        elif input_type == "form":
            doc = form_handler.ingest(file_path)
        else:
            return {"status": "error", "error": f"Unknown input type: {input_type}"}

        # Classify using the orchestrator
        result = orchestrator.classify(doc)

        elapsed = time.time() - start_time

        return {
            "status": "success",
            "filename": filename,
            "classified_category": result.primary_category,
            "confidence": result.confidence,
            "method": result.method.value,
            "reasoning": result.reasoning,
            "requires_manual_review": result.requires_manual_review,
            "elapsed_seconds": round(elapsed, 3),
        }
    except Exception as e:
        elapsed = time.time() - start_time
        return {
            "status": "error",
            "filename": filename,
            "error": str(e),
            "elapsed_seconds": round(elapsed, 3),
        }


def resolve_file_path(test_data_dir: str, filename: str, input_type: str) -> str:
    """Resolve the full file path for a test file based on its input type."""
    if input_type == "pdf":
        return os.path.join(test_data_dir, "pdfs", filename)
    elif input_type == "email":
        return os.path.join(test_data_dir, "emails", filename)
    elif input_type == "form":
        return os.path.join(test_data_dir, "forms", filename)
    return os.path.join(test_data_dir, filename)


def run_validation(test_data_dir: str, expected_path: str) -> dict:
    """
    Run classification on all test samples and compare to expected results.

    Returns:
        Validation report dictionary with overall pass/fail and per-file results
    """
    logger.info(f"Loading expected results from: {expected_path}")
    expected = load_expected_results(expected_path)

    # Initialize components
    orchestrator = ClassificationOrchestrator()
    pdf_handler = PDFHandler(ocr_provider="pytesseract")
    email_handler = EmailHandler(ocr_provider="pytesseract")
    form_handler = FormHandler()

    total = len(expected)
    correct = 0
    processed = 0
    errors = 0
    results = []
    total_time = 0

    logger.info(f"Running validation on {total} test samples...")

    for filename, expected_info in expected.items():
        expected_category = expected_info["expected_category"]
        input_type = expected_info["input_type"]
        min_confidence = expected_info.get("min_confidence", 0.75)

        file_path = resolve_file_path(test_data_dir, filename, input_type)

        if not os.path.exists(file_path):
            logger.warning(f"Test file not found: {file_path}")
            results.append({
                "filename": filename,
                "status": "skipped",
                "reason": "File not found",
            })
            continue

        # Classify the file
        result = classify_test_file(
            file_path, input_type, orchestrator, pdf_handler, email_handler, form_handler
        )

        processed += 1
        total_time += result.get("elapsed_seconds", 0)

        if result["status"] == "error":
            errors += 1
            result["match"] = False
            result["expected_category"] = expected_category
            results.append(result)
            logger.error(f"  FAIL [{filename}]: Error - {result.get('error', 'Unknown')}")
            continue

        # Check if classification matches expected
        classified = result["classified_category"]
        confidence = result["confidence"]
        is_correct = (
            classified == expected_category
            and confidence >= min_confidence
        )

        if is_correct:
            correct += 1

        result["match"] = is_correct
        result["expected_category"] = expected_category
        result["min_confidence"] = min_confidence
        results.append(result)

        status_icon = "PASS" if is_correct else "FAIL"
        logger.info(
            f"  {status_icon} [{filename}]: "
            f"Expected='{expected_category}', Got='{classified}' "
            f"(conf: {confidence:.2f}, method: {result['method']}, "
            f"time: {result['elapsed_seconds']:.3f}s)"
        )

    # Calculate accuracy
    accuracy = correct / processed if processed > 0 else 0
    passed = accuracy >= 0.80  # 80% accuracy threshold

    report = {
        "overall_status": "SUCCESS" if passed else "FAILURE",
        "total_samples": total,
        "processed": processed,
        "correct": correct,
        "errors": errors,
        "accuracy": round(accuracy, 4),
        "accuracy_threshold": 0.80,
        "passed": passed,
        "total_time_seconds": round(total_time, 3),
        "avg_time_per_sample": round(total_time / processed, 3) if processed > 0 else 0,
        "results": results,
    }

    return report


def main():
    """Main entry point for the validation script."""
    parser = argparse.ArgumentParser(description="Validate RFQ Classification Agent")
    parser.add_argument(
        "--test-data",
        default="./tests/test_data",
        help="Path to test data directory",
    )
    parser.add_argument(
        "--expected-results",
        default="./tests/test_data/expected.json",
        help="Path to expected results JSON file",
    )
    parser.add_argument(
        "--output",
        default=None,
        help="Optional path to write the validation report JSON",
    )
    args = parser.parse_args()

    print("=" * 60)
    print("RFQ Classification Agent - Validation")
    print("=" * 60)

    report = run_validation(args.test_data, args.expected_results)

    print("\n" + "=" * 60)
    print(f"Status: {report['overall_status']}")
    print(f"Accuracy: {report['accuracy'] * 100:.1f}% ({report['correct']}/{report['processed']})")
    print(f"Errors: {report['errors']}")
    print(f"Total time: {report['total_time_seconds']:.3f}s")
    print(f"Avg per sample: {report['avg_time_per_sample']:.3f}s")
    print("=" * 60)

    # Write report to file if requested
    if args.output:
        with open(args.output, "w") as f:
            json.dump(report, f, indent=2)
        print(f"\nReport written to: {args.output}")

    # Exit with appropriate code
    sys.exit(0 if report["passed"] else 1)


if __name__ == "__main__":
    main()
