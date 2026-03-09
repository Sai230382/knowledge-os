from pydantic import BaseModel
from typing import Optional


class IndustryPattern(BaseModel):
    title: str
    description: str
    confidence: str = "medium"
    evidence: list[str] = []


class ClientPattern(BaseModel):
    title: str
    description: str
    frequency: str = ""
    business_impact: str = ""


class TribalKnowledge(BaseModel):
    title: str
    description: str
    risk_if_lost: str = "medium"
    formalization_action: str = ""
    related_entities: list[str] = []


class ExceptionItem(BaseModel):
    title: str
    description: str
    trigger: str = ""
    handling: str = ""
    related_entities: list[str] = []


class GraphNode(BaseModel):
    id: str
    label: str
    type: str = "concept"
    description: str = ""


class GraphEdge(BaseModel):
    source: str
    target: str
    label: str = ""
    strength: float = 0.5


class KnowledgeGraphData(BaseModel):
    nodes: list[GraphNode] = []
    edges: list[GraphEdge] = []


class KPI(BaseModel):
    metric: str
    value: str
    trend: str = "stable"
    note: str = ""


class AnalysisOutput(BaseModel):
    industry_patterns: list[IndustryPattern] = []
    client_patterns: list[ClientPattern] = []
    tribal_knowledge: list[TribalKnowledge] = []
    exceptions: list[ExceptionItem] = []
    knowledge_graph: KnowledgeGraphData = KnowledgeGraphData(nodes=[], edges=[])
    context_graph: KnowledgeGraphData = KnowledgeGraphData(nodes=[], edges=[])
    kpis: Optional[list[KPI]] = None
