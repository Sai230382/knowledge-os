"use client";
import { useState, useEffect } from "react";
import FileUploader from "../input/FileUploader";
import UrlInput from "../input/UrlInput";
import PathInput from "../input/PathInput";
import ChatInput from "../input/ChatInput";
import ThemeToggle from "../shared/ThemeToggle";
import { uploadFiles, analyzeUrl, analyzePath, analyzeText } from "@/lib/api";
import { AnalysisResponse } from "@/lib/types";

interface LeftPanelProps {
  onResult: (result: AnalysisResponse | null) => void;
  onError: (error: string) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

const PROGRESS_STAGES = [
  "Uploading and extracting document content...",
  "Splitting into analyzable sections...",
  "Analyzing section with Claude AI...",
  "Extracting patterns and entities...",
  "Building knowledge graph...",
  "Identifying KPIs and trends...",
  "Merging analysis from all sections...",
  "Synthesizing final insights...",
  "Almost there — finalizing results...",
];

function AnalysisProgress() {
  const [stageIndex, setStageIndex] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const stageTimer = setInterval(() => {
      setStageIndex((prev) => (prev < PROGRESS_STAGES.length - 1 ? prev + 1 : prev));
    }, 12000); // Advance stage every 12 seconds

    const elapsedTimer = setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 1000);

    return () => {
      clearInterval(stageTimer);
      clearInterval(elapsedTimer);
    };
  }, []);

  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;
  const timeStr = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;

  return (
    <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-3 space-y-2">
      <div className="flex items-center gap-2">
        <svg className="animate-spin w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
          {PROGRESS_STAGES[stageIndex]}
        </span>
      </div>
      <div className="flex items-center justify-between text-[11px] text-blue-500 dark:text-blue-400">
        <span>Elapsed: {timeStr}</span>
        <span>Large files may take 2-5 minutes</span>
      </div>
      {/* Progress bar animation */}
      <div className="w-full bg-blue-200 dark:bg-blue-900 rounded-full h-1.5 overflow-hidden">
        <div
          className="bg-blue-600 dark:bg-blue-400 h-1.5 rounded-full transition-all duration-1000 ease-linear"
          style={{ width: `${Math.min(((stageIndex + 1) / PROGRESS_STAGES.length) * 100, 95)}%` }}
        />
      </div>
    </div>
  );
}

export default function LeftPanel({ onResult, onError, isLoading, setIsLoading }: LeftPanelProps) {
  const [instructions, setInstructions] = useState("");
  const [showInstructions, setShowInstructions] = useState(false);

  const handleFiles = async (files: File[]) => {
    setIsLoading(true);
    onError("");
    try {
      const result = await uploadFiles(files, instructions);
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
      const result = await analyzePath(path, instructions);
      onResult(result);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to analyze path";
      onError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUrl = async (url: string) => {
    setIsLoading(true);
    onError("");
    try {
      const result = await analyzeUrl(url, instructions);
      onResult(result);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to analyze URL";
      onError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleText = async (text: string) => {
    setIsLoading(true);
    onError("");
    try {
      const result = await analyzeText(text, instructions);
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
            Upload documents, fetch from URL, or paste text
          </p>
        </div>
        <ThemeToggle />
      </div>

      {/* Instructions / Focus Area */}
      <div className="space-y-2">
        <button
          onClick={() => setShowInstructions(!showInstructions)}
          className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
        >
          <svg
            className={`w-4 h-4 transition-transform ${showInstructions ? "rotate-90" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
          <span>Instructions for Claude</span>
          {instructions.trim() && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
              Active
            </span>
          )}
        </button>

        {showInstructions && (
          <div className="space-y-1.5">
            <textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="e.g. Focus on Sheet3 and Revenue tab. Look for KPI trends, client patterns, and exceptions. Ignore the raw data sheets."
              rows={3}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-y"
            />
            <p className="text-[11px] text-slate-400 dark:text-slate-500">
              Guide Claude on what to focus on — specific sheets, topics, KPIs, or areas to ignore.
            </p>
          </div>
        )}
      </div>

      <FileUploader onSubmit={handleFiles} isLoading={isLoading} />

      <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
        <UrlInput onSubmit={handleUrl} isLoading={isLoading} />
      </div>

      <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
        <PathInput onSubmit={handlePath} isLoading={isLoading} />
      </div>

      <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
        <ChatInput onSubmit={handleText} isLoading={isLoading} />
      </div>

      {isLoading && <AnalysisProgress />}
    </div>
  );
}
