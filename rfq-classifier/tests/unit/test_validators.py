"""
Unit tests for the validators module.
Tests validation of RFQ documents, classification results, and config files.
"""

import pytest

from shared.models import (
    CategoryScore,
    ClassificationMethod,
    ClassificationResult,
    InputSource,
    RFQDocument,
)
from shared.utils.validators import (
    validate_classification_result,
    validate_config,
    validate_rfq_document,
)


class TestValidateRFQDocument:
    """Tests for validate_rfq_document."""

    def test_valid_document(self):
        """Valid document produces no errors."""
        doc = RFQDocument(rfq_id="TEST-001", source=InputSource.PDF, raw_text="Some text")
        errors = validate_rfq_document(doc)
        assert len(errors) == 0

    def test_missing_rfq_id(self):
        """Missing rfq_id produces an error."""
        doc = RFQDocument(rfq_id="", source=InputSource.PDF, raw_text="Some text")
        errors = validate_rfq_document(doc)
        assert any("rfq_id" in e for e in errors)

    def test_empty_raw_text(self):
        """Empty raw_text produces a warning error."""
        doc = RFQDocument(rfq_id="TEST-001", source=InputSource.PDF, raw_text="")
        errors = validate_rfq_document(doc)
        assert any("raw_text" in e for e in errors)

    def test_whitespace_only_text(self):
        """Whitespace-only raw_text produces a warning."""
        doc = RFQDocument(rfq_id="TEST-001", source=InputSource.PDF, raw_text="   \n  ")
        errors = validate_rfq_document(doc)
        assert any("raw_text" in e for e in errors)


class TestValidateClassificationResult:
    """Tests for validate_classification_result."""

    def test_valid_result(self):
        """Valid result produces no errors."""
        result = ClassificationResult(
            rfq_id="TEST-001",
            primary_category="IT Services",
            confidence=0.90,
        )
        errors = validate_classification_result(result)
        assert len(errors) == 0

    def test_missing_rfq_id(self):
        """Missing rfq_id produces an error."""
        result = ClassificationResult(rfq_id="", primary_category="IT Services", confidence=0.90)
        errors = validate_classification_result(result)
        assert any("rfq_id" in e for e in errors)

    def test_confidence_out_of_range_high(self):
        """Confidence > 1.0 produces an error."""
        result = ClassificationResult(rfq_id="TEST-001", primary_category="IT Services", confidence=1.5)
        errors = validate_classification_result(result)
        assert any("confidence" in e for e in errors)

    def test_confidence_out_of_range_low(self):
        """Confidence < 0.0 produces an error."""
        result = ClassificationResult(rfq_id="TEST-001", primary_category="IT Services", confidence=-0.1)
        errors = validate_classification_result(result)
        assert any("confidence" in e for e in errors)

    def test_empty_category_no_manual_review(self):
        """Empty category without manual_review flag produces an error."""
        result = ClassificationResult(
            rfq_id="TEST-001",
            primary_category="",
            confidence=0.5,
            requires_manual_review=False,
        )
        errors = validate_classification_result(result)
        assert any("primary_category" in e for e in errors)

    def test_empty_category_with_manual_review(self):
        """Empty category is OK when flagged for manual review."""
        result = ClassificationResult(
            rfq_id="TEST-001",
            primary_category="",
            confidence=0.0,
            requires_manual_review=True,
        )
        errors = validate_classification_result(result)
        assert not any("primary_category" in e for e in errors)

    def test_invalid_category_score_confidence(self):
        """Category score with invalid confidence produces an error."""
        result = ClassificationResult(
            rfq_id="TEST-001",
            primary_category="IT Services",
            confidence=0.90,
            categories=[CategoryScore(category="IT Services", confidence=1.5)],
        )
        errors = validate_classification_result(result)
        assert any("IT Services" in e and "confidence" in e for e in errors)


class TestValidateConfig:
    """Tests for validate_config."""

    def test_valid_categories_config(self):
        """Valid categories config produces no errors."""
        config = {"categories": [{"id": "it", "name": "IT Services"}]}
        errors = validate_config(config, "categories")
        assert len(errors) == 0

    def test_missing_categories_key(self):
        """Config without 'categories' key produces an error."""
        errors = validate_config({}, "categories")
        assert any("categories" in e for e in errors)

    def test_category_missing_id(self):
        """Category without 'id' produces an error."""
        config = {"categories": [{"name": "IT Services"}]}
        errors = validate_config(config, "categories")
        assert any("id" in e for e in errors)

    def test_category_missing_name(self):
        """Category without 'name' produces an error."""
        config = {"categories": [{"id": "it"}]}
        errors = validate_config(config, "categories")
        assert any("name" in e for e in errors)

    def test_valid_rules_config(self):
        """Valid rules config produces no errors."""
        config = {"rules": [{"rule_id": "R001", "conditions": {}, "category": "Test", "confidence": 0.9}]}
        errors = validate_config(config, "rules")
        assert len(errors) == 0

    def test_missing_rules_key(self):
        """Config without 'rules' key produces an error."""
        errors = validate_config({}, "rules")
        assert any("rules" in e for e in errors)

    def test_rule_missing_fields(self):
        """Rule missing required fields produces errors."""
        config = {"rules": [{"name": "Test"}]}
        errors = validate_config(config, "rules")
        assert len(errors) >= 3  # missing rule_id, conditions, category, confidence

    def test_valid_prompts_config(self):
        """Valid prompts config produces no errors."""
        config = {"classification_prompt": "...", "validation_prompt": "..."}
        errors = validate_config(config, "prompts")
        assert len(errors) == 0

    def test_missing_prompts(self):
        """Config without required prompts produces errors."""
        errors = validate_config({}, "prompts")
        assert any("classification_prompt" in e for e in errors)
        assert any("validation_prompt" in e for e in errors)
