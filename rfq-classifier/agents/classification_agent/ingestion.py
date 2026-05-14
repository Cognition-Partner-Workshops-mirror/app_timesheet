"""
Ingestion layer for the Classification Agent.
Handles PDF, email (.eml), and structured form (JSON/CSV) inputs,
normalizing them into RFQDocument objects for downstream classification.
"""

import csv
import email
import json
import os
import re
import tempfile
import uuid
from email import policy
from pathlib import Path

from shared.models import InputSource, RFQDocument, StructuredFields
from shared.utils.logger import setup_logger

logger = setup_logger(__name__)

# Minimum character threshold below which we assume the PDF is scanned/image-based
MIN_TEXT_LENGTH = 50


class PDFHandler:
    """
    Handles PDF ingestion by extracting text content.
    Tries pdfplumber first for text-based PDFs, falls back to OCR for scanned documents.
    OCR backend is configurable: pytesseract (local) or Azure Document Intelligence.
    """

    def __init__(self, ocr_provider: str | None = None):
        """
        Initialize the PDF handler.

        Args:
            ocr_provider: OCR backend - 'pytesseract' or 'azure_di'.
                          Falls back to OCR_PROVIDER env var, then 'pytesseract'.
        """
        self.ocr_provider = ocr_provider or os.environ.get("OCR_PROVIDER", "pytesseract")

    def ingest(self, file_path: str, rfq_id: str | None = None) -> RFQDocument:
        """
        Ingest a PDF file and return a normalized RFQDocument.

        Args:
            file_path: Path to the PDF file
            rfq_id: Optional RFQ identifier. Auto-generated if not provided.

        Returns:
            RFQDocument with extracted text and metadata
        """
        rfq_id = rfq_id or f"PDF-{uuid.uuid4().hex[:8]}"
        file_path = str(Path(file_path).resolve())

        logger.info(
            "Ingesting PDF file",
            extra={"rfq_id": rfq_id, "event": "pdf_ingestion_start", "details": {"file": file_path}},
        )

        # Try pdfplumber text extraction first (fast path for text-based PDFs)
        text = self._extract_text_pdfplumber(file_path)
        metadata = {
            "file_path": file_path,
            "file_name": Path(file_path).name,
            "extraction_method": "pdfplumber",
        }

        # Fall back to OCR if text extraction yielded insufficient content
        if len(text.strip()) < MIN_TEXT_LENGTH:
            logger.info(
                "Text extraction insufficient, falling back to OCR",
                extra={
                    "rfq_id": rfq_id,
                    "event": "ocr_fallback",
                    "details": {"text_length": len(text.strip()), "ocr_provider": self.ocr_provider},
                },
            )
            ocr_text = self._extract_text_ocr(file_path)
            if ocr_text and len(ocr_text.strip()) > len(text.strip()):
                text = ocr_text
                metadata["extraction_method"] = f"ocr_{self.ocr_provider}"

        # Flag if no text could be extracted at all
        if not text.strip():
            logger.warning(
                "No text extracted from PDF - flagging for manual review",
                extra={"rfq_id": rfq_id, "event": "ocr_failed"},
            )
            metadata["ocr_failed"] = True

        logger.info(
            "PDF ingestion complete",
            extra={
                "rfq_id": rfq_id,
                "event": "pdf_ingestion_complete",
                "details": {"text_length": len(text), "method": metadata["extraction_method"]},
            },
        )

        return RFQDocument(
            rfq_id=rfq_id,
            source=InputSource.PDF,
            raw_text=text,
            structured_fields=StructuredFields(attachment_names=[Path(file_path).name]),
            metadata=metadata,
        )

    def _extract_text_pdfplumber(self, file_path: str) -> str:
        """Extract text from a text-based PDF using pdfplumber."""
        try:
            import pdfplumber

            text_parts = []
            with pdfplumber.open(file_path) as pdf:
                for page in pdf.pages:
                    page_text = page.extract_text()
                    if page_text:
                        text_parts.append(page_text)
            return "\n".join(text_parts)
        except Exception as e:
            logger.error(
                f"pdfplumber extraction failed: {e}",
                extra={"event": "pdfplumber_error", "details": {"error": str(e)}},
            )
            return ""

    def _extract_text_ocr(self, file_path: str) -> str:
        """Delegate OCR to the configured provider (pytesseract or Azure DI)."""
        if self.ocr_provider == "azure_di":
            return self._ocr_azure_di(file_path)
        return self._ocr_pytesseract(file_path)

    def _ocr_pytesseract(self, file_path: str) -> str:
        """Perform OCR using pytesseract + pdf2image (local fallback)."""
        try:
            import pytesseract
            from pdf2image import convert_from_path

            images = convert_from_path(file_path)
            text_parts = []
            for image in images:
                page_text = pytesseract.image_to_string(image)
                if page_text.strip():
                    text_parts.append(page_text)
            return "\n".join(text_parts)
        except Exception as e:
            logger.error(
                f"pytesseract OCR failed: {e}",
                extra={"event": "pytesseract_error", "details": {"error": str(e)}},
            )
            return ""

    def _ocr_azure_di(self, file_path: str) -> str:
        """Perform OCR using Azure Document Intelligence (production path)."""
        try:
            from azure.ai.formrecognizer import DocumentAnalysisClient
            from azure.core.credentials import AzureKeyCredential

            endpoint = os.environ.get("AZURE_DI_ENDPOINT")
            key = os.environ.get("AZURE_DI_KEY")

            if not endpoint or not key:
                logger.warning(
                    "Azure DI credentials not configured, falling back to pytesseract",
                    extra={"event": "azure_di_no_credentials"},
                )
                return self._ocr_pytesseract(file_path)

            client = DocumentAnalysisClient(
                endpoint=endpoint,
                credential=AzureKeyCredential(key),
            )
            with open(file_path, "rb") as f:
                poller = client.begin_analyze_document("prebuilt-read", f)
                result = poller.result()

            text_parts = []
            for page in result.pages:
                for line in page.lines:
                    text_parts.append(line.content)
            return "\n".join(text_parts)
        except Exception as e:
            logger.error(
                f"Azure DI OCR failed: {e}",
                extra={"event": "azure_di_error", "details": {"error": str(e)}},
            )
            return self._ocr_pytesseract(file_path)


