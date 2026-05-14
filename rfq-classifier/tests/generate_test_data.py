"""
Generate synthetic RFQ test data for testing the Classification Agent.
Creates 10 test samples across all input types:
- 3 text-based PDFs
- 2 image-based PDFs (simulated as text PDFs for testing without OCR dependencies)
- 3 email (.eml) files with attachments
- 2 structured JSON forms
"""

import json
import os
from email.mime.application import MIMEApplication
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from pathlib import Path

from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas


def get_test_data_dir() -> Path:
    """Return the test data directory path."""
    base = Path(__file__).parent / "test_data"
    base.mkdir(parents=True, exist_ok=True)
    for sub in ["pdfs", "emails", "forms"]:
        (base / sub).mkdir(exist_ok=True)
    return base


def create_pdf(filepath: str, lines: list[str]) -> None:
    """Create a simple text-based PDF from a list of text lines."""
    c = canvas.Canvas(filepath, pagesize=letter)
    y = 750  # starting y position
    for line in lines:
        c.drawString(72, y, line)
        y -= 15
        if y < 72:
            c.showPage()
            y = 750
    c.save()


def generate_pdf_samples(data_dir: Path) -> None:
    """Generate 5 PDF test samples (3 text-based, 2 simulated scanned)."""

    # PDF 1: Manufacturing - Metals (text-based)
    create_pdf(
        str(data_dir / "pdfs" / "rfq_001_metals.pdf"),
        [
            "REQUEST FOR QUOTATION",
            "RFQ Number: RFQ-2024-001",
            "Date: 2024-03-15",
            "",
            "Company: Apex Manufacturing Corp",
            "Contact: John Smith",
            "Email: procurement@apexmfg.com",
            "",
            "We are requesting quotes for the following metal fabrication services:",
            "",
            "Item 1: Steel beam fabrication",
            "  Material: A36 structural steel",
            "  Quantity: 500 units",
            "  Specifications: W8x31 wide flange beams, 20ft lengths",
            "  Finish: Hot-dip galvanized",
            "",
            "Item 2: Aluminum sheet metal work",
            "  Material: 6061-T6 aluminum alloy",
            "  Quantity: 1000 sheets",
            "  Dimensions: 4ft x 8ft x 0.125in",
            "",
            "Item 3: CNC machining of custom brackets",
            "  Material: 304 stainless steel",
            "  Quantity: 200 pieces",
            "  Tolerances: +/- 0.005in",
            "",
            "Required delivery: Within 6 weeks of PO",
            "Payment terms: Net 30",
            "Please provide unit pricing and lead time for each item.",
        ],
    )

    # PDF 2: IT Services (text-based)
    create_pdf(
        str(data_dir / "pdfs" / "rfq_002_it_services.pdf"),
        [
            "REQUEST FOR QUOTATION - IT SERVICES",
            "RFQ Number: RFQ-2024-002",
            "Date: 2024-03-18",
            "",
            "Organization: TechForward Solutions Inc.",
            "Contact: Sarah Chen, IT Director",
            "Email: sarah.chen@techforward.com",
            "",
            "Project: Cloud Infrastructure Migration",
            "",
            "We seek proposals for migrating our on-premise infrastructure to cloud:",
            "",
            "Scope of Work:",
            "1. Assessment of current IT infrastructure (50 servers, 200 VMs)",
            "2. Design cloud architecture on AWS or Azure",
            "3. Migration of production workloads to cloud infrastructure",
            "4. Implementation of cybersecurity measures and compliance controls",
            "5. Setup of monitoring, logging, and alerting (DevOps tooling)",
            "6. Data center decommissioning support",
            "",
            "Technical Requirements:",
            "- SaaS application hosting capability",
            "- Database migration (Oracle to cloud-native)",
            "- Network architecture with VPN connectivity",
            "- Disaster recovery and backup solutions",
            "",
            "Timeline: 12 months",
            "Budget range: $500K - $1M",
        ],
    )

    # PDF 3: Construction Materials (text-based)
    create_pdf(
        str(data_dir / "pdfs" / "rfq_003_construction.pdf"),
        [
            "REQUEST FOR QUOTATION",
            "RFQ Number: RFQ-2024-003",
            "Date: 2024-03-20",
            "",
            "General Contractor: BuildRight Construction LLC",
            "Project: Riverside Commercial Center Phase 2",
            "Contact: Mike Johnson, Project Manager",
            "Email: mike.j@buildright.com",
            "",
            "Materials Required:",
            "",
            "1. Ready-mix concrete",
            "   Grade: 4000 PSI",
            "   Volume: 2,500 cubic yards",
            "   Delivery: Continuous pour, 200 CY/day minimum",
            "",
            "2. Rebar (reinforcing steel)",
            "   Grade 60, #4 through #8",
            "   Quantity: 150 tons",
            "   Cut and bent per structural drawings",
            "",
            "3. Structural steel columns and beams",
            "   W-shapes per structural schedule",
            "   Quantity: 75 tons",
            "   Fabricated and painted",
            "",
            "4. Building insulation",
            "   R-30 fiberglass batts",
            "   Coverage: 45,000 sq ft",
            "",
            "Site delivery required. Foundation work begins April 15.",
            "All materials must meet local building code requirements.",
        ],
    )

    # PDF 4: Aerospace & Defense (simulated scanned - still text for testing)
    create_pdf(
        str(data_dir / "pdfs" / "rfq_004_aerospace.pdf"),
        [
            "DEFENSE PROCUREMENT REQUEST",
            "Document: DPR-2024-0456",
            "Classification: UNCLASSIFIED",
            "",
            "Requesting Agency: US Air Force - Wright-Patterson AFB",
            "Contact: Col. Robert Davis",
            "Email: robert.davis@us.af.mil",
            "",
            "Subject: Aircraft Component Machining Services",
            "",
            "Requirements:",
            "1. Precision machining of turbine blade assemblies",
            "   Material: Inconel 718 aerospace alloy",
            "   Quantity: 50 sets",
            "   AS9100 certification required",
            "",
            "2. Avionics mounting brackets",
            "   Material: 7075-T6 aluminum (aircraft grade)",
            "   Quantity: 200 units",
            "   MIL-SPEC finish requirements",
            "",
            "3. Landing gear actuator housings",
            "   Material: Ti-6Al-4V titanium alloy",
            "   Quantity: 25 assemblies",
            "   NADCAP certified processes required",
            "",
            "All suppliers must have active ITAR registration.",
            "Delivery to Wright-Patterson AFB within 90 days of award.",
            "Defense Federal Acquisition Regulation (DFAR) clauses apply.",
        ],
    )

    # PDF 5: Healthcare Equipment (simulated scanned - still text for testing)
    create_pdf(
        str(data_dir / "pdfs" / "rfq_005_healthcare.pdf"),
        [
            "REQUEST FOR QUOTATION - MEDICAL EQUIPMENT",
            "RFQ-MED-2024-005",
            "Date: 2024-04-01",
            "",
            "Hospital: St. Mary's Regional Medical Center",
            "Department: Biomedical Engineering",
            "Contact: Dr. Lisa Park, Department Head",
            "Email: lpark@stmarys-medical.org",
            "",
            "Equipment Request:",
            "",
            "1. Portable Diagnostic Ultrasound System",
            "   - High-resolution imaging capability",
            "   - Cardiac and abdominal probes included",
            "   - Quantity: 5 units",
            "",
            "2. Patient Monitoring Systems",
            "   - 12-lead ECG, SpO2, NIBP, Temperature",
            "   - Bedside and central station connectivity",
            "   - Quantity: 20 units",
            "",
            "3. Surgical Instrument Sterilization System",
            "   - Steam autoclave, 20x20x38 inch chamber",
            "   - FDA 510(k) cleared",
            "   - Quantity: 2 units",
            "",
            "All equipment must be FDA approved and comply with",
            "Joint Commission standards. Installation and training included.",
            "Warranty: Minimum 3 years parts and labor.",
        ],
    )


