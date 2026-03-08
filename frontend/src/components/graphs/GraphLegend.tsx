"use client";
import { NODE_COLORS, NODE_LABELS } from "@/lib/constants";

export default function GraphLegend() {
  return (
    <div className="absolute bottom-3 left-3 bg-white/90 dark:bg-slate-900/90 backdrop-blur border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 shadow-sm">
      <div className="flex flex-wrap gap-3">
        {Object.entries(NODE_COLORS).map(([type, color]) => (
          <div key={type} className="flex items-center gap-1.5">
            <div
              className="w-3 h-3 rounded-full border border-white dark:border-slate-800 shadow-sm"
              style={{ backgroundColor: color }}
            />
            <span className="text-xs text-slate-600 dark:text-slate-400">{NODE_LABELS[type]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
