import axios from "axios";
import { AnalysisResponse } from "./types";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000",
});

export async function uploadFiles(files: File[]): Promise<AnalysisResponse> {
  const formData = new FormData();
  files.forEach((file) => formData.append("files", file));
  const { data } = await api.post<AnalysisResponse>("/api/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
    timeout: 120000,
  });
  return data;
}

export async function analyzePath(path: string): Promise<AnalysisResponse> {
  const { data } = await api.post<AnalysisResponse>("/api/analyze-path", {
    path,
  }, { timeout: 120000 });
  return data;
}

export async function analyzeText(text: string): Promise<AnalysisResponse> {
  const { data } = await api.post<AnalysisResponse>("/api/analyze-text", {
    text,
  }, { timeout: 120000 });
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
