"use client";
import { useState } from "react";
import { AnalysisOutput, ProcessFlow } from "@/lib/types";
import { generateProcessFlows } from "@/lib/api";
import ProcessFlowChart from "../graphs/ProcessFlowChart";
import { generateProcessFlowHTML } from "@/lib/processFlowHtmlExport";

interface ProcessFlowTabProps {
  analysis: AnalysisOutput;
  fullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

export default function ProcessFlowTab({ analysis, fullscreen, onToggleFullscreen }: ProcessFlowTabProps) {
  const [processFlows, setProcessFlows] = useState<ProcessFlow[] | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleGenerate = async () => {
    setIsLoading(true);
    setError("");
    try {
      const result = await generateProcessFlows(analysis);
      setProcessFlows(result);
      setSelectedIndex(0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate process flows");
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportHTML = () => {
    if (!processFlows || !processFlows[selectedIndex]) return;
    const flow = processFlows[selectedIndex];
    const html = generateProcessFlowHTML(flow);
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `process-flow-${flow.process_id || "chart"}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="relative mx-auto mb-4 w-12 h-12">
            <div className="absolute inset-0 rounded-full border-4 border-teal-200 dark:border-teal-800"></div>
            <div className="absolute inset-0 rounded-full border-4 border-teal-500 border-t-transparent animate-spin"></div>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400">Extracting process flows...</p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Analyzing processes, decision points, and exception paths</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-3xl mb-3">⚠️</div>
          <p className="text-sm text-red-600 dark:text-red-400 mb-3">{error}</p>
          <button
            onClick={handleGenerate}
            className="px-4 py-2 text-sm bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Not yet generated
  if (!processFlows) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center max-w-lg">
          <div className="text-4xl mb-4">🔀</div>
          <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-2">Process Flow Charts</h3>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">
            Generate visual flowcharts showing step-by-step process flows extracted from your analysis.
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mb-6">
            Each process includes decision points, exception paths, and connections to knowledge graph entities.
            You can download each flowchart as a standalone HTML file to share with your team.
          </p>
          <button
            onClick={handleGenerate}
            className="px-6 py-2.5 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 transition-colors shadow-sm"
          >
            Generate Process Flows
          </button>
        </div>
      </div>
    );
  }

  // Empty result
  if (processFlows.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="text-3xl mb-3">📋</div>
          <p className="text-sm text-slate-600 dark:text-slate-400">No distinct processes were identified in the analysis.</p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Try uploading documents with more process-oriented content.</p>
        </div>
      </div>
    );
  }

  const currentFlow = processFlows[selectedIndex];

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      {/* Top bar: dropdown + controls */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 shrink-0">
        <div className="flex items-center gap-3">
          <select
            value={selectedIndex}
            onChange={(e) => setSelectedIndex(Number(e.target.value))}
            className="text-sm font-medium bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-1.5 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            {processFlows.map((flow, i) => (
              <option key={flow.process_id || i} value={i}>
                {flow.process_name}
              </option>
            ))}
          </select>
          <span className="text-xs text-slate-400 dark:text-slate-500">
            {processFlows.length} process{processFlows.length !== 1 ? "es" : ""} · {currentFlow.steps.length} steps
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* HTML Export button */}
          <button
            onClick={handleExportHTML}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/30 hover:bg-teal-100 dark:hover:bg-teal-900/50 rounded-lg border border-teal-200 dark:border-teal-800 transition-colors"
            title="Download as interactive HTML file"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            HTML
          </button>

          {/* Fullscreen toggle */}
          {onToggleFullscreen && (
            <button
              onClick={onToggleFullscreen}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title={fullscreen ? "Exit fullscreen" : "Fullscreen"}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                {fullscreen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
                )}
              </svg>
            </button>
          )}

          {/* Regenerate */}
          <button
            onClick={handleGenerate}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Regenerate flows"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
            </svg>
          </button>
        </div>
      </div>

      {/* Process description */}
      {currentFlow.description && (
        <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <p className="text-xs text-slate-500 dark:text-slate-400">{currentFlow.description}</p>
        </div>
      )}

      {/* Chart area */}
      <div className="flex-1 min-h-0">
        <ProcessFlowChart flow={currentFlow} fullscreen={fullscreen} />
      </div>

      {/* Exceptions bar */}
      {currentFlow.exceptions.length > 0 && (
        <div className="px-4 py-2 border-t border-slate-200 dark:border-slate-700 bg-red-50/50 dark:bg-red-950/20 shrink-0">
          <span className="text-xs font-semibold text-red-600 dark:text-red-400">Known Exceptions: </span>
          <span className="text-xs text-red-500 dark:text-red-400/80">
            {currentFlow.exceptions.join(" · ")}
          </span>
        </div>
      )}
    </div>
  );
}
