"use client";
import { useState } from "react";
import { AnalysisOutput, SynthesisOutput } from "@/lib/types";
import { generateSynthesis } from "@/lib/api";

interface SynthesisTabProps {
  analysis: AnalysisOutput;
}

const SEVERITY_STYLES: Record<string, { bg: string; border: string; icon: string; iconColor: string }> = {
  info: {
    bg: "bg-blue-50 dark:bg-blue-950/30",
    border: "border-blue-200 dark:border-blue-800",
    icon: "M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
    iconColor: "text-blue-500",
  },
  warning: {
    bg: "bg-amber-50 dark:bg-amber-950/30",
    border: "border-amber-200 dark:border-amber-800",
    icon: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z",
    iconColor: "text-amber-500",
  },
  critical: {
    bg: "bg-red-50 dark:bg-red-950/30",
    border: "border-red-200 dark:border-red-800",
    icon: "M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
    iconColor: "text-red-500",
  },
  success: {
    bg: "bg-emerald-50 dark:bg-emerald-950/30",
    border: "border-emerald-200 dark:border-emerald-800",
    icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
    iconColor: "text-emerald-500",
  },
};

export default function SynthesisTab({ analysis }: SynthesisTabProps) {
  const [synthesis, setSynthesis] = useState<SynthesisOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");

  const handleGenerate = async () => {
    setIsLoading(true);
    setError("");
    try {
      const result = await generateSynthesis(analysis, query);
      setSynthesis(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate synthesis");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <div className="w-10 h-10 border-4 border-emerald-200 dark:border-emerald-800 border-t-emerald-600 dark:border-t-emerald-400 rounded-full animate-spin" />
        <p className="text-sm text-slate-500 dark:text-slate-400">Synthesizing knowledge findings...</p>
        <p className="text-xs text-slate-400 dark:text-slate-500">Creating your executive summary</p>
      </div>
    );
  }

  if (!synthesis) {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
          <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <div className="text-center space-y-2">
          <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200">Knowledge Synthesis</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md">
            Generate a concise executive summary that distills all findings into
            key risks, quick wins, and strategic recommendations.
          </p>
        </div>
        <div className="w-full max-w-sm space-y-3">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask a specific question (optional)..."
            className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
          />
          <button
            onClick={handleGenerate}
            className="w-full px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-sm font-medium rounded-lg transition-all shadow-sm hover:shadow-md"
          >
            Generate Knowledge Summary
          </button>
        </div>
        {error && <p className="text-sm text-red-500">{error}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Title + Regenerate */}
      <div className="flex items-start justify-between">
        <h2 className="text-xl font-bold text-slate-800 dark:text-white">{synthesis.title}</h2>
        <button
          onClick={() => setSynthesis(null)}
          className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors flex-shrink-0 mt-1"
        >
          Regenerate
        </button>
      </div>

      {/* Executive Summary */}
      <div className="bg-gradient-to-r from-slate-50 to-blue-50 dark:from-slate-800/50 dark:to-blue-950/30 border border-slate-200 dark:border-slate-700 rounded-xl p-5">
        <h3 className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">Executive Summary</h3>
        <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{synthesis.executive_summary}</p>
      </div>

      {/* Sections */}
      <div className="space-y-3">
        {synthesis.sections.map((section, i) => {
          const style = SEVERITY_STYLES[section.severity] || SEVERITY_STYLES.info;
          return (
            <div key={i} className={`${style.bg} border ${style.border} rounded-lg p-4`}>
              <div className="flex items-start gap-3">
                <svg className={`w-5 h-5 ${style.iconColor} mt-0.5 flex-shrink-0`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={style.icon} />
                </svg>
                <div>
                  <h4 className="font-semibold text-slate-800 dark:text-slate-200 text-sm">{section.heading}</h4>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">{section.content}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Three columns: Risks | Quick Wins | Strategic */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Key Risks */}
        {synthesis.key_risks.length > 0 && (
          <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
            <h3 className="text-xs font-semibold text-red-600 dark:text-red-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              Key Risks
            </h3>
            <ul className="space-y-2">
              {synthesis.key_risks.map((risk, i) => (
                <li key={i} className="text-xs text-slate-700 dark:text-slate-300 flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5 flex-shrink-0" />
                  {risk}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Quick Wins */}
        {synthesis.quick_wins.length > 0 && (
          <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4">
            <h3 className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Quick Wins
            </h3>
            <ul className="space-y-2">
              {synthesis.quick_wins.map((win, i) => (
                <li key={i} className="text-xs text-slate-700 dark:text-slate-300 flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 flex-shrink-0" />
                  {win}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Strategic Recommendations */}
        {synthesis.strategic_recommendations.length > 0 && (
          <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
            <h3 className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
              Strategic Recommendations
            </h3>
            <ul className="space-y-2">
              {synthesis.strategic_recommendations.map((rec, i) => (
                <li key={i} className="text-xs text-slate-700 dark:text-slate-300 flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 flex-shrink-0" />
                  {rec}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
