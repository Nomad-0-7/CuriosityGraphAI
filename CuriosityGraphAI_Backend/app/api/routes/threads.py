import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database.connection import get_db
from app.models.chat_message import ChatMessage
from app.models.chat_thread import ChatThread
from app.models.document import Document
from app.schemas.chat import MessageOut, ThreadCreate, ThreadOut
from app.schemas.documents import DeletedOut

router = APIRouter()


def _get_thread_or_404(db: Session, thread_id: str) -> ChatThread:
    thread = db.get(ChatThread, thread_id)
    if not thread:
        raise HTTPException(status_code=404, detail="Chat thread not found.")
    return thread


@router.post(
    "/threads",
    response_model=ThreadOut,
    status_code=status.HTTP_201_CREATED,
    summary="Create a chat thread for a document",
)
def create_thread(payload: ThreadCreate, db: Session = Depends(get_db)):
    document = db.get(Document, payload.document_id)
    if not document:
        raise HTTPException(status_code=404, detail="Document not found.")

    title = (payload.title or "").strip() or f"Chat with {document.title}"

    thread = ChatThread(
        id=str(uuid.uuid4()),
        document_id=document.id,
        title=title,
    )

    db.add(thread)
    db.commit()
    db.refresh(thread)

    return thread


@router.get(
    "/threads/{thread_id}",
    response_model=ThreadOut,
    summary="Get chat thread",
)
def get_thread(thread_id: str, db: Session = Depends(get_db)):
    return _get_thread_or_404(db, thread_id)


@router.get(
    "/threads/{thread_id}/messages",
    response_model=list[MessageOut],
    summary="Get messages in a chat thread",
)
def get_thread_messages(thread_id: str, db: Session = Depends(get_db)):
    _get_thread_or_404(db, thread_id)

    return (
        db.query(ChatMessage)
        .filter(ChatMessage.thread_id == thread_id)
        .order_by(ChatMessage.created_at.asc())
        .all()
    )


@router.delete(
    "/threads/{thread_id}",
    response_model=DeletedOut,
    summary="Delete chat thread",
)
def delete_thread(thread_id: str, db: Session = Depends(get_db)):
    thread = _get_thread_or_404(db, thread_id)

    db.delete(thread)
    db.commit()

    return DeletedOut(deleted=True)