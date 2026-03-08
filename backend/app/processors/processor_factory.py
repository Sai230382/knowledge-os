from pathlib import Path
from .base import BaseProcessor
from .docx_processor import DocxProcessor
from .pptx_processor import PptxProcessor
from .xlsx_processor import XlsxProcessor
from .pdf_processor import PdfProcessor

PROCESSORS: dict[str, type[BaseProcessor]] = {
    ".docx": DocxProcessor,
    ".pptx": PptxProcessor,
    ".xlsx": XlsxProcessor,
    ".pdf": PdfProcessor,
}

SUPPORTED_EXTENSIONS = set(PROCESSORS.keys())


def get_processor(filename: str) -> BaseProcessor:
    ext = Path(filename).suffix.lower()
    processor_class = PROCESSORS.get(ext)
    if not processor_class:
        raise ValueError(
            f"Unsupported file type: {ext}. Supported: {', '.join(SUPPORTED_EXTENSIONS)}"
        )
    return processor_class()
