"use client";
import { KPI } from "@/lib/types";

interface KPITableProps {
  kpis: KPI[];
}

const TREND_ICONS: Record<string, { icon: string; color: string }> = {
  up: { icon: "\u2191", color: "text-green-600 dark:text-green-400" },
  down: { icon: "\u2193", color: "text-red-600 dark:text-red-400" },
  stable: { icon: "\u2192", color: "text-slate-500 dark:text-slate-400" },
};

export default function KPITable({ kpis }: KPITableProps) {
  if (kpis.length === 0) {
    return (
      <div className="text-center py-12 text-slate-400 dark:text-slate-500">
        <p className="text-sm">No KPIs derived from the data</p>
        <p className="text-xs mt-1">Upload Excel files with numeric data to see KPI analysis</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
            <th className="text-left px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">Metric</th>
            <th className="text-left px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">Value</th>
            <th className="text-center px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">Trend</th>
            <th className="text-left px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">Explanation</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {kpis.map((kpi, i) => {
            const trend = TREND_ICONS[kpi.trend];
            return (
              <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">{kpi.metric}</td>
                <td className="px-4 py-3 text-slate-700 dark:text-slate-300 font-mono">{kpi.value}</td>
                <td className="px-4 py-3 text-center">
                  <span className={`text-lg font-bold ${trend.color}`}>{trend.icon}</span>
                </td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-400 text-xs leading-relaxed max-w-md">
                  {kpi.note}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
