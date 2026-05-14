"""
Classification Orchestrator for the Classification Agent.
Coordinates the hybrid rules + LLM classification pipeline:
1. Preprocess the document
2. Evaluate rules (fast path)
3. Fall back to LLM if rules are inconclusive
4. Apply hybrid decision logic
5. Return final ClassificationResult

Confidence thresholds are configurable via environment variables.
"""

import os

from agents.classification_agent.llm_classifier import LLMClassifier
from agents.classification_agent.preprocessing import preprocess_document
from agents.classification_agent.rules_engine import RulesEngine
from shared.models import (
    CategoryScore,
    ClassificationMethod,
    ClassificationResult,
    RFQDocument,
)
from shared.utils.logger import setup_logger

logger = setup_logger(__name__)

# Configurable confidence thresholds (from env vars or defaults)
RULE_HIGH_CONFIDENCE = float(os.environ.get("RULE_HIGH_CONFIDENCE_THRESHOLD", "0.90"))
RULE_LOW_CONFIDENCE = float(os.environ.get("RULE_LOW_CONFIDENCE_THRESHOLD", "0.70"))
LLM_HIGH_CONFIDENCE = float(os.environ.get("LLM_HIGH_CONFIDENCE_THRESHOLD", "0.85"))
LLM_VALIDATION_CONFIDENCE = float(os.environ.get("LLM_VALIDATION_CONFIDENCE_THRESHOLD", "0.80"))


