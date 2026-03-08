"""
Background job processing for analysis tasks.
Runs analysis in asyncio tasks so HTTP requests return immediately.
"""
import uuid
import asyncio
import traceback
from datetime import datetime, timezone
from app.database import AnalysisJob, _get_session_maker
from app.services.claude_service import analyze_content


async def create_and_run_job(
    text: str,
    tables: list[dict],
    metadata_dicts: list[dict],
    files_processed: int,
    instructions: str | None = None,
) -> str:
    """
    Create an analysis job, start background processing, return job_id immediately.
    """
    job_id = str(uuid.uuid4())

    # Save job to database
    maker = _get_session_maker()
    async with maker() as session:
        job = AnalysisJob(id=job_id, status="processing")
        session.add(job)
        await session.commit()

    # Launch background task (no HTTP timeout!)
    asyncio.create_task(
        _run_analysis(job_id, text, tables, metadata_dicts, files_processed, instructions)
    )

    return job_id


async def _run_analysis(
    job_id: str,
    text: str,
    tables: list[dict],
    metadata_dicts: list[dict],
    files_processed: int,
    instructions: str | None,
):
    """Background task that runs the actual Claude analysis."""
    maker = _get_session_maker()
    try:
        analysis, chunks_analyzed = await analyze_content(text, tables, instructions)

        result = {
            "analysis": analysis.model_dump(),
            "metadata": metadata_dicts,
            "files_processed": files_processed,
            "total_text_length": len(text),
            "chunks_analyzed": chunks_analyzed,
        }

        async with maker() as session:
            job = await session.get(AnalysisJob, job_id)
            if job:
                job.status = "complete"
                job.result_data = result
                job.updated_at = datetime.now(timezone.utc)
                await session.commit()

        print(f"Job {job_id}: complete ({chunks_analyzed} chunks)")

    except Exception as e:
        print(f"Job {job_id}: error - {e}")
        traceback.print_exc()

        async with maker() as session:
            job = await session.get(AnalysisJob, job_id)
            if job:
                job.status = "error"
                job.error_message = str(e)
                job.updated_at = datetime.now(timezone.utc)
                await session.commit()
