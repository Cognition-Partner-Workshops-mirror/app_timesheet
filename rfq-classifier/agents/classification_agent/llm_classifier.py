"""
LLM Classifier for the Classification Agent.
Uses OpenAI GPT-4o (or configurable model) for semantic classification
when rule-based classification is inconclusive.
Supports both full classification and rule-validation modes.
"""

import json
import os
import time
from pathlib import Path

import yaml

from shared.models import CategoryScore, RFQDocument
from shared.utils.logger import setup_logger

logger = setup_logger(__name__)

# Default path to prompt templates and category definitions
DEFAULT_PROMPTS_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "shared", "config", "prompts.yaml")
DEFAULT_CATEGORIES_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "shared", "config", "categories.yaml")

# Retry configuration for LLM API calls
MAX_RETRIES = 3
RETRY_BACKOFF_BASE = 2  # seconds


class LLMClassifier:
    """
    Performs semantic classification of RFQ documents using an LLM (GPT-4o).
    Supports two modes:
    - classify(): Full classification when rules are inconclusive
    - validate(): Validates a rule-proposed classification
    """

    def __init__(
        self,
        model: str | None = None,
        prompts_path: str | None = None,
        categories_path: str | None = None,
    ):
        """
        Initialize the LLM classifier.

        Args:
            model: LLM model identifier (e.g. 'gpt-4o'). Falls back to LLM_MODEL env var.
            prompts_path: Path to prompts.yaml. Falls back to default shared config.
            categories_path: Path to categories.yaml. Falls back to default shared config.
        """
        self.model = model or os.environ.get("LLM_MODEL", "gpt-4o")
        self.prompts = self._load_prompts(prompts_path or DEFAULT_PROMPTS_PATH)
        self.categories = self._load_categories(categories_path or DEFAULT_CATEGORIES_PATH)
        self._client = None  # Lazy-initialized OpenAI client

    def _load_prompts(self, path: str) -> dict:
        """Load prompt templates from YAML config."""
        with open(Path(path).resolve(), "r") as f:
            return yaml.safe_load(f)

    def _load_categories(self, path: str) -> list[dict]:
        """Load category definitions from YAML config."""
        with open(Path(path).resolve(), "r") as f:
            config = yaml.safe_load(f)
        return config.get("categories", [])

    def _get_client(self):
        """Lazy-initialize the OpenAI client."""
        if self._client is None:
            from openai import OpenAI

            api_key = os.environ.get("OPENAI_API_KEY")
            if not api_key:
                raise ValueError("OPENAI_API_KEY environment variable is not set")
            self._client = OpenAI(api_key=api_key)
        return self._client

    def _format_category_list(self) -> str:
        """Format category definitions into a string for the LLM prompt."""
        lines = []
        for cat in self.categories:
            lines.append(f"- {cat['name']}: {cat.get('description', '')}")
        return "\n".join(lines)

    def _format_metadata(self, doc: RFQDocument) -> str:
        """Format document metadata into a string for the LLM prompt."""
        meta_parts = []
        if doc.structured_fields.sender_email:
            meta_parts.append(f"Sender: {doc.structured_fields.sender_email}")
        if doc.structured_fields.subject:
            meta_parts.append(f"Subject: {doc.structured_fields.subject}")
        if doc.structured_fields.company_name:
            meta_parts.append(f"Company: {doc.structured_fields.company_name}")
        if doc.structured_fields.product_keywords:
            meta_parts.append(f"Keywords: {', '.join(doc.structured_fields.product_keywords)}")
        if doc.structured_fields.product_category:
            meta_parts.append(f"Product Category: {doc.structured_fields.product_category}")
        if doc.structured_fields.quantity:
            meta_parts.append(f"Quantity: {doc.structured_fields.quantity}")
        if doc.extracted_entities:
            if "companies" in doc.extracted_entities:
                meta_parts.append(f"Companies Found: {', '.join(doc.extracted_entities['companies'])}")
            if "quantities" in doc.extracted_entities:
                meta_parts.append(f"Quantities Found: {', '.join(doc.extracted_entities['quantities'])}")
        return "\n".join(meta_parts) if meta_parts else "No additional metadata available."

    def classify(self, doc: RFQDocument) -> dict:
        """
        Perform full LLM-based classification of an RFQ document.
        Used when rule-based classification is inconclusive (no rules match).

        Args:
            doc: Preprocessed RFQDocument to classify

        Returns:
            Dictionary with categories, confidence scores, reasoning, and review flags
        """
        logger.info(
            "Starting LLM classification",
            extra={"rfq_id": doc.rfq_id, "event": "llm_classification_start", "details": {"model": self.model}},
        )

        # Build the classification prompt from template
        prompt = self.prompts["classification_prompt"].format(
            category_list=self._format_category_list(),
            rfq_text=doc.cleaned_text or doc.raw_text,
            metadata=self._format_metadata(doc),
        )

        # Call the LLM with retry logic
        response = self._call_llm(prompt, doc.rfq_id)

        if response is None:
            # LLM call failed completely — flag for manual review
            logger.warning(
                "LLM classification failed, flagging for manual review",
                extra={"rfq_id": doc.rfq_id, "event": "llm_classification_failed"},
            )
            return {
                "categories": [],
                "primary_category": "",
                "primary_confidence": 0.0,
                "reasoning": "LLM classification failed - flagged for manual review",
                "requires_extraction": False,
                "requires_human_review": True,
                "review_reason": "LLM API call failed",
            }

        logger.info(
            "LLM classification complete",
            extra={
                "rfq_id": doc.rfq_id,
                "event": "llm_classification_complete",
                "details": {
                    "primary_category": response.get("primary_category", ""),
                    "confidence": response.get("primary_confidence", 0.0),
                },
            },
        )

        return response

    def validate(self, doc: RFQDocument, proposed_category: str, proposed_confidence: float) -> dict:
        """
        Validate a rule-proposed classification using the LLM.
        Used when rules match with medium confidence (0.70-0.89).

        Args:
            doc: Preprocessed RFQDocument
            proposed_category: Category proposed by rules engine
            proposed_confidence: Confidence of the rule match

        Returns:
            Dictionary with validation result, corrected category if needed, and reasoning
        """
        logger.info(
            "Starting LLM validation of rule classification",
            extra={
                "rfq_id": doc.rfq_id,
                "event": "llm_validation_start",
                "details": {"proposed": proposed_category, "confidence": proposed_confidence},
            },
        )

        # Build the validation prompt from template
        prompt = self.prompts["validation_prompt"].format(
            proposed_category=proposed_category,
            proposed_confidence=proposed_confidence,
            category_list=self._format_category_list(),
            rfq_text=doc.cleaned_text or doc.raw_text,
        )

        response = self._call_llm(prompt, doc.rfq_id)

        if response is None:
            # LLM validation failed — use the rule's classification as fallback
            logger.warning(
                "LLM validation failed, using rule classification as fallback",
                extra={"rfq_id": doc.rfq_id, "event": "llm_validation_failed"},
            )
            return {
                "categories": [{"category": proposed_category, "confidence": proposed_confidence}],
                "primary_category": proposed_category,
                "primary_confidence": proposed_confidence,
                "proposed_category_correct": True,
                "reasoning": "LLM validation unavailable - rule classification used as fallback",
                "requires_extraction": False,
                "requires_human_review": True,
                "review_reason": "LLM validation failed",
            }

        logger.info(
            "LLM validation complete",
            extra={
                "rfq_id": doc.rfq_id,
                "event": "llm_validation_complete",
                "details": {
                    "proposed_correct": response.get("proposed_category_correct", False),
                    "final_category": response.get("primary_category", ""),
                },
            },
        )

        return response

    def _call_llm(self, prompt: str, rfq_id: str) -> dict | None:
        """
        Call the LLM API with retry logic and exponential backoff.

        Args:
            prompt: Full prompt string to send to the LLM
            rfq_id: RFQ ID for logging correlation

        Returns:
            Parsed JSON response dictionary, or None if all retries fail
        """
        for attempt in range(MAX_RETRIES):
            try:
                client = self._get_client()

                logger.info(
                    f"LLM API call attempt {attempt + 1}/{MAX_RETRIES}",
                    extra={"rfq_id": rfq_id, "event": "llm_api_call", "details": {"attempt": attempt + 1}},
                )

                response = client.chat.completions.create(
                    model=self.model,
                    messages=[
                        {"role": "system", "content": "You are an RFQ classification expert. Always respond with valid JSON only, no markdown formatting."},
                        {"role": "user", "content": prompt},
                    ],
                    temperature=0.1,  # Low temperature for consistent classification
                    max_tokens=1000,
                    response_format={"type": "json_object"},
                )

                # Parse the response content as JSON
                content = response.choices[0].message.content
                result = json.loads(content)

                # Normalize the response structure
                return self._normalize_response(result)

            except json.JSONDecodeError as e:
                logger.warning(
                    f"Failed to parse LLM response as JSON (attempt {attempt + 1}): {e}",
                    extra={"rfq_id": rfq_id, "event": "llm_json_error"},
                )
            except Exception as e:
                logger.error(
                    f"LLM API call failed (attempt {attempt + 1}): {e}",
                    extra={"rfq_id": rfq_id, "event": "llm_api_error", "details": {"error": str(e)}},
                )

            # Exponential backoff before retry
            if attempt < MAX_RETRIES - 1:
                wait_time = RETRY_BACKOFF_BASE ** (attempt + 1)
                logger.info(f"Retrying in {wait_time}s...", extra={"rfq_id": rfq_id, "event": "llm_retry_wait"})
                time.sleep(wait_time)

        return None

    def _normalize_response(self, response: dict) -> dict:
        """
        Normalize the LLM response to ensure consistent structure.
        Handles variations in how the LLM formats its output.

        Args:
            response: Raw parsed JSON from LLM

        Returns:
            Normalized response dictionary
        """
        # Ensure categories is a list of dicts with 'category' and 'confidence'
        categories = response.get("categories", [])
        if isinstance(categories, list):
            normalized_cats = []
            for cat in categories:
                if isinstance(cat, dict):
                    normalized_cats.append({
                        "category": cat.get("category", ""),
                        "confidence": float(cat.get("confidence", 0.0)),
                    })
            response["categories"] = normalized_cats

        # Ensure primary_confidence is a float
        if "primary_confidence" in response:
            response["primary_confidence"] = float(response["primary_confidence"])

        # Ensure boolean fields
        for bool_field in ["requires_extraction", "requires_human_review", "proposed_category_correct"]:
            if bool_field in response:
                response[bool_field] = bool(response[bool_field])

        return response
