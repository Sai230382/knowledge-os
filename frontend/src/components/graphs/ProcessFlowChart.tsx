"use client";
import { useRef, useEffect, useState, useMemo, useCallback } from "react";
import * as d3 from "d3";
import { ProcessFlow, ProcessStep } from "@/lib/types";

interface ProcessFlowChartProps {
  flow: ProcessFlow;
  fullscreen?: boolean;
}

// Layout constants — generous sizing for readability
const NODE_WIDTH = 260;
const NODE_HEIGHT = 70;
const DECISION_SIZE = 90;
const RANK_GAP_Y = 120;
const SIBLING_GAP_X = 60;
const PADDING = 80;

// Colors
const STEP_COLORS: Record<string, { fill: string; stroke: string; text: string }> = {
  start: { fill: "#D1FAE5", stroke: "#059669", text: "#065F46" },
  end: { fill: "#FEE2E2", stroke: "#DC2626", text: "#991B1B" },
  action: { fill: "#EFF6FF", stroke: "#2563EB", text: "#1E40AF" },
  decision: { fill: "#FFFBEB", stroke: "#D97706", text: "#92400E" },
  exception: { fill: "#FEF2F2", stroke: "#EF4444", text: "#991B1B" },
};

interface LayoutNode {
  step: ProcessStep;
  x: number;
  y: number;
  rank: number;
  width: number;
  height: number;
}

interface LayoutEdge {
  source: LayoutNode;
  target: LayoutNode;
  label: string;
}

/** Word-wrap text into lines that fit within maxWidth (approximate at ~7px per char) */
function wrapText(text: string, maxChars: number): string[] {
  if (text.length <= maxChars) return [text];
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const test = current ? current + " " + word : word;
    if (test.length <= maxChars) {
      current = test;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  // Max 2 lines, truncate if more
  if (lines.length > 2) {
    lines[1] = lines[1].slice(0, maxChars - 3) + "...";
    return lines.slice(0, 2);
  }
  return lines;
}

function computeLayout(flow: ProcessFlow): { nodes: LayoutNode[]; edges: LayoutEdge[] } {
  const steps = flow.steps;
  if (!steps.length) return { nodes: [], edges: [] };

  const stepMap = new Map<string, ProcessStep>();
  steps.forEach((s) => stepMap.set(s.id, s));

  // Find start node
  const startStep = steps.find((s) => s.step_type === "start") || steps[0];

  // BFS to assign ranks
  const rankMap = new Map<string, number>();
  const queue: { id: string; rank: number }[] = [{ id: startStep.id, rank: 0 }];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const { id, rank } = queue.shift()!;
    if (visited.has(id)) continue;
    visited.add(id);
    rankMap.set(id, Math.max(rankMap.get(id) || 0, rank));

    const step = stepMap.get(id);
    if (step) {
      for (const nextId of step.next_steps) {
        if (!visited.has(nextId)) {
          queue.push({ id: nextId, rank: rank + 1 });
        }
      }
    }
  }

  // Include unvisited nodes at the end
  steps.forEach((s) => {
    if (!rankMap.has(s.id)) {
      rankMap.set(s.id, (Math.max(...Array.from(rankMap.values())) || 0) + 1);
    }
  });

  // Group by rank
  const rankGroups = new Map<number, ProcessStep[]>();
  steps.forEach((s) => {
    const rank = rankMap.get(s.id) || 0;
    if (!rankGroups.has(rank)) rankGroups.set(rank, []);
    rankGroups.get(rank)!.push(s);
  });

  // Position nodes
  const layoutNodes: LayoutNode[] = [];
  const nodeMap = new Map<string, LayoutNode>();
  const sortedRanks = Array.from(rankGroups.keys()).sort((a, b) => a - b);

  sortedRanks.forEach((rank) => {
    const group = rankGroups.get(rank)!;
    const totalWidth = group.length * NODE_WIDTH + (group.length - 1) * SIBLING_GAP_X;
    const startX = -totalWidth / 2;

    group.forEach((step, i) => {
      const isDiamond = step.step_type === "decision";
      const w = isDiamond ? DECISION_SIZE * 2 : NODE_WIDTH;
      const h = isDiamond ? DECISION_SIZE : NODE_HEIGHT;
      const node: LayoutNode = {
        step,
        x: startX + i * (NODE_WIDTH + SIBLING_GAP_X) + NODE_WIDTH / 2,
        y: rank * RANK_GAP_Y + PADDING,
        rank,
        width: w,
        height: h,
      };
      layoutNodes.push(node);
      nodeMap.set(step.id, node);
    });
  });

  // Build edges
  const layoutEdges: LayoutEdge[] = [];
  steps.forEach((step) => {
    const sourceNode = nodeMap.get(step.id);
    if (!sourceNode) return;
    step.next_steps.forEach((nextId) => {
      const targetNode = nodeMap.get(nextId);
      if (!targetNode) return;
      const label = step.branch_labels?.[nextId] || "";
      layoutEdges.push({ source: sourceNode, target: targetNode, label });
    });
  });

  return { nodes: layoutNodes, edges: layoutEdges };
}

