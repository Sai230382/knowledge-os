export interface IndustryPattern {
  title: string;
  description: string;
  confidence: "high" | "medium" | "low";
  evidence: string[];
}

export interface ContextIntelligence {
  title: string;
  description: string;
  intel_type: string; // tribal_knowledge, exception, workaround, process_variation, hidden_pattern
  trigger: string;
  impact: string;
  risk_level: "high" | "medium" | "low";
  formalization_action: string;
  related_entities: string[];
}

export interface GapAnalysis {
  title: string;
  description: string;
  gap_type: string;
  risk_level: "high" | "medium" | "low";
  recommendation: string;
}

export interface Recommendation {
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
  effort: string;
  related_entities: string[];
}

export interface GraphNode {
  id: string;
  label: string;
  type: "person" | "process" | "technology" | "concept" | "organization";
  description?: string;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

export interface GraphEdge {
  source: string | GraphNode;
  target: string | GraphNode;
  label: string;
  strength: number;
}

export interface ContextEdge extends GraphEdge {
  context_type?: string;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface ContextGraphData extends GraphData {
  edges: ContextEdge[];
}

export interface AnalysisOutput {
  industry_patterns: IndustryPattern[];
  context_intelligence: ContextIntelligence[];
  gap_analysis: GapAnalysis[];
  recommendations: Recommendation[];
  knowledge_graph: GraphData;
  context_graph: ContextGraphData;
}

export interface FileMetadata {
  filename: string;
  paragraph_count?: number;
  page_count?: number;
  sheet_count?: number;
  slide_count?: number;
}

export interface AnalysisResponse {
  analysis: AnalysisOutput;
  metadata: FileMetadata[];
  files_processed: number;
  total_text_length: number;
}

export interface Project {
  id: string;
  name: string;
  createdAt: number;
  result: AnalysisResponse | null;
  error: string;
}
