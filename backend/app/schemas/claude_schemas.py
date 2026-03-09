from pydantic import BaseModel
from typing import Optional


class IndustryPattern(BaseModel):
    title: str = ""
    description: str = ""
    confidence: str = "medium"
    evidence: list[str] = []


class ProcessVariation(BaseModel):
    title: str = ""
    description: str = ""
    trigger: str = ""
    impact: str = ""


class TribalKnowledge(BaseModel):
    title: str = ""
    description: str = ""
    risk_if_lost: str = "medium"
    formalization_action: str = ""
    related_entities: list[str] = []


class ExceptionItem(BaseModel):
    title: str = ""
    description: str = ""
    trigger: str = ""
    handling: str = ""
    related_entities: list[str] = []


class GapAnalysis(BaseModel):
    title: str = ""
    description: str = ""
    gap_type: str = ""  # process_gap, knowledge_gap, technology_gap, ownership_gap
    risk_level: str = "medium"
    recommendation: str = ""


class Recommendation(BaseModel):
    title: str = ""
    description: str = ""
    priority: str = "medium"
    effort: str = ""
    related_entities: list[str] = []


class GraphNode(BaseModel):
    id: str = ""
    label: str = ""
    type: str = "concept"
    description: str = ""


class GraphEdge(BaseModel):
    source: str = ""
    target: str = ""
    label: str = ""
    strength: float = 0.5


class ContextEdge(BaseModel):
    source: str = ""
    target: str = ""
    label: str = ""
    context_type: str = ""  # tribal_knowledge, exception, hidden_pattern, workaround
    strength: float = 0.7


class KnowledgeGraphData(BaseModel):
    nodes: list[GraphNode] = []
    edges: list[GraphEdge] = []


class ContextGraphData(BaseModel):
    nodes: list[GraphNode] = []
    edges: list[ContextEdge] = []


class AnalysisOutput(BaseModel):
    industry_patterns: list[IndustryPattern] = []
    process_variations: list[ProcessVariation] = []
    tribal_knowledge: list[TribalKnowledge] = []
    exceptions: list[ExceptionItem] = []
    knowledge_graph: KnowledgeGraphData = KnowledgeGraphData(nodes=[], edges=[])
    context_graph: ContextGraphData = ContextGraphData(nodes=[], edges=[])
    gap_analysis: list[GapAnalysis] = []
    recommendations: list[Recommendation] = []
