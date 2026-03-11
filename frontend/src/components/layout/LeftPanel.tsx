"use client";
import { useState, useEffect } from "react";
import FileUploader from "../input/FileUploader";
import UrlInput from "../input/UrlInput";
import PathInput from "../input/PathInput";
import ChatInput from "../input/ChatInput";
import ThemeToggle from "../shared/ThemeToggle";
import { uploadFiles, analyzeUrl, analyzePath, analyzeText, refineAnalysis } from "@/lib/api";
import { AnalysisResponse } from "@/lib/types";
import axios from "axios";

function getErrorMessage(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err) && err.response?.data?.detail) {
    return err.response.data.detail;
  }
  if (err instanceof Error) return err.message;
  return fallback;
}

interface LeftPanelProps {
  onResult: (result: AnalysisResponse | null) => void;
  onError: (error: string) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  currentResult: AnalysisResponse | null;
}

const PROGRESS_STAGES = [
  "Uploading and extracting document content...",
  "Splitting into analyzable sections...",
  "Analyzing section with Claude AI...",
  "Extracting patterns and entities...",
  "Building knowledge graph...",
  "Identifying gaps and patterns...",
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
    }, 12000);
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
      <div className="w-full bg-blue-200 dark:bg-blue-900 rounded-full h-1.5 overflow-hidden">
        <div
          className="bg-blue-600 dark:bg-blue-400 h-1.5 rounded-full transition-all duration-1000 ease-linear"
          style={{ width: `${Math.min(((stageIndex + 1) / PROGRESS_STAGES.length) * 100, 95)}%` }}
        />
      </div>
    </div>
  );
}

interface QueryMessage {
  role: "user" | "assistant";
  text: string;
}

export default function LeftPanel({ onResult, onError, isLoading, setIsLoading, currentResult }: LeftPanelProps) {
  const [instructions, setInstructions] = useState("");
  const [showInstructions, setShowInstructions] = useState(false);
  const [queryHistory, setQueryHistory] = useState<QueryMessage[]>([]);

  const hasResults = !!currentResult;

  const handleFiles = async (files: File[]) => {
    setIsLoading(true);
    onError("");
    try {
      const result = await uploadFiles(files, instructions);
      onResult(result);
    } catch (err: unknown) {
      const msg = getErrorMessage(err, "Failed to analyze files");
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
      const msg = getErrorMessage(err, "Failed to analyze path");
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
      const msg = getErrorMessage(err, "Failed to analyze URL");
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
      const msg = getErrorMessage(err, "Failed to analyze text");
      onError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuery = async (query: string) => {
    if (!currentResult) return;

    setIsLoading(true);
    onError("");
    setQueryHistory((prev) => [...prev, { role: "user", text: query }]);

    try {
      const updatedAnalysis = await refineAnalysis(currentResult.analysis, query);

      const oldNodes = currentResult.analysis.knowledge_graph.nodes.length;
      const newNodes = updatedAnalysis.knowledge_graph?.nodes?.length || 0;
      const oldPatterns = currentResult.analysis.industry_patterns.length + (currentResult.analysis.context_intelligence?.length || 0);
      const newPatterns = (updatedAnalysis.industry_patterns?.length || 0) + (updatedAnalysis.context_intelligence?.length || 0);

      // Safety check: if refine returned empty/broken results, keep the original
      if (newNodes === 0 && oldNodes > 0) {
        setQueryHistory((prev) => [...prev, { role: "assistant", text: "Refinement returned empty results — keeping your original analysis safe." }]);
      } else {
        const changes: string[] = [];
        if (newNodes !== oldNodes) changes.push(`${newNodes > oldNodes ? "+" : ""}${newNodes - oldNodes} graph nodes`);
        if (newPatterns !== oldPatterns) changes.push(`${newPatterns > oldPatterns ? "+" : ""}${newPatterns - oldPatterns} patterns`);
        const summary = changes.length > 0 ? `Updated: ${changes.join(", ")}` : "Analysis refined successfully";

        setQueryHistory((prev) => [...prev, { role: "assistant", text: summary }]);

        onResult({
          ...currentResult,
          analysis: updatedAnalysis,
        });
      }
    } catch (err: unknown) {
      const msg = getErrorMessage(err, "Failed to refine analysis");
      setQueryHistory((prev) => [...prev, { role: "assistant", text: `Error: ${msg}` }]);
      onError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col p-4 space-y-6 overflow-y-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800 dark:text-white">Contextus</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {hasResults ? "Query your analysis or add more data" : "Upload documents, fetch from URL, or paste text"}
          </p>
        </div>
        <ThemeToggle />
      </div>

      {/* Query/Chat section — shown AFTER analysis is done */}
      {hasResults && (
        <div className="space-y-3">
          {queryHistory.length > 0 && (
            <div className="space-y-2 max-h-[200px] overflow-y-auto">
              {queryHistory.map((msg, i) => (
                <div
                  key={i}
                  className={`text-xs px-3 py-2 rounded-lg ${
                    msg.role === "user"
                      ? "bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 ml-4"
                      : "bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 mr-4"
                  }`}
                >
                  <span className="font-semibold">{msg.role === "user" ? "You" : "Claude"}:</span>{" "}
                  {msg.text}
                </div>
              ))}
            </div>
          )}

          <div className="bg-gradient-to-r from-violet-50 to-blue-50 dark:from-violet-950 dark:to-blue-950 border border-violet-200 dark:border-violet-800 rounded-lg p-3 space-y-2">
            <label className="text-sm font-medium text-violet-700 dark:text-violet-300 flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              Ask Claude about your analysis
            </label>
            <ChatInput
              onSubmit={handleQuery}
              isLoading={isLoading}
              label=""
              placeholder='e.g. "Show more patterns about revenue" or "Add connection between CRM and onboarding"'
            />
          </div>

          <div className="flex items-center gap-2 text-[11px] text-slate-400 dark:text-slate-500">
            <div className="flex-1 border-t border-slate-200 dark:border-slate-700" />
            <span>or add more data to grow knowledge</span>
            <div className="flex-1 border-t border-slate-200 dark:border-slate-700" />
          </div>
        </div>
      )}

      {/* Instructions — shown before initial analysis */}
      {!hasResults && (
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
                placeholder="e.g. Focus on Sheet3 and Revenue tab. Look for hidden knowledge, process gaps, and workarounds. Ignore the raw data sheets."
                rows={3}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-y"
              />
              <p className="text-[11px] text-slate-400 dark:text-slate-500">
                Guide Claude on what to focus on — specific sheets, topics, processes, or areas to ignore.
              </p>
            </div>
          )}
        </div>
      )}

      <FileUploader onSubmit={handleFiles} isLoading={isLoading} />

      <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
        <UrlInput onSubmit={handleUrl} isLoading={isLoading} />
      </div>

      <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
        <PathInput onSubmit={handlePath} isLoading={isLoading} />
      </div>

      {/* Text input — only shown before initial analysis */}
      {!hasResults && (
        <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
          <ChatInput onSubmit={handleText} isLoading={isLoading} />
        </div>
      )}

      {isLoading && <AnalysisProgress />}
    </div>
  );
}
