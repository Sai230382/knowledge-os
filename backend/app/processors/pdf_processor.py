import io
import pdfplumber
from .base import BaseProcessor, ExtractionResult


class PdfProcessor(BaseProcessor):
    async def extract(self, file_content: bytes, filename: str) -> ExtractionResult:
        pages_text = []
        tables = []

        with pdfplumber.open(io.BytesIO(file_content)) as pdf:
            for i, page in enumerate(pdf.pages, 1):
                text = page.extract_text()
                if text:
                    pages_text.append(f"[Page {i}]\n{text}")

                page_tables = page.extract_tables()
                for table in page_tables:
                    if table and len(table) > 1:
                        headers = [
                            str(cell) if cell else "" for cell in table[0]
                        ]
                        rows = [
                            [str(cell) if cell else "" for cell in row]
                            for row in table[1:]
                        ]
                        tables.append({"headers": headers, "rows": rows})

        return ExtractionResult(
            text="\n\n".join(pages_text),
            tables=tables,
            metadata={
                "filename": filename,
                "page_count": len(pages_text),
            },
        )
