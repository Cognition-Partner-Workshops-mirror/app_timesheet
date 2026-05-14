"""
Data models for the RFQ Classification Agent.
Defines the core data structures used throughout the pipeline:
RFQDocument (normalized input), ClassificationResult (output),
and supporting types for rules and extraction.
"""

from dataclasses import dataclass, field
from enum import Enum
from typing import Optional


class InputSource(Enum):
    """Enumeration of supported RFQ input source types."""
    PDF = "pdf"
    EMAIL = "email"
    FORM = "form"


class ClassificationMethod(Enum):
    """How the classification was determined."""
    RULE = "rule"
    LLM = "llm"
    HYBRID = "hybrid"
    MANUAL_REVIEW = "manual_review"


@dataclass
class StructuredFields:
    """
    Structured fields extracted from the RFQ input.
    These are populated during ingestion from form fields, email headers, etc.
    """
    sender_email: Optional[str] = None
    subject: Optional[str] = None
    company_name: Optional[str] = None
    product_keywords: list[str] = field(default_factory=list)
    product_category: Optional[str] = None
    quantity: Optional[str] = None
    attachment_names: list[str] = field(default_factory=list)


@dataclass
class RFQDocument:
    """
    Normalized RFQ document - the unified representation after ingestion.
    All input types (PDF, email, form) are converted to this format.
    """
    rfq_id: str
    source: InputSource
    raw_text: str
    structured_fields: StructuredFields = field(default_factory=StructuredFields)
    metadata: dict = field(default_factory=dict)
    # Preprocessed fields (populated by preprocessing module)
    cleaned_text: str = ""
    extracted_entities: dict = field(default_factory=dict)


@dataclass
class CategoryScore:
    """A single category classification with its confidence score."""
    category: str
    confidence: float


@dataclass
class RuleMatch:
    """Result of a single rule evaluation against an RFQ."""
    rule_id: str
    rule_name: str
    category: str
    confidence: float
    matched_conditions: list[str] = field(default_factory=list)


@dataclass
class ExtractionField:
    """
    A single extracted data field from an RFQ.
    Includes the source location and evidence text for traceability.
    """
    vendor_number: Optional[str] = None
    vendor_name: Optional[str] = None
    supplier_email: Optional[str] = None
    material_number: Optional[str] = None
    item_description: Optional[str] = None
    manufacturer: Optional[str] = None
    manufacturer_part_number: Optional[str] = None
    quantity: Optional[str] = None
    unit_of_measure: Optional[str] = None
    unit_price: Optional[str] = None
    currency: Optional[str] = None
    lead_time: Optional[str] = None
    plant: Optional[str] = None
    supplier_comments: Optional[str] = None
    source: Optional[str] = None  # "email_body", "attachment", "table", "both"
    evidence: Optional[str] = None  # text showing where value was found


@dataclass
class ClassificationResult:
    """
    Final output of the classification pipeline.
    Contains classification labels, confidence scores, method used,
    extraction results, and flags for manual review.
    """
    rfq_id: str
    # Classification fields
    categories: list[CategoryScore] = field(default_factory=list)
    primary_category: str = ""
    confidence: float = 0.0
    method: ClassificationMethod = ClassificationMethod.MANUAL_REVIEW
    reasoning: str = ""
    alternative_categories: list[CategoryScore] = field(default_factory=list)
    requires_manual_review: bool = False
    review_reason: Optional[str] = None
    # Whether quote data extraction is needed
    requires_extraction: bool = False
    # Extraction results (populated if extraction was performed)
    extraction_results: list[ExtractionField] = field(default_factory=list)
    # Source metadata for audit trail
    email_subject: Optional[str] = None
    email_body_snippet: Optional[str] = None
    sender_email: Optional[str] = None
    attachment_names: list[str] = field(default_factory=list)
    attachment_text_available: bool = False
    # Classification evidence
    evidence: Optional[str] = None

    def to_dict(self) -> dict:
        """Convert the classification result to a dictionary for JSON serialization."""
        return {
            "rfq_id": self.rfq_id,
            "categories": [
                {"category": c.category, "confidence": c.confidence}
                for c in self.categories
            ],
            "primary_category": self.primary_category,
            "confidence": self.confidence,
            "method": self.method.value,
            "reasoning": self.reasoning,
            "alternative_categories": [
                {"category": c.category, "confidence": c.confidence}
                for c in self.alternative_categories
            ],
            "requires_manual_review": self.requires_manual_review,
            "review_reason": self.review_reason,
            "requires_extraction": self.requires_extraction,
            "extraction_results": [
                {
                    "vendor_number": e.vendor_number,
                    "vendor_name": e.vendor_name,
                    "supplier_email": e.supplier_email,
                    "material_number": e.material_number,
                    "item_description": e.item_description,
                    "manufacturer": e.manufacturer,
                    "manufacturer_part_number": e.manufacturer_part_number,
                    "quantity": e.quantity,
                    "unit_of_measure": e.unit_of_measure,
                    "unit_price": e.unit_price,
                    "currency": e.currency,
                    "lead_time": e.lead_time,
                    "plant": e.plant,
                    "supplier_comments": e.supplier_comments,
                    "source": e.source,
                    "evidence": e.evidence,
                }
                for e in self.extraction_results
            ],
            "email_subject": self.email_subject,
            "email_body_snippet": self.email_body_snippet,
            "sender_email": self.sender_email,
            "attachment_names": self.attachment_names,
            "attachment_text_available": self.attachment_text_available,
            "evidence": self.evidence,
        }
