from abc import ABC, abstractmethod
from dataclasses import dataclass, field


@dataclass
class ExtractionResult:
    text: str
    tables: list[dict] = field(default_factory=list)
    metadata: dict = field(default_factory=dict)


class BaseProcessor(ABC):
    @abstractmethod
    async def extract(self, file_content: bytes, filename: str) -> ExtractionResult:
        ...
