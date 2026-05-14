"""
Unit tests for the LLM Classifier.
Uses mocks to avoid actual OpenAI API calls.
"""

import json
import os
from unittest.mock import MagicMock, patch

import pytest

from agents.classification_agent.llm_classifier import LLMClassifier
from shared.models import InputSource, RFQDocument, StructuredFields


def make_doc(raw_text: str = "Test RFQ text", rfq_id: str = "TEST-LLM-001") -> RFQDocument:
    """Helper to create a test RFQDocument."""
    return RFQDocument(
        rfq_id=rfq_id,
        source=InputSource.PDF,
        raw_text=raw_text,
        cleaned_text=raw_text,
        structured_fields=StructuredFields(
            sender_email="test@example.com",
            subject="Test RFQ",
            company_name="TestCo",
            product_keywords=["steel", "metal"],
        ),
        extracted_entities={"companies": ["TestCo Inc."], "quantities": ["500"]},
    )


class TestLLMClassifierInit:
    """Tests for LLMClassifier initialization and config loading."""

    def test_default_model(self):
        """Default model is gpt-4o."""
        classifier = LLMClassifier()
        assert classifier.model == "gpt-4o"

    def test_custom_model(self):
        """Custom model can be specified."""
        classifier = LLMClassifier(model="gpt-3.5-turbo")
        assert classifier.model == "gpt-3.5-turbo"

    def test_loads_prompts(self):
        """Prompt templates are loaded from config."""
        classifier = LLMClassifier()
        assert "classification_prompt" in classifier.prompts
        assert "validation_prompt" in classifier.prompts

    def test_loads_categories(self):
        """Category definitions are loaded from config."""
        classifier = LLMClassifier()
        assert len(classifier.categories) > 0
        assert any(c["name"] == "Manufacturing - Metals" for c in classifier.categories)

    def test_format_category_list(self):
        """Category list is formatted as readable string."""
        classifier = LLMClassifier()
        formatted = classifier._format_category_list()
        assert "Manufacturing - Metals" in formatted
        assert "IT Services" in formatted

    def test_format_metadata(self):
        """Document metadata is formatted for the prompt."""
        classifier = LLMClassifier()
        doc = make_doc()
        formatted = classifier._format_metadata(doc)
        assert "test@example.com" in formatted
        assert "TestCo" in formatted

    def test_format_metadata_empty(self):
        """Empty metadata returns fallback string."""
        classifier = LLMClassifier()
        doc = RFQDocument(rfq_id="TEST", source=InputSource.PDF, raw_text="text")
        formatted = classifier._format_metadata(doc)
        assert "No additional metadata" in formatted


class TestLLMClassifierNormalization:
    """Tests for LLM response normalization."""

    def test_normalize_categories(self):
        """Categories list is normalized to correct format."""
        classifier = LLMClassifier()
        response = {
            "categories": [
                {"category": "IT Services", "confidence": "0.9"},
                {"category": "Other", "confidence": 0.1},
            ],
            "primary_confidence": "0.9",
        }
        normalized = classifier._normalize_response(response)
        assert normalized["categories"][0]["confidence"] == 0.9
        assert normalized["primary_confidence"] == 0.9

    def test_normalize_boolean_fields(self):
        """Boolean fields are properly normalized."""
        classifier = LLMClassifier()
        response = {
            "requires_extraction": 1,
            "requires_human_review": 0,
            "proposed_category_correct": "true",
        }
        normalized = classifier._normalize_response(response)
        assert normalized["requires_extraction"] is True
        assert normalized["requires_human_review"] is False

    def test_normalize_empty_categories(self):
        """Empty categories list is handled."""
        classifier = LLMClassifier()
        response = {"categories": []}
        normalized = classifier._normalize_response(response)
        assert normalized["categories"] == []


