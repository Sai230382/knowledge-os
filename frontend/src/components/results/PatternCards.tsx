"use client";
import { useState } from "react";
import { AnalysisOutput } from "@/lib/types";

interface PatternCardsProps {
  analysis: AnalysisOutput;
}

const CONFIDENCE_COLORS = {
  high: "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300",
  medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300",
  low: "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300",
};

const INTEL_TYPE_LABELS: Record<string, string> = {
  tribal_knowledge: "Tribal",
  exception: "Exception",
  workaround: "Workaround",
  process_variation: "Process Var",
  hidden_pattern: "Hidden Pattern",
};

const INTEL_TYPE_COLORS: Record<string, string> = {
  tribal_knowledge: "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300",
  exception: "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300",
  workaround: "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300",
  process_variation: "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300",
  hidden_pattern: "bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300",
};

const GAP_TYPE_LABELS: Record<string, string> = {
  process_gap: "Process",
  knowledge_gap: "Knowledge",
  technology_gap: "Technology",
  ownership_gap: "Ownership",
};

const PRIORITY_COLORS = {
  high: "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300",
  medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300",
  low: "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300",
};

export default function PatternCards({ analysis }: PatternCardsProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Industry Patterns */}
      <PatternCard
        title="Industry Patterns"
        color="blue"
        items={analysis.industry_patterns.map((p) => ({
          title: p.title,
          description: p.description,
          badge: p.confidence,
          badgeClass: CONFIDENCE_COLORS[p.confidence],
          details: p.evidence.length > 0 ? (
            <div className="mt-2 space-y-1">
              <p className="text-xs font-medium text-slate-500">Evidence:</p>
              {p.evidence.map((e, i) => (
                <p key={i} className="text-xs text-slate-500 italic pl-2 border-l-2 border-slate-200">
                  {e}
                </p>
              ))}
            </div>
          ) : null,
        }))}
      />

      {/* Context Intelligence — unified hidden knowledge */}
      <PatternCard
        title="Context Intelligence"
        color="amber"
        items={(analysis.context_intelligence || []).map((ci) => ({
          title: ci.title,
          description: ci.description,
          badge: INTEL_TYPE_LABELS[ci.intel_type] || ci.intel_type || "Intel",
          badgeClass: INTEL_TYPE_COLORS[ci.intel_type] || INTEL_TYPE_COLORS.tribal_knowledge,
          details: (
            <div className="text-xs text-slate-500 mt-1 space-y-0.5">
              {ci.trigger && <p><span className="font-medium">Trigger:</span> {ci.trigger}</p>}
              {ci.impact && <p><span className="font-medium">Impact:</span> {ci.impact}</p>}
              {ci.formalization_action && <p><span className="font-medium">Action:</span> {ci.formalization_action}</p>}
              <p><span className="font-medium">Risk:</span> {ci.risk_level}</p>
            </div>
          ),
        }))}
      />

      {/* Gap Analysis */}
      <PatternCard
        title="Gap Analysis"
        color="purple"
        items={(analysis.gap_analysis || []).map((g) => ({
          title: g.title,
          description: g.description,
          badge: GAP_TYPE_LABELS[g.gap_type] || g.gap_type || "Gap",
          badgeClass: CONFIDENCE_COLORS[g.risk_level],
          details: g.recommendation ? (
            <p className="text-xs text-slate-500 mt-1">
              <span className="font-medium">Recommendation:</span> {g.recommendation}
            </p>
          ) : null,
        }))}
      />

      {/* Recommendations */}
      <PatternCard
        title="Recommendations"
        color="teal"
        items={(analysis.recommendations || []).map((r) => ({
          title: r.title,
          description: r.description,
          badge: `Priority: ${r.priority}`,
          badgeClass: PRIORITY_COLORS[r.priority] || PRIORITY_COLORS.medium,
          details: r.effort ? (
            <p className="text-xs text-slate-500 mt-1">
              <span className="font-medium">Effort:</span> {r.effort}
            </p>
          ) : null,
        }))}
      />
    </div>
  );
}

interface CardItem {
  title: string;
  description: string;
  badge?: string;
  badgeClass?: string;
  details?: React.ReactNode;
}

interface PatternCardProps {
  title: string;
  color: "blue" | "green" | "amber" | "red" | "purple" | "teal";
  items: CardItem[];
}

const COLOR_MAP = {
  blue: { bg: "bg-blue-50 dark:bg-blue-950/40", border: "border-blue-200 dark:border-blue-800", header: "bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300", badge: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300" },
  green: { bg: "bg-green-50 dark:bg-green-950/40", border: "border-green-200 dark:border-green-800", header: "bg-green-100 text-green-800 dark:bg-green-900/60 dark:text-green-300", badge: "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300" },
  amber: { bg: "bg-amber-50 dark:bg-amber-950/40", border: "border-amber-200 dark:border-amber-800", header: "bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300", badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300" },
  red: { bg: "bg-red-50 dark:bg-red-950/40", border: "border-red-200 dark:border-red-800", header: "bg-red-100 text-red-800 dark:bg-red-900/60 dark:text-red-300", badge: "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300" },
  purple: { bg: "bg-purple-50 dark:bg-purple-950/40", border: "border-purple-200 dark:border-purple-800", header: "bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-300", badge: "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300" },
  teal: { bg: "bg-teal-50 dark:bg-teal-950/40", border: "border-teal-200 dark:border-teal-800", header: "bg-teal-100 text-teal-800 dark:bg-teal-900/60 dark:text-teal-300", badge: "bg-teal-100 text-teal-700 dark:bg-teal-900/50 dark:text-teal-300" },
};

function PatternCard({ title, color, items }: PatternCardProps) {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const colors = COLOR_MAP[color];

  return (
    <div className={`border ${colors.border} rounded-lg overflow-hidden`}>
      <div className={`${colors.header} px-4 py-2.5 flex items-center justify-between`}>
        <h3 className="font-semibold text-sm">{title}</h3>
        <span className="text-xs font-medium opacity-80">{items.length} found</span>
      </div>
      <div className={`${colors.bg} max-h-80 overflow-y-auto`}>
        {items.length === 0 ? (
          <p className="text-sm text-slate-400 dark:text-slate-500 px-4 py-6 text-center">No items found</p>
        ) : (
          <div className="divide-y divide-white/60">
            {items.map((item, i) => (
              <div
                key={i}
                className="px-4 py-3 cursor-pointer hover:bg-white/40 dark:hover:bg-white/5 transition-colors"
                onClick={() => setExpandedIdx(expandedIdx === i ? null : i)}
              >
                <div className="flex items-start justify-between gap-2">
                  <h4 className="text-sm font-medium text-slate-800 dark:text-slate-200">{item.title}</h4>
                  {item.badge && (
                    <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${item.badgeClass || colors.badge}`}>
                      {item.badge}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">{item.description}</p>
                {expandedIdx === i && item.details}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
