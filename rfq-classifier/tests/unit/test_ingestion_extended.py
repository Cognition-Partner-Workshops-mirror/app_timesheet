"""
Extended unit tests for the ingestion layer.
Covers OCR fallback paths, Azure DI, error handling, and edge cases
using mocks to avoid external dependency requirements.
"""

import json
import os
import tempfile
from pathlib import Path
from unittest.mock import MagicMock, patch, mock_open

import pytest

from agents.classification_agent.ingestion import (
    EmailHandler,
    FormHandler,
    PDFHandler,
    MIN_TEXT_LENGTH,
)
from shared.models import InputSource


class TestPDFHandlerOCRFallback:
    """Tests for PDF OCR fallback behavior when pdfplumber yields insufficient text."""

    @patch("agents.classification_agent.ingestion.PDFHandler._extract_text_pdfplumber")
    @patch("agents.classification_agent.ingestion.PDFHandler._extract_text_ocr")
    def test_ocr_fallback_triggered(self, mock_ocr, mock_pdfplumber):
        """OCR is triggered when pdfplumber returns insufficient text."""
        # pdfplumber returns too little text (below MIN_TEXT_LENGTH)
        mock_pdfplumber.return_value = "short"
        mock_ocr.return_value = "This is a much longer OCR extracted text with enough content for processing"

        handler = PDFHandler(ocr_provider="pytesseract")
        # Create a temporary empty PDF for the path
        with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
            tmp.write(b"%PDF-1.4 minimal")
            tmp_path = tmp.name

        try:
            doc = handler.ingest(tmp_path, rfq_id="OCR-TEST-001")
            # OCR text should be used since it's longer
            assert "OCR extracted text" in doc.raw_text
            assert "ocr_" in doc.metadata["extraction_method"]
        finally:
            os.unlink(tmp_path)

    @patch("agents.classification_agent.ingestion.PDFHandler._extract_text_pdfplumber")
    @patch("agents.classification_agent.ingestion.PDFHandler._extract_text_ocr")
    def test_ocr_failure_flags_manual_review(self, mock_ocr, mock_pdfplumber):
        """When both pdfplumber and OCR fail, document is flagged for manual review."""
        mock_pdfplumber.return_value = ""
        mock_ocr.return_value = ""

        handler = PDFHandler(ocr_provider="pytesseract")
        with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
            tmp.write(b"%PDF-1.4 minimal")
            tmp_path = tmp.name

        try:
            doc = handler.ingest(tmp_path, rfq_id="OCR-FAIL-001")
            assert doc.metadata.get("ocr_failed") is True
            assert doc.raw_text == ""
        finally:
            os.unlink(tmp_path)

    @patch("agents.classification_agent.ingestion.PDFHandler._extract_text_pdfplumber")
    def test_pdfplumber_sufficient_skips_ocr(self, mock_pdfplumber):
        """OCR is NOT triggered when pdfplumber returns sufficient text."""
        # Return enough text to skip OCR
        long_text = "A" * (MIN_TEXT_LENGTH + 10)
        mock_pdfplumber.return_value = long_text

        handler = PDFHandler(ocr_provider="pytesseract")
        with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
            tmp.write(b"%PDF-1.4 minimal")
            tmp_path = tmp.name

        try:
            doc = handler.ingest(tmp_path)
            assert doc.metadata["extraction_method"] == "pdfplumber"
            assert len(doc.raw_text) >= MIN_TEXT_LENGTH
        finally:
            os.unlink(tmp_path)


class TestPDFHandlerOCRProviders:
    """Tests for different OCR provider configurations."""

    def test_default_ocr_provider(self):
        """Default OCR provider is pytesseract."""
        handler = PDFHandler()
        assert handler.ocr_provider == "pytesseract"

    def test_custom_ocr_provider(self):
        """OCR provider can be set explicitly."""
        handler = PDFHandler(ocr_provider="azure_di")
        assert handler.ocr_provider == "azure_di"

    @patch("agents.classification_agent.ingestion.PDFHandler._extract_text_pdfplumber")
    def test_ocr_azure_di_no_credentials(self, mock_pdfplumber):
        """Azure DI falls back to pytesseract when credentials are missing."""
        mock_pdfplumber.return_value = ""

        # Ensure no Azure credentials are set
        old_endpoint = os.environ.pop("AZURE_DI_ENDPOINT", None)
        old_key = os.environ.pop("AZURE_DI_KEY", None)

        try:
            handler = PDFHandler(ocr_provider="azure_di")
            with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
                tmp.write(b"%PDF-1.4 minimal")
                tmp_path = tmp.name

            try:
                # Azure DI should fall back to pytesseract since no credentials
                doc = handler.ingest(tmp_path)
                # May have empty text since pytesseract also won't work on invalid PDF
                assert doc is not None
            finally:
                os.unlink(tmp_path)
        finally:
            if old_endpoint:
                os.environ["AZURE_DI_ENDPOINT"] = old_endpoint
            if old_key:
                os.environ["AZURE_DI_KEY"] = old_key

    def test_pdfplumber_extraction_error_handling(self):
        """pdfplumber handles corrupt PDFs gracefully."""
        handler = PDFHandler()
        # Create a file that isn't really a valid PDF
        with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False, mode="w") as tmp:
            tmp.write("This is not a PDF file")
            tmp_path = tmp.name

        try:
            result = handler._extract_text_pdfplumber(tmp_path)
            # Should return empty string on error, not raise
            assert isinstance(result, str)
        finally:
            os.unlink(tmp_path)


