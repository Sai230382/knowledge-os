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


class PathRequest(BaseModel):
    path: str


class TextRequest(BaseModel):
    text: str


class HealthResponse(BaseModel):
    status: str
    message: str
