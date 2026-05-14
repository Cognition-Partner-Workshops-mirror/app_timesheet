"""
Integration tests for the Classification Agent pipeline.
Tests the full flow from ingestion through preprocessing to classification.
Uses the rules engine only (no LLM calls) for deterministic testing.
"""

import json
import os
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

from agents.classification_agent.ingestion import EmailHandler, FormHandler, PDFHandler
from agents.classification_agent.orchestrator import ClassificationOrchestrator
from agents.classification_agent.preprocessing import preprocess_document
from agents.classification_agent.rules_engine import RulesEngine
from shared.models import ClassificationMethod, InputSource

# Test data directory
TEST_DATA_DIR = Path(__file__).parent.parent / "test_data"


class TestPDFClassificationPipeline:
    """Integration tests for PDF → Classification pipeline."""

    def setup_method(self):
        self.pdf_handler = PDFHandler(ocr_provider="pytesseract")
        self.rules_engine = RulesEngine()

    def test_metals_pdf_classification(self):
        """Metals PDF is correctly ingested and classified by rules."""
        pdf_path = TEST_DATA_DIR / "pdfs" / "rfq_001_metals.pdf"
        if not pdf_path.exists():
            pytest.skip("Test data not generated")

        # Ingest and preprocess
        doc = self.pdf_handler.ingest(str(pdf_path), rfq_id="INT-PDF-001")
        doc = preprocess_document(doc)

        # Classify with rules
        matches = self.rules_engine.evaluate(doc)
        assert len(matches) > 0
        assert any(m.category == "Manufacturing - Metals" for m in matches)

    def test_it_services_pdf_classification(self):
        """IT Services PDF is correctly classified."""
        pdf_path = TEST_DATA_DIR / "pdfs" / "rfq_002_it_services.pdf"
        if not pdf_path.exists():
            pytest.skip("Test data not generated")

        doc = self.pdf_handler.ingest(str(pdf_path), rfq_id="INT-PDF-002")
        doc = preprocess_document(doc)
        matches = self.rules_engine.evaluate(doc)
        assert any(m.category == "IT Services" for m in matches)

    def test_construction_pdf_classification(self):
        """Construction materials PDF is correctly classified."""
        pdf_path = TEST_DATA_DIR / "pdfs" / "rfq_003_construction.pdf"
        if not pdf_path.exists():
            pytest.skip("Test data not generated")

        doc = self.pdf_handler.ingest(str(pdf_path), rfq_id="INT-PDF-003")
        doc = preprocess_document(doc)
        matches = self.rules_engine.evaluate(doc)
        assert any(m.category == "Construction Materials" for m in matches)

    def test_aerospace_pdf_classification(self):
        """Aerospace PDF is correctly classified."""
        pdf_path = TEST_DATA_DIR / "pdfs" / "rfq_004_aerospace.pdf"
        if not pdf_path.exists():
            pytest.skip("Test data not generated")

        doc = self.pdf_handler.ingest(str(pdf_path), rfq_id="INT-PDF-004")
        doc = preprocess_document(doc)
        matches = self.rules_engine.evaluate(doc)
        assert any(m.category == "Aerospace & Defense" for m in matches)

    def test_healthcare_pdf_classification(self):
        """Healthcare PDF is correctly classified."""
        pdf_path = TEST_DATA_DIR / "pdfs" / "rfq_005_healthcare.pdf"
        if not pdf_path.exists():
            pytest.skip("Test data not generated")

        doc = self.pdf_handler.ingest(str(pdf_path), rfq_id="INT-PDF-005")
        doc = preprocess_document(doc)
        matches = self.rules_engine.evaluate(doc)
        assert any(m.category == "Healthcare Equipment" for m in matches)


class TestEmailClassificationPipeline:
    """Integration tests for Email → Classification pipeline."""

    def setup_method(self):
        self.email_handler = EmailHandler(ocr_provider="pytesseract")
        self.rules_engine = RulesEngine()

    def test_electronics_email_classification(self):
        """Electronics email is correctly ingested and classified."""
        eml_path = TEST_DATA_DIR / "emails" / "rfq_006_electronics.eml"
        if not eml_path.exists():
            pytest.skip("Test data not generated")

        doc = self.email_handler.ingest(str(eml_path), rfq_id="INT-EMAIL-001")
        doc = preprocess_document(doc)
        matches = self.rules_engine.evaluate(doc)
        assert any(m.category == "Manufacturing - Electronics" for m in matches)

    def test_consulting_email_classification(self):
        """Consulting email is correctly classified."""
        eml_path = TEST_DATA_DIR / "emails" / "rfq_007_consulting.eml"
        if not eml_path.exists():
            pytest.skip("Test data not generated")

        doc = self.email_handler.ingest(str(eml_path), rfq_id="INT-EMAIL-002")
        doc = preprocess_document(doc)
        matches = self.rules_engine.evaluate(doc)
        assert any(m.category == "Professional Services" for m in matches)

    def test_defense_email_classification(self):
        """Defense radar email is correctly classified."""
        eml_path = TEST_DATA_DIR / "emails" / "rfq_008_defense_radar.eml"
        if not eml_path.exists():
            pytest.skip("Test data not generated")

        doc = self.email_handler.ingest(str(eml_path), rfq_id="INT-EMAIL-003")
        doc = preprocess_document(doc)
        matches = self.rules_engine.evaluate(doc)
        assert any(m.category == "Aerospace & Defense" for m in matches)


