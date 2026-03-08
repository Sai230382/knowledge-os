from pydantic import BaseModel
from typing import Optional
from .claude_schemas import AnalysisOutput


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


class HealthResponse(BaseModel):
    status: str
    message: str
