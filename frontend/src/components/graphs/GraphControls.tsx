"use client";
import * as d3 from "d3";

interface GraphControlsProps {
  svgRef: React.RefObject<SVGSVGElement | null>;
  onExportHtml?: () => void;
}

export default function GraphControls({ svgRef, onExportHtml }: GraphControlsProps) {
  const handleZoomIn = () => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.transition().duration(300).call(
      d3.zoom<SVGSVGElement, unknown>().on("zoom", () => {}).scaleBy,
      1.3
    );
  };

  const handleZoomOut = () => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.transition().duration(300).call(
      d3.zoom<SVGSVGElement, unknown>().on("zoom", () => {}).scaleBy,
      0.7
    );
  };

  const handleReset = () => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.transition().duration(500).call(
      d3.zoom<SVGSVGElement, unknown>().on("zoom", () => {}).transform,
      d3.zoomIdentity
    );
  };

  return (
    <div className="absolute top-3 right-3 flex flex-col gap-1 z-10">
      <button
        onClick={handleZoomIn}
        className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-md w-8 h-8 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-sm text-sm font-bold transition-colors"
        title="Zoom in"
      >
        +
      </button>
      <button
        onClick={handleZoomOut}
        className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-md w-8 h-8 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-sm text-sm font-bold transition-colors"
        title="Zoom out"
      >
        -
      </button>
      <button
        onClick={handleReset}
        className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-md w-8 h-8 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-sm text-xs transition-colors"
        title="Reset view"
      >
        R
      </button>
      {onExportHtml && (
        <>
          <div className="h-px bg-slate-200 dark:bg-slate-600 my-0.5" />
          <button
            onClick={onExportHtml}
            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-md w-8 h-8 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-300 dark:hover:border-blue-600 shadow-sm transition-colors"
            title="Download as shareable HTML"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </button>
        </>
      )}
    </div>
  );
}
