import io
from typing import Optional

def extract_text_from_pdf(pdf_bytes: bytes) -> Optional[str]:
    """
    Extracts text from PDF bytes using PyMuPDF (fitz), which is more
    robust than pypdf for complex layouts.
    """
    try:
        import fitz  # PyMuPDF
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        text = ""
        for page in doc:
            text += page.get_text()
        doc.close()
        return text
    except Exception as e:
        print(f"Error extracting text with PyMuPDF: {e}")
        # Fallback or raise exception
        return None
