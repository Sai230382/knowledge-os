from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from pydantic import BaseModel
from typing import Optional
from app.database import get_session, AnalysisJob

router = APIRouter()


@router.get("/api/debug/jobs")
async def debug_recent_jobs(session: AsyncSession = Depends(get_session)):
    """Debug endpoint: show recent jobs with status (no result data)."""
    result = await session.execute(
        select(AnalysisJob).order_by(desc(AnalysisJob.created_at)).limit(10)
    )
    jobs = result.scalars().all()
    return [
        {
            "id": j.id[:8],
            "status": j.status,
            "error": j.error_message[:200] if j.error_message else None,
            "created": str(j.created_at),
            "updated": str(j.updated_at),
        }
        for j in jobs
    ]


class JobStatusResponse(BaseModel):
    job_id: str
    status: str  # "processing", "complete", "error"
    result: Optional[dict] = None
    error: Optional[str] = None


@router.get("/api/debug/latest-graphs")
async def debug_latest_graphs(session: AsyncSession = Depends(get_session)):
    """Debug: show graph data from the latest completed job."""
    result = await session.execute(
        select(AnalysisJob)
        .where(AnalysisJob.status == "complete")
        .order_by(desc(AnalysisJob.created_at))
        .limit(1)
    )
    job = result.scalar_one_or_none()
    if not job or not job.result_data:
        return {"error": "No completed jobs found"}
    data = job.result_data.get("analysis", job.result_data)
    kg = data.get("knowledge_graph", {})
    ctx = data.get("context_graph", {})
    ci = data.get("context_intelligence", [])
    return {
        "job_id": job.id[:8],
        "knowledge_graph": {
            "node_count": len(kg.get("nodes", [])),
            "edge_count": len(kg.get("edges", [])),
            "sample_nodes": [n.get("id") for n in kg.get("nodes", [])[:5]],
        },
        "context_graph": {
            "node_count": len(ctx.get("nodes", [])),
            "edge_count": len(ctx.get("edges", [])),
            "edges": ctx.get("edges", [])[:10],
        },
        "context_intelligence_count": len(ci),
    }


@router.get("/api/jobs/{job_id}", response_model=JobStatusResponse)
async def get_job_status(job_id: str, session: AsyncSession = Depends(get_session)):
    result = await session.execute(
        select(AnalysisJob).where(AnalysisJob.id == job_id)
    )
    job = result.scalar_one_or_none()

    if not job:
        raise HTTPException(404, "Job not found")

    return JobStatusResponse(
        job_id=job.id,
        status=job.status,
        result=job.result_data if job.status == "complete" else None,
        error=job.error_message if job.status == "error" else None,
    )