class EmailHandler:
    """
    Handles email (.eml) file ingestion by parsing headers, body, and attachments.
    PDF attachments are recursively processed via PDFHandler for text extraction.
    """

    def __init__(self, ocr_provider: str | None = None):
        """
        Initialize the email handler.

        Args:
            ocr_provider: OCR provider passed to PDFHandler for attachment processing.
        """
        self.ocr_provider = ocr_provider or os.environ.get("OCR_PROVIDER", "pytesseract")

    def ingest(self, file_path: str, rfq_id: str | None = None) -> RFQDocument:
        """
        Ingest an email (.eml) file and return a normalized RFQDocument.

        Args:
            file_path: Path to the .eml file
            rfq_id: Optional RFQ identifier. Auto-generated if not provided.

        Returns:
            RFQDocument with extracted email body, headers, and attachment text
        """
        rfq_id = rfq_id or f"EMAIL-{uuid.uuid4().hex[:8]}"

        logger.info(
            "Ingesting email file",
            extra={"rfq_id": rfq_id, "event": "email_ingestion_start", "details": {"file": file_path}},
        )

        # Parse the .eml file
        with open(file_path, "r", encoding="utf-8", errors="replace") as f:
            msg = email.message_from_file(f, policy=policy.default)

        # Extract headers
        subject = str(msg.get("Subject", ""))
        sender = str(msg.get("From", ""))
        date = str(msg.get("Date", ""))
        sender_email = self._extract_email_address(sender)

        # Extract body (prefer plain text over HTML)
        body_text = self._extract_body(msg)

        # Process attachments
        attachment_names = []
        attachment_texts = []
        for part in msg.walk():
            content_disposition = str(part.get("Content-Disposition", ""))
            if "attachment" in content_disposition:
                filename = part.get_filename()
                if filename:
                    attachment_names.append(filename)
                    attachment_text = self._process_attachment(part, filename, rfq_id)
                    if attachment_text:
                        attachment_texts.append(f"[Attachment: {filename}]\n{attachment_text}")

        # Combine body + attachment text
        full_text_parts = [body_text] if body_text else []
        full_text_parts.extend(attachment_texts)
        full_text = "\n\n".join(full_text_parts)

        logger.info(
            "Email ingestion complete",
            extra={
                "rfq_id": rfq_id,
                "event": "email_ingestion_complete",
                "details": {"subject": subject, "attachments": len(attachment_names), "text_length": len(full_text)},
            },
        )

        return RFQDocument(
            rfq_id=rfq_id,
            source=InputSource.EMAIL,
            raw_text=full_text,
            structured_fields=StructuredFields(
                sender_email=sender_email,
                subject=subject,
                attachment_names=attachment_names,
            ),
            metadata={
                "file_path": file_path,
                "sender": sender,
                "date": date,
                "subject": subject,
                "attachment_count": len(attachment_names),
                "has_body": bool(body_text),
            },
        )

    def _extract_email_address(self, sender: str) -> str:
        """Extract email address from 'Display Name <email@example.com>' format."""
        if "<" in sender and ">" in sender:
            return sender[sender.index("<") + 1 : sender.index(">")]
        return sender.strip()

    def _extract_body(self, msg: email.message.Message) -> str:
        """Extract plain text body from email, falling back to HTML with tag stripping."""
        if msg.is_multipart():
            plain_text = ""
            html_text = ""
            for part in msg.walk():
                content_type = part.get_content_type()
                content_disposition = str(part.get("Content-Disposition", ""))
                if "attachment" in content_disposition:
                    continue
                try:
                    payload = part.get_content()
                    if isinstance(payload, str):
                        if content_type == "text/plain":
                            plain_text = payload
                        elif content_type == "text/html":
                            html_text = payload
                except Exception:
                    continue
            return plain_text if plain_text else self._strip_html(html_text)
        else:
            try:
                payload = msg.get_content()
                if isinstance(payload, str):
                    if msg.get_content_type() == "text/html":
                        return self._strip_html(payload)
                    return payload
            except Exception:
                return ""
        return ""

    def _strip_html(self, html: str) -> str:
        """Remove HTML tags to get plain text content."""
        if not html:
            return ""
        text = re.sub(r"<[^>]+>", " ", html)
        text = re.sub(r"\s+", " ", text)
        return text.strip()

    def _process_attachment(self, part: email.message.Message, filename: str, rfq_id: str) -> str:
        """Process a PDF email attachment and extract its text content."""
        if not filename.lower().endswith(".pdf"):
            logger.info(f"Skipping non-PDF attachment: {filename}", extra={"rfq_id": rfq_id, "event": "skip_attachment"})
            return ""

        tmp_path = None
        try:
            payload = part.get_payload(decode=True)
            if not payload:
                return ""
            with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
                tmp.write(payload)
                tmp_path = tmp.name

            pdf_handler = PDFHandler(ocr_provider=self.ocr_provider)
            pdf_doc = pdf_handler.ingest(tmp_path, rfq_id=f"{rfq_id}-att")
            return pdf_doc.raw_text
        except Exception as e:
            logger.error(f"Failed to process attachment {filename}: {e}", extra={"rfq_id": rfq_id, "event": "attachment_error"})
            return ""
        finally:
            if tmp_path:
                try:
                    os.unlink(tmp_path)
                except OSError:
                    pass


