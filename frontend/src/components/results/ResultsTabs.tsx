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

const TAB_INFO: Record<Tab, { icon: string; description: string }> = {
  patterns: {
    icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2",
    description: "Industry trends, client behaviors, undocumented tribal knowledge, and edge-case exceptions — extracted and categorized from your documents.",
  },
  kpis: {
    icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",
    description: "Key performance indicators with trends, derived from numeric and tabular data in your documents.",
  },
  knowledge: {
    icon: "M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1",
    description: "The complete map — every person, process, system, concept, and organization found, and how they all connect. Click any node for details.",
  },
  context: {
    icon: "M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
    description: "The executive overview — the most important entities across all categories and their strategic relationships, in one 360° view. Think of it as the CXO snapshot.",
  },
};

export default function ResultsTabs({ analysis }: ResultsTabsProps) {
  const [activeTab, setActiveTab] = useState<Tab>("patterns");
  const [fullscreenGraph, setFullscreenGraph] = useState<"knowledge" | "context" | null>(null);
  const [showInfo, setShowInfo] = useState(true);

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
          <div>
            <h2 className="font-semibold text-slate-800 dark:text-white">
              {fullscreenGraph === "knowledge" ? "Knowledge Graph" : "Context Graph"}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {fullscreenGraph === "knowledge"
                ? "Complete entity map — all people, processes, systems, concepts, and organizations"
                : "360° executive overview — the most important entities and their strategic connections"}
            </p>
          </div>
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

      {/* Tab description banner */}
      {showInfo && (
        <div className="flex items-start gap-2.5 px-4 py-2.5 bg-blue-50/70 dark:bg-blue-950/30 border-b border-blue-100 dark:border-blue-900/50 flex-shrink-0">
          <svg className="w-4 h-4 text-blue-500 dark:text-blue-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={TAB_INFO[activeTab].icon} />
          </svg>
          <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed flex-1">
            {TAB_INFO[activeTab].description}
          </p>
          <button
            onClick={() => setShowInfo(false)}
            className="text-blue-400 dark:text-blue-500 hover:text-blue-600 dark:hover:text-blue-300 flex-shrink-0 mt-0.5"
            title="Dismiss"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

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
