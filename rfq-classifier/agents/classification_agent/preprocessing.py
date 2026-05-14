"""
Preprocessing module for the Classification Agent.
Handles text cleaning, normalization, and entity extraction
to prepare RFQ documents for rule matching and LLM classification.
"""

import re
from typing import Optional

from shared.models import RFQDocument
from shared.utils.logger import setup_logger

logger = setup_logger(__name__)


class TextCleaner:
    """
    Cleans and normalizes raw text from RFQ documents.
    Removes noise, normalizes whitespace, and prepares text for classification.
    """

    def clean(self, text: str) -> str:
        """
        Clean and normalize raw text for classification.

        Steps:
        1. Replace common OCR artifacts
        2. Normalize unicode characters
        3. Remove excessive special characters
        4. Normalize whitespace
        5. Strip leading/trailing whitespace

        Args:
            text: Raw text to clean

        Returns:
            Cleaned and normalized text string
        """
        if not text:
            return ""

        cleaned = text

        # Replace common OCR artifacts and noise characters
        cleaned = cleaned.replace("\x00", "")  # null bytes
        cleaned = cleaned.replace("\ufffd", "")  # unicode replacement char

        # Normalize various dash types to standard hyphen
        cleaned = re.sub(r"[\u2013\u2014\u2015]", "-", cleaned)

        # Normalize various quote types
        cleaned = re.sub(r"[\u2018\u2019]", "'", cleaned)
        cleaned = re.sub(r"[\u201c\u201d]", '"', cleaned)

        # Remove excessive special characters but keep meaningful punctuation
        cleaned = re.sub(r"[^\w\s\-.,;:!?@#$%&*()/\\'\"+<>=\[\]{}|]", " ", cleaned)

        # Normalize whitespace (tabs, multiple spaces, etc.) to single space
        cleaned = re.sub(r"[ \t]+", " ", cleaned)

        # Normalize multiple newlines to double newline (paragraph break)
        cleaned = re.sub(r"\n{3,}", "\n\n", cleaned)

        # Strip leading/trailing whitespace from each line
        lines = [line.strip() for line in cleaned.split("\n")]
        cleaned = "\n".join(lines)

        # Final strip
        cleaned = cleaned.strip()

        return cleaned

    def clean_for_matching(self, text: str) -> str:
        """
        Prepare text specifically for keyword matching (lowercase, minimal punctuation).

        Args:
            text: Text to prepare for matching

        Returns:
            Lowercased, simplified text for keyword matching
        """
        cleaned = self.clean(text)
        # Lowercase for case-insensitive matching
        cleaned = cleaned.lower()
        # Replace punctuation with spaces for word boundary matching
        cleaned = re.sub(r"[^\w\s]", " ", cleaned)
        # Collapse multiple spaces
        cleaned = re.sub(r"\s+", " ", cleaned)
        return cleaned.strip()


class EntityExtractor:
    """
    Extracts structured entities from RFQ text using regex patterns.
    Lightweight extraction for rule-based classification support.
    """

    # Regex patterns for common RFQ entities
    EMAIL_PATTERN = re.compile(r"[\w.+-]+@[\w-]+\.[\w.-]+")
    PHONE_PATTERN = re.compile(r"(?:\+\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}")
    QUANTITY_PATTERN = re.compile(r"\b(\d+(?:,\d{3})*(?:\.\d+)?)\s*(?:units?|pcs?|pieces?|ea|each|qty|lot|sets?)\b", re.IGNORECASE)
    PRICE_PATTERN = re.compile(r"(?:\$|USD|EUR|GBP|€|£)\s*(\d+(?:,\d{3})*(?:\.\d+)?)", re.IGNORECASE)
    PART_NUMBER_PATTERN = re.compile(r"\b(?:P/?N|Part\s*(?:No|Number|#)|MPN|SKU)[:\s]*([A-Z0-9][\w\-./]{2,20})\b", re.IGNORECASE)
    DATE_PATTERN = re.compile(r"\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b|\b\d{4}[/-]\d{1,2}[/-]\d{1,2}\b")
    COMPANY_SUFFIXES = re.compile(r"\b(\w[\w\s&,.'-]*(?:Inc|LLC|Ltd|Corp|Co|GmbH|AG|SA|PLC|LP|LLP)\.?)\b", re.IGNORECASE)

    def extract(self, text: str) -> dict:
        """
        Extract all recognized entities from the given text.

        Args:
            text: Text to extract entities from

        Returns:
            Dictionary of extracted entities grouped by type
        """
        if not text:
            return {}

        entities = {}

        # Extract email addresses
        emails = self.EMAIL_PATTERN.findall(text)
        if emails:
            entities["emails"] = list(set(emails))

        # Extract phone numbers
        phones = self.PHONE_PATTERN.findall(text)
        if phones:
            entities["phone_numbers"] = list(set(phones))

        # Extract quantities
        quantities = self.QUANTITY_PATTERN.findall(text)
        if quantities:
            entities["quantities"] = quantities

        # Extract prices/amounts
        prices = self.PRICE_PATTERN.findall(text)
        if prices:
            entities["prices"] = prices

        # Extract part numbers
        part_numbers = self.PART_NUMBER_PATTERN.findall(text)
        if part_numbers:
            entities["part_numbers"] = list(set(part_numbers))

        # Extract dates
        dates = self.DATE_PATTERN.findall(text)
        if dates:
            entities["dates"] = list(set(dates))

        # Extract company names
        companies = self.COMPANY_SUFFIXES.findall(text)
        if companies:
            entities["companies"] = list(set(companies))

        # Extract domain from email addresses (useful for domain-based rules)
        if emails:
            domains = list(set(e.split("@")[1] for e in emails if "@" in e))
            entities["email_domains"] = domains

        return entities

    def extract_sender_domain(self, sender_email: Optional[str]) -> Optional[str]:
        """
        Extract the domain from a sender email address.

        Args:
            sender_email: Email address string

        Returns:
            Domain portion of the email, or None if invalid
        """
        if not sender_email or "@" not in sender_email:
            return None
        return sender_email.split("@")[1].lower()


def preprocess_document(doc: RFQDocument) -> RFQDocument:
    """
    Run full preprocessing on an RFQDocument:
    1. Clean the raw text
    2. Extract entities
    3. Store results in the document's preprocessed fields

    Args:
        doc: RFQDocument to preprocess

    Returns:
        The same RFQDocument with cleaned_text and extracted_entities populated
    """
    cleaner = TextCleaner()
    extractor = EntityExtractor()

    logger.info(
        "Preprocessing document",
        extra={"rfq_id": doc.rfq_id, "event": "preprocessing_start"},
    )

    # Clean the raw text
    doc.cleaned_text = cleaner.clean(doc.raw_text)

    # Extract entities from the raw text
    doc.extracted_entities = extractor.extract(doc.raw_text)

    # Also extract sender domain if available
    if doc.structured_fields.sender_email:
        sender_domain = extractor.extract_sender_domain(doc.structured_fields.sender_email)
        if sender_domain:
            doc.extracted_entities["sender_domain"] = sender_domain

    logger.info(
        "Preprocessing complete",
        extra={
            "rfq_id": doc.rfq_id,
            "event": "preprocessing_complete",
            "details": {
                "cleaned_text_length": len(doc.cleaned_text),
                "entities_found": list(doc.extracted_entities.keys()),
            },
        },
    )

    return doc
