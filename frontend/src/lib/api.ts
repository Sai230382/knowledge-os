import axios from "axios";
import { AnalysisOutput, AnalysisResponse, Project } from "./types";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000",
});

export async function uploadFiles(files: File[], instructions?: string): Promise<AnalysisResponse> {
  const formData = new FormData();
  files.forEach((file) => formData.append("files", file));
  if (instructions?.trim()) {
    formData.append("instructions", instructions);
  }
  const { data } = await api.post<AnalysisResponse>("/api/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
    timeout: 300000,
  });
  return data;
}

export async function analyzePath(path: string, instructions?: string): Promise<AnalysisResponse> {
  const { data } = await api.post<AnalysisResponse>("/api/analyze-path", {
    path,
    ...(instructions?.trim() && { instructions }),
  }, { timeout: 300000 });
  return data;
}

export async function analyzeText(text: string, instructions?: string): Promise<AnalysisResponse> {
  const { data } = await api.post<AnalysisResponse>("/api/analyze-text", {
    text,
    ...(instructions?.trim() && { instructions }),
  }, { timeout: 300000 });
  return data;
}

export async function analyzeUrl(url: string, instructions?: string): Promise<AnalysisResponse> {
  const { data } = await api.post<AnalysisResponse>("/api/analyze-url", {
    url,
    ...(instructions?.trim() && { instructions }),
  }, { timeout: 600000 });  // 10 min timeout for large remote files
  return data;
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
  const { data } = await api.post<WorkspaceResponse>("/api/auth/enter", { passphrase });
  return data;
}

export async function fetchProjects(workspaceId: string): Promise<Project[]> {
  const { data } = await api.get<Project[]>("/api/projects", {
    params: { workspace_id: workspaceId },
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