export default function ProcessFlowChart({ flow }: ProcessFlowChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedStep, setSelectedStep] = useState<ProcessStep | null>(null);

  const layout = useMemo(() => computeLayout(flow), [flow]);

  const handleStepClick = useCallback((step: ProcessStep) => {
    setSelectedStep((prev) => (prev?.id === step.id ? null : step));
  }, []);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const containerRect = containerRef.current.getBoundingClientRect();
    const width = containerRect.width;
    const height = containerRect.height;
    if (width < 10 || height < 10) return; // Guard against invisible container

    svg.attr("width", width).attr("height", height);

    // Defs for arrowheads and drop shadow
    const defs = svg.append("defs");

    // Drop shadow filter
    const filter = defs.append("filter").attr("id", "shadow").attr("x", "-10%").attr("y", "-10%").attr("width", "120%").attr("height", "130%");
    filter.append("feDropShadow").attr("dx", 0).attr("dy", 2).attr("stdDeviation", 3).attr("flood-opacity", 0.08);

    // Arrow markers
    [
      { id: "arrow", color: "#94A3B8" },
      { id: "arrow-red", color: "#EF4444" },
    ].forEach(({ id, color }) => {
      defs
        .append("marker")
        .attr("id", id)
        .attr("viewBox", "0 0 10 6")
        .attr("refX", 10)
        .attr("refY", 3)
        .attr("markerWidth", 10)
        .attr("markerHeight", 6)
        .attr("orient", "auto")
        .append("path")
        .attr("d", "M0,0 L10,3 L0,6 Z")
        .attr("fill", color);
    });

    // Zoom group
    const g = svg.append("g");

    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.15, 4])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });

    svg.call(zoom);

    // Auto-fit: compute bounding box and fill the container
    if (layout.nodes.length === 0) return;
    const allX = layout.nodes.map((n) => n.x);
    const allY = layout.nodes.map((n) => n.y);
    const minX = Math.min(...allX) - NODE_WIDTH;
    const maxX = Math.max(...allX) + NODE_WIDTH;
    const minY = Math.min(...allY) - PADDING;
    const maxY = Math.max(...allY) + NODE_HEIGHT + PADDING;
    const graphWidth = maxX - minX;
    const graphHeight = maxY - minY;

    // Scale to FILL — use 0.92 factor so there's only a small margin
    const scale = Math.min(width / graphWidth, height / graphHeight) * 0.92;
    const tx = width / 2 - ((minX + maxX) / 2) * scale;
    const ty = height / 2 - ((minY + maxY) / 2) * scale;

    svg.call(zoom.transform, d3.zoomIdentity.translate(tx, ty).scale(scale));

    // Draw edges
    layout.edges.forEach((edge) => {
      const sx = edge.source.x;
      const sy = edge.source.y + edge.source.height / 2;
      const ex = edge.target.x;
      const ey = edge.target.y - edge.target.height / 2;
      const isException = edge.target.step.step_type === "exception";

      const midY = (sy + ey) / 2;
      const pathData = `M ${sx},${sy} C ${sx},${midY} ${ex},${midY} ${ex},${ey}`;

      g.append("path")
        .attr("d", pathData)
        .attr("fill", "none")
        .attr("stroke", isException ? "#EF4444" : "#94A3B8")
        .attr("stroke-width", 2)
        .attr("stroke-dasharray", isException ? "6,3" : "none")
        .attr("marker-end", isException ? "url(#arrow-red)" : "url(#arrow)");

      // Branch label pill
      if (edge.label) {
        const labelX = (sx + ex) / 2 + (sx === ex ? 0 : (ex > sx ? 12 : -12));
        const labelY = midY - 8;
        const pillW = Math.max(edge.label.length * 7 + 12, 36);

        g.append("rect")
          .attr("x", labelX - pillW / 2)
          .attr("y", labelY - 10)
          .attr("width", pillW)
          .attr("height", 18)
          .attr("rx", 9)
          .attr("fill", "white")
          .attr("stroke", "#CBD5E1")
          .attr("stroke-width", 1);

        g.append("text")
          .attr("x", labelX)
          .attr("y", labelY + 2)
          .attr("text-anchor", "middle")
          .attr("font-size", "10px")
          .attr("font-weight", "600")
          .attr("fill", "#64748B")
          .attr("font-family", "-apple-system, BlinkMacSystemFont, sans-serif")
          .text(edge.label);
      }
    });

    // Draw nodes
    layout.nodes.forEach((node) => {
      const colors = STEP_COLORS[node.step.step_type] || STEP_COLORS.action;
      const nodeGroup = g
        .append("g")
        .attr("cursor", "pointer")
        .attr("filter", "url(#shadow)")
        .on("click", () => handleStepClick(node.step));

      if (node.step.step_type === "decision") {
        // Diamond shape — larger
        const size = DECISION_SIZE / 2;
        const points = [
          [node.x, node.y - size],
          [node.x + size * 1.5, node.y],
          [node.x, node.y + size],
          [node.x - size * 1.5, node.y],
        ]
          .map((p) => p.join(","))
          .join(" ");

        nodeGroup
          .append("polygon")
          .attr("points", points)
          .attr("fill", colors.fill)
          .attr("stroke", colors.stroke)
          .attr("stroke-width", 2);

        // Decision text — wrap into 2 lines
        const label = node.step.condition || node.step.label;
        const lines = wrapText(label, 20);
        const startY = lines.length === 1 ? node.y + 4 : node.y - 6;
        lines.forEach((line, i) => {
          nodeGroup
            .append("text")
            .attr("x", node.x)
            .attr("y", startY + i * 14)
            .attr("text-anchor", "middle")
            .attr("dominant-baseline", "middle")
            .attr("font-size", "11px")
            .attr("font-weight", "600")
            .attr("fill", colors.text)
            .attr("font-family", "-apple-system, BlinkMacSystemFont, sans-serif")
            .text(line);
        });
      } else {
        // Rectangle
        const rx = node.step.step_type === "start" || node.step.step_type === "end" ? 28 : 10;
        const isException = node.step.step_type === "exception";

        nodeGroup
          .append("rect")
          .attr("x", node.x - node.width / 2)
          .attr("y", node.y - node.height / 2)
          .attr("width", node.width)
          .attr("height", node.height)
          .attr("rx", rx)
          .attr("fill", colors.fill)
          .attr("stroke", colors.stroke)
          .attr("stroke-width", 2)
          .attr("stroke-dasharray", isException ? "6,3" : "none");

        // Label text — wrap into 2 lines for longer labels
        const label = node.step.label;
        const lines = wrapText(label, 32);
        const startY = lines.length === 1 ? node.y + 4 : node.y - 6;
        lines.forEach((line, i) => {
          nodeGroup
            .append("text")
            .attr("x", node.x)
            .attr("y", startY + i * 16)
            .attr("text-anchor", "middle")
            .attr("dominant-baseline", "middle")
            .attr("font-size", "13px")
            .attr("font-weight", "600")
            .attr("fill", colors.text)
            .attr("font-family", "-apple-system, BlinkMacSystemFont, sans-serif")
            .text(line);
        });

        // Warning icon for exceptions
        if (isException) {
          nodeGroup
            .append("text")
            .attr("x", node.x + node.width / 2 - 16)
            .attr("y", node.y - node.height / 2 + 16)
            .attr("font-size", "13px")
            .text("⚠");
        }
      }
    });
  }, [layout, handleStepClick]);

  return (
    <div ref={containerRef} className="relative w-full h-full bg-white dark:bg-slate-950 overflow-hidden">
      <svg ref={svgRef} className="w-full h-full" />

      {/* Step Detail Panel */}
      {selectedStep && (
        <div className="absolute top-3 right-3 w-80 max-h-[90%] overflow-y-auto bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 p-4 z-10">
          <div className="flex items-center justify-between mb-3">
            <span
              className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                selectedStep.step_type === "start"
                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
                  : selectedStep.step_type === "end"
                  ? "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300"
                  : selectedStep.step_type === "decision"
                  ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
                  : selectedStep.step_type === "exception"
                  ? "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300"
                  : "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300"
              }`}
            >
              {selectedStep.step_type}
            </span>
            <button
              onClick={() => setSelectedStep(null)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 text-lg"
            >
              ✕
            </button>
          </div>
          <h3 className="font-semibold text-sm text-slate-800 dark:text-white mb-2">{selectedStep.label}</h3>
          {selectedStep.description && (
            <p className="text-xs text-slate-600 dark:text-slate-400 mb-3 leading-relaxed">{selectedStep.description}</p>
          )}
          {selectedStep.condition && (
            <div className="mb-3">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Condition:</span>
              <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">{selectedStep.condition}</p>
            </div>
          )}
          {selectedStep.related_entities.length > 0 && (
            <div>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Related Entities:</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {selectedStep.related_entities.map((e) => (
                  <span key={e} className="text-xs px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-600 dark:text-slate-400">
                    {e}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-3 left-3 flex items-center gap-3 bg-white/90 dark:bg-slate-900/90 backdrop-blur rounded-lg px-3 py-2 border border-slate-200 dark:border-slate-700 z-10">
        {Object.entries(STEP_COLORS).map(([type, colors]) => (
          <div key={type} className="flex items-center gap-1.5">
            <div
              className="w-3 h-3 rounded-sm border"
              style={{ backgroundColor: colors.fill, borderColor: colors.stroke }}
            />
            <span className="text-[10px] text-slate-500 dark:text-slate-400 capitalize font-medium">{type}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
