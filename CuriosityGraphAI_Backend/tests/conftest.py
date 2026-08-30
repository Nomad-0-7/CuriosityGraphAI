import os
import sys
import tempfile
import textwrap
from pathlib import Path

# Ensure backend root is importable.
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

# Test-specific environment must be set BEFORE importing the app.
TEST_DATA_DIR = tempfile.mkdtemp(prefix="curiositygraphai-test-")

os.environ["DATA_DIR"] = TEST_DATA_DIR
os.environ["INGESTION_SYNC"] = "true"
os.environ["RETRIEVAL_MIN_SCORE"] = "0.0"
os.environ["LLM_PROVIDER"] = ""
os.environ["LLM_MODEL"] = ""
os.environ["OPENAI_API_KEY"] = ""
os.environ["GOOGLE_API_KEY"] = ""

# New (same API, new module name; falls back for older PyMuPDF)
try:
    import pymupdf as fitz
except ImportError:
    import fitz
import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.database.connection import Base, SessionLocal, engine  # noqa: E402
from app.main import app  # noqa: E402
from app.models import ChatMessage, ChatThread, Document, DocumentChunk  # noqa: E402
from app.services.settings_service import settings_manager  # noqa: E402


@pytest.fixture(scope="session", autouse=True)
def create_database():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture(autouse=True)
def clean_state():
    yield

    db = SessionLocal()
    try:
        db.query(ChatMessage).delete()
        db.query(ChatThread).delete()
        db.query(DocumentChunk).delete()
        db.query(Document).delete()
        db.commit()
    finally:
        db.close()

    settings_manager.reset()


@pytest.fixture()
def client():
    with TestClient(app) as test_client:
        yield test_client


def _make_pdf(pages: list[str]) -> bytes:
    """
    Create a real PDF with extractable text using PyMuPDF.
    """
    doc = fitz.open()

    for page_text in pages:
        page = doc.new_page()
        y = 72

        lines = textwrap.wrap(page_text.strip(), width=80) or [""]
        for line in lines:
            page.insert_text((72, y), line)
            y += 16

    data = doc.tobytes()
    doc.close()
    return data


@pytest.fixture()
def make_pdf():
    return _make_pdf


@pytest.fixture()
def upload_pdf(client):
    def _upload(filename: str, pages_or_bytes: list[str] | bytes):
        if isinstance(pages_or_bytes, bytes):
            data = pages_or_bytes
        else:
            data = _make_pdf(pages_or_bytes)

        return client.post(
            "/api/documents/upload",
            files={"file": (filename, data, "application/pdf")},
        )

    return _upload