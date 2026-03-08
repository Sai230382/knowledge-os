import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.routers import upload, analyze, projects, jobs


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
app.include_router(jobs.router)


@app.get("/api/health")
async def health_check():
    return {"status": "ok", "message": "Knowledge OS API is running"}
