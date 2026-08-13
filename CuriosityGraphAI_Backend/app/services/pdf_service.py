from pathlib import Path

# New (same API, new module name; falls back for older PyMuPDF)
try:
    import pymupdf as fitz
except ImportError:
    import fitz

from app.core.exceptions import NoExtractableTextError, PDFProcessingError


def validate_pdf_bytes(data: bytes) -> int:
    """
    Validate that the uploaded bytes are a readable PDF.
    Returns the real page count.
    """
    if not data:
        raise PDFProcessingError("Uploaded file is empty.")

    try:
        doc = fitz.open(stream=data, filetype="pdf")
    except Exception as exc:
        raise PDFProcessingError("The uploaded file could not be parsed as a PDF.") from exc

    page_count = doc.page_count
    doc.close()

    if page_count == 0:
        raise PDFProcessingError("The PDF contains no pages.")

    return page_count


def extract_pages(file_path: Path) -> list[tuple[int, str]]:
    """
    Extract text page-by-page from a stored PDF.

    Returns:
        [(page_number, page_text), ...]

    Raises:
        PDFProcessingError if the PDF cannot be opened.
        NoExtractableTextError if no text exists anywhere in the PDF.
    """
    try:
        doc = fitz.open(str(file_path))
    except Exception as exc:
        raise PDFProcessingError("Could not open the stored PDF.") from exc

    if doc.is_encrypted:
        doc.close()
        raise PDFProcessingError("Encrypted PDFs are not supported.")

    if doc.page_count == 0:
        doc.close()
        raise PDFProcessingError("The PDF contains no pages.")

    pages: list[tuple[int, str]] = []
    total_text_length = 0

    for page in doc:
        text = page.get_text("text") or ""
        text = text.strip()

        pages.append((page.number + 1, text))
        total_text_length += len(text)

    doc.close()

    if total_text_length == 0:
        raise NoExtractableTextError(
            "The PDF contains no extractable text. "
            "It may be scanned or image-only."
        )

    return pages