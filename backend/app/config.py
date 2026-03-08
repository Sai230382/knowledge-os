import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env file if it exists (local dev only — Railway uses env vars directly)
ENV_FILE = Path(__file__).resolve().parent.parent / ".env"
if ENV_FILE.exists():
    load_dotenv(ENV_FILE, override=True)


class Settings:
    anthropic_api_key: str = os.getenv("ANTHROPIC_API_KEY", "")
    allowed_origins: str = os.getenv(
        "ALLOWED_ORIGINS",
        "http://localhost:3000"
    )
    max_upload_size_mb: int = int(os.getenv("MAX_UPLOAD_SIZE_MB", "500"))
    port: int = int(os.getenv("PORT", "8000"))
    database_url: str = os.getenv("DATABASE_URL", "")


settings = Settings()
