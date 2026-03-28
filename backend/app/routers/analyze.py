from pathlib import Path
from fastapi import APIRouter, HTTPException
from app.processors.processor_factory import get_processor, SUPPORTED_EXTENSIONS
from app.services.claude_service import refine_analysis, accumulate_analysis, generate_benchmarks, generate_reimagine, generate_synthesis, generate_process_flows, generate_tobe_process_flows
from app.services.url_service import download_file
from app.services.job_service import create_and_run_job
from app.schemas.responses import (
    FileMetadata, PathRequest, TextRequest,
    UrlRequest, RefineRequest, RefineResponse,
    AccumulateRequest, AccumulateResponse,
    BenchmarkRequest, BenchmarkResponse,
    ReimagineRequest, ReimagineResponse,
    SynthesisRequest, SynthesisResponse,
    ProcessFlowRequest, ProcessFlowResponse,
    ToBeProcessFlowRequest, ToBeProcessFlowResponse,
)
from app.schemas.claude_schemas import BenchmarkOutput, ReimagineOutput, SynthesisOutput, ProcessFlow, ToBeProcessFlow

router = APIRouter()


@router.post("/api/analyze-path")
async def analyze_path(request: PathRequest):
    path = Path(request.path)

    if not path.exists():
        raise HTTPException(404, f"Path not found: {request.path}")

    if path.is_file():
        files = [path]
    elif path.is_dir():
        files = [
            f for f in path.iterdir()
            if f.suffix.lower() in SUPPORTED_EXTENSIONS
        ]
        if not files:
            raise HTTPException(
                400,
                f"No supported files found in directory. Supported: {', '.join(SUPPORTED_EXTENSIONS)}",
            )
    else:
        raise HTTPException(400, "Path is neither a file nor a directory")

    all_text = []
    all_tables = []
    metadata_list = []

    for file_path in sorted(files):
        try:
            processor = get_processor(file_path.name)
            content = file_path.read_bytes()
            result = await processor.extract(content, file_path.name)

            all_text.append(f"--- {file_path.name} ---\n{result.text}")
            all_tables.extend(result.tables)
            metadata_list.append(FileMetadata(
                filename=file_path.name,
                paragraph_count=result.metadata.get("paragraph_count", 0),
                page_count=result.metadata.get("page_count", 0),
                sheet_count=result.metadata.get("sheet_count", 0),
                slide_count=result.metadata.get("slide_count", 0),
            ))
        except Exception:
            metadata_list.append(FileMetadata(filename=file_path.name))

    combined_text = "\n\n".join(all_text)

    if not combined_text.strip():
        raise HTTPException(400, "No text could be extracted from the provided files")

    job_id = await create_and_run_job(
        text=combined_text,
        tables=[t if isinstance(t, dict) else t for t in all_tables],
        metadata_dicts=[m.model_dump() for m in metadata_list],
        files_processed=len(files),
        instructions=request.instructions,
    )

    return {"job_id": job_id}


@router.post("/api/analyze-text")
async def analyze_text(request: TextRequest):
    if not request.text.strip():
        raise HTTPException(400, "Text cannot be empty")

    job_id = await create_and_run_job(
        text=request.text,
        tables=[],
        metadata_dicts=[],
        files_processed=0,
        instructions=request.instructions,
    )

    return {"job_id": job_id}


@router.post("/api/analyze-url")
async def analyze_url(request: UrlRequest):
    if not request.url.strip():
        raise HTTPException(400, "URL cannot be empty")

    try:
        file_bytes, filename = await download_file(request.url)
    except ValueError as e:
        raise HTTPException(400, str(e))
    except Exception as e:
        raise HTTPException(
            500,
            f"Failed to download file: {str(e)}. "
            "Make sure the URL is accessible and the file is shared publicly.",
        )

    try:
        processor = get_processor(filename)
    except ValueError:
        raise HTTPException(
            400,
            f"Could not determine file type for '{filename}'. "
            f"Supported formats: {', '.join(SUPPORTED_EXTENSIONS)}. "
            "Try downloading the file and uploading it directly.",
        )

    result = await processor.extract(file_bytes, filename)

    metadata = FileMetadata(
        filename=filename,
        paragraph_count=result.metadata.get("paragraph_count", 0),
        page_count=result.metadata.get("page_count", 0),
        sheet_count=result.metadata.get("sheet_count", 0),
        slide_count=result.metadata.get("slide_count", 0),
    )

    combined_text = f"--- {filename} (from URL) ---\n{result.text}"

    if not combined_text.strip():
        raise HTTPException(400, "No text could be extracted from the downloaded file")

    job_id = await create_and_run_job(
        text=combined_text,
        tables=[t if isinstance(t, dict) else t for t in result.tables],
        metadata_dicts=[metadata.model_dump()],
        files_processed=1,
        instructions=request.instructions,
    )

    return {"job_id": job_id}


