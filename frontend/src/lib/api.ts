import axios from "axios";
import { AnalysisOutput, AnalysisResponse, Project, BenchmarkOutput, ReimagineOutput, SynthesisOutput } from "./types";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000",
});

// ─── Job Polling ────────────────────────────────────────────────────

interface JobResponse {
  job_id: string;
}

interface JobStatus {
  job_id: string;
  status: "processing" | "complete" | "error";
  result?: AnalysisResponse;
  error?: string;
}

async function pollJobUntilDone(jobId: string): Promise<AnalysisResponse> {
  const POLL_INTERVAL = 3000; // 3 seconds
  const MAX_POLLS = 600; // 30 minutes max

  for (let i = 0; i < MAX_POLLS; i++) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL));

    const { data } = await api.get<JobStatus>(`/api/jobs/${jobId}`);

    if (data.status === "complete" && data.result) {
      return data.result as AnalysisResponse;
    }

    if (data.status === "error") {
      throw new Error(data.error || "Analysis failed");
    }

    // Still processing — continue polling
  }

  throw new Error("Analysis timed out after 30 minutes");
}


// ─── Analysis APIs (now with background jobs) ───────────────────────

export async function uploadFiles(files: File[], instructions?: string): Promise<AnalysisResponse> {
  const formData = new FormData();
  files.forEach((file) => formData.append("files", file));
  if (instructions?.trim()) {
    formData.append("instructions", instructions);
  }
  // Upload returns immediately with job_id
  const { data } = await api.post<JobResponse>("/api/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
    timeout: 300000, // 5 min for file upload itself
  });
  // Poll until analysis completes
  return pollJobUntilDone(data.job_id);
}

export async function analyzePath(path: string, instructions?: string): Promise<AnalysisResponse> {
  const { data } = await api.post<JobResponse>("/api/analyze-path", {
    path,
    ...(instructions?.trim() && { instructions }),
  }, { timeout: 60000 });
  return pollJobUntilDone(data.job_id);
}

export async function analyzeText(text: string, instructions?: string): Promise<AnalysisResponse> {
  const { data } = await api.post<JobResponse>("/api/analyze-text", {
    text,
    ...(instructions?.trim() && { instructions }),
  }, { timeout: 60000 });
  return pollJobUntilDone(data.job_id);
}

export async function analyzeUrl(url: string, instructions?: string): Promise<AnalysisResponse> {
  const { data } = await api.post<JobResponse>("/api/analyze-url", {
    url,
    ...(instructions?.trim() && { instructions }),
  }, { timeout: 600000 }); // 10 min for download + parse
  return pollJobUntilDone(data.job_id);
}

export async function refineAnalysis(
  currentAnalysis: AnalysisOutput,
  query: string,
): Promise<AnalysisOutput> {
  const { data } = await api.post<{ analysis: AnalysisOutput }>("/api/refine", {
    current_analysis: currentAnalysis,
    query,
  }, { timeout: 300000 });
  return data.analysis;
}

export async function accumulateAnalysis(
  existingAnalysis: AnalysisOutput,
  newAnalysis: AnalysisOutput,
): Promise<AnalysisOutput> {
  const { data } = await api.post<{ analysis: AnalysisOutput }>("/api/accumulate", {
    existing_analysis: existingAnalysis,
    new_analysis: newAnalysis,
  }, { timeout: 300000 });
  return data.analysis;
}

export async function generateBenchmarks(
  currentAnalysis: AnalysisOutput,
  industryContext?: string,
): Promise<BenchmarkOutput> {
  const { data } = await api.post<{ benchmark: BenchmarkOutput }>("/api/benchmark", {
    current_analysis: currentAnalysis,
    ...(industryContext?.trim() && { industry_context: industryContext }),
  }, { timeout: 300000 });
  return data.benchmark;
}

export async function generateReimagine(
  currentAnalysis: AnalysisOutput,
): Promise<ReimagineOutput> {
  const { data } = await api.post<{ reimagine: ReimagineOutput }>("/api/reimagine", {
    current_analysis: currentAnalysis,
  }, { timeout: 300000 });
  return data.reimagine;
}

export async function generateSynthesis(
  currentAnalysis: AnalysisOutput,
  query?: string,
): Promise<SynthesisOutput> {
  const { data } = await api.post<{ synthesis: SynthesisOutput }>("/api/synthesize", {
    current_analysis: currentAnalysis,
    ...(query?.trim() && { query }),
  }, { timeout: 300000 });
  return data.synthesis;
}

export async function healthCheck(): Promise<boolean> {
  try {
    await api.get("/api/health");
    return true;
  } catch {
    return false;
  }
}


// ─── Workspace / Project APIs ───────────────────────────────────────

interface WorkspaceResponse {
  workspace_id: string;
  projects: Project[];
}

export async function enterWorkspace(passphrase: string): Promise<WorkspaceResponse> {
  const { data } = await api.post<WorkspaceResponse>("/api/auth/enter", { passphrase }, {
    timeout: 15000,
  });
  return data;
}

export async function fetchProjects(workspaceId: string): Promise<Project[]> {
  const { data } = await api.get<Project[]>("/api/projects", {
    params: { workspace_id: workspaceId },
    timeout: 15000, // 15s timeout — fail fast if backend is down
  });
  return data;
}

export async function createProjectAPI(workspaceId: string, name: string): Promise<Project> {
  const { data } = await api.post<Project>("/api/projects", {
    workspace_id: workspaceId,
    name,
  });
  return data;
}

export async function updateProjectAPI(
  workspaceId: string,
  projectId: string,
  updates: { name?: string; result?: AnalysisResponse | null; error?: string },
): Promise<Project> {
  const { data } = await api.put<Project>(`/api/projects/${projectId}`, {
    workspace_id: workspaceId,
    ...updates,
  });
  return data;
}

export async function deleteProjectAPI(workspaceId: string, projectId: string): Promise<void> {
  await api.delete(`/api/projects/${projectId}`, {
    params: { workspace_id: workspaceId },
  });
}
