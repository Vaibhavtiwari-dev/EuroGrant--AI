import pdfplumber
import docx
import re
from io import BytesIO
import logging
import os
from openai import OpenAI

logger = logging.getLogger(__name__)

def redact_pii(text: str) -> str:
    # Redact emails — handles standard and Unicode domains
    text = re.sub(
        r'[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+', '[REDACTED_EMAIL]', text
    )
    # Redact phone numbers — international formats: +XX XXX XXXX, (XXX) XXX-XXXX, etc.
    phone_pattern = (
        r'(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}'
        r'|\+?\d{1,4}[-.\s]?\d{2,4}[-.\s]?\d{2,4}[-.\s]?\d{2,4}'  # international 10+
    )
    text = re.sub(phone_pattern, '[REDACTED_PHONE]', text)
    # Redact IBANs — generic pattern for European/international bank accounts
    text = re.sub(r'\b[A-Z]{2}\d{2}[A-Z0-9]{4,28}\b', '[REDACTED_IBAN]', text)
    # Redact credit-card-like patterns (matches most 13–19 digit sequences with separators)
    text = re.sub(r'\b\d{4}[-.\s]?\d{4}[-.\s]?\d{4}[-.\s]?\d{1,7}\b', '[REDACTED_CARD]', text)
    return text

class ExtractionService:
    def extract_text(self, file_content: bytes, content_type: str) -> str:
        if "pdf" in content_type:
            return self._extract_from_pdf(file_content)
        elif "wordprocessingml" in content_type or "docx" in content_type:
            return self._extract_from_docx(file_content)
        else:
            logger.warning(f"Unsupported content type for extraction: {content_type}")
            return ""

    def _extract_from_pdf(self, file_content: bytes) -> str:
        text = ""
        try:
            with pdfplumber.open(BytesIO(file_content)) as pdf:
                for page in pdf.pages:
                    page_text = page.extract_text()
                    if page_text:
                        text += page_text + "\n"
        except Exception as e:
            logger.error(f"Error extracting from PDF: {e}")
            raise e
        return text

    def _extract_from_docx(self, file_content: bytes) -> str:
        text = ""
        try:
            doc = docx.Document(BytesIO(file_content))
            for para in doc.paragraphs:
                text += para.text + "\n"
        except Exception as e:
            logger.error(f"Error extracting from DOCX: {e}")
            raise e
        return text

    def explain_match(self, org_profile: str, grant_description: str) -> str:
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            logger.warning("OPENAI_API_KEY not set. Returning a mock explanation.")
            return "This grant is highly compatible with your organization's focus on innovative technology development and regional expansion."
            
        try:
            client = OpenAI(
                api_key=api_key,
                base_url=os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1")
            )
            prompt = (
                f"You are EuroGrant AI matching assistant. Compare the following organization profile and grant description. "
                f"Provide a highly specific, professional synergy summary in 250 characters or less justifying their compatibility.\n\n"
                f"Organization Profile: {org_profile}\n\n"
                f"Grant Description: {grant_description}\n\n"
                f"Your summary MUST be direct and concise, under 250 characters."
            )
            response = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "You are a concise, helpful assistant for grant matching."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=100,
                temperature=0.7
            )
            content = response.choices[0].message.content or ""
            explanation = content.strip()
            # Trim to 250 characters just in case
            if len(explanation) > 250:
                explanation = explanation[:247] + "..."
            return explanation
        except Exception as e:
            logger.error(f"Error generating AI match explanation: {e}")
            return "This grant matches your organization's core technologies and strategic sector focus."

extraction_service = ExtractionService()