@router.post("/api/refine", response_model=RefineResponse)
async def refine(request: RefineRequest):
    if not request.query.strip():
        raise HTTPException(400, "Query cannot be empty")

    try:
        updated = await refine_analysis(request.current_analysis, request.query)
    except Exception as e:
        raise HTTPException(500, f"Failed to refine analysis: {str(e)}")

    return RefineResponse(analysis=updated)


@router.post("/api/accumulate", response_model=AccumulateResponse)
async def accumulate(request: AccumulateRequest):
    """Merge a new analysis into an existing one, accumulating knowledge."""
    try:
        merged = await accumulate_analysis(
            request.existing_analysis, request.new_analysis
        )
    except Exception as e:
        raise HTTPException(500, f"Failed to accumulate analysis: {str(e)}")
    return AccumulateResponse(analysis=merged)


@router.post("/api/benchmark", response_model=BenchmarkResponse)
async def benchmark(request: BenchmarkRequest):
    """Generate industry benchmark comparisons for the current analysis."""
    try:
        data = await generate_benchmarks(
            request.current_analysis,
            request.industry_context,
        )
        benchmark_output = BenchmarkOutput(**data)
    except Exception as e:
        raise HTTPException(500, f"Failed to generate benchmarks: {str(e)}")
    return BenchmarkResponse(benchmark=benchmark_output)


@router.post("/api/reimagine", response_model=ReimagineResponse)
async def reimagine(request: ReimagineRequest):
    """Generate AI transformation scenarios for current processes."""
    try:
        data = await generate_reimagine(request.current_analysis)
        reimagine_output = ReimagineOutput(**data)
    except Exception as e:
        raise HTTPException(500, f"Failed to generate reimagine scenarios: {str(e)}")
    return ReimagineResponse(reimagine=reimagine_output)


@router.post("/api/process-flows", response_model=ProcessFlowResponse)
async def process_flows(request: ProcessFlowRequest):
    """Generate process flow charts from the current analysis."""
    try:
        data = await generate_process_flows(request.current_analysis)
        flows = [ProcessFlow(**f) for f in data.get("process_flows", [])]
    except Exception as e:
        raise HTTPException(500, f"Failed to generate process flows: {str(e)}")
    return ProcessFlowResponse(process_flows=flows)


@router.post("/api/process-flows/to-be", response_model=ToBeProcessFlowResponse)
async def tobe_process_flows(request: ToBeProcessFlowRequest):
    """Generate AI-transformed To-Be process flows from As-Is flows."""
    try:
        data = await generate_tobe_process_flows(
            request.current_analysis,
            request.as_is_flows,
            request.reimagine_data,
        )
        flows = [ToBeProcessFlow(**f) for f in data.get("process_flows", [])]
    except Exception as e:
        raise HTTPException(500, f"Failed to generate To-Be process flows: {str(e)}")
    return ToBeProcessFlowResponse(process_flows=flows)


@router.post("/api/synthesize", response_model=SynthesisResponse)
async def synthesize(request: SynthesisRequest):
    """Generate a knowledge synthesis from the full analysis."""
    try:
        data = await generate_synthesis(
            request.current_analysis,
            request.query,
            request.process_flows,
        )
        synthesis_output = SynthesisOutput(**data)
    except Exception as e:
        raise HTTPException(500, f"Failed to generate synthesis: {str(e)}")
    return SynthesisResponse(synthesis=synthesis_output)
