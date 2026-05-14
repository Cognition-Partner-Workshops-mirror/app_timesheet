"""
Unit tests for the Rules Engine.
Tests individual rule types, priority ordering, edge cases,
and the overall evaluation logic.
"""

import os
import tempfile

import pytest
import yaml

from agents.classification_agent.rules_engine import RulesEngine
from shared.models import InputSource, RFQDocument, StructuredFields


def create_temp_rules(rules_list: list[dict]) -> str:
    """Helper: write rules to a temp YAML file and return the path."""
    config = {"rules": rules_list}
    tmp = tempfile.NamedTemporaryFile(mode="w", suffix=".yaml", delete=False)
    yaml.dump(config, tmp)
    tmp.close()
    return tmp.name


def make_doc(
    raw_text: str = "",
    sender_email: str | None = None,
    product_category: str | None = None,
    form_fields: dict | None = None,
) -> RFQDocument:
    """Helper: build an RFQDocument for testing."""
    metadata = {}
    if form_fields:
        metadata["form_fields"] = form_fields
    return RFQDocument(
        rfq_id="TEST-001",
        source=InputSource.PDF,
        raw_text=raw_text,
        structured_fields=StructuredFields(
            sender_email=sender_email,
            product_category=product_category,
        ),
        metadata=metadata,
    )


class TestKeywordRules:
    """Tests for keyword-based rule evaluation."""

    def setup_method(self):
        """Create a rules engine with a simple keyword rule."""
        self.rules_path = create_temp_rules([
            {
                "rule_id": "R001",
                "name": "Metal Products",
                "priority": 1,
                "conditions": {
                    "type": "keyword",
                    "keywords": ["steel", "aluminum", "metal fabrication"],
                    "min_match": 2,
                },
                "category": "Manufacturing - Metals",
                "confidence": 0.95,
            }
        ])
        self.engine = RulesEngine(rules_path=self.rules_path)

    def teardown_method(self):
        os.unlink(self.rules_path)

    def test_keyword_match_positive(self):
        """Rule matches when min_match keywords are present."""
        doc = make_doc(raw_text="We need steel beams and aluminum sheets for the project")
        matches = self.engine.evaluate(doc)
        assert len(matches) == 1
        assert matches[0].category == "Manufacturing - Metals"
        assert matches[0].confidence == 0.95

    def test_keyword_match_negative(self):
        """Rule does not match when too few keywords are present."""
        doc = make_doc(raw_text="We need steel beams for the project")
        matches = self.engine.evaluate(doc)
        # Only 1 keyword ("steel"), but min_match is 2
        assert len(matches) == 0

    def test_keyword_match_case_insensitive(self):
        """Keyword matching is case-insensitive."""
        doc = make_doc(raw_text="STEEL beams and ALUMINUM sheets")
        matches = self.engine.evaluate(doc)
        assert len(matches) == 1

    def test_keyword_match_phrase(self):
        """Multi-word keyword phrases are matched correctly."""
        doc = make_doc(raw_text="We provide metal fabrication and steel services")
        matches = self.engine.evaluate(doc)
        assert len(matches) == 1
        # Both "metal fabrication" and "steel" should match
        assert any("steel" in c for c in matches[0].matched_conditions)

    def test_keyword_matched_conditions_recorded(self):
        """Matched keywords are recorded in the match result."""
        doc = make_doc(raw_text="Steel and aluminum available")
        matches = self.engine.evaluate(doc)
        assert len(matches) == 1
        conditions = matches[0].matched_conditions
        assert any("steel" in c for c in conditions)
        assert any("aluminum" in c for c in conditions)

    def test_keyword_empty_text(self):
        """Empty text does not match any keyword rules."""
        doc = make_doc(raw_text="")
        matches = self.engine.evaluate(doc)
        assert len(matches) == 0


