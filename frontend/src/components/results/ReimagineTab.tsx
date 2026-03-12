"use client";
import { useState } from "react";
import { AnalysisOutput, ReimagineOutput } from "@/lib/types";
import { generateReimagine } from "@/lib/api";

interface ReimagineTabProps {
  analysis: AnalysisOutput;
}

const EFFORT_COLORS: Record<string, string> = {
  low: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  medium: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  high: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
};

function ImpactBar({ score }: { score: number }) {
  const percentage = (score / 10) * 100;
  const color =
    score >= 8 ? "bg-emerald-500" : score >= 6 ? "bg-blue-500" : score >= 4 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${percentage}%` }} />
      </div>
      <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 w-8 text-right">{score.toFixed(1)}</span>
    </div>
  );
}

export default function ReimagineTab({ analysis }: ReimagineTabProps) {
  const [reimagine, setReimagine] = useState<ReimagineOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleGenerate = async () => {
    setIsLoading(true);
    setError("");
    try {
      const result = await generateReimagine(analysis);
      setReimagine(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate transformation scenarios");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <div className="w-10 h-10 border-4 border-violet-200 dark:border-violet-800 border-t-violet-600 dark:border-t-violet-400 rounded-full animate-spin" />
        <p className="text-sm text-slate-500 dark:text-slate-400">Designing AI transformation scenarios...</p>
        <p className="text-xs text-slate-400 dark:text-slate-500">This may take 30-60 seconds</p>
      </div>
    );
  }

  if (!reimagine) {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center">
          <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <div className="text-center space-y-2">
          <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200">Reimagine Lab</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md">
            See how AI, Agentic AI, and intelligent automation can transform your current processes.
            Side-by-side As-Is vs To-Be with specific AI technologies and implementation roadmaps.
          </p>
        </div>
        <button
          onClick={handleGenerate}
          className="px-6 py-2.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white text-sm font-medium rounded-lg transition-all shadow-sm hover:shadow-md"
        >
          Generate Transformation Scenarios
        </button>
        {error && <p className="text-sm text-red-500">{error}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-violet-50 to-fuchsia-50 dark:from-violet-950/40 dark:to-fuchsia-950/40 border border-violet-200 dark:border-violet-800 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-white">AI Transformation Roadmap</h3>
          <button
            onClick={() => setReimagine(null)}
            className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
          >
            Regenerate
          </button>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">{reimagine.transformation_summary}</p>
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Overall Impact:</span>
          <div className="flex-1 max-w-xs">
            <ImpactBar score={reimagine.total_impact_score} />
          </div>
          <span className="text-sm text-slate-500 dark:text-slate-400">/ 10</span>
        </div>
      </div>

      {/* Process Cards */}
      <div className="space-y-4">
        {reimagine.processes.map((proc, i) => (
          <div
            key={i}
            className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden bg-white dark:bg-slate-800/50"
          >
            {/* Card Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
              <h4 className="font-semibold text-slate-700 dark:text-slate-200">{proc.process_name}</h4>
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-500 dark:text-slate-400">Impact:</span>
                <div className="w-24">
                  <ImpactBar score={proc.impact_score} />
                </div>
              </div>
            </div>

            {/* Side-by-side As-Is → To-Be */}
            <div className="grid grid-cols-2 gap-0">
              {/* As-Is */}
              <div className="p-4 bg-red-50/50 dark:bg-red-950/20 border-r border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-1.5 mb-2">
                  <div className="w-2 h-2 rounded-full bg-red-400" />
                  <span className="text-xs font-semibold text-red-600 dark:text-red-400 uppercase tracking-wider">As-Is (Current)</span>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-300">{proc.as_is}</p>
              </div>

              {/* To-Be */}
              <div className="p-4 bg-emerald-50/50 dark:bg-emerald-950/20">
                <div className="flex items-center gap-1.5 mb-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">To-Be (AI-Powered)</span>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-300">{proc.to_be}</p>
              </div>
            </div>

            {/* Footer: AI Tech + Effort + Timeline */}
            <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex-wrap">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-violet-100 dark:bg-violet-900/40 text-violet-800 dark:text-violet-300 rounded-full text-xs font-medium">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                {proc.ai_technology}
              </span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${EFFORT_COLORS[proc.implementation_effort] || EFFORT_COLORS.medium}`}>
                {proc.implementation_effort} effort
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {proc.timeline}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
