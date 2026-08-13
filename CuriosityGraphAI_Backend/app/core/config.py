import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()


def _as_bool(value: str | None, default: bool = False) -> bool:
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


class Settings:
    def __init__(self) -> None:
        self.app_name = "CuriosityGraphAI Backend"

        # backend/
        self.base_dir = Path(__file__).resolve().parents[2]

        self.data_dir = Path(
            os.getenv("DATA_DIR", str(self.base_dir / "data"))
        ).expanduser().resolve()

        self.documents_dir = Path(
            os.getenv("DOCUMENTS_DIR", str(self.data_dir / "documents"))
        ).expanduser().resolve()

        # Fix for Windows file paths in SQLAlchemy URLs
        db_path = self.data_dir / "curiositygraphai.db"
        default_db_url = f"sqlite:///{db_path.as_posix()}"
        
        # Use default if DATABASE_URL is empty or not set
        env_db_url = os.getenv("DATABASE_URL")
        self.database_url = env_db_url if env_db_url else default_db_url

        self.embedding_model = os.getenv(
            "EMBEDDING_MODEL",
            "sentence-transformers/all-MiniLM-L6-v2",
        )

        self.chunk_size = int(os.getenv("CHUNK_SIZE", "800"))
        self.chunk_overlap = int(os.getenv("CHUNK_OVERLAP", "150"))

        self.retrieval_top_k = int(os.getenv("RETRIEVAL_TOP_K", "5"))
        self.retrieval_min_score = float(os.getenv("RETRIEVAL_MIN_SCORE", "0.20"))

        self.ingestion_sync = _as_bool(os.getenv("INGESTION_SYNC", "false"))

        self.llm_provider = os.getenv("LLM_PROVIDER") or None
        self.llm_model = os.getenv("LLM_MODEL") or None

        self.openai_api_key = os.getenv("OPENAI_API_KEY") or None
        self.google_api_key = os.getenv("GOOGLE_API_KEY") or None

        self.data_dir.mkdir(parents=True, exist_ok=True)
        self.documents_dir.mkdir(parents=True, exist_ok=True)


settings = Settings()