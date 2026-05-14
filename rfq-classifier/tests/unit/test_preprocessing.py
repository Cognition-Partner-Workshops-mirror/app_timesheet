"""
Unit tests for the preprocessing module.
Tests text cleaning, entity extraction, and document preprocessing pipeline.
"""

import pytest

from agents.classification_agent.preprocessing import (
    EntityExtractor,
    TextCleaner,
    preprocess_document,
)
from shared.models import InputSource, RFQDocument, StructuredFields


class TestTextCleaner:
    """Tests for the TextCleaner class."""

    def setup_method(self):
        """Initialize a fresh TextCleaner for each test."""
        self.cleaner = TextCleaner()

    def test_clean_empty_text(self):
        """Empty input returns empty string."""
        assert self.cleaner.clean("") == ""
        assert self.cleaner.clean(None) == ""

    def test_clean_removes_null_bytes(self):
        """Null bytes are stripped from the text."""
        text = "Hello\x00World"
        result = self.cleaner.clean(text)
        assert "\x00" not in result
        assert "Hello" in result and "World" in result

    def test_clean_normalizes_unicode_dashes(self):
        """Unicode em-dash, en-dash variants are normalized to standard hyphen."""
        text = "item\u2013price\u2014total"
        result = self.cleaner.clean(text)
        assert "\u2013" not in result
        assert "\u2014" not in result
        assert "-" in result

    def test_clean_normalizes_unicode_quotes(self):
        """Curly quotes are normalized to straight quotes."""
        text = "\u201cHello\u201d and \u2018World\u2019"
        result = self.cleaner.clean(text)
        assert '"Hello"' in result
        assert "'World'" in result

    def test_clean_normalizes_whitespace(self):
        """Multiple spaces and tabs collapse to single space."""
        text = "Hello    World\t\tTest"
        result = self.cleaner.clean(text)
        assert "Hello World Test" in result

    def test_clean_normalizes_newlines(self):
        """3+ consecutive newlines collapse to double newline."""
        text = "Para 1\n\n\n\n\nPara 2"
        result = self.cleaner.clean(text)
        assert "\n\n\n" not in result
        assert "Para 1" in result and "Para 2" in result

    def test_clean_strips_line_whitespace(self):
        """Leading/trailing whitespace on each line is stripped."""
        text = "  Hello  \n  World  "
        result = self.cleaner.clean(text)
        assert result == "Hello\nWorld"

    def test_clean_preserves_meaningful_punctuation(self):
        """Common punctuation is preserved during cleaning."""
        text = "Price: $100.00, Qty: 50 units (each)"
        result = self.cleaner.clean(text)
        assert "$" in result
        assert "," in result
        assert "(" in result

    def test_clean_for_matching_lowercases(self):
        """Matching preparation lowercases the text."""
        text = "STEEL BEAMS and CNC Machining"
        result = self.cleaner.clean_for_matching(text)
        assert result == "steel beams and cnc machining"

    def test_clean_for_matching_removes_punctuation(self):
        """Matching preparation removes punctuation and collapses spaces."""
        text = "Price: $100.00, Qty: 50"
        result = self.cleaner.clean_for_matching(text)
        # Punctuation replaced with spaces, then collapsed
        assert "price" in result
        assert "100" in result
        assert "$" not in result

    def test_clean_for_matching_empty(self):
        """Matching on empty text returns empty string."""
        assert self.cleaner.clean_for_matching("") == ""


class TestEntityExtractor:
    """Tests for the EntityExtractor class."""

    def setup_method(self):
        """Initialize a fresh EntityExtractor for each test."""
        self.extractor = EntityExtractor()

    def test_extract_emails(self):
        """Email addresses are correctly extracted from text."""
        text = "Contact us at john@example.com or sales@widgets.io"
        entities = self.extractor.extract(text)
        assert "emails" in entities
        assert "john@example.com" in entities["emails"]
        assert "sales@widgets.io" in entities["emails"]

    def test_extract_no_emails(self):
        """No emails key when no email addresses found."""
        entities = self.extractor.extract("No email here")
        assert "emails" not in entities

    def test_extract_quantities(self):
        """Quantities with units are extracted."""
        text = "We need 500 units of steel and 1,000 pieces of aluminum"
        entities = self.extractor.extract(text)
        assert "quantities" in entities
        assert len(entities["quantities"]) >= 1

    def test_extract_prices(self):
        """Prices with currency symbols are extracted."""
        text = "Unit price is $150.00 per piece, total $7,500.00"
        entities = self.extractor.extract(text)
        assert "prices" in entities
        assert len(entities["prices"]) >= 1

    def test_extract_part_numbers(self):
        """Part numbers with common prefixes are extracted."""
        text = "Part Number: ABC-12345 and MPN: XY789Z"
        entities = self.extractor.extract(text)
        assert "part_numbers" in entities

    def test_extract_dates(self):
        """Date strings in common formats are extracted."""
        text = "Delivery by 03/15/2024 or 2024-04-01"
        entities = self.extractor.extract(text)
        assert "dates" in entities
        assert len(entities["dates"]) >= 1

    def test_extract_companies(self):
        """Company names with common suffixes are extracted."""
        text = "Vendor: Acme Manufacturing Inc. and Widget Corp"
        entities = self.extractor.extract(text)
        assert "companies" in entities

    def test_extract_email_domains(self):
        """Email domains are extracted from email addresses."""
        text = "From: john@aerospace.com"
        entities = self.extractor.extract(text)
        assert "email_domains" in entities
        assert "aerospace.com" in entities["email_domains"]

    def test_extract_empty_text(self):
        """Empty text returns empty dict."""
        assert self.extractor.extract("") == {}
        assert self.extractor.extract(None) == {}

    def test_extract_sender_domain(self):
        """Sender domain is correctly extracted from email address."""
        assert self.extractor.extract_sender_domain("user@example.com") == "example.com"
        assert self.extractor.extract_sender_domain("user@SUB.Example.COM") == "sub.example.com"

    def test_extract_sender_domain_none(self):
        """None/empty sender email returns None."""
        assert self.extractor.extract_sender_domain(None) is None
        assert self.extractor.extract_sender_domain("") is None
        assert self.extractor.extract_sender_domain("no-at-sign") is None


class TestPreprocessDocument:
    """Tests for the preprocess_document function."""

    def test_preprocess_populates_cleaned_text(self):
        """Preprocessing populates the cleaned_text field."""
        doc = RFQDocument(
            rfq_id="TEST-001",
            source=InputSource.PDF,
            raw_text="  Steel  beams   and  CNC  machining  ",
        )
        result = preprocess_document(doc)
        assert result.cleaned_text
        assert len(result.cleaned_text) <= len(doc.raw_text)

    def test_preprocess_populates_entities(self):
        """Preprocessing extracts entities from the text."""
        doc = RFQDocument(
            rfq_id="TEST-002",
            source=InputSource.EMAIL,
            raw_text="Contact john@example.com for 500 units at $100.00 each",
            structured_fields=StructuredFields(sender_email="john@example.com"),
        )
        result = preprocess_document(doc)
        assert result.extracted_entities
        assert "emails" in result.extracted_entities
        assert "sender_domain" in result.extracted_entities

    def test_preprocess_empty_document(self):
        """Preprocessing handles empty documents gracefully."""
        doc = RFQDocument(
            rfq_id="TEST-003",
            source=InputSource.FORM,
            raw_text="",
        )
        result = preprocess_document(doc)
        assert result.cleaned_text == ""
        assert result.extracted_entities == {}