class TestLLMClassifierClassify:
    """Tests for the classify() method with mocked API calls."""

    @patch("agents.classification_agent.llm_classifier.LLMClassifier._get_client")
    def test_classify_success(self, mock_get_client):
        """Successful classification returns proper result."""
        mock_client = MagicMock()
        mock_response = MagicMock()
        mock_response.choices = [MagicMock()]
        mock_response.choices[0].message.content = json.dumps({
            "categories": [{"category": "Manufacturing - Metals", "confidence": 0.95}],
            "primary_category": "Manufacturing - Metals",
            "primary_confidence": 0.95,
            "reasoning": "Contains steel and metal keywords",
            "requires_extraction": True,
            "requires_human_review": False,
            "review_reason": None,
        })
        mock_client.chat.completions.create.return_value = mock_response
        mock_get_client.return_value = mock_client

        classifier = LLMClassifier()
        doc = make_doc(raw_text="Steel beams and aluminum alloy CNC machining")
        result = classifier.classify(doc)

        assert result["primary_category"] == "Manufacturing - Metals"
        assert result["primary_confidence"] == 0.95

    @patch("agents.classification_agent.llm_classifier.LLMClassifier._get_client")
    def test_classify_api_failure(self, mock_get_client):
        """API failure after all retries returns manual review result."""
        mock_client = MagicMock()
        mock_client.chat.completions.create.side_effect = Exception("API unavailable")
        mock_get_client.return_value = mock_client

        classifier = LLMClassifier()
        doc = make_doc()
        result = classifier.classify(doc)

        assert result["requires_human_review"] is True
        assert result["primary_confidence"] == 0.0

    @patch("agents.classification_agent.llm_classifier.LLMClassifier._get_client")
    def test_classify_invalid_json(self, mock_get_client):
        """Invalid JSON response triggers retry and eventual failure."""
        mock_client = MagicMock()
        mock_response = MagicMock()
        mock_response.choices = [MagicMock()]
        mock_response.choices[0].message.content = "not valid json"
        mock_client.chat.completions.create.return_value = mock_response
        mock_get_client.return_value = mock_client

        classifier = LLMClassifier()
        doc = make_doc()
        result = classifier.classify(doc)

        # All retries should fail on JSON parsing, returning manual review
        assert result["requires_human_review"] is True


class TestLLMClassifierValidate:
    """Tests for the validate() method with mocked API calls."""

    @patch("agents.classification_agent.llm_classifier.LLMClassifier._get_client")
    def test_validate_confirms_category(self, mock_get_client):
        """Validation confirms the proposed category."""
        mock_client = MagicMock()
        mock_response = MagicMock()
        mock_response.choices = [MagicMock()]
        mock_response.choices[0].message.content = json.dumps({
            "categories": [{"category": "Manufacturing - Metals", "confidence": 0.92}],
            "primary_category": "Manufacturing - Metals",
            "primary_confidence": 0.92,
            "proposed_category_correct": True,
            "reasoning": "Confirmed metals classification",
            "requires_extraction": True,
            "requires_human_review": False,
            "review_reason": None,
        })
        mock_client.chat.completions.create.return_value = mock_response
        mock_get_client.return_value = mock_client

        classifier = LLMClassifier()
        doc = make_doc()
        result = classifier.validate(doc, "Manufacturing - Metals", 0.80)

        assert result["proposed_category_correct"] is True
        assert result["primary_confidence"] == 0.92

    @patch("agents.classification_agent.llm_classifier.LLMClassifier._get_client")
    def test_validate_corrects_category(self, mock_get_client):
        """Validation corrects the proposed category."""
        mock_client = MagicMock()
        mock_response = MagicMock()
        mock_response.choices = [MagicMock()]
        mock_response.choices[0].message.content = json.dumps({
            "categories": [{"category": "IT Services", "confidence": 0.88}],
            "primary_category": "IT Services",
            "primary_confidence": 0.88,
            "proposed_category_correct": False,
            "reasoning": "This is actually IT services, not metals",
            "requires_extraction": True,
            "requires_human_review": False,
            "review_reason": None,
        })
        mock_client.chat.completions.create.return_value = mock_response
        mock_get_client.return_value = mock_client

        classifier = LLMClassifier()
        doc = make_doc()
        result = classifier.validate(doc, "Manufacturing - Metals", 0.80)

        assert result["proposed_category_correct"] is False
        assert result["primary_category"] == "IT Services"

    @patch("agents.classification_agent.llm_classifier.LLMClassifier._get_client")
    def test_validate_api_failure_fallback(self, mock_get_client):
        """Validation API failure falls back to rule classification."""
        mock_client = MagicMock()
        mock_client.chat.completions.create.side_effect = Exception("API unavailable")
        mock_get_client.return_value = mock_client

        classifier = LLMClassifier()
        doc = make_doc()
        result = classifier.validate(doc, "Manufacturing - Metals", 0.80)

        # Should fallback to using the rule's classification
        assert result["primary_category"] == "Manufacturing - Metals"
        assert result["requires_human_review"] is True


class TestLLMClassifierNoAPIKey:
    """Tests for behavior when OPENAI_API_KEY is not set."""

    def test_get_client_no_key(self):
        """Attempting to get client without API key raises ValueError."""
        # Temporarily unset the key
        old_key = os.environ.pop("OPENAI_API_KEY", None)
        try:
            classifier = LLMClassifier()
            classifier._client = None  # Reset any cached client
            with pytest.raises(ValueError, match="OPENAI_API_KEY"):
                classifier._get_client()
        finally:
            if old_key:
                os.environ["OPENAI_API_KEY"] = old_key
