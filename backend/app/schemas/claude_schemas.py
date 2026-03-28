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


# --- Process Flow Charts ---

class ProcessStep(BaseModel):
    id: str = ""
    label: str = ""
    description: str = ""
    step_type: str = "action"  # action | decision | start | end | exception
    next_steps: list[str] = []  # IDs of next steps
    condition: str = ""  # For decision nodes: the branch condition
    branch_labels: dict[str, str] = {}  # next_step_id -> "Yes"/"No"/"Approved" etc.
    related_entities: list[str] = []  # Knowledge graph node IDs


class ProcessFlow(BaseModel):
    process_id: str = ""
    process_name: str = ""
    description: str = ""
    steps: list[ProcessStep] = []
    exceptions: list[str] = []  # Context intelligence titles related to this process


class ProcessFlowOutput(BaseModel):
    process_flows: list[ProcessFlow] = []


# --- To-Be Process Flows (AI-transformed) ---

class ToBeProcessStep(BaseModel):
    id: str = ""
    label: str = ""
    description: str = ""
    step_type: str = "action"
    next_steps: list[str] = []
    condition: str = ""
    branch_labels: dict[str, str] = {}
    related_entities: list[str] = []
    change_type: str = "unchanged"  # unchanged | new | modified | eliminated


class ToBeProcessFlow(BaseModel):
    process_id: str = ""
    process_name: str = ""
    description: str = ""
    steps: list[ToBeProcessStep] = []
    exceptions: list[str] = []
    transformation_summary: str = ""
    ai_technologies_used: list[str] = []


class ToBeProcessFlowOutput(BaseModel):
    process_flows: list[ToBeProcessFlow] = []


class AnalysisOutput(BaseModel):
    industry_patterns: list[IndustryPattern] = []
    context_intelligence: list[ContextIntelligence] = []
    gap_analysis: list[GapAnalysis] = []
    recommendations: list[Recommendation] = []
    knowledge_graph: KnowledgeGraphData = KnowledgeGraphData(nodes=[], edges=[])
    context_graph: ContextGraphData = ContextGraphData(nodes=[], edges=[])
    process_flows: list[ProcessFlow] = []


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


# --- Knowledge Synthesis ---

class SynthesisSection(BaseModel):
    heading: str = ""
    content: str = ""
    severity: str = ""  # info, warning, critical, success


class SynthesisOutput(BaseModel):
    title: str = ""
    executive_summary: str = ""
    sections: list[SynthesisSection] = []
    key_risks: list[str] = []
    quick_wins: list[str] = []
    strategic_recommendations: list[str] = []
