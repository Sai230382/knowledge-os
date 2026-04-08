"use client";
import { useState } from "react";
import { AnalysisOutput } from "@/lib/types";
import PatternCards from "./PatternCards";
import KnowledgeGraph from "../graphs/KnowledgeGraph";
import ContextGraph from "../graphs/ContextGraph";
import BenchmarkTab from "./BenchmarkTab";
import ReimagineTab from "./ReimagineTab";
import SynthesisTab from "./SynthesisTab";
import ProcessFlowTab from "./ProcessFlowTab";
import SOPTab from "./SOPTab";

interface ResultsTabsProps {
  analysis: AnalysisOutput;
}

type Tab = "synthesis" | "patterns" | "insights" | "knowledge" | "context" | "process-flow" | "sop" | "benchmarks" | "reimagine";

const TAB_INFO: Record<Tab, { icon: string; description: string }> = {
  synthesis: {
    icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
    description: "Knowledge synthesis — executive summary distilling all findings into key risks, quick wins, and strategic recommendations.",
  },
  patterns: {
    icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2",
    description: "Industry patterns and context intelligence — what formally exists and what's hidden in your data.",
  },
  insights: {
    icon: "M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z",
    description: "Gap analysis and actionable recommendations — what's missing and what should change.",
  },
  knowledge: {
    icon: "M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1",
    description: "The FORMAL map — official entities and documented relationships. Every person, process, system, and concept, and how they connect.",
  },
  context: {
    icon: "M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
    description: "The HIDDEN intelligence layer — how tribal knowledge, exceptions, and undocumented patterns create informal dependencies. This is the context that powers autonomous decisions.",
  },
  "process-flow": {
    icon: "M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7",
    description: "Process Flow — visual flowcharts of key processes with side-by-side As-Is vs AI-powered To-Be comparison. Download as HTML to share.",
  },
  sop: {
    icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
    description: "Standard Operating Procedure — professional SOP with step-by-step procedures, screenshot placeholders, tribal knowledge tips, and areas of opportunity. Download as Word (.docx).",
  },
  benchmarks: {
    icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",
    description: "Industry benchmarks — compare your current processes against best-in-class practices. Get maturity scores and identify priority improvement areas.",
  },
  reimagine: {
    icon: "M13 10V3L4 14h7v7l9-11h-7z",
    description: "Reimagine Lab — see how AI, Agentic AI, and intelligent automation can transform your current processes. Side-by-side As-Is vs AI-powered To-Be.",
  },
};

const FS_LABELS: Record<Tab, { title: string; desc: string }> = {
  synthesis: { title: "Knowledge Synthesis", desc: "Executive summary — key risks, quick wins, and strategic recommendations" },
  patterns: { title: "Patterns & Intelligence", desc: "Industry patterns and context intelligence findings" },
  insights: { title: "Insights", desc: "Gap analysis and actionable recommendations" },
  knowledge: { title: "Knowledge Graph", desc: "Formal entity map — official relationships and documented connections" },
  context: { title: "Context Graph", desc: "Hidden intelligence layer — tribal knowledge, exceptions, and undocumented dependencies" },
  "process-flow": { title: "Process Flow", desc: "Visual flowcharts of key processes — steps, decision points, and exception paths" },
  sop: { title: "Standard Operating Procedure", desc: "Professional SOP with procedures, screenshot placeholders, and areas of opportunity" },
  benchmarks: { title: "Industry Benchmarks", desc: "Compare your processes against best-in-class practices" },
  reimagine: { title: "Reimagine Lab", desc: "AI transformation scenarios for your current processes" },
};

