"use client";
import { getNodeColor, getNodeLabel } from "@/lib/constants";

interface GraphLegendProps {
  /** Only show legend items for types actually present in the graph */
  activeTypes?: string[];
}

export default function GraphLegend({ activeTypes }: GraphLegendProps) {
  // Default to common types if no active types provided
  const types = activeTypes || ["person", "process", "technology", "concept", "organization"];

  return (
    <div className="absolute bottom-3 left-3 bg-white/90 dark:bg-slate-900/90 backdrop-blur border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 shadow-sm">
      <div className="flex flex-wrap gap-3">
        {types.map((type) => (
          <div key={type} className="flex items-center gap-1.5">
            <div
              className="w-3 h-3 rounded-full border border-white dark:border-slate-800 shadow-sm"
              style={{ backgroundColor: getNodeColor(type) }}
            />
            <span className="text-xs text-slate-600 dark:text-slate-400">{getNodeLabel(type)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