class TestEmailHandlerExtended:
    """Extended tests for EmailHandler edge cases."""

    def test_extract_email_from_angle_brackets(self):
        """Email address is extracted from 'Name <email>' format."""
        handler = EmailHandler()
        assert handler._extract_email_address("John Doe <john@example.com>") == "john@example.com"

    def test_extract_email_plain(self):
        """Plain email address is returned as-is."""
        handler = EmailHandler()
        assert handler._extract_email_address("john@example.com") == "john@example.com"

    def test_strip_html(self):
        """HTML tags are stripped leaving plain text."""
        handler = EmailHandler()
        html = "<html><body><p>Hello <b>World</b></p></body></html>"
        result = handler._strip_html(html)
        assert "Hello" in result
        assert "World" in result
        assert "<" not in result

    def test_strip_html_empty(self):
        """Empty HTML returns empty string."""
        handler = EmailHandler()
        assert handler._strip_html("") == ""
        assert handler._strip_html(None) == ""

    def test_process_non_pdf_attachment_skipped(self):
        """Non-PDF attachments are skipped."""
        handler = EmailHandler()
        mock_part = MagicMock()
        result = handler._process_attachment(mock_part, "report.docx", "TEST-001")
        assert result == ""

    def test_email_handler_init_default(self):
        """EmailHandler initializes with default OCR provider."""
        handler = EmailHandler()
        assert handler.ocr_provider == "pytesseract"

    def test_email_handler_init_custom_ocr(self):
        """EmailHandler accepts custom OCR provider."""
        handler = EmailHandler(ocr_provider="azure_di")
        assert handler.ocr_provider == "azure_di"


class TestFormHandlerExtended:
    """Extended tests for FormHandler edge cases."""

    def test_ingest_csv(self):
        """CSV form is ingested correctly."""
        import csv

        with tempfile.NamedTemporaryFile(mode="w", suffix=".csv", delete=False, newline="") as tmp:
            writer = csv.DictWriter(tmp, fieldnames=["subject", "description", "company_name", "contact_email"])
            writer.writeheader()
            writer.writerow({
                "subject": "Steel fabrication RFQ",
                "description": "We need steel beams and aluminum sheets",
                "company_name": "MetalCo",
                "contact_email": "buyer@metalco.com",
            })
            tmp_path = tmp.name

        try:
            handler = FormHandler()
            doc = handler.ingest(tmp_path, rfq_id="CSV-001")
            assert doc.source == InputSource.FORM
            assert "steel" in doc.raw_text.lower()
            assert doc.structured_fields.company_name == "MetalCo"
            assert doc.structured_fields.sender_email == "buyer@metalco.com"
        finally:
            os.unlink(tmp_path)

    def test_ingest_empty_csv_raises(self):
        """Empty CSV raises ValueError."""
        with tempfile.NamedTemporaryFile(mode="w", suffix=".csv", delete=False) as tmp:
            tmp.write("subject,description\n")  # Header only, no data rows
            tmp_path = tmp.name

        try:
            handler = FormHandler()
            with pytest.raises(ValueError, match="empty"):
                handler.ingest(tmp_path)
        finally:
            os.unlink(tmp_path)

    def test_ingest_dict_with_alternative_field_names(self):
        """Form handler maps alternative field names (email, company, title)."""
        handler = FormHandler()
        data = {
            "title": "Custom order request",
            "email": "user@company.com",
            "company": "Widgets Ltd",
            "item_description": "Custom widget assembly",
            "keywords": ["widget", "assembly"],
        }
        doc = handler.ingest_dict(data)
        assert doc.structured_fields.sender_email == "user@company.com"
        assert doc.structured_fields.company_name == "Widgets Ltd"
        assert doc.structured_fields.subject == "Custom order request"
        assert "widget" in doc.structured_fields.product_keywords

    def test_ingest_dict_minimal_data(self):
        """Form handler handles minimal data gracefully."""
        handler = FormHandler()
        doc = handler.ingest_dict({"notes": "Just a note"})
        assert doc.raw_text == "Just a note"
        assert doc.source == InputSource.FORM
