import pdfplumber
import docx
import re
from io import BytesIO
import logging
import os
from openai import OpenAI

logger = logging.getLogger(__name__)

def redact_pii(text: str) -> str:
    # Redact Emails
    text = re.sub(r'[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+', '[REDACTED_EMAIL]', text)
    # Redact Phone numbers (more specific pattern: + followed by 7-15 digits, or standard formats)
    # Matches patterns like +1234567890, (123) 456-7890, 123-456-7890
    phone_pattern = r'(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}'
    text = re.sub(phone_pattern, '[REDACTED_PHONE]', text)
    return text

class ExtractionService:
    def __init__(self):
        self.openai_client = OpenAI(
            api_key=os.getenv("OPENAI_API_KEY"),
            base_url=os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1")
        )

    def extract_text(self, file_content: bytes, content_type: str) -> str:
        if "pdf" in content_type:
            return self._extract_from_pdf(file_content)
        elif "wordprocessingml" in content_type or "docx" in content_type:
            return self._extract_from_docx(file_content)
        else:
            logger.warning(f"Unsupported content type for extraction: {content_type}")
            return ""

    def explain_match(self, org_profile: str, grant_description: str) -> str:
        prompt = f"""
        Compare the following company profile and grant description to explain why they match.
        Focus on specific synergies (e.g., sector alignment, technology fit, operation location).
        
        Company Profile:
        {org_profile}
        
        Grant Description:
        {grant_description}
        
        Your response must be extremely concise and explain the compatibility in 250 characters or less.
        Do not use prefix phrases like "Matched because" or "This matches because". Start directly with the justification.
        """
        try:
            response = self.openai_client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "user", "content": prompt}],
                max_tokens=100
            )
            explanation = response.choices[0].message.content.strip()
            # Enforce 250-character limit strictly (truncate if necessary but try to get the LLM to respect it)
            if len(explanation) > 250:
                explanation = explanation[:247] + "..."
            return explanation
        except Exception as e:
            logger.error(f"Failed to generate match explanation: {e}")
            return "Potential match based on sector alignment."


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

extraction_service = ExtractionService()
