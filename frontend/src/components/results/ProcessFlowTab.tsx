"use client";
import { useState, useMemo } from "react";
import { AnalysisOutput, ProcessFlow, ToBeProcessFlow, ReimagineOutput, ContextIntelligence, GapAnalysis } from "@/lib/types";
import { generateProcessFlows, generateToBeProcessFlows, generateReimagine } from "@/lib/api";
import ProcessFlowChart from "../graphs/ProcessFlowChart";
import { generateProcessFlowHTML } from "@/lib/processFlowHtmlExport";

interface ProcessFlowTabProps {
  analysis: AnalysisOutput;
  fullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

/** Find context intelligence and gaps related to a specific process flow */
function getProcessInsights(flow: ProcessFlow, analysis: AnalysisOutput) {
  const flowEntityIds = new Set<string>();
  flow.steps.forEach((step) => {
    step.related_entities.forEach((id) => flowEntityIds.add(id));
  });

  const nameWords = flow.process_name.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
  const matchesText = (text: string) => {
    const lower = text.toLowerCase();
    return nameWords.some((w) => lower.includes(w));
  };

  const relatedIntel = (analysis.context_intelligence || []).filter((ci) => {
    if (ci.related_entities.some((e) => flowEntityIds.has(e))) return true;
    if (flow.exceptions.some((ex) => ci.title.toLowerCase().includes(ex.toLowerCase()) || ex.toLowerCase().includes(ci.title.toLowerCase()))) return true;
    if (matchesText(ci.title) || matchesText(ci.description)) return true;
    return false;
  });

  const relatedGaps = (analysis.gap_analysis || []).filter((gap) => {
    if (matchesText(gap.title) || matchesText(gap.description)) return true;
    if (matchesText(gap.recommendation)) return true;
    return false;
  });

  const relatedRecs = (analysis.recommendations || []).filter((rec) => {
    if (rec.related_entities.some((e) => flowEntityIds.has(e))) return true;
    if (matchesText(rec.title) || matchesText(rec.description)) return true;
    return false;
  });

  return { relatedIntel, relatedGaps, relatedRecs };
}

const INTEL_TYPE_COLORS: Record<string, string> = {
  tribal_knowledge: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  exception: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  workaround: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  process_variation: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300",
  hidden_pattern: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300",
};

const RISK_COLORS: Record<string, string> = {
  high: "text-red-600 dark:text-red-400",
  medium: "text-amber-600 dark:text-amber-400",
  low: "text-emerald-600 dark:text-emerald-400",
};

export default function ProcessFlowTab({ analysis, fullscreen, onToggleFullscreen }: ProcessFlowTabProps) {
  const [processFlows, setProcessFlows] = useState<ProcessFlow[] | null>(null);
  const [toBeFlows, setToBeFlows] = useState<ToBeProcessFlow[] | null>(null);
  const [reimagineData, setReimagineData] = useState<ReimagineOutput | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingToBe, setIsLoadingToBe] = useState(false);
  const [error, setError] = useState("");
  const [showInsights, setShowInsights] = useState(false);
  const [showComparison, setShowComparison] = useState(false);