class ClassificationOrchestrator:
    """
    Orchestrates the full classification pipeline using hybrid rules + LLM approach.

    Decision logic:
    - Rule confidence >= 0.90 -> use rule classification immediately (no LLM call)
    - Rule confidence 0.70-0.89 -> send to LLM for validation
    - No rule match -> full LLM classification
    - Both low confidence -> flag for manual review
    """

    def __init__(
        self,
        rules_path: str | None = None,
        prompts_path: str | None = None,
        categories_path: str | None = None,
        llm_model: str | None = None,
    ):
        """
        Initialize the orchestrator with rules engine and LLM classifier.

        Args:
            rules_path: Path to rules YAML config
            prompts_path: Path to prompts YAML config
            categories_path: Path to categories YAML config
            llm_model: LLM model to use (e.g. 'gpt-4o')
        """
        self.rules_engine = RulesEngine(rules_path=rules_path)
        self.llm_classifier = LLMClassifier(
            model=llm_model,
            prompts_path=prompts_path,
            categories_path=categories_path,
        )

    def classify(self, doc: RFQDocument) -> ClassificationResult:
        """
        Run the full classification pipeline on a preprocessed or raw document.

        Pipeline steps:
        1. Preprocess (clean text, extract entities)
        2. Evaluate rules
        3. Apply hybrid decision logic (rules vs LLM)
        4. Build and return ClassificationResult

        Args:
            doc: RFQDocument to classify (raw or preprocessed)

        Returns:
            ClassificationResult with category, confidence, method, and reasoning
        """
        logger.info(
            "Starting classification pipeline",
            extra={"rfq_id": doc.rfq_id, "event": "classification_pipeline_start"},
        )

        # Step 1: Preprocess if not already done
        if not doc.cleaned_text:
            doc = preprocess_document(doc)

        # Handle empty text (e.g. OCR failure)
        if not doc.cleaned_text and not doc.raw_text:
            logger.warning(
                "Empty document text - flagging for manual review",
                extra={"rfq_id": doc.rfq_id, "event": "empty_document"},
            )
            return self._build_manual_review_result(
                doc, reason="No text content available for classification"
            )

        # Step 2: Evaluate rules (fast path)
        rule_matches = self.rules_engine.evaluate(doc)

        # Step 3: Apply hybrid decision logic
        if rule_matches:
            best_match = rule_matches[0]  # Highest confidence match

            # HIGH CONFIDENCE RULE: confidence >= 0.90 -> use rule immediately
            if best_match.confidence >= RULE_HIGH_CONFIDENCE:
                logger.info(
                    f"High-confidence rule match: {best_match.category} ({best_match.confidence})",
                    extra={
                        "rfq_id": doc.rfq_id,
                        "event": "rule_high_confidence",
                        "details": {"rule_id": best_match.rule_id, "category": best_match.category},
                    },
                )
                return self._build_result_from_rule(doc, best_match, rule_matches)

            # MEDIUM CONFIDENCE RULE: 0.70-0.89 -> validate with LLM
            elif best_match.confidence >= RULE_LOW_CONFIDENCE:
                logger.info(
                    f"Medium-confidence rule match, validating with LLM: {best_match.category} ({best_match.confidence})",
                    extra={
                        "rfq_id": doc.rfq_id,
                        "event": "rule_medium_confidence_llm_validate",
                    },
                )
                return self._validate_with_llm(doc, best_match, rule_matches)

        # NO RULE MATCH or LOW CONFIDENCE: full LLM classification
        logger.info(
            "No confident rule match - performing full LLM classification",
            extra={"rfq_id": doc.rfq_id, "event": "llm_full_classification"},
        )
        return self._classify_with_llm(doc, rule_matches)

    def _build_result_from_rule(
        self,
        doc: RFQDocument,
        best_match,
        all_matches: list,
    ) -> ClassificationResult:
        """Build a ClassificationResult from a high-confidence rule match."""
        # Primary category from best rule match
        categories = [CategoryScore(category=best_match.category, confidence=best_match.confidence)]

        # Alternative categories from other rule matches
        alternatives = [
            CategoryScore(category=m.category, confidence=m.confidence)
            for m in all_matches[1:]
            if m.category != best_match.category
        ]

        return ClassificationResult(
            rfq_id=doc.rfq_id,
            categories=categories,
            primary_category=best_match.category,
            confidence=best_match.confidence,
            method=ClassificationMethod.RULE,
            reasoning=f"Rule {best_match.rule_id} ({best_match.rule_name}) matched with conditions: {', '.join(best_match.matched_conditions)}",
            alternative_categories=alternatives,
            requires_manual_review=False,
            requires_extraction=True,  # Default to requiring extraction for rule-classified items
            email_subject=doc.structured_fields.subject,
            sender_email=doc.structured_fields.sender_email,
            attachment_names=doc.structured_fields.attachment_names,
            attachment_text_available=bool(doc.raw_text),
            evidence=f"Matched conditions: {', '.join(best_match.matched_conditions)}",
        )

    def _validate_with_llm(
        self,
        doc: RFQDocument,
        best_match,
        all_matches: list,
    ) -> ClassificationResult:
        """Validate a medium-confidence rule match using the LLM."""
        llm_result = self.llm_classifier.validate(
            doc,
            proposed_category=best_match.category,
            proposed_confidence=best_match.confidence,
        )

        llm_confidence = llm_result.get("primary_confidence", 0.0)
        llm_category = llm_result.get("primary_category", best_match.category)
        proposed_correct = llm_result.get("proposed_category_correct", True)

        # If LLM validates with high confidence, use LLM's result
        if llm_confidence >= LLM_VALIDATION_CONFIDENCE:
            categories = []
            for cat in llm_result.get("categories", []):
                categories.append(CategoryScore(
                    category=cat["category"],
                    confidence=cat["confidence"],
                ))
            if not categories:
                categories = [CategoryScore(category=llm_category, confidence=llm_confidence)]

            # Use rule alternatives that differ from LLM primary
            alternatives = [
                CategoryScore(category=m.category, confidence=m.confidence)
                for m in all_matches
                if m.category != llm_category
            ]

            return ClassificationResult(
                rfq_id=doc.rfq_id,
                categories=categories,
                primary_category=llm_category,
                confidence=llm_confidence,
                method=ClassificationMethod.HYBRID,
                reasoning=f"Rule proposed '{best_match.category}' (conf: {best_match.confidence}), LLM {'confirmed' if proposed_correct else 'corrected to'} '{llm_category}' (conf: {llm_confidence}). {llm_result.get('reasoning', '')}",
                alternative_categories=alternatives,
                requires_manual_review=llm_result.get("requires_human_review", False),
                review_reason=llm_result.get("review_reason"),
                requires_extraction=llm_result.get("requires_extraction", True),
                email_subject=doc.structured_fields.subject,
                sender_email=doc.structured_fields.sender_email,
                attachment_names=doc.structured_fields.attachment_names,
                attachment_text_available=bool(doc.raw_text),
                evidence=f"Rule: {', '.join(best_match.matched_conditions)} | LLM: {llm_result.get('reasoning', '')}",
            )
        else:
            # LLM validation not confident enough — flag for manual review
            return self._build_manual_review_result(
                doc,
                reason=f"Rule confidence ({best_match.confidence}) and LLM confidence ({llm_confidence}) both below thresholds",
                partial_category=best_match.category,
                partial_confidence=max(best_match.confidence, llm_confidence),
            )

    def _classify_with_llm(
        self,
        doc: RFQDocument,
        rule_matches: list,
    ) -> ClassificationResult:
        """Perform full LLM classification when rules are inconclusive."""
        llm_result = self.llm_classifier.classify(doc)

        llm_confidence = llm_result.get("primary_confidence", 0.0)
        llm_category = llm_result.get("primary_category", "")

        # LLM confident enough -> use its classification
        if llm_confidence >= LLM_HIGH_CONFIDENCE:
            categories = []
            for cat in llm_result.get("categories", []):
                categories.append(CategoryScore(
                    category=cat["category"],
                    confidence=cat["confidence"],
                ))
            if not categories:
                categories = [CategoryScore(category=llm_category, confidence=llm_confidence)]

            # Include any rule matches as alternatives
            alternatives = [
                CategoryScore(category=m.category, confidence=m.confidence)
                for m in rule_matches
                if m.category != llm_category
            ]

            return ClassificationResult(
                rfq_id=doc.rfq_id,
                categories=categories,
                primary_category=llm_category,
                confidence=llm_confidence,
                method=ClassificationMethod.LLM,
                reasoning=llm_result.get("reasoning", "LLM semantic classification"),
                alternative_categories=alternatives,
                requires_manual_review=llm_result.get("requires_human_review", False),
                review_reason=llm_result.get("review_reason"),
                requires_extraction=llm_result.get("requires_extraction", True),
                email_subject=doc.structured_fields.subject,
                sender_email=doc.structured_fields.sender_email,
                attachment_names=doc.structured_fields.attachment_names,
                attachment_text_available=bool(doc.raw_text),
                evidence=llm_result.get("reasoning", ""),
            )
        else:
            # LLM not confident — flag for manual review
            return self._build_manual_review_result(
                doc,
                reason=f"LLM confidence ({llm_confidence}) below threshold ({LLM_HIGH_CONFIDENCE})",
                partial_category=llm_category,
                partial_confidence=llm_confidence,
            )

    def _build_manual_review_result(
        self,
        doc: RFQDocument,
        reason: str,
        partial_category: str = "",
        partial_confidence: float = 0.0,
    ) -> ClassificationResult:
        """Build a ClassificationResult that flags the document for manual review."""
        logger.info(
            f"Flagging for manual review: {reason}",
            extra={"rfq_id": doc.rfq_id, "event": "manual_review_flagged"},
        )

        categories = []
        if partial_category:
            categories = [CategoryScore(category=partial_category, confidence=partial_confidence)]

        return ClassificationResult(
            rfq_id=doc.rfq_id,
            categories=categories,
            primary_category=partial_category,
            confidence=partial_confidence,
            method=ClassificationMethod.MANUAL_REVIEW,
            reasoning=reason,
            requires_manual_review=True,
            review_reason=reason,
            requires_extraction=False,
            email_subject=doc.structured_fields.subject,
            sender_email=doc.structured_fields.sender_email,
            attachment_names=doc.structured_fields.attachment_names,
            attachment_text_available=bool(doc.raw_text),
            evidence=reason,
        )
