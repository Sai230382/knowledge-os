from pydantic import BaseModel
from typing import Optional
from .claude_schemas import AnalysisOutput, BenchmarkOutput, ReimagineOutput


class FileMetadata(BaseModel):
    filename: str
    paragraph_count: int = 0
    page_count: int = 0
    sheet_count: int = 0
    slide_count: int = 0


class AnalysisResponse(BaseModel):
    analysis: AnalysisOutput
    metadata: list[FileMetadata]
    files_processed: int
    total_text_length: int
    chunks_analyzed: int = 1


class PathRequest(BaseModel):
    path: str
    instructions: Optional[str] = None


class TextRequest(BaseModel):
    text: str
    instructions: Optional[str] = None


class UrlRequest(BaseModel):
    url: str
    instructions: Optional[str] = None


class RefineRequest(BaseModel):
    current_analysis: dict
    query: str


class RefineResponse(BaseModel):
    analysis: AnalysisOutput


class AccumulateRequest(BaseModel):
    existing_analysis: dict
    new_analysis: dict


class AccumulateResponse(BaseModel):
    analysis: AnalysisOutput


class BenchmarkRequest(BaseModel):
    current_analysis: dict
    industry_context: Optional[str] = None


class BenchmarkResponse(BaseModel):
    benchmark: BenchmarkOutput


class ReimagineRequest(BaseModel):
    current_analysis: dict


class ReimagineResponse(BaseModel):
    reimagine: ReimagineOutput


class HealthResponse(BaseModel):
    status: str
    message: str