  const handleGenerate = async () => {
    setIsLoading(true);
    setError("");
    try {
      const result = await generateProcessFlows(analysis);
      setProcessFlows(result);
      setSelectedIndex(0);
      setToBeFlows(null);
      setShowComparison(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate process flows");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateToBe = async () => {
    if (!processFlows) return;
    setIsLoadingToBe(true);
    setError("");
    try {
      // First get reimagine data if we don't have it
      let reimagine = reimagineData;
      if (!reimagine) {
        try {
          reimagine = await generateReimagine(analysis);
          setReimagineData(reimagine);
        } catch {
          // Continue without reimagine data
        }
      }

      const result = await generateToBeProcessFlows(
        analysis,
        processFlows,
        reimagine || undefined,
      );
      setToBeFlows(result);
      setShowComparison(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate To-Be flows");
    } finally {
      setIsLoadingToBe(false);
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

  const currentFlow = processFlows?.[selectedIndex] || null;
  const currentToBe = toBeFlows?.find((f) => f.process_id === currentFlow?.process_id) || toBeFlows?.[selectedIndex] || null;

  const insights = useMemo(() => {
    if (!currentFlow) return null;
    return getProcessInsights(currentFlow, analysis);
  }, [currentFlow, analysis]);

  const insightCount = insights
    ? insights.relatedIntel.length + insights.relatedGaps.length + insights.relatedRecs.length
    : 0;

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
            You can also generate AI-powered To-Be flows for side-by-side comparison.
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
            {processFlows.length} process{processFlows.length !== 1 ? "es" : ""} · {currentFlow!.steps.length} steps
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Compare / To-Be toggle */}
          {!toBeFlows ? (
            <button
              onClick={handleGenerateToBe}
              disabled={isLoadingToBe}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 rounded-lg border border-emerald-200 dark:border-emerald-800 transition-colors disabled:opacity-50"
              title="Generate AI-transformed To-Be flows for comparison"
            >
              {isLoadingToBe ? (
                <>
                  <div className="w-3 h-3 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                  Generating To-Be...
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Compare As-Is vs To-Be
                </>
              )}
            </button>
          ) : (
            <button
              onClick={() => setShowComparison(!showComparison)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                showComparison
                  ? "text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800"
                  : "text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
              }`}
              title="Toggle side-by-side comparison"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7" />
              </svg>
              {showComparison ? "Side-by-Side" : "Show As-Is Only"}
            </button>
          )}

          {/* Insights toggle */}
          <button
            onClick={() => setShowInsights(!showInsights)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
              showInsights
                ? "text-purple-700 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/30 border-purple-200 dark:border-purple-800"
                : "text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
            }`}
            title="Toggle insights panel"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            Insights
            {insightCount > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-200 dark:bg-purple-800 text-purple-700 dark:text-purple-300">
                {insightCount}
              </span>
            )}
          </button>

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

      {/* Transformation summary banner */}
      {showComparison && currentToBe && currentToBe.transformation_summary && (
        <div className="px-4 py-2 bg-emerald-50/80 dark:bg-emerald-950/30 border-b border-emerald-200 dark:border-emerald-800 shrink-0">
          <div className="flex items-start gap-2">
            <svg className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <div>
              <p className="text-xs text-emerald-700 dark:text-emerald-300 leading-relaxed">{currentToBe.transformation_summary}</p>
              {currentToBe.ai_technologies_used.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {currentToBe.ai_technologies_used.map((tech, i) => (
                    <span key={i} className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 font-medium">
                      {tech}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main content: side-by-side charts + optional insights panel */}
      <div className="flex-1 min-h-0 flex overflow-hidden">
        {showComparison && currentToBe ? (
          /* Side-by-side comparison */
          <div className="flex-1 min-w-0 min-h-0 flex">
            {/* Left: As-Is */}
            <div className="flex-1 min-w-0 min-h-0 flex flex-col border-r border-slate-200 dark:border-slate-700">
              <div className="px-3 py-1.5 bg-blue-50/50 dark:bg-blue-950/30 border-b border-slate-200 dark:border-slate-700 shrink-0">
                <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">AS-IS</span>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 ml-2">Current Process</span>
              </div>
              <div className="flex-1 min-h-0">
                <ProcessFlowChart flow={currentFlow!} fullscreen={fullscreen} />
              </div>
            </div>
            {/* Right: To-Be */}
            <div className="flex-1 min-w-0 min-h-0 flex flex-col">
              <div className="px-3 py-1.5 bg-emerald-50/50 dark:bg-emerald-950/30 border-b border-slate-200 dark:border-slate-700 shrink-0">
                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">TO-BE</span>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 ml-2">AI-Transformed</span>
              </div>
              <div className="flex-1 min-h-0">
                <ProcessFlowChart flow={currentToBe as unknown as ProcessFlow} fullscreen={fullscreen} toBeMode />
              </div>
            </div>
          </div>
        ) : (
          /* Single chart view */
          <div className="flex-1 min-w-0 min-h-0">
            <ProcessFlowChart flow={currentFlow!} fullscreen={fullscreen} />
          </div>
        )}

        {/* Insights side panel */}
        {showInsights && insights && insightCount > 0 && (
          <div className="w-72 border-l border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-900/80 overflow-y-auto shrink-0">
            <div className="p-3 space-y-4">
              {/* Context Intelligence */}
              {insights.relatedIntel.length > 0 && (
                <div>
                  <h4 className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                    Hidden Intelligence ({insights.relatedIntel.length})
                  </h4>
                  <div className="space-y-2">
                    {insights.relatedIntel.map((ci, i) => (
                      <div key={i} className="bg-white dark:bg-slate-800 rounded-lg p-2.5 border border-slate-200 dark:border-slate-700">
                        <div className="flex items-start justify-between gap-1.5 mb-1">
                          <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 leading-snug">{ci.title}</span>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded-full shrink-0 ${INTEL_TYPE_COLORS[ci.intel_type] || "bg-slate-100 text-slate-600"}`}>
                            {(ci.intel_type || "").replace(/_/g, " ")}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">{ci.description}</p>
                        {ci.trigger && (
                          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                            <span className="font-semibold">Trigger:</span> {ci.trigger}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className={`text-[10px] font-semibold ${RISK_COLORS[ci.risk_level] || RISK_COLORS.medium}`}>
                            {ci.risk_level} risk
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Gap Analysis */}
              {insights.relatedGaps.length > 0 && (
                <div>
                  <h4 className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                    Process Gaps ({insights.relatedGaps.length})
                  </h4>
                  <div className="space-y-2">
                    {insights.relatedGaps.map((gap, i) => (
                      <div key={i} className="bg-white dark:bg-slate-800 rounded-lg p-2.5 border border-slate-200 dark:border-slate-700">
                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 leading-snug">{gap.title}</span>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed mt-1">{gap.description}</p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className={`text-[10px] font-semibold ${RISK_COLORS[gap.risk_level] || RISK_COLORS.medium}`}>
                            {gap.risk_level} risk
                          </span>
                          <span className="text-[10px] text-slate-400">·</span>
                          <span className="text-[10px] text-slate-400">{(gap.gap_type || "").replace(/_/g, " ")}</span>
                        </div>
                        {gap.recommendation && (
                          <p className="text-[10px] text-teal-600 dark:text-teal-400 mt-1.5 leading-relaxed">
                            <span className="font-semibold">Fix:</span> {gap.recommendation}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recommendations */}
              {insights.relatedRecs.length > 0 && (
                <div>
                  <h4 className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />
                    Recommendations ({insights.relatedRecs.length})
                  </h4>
                  <div className="space-y-2">
                    {insights.relatedRecs.map((rec, i) => (
                      <div key={i} className="bg-white dark:bg-slate-800 rounded-lg p-2.5 border border-slate-200 dark:border-slate-700">
                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 leading-snug">{rec.title}</span>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed mt-1">{rec.description}</p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                            rec.priority === "high" ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300" :
                            rec.priority === "medium" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" :
                            "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
                          }`}>
                            {rec.priority} priority
                          </span>
                          {rec.effort && <span className="text-[10px] text-slate-400">{rec.effort}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Exceptions bar */}
      {currentFlow!.exceptions.length > 0 && (
        <div className="px-4 py-2 border-t border-slate-200 dark:border-slate-700 bg-red-50/50 dark:bg-red-950/20 shrink-0">
          <span className="text-xs font-semibold text-red-600 dark:text-red-400">Known Exceptions: </span>
          <span className="text-xs text-red-500 dark:text-red-400/80">
            {currentFlow!.exceptions.join(" · ")}
          </span>
        </div>
      )}
    </div>
  );
}
