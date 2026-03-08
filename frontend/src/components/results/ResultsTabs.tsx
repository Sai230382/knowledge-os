"use client";
import { useState } from "react";
import { AnalysisOutput } from "@/lib/types";
import PatternCards from "./PatternCards";
import KPITable from "./KPITable";
import KnowledgeGraph from "../graphs/KnowledgeGraph";
import ContextGraph from "../graphs/ContextGraph";

interface ResultsTabsProps {
  analysis: AnalysisOutput;
}

type Tab = "patterns" | "kpis" | "knowledge" | "context";

export default function ResultsTabs({ analysis }: ResultsTabsProps) {
  const [activeTab, setActiveTab] = useState<Tab>("patterns");
  const [fullscreenGraph, setFullscreenGraph] = useState<"knowledge" | "context" | null>(null);

  const tabs: { id: Tab; label: string }[] = [
    { id: "patterns", label: "Patterns" },
    { id: "kpis", label: "KPIs" },
    { id: "knowledge", label: "Knowledge Graph" },
    { id: "context", label: "Context Graph" },
  ];

  // Fullscreen graph overlay
  if (fullscreenGraph) {
    return (
      <div className="fixed inset-0 z-50 bg-white dark:bg-slate-950 flex flex-col">
        <div className="flex items-center justify-between px-4 py-2 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
          <h2 className="font-semibold text-slate-800 dark:text-white">
            {fullscreenGraph === "knowledge" ? "Knowledge Graph" : "Context Graph"}
          </h2>
          <button
            onClick={() => setFullscreenGraph(null)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-sm text-slate-700 dark:text-slate-300 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Exit Fullscreen
          </button>
        </div>
        <div className="flex-1 min-h-0 overflow-hidden">
          {fullscreenGraph === "knowledge" ? (
            <KnowledgeGraph data={analysis.knowledge_graph} analysis={analysis} fullscreen />
          ) : (
            <ContextGraph data={analysis.context_graph} analysis={analysis} fullscreen />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 sticky top-0 z-10">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 ${
              activeTab === tab.id
                ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
                : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Scrollable content for patterns/KPIs */}
      {(activeTab === "patterns" || activeTab === "kpis") && (
        <div className="flex-1 overflow-auto p-4">
          {activeTab === "patterns" && <PatternCards analysis={analysis} />}
          {activeTab === "kpis" && <KPITable kpis={analysis.kpis || []} />}
        </div>
      )}

      {/* Full-height graph containers — no padding, no scroll, fill available space */}
      {activeTab === "knowledge" && (
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          <div className="flex justify-end px-4 pt-2 pb-1 flex-shrink-0">
            <button
              onClick={() => setFullscreenGraph("knowledge")}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-xs text-slate-600 dark:text-slate-400 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
              Fullscreen
            </button>
          </div>
          <div className="flex-1 min-h-0 px-4 pb-3">
            <KnowledgeGraph data={analysis.knowledge_graph} analysis={analysis} />
          </div>
        </div>
      )}

      {activeTab === "context" && (
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          <div className="flex justify-end px-4 pt-2 pb-1 flex-shrink-0">
            <button
              onClick={() => setFullscreenGraph("context")}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-xs text-slate-600 dark:text-slate-400 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
              Fullscreen
            </button>
          </div>
          <div className="flex-1 min-h-0 px-4 pb-3">
            <ContextGraph data={analysis.context_graph} analysis={analysis} />
          </div>
        </div>
      )}
    </div>
  );
}
