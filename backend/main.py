import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.routers import upload, analyze, projects


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create database tables on startup
    if os.getenv("DATABASE_URL"):
        try:
            from app.database import init_db
            await init_db()
            print("Database tables created successfully")
        except Exception as e:
            print(f"Warning: Database init failed: {e}")
    else:
        print("Warning: DATABASE_URL not set — project persistence disabled")
    yield


app = FastAPI(title="Knowledge OS", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(upload.router)
app.include_router(analyze.router)
app.include_router(projects.router)


@app.get("/api/health")
async def health_check():
    return {"status": "ok", "message": "Knowledge OS API is running"}


@app.get("/api/debug/db")
async def debug_db():
    """Temporary endpoint to diagnose database issues."""
    import traceback
    info = {"database_url_set": bool(os.getenv("DATABASE_URL"))}
    try:
        from app.database import _get_engine
        engine = _get_engine()
        info["engine_url"] = str(engine.url).split("@")[-1] if engine else "None"  # hide credentials

        from app.database import init_db
        await init_db()
        info["tables_created"] = True

        from sqlalchemy import text
        from app.database import _get_session_maker
        maker = _get_session_maker()
        async with maker() as session:
            result = await session.execute(text("SELECT 1"))
            info["connection_test"] = "OK"
    except Exception as e:
        info["error"] = str(e)
        info["traceback"] = traceback.format_exc()
    return info
