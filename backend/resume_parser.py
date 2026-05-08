"""Resume Parser — extracts clean text from a PDF using PyMuPDF (fitz)."""
import fitz  # PyMuPDF


def extract_text(pdf_bytes: bytes) -> str:
    """Return clean, normalized text from a PDF given its raw bytes."""
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    pages = [page.get_text("text") for page in doc]
    doc.close()
    raw = "\n".join(pages)
    lines = [line.strip() for line in raw.splitlines() if line.strip()]
    return "\n".join(lines)
