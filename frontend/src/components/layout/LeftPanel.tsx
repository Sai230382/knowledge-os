"use client";
import FileUploader from "../input/FileUploader";
import PathInput from "../input/PathInput";
import ChatInput from "../input/ChatInput";
import ThemeToggle from "../shared/ThemeToggle";
import { uploadFiles, analyzePath, analyzeText } from "@/lib/api";
import { AnalysisResponse } from "@/lib/types";

interface LeftPanelProps {
  onResult: (result: AnalysisResponse | null) => void;
  onError: (error: string) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

export default function LeftPanel({ onResult, onError, isLoading, setIsLoading }: LeftPanelProps) {
  const handleFiles = async (files: File[]) => {
    setIsLoading(true);
    onError("");
    try {
      const result = await uploadFiles(files);
      onResult(result);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to analyze files";
      onError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePath = async (path: string) => {
    setIsLoading(true);
    onError("");
    try {
      const result = await analyzePath(path);
      onResult(result);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to analyze path";
      onError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleText = async (text: string) => {
    setIsLoading(true);
    onError("");
    try {
      const result = await analyzeText(text);
      onResult(result);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to analyze text";
      onError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col p-4 space-y-6 overflow-y-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800 dark:text-white">Knowledge OS</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Upload documents, provide a path, or paste text
          </p>
        </div>
        <ThemeToggle />
      </div>

      <FileUploader onSubmit={handleFiles} isLoading={isLoading} />

      <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
        <PathInput onSubmit={handlePath} isLoading={isLoading} />
      </div>

      <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
        <ChatInput onSubmit={handleText} isLoading={isLoading} />
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950 px-3 py-2 rounded-lg">
          <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Analyzing with Claude AI...
        </div>
      )}
    </div>
  );
}
