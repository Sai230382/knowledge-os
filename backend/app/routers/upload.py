from typing import Optional
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from app.processors.processor_factory import get_processor, SUPPORTED_EXTENSIONS
from app.services.claude_service import analyze_content
from app.schemas.responses import AnalysisResponse, FileMetadata

router = APIRouter()


@router.post("/api/upload", response_model=AnalysisResponse)
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
        except ValueError as e:
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

    analysis, chunks_analyzed = await analyze_content(combined_text, all_tables, instructions)

    return AnalysisResponse(
        analysis=analysis,
        metadata=metadata_list,
        files_processed=len(files),
        total_text_length=len(combined_text),
        chunks_analyzed=chunks_analyzed,
    )
