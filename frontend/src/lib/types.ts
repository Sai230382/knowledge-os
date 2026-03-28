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


// --- Industry Benchmarks ---

export interface BenchmarkComparison {
  area: string;
  current_state: string;
  industry_benchmark: string;
  delta: string;
  maturity_score: number;
  priority: "high" | "medium" | "low";
}

export interface BenchmarkOutput {
  industry: string;
  comparisons: BenchmarkComparison[];
  overall_maturity: number;
  summary: string;
}


// --- Reimagine Lab ---

export interface ReimaginedProcess {
  process_name: string;
  as_is: string;
  to_be: string;
  ai_technology: string;
  impact_score: number;
  implementation_effort: "low" | "medium" | "high";
  timeline: string;
}

export interface ReimagineOutput {
  processes: ReimaginedProcess[];
  transformation_summary: string;
  total_impact_score: number;
}


// --- Process Flow Charts ---

export interface ProcessStep {
  id: string;
  label: string;
  description: string;
  step_type: "start" | "action" | "decision" | "end" | "exception";
  next_steps: string[];
  condition: string;
  branch_labels: Record<string, string>;
  related_entities: string[];
}

export interface ProcessFlow {
  process_id: string;
  process_name: string;
  description: string;
  steps: ProcessStep[];
  exceptions: string[];
}


// --- To-Be Process Flows (AI-transformed) ---

export interface ToBeProcessStep extends ProcessStep {
  change_type: "unchanged" | "new" | "modified" | "eliminated";
}

export interface ToBeProcessFlow {
  process_id: string;
  process_name: string;
  description: string;
  steps: ToBeProcessStep[];
  exceptions: string[];
  transformation_summary: string;
  ai_technologies_used: string[];
}


// --- Knowledge Synthesis ---

export interface SynthesisSection {
  heading: string;
  content: string;
  severity: "info" | "warning" | "critical" | "success";
}

export interface SynthesisOutput {
  title: string;
  executive_summary: string;
  sections: SynthesisSection[];
  key_risks: string[];
  quick_wins: string[];
  strategic_recommendations: string[];
}