class TestDomainRules:
    """Tests for sender-domain-based rule evaluation."""

    def setup_method(self):
        """Create a rules engine with a domain rule."""
        self.rules_path = create_temp_rules([
            {
                "rule_id": "R007",
                "name": "Aerospace Domain",
                "priority": 2,
                "conditions": {
                    "type": "domain",
                    "domains": ["aerospace.com", "boeing.com"],
                },
                "category": "Aerospace & Defense",
                "confidence": 0.85,
            }
        ])
        self.engine = RulesEngine(rules_path=self.rules_path)

    def teardown_method(self):
        os.unlink(self.rules_path)

    def test_domain_match_positive(self):
        """Rule matches when sender domain is in the domains list."""
        doc = make_doc(raw_text="Request for parts", sender_email="buyer@aerospace.com")
        matches = self.engine.evaluate(doc)
        assert len(matches) == 1
        assert matches[0].category == "Aerospace & Defense"

    def test_domain_match_negative(self):
        """Rule does not match when sender domain is not in the list."""
        doc = make_doc(raw_text="Request for parts", sender_email="buyer@gmail.com")
        matches = self.engine.evaluate(doc)
        assert len(matches) == 0

    def test_domain_no_sender_email(self):
        """Rule does not match when no sender email is available."""
        doc = make_doc(raw_text="Request for parts")
        matches = self.engine.evaluate(doc)
        assert len(matches) == 0

    def test_domain_case_insensitive(self):
        """Domain matching is case-insensitive."""
        doc = make_doc(raw_text="Request", sender_email="buyer@BOEING.COM")
        matches = self.engine.evaluate(doc)
        assert len(matches) == 1


class TestFieldRules:
    """Tests for structured-field-based rule evaluation."""

    def setup_method(self):
        """Create a rules engine with a field rule."""
        self.rules_path = create_temp_rules([
            {
                "rule_id": "R009",
                "name": "IT Services Form Field",
                "priority": 2,
                "conditions": {
                    "type": "field",
                    "field_name": "product_category",
                    "field_values": ["IT Services", "Software", "Cloud"],
                },
                "category": "IT Services",
                "confidence": 0.90,
            }
        ])
        self.engine = RulesEngine(rules_path=self.rules_path)

    def teardown_method(self):
        os.unlink(self.rules_path)

    def test_field_match_from_structured_fields(self):
        """Rule matches when structured field value matches."""
        doc = make_doc(raw_text="Request", product_category="IT Services")
        matches = self.engine.evaluate(doc)
        assert len(matches) == 1
        assert matches[0].category == "IT Services"

    def test_field_match_from_form_fields(self):
        """Rule matches when form_fields in metadata contain the field."""
        doc = make_doc(raw_text="Request", form_fields={"product_category": "Software"})
        matches = self.engine.evaluate(doc)
        assert len(matches) == 1

    def test_field_match_case_insensitive(self):
        """Field matching is case-insensitive."""
        doc = make_doc(raw_text="Request", product_category="it services")
        matches = self.engine.evaluate(doc)
        assert len(matches) == 1

    def test_field_match_negative(self):
        """Rule does not match when field value is not in the expected list."""
        doc = make_doc(raw_text="Request", product_category="Manufacturing")
        matches = self.engine.evaluate(doc)
        assert len(matches) == 0

    def test_field_no_value(self):
        """Rule does not match when field is not present."""
        doc = make_doc(raw_text="Request")
        matches = self.engine.evaluate(doc)
        assert len(matches) == 0


