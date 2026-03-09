"use client";
import { AnalysisResponse } from "@/lib/types";
import ResultsTabs from "../results/ResultsTabs";

interface RightPanelProps {
  result: AnalysisResponse | null;
  error: string;
}

export default function RightPanel({ result, error }: RightPanelProps) {
  if (error) {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-4 max-w-md text-center">
          <p className="text-red-800 dark:text-red-300 text-sm font-medium">Analysis Error</p>
          <p className="text-red-600 dark:text-red-400 text-xs mt-1">{error}</p>
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-slate-400 dark:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <h3 className="text-slate-600 dark:text-slate-300 font-medium">Ready to analyze</h3>
          <p className="text-slate-400 dark:text-slate-500 text-sm mt-2">
            Upload files, provide a path, or paste text to extract patterns, tribal knowledge, and intelligence
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 px-4 py-2 flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
        <span>{result.files_processed} file{result.files_processed !== 1 ? "s" : ""} processed</span>
        <span className="text-slate-300 dark:text-slate-600">|</span>
        <span>{result.total_text_length.toLocaleString()} chars analyzed</span>
        <span className="text-slate-300 dark:text-slate-600">|</span>
        <span>{result.analysis.knowledge_graph.nodes.length} entities found</span>
      </div>
      <div className="flex-1 overflow-hidden">
        <ResultsTabs analysis={result.analysis} />
      </div>
    </div>
  );
}
