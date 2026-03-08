from typing import Optional
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from app.processors.processor_factory import get_processor, SUPPORTED_EXTENSIONS
from app.schemas.responses import FileMetadata
from app.services.job_service import create_and_run_job

router = APIRouter()


@router.post("/api/upload")
async def upload_files(
    files: list[UploadFile] = File(...),
    instructions: Optional[str] = Form(None),
):
    if not files:
        raise HTTPException(400, "No files provided")

    all_text = []
    all_tables = []
    metadata_list = []

    for file in files:
        try:
            processor = get_processor(file.filename)
        except ValueError:
            raise HTTPException(
                400,
                f"Unsupported file: {file.filename}. Supported: {', '.join(SUPPORTED_EXTENSIONS)}",
            )

        content = await file.read()
        result = await processor.extract(content, file.filename)

        all_text.append(f"--- {file.filename} ---\n{result.text}")
        all_tables.extend(result.tables)
        metadata_list.append(FileMetadata(
            filename=file.filename,
            paragraph_count=result.metadata.get("paragraph_count", 0),
            page_count=result.metadata.get("page_count", 0),
            sheet_count=result.metadata.get("sheet_count", 0),
            slide_count=result.metadata.get("slide_count", 0),
        ))

    combined_text = "\n\n".join(all_text)

    if not combined_text.strip():
        raise HTTPException(400, "No text could be extracted from the uploaded files")

    # Start background job — returns immediately
    job_id = await create_and_run_job(
        text=combined_text,
        tables=[t if isinstance(t, dict) else t for t in all_tables],
        metadata_dicts=[m.model_dump() for m in metadata_list],
        files_processed=len(files),
        instructions=instructions,
    )

    return {"job_id": job_id}