class TestCompositeRules:
    """Tests for composite (multi-condition) rule evaluation."""

    def setup_method(self):
        """Create a rules engine with composite rules (AND/OR)."""
        self.rules_path = create_temp_rules([
            {
                "rule_id": "C001",
                "name": "Keyword AND Domain",
                "priority": 1,
                "conditions": {
                    "type": "composite",
                    "operator": "AND",
                    "sub_conditions": [
                        {"type": "keyword", "keywords": ["aircraft", "defense"], "min_match": 1},
                        {"type": "domain", "domains": ["boeing.com"]},
                    ],
                },
                "category": "Aerospace & Defense",
                "confidence": 0.98,
            },
            {
                "rule_id": "C002",
                "name": "Keyword OR Domain",
                "priority": 2,
                "conditions": {
                    "type": "composite",
                    "operator": "OR",
                    "sub_conditions": [
                        {"type": "keyword", "keywords": ["medical", "surgical"], "min_match": 1},
                        {"type": "domain", "domains": ["hospital.org"]},
                    ],
                },
                "category": "Healthcare Equipment",
                "confidence": 0.85,
            },
        ])
        self.engine = RulesEngine(rules_path=self.rules_path)

    def teardown_method(self):
        os.unlink(self.rules_path)

    def test_composite_and_both_match(self):
        """AND rule matches when all sub-conditions match."""
        doc = make_doc(raw_text="aircraft parts needed", sender_email="buyer@boeing.com")
        matches = self.engine.evaluate(doc)
        assert any(m.rule_id == "C001" for m in matches)

    def test_composite_and_one_fails(self):
        """AND rule does not match when one sub-condition fails."""
        doc = make_doc(raw_text="aircraft parts needed", sender_email="buyer@gmail.com")
        matches = self.engine.evaluate(doc)
        assert not any(m.rule_id == "C001" for m in matches)

    def test_composite_or_one_matches(self):
        """OR rule matches when at least one sub-condition matches."""
        doc = make_doc(raw_text="medical equipment", sender_email="buyer@gmail.com")
        matches = self.engine.evaluate(doc)
        assert any(m.rule_id == "C002" for m in matches)

    def test_composite_or_other_matches(self):
        """OR rule matches via domain even without keyword match."""
        doc = make_doc(raw_text="general request", sender_email="admin@hospital.org")
        matches = self.engine.evaluate(doc)
        assert any(m.rule_id == "C002" for m in matches)

    def test_composite_or_none_match(self):
        """OR rule does not match when no sub-conditions match."""
        doc = make_doc(raw_text="office supplies", sender_email="buyer@gmail.com")
        matches = self.engine.evaluate(doc)
        assert not any(m.rule_id == "C002" for m in matches)


class TestRulePriority:
    """Tests for rule priority ordering and multi-match behavior."""

    def setup_method(self):
        """Create a rules engine with rules at different priority levels."""
        self.rules_path = create_temp_rules([
            {
                "rule_id": "LOW",
                "name": "Low Priority Metal Match",
                "priority": 3,
                "conditions": {"type": "keyword", "keywords": ["steel"], "min_match": 1},
                "category": "Manufacturing - Metals",
                "confidence": 0.80,
            },
            {
                "rule_id": "HIGH",
                "name": "High Priority Metal Match",
                "priority": 1,
                "conditions": {"type": "keyword", "keywords": ["steel", "aluminum"], "min_match": 2},
                "category": "Manufacturing - Metals",
                "confidence": 0.95,
            },
        ])
        self.engine = RulesEngine(rules_path=self.rules_path)

    def teardown_method(self):
        os.unlink(self.rules_path)

    def test_both_rules_match(self):
        """Both rules match when text satisfies both conditions."""
        doc = make_doc(raw_text="steel and aluminum fabrication")
        matches = self.engine.evaluate(doc)
        assert len(matches) == 2

    def test_matches_sorted_by_confidence(self):
        """Matches are returned sorted by confidence (highest first)."""
        doc = make_doc(raw_text="steel and aluminum fabrication")
        matches = self.engine.evaluate(doc)
        assert matches[0].confidence >= matches[1].confidence

    def test_only_low_priority_matches(self):
        """Only the low-priority rule matches for partial keyword match."""
        doc = make_doc(raw_text="steel beams only")
        matches = self.engine.evaluate(doc)
        assert len(matches) == 1
        assert matches[0].rule_id == "LOW"


