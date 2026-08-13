import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.exceptions import (
    DocumentNotFoundError,
    DocumentNotIndexedError,
    EmbeddingError,
    LLMConfigError,
    LLMProviderError,
    UnsupportedLLMProviderError,
)
from app.database.connection import get_db
from app.models.chat_message import ChatMessage
from app.models.chat_thread import ChatThread
from app.models.document import Document
from app.schemas.chat import ChatRequest, ChatResponse
from app.services import rag_service
from app.services.settings_service import settings_manager

router = APIRouter()


@router.post(
    "/{document_id}",
    response_model=ChatResponse,
    summary="Ask a question about one document",
    description=(
        "Runs real retrieval against only the specified document, then sends the retrieved "
        "context to the configured LLM and returns a grounded answer with real citations."
    ),
)
def chat_with_document(
    document_id: str,
    payload: ChatRequest,
    db: Session = Depends(get_db),
):
    document = db.get(Document, document_id)
    if not document:
        raise HTTPException(status_code=404, detail="Document not found.")

    if document.status != "INDEXED":
        raise HTTPException(
            status_code=409,
            detail=f"Document is not ready for chat. Current status: {document.status}.",
        )

    thread = None
    if payload.thread_id:
        thread = db.get(ChatThread, payload.thread_id)
        if not thread or thread.document_id != document.id:
            raise HTTPException(
                status_code=404,
                detail="Chat thread not found for this document.",
            )

    # Fail fast if LLM configuration is missing.
    try:
        settings_manager.get_config()
    except LLMConfigError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    try:
        result = rag_service.generate_answer(
            session=db,
            document_id=document_id,
            question=payload.question,
        )
    except DocumentNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except DocumentNotIndexedError as exc:
        raise HTTPException(status_code=409, detail=str(exc))
    except LLMConfigError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except UnsupportedLLMProviderError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except LLMProviderError as exc:
        raise HTTPException(status_code=502, detail=str(exc))
    except EmbeddingError:
        raise HTTPException(status_code=500, detail="Embedding generation failed.")

    if thread is None:
        thread_title = payload.question.strip()[:80] or f"Chat with {document.title}"
        thread = ChatThread(
            id=str(uuid.uuid4()),
            document_id=document.id,
            title=thread_title,
        )
        db.add(thread)
        db.flush()

    sources_payload = [
        {
            "chunk_id": source.chunk_id,
            "page": source.page,
            "similarity": source.similarity,
            "snippet": source.snippet,
        }
        for source in result.sources
    ]

    user_message = ChatMessage(
        id=str(uuid.uuid4()),
        thread_id=thread.id,
        role="user",
        content=payload.question,
    )

    assistant_message = ChatMessage(
        id=str(uuid.uuid4()),
        thread_id=thread.id,
        role="assistant",
        content=result.answer,
        sources=sources_payload,
    )

    db.add_all([user_message, assistant_message])
    db.commit()

    return ChatResponse(
        answer=result.answer,
        sources=sources_payload,
        thread_id=thread.id,
        document_id=document.id,
    )