"""
Rules Engine for the Classification Agent.
Applies deterministic, configurable business rules to classify RFQs.
Rules are loaded from YAML configuration and evaluated in priority order.
Supports keyword, domain, field, and composite rule types.
"""

import os
import re
from pathlib import Path

import yaml

from agents.classification_agent.preprocessing import TextCleaner
from shared.models import RFQDocument, RuleMatch
from shared.utils.logger import setup_logger

logger = setup_logger(__name__)

# Default path to the rules configuration file
DEFAULT_RULES_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "shared", "config", "rules.yaml")


class RulesEngine:
    """
    Evaluates configurable business rules against RFQ documents.
    Returns rule matches with confidence scores for classification decisions.
    """

    def __init__(self, rules_path: str | None = None):
        """
        Initialize the rules engine with rules from a YAML config file.

        Args:
            rules_path: Path to rules.yaml. Falls back to default shared config.
        """
        self.rules_path = rules_path or DEFAULT_RULES_PATH
        self.rules = self._load_rules()
        self._text_cleaner = TextCleaner()

    def _load_rules(self) -> list[dict]:
        """
        Load and validate rules from the YAML configuration file.
        Rules are sorted by priority (lower number = higher priority).

        Returns:
            List of rule dictionaries sorted by priority
        """
        rules_path = Path(self.rules_path).resolve()
        logger.info(
            "Loading rules configuration",
            extra={"event": "rules_load", "details": {"path": str(rules_path)}},
        )

        with open(rules_path, "r") as f:
            config = yaml.safe_load(f)

        rules = config.get("rules", [])
        # Sort rules by priority (lower number = evaluated first)
        rules.sort(key=lambda r: r.get("priority", 999))

        logger.info(
            f"Loaded {len(rules)} classification rules",
            extra={"event": "rules_loaded", "details": {"count": len(rules)}},
        )
        return rules

    def reload_rules(self) -> None:
        """Reload rules from the configuration file (hot-reload support)."""
        self.rules = self._load_rules()

    def evaluate(self, doc: RFQDocument) -> list[RuleMatch]:
        """
        Evaluate all rules against a document and return matches.

        Args:
            doc: Preprocessed RFQDocument to evaluate

        Returns:
            List of RuleMatch objects sorted by confidence (highest first)
        """
        logger.info(
            "Evaluating rules",
            extra={"rfq_id": doc.rfq_id, "event": "rules_evaluation_start", "details": {"rule_count": len(self.rules)}},
        )

        matches = []
        # Prepare text for keyword matching (lowercased, simplified)
        match_text = self._text_cleaner.clean_for_matching(doc.raw_text)

        for rule in self.rules:
            match = self._evaluate_single_rule(rule, doc, match_text)
            if match:
                matches.append(match)
                logger.info(
                    f"Rule matched: {rule['rule_id']} -> {rule['category']} (confidence: {rule['confidence']})",
                    extra={
                        "rfq_id": doc.rfq_id,
                        "event": "rule_matched",
                        "details": {
                            "rule_id": rule["rule_id"],
                            "category": rule["category"],
                            "confidence": rule["confidence"],
                        },
                    },
                )

        # Sort matches by confidence (highest first)
        matches.sort(key=lambda m: m.confidence, reverse=True)

        logger.info(
            f"Rules evaluation complete: {len(matches)} matches found",
            extra={
                "rfq_id": doc.rfq_id,
                "event": "rules_evaluation_complete",
                "details": {"match_count": len(matches)},
            },
        )

        return matches

    def _evaluate_single_rule(self, rule: dict, doc: RFQDocument, match_text: str) -> RuleMatch | None:
        """
        Evaluate a single rule against a document.

        Args:
            rule: Rule configuration dictionary
            doc: RFQDocument being evaluated
            match_text: Preprocessed lowercase text for keyword matching

        Returns:
            RuleMatch if the rule conditions are satisfied, None otherwise
        """
        conditions = rule.get("conditions", {})
        rule_type = conditions.get("type", "keyword")

        if rule_type == "keyword":
            return self._evaluate_keyword_rule(rule, match_text)
        elif rule_type == "domain":
            return self._evaluate_domain_rule(rule, doc)
        elif rule_type == "field":
            return self._evaluate_field_rule(rule, doc)
        elif rule_type == "composite":
            return self._evaluate_composite_rule(rule, doc, match_text)
        else:
            logger.warning(f"Unknown rule type: {rule_type}", extra={"event": "unknown_rule_type"})
            return None

    def _evaluate_keyword_rule(self, rule: dict, match_text: str) -> RuleMatch | None:
        """
        Evaluate a keyword-based rule.
        Checks if the required minimum number of keywords appear in the text.

        Args:
            rule: Rule configuration with keywords and min_match
            match_text: Lowercased text for matching

        Returns:
            RuleMatch if enough keywords match, None otherwise
        """
        conditions = rule["conditions"]
        keywords = conditions.get("keywords", [])
        min_match = conditions.get("min_match", 1)

        matched_keywords = []
        for keyword in keywords:
            # Match keyword as a whole word or phrase (case-insensitive)
            keyword_lower = keyword.lower()
            # Use word boundary matching for short keywords to avoid false positives
            # (e.g. "IC" matching "office")
            if len(keyword_lower) <= 3:
                pattern = r"\b" + re.escape(keyword_lower) + r"\b"
                if re.search(pattern, match_text):
                    matched_keywords.append(keyword)
            else:
                if keyword_lower in match_text:
                    matched_keywords.append(keyword)

        if len(matched_keywords) >= min_match:
            return RuleMatch(
                rule_id=rule["rule_id"],
                rule_name=rule.get("name", ""),
                category=rule["category"],
                confidence=rule["confidence"],
                matched_conditions=[f"keyword:{kw}" for kw in matched_keywords],
            )
        return None

    def _evaluate_domain_rule(self, rule: dict, doc: RFQDocument) -> RuleMatch | None:
        """
        Evaluate a sender-domain-based rule.
        Checks if the sender email domain matches any in the rule's domain list.

        Args:
            rule: Rule configuration with domains list
            doc: RFQDocument with sender email info

        Returns:
            RuleMatch if domain matches, None otherwise
        """
        conditions = rule["conditions"]
        domains = [d.lower() for d in conditions.get("domains", [])]

        # Check sender email from structured fields
        sender_email = doc.structured_fields.sender_email
        if not sender_email:
            return None

        sender_domain = sender_email.split("@")[-1].lower() if "@" in sender_email else ""

        if sender_domain in domains:
            return RuleMatch(
                rule_id=rule["rule_id"],
                rule_name=rule.get("name", ""),
                category=rule["category"],
                confidence=rule["confidence"],
                matched_conditions=[f"domain:{sender_domain}"],
            )
        return None

    def _evaluate_field_rule(self, rule: dict, doc: RFQDocument) -> RuleMatch | None:
        """
        Evaluate a structured-field-based rule.
        Checks if a specific form field matches expected values.

        Args:
            rule: Rule configuration with field_name and field_values
            doc: RFQDocument with structured fields

        Returns:
            RuleMatch if field value matches, None otherwise
        """
        conditions = rule["conditions"]
        field_name = conditions.get("field_name", "")
        field_values = [v.lower() for v in conditions.get("field_values", [])]

        # Check structured fields and form_fields in metadata
        actual_value = None

        # Check direct structured fields first (only if value is non-None)
        if hasattr(doc.structured_fields, field_name):
            attr_val = getattr(doc.structured_fields, field_name)
            if attr_val is not None:
                actual_value = attr_val

        # Fall back to form_fields in metadata (from JSON/CSV forms)
        if actual_value is None and "form_fields" in doc.metadata:
            actual_value = doc.metadata["form_fields"].get(field_name)

        if actual_value and str(actual_value).lower() in field_values:
            return RuleMatch(
                rule_id=rule["rule_id"],
                rule_name=rule.get("name", ""),
                category=rule["category"],
                confidence=rule["confidence"],
                matched_conditions=[f"field:{field_name}={actual_value}"],
            )
        return None

    def _evaluate_composite_rule(self, rule: dict, doc: RFQDocument, match_text: str) -> RuleMatch | None:
        """
        Evaluate a composite rule that combines multiple condition types with AND/OR logic.

        Args:
            rule: Rule configuration with sub_conditions and operator
            doc: RFQDocument being evaluated
            match_text: Preprocessed text for matching

        Returns:
            RuleMatch if composite conditions are satisfied, None otherwise
        """
        conditions = rule["conditions"]
        sub_conditions = conditions.get("sub_conditions", [])
        operator = conditions.get("operator", "AND").upper()

        matched = []
        for sub in sub_conditions:
            # Create a temporary rule for each sub-condition
            temp_rule = {
                "rule_id": rule["rule_id"],
                "name": rule.get("name", ""),
                "category": rule["category"],
                "confidence": rule["confidence"],
                "conditions": sub,
            }
            result = self._evaluate_single_rule(temp_rule, doc, match_text)
            if result:
                matched.append(result)

        # Apply AND/OR logic
        if operator == "AND" and len(matched) == len(sub_conditions):
            # All sub-conditions must match
            all_conditions = []
            for m in matched:
                all_conditions.extend(m.matched_conditions)
            return RuleMatch(
                rule_id=rule["rule_id"],
                rule_name=rule.get("name", ""),
                category=rule["category"],
                confidence=rule["confidence"],
                matched_conditions=all_conditions,
            )
        elif operator == "OR" and len(matched) > 0:
            # At least one sub-condition must match
            return RuleMatch(
                rule_id=rule["rule_id"],
                rule_name=rule.get("name", ""),
                category=rule["category"],
                confidence=rule["confidence"],
                matched_conditions=matched[0].matched_conditions,
            )

        return None