class TestRulesEngineWithDefaultConfig:
    """Tests using the actual default rules.yaml configuration."""

    def setup_method(self):
        """Load the real rules config for integration-style unit tests."""
        self.engine = RulesEngine()

    def test_load_default_rules(self):
        """Default rules config loads successfully with multiple rules."""
        assert len(self.engine.rules) > 0

    def test_metals_classification(self):
        """Steel/aluminum text triggers Manufacturing - Metals rules."""
        doc = make_doc(raw_text="We need steel beams and aluminum alloy for CNC machining")
        matches = self.engine.evaluate(doc)
        assert len(matches) > 0
        assert any(m.category == "Manufacturing - Metals" for m in matches)

    def test_it_services_classification(self):
        """Cloud/software text triggers IT Services rules."""
        doc = make_doc(raw_text="Cloud infrastructure migration with software development and SaaS hosting")
        matches = self.engine.evaluate(doc)
        assert any(m.category == "IT Services" for m in matches)

    def test_aerospace_classification(self):
        """Aerospace/defense text triggers Aerospace & Defense rules."""
        doc = make_doc(raw_text="Aircraft avionics components and defense radar systems")
        matches = self.engine.evaluate(doc)
        assert any(m.category == "Aerospace & Defense" for m in matches)

    def test_healthcare_classification(self):
        """Medical device text triggers Healthcare Equipment rules."""
        doc = make_doc(raw_text="Medical device surgical instruments and diagnostic imaging equipment")
        matches = self.engine.evaluate(doc)
        assert any(m.category == "Healthcare Equipment" for m in matches)

    def test_construction_classification(self):
        """Construction materials text triggers Construction Materials rules."""
        doc = make_doc(raw_text="Concrete foundation work with rebar and construction materials delivery")
        matches = self.engine.evaluate(doc)
        assert any(m.category == "Construction Materials" for m in matches)

    def test_electronics_classification(self):
        """PCB/electronics text triggers Manufacturing - Electronics rules."""
        doc = make_doc(raw_text="PCB assembly with circuit board manufacturing and semiconductor components")
        matches = self.engine.evaluate(doc)
        assert any(m.category == "Manufacturing - Electronics" for m in matches)

    def test_professional_services_classification(self):
        """Consulting/advisory text triggers Professional Services rules."""
        doc = make_doc(raw_text="Strategic consulting engagement with advisory services and project management")
        matches = self.engine.evaluate(doc)
        assert any(m.category == "Professional Services" for m in matches)

    def test_no_match_generic_text(self):
        """Generic text with no category keywords gets no high-confidence matches."""
        doc = make_doc(raw_text="Hello, please review this document and respond.")
        matches = self.engine.evaluate(doc)
        # May get low-confidence matches but shouldn't get high-confidence ones
        high_conf = [m for m in matches if m.confidence >= 0.90]
        assert len(high_conf) == 0


class TestRulesEngineReload:
    """Tests for hot-reload functionality."""

    def test_reload_rules(self):
        """Rules can be reloaded from the config file."""
        rules_path = create_temp_rules([
            {
                "rule_id": "R001",
                "name": "Test Rule",
                "priority": 1,
                "conditions": {"type": "keyword", "keywords": ["test"], "min_match": 1},
                "category": "Test",
                "confidence": 0.90,
            }
        ])
        engine = RulesEngine(rules_path=rules_path)
        assert len(engine.rules) == 1

        # Update the file with an additional rule
        with open(rules_path, "w") as f:
            yaml.dump({"rules": [
                {"rule_id": "R001", "name": "Rule 1", "priority": 1, "conditions": {"type": "keyword", "keywords": ["test"], "min_match": 1}, "category": "Test", "confidence": 0.90},
                {"rule_id": "R002", "name": "Rule 2", "priority": 2, "conditions": {"type": "keyword", "keywords": ["hello"], "min_match": 1}, "category": "Hello", "confidence": 0.85},
            ]}, f)

        engine.reload_rules()
        assert len(engine.rules) == 2

        os.unlink(rules_path)
