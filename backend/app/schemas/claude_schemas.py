from pydantic import BaseModel
from typing import Optional


class IndustryPattern(BaseModel):
    title: str = ""
    description: str = ""
    confidence: str = "medium"
    evidence: list[str] = []


class ContextIntelligence(BaseModel):
    """Unified hidden knowledge: tribal knowledge, exceptions, workarounds, process variations."""
    title: str = ""
    description: str = ""
    intel_type: str = ""  # tribal_knowledge, exception, workaround, process_variation, hidden_pattern
    trigger: str = ""
    impact: str = ""
    risk_level: str = "medium"
    formalization_action: str = ""
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
    context_intelligence: list[ContextIntelligence] = []
    gap_analysis: list[GapAnalysis] = []
    recommendations: list[Recommendation] = []
    knowledge_graph: KnowledgeGraphData = KnowledgeGraphData(nodes=[], edges=[])
    context_graph: ContextGraphData = ContextGraphData(nodes=[], edges=[])


# --- Industry Benchmarks ---

class BenchmarkComparison(BaseModel):
    area: str = ""
    current_state: str = ""
    industry_benchmark: str = ""
    delta: str = ""
    maturity_score: float = 0.0  # 1-5 scale
    priority: str = "medium"


class BenchmarkOutput(BaseModel):
    industry: str = ""
    comparisons: list[BenchmarkComparison] = []
    overall_maturity: float = 0.0
    summary: str = ""


# --- Reimagine Lab ---

class ReimaginedProcess(BaseModel):
    process_name: str = ""
    as_is: str = ""
    to_be: str = ""
    ai_technology: str = ""
    impact_score: float = 0.0  # 1-10 scale
    implementation_effort: str = ""  # low, medium, high
    timeline: str = ""


class ReimagineOutput(BaseModel):
    processes: list[ReimaginedProcess] = []
    transformation_summary: str = ""
    total_impact_score: float = 0.0
