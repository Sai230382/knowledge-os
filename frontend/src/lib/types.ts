export interface IndustryPattern {
  title: string;
  description: string;
  confidence: "high" | "medium" | "low";
  evidence: string[];
}

export interface ClientPattern {
  title: string;
  description: string;
  frequency: string;
  business_impact: string;
}

export interface TribalKnowledge {
  title: string;
  description: string;
  risk_if_lost: "high" | "medium" | "low";
  formalization_action: string;
  related_entities: string[];
}

export interface ExceptionItem {
  title: string;
  description: string;
  trigger: string;
  handling: string;
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

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface KPI {
  metric: string;
  value: string;
  trend: "up" | "down" | "stable";
  note: string;
}

export interface AnalysisOutput {
  industry_patterns: IndustryPattern[];
  client_patterns: ClientPattern[];
  tribal_knowledge: TribalKnowledge[];
  exceptions: ExceptionItem[];
  knowledge_graph: GraphData;
  context_graph: GraphData;
  kpis: KPI[] | null;
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