def generate_email_samples(data_dir: Path) -> None:
    """Generate 3 email (.eml) test samples with attachments."""

    # Email 1: Manufacturing - Electronics (PCB assembly)
    msg = MIMEMultipart()
    msg["From"] = "James Wilson <james.wilson@circuitpro.com>"
    msg["To"] = "procurement@ourcompany.com"
    msg["Subject"] = "RFQ: PCB Assembly and Electronic Component Manufacturing"
    msg["Date"] = "Mon, 25 Mar 2024 10:30:00 -0500"

    body = """Dear Procurement Team,

We are requesting a quotation for the following electronic assembly services:

1. PCB Assembly (SMT and Through-Hole)
   - Board: 6-layer FR4, 1.6mm thickness
   - Components: 450 SMD + 25 through-hole per board
   - Quantity: 5,000 assembled boards
   - BOM attached (see PDF attachment)

2. Custom Semiconductor Testing
   - IC testing and burn-in services
   - 10,000 units of our proprietary ASIC
   - Test fixture provided

3. LED Driver Module Assembly
   - Complete box build with enclosure
   - Integrated circuit board with LED driver IC
   - Quantity: 2,000 modules

All assemblies must meet IPC Class 2 standards.
Please quote with soldering, AOI inspection, and functional testing included.

Vendor: CircuitPro Electronics
P/N: CP-PCB-2024-001
MPN: TPS54360DDA

Best regards,
James Wilson
CircuitPro Electronics Inc.
"""
    msg.attach(MIMEText(body, "plain"))

    # Create and attach a small PDF (BOM document)
    bom_pdf_path = str(data_dir / "emails" / "bom_temp.pdf")
    create_pdf(bom_pdf_path, [
        "Bill of Materials - PCB Assembly",
        "Part Number: CP-PCB-2024-001",
        "Resistors: 200x 10K ohm 0402",
        "Capacitors: 150x 100nF 0402",
        "ICs: 5x STM32F407VGT6",
        "Connectors: 10x USB-C",
    ])
    with open(bom_pdf_path, "rb") as f:
        pdf_attachment = MIMEApplication(f.read(), _subtype="pdf")
        pdf_attachment.add_header("Content-Disposition", "attachment", filename="BOM_CP_PCB_2024.pdf")
        msg.attach(pdf_attachment)
    os.unlink(bom_pdf_path)

    with open(data_dir / "emails" / "rfq_006_electronics.eml", "w") as f:
        f.write(msg.as_string())

    # Email 2: Professional Services (consulting)
    msg2 = MIMEMultipart()
    msg2["From"] = "Amanda Torres <amanda.torres@globalstrategy.com>"
    msg2["To"] = "rfq@ourcompany.com"
    msg2["Subject"] = "RFQ: Strategic Consulting and Advisory Services Engagement"
    msg2["Date"] = "Wed, 27 Mar 2024 14:15:00 -0400"

    body2 = """Dear Team,

Global Strategy Partners is requesting proposals for a strategic consulting engagement:

Project Overview:
We need advisory and professional services support for our digital transformation initiative.

Scope of Services:
1. Strategic Assessment and Planning
   - Current state analysis of business processes
   - Digital maturity assessment
   - Roadmap development and project management

2. Change Management Consulting
   - Stakeholder analysis and communication strategy
   - Training program design and delivery
   - Organizational readiness assessment

3. Compliance and Audit Support
   - Regulatory compliance review (SOX, GDPR)
   - Internal audit support
   - Risk assessment and mitigation planning

Duration: 6-month engagement with option to extend
Team Required: 1 Partner, 2 Senior Consultants, 2 Analysts
Start Date: May 1, 2024

Please provide staffing plan, rate card, and total project estimate.

Best regards,
Amanda Torres
VP of Strategy
Global Strategy Partners LLC
"""
    msg2.attach(MIMEText(body2, "plain"))

    with open(data_dir / "emails" / "rfq_007_consulting.eml", "w") as f:
        f.write(msg2.as_string())

    # Email 3: Aerospace & Defense (radar components)
    msg3 = MIMEMultipart()
    msg3["From"] = "David Kim <d.kim@raytheon-defense.com>"
    msg3["To"] = "defense.rfq@ourcompany.com"
    msg3["Subject"] = "RFQ: Radar System Components and Military Electronics"
    msg3["Date"] = "Fri, 29 Mar 2024 09:00:00 -0500"

    body3 = """CONTROLLED UNCLASSIFIED INFORMATION

Subject: Request for Quotation - Defense Radar System Components

Dear Supplier,

We are soliciting quotes for the following defense radar system components:

1. Phased Array Antenna Elements
   - X-band frequency range (8-12 GHz)
   - Material: Gallium Arsenide (GaAs)
   - Quantity: 1,024 elements
   - MIL-STD-810 environmental rating

2. Radar Signal Processing Modules
   - FPGA-based signal processor boards
   - Real-time target detection algorithms
   - Quantity: 16 modules
   - ITAR controlled technology

3. Satellite Communication Interface Units
   - Ka-band uplink/downlink capability
   - Military-grade encryption support
   - Quantity: 8 units

All items are defense articles subject to ITAR/EAR export controls.
Suppliers must have active facility security clearance.
AS9100 quality management system certification required.

Award timeline: Q3 2024
Delivery: Q1 2025 to our Tucson, AZ facility

Regards,
David Kim
Procurement Manager - Defense Systems Division

Vendor Number: VN-44892
Material Number: MAT-RADAR-2024-001
Unit Price: To be quoted
Currency: USD
"""
    msg3.attach(MIMEText(body3, "plain"))

    with open(data_dir / "emails" / "rfq_008_defense_radar.eml", "w") as f:
        f.write(msg3.as_string())