export default function ResultsTabs({ analysis }: ResultsTabsProps) {
  const [activeTab, setActiveTab] = useState<Tab>("synthesis");
  const [fullscreenTab, setFullscreenTab] = useState<Tab | null>(null);
  const [showInfo, setShowInfo] = useState(true);

  const gapCount = (analysis.gap_analysis || []).length;
  const recsCount = (analysis.recommendations || []).length;

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: "synthesis", label: "Synthesis" },
    { id: "patterns", label: "Patterns" },
    { id: "insights", label: "Insights", count: gapCount + recsCount },
    { id: "knowledge", label: "Knowledge Graph" },
    { id: "context", label: "Context Graph" },
    { id: "process-flow", label: "Process Flow" },
    { id: "sop", label: "SOP" },
    { id: "benchmarks", label: "Benchmarks" },
    { id: "reimagine", label: "Reimagine" },
  ];

  // Fullscreen overlay — works for ALL tabs
  if (fullscreenTab) {
    const fsInfo = FS_LABELS[fullscreenTab];

    return (
      <div className="fixed inset-0 z-50 bg-white dark:bg-slate-950 flex flex-col">
        <div className="flex items-center justify-between px-4 py-2 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
          <div>
            <h2 className="font-semibold text-slate-800 dark:text-white">{fsInfo.title}</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">{fsInfo.desc}</p>
          </div>
          <button
            onClick={() => setFullscreenTab(null)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-sm text-slate-700 dark:text-slate-300 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Exit Fullscreen
          </button>
        </div>
        <div className="flex-1 min-h-0 overflow-hidden">
          {fullscreenTab === "synthesis" && (
            <div className="h-full overflow-auto p-4">
              <SynthesisTab analysis={analysis} />
            </div>
          )}
          {fullscreenTab === "patterns" && (
            <div className="h-full overflow-auto p-4">
              <PatternCards analysis={analysis} />
            </div>
          )}
          {fullscreenTab === "insights" && (
            <div className="h-full overflow-auto p-4">
              <InsightsView analysis={analysis} />
            </div>
          )}
          {fullscreenTab === "knowledge" && (
            <KnowledgeGraph data={analysis.knowledge_graph} analysis={analysis} fullscreen />
          )}
          {fullscreenTab === "context" && (
            <ContextGraph data={analysis.context_graph} knowledgeNodes={analysis.knowledge_graph.nodes} analysis={analysis} fullscreen />
          )}
          {fullscreenTab === "process-flow" && (
            <ProcessFlowTab analysis={analysis} fullscreen onToggleFullscreen={() => setFullscreenTab(null)} />
          )}
          {fullscreenTab === "sop" && (
            <div className="h-full overflow-auto p-4">
              <SOPTab analysis={analysis} />
            </div>
          )}
          {fullscreenTab === "benchmarks" && (
            <div className="h-full overflow-auto p-4">
              <BenchmarkTab analysis={analysis} />
            </div>
          )}
          {fullscreenTab === "reimagine" && (
            <div className="h-full overflow-auto p-4">
              <ReimagineTab analysis={analysis} />
            </div>
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
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 flex items-center gap-1.5 ${
              activeTab === tab.id
                ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
                : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300 font-medium">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab description banner + fullscreen button */}
      {showInfo && (
        <div className="flex items-start gap-2.5 px-4 py-2.5 bg-blue-50/70 dark:bg-blue-950/30 border-b border-blue-100 dark:border-blue-900/50 flex-shrink-0">
          <svg className="w-4 h-4 text-blue-500 dark:text-blue-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={TAB_INFO[activeTab].icon} />
          </svg>
          <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed flex-1">
            {TAB_INFO[activeTab].description}
          </p>
          {/* Fullscreen button in info bar */}
          <button
            onClick={() => setFullscreenTab(activeTab)}
            className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/40 hover:bg-blue-200 dark:hover:bg-blue-900/60 rounded transition-colors flex-shrink-0"
            title="Open in fullscreen"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
            Fullscreen
          </button>
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

      {/* Synthesis tab */}
      {activeTab === "synthesis" && (
        <div className="flex-1 overflow-auto p-4">
          <SynthesisTab analysis={analysis} />
        </div>
      )}

      {/* Scrollable content for patterns and insights */}
      {activeTab === "patterns" && (
        <div className="flex-1 overflow-auto p-4">
          <PatternCards analysis={analysis} />
        </div>
      )}

      {activeTab === "insights" && (
        <div className="flex-1 overflow-auto p-4">
          <InsightsView analysis={analysis} />
        </div>
      )}

      {/* Full-height graph containers */}
      {activeTab === "knowledge" && (
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          <div className="flex justify-end px-4 pt-2 pb-1 flex-shrink-0">
            <button
              onClick={() => setFullscreenTab("knowledge")}
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
              onClick={() => setFullscreenTab("context")}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-xs text-slate-600 dark:text-slate-400 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
              Fullscreen
            </button>
          </div>
          <div className="flex-1 min-h-0 px-4 pb-3">
            <ContextGraph data={analysis.context_graph} knowledgeNodes={analysis.knowledge_graph.nodes} analysis={analysis} />
          </div>
        </div>
      )}

      {activeTab === "process-flow" && (
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          <ProcessFlowTab
            analysis={analysis}
            onToggleFullscreen={() => setFullscreenTab("process-flow")}
          />
        </div>
      )}

      {activeTab === "sop" && (
        <div className="flex-1 overflow-auto p-4">
          <SOPTab analysis={analysis} />
        </div>
      )}

      {activeTab === "benchmarks" && (
        <div className="flex-1 overflow-auto p-4">
          <BenchmarkTab analysis={analysis} />
        </div>
      )}

      {activeTab === "reimagine" && (
        <div className="flex-1 overflow-auto p-4">
          <ReimagineTab analysis={analysis} />
        </div>
      )}
    </div>
  );
}

/* ─── Insights View ──────────────────────────────────────── */
function InsightsView({ analysis }: { analysis: AnalysisOutput }) {
  const gaps = analysis.gap_analysis || [];
  const recs = analysis.recommendations || [];

  if (gaps.length === 0 && recs.length === 0) {
    return (
      <div className="text-center py-12 text-slate-400 dark:text-slate-500">
        <p className="text-sm">No gaps or recommendations found</p>
        <p className="text-xs mt-1">Try uploading more detailed operational documents</p>
      </div>
    );
  }

  const GAP_TYPE_COLORS: Record<string, string> = {
    process_gap: "bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300",
    knowledge_gap: "bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300",
    technology_gap: "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300",
    ownership_gap: "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300",
  };

  const GAP_TYPE_LABELS: Record<string, string> = {
    process_gap: "Process Gap",
    knowledge_gap: "Knowledge Gap",
    technology_gap: "Technology Gap",
    ownership_gap: "Ownership Gap",
  };

  const RISK_COLORS: Record<string, string> = {
    high: "text-red-600 dark:text-red-400",
    medium: "text-yellow-600 dark:text-yellow-400",
    low: "text-green-600 dark:text-green-400",
  };

  const PRIORITY_COLORS: Record<string, string> = {
    high: "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300",
    medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300",
    low: "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300",
  };

  return (
    <div className="space-y-6">
      {/* Gap Analysis */}
      {gaps.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-orange-500" />
            Gap Analysis ({gaps.length})
          </h3>
          <div className="space-y-3">
            {gaps.map((gap, i) => (
              <div key={i} className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h4 className="text-sm font-medium text-slate-800 dark:text-slate-200">{gap.title}</h4>
                  <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${GAP_TYPE_COLORS[gap.gap_type] || "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300"}`}>
                    {GAP_TYPE_LABELS[gap.gap_type] || gap.gap_type || "Gap"}
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{gap.description}</p>
                <div className="flex items-center gap-4 mt-2">
                  <span className={`text-xs font-medium ${RISK_COLORS[gap.risk_level] || RISK_COLORS.medium}`}>
                    Risk: {gap.risk_level}
                  </span>
                  {gap.recommendation && (
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      <span className="font-medium">Fix:</span> {gap.recommendation}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommendations */}
      {recs.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-teal-500" />
            Recommendations ({recs.length})
          </h3>
          <div className="space-y-3">
            {recs.map((rec, i) => (
              <div key={i} className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h4 className="text-sm font-medium text-slate-800 dark:text-slate-200">{rec.title}</h4>
                  <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${PRIORITY_COLORS[rec.priority] || PRIORITY_COLORS.medium}`}>
                    {rec.priority} priority
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{rec.description}</p>
                {rec.effort && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                    <span className="font-medium">Effort:</span> {rec.effort}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
