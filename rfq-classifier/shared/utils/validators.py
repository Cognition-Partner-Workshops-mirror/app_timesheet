"""
Input validation utilities for the RFQ Classification Agent.
Validates RFQ documents, configuration files, and classification results
to ensure data integrity throughout the pipeline.
"""

from shared.models import ClassificationResult, InputSource, RFQDocument


def validate_rfq_document(doc: RFQDocument) -> list[str]:
    """
    Validate an RFQ document for completeness and correctness.

    Args:
        doc: The RFQDocument to validate

    Returns:
        List of validation error messages (empty list if valid)
    """
    errors = []

    # rfq_id is required and must be non-empty
    if not doc.rfq_id:
        errors.append("rfq_id is required")

    # source must be a valid InputSource enum value
    if not isinstance(doc.source, InputSource):
        errors.append(f"Invalid source type: {doc.source}")

    # raw_text can be empty (e.g., OCR failure) but we flag it as a warning
    if not doc.raw_text or not doc.raw_text.strip():
        errors.append("raw_text is empty - classification may be unreliable")

    return errors


def validate_classification_result(result: ClassificationResult) -> list[str]:
    """
    Validate a classification result for completeness and consistency.

    Args:
        result: The ClassificationResult to validate

    Returns:
        List of validation error messages (empty list if valid)
    """
    errors = []

    # rfq_id must be present
    if not result.rfq_id:
        errors.append("rfq_id is required in classification result")

    # Confidence score must be in valid range [0, 1]
    if not 0.0 <= result.confidence <= 1.0:
        errors.append(f"confidence must be between 0.0 and 1.0, got {result.confidence}")

    # primary_category should be non-empty unless flagged for manual review
    if not result.primary_category and not result.requires_manual_review:
        errors.append("primary_category is empty but not flagged for manual review")

    # Validate each category score is in range
    for cat_score in result.categories:
        if not 0.0 <= cat_score.confidence <= 1.0:
            errors.append(
                f"Category '{cat_score.category}' has invalid confidence: {cat_score.confidence}"
            )

    return errors


def validate_config(config: dict, config_type: str) -> list[str]:
    """
    Validate a configuration dictionary based on its type.

    Args:
        config: The configuration dictionary to validate
        config_type: Type of config - 'categories', 'rules', or 'prompts'

    Returns:
        List of validation error messages (empty list if valid)
    """
    errors = []

    if config_type == "categories":
        # Categories config must have a 'categories' list
        if "categories" not in config:
            errors.append("categories config must contain 'categories' key")
        else:
            for i, cat in enumerate(config["categories"]):
                if "id" not in cat:
                    errors.append(f"Category at index {i} missing 'id'")
                if "name" not in cat:
                    errors.append(f"Category at index {i} missing 'name'")

    elif config_type == "rules":
        # Rules config must have a 'rules' list
        if "rules" not in config:
            errors.append("rules config must contain 'rules' key")
        else:
            for i, rule in enumerate(config["rules"]):
                if "rule_id" not in rule:
                    errors.append(f"Rule at index {i} missing 'rule_id'")
                if "conditions" not in rule:
                    errors.append(f"Rule at index {i} missing 'conditions'")
                if "category" not in rule:
                    errors.append(f"Rule at index {i} missing 'category'")
                if "confidence" not in rule:
                    errors.append(f"Rule at index {i} missing 'confidence'")

    elif config_type == "prompts":
        # Prompts config must have required prompt templates
        required_prompts = ["classification_prompt", "validation_prompt"]
        for prompt_key in required_prompts:
            if prompt_key not in config:
                errors.append(f"prompts config missing required key: '{prompt_key}'")

    return errors
