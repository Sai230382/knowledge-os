import axios from "axios";
import { AnalysisResponse } from "./types";

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

export async function healthCheck(): Promise<boolean> {
  try {
    await api.get("/api/health");
    return true;
  } catch {
    return false;
  }
}