class FormHandler:
    """
    Handles structured form ingestion from JSON and CSV files.
    Maps form fields to the normalized RFQDocument format.
    """

    def ingest(self, file_path: str, rfq_id: str | None = None) -> RFQDocument:
        """
        Ingest a structured form (JSON or CSV) and return a normalized RFQDocument.

        Args:
            file_path: Path to the JSON or CSV file
            rfq_id: Optional RFQ identifier. Auto-generated if not provided.

        Returns:
            RFQDocument with mapped form fields
        """
        rfq_id = rfq_id or f"FORM-{uuid.uuid4().hex[:8]}"
        file_ext = Path(file_path).suffix.lower()

        logger.info(
            "Ingesting form file",
            extra={"rfq_id": rfq_id, "event": "form_ingestion_start", "details": {"file": file_path, "type": file_ext}},
        )

        if file_ext == ".json":
            return self._ingest_json(file_path, rfq_id)
        elif file_ext == ".csv":
            return self._ingest_csv(file_path, rfq_id)
        else:
            raise ValueError(f"Unsupported form file type: {file_ext}. Expected .json or .csv")

    def ingest_dict(self, data: dict, rfq_id: str | None = None) -> RFQDocument:
        """Ingest a form directly from a Python dictionary."""
        rfq_id = rfq_id or f"FORM-{uuid.uuid4().hex[:8]}"
        return self._map_dict_to_document(data, rfq_id, source_file="direct_dict")

    def _ingest_json(self, file_path: str, rfq_id: str) -> RFQDocument:
        """Parse a JSON file and map its fields to an RFQDocument."""
        with open(file_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        return self._map_dict_to_document(data, rfq_id, source_file=file_path)

    def _ingest_csv(self, file_path: str, rfq_id: str) -> RFQDocument:
        """Parse a CSV file (first row) and map its fields to an RFQDocument."""
        with open(file_path, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            rows = list(reader)
        if not rows:
            raise ValueError(f"CSV file is empty: {file_path}")
        return self._map_dict_to_document(dict(rows[0]), rfq_id, source_file=file_path)

    def _map_dict_to_document(self, data: dict, rfq_id: str, source_file: str) -> RFQDocument:
        """Map a dictionary of form fields to an RFQDocument."""
        # Build raw_text from text fields for classification
        text_parts = []
        for key in ["subject", "title", "rfq_title"]:
            if key in data and data[key]:
                text_parts.append(str(data[key]))
        for key in ["description", "rfq_text", "requirements", "specifications", "item_description", "notes"]:
            if key in data and data[key]:
                text_parts.append(str(data[key]))
        raw_text = "\n".join(text_parts)

        # Extract product keywords
        product_keywords = []
        if "product_keywords" in data and isinstance(data["product_keywords"], list):
            product_keywords = data["product_keywords"]
        elif "keywords" in data and isinstance(data["keywords"], list):
            product_keywords = data["keywords"]

        structured_fields = StructuredFields(
            sender_email=data.get("sender_email") or data.get("email") or data.get("contact_email"),
            subject=data.get("subject") or data.get("title") or data.get("rfq_title"),
            company_name=data.get("company_name") or data.get("company") or data.get("vendor_name"),
            product_keywords=product_keywords,
            product_category=data.get("product_category") or data.get("category"),
            quantity=data.get("quantity"),
        )

        logger.info(
            "Form ingestion complete",
            extra={"rfq_id": rfq_id, "event": "form_ingestion_complete", "details": {"fields": len(data), "text_length": len(raw_text)}},
        )

        return RFQDocument(
            rfq_id=rfq_id,
            source=InputSource.FORM,
            raw_text=raw_text,
            structured_fields=structured_fields,
            metadata={"source_file": source_file, "form_fields": data},
        )
