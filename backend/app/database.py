import os
import uuid
import hashlib
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from sqlalchemy import String, DateTime, Text
from sqlalchemy.dialects.postgresql import JSONB


def get_database_url() -> str:
    url = os.getenv("DATABASE_URL", "")
    if not url:
        raise ValueError(
            "DATABASE_URL environment variable is not set. "
            "Add a PostgreSQL database to your Railway project."
        )
    # Railway gives postgres:// but SQLAlchemy async needs postgresql+asyncpg://
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql+asyncpg://", 1)
    elif url.startswith("postgresql://") and "+asyncpg" not in url:
        url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
    return url


# Lazy engine — only created when first needed
_engine = None
_session_maker = None


def _get_engine():
    global _engine
    if _engine is None:
        _engine = create_async_engine(get_database_url(), echo=False, pool_pre_ping=True)
    return _engine


def _get_session_maker():
    global _session_maker
    if _session_maker is None:
        _session_maker = async_sessionmaker(
            _get_engine(), class_=AsyncSession, expire_on_commit=False
        )
    return _session_maker


class Base(DeclarativeBase):
    pass


class Workspace(Base):
    __tablename__ = "workspaces"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    passphrase_hash: Mapped[str] = mapped_column(String(64), nullable=False, unique=True, index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )


class ProjectModel(Base):
    __tablename__ = "projects"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    workspace_id: Mapped[str] = mapped_column(
        String, nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    result_data: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    error: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )


def hash_passphrase(passphrase: str) -> str:
    """Deterministic hash so same passphrase always finds the same workspace."""
    return hashlib.sha256(passphrase.strip().encode()).hexdigest()


async def init_db():
    engine = _get_engine()
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def get_session():
    maker = _get_session_maker()
    async with maker() as session:
        yield session
