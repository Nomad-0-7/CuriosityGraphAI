from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

import app.models  # noqa: F401  Ensure models are registered.
from app.api.routes import chat, documents, settings as settings_routes, threads
from app.core.config import settings
from app.database.connection import Base, engine


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(
    title=settings.app_name,
    version="0.1.0",
    description=(
        "Local-first document RAG API. "
        "Upload PDFs, index them locally, and chat with one document at a time."
    ),
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register threads BEFORE the dynamic /{document_id} chat route.
app.include_router(settings_routes.router, prefix="/api/settings")
app.include_router(documents.router, prefix="/api/documents", tags=["documents"])
app.include_router(threads.router, prefix="/api/chat", tags=["threads"])
app.include_router(chat.router, prefix="/api/chat", tags=["chat"])


@app.get("/", include_in_schema=False)
def root():
    return {
        "name": settings.app_name,
        "docs": "/docs",
        "openapi": "/openapi.json",
    }