def generate_form_samples(data_dir: Path) -> None:
    """Generate 2 structured JSON form test samples."""

    # Form 1: IT Services (software development)
    form1 = {
        "rfq_id": "FORM-2024-009",
        "subject": "Software Development Services for ERP Modernization",
        "company_name": "Acme Corp",
        "contact_email": "it.procurement@acme-corp.com",
        "product_category": "IT Services",
        "description": (
            "We require software development services to modernize our legacy ERP system. "
            "The project involves migrating from an on-premise Oracle database to a cloud-native "
            "microservices architecture. Key deliverables include: API gateway implementation, "
            "database migration to PostgreSQL on AWS, frontend redesign using React, "
            "CI/CD pipeline setup with DevOps best practices, and comprehensive testing. "
            "The project will also include cloud hosting setup and network configuration."
        ),
        "requirements": (
            "- 3+ years experience with cloud migration projects\n"
            "- AWS or Azure certified architects\n"
            "- Experience with ERP systems (SAP, Oracle)\n"
            "- Agile/Scrum methodology\n"
            "- SOC 2 compliance capability"
        ),
        "quantity": "1 project",
        "product_keywords": ["software", "cloud", "ERP", "migration", "DevOps", "API"],
        "budget_range": "$200K - $500K",
        "timeline": "9 months",
    }

    with open(data_dir / "forms" / "rfq_009_it_services.json", "w") as f:
        json.dump(form1, f, indent=2)

    # Form 2: Manufacturing - Metals (custom stamping)
    form2 = {
        "rfq_id": "FORM-2024-010",
        "subject": "Custom Metal Stamping and Sheet Metal Fabrication",
        "company_name": "PrecisionStamp Industries",
        "contact_email": "quotes@precisionstamp.com",
        "product_category": "Manufacturing",
        "description": (
            "Request for quotation for custom metal stamping services. "
            "We need progressive die stamping of steel and aluminum automotive brackets. "
            "Parts require precision metal fabrication including blanking, forming, and piercing. "
            "Material specs: ASTM A1008 cold-rolled steel and 5052-H32 aluminum alloy. "
            "All parts must undergo CNC machining for final dimensions and tolerances."
        ),
        "specifications": (
            "Part A: Steel bracket, 0.060\" thick, 15 operations\n"
            "Part B: Aluminum heat sink, 0.090\" thick, 12 operations\n"
            "Part C: Steel mounting plate, 0.125\" thick, 8 operations\n"
            "Tolerances: +/- 0.003\"\n"
            "Surface finish: As-stamped with deburring"
        ),
        "quantity": "50,000 pieces per part number (annual volume)",
        "product_keywords": ["stamping", "steel", "aluminum", "metal fabrication", "CNC"],
        "vendor_name": "PrecisionStamp Industries",
        "material_number": "MAT-STAMP-2024-A01",
    }

    with open(data_dir / "forms" / "rfq_010_metal_stamping.json", "w") as f:
        json.dump(form2, f, indent=2)


def generate_expected_results(data_dir: Path) -> None:
    """Generate expected classification results for validation."""
    expected = {
        "rfq_001_metals.pdf": {
            "expected_category": "Manufacturing - Metals",
            "input_type": "pdf",
            "min_confidence": 0.75,
        },
        "rfq_002_it_services.pdf": {
            "expected_category": "IT Services",
            "input_type": "pdf",
            "min_confidence": 0.75,
        },
        "rfq_003_construction.pdf": {
            "expected_category": "Construction Materials",
            "input_type": "pdf",
            "min_confidence": 0.75,
        },
        "rfq_004_aerospace.pdf": {
            "expected_category": "Aerospace & Defense",
            "input_type": "pdf",
            "min_confidence": 0.75,
        },
        "rfq_005_healthcare.pdf": {
            "expected_category": "Healthcare Equipment",
            "input_type": "pdf",
            "min_confidence": 0.75,
        },
        "rfq_006_electronics.eml": {
            "expected_category": "Manufacturing - Electronics",
            "input_type": "email",
            "min_confidence": 0.75,
        },
        "rfq_007_consulting.eml": {
            "expected_category": "Professional Services",
            "input_type": "email",
            "min_confidence": 0.75,
        },
        "rfq_008_defense_radar.eml": {
            "expected_category": "Aerospace & Defense",
            "input_type": "email",
            "min_confidence": 0.75,
        },
        "rfq_009_it_services.json": {
            "expected_category": "IT Services",
            "input_type": "form",
            "min_confidence": 0.75,
        },
        "rfq_010_metal_stamping.json": {
            "expected_category": "Manufacturing - Metals",
            "input_type": "form",
            "min_confidence": 0.75,
        },
    }

    with open(data_dir / "expected.json", "w") as f:
        json.dump(expected, f, indent=2)


if __name__ == "__main__":
    data_dir = get_test_data_dir()
    print(f"Generating test data in: {data_dir}")
    generate_pdf_samples(data_dir)
    generate_email_samples(data_dir)
    generate_form_samples(data_dir)
    generate_expected_results(data_dir)
    print("Test data generation complete!")
    print(f"  PDFs: {len(list((data_dir / 'pdfs').glob('*.pdf')))} files")
    print(f"  Emails: {len(list((data_dir / 'emails').glob('*.eml')))} files")
    print(f"  Forms: {len(list((data_dir / 'forms').glob('*.json')))} files")
    print(f"  Expected results: {data_dir / 'expected.json'}")
