"""
Unit tests for the data models module.
Tests ClassificationResult serialization and model correctness.
"""

import pytest

from shared.models import (
    CategoryScore,
    ClassificationMethod,
    ClassificationResult,
    ExtractionField,
    InputSource,
    RFQDocument,
    RuleMatch,
    StructuredFields,
)


class TestInputSource:
    """Tests for the InputSource enum."""

    def test_pdf_value(self):
        assert InputSource.PDF.value == "pdf"

    def test_email_value(self):
        assert InputSource.EMAIL.value == "email"

    def test_form_value(self):
        assert InputSource.FORM.value == "form"


class TestClassificationMethod:
    """Tests for the ClassificationMethod enum."""

    def test_all_methods_exist(self):
        """All expected classification methods are defined."""
        methods = [m.value for m in ClassificationMethod]
        assert "rule" in methods
        assert "llm" in methods
        assert "hybrid" in methods
        assert "manual_review" in methods


class TestRFQDocument:
    """Tests for the RFQDocument dataclass."""

    def test_create_minimal(self):
        """RFQDocument can be created with required fields only."""
        doc = RFQDocument(rfq_id="TEST-001", source=InputSource.PDF, raw_text="Test")
        assert doc.rfq_id == "TEST-001"
        assert doc.source == InputSource.PDF
        assert doc.raw_text == "Test"

    def test_defaults(self):
        """Default values are set correctly."""
        doc = RFQDocument(rfq_id="TEST-002", source=InputSource.EMAIL, raw_text="")
        assert doc.cleaned_text == ""
        assert doc.extracted_entities == {}
        assert doc.metadata == {}
        assert isinstance(doc.structured_fields, StructuredFields)

    def test_structured_fields_defaults(self):
        """StructuredFields defaults are correct."""
        fields = StructuredFields()
        assert fields.sender_email is None
        assert fields.subject is None
        assert fields.product_keywords == []
        assert fields.attachment_names == []


class TestClassificationResult:
    """Tests for the ClassificationResult dataclass and serialization."""

    def test_create_minimal(self):
        """ClassificationResult can be created with rfq_id only."""
        result = ClassificationResult(rfq_id="TEST-001")
        assert result.rfq_id == "TEST-001"
        assert result.confidence == 0.0
        assert result.requires_manual_review is False

    def test_to_dict_complete(self):
        """to_dict() produces a complete dictionary with all fields."""
        result = ClassificationResult(
            rfq_id="TEST-001",
            categories=[CategoryScore(category="IT Services", confidence=0.92)],
            primary_category="IT Services",
            confidence=0.92,
            method=ClassificationMethod.RULE,
            reasoning="Keyword match",
            alternative_categories=[CategoryScore(category="Other", confidence=0.10)],
            requires_manual_review=False,
            requires_extraction=True,
            email_subject="Test RFQ",
            sender_email="test@example.com",
        )
        d = result.to_dict()
        assert d["rfq_id"] == "TEST-001"
        assert d["primary_category"] == "IT Services"
        assert d["confidence"] == 0.92
        assert d["method"] == "rule"
        assert len(d["categories"]) == 1
        assert d["categories"][0]["category"] == "IT Services"
        assert d["requires_manual_review"] is False
        assert d["requires_extraction"] is True

    def test_to_dict_with_extraction_results(self):
        """to_dict() correctly serializes extraction results."""
        result = ClassificationResult(
            rfq_id="TEST-002",
            extraction_results=[
                ExtractionField(
                    vendor_name="Acme Corp",
                    unit_price="$100.00",
                    currency="USD",
                    source="email_body",
                    evidence="found in paragraph 3",
                )
            ],
        )
        d = result.to_dict()
        assert len(d["extraction_results"]) == 1
        assert d["extraction_results"][0]["vendor_name"] == "Acme Corp"
        assert d["extraction_results"][0]["source"] == "email_body"


class TestRuleMatch:
    """Tests for the RuleMatch dataclass."""

    def test_create(self):
        match = RuleMatch(
            rule_id="R001",
            rule_name="Test Rule",
            category="Manufacturing - Metals",
            confidence=0.95,
            matched_conditions=["keyword:steel", "keyword:aluminum"],
        )
        assert match.rule_id == "R001"
        assert match.confidence == 0.95
        assert len(match.matched_conditions) == 2

    def test_defaults(self):
        match = RuleMatch(rule_id="R001", rule_name="Test", category="Test", confidence=0.5)
        assert match.matched_conditions == []