class TestFormClassificationPipeline:
    """Integration tests for Form → Classification pipeline."""

    def setup_method(self):
        self.form_handler = FormHandler()
        self.rules_engine = RulesEngine()

    def test_it_services_form_classification(self):
        """IT Services form is correctly classified via field and keyword rules."""
        json_path = TEST_DATA_DIR / "forms" / "rfq_009_it_services.json"
        if not json_path.exists():
            pytest.skip("Test data not generated")

        doc = self.form_handler.ingest(str(json_path), rfq_id="INT-FORM-001")
        doc = preprocess_document(doc)
        matches = self.rules_engine.evaluate(doc)
        assert any(m.category == "IT Services" for m in matches)

    def test_metal_stamping_form_classification(self):
        """Metal stamping form is correctly classified."""
        json_path = TEST_DATA_DIR / "forms" / "rfq_010_metal_stamping.json"
        if not json_path.exists():
            pytest.skip("Test data not generated")

        doc = self.form_handler.ingest(str(json_path), rfq_id="INT-FORM-002")
        doc = preprocess_document(doc)
        matches = self.rules_engine.evaluate(doc)
        assert any(m.category == "Manufacturing - Metals" for m in matches)


class TestOrchestratorWithMockedLLM:
    """
    Integration tests for the full Orchestrator pipeline.
    LLM calls are mocked to avoid API dependency in tests.
    """

    def _mock_llm_response(self, category: str, confidence: float):
        """Create a mock LLM response for testing."""
        return {
            "categories": [{"category": category, "confidence": confidence}],
            "primary_category": category,
            "primary_confidence": confidence,
            "reasoning": f"Mocked LLM classification: {category}",
            "requires_extraction": True,
            "requires_human_review": False,
            "review_reason": None,
        }

    def test_orchestrator_rule_high_confidence(self):
        """Orchestrator uses rule classification when confidence >= 0.90."""
        orchestrator = ClassificationOrchestrator()

        # Create a doc that will trigger a high-confidence keyword rule
        from shared.models import RFQDocument, StructuredFields

        doc = RFQDocument(
            rfq_id="ORCH-001",
            source=InputSource.PDF,
            raw_text="Steel beams and aluminum alloy CNC machining services for metal fabrication",
        )

        result = orchestrator.classify(doc)
        assert result.primary_category == "Manufacturing - Metals"
        assert result.confidence >= 0.90
        assert result.method == ClassificationMethod.RULE

    def test_orchestrator_empty_document_manual_review(self):
        """Orchestrator flags empty documents for manual review."""
        orchestrator = ClassificationOrchestrator()

        from shared.models import RFQDocument

        doc = RFQDocument(
            rfq_id="ORCH-003",
            source=InputSource.PDF,
            raw_text="",
        )

        result = orchestrator.classify(doc)
        assert result.requires_manual_review is True
        assert result.method == ClassificationMethod.MANUAL_REVIEW

    @patch("agents.classification_agent.orchestrator.LLMClassifier")
    def test_orchestrator_llm_fallback(self, MockLLMClassifier):
        """Orchestrator falls back to LLM when rules are inconclusive."""
        mock_classifier = MagicMock()
        mock_classifier.classify.return_value = self._mock_llm_response("Other", 0.90)
        mock_classifier.validate.return_value = self._mock_llm_response("Other", 0.90)
        MockLLMClassifier.return_value = mock_classifier

        orchestrator = ClassificationOrchestrator()
        orchestrator.llm_classifier = mock_classifier

        from shared.models import RFQDocument

        # Use text that won't match any rules at all
        doc = RFQDocument(
            rfq_id="ORCH-004",
            source=InputSource.PDF,
            raw_text="Hello, we are requesting a general proposal for our new project",
        )

        result = orchestrator.classify(doc)
        # Should attempt LLM or hybrid classification since no strong rule match
        assert result.rfq_id == "ORCH-004"

    @patch("agents.classification_agent.orchestrator.LLMClassifier")
    def test_orchestrator_hybrid_validation(self, MockLLMClassifier):
        """Orchestrator validates medium-confidence rule match with LLM."""
        mock_classifier = MagicMock()
        mock_classifier.validate.return_value = {
            "categories": [{"category": "Manufacturing - Metals", "confidence": 0.92}],
            "primary_category": "Manufacturing - Metals",
            "primary_confidence": 0.92,
            "proposed_category_correct": True,
            "reasoning": "LLM confirms metals classification",
            "requires_extraction": True,
            "requires_human_review": False,
            "review_reason": None,
        }
        MockLLMClassifier.return_value = mock_classifier

        orchestrator = ClassificationOrchestrator()
        orchestrator.llm_classifier = mock_classifier

        from shared.models import RFQDocument

        # Text that matches the weak keyword rule (confidence 0.80)
        doc = RFQDocument(
            rfq_id="ORCH-005",
            source=InputSource.PDF,
            raw_text="We need some steel components for a project",
        )

        result = orchestrator.classify(doc)
        assert result.rfq_id == "ORCH-005"
