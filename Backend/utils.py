
import io
import re
from fastapi import UploadFile, HTTPException, status

def clean_text(s: str) -> str:
    """Cleans raw text by removing excessive newlines, spaces, and hyphenation."""
    if not s:
        return ""
    s = s.replace("\r", "\n")
    s = re.sub(r"-\n(?=\w)", "", s)      # de-hyphenate linebreaks
    s = re.sub(r"\n{3,}", "\n\n", s)     # collapse blank lines
    s = re.sub(r"[ \t]{2,}", " ", s)     # collapse spaces
    return s.strip()

def read_text_from_pdf(pdf_bytes: bytes) -> str:
    """Extracts text from PDF bytes using pypdf."""
    try:
        import pypdf
        bio = io.BytesIO(pdf_bytes)
        reader = pypdf.PdfReader(bio)
        out = [page.extract_text() or "" for page in reader.pages]
        return "".join(out)
    except Exception as e:
        # This makes the error message more user-friendly in the API response
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to extract text from PDF. Error: {e}. Please ensure pypdf is installed."
        )

async def get_text_from_upload(file: UploadFile) -> str:
    """Reads and processes text from an uploaded TXT or PDF file."""
    if not file.filename:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No file provided.")

    file_extension = file.filename.split('.')[-1].lower()
    contents = await file.read()

    if file_extension == 'pdf':
        raw_text = read_text_from_pdf(contents)
    elif file_extension == 'txt':
        raw_text = contents.decode("utf-8", errors="ignore")
    else:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Unsupported file type. Please upload a .txt or .pdf file."
        )

    if not raw_text.strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="The uploaded file contains no text.")

    return clean_text(raw_text)