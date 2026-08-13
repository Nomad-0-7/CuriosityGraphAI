import uuid
from pathlib import Path
from threading import Thread

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.exceptions import PDFProcessingError
from app.database.connection import get_db
from app.models.document import Document
from app.schemas.documents import DeletedOut, DocumentOut, DocumentStatusOut
from app.services import pdf_service
from app.services.ingestion_service import process_document

router = APIRouter()


def _get_document_or_404(db: Session, document_id: str) -> Document:
    document = db.get(Document, document_id)
    if not document:
        raise HTTPException(status_code=404, detail="Document not found.")
    return document


def _safe_filename(value: str) -> str:
    cleaned = "".join(
        char if char.isalnum() or char in {"-", "_", " ", "."} else "_"
        for char in value
    ).strip()

    return cleaned or "document"


@router.post(
    "/upload",
    response_model=DocumentOut,
    status_code=status.HTTP_201_CREATED,
    summary="Upload a PDF document",
    description=(
        "Upload a real PDF. The file is saved locally, a document record is created, "
        "and ingestion runs asynchronously unless INGESTION_SYNC=true."
    ),
)
async def upload_document(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")

    data = await file.read()
    if not data:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    try:
        total_pages = pdf_service.validate_pdf_bytes(data)
    except PDFProcessingError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    document_id = str(uuid.uuid4())
    file_path = settings.documents_dir / f"{document_id}.pdf"
    file_path.write_bytes(data)

    title = Path(file.filename).stem or "Untitled"

    document = Document(
        id=document_id,
        title=title,
        file_path=str(file_path),
        file_size_bytes=len(data),
        total_pages=total_pages,
        status="UPLOADED",
    )

    db.add(document)
    db.commit()
    db.refresh(document)

    if settings.ingestion_sync:
        process_document(document_id)
        db.refresh(document)
    else:
        thread = Thread(
            target=process_document,
            args=(document_id,),
            daemon=True,
        )
        thread.start()

    return document


@router.get(
    "",
    response_model=list[DocumentOut],
    summary="List documents",
)
def list_documents(db: Session = Depends(get_db)):
    return db.query(Document).order_by(Document.created_at.desc()).all()


@router.get(
    "/{document_id}",
    response_model=DocumentOut,
    summary="Get document metadata",
)
def get_document(document_id: str, db: Session = Depends(get_db)):
    return _get_document_or_404(db, document_id)


@router.get(
    "/{document_id}/status",
    response_model=DocumentStatusOut,
    summary="Get document processing status",
)
def get_document_status(document_id: str, db: Session = Depends(get_db)):
    return _get_document_or_404(db, document_id)


@router.get(
    "/{document_id}/file",
    summary="Download original PDF",
    response_class=FileResponse,
)
def get_document_file(document_id: str, db: Session = Depends(get_db)):
    document = _get_document_or_404(db, document_id)

    path = Path(document.file_path)
    if not path.exists():
        raise HTTPException(status_code=404, detail="Stored PDF file is missing.")

    filename = f"{_safe_filename(document.title)}.pdf"

    return FileResponse(
        path=str(path),
        media_type="application/pdf",
        filename=filename,
    )


@router.delete(
    "/{document_id}",
    response_model=DeletedOut,
    summary="Delete document",
    description=(
        "Deletes the document record, stored PDF file, chunks, threads, and messages."
    ),
)
def delete_document(document_id: str, db: Session = Depends(get_db)):
    document = _get_document_or_404(db, document_id)
    file_path = Path(document.file_path)

    db.delete(document)
    db.commit()

    try:
        if file_path.exists():
            file_path.unlink()
    except Exception:
        # The database deletion has already succeeded.
        # File cleanup failure should not make the API response misleading.
        pass

    return DeletedOut(deleted=True)