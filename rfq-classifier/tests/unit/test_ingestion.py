"""
Unit tests for the ingestion layer.
Tests PDF, email, and form handlers individually.
"""

import json
import os
from pathlib import Path

import pytest

from agents.classification_agent.ingestion import EmailHandler, FormHandler, PDFHandler
from shared.models import InputSource


# Test data directory
TEST_DATA_DIR = Path(__file__).parent.parent / "test_data"


class TestPDFHandler:
    """Tests for the PDFHandler class."""

    def setup_method(self):
        self.handler = PDFHandler(ocr_provider="pytesseract")

    def test_ingest_text_pdf(self):
        """Text-based PDF is ingested and text is extracted."""
        pdf_path = TEST_DATA_DIR / "pdfs" / "rfq_001_metals.pdf"
        if not pdf_path.exists():
            pytest.skip("Test data not generated")
        doc = self.handler.ingest(str(pdf_path), rfq_id="TEST-PDF-001")
        assert doc.rfq_id == "TEST-PDF-001"
        assert doc.source == InputSource.PDF
        assert len(doc.raw_text) > 100
        assert "steel" in doc.raw_text.lower() or "metal" in doc.raw_text.lower()

    def test_ingest_it_services_pdf(self):
        """IT Services PDF is ingested with correct text content."""
        pdf_path = TEST_DATA_DIR / "pdfs" / "rfq_002_it_services.pdf"
        if not pdf_path.exists():
            pytest.skip("Test data not generated")
        doc = self.handler.ingest(str(pdf_path))
        assert doc.source == InputSource.PDF
        assert "cloud" in doc.raw_text.lower() or "software" in doc.raw_text.lower()

    def test_ingest_sets_metadata(self):
        """PDF ingestion populates metadata correctly."""
        pdf_path = TEST_DATA_DIR / "pdfs" / "rfq_001_metals.pdf"
        if not pdf_path.exists():
            pytest.skip("Test data not generated")
        doc = self.handler.ingest(str(pdf_path))
        assert "file_name" in doc.metadata
        assert "extraction_method" in doc.metadata
        assert doc.metadata["extraction_method"] == "pdfplumber"

    def test_ingest_auto_generates_id(self):
        """RFQ ID is auto-generated when not provided."""
        pdf_path = TEST_DATA_DIR / "pdfs" / "rfq_001_metals.pdf"
        if not pdf_path.exists():
            pytest.skip("Test data not generated")
        doc = self.handler.ingest(str(pdf_path))
        assert doc.rfq_id.startswith("PDF-")

    def test_ingest_attachment_names(self):
        """PDF filename is recorded in structured_fields.attachment_names."""
        pdf_path = TEST_DATA_DIR / "pdfs" / "rfq_001_metals.pdf"
        if not pdf_path.exists():
            pytest.skip("Test data not generated")
        doc = self.handler.ingest(str(pdf_path))
        assert "rfq_001_metals.pdf" in doc.structured_fields.attachment_names


class TestEmailHandler:
    """Tests for the EmailHandler class."""

    def setup_method(self):
        self.handler = EmailHandler(ocr_provider="pytesseract")

    def test_ingest_email(self):
        """Email (.eml) is ingested with body text extracted."""
        eml_path = TEST_DATA_DIR / "emails" / "rfq_006_electronics.eml"
        if not eml_path.exists():
            pytest.skip("Test data not generated")
        doc = self.handler.ingest(str(eml_path), rfq_id="TEST-EMAIL-001")
        assert doc.rfq_id == "TEST-EMAIL-001"
        assert doc.source == InputSource.EMAIL
        assert len(doc.raw_text) > 100
        assert "pcb" in doc.raw_text.lower() or "circuit" in doc.raw_text.lower()

    def test_ingest_extracts_sender(self):
        """Sender email is correctly extracted from headers."""
        eml_path = TEST_DATA_DIR / "emails" / "rfq_006_electronics.eml"
        if not eml_path.exists():
            pytest.skip("Test data not generated")
        doc = self.handler.ingest(str(eml_path))
        assert doc.structured_fields.sender_email == "james.wilson@circuitpro.com"

    def test_ingest_extracts_subject(self):
        """Email subject is correctly extracted."""
        eml_path = TEST_DATA_DIR / "emails" / "rfq_006_electronics.eml"
        if not eml_path.exists():
            pytest.skip("Test data not generated")
        doc = self.handler.ingest(str(eml_path))
        assert doc.structured_fields.subject
        assert "PCB" in doc.structured_fields.subject or "Electronic" in doc.structured_fields.subject

    def test_ingest_extracts_attachments(self):
        """Email attachments are listed and processed."""
        eml_path = TEST_DATA_DIR / "emails" / "rfq_006_electronics.eml"
        if not eml_path.exists():
            pytest.skip("Test data not generated")
        doc = self.handler.ingest(str(eml_path))
        assert len(doc.structured_fields.attachment_names) > 0

    def test_ingest_consulting_email(self):
        """Consulting email is ingested correctly."""
        eml_path = TEST_DATA_DIR / "emails" / "rfq_007_consulting.eml"
        if not eml_path.exists():
            pytest.skip("Test data not generated")
        doc = self.handler.ingest(str(eml_path))
        assert "consulting" in doc.raw_text.lower() or "advisory" in doc.raw_text.lower()

    def test_ingest_auto_generates_id(self):
        """RFQ ID is auto-generated when not provided."""
        eml_path = TEST_DATA_DIR / "emails" / "rfq_007_consulting.eml"
        if not eml_path.exists():
            pytest.skip("Test data not generated")
        doc = self.handler.ingest(str(eml_path))
        assert doc.rfq_id.startswith("EMAIL-")


class TestFormHandler:
    """Tests for the FormHandler class."""

    def setup_method(self):
        self.handler = FormHandler()

    def test_ingest_json_form(self):
        """JSON form is ingested and fields are mapped."""
        json_path = TEST_DATA_DIR / "forms" / "rfq_009_it_services.json"
        if not json_path.exists():
            pytest.skip("Test data not generated")
        doc = self.handler.ingest(str(json_path), rfq_id="TEST-FORM-001")
        assert doc.rfq_id == "TEST-FORM-001"
        assert doc.source == InputSource.FORM
        assert len(doc.raw_text) > 50
        assert "cloud" in doc.raw_text.lower() or "software" in doc.raw_text.lower()

    def test_ingest_json_maps_structured_fields(self):
        """JSON form fields are mapped to structured_fields."""
        json_path = TEST_DATA_DIR / "forms" / "rfq_009_it_services.json"
        if not json_path.exists():
            pytest.skip("Test data not generated")
        doc = self.handler.ingest(str(json_path))
        assert doc.structured_fields.company_name == "Acme Corp"
        assert doc.structured_fields.product_category == "IT Services"
        assert len(doc.structured_fields.product_keywords) > 0

    def test_ingest_json_maps_sender(self):
        """Contact email is mapped to sender_email."""
        json_path = TEST_DATA_DIR / "forms" / "rfq_009_it_services.json"
        if not json_path.exists():
            pytest.skip("Test data not generated")
        doc = self.handler.ingest(str(json_path))
        assert doc.structured_fields.sender_email == "it.procurement@acme-corp.com"

    def test_ingest_dict_directly(self):
        """Dictionary can be ingested directly without a file."""
        data = {
            "subject": "Test RFQ",
            "description": "We need steel beams",
            "company_name": "TestCo",
            "contact_email": "test@example.com",
            "product_category": "Manufacturing",
        }
        doc = self.handler.ingest_dict(data, rfq_id="DIRECT-001")
        assert doc.rfq_id == "DIRECT-001"
        assert "steel" in doc.raw_text.lower()
        assert doc.structured_fields.company_name == "TestCo"

    def test_ingest_form_stores_metadata(self):
        """Form fields are stored in metadata for field-based rule matching."""
        json_path = TEST_DATA_DIR / "forms" / "rfq_009_it_services.json"
        if not json_path.exists():
            pytest.skip("Test data not generated")
        doc = self.handler.ingest(str(json_path))
        assert "form_fields" in doc.metadata
        assert doc.metadata["form_fields"]["product_category"] == "IT Services"

    def test_ingest_unsupported_format(self):
        """Unsupported file format raises ValueError."""
        with pytest.raises(ValueError, match="Unsupported form file type"):
            self.handler.ingest("/tmp/test.xml")

    def test_ingest_auto_generates_id(self):
        """RFQ ID is auto-generated when not provided."""
        data = {"description": "Test"}
        doc = self.handler.ingest_dict(data)
        assert doc.rfq_id.startswith("FORM-")
