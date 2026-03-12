"use client";
import { useState } from "react";
import { AnalysisOutput, BenchmarkOutput } from "@/lib/types";
import { generateBenchmarks } from "@/lib/api";

interface BenchmarkTabProps {
  analysis: AnalysisOutput;
}

const PRIORITY_COLORS: Record<string, string> = {
  high: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  medium: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  low: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
};

function MaturityBar({ score }: { score: number }) {
  const percentage = (score / 5) * 100;
  const color =
    score >= 4 ? "bg-emerald-500" : score >= 3 ? "bg-amber-500" : score >= 2 ? "bg-orange-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${percentage}%` }} />
      </div>
      <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 w-8 text-right">{score.toFixed(1)}</span>
    </div>
  );
}

export default function BenchmarkTab({ analysis }: BenchmarkTabProps) {
  const [benchmark, setBenchmark] = useState<BenchmarkOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [industryContext, setIndustryContext] = useState("");

  const handleGenerate = async () => {
    setIsLoading(true);
    setError("");
    try {
      const result = await generateBenchmarks(analysis, industryContext);
      setBenchmark(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate benchmarks");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <div className="w-10 h-10 border-4 border-blue-200 dark:border-blue-800 border-t-blue-600 dark:border-t-blue-400 rounded-full animate-spin" />
        <p className="text-sm text-slate-500 dark:text-slate-400">Comparing against industry benchmarks...</p>
        <p className="text-xs text-slate-400 dark:text-slate-500">This may take 30-60 seconds</p>
      </div>
    );
  }

  if (!benchmark) {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
          <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <div className="text-center space-y-2">
          <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200">Industry Benchmarks</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md">
            Compare your current processes against industry best practices.
            Get maturity scores and identify priority improvement areas.
          </p>
        </div>
        <div className="w-full max-w-sm space-y-3">
          <input
            type="text"
            value={industryContext}
            onChange={(e) => setIndustryContext(e.target.value)}
            placeholder="Industry context (e.g., logistics, banking)... optional"
            className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          />
          <button
            onClick={handleGenerate}
            className="w-full px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-sm font-medium rounded-lg transition-all shadow-sm hover:shadow-md"
          >
            Generate Benchmark Analysis
          </button>
        </div>
        {error && <p className="text-sm text-red-500">{error}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/40 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-lg font-semibold text-slate-800 dark:text-white">
              {benchmark.industry || "Industry"} Benchmark Analysis
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{benchmark.summary}</p>
          </div>
          <button
            onClick={() => setBenchmark(null)}
            className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
          >
            Regenerate
          </button>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Overall Maturity:</span>
          <div className="flex-1 max-w-xs">
            <MaturityBar score={benchmark.overall_maturity} />
          </div>
          <span className="text-sm text-slate-500 dark:text-slate-400">/ 5.0</span>
        </div>
      </div>

      {/* Comparison Cards */}
      <div className="space-y-4">
        {benchmark.comparisons.map((comp, i) => (
          <div
            key={i}
            className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden bg-white dark:bg-slate-800/50"
          >
            {/* Card Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
              <h4 className="font-semibold text-slate-700 dark:text-slate-200">{comp.area}</h4>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${PRIORITY_COLORS[comp.priority] || PRIORITY_COLORS.medium}`}>
                  {comp.priority}
                </span>
                <div className="w-24">
                  <MaturityBar score={comp.maturity_score} />
                </div>
              </div>
            </div>

            {/* Two-column comparison */}
            <div className="grid grid-cols-2 gap-0 divide-x divide-slate-200 dark:divide-slate-700">
              {/* Current State */}
              <div className="p-4 bg-red-50/50 dark:bg-red-950/20">
                <div className="flex items-center gap-1.5 mb-2">
                  <div className="w-2 h-2 rounded-full bg-red-400" />
                  <span className="text-xs font-semibold text-red-600 dark:text-red-400 uppercase tracking-wider">Current State</span>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-300">{comp.current_state}</p>
              </div>

              {/* Industry Benchmark */}
              <div className="p-4 bg-emerald-50/50 dark:bg-emerald-950/20">
                <div className="flex items-center gap-1.5 mb-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Industry Benchmark</span>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-300">{comp.industry_benchmark}</p>
              </div>
            </div>

            {/* Delta */}
            <div className="px-4 py-3 bg-amber-50/50 dark:bg-amber-950/20 border-t border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-1.5 mb-1">
                <svg className="w-3.5 h-3.5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
                <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Gap</span>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-300">{comp.delta}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
