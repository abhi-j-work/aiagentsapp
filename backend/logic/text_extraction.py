import io
import re
import pypdf

def clean_text(s: str) -> str:
    """
    Cleans a string by removing unwanted characters and formatting.
    """
    if not s:
        return ""
    s = s.replace("\r", "\n")
    s = re.sub(r"-\n(?=\w)", "", s)      # de-hyphenate linebreaks
    s = re.sub(r"\n{3,}", "\n\n", s)     # collapse blank lines
    s = re.sub(r"[ \t]{2,}", " ", s)     # collapse spaces
    return s.strip()

def read_pdf(pdf_bytes: bytes) -> str:
    """
    Extracts text from PDF bytes using pypdf.
    """
    bio = io.BytesIO(pdf_bytes)
    try:
        reader = pypdf.PdfReader(bio)
        out = []
        for page in reader.pages:
            try:
                out.append(page.extract_text() or "")
            except Exception:
                out.append("")
        return "".join(out)
    except Exception as e:
        # If pypdf fails, we could add fallbacks here if other libraries were installed.
        raise RuntimeError(f"Could not extract text from PDF with pypdf: {e}")
