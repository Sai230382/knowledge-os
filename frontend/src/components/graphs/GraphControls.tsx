"use client";
import * as d3 from "d3";

interface GraphControlsProps {
  svgRef: React.RefObject<SVGSVGElement | null>;
}

export default function GraphControls({ svgRef }: GraphControlsProps) {
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
    </div>
  );
}
