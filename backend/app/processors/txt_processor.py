from .base import BaseProcessor, ExtractionResult


class TxtProcessor(BaseProcessor):
    """Processor for plain text files (.txt, .csv, .md, .json, .log)."""

    async def extract(self, file_content: bytes, filename: str) -> ExtractionResult:
        # Try UTF-8 first, fall back to latin-1 (handles all byte values)
        try:
            text = file_content.decode("utf-8")
        except UnicodeDecodeError:
            text = file_content.decode("latin-1")

        lines = text.strip().splitlines()

        return ExtractionResult(
            text=text,
            tables=[],
            metadata={
                "line_count": len(lines),
                "char_count": len(text),
            },
        )
