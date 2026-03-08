"use client";
import { useRef, useState, useEffect, useMemo, useCallback } from "react";
import { useForceGraph } from "@/hooks/useForceGraph";
import GraphLegend from "./GraphLegend";
import GraphControls from "./GraphControls";
import NodeDetailPanel from "./NodeDetailPanel";
import { GraphData, GraphNode, GraphEdge, AnalysisOutput } from "@/lib/types";
import { CONTEXT_GRAPH_CONFIG, NODE_COLORS, NODE_LABELS } from "@/lib/constants";

type HopLevel = "all" | 1 | 2;

interface ContextGraphProps {
  data: GraphData;
  analysis: AnalysisOutput;
  fullscreen?: boolean;
}

/**
 * Given a starting node and hop count, return the filtered subgraph
 * containing only nodes within N hops and the edges between them.
 */
function getSubgraphByHops(
  data: GraphData,
  startNodeId: string,
  hops: 1 | 2
): GraphData {
  // Build adjacency list
  const adjacency: Record<string, Set<string>> = {};
  data.nodes.forEach((n) => {
    adjacency[n.id] = new Set();
  });
  data.edges.forEach((e) => {
    const sourceId = typeof e.source === "string" ? e.source : e.source.id;
    const targetId = typeof e.target === "string" ? e.target : e.target.id;
    if (adjacency[sourceId]) adjacency[sourceId].add(targetId);
    if (adjacency[targetId]) adjacency[targetId].add(sourceId);
  });

  // BFS to find nodes within N hops
  const visited = new Set<string>([startNodeId]);
  let frontier = new Set<string>([startNodeId]);

  for (let hop = 0; hop < hops; hop++) {
    const nextFrontier = new Set<string>();
    frontier.forEach((nodeId) => {
      const neighbors = adjacency[nodeId];
      if (neighbors) {
        neighbors.forEach((neighborId) => {
          if (!visited.has(neighborId)) {
            visited.add(neighborId);
            nextFrontier.add(neighborId);
          }
        });
      }
    });
    frontier = nextFrontier;
  }

  // Filter nodes and edges
  const filteredNodes = data.nodes.filter((n) => visited.has(n.id));
  const filteredEdges = data.edges.filter((e) => {
    const sourceId = typeof e.source === "string" ? e.source : e.source.id;
    const targetId = typeof e.target === "string" ? e.target : e.target.id;
    return visited.has(sourceId) && visited.has(targetId);
  });

  return { nodes: filteredNodes, edges: filteredEdges };
}

export default function ContextGraph({ data, analysis, fullscreen }: ContextGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 500 });
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [hopLevel, setHopLevel] = useState<HopLevel>("all");

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      if (width > 0 && height > 0) {
        setDimensions({ width, height });
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Compute filtered graph data based on hop level and selected node
  const filteredData = useMemo(() => {
    if (hopLevel === "all" || !selectedNode) {
      return data;
    }
    return getSubgraphByHops(data, selectedNode.id, hopLevel);
  }, [data, selectedNode, hopLevel]);

  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredData.nodes.forEach((n) => {
      counts[n.type] = (counts[n.type] || 0) + 1;
    });
    return counts;
  }, [filteredData.nodes]);

  const handleNodeClick = useCallback((node: GraphNode) => {
    if (node && node.id) {
      setSelectedNode(node);
    } else {
      setSelectedNode(null);
    }
  }, []);

  useForceGraph(svgRef, filteredData, dimensions, CONTEXT_GRAPH_CONFIG, {
    onNodeClick: handleNodeClick,
  });

  if (data.nodes.length === 0) {
    return (
      <div className="text-center py-12 text-slate-400 dark:text-slate-500">
        <p className="text-sm">No context relationships found</p>
      </div>
    );
  }

  const hopOptions: { value: HopLevel; label: string; tooltip: string }[] = [
    { value: "all", label: "All", tooltip: "Show all nodes and connections" },
    { value: 1, label: "1 Hop", tooltip: "Show only direct neighbors of the selected node" },
    { value: 2, label: "2 Hops", tooltip: "Show neighbors and their neighbors (2 levels deep)" },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Stats bar */}
      <div className="flex items-center gap-4 px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-t-lg flex-wrap flex-shrink-0">
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
          {filteredData.nodes.length} entities, {filteredData.edges.length} connections
          {hopLevel !== "all" && selectedNode && (
            <span className="text-blue-500 dark:text-blue-400 ml-1">
              ({hopLevel} hop{hopLevel > 1 ? "s" : ""} from {selectedNode.label})
            </span>
          )}
        </span>
        <div className="h-3 border-l border-slate-300 dark:border-slate-600" />
        {Object.entries(typeCounts).map(([type, count]) => (
          <div key={type} className="flex items-center gap-1.5">
            <div
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: NODE_COLORS[type] || "#94A3B8" }}
            />
            <span className="text-xs text-slate-600 dark:text-slate-400">
              {NODE_LABELS[type] || type}: <span className="font-semibold">{count}</span>
            </span>
          </div>
        ))}

        {/* Hop Selector */}
        <div className="ml-auto flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium mr-1">Hops:</span>
          <div className="flex rounded-md overflow-hidden border border-slate-200 dark:border-slate-600">
            {hopOptions.map((opt) => (
              <button
                key={String(opt.value)}
                onClick={() => setHopLevel(opt.value)}
                title={opt.tooltip}
                className={`px-2.5 py-1 text-xs font-medium transition-colors ${
                  hopLevel === opt.value
                    ? "bg-blue-600 text-white dark:bg-blue-500"
                    : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
                } ${opt.value !== "all" ? "border-l border-slate-200 dark:border-slate-600" : ""}`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Hop info banner - shows when hop filtering is active */}
      {hopLevel !== "all" && !selectedNode && (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-950/40 border-x border-slate-200 dark:border-slate-700 text-xs text-blue-700 dark:text-blue-400 flex-shrink-0">
          <svg className="w-3.5 h-3.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          <span>
            <strong>Click a node</strong> to filter the graph to {hopLevel === 1 ? "its direct neighbors" : "nodes within 2 connections"}.
            {" "}{hopLevel === 1 ? "1 hop = directly connected nodes only." : "2 hops = neighbors + their neighbors."}
          </span>
        </div>
      )}

      {/* Graph area — panel overlays on top so graph container never resizes */}
      <div ref={containerRef} className="relative flex-1 min-h-0 border border-t-0 border-slate-200 dark:border-slate-700 rounded-b-lg overflow-hidden">
        <GraphControls svgRef={svgRef} />
        <svg
          ref={svgRef}
          width={dimensions.width}
          height={dimensions.height}
          style={{
            background: `linear-gradient(135deg, var(--graph-bg-from), var(--graph-bg-to))`,
          }}
        />
        <GraphLegend />
        {!selectedNode && hopLevel === "all" && (
          <div className="absolute top-3 left-3 backdrop-blur border rounded-lg px-3 py-1.5 text-xs" style={{ backgroundColor: 'var(--graph-hint-bg)', borderColor: 'var(--graph-hint-border)', color: 'var(--graph-hint-text)' }}>
            Click a node to inspect details
          </div>
        )}

        {/* Overlay side panel — absolutely positioned so graph doesn't resize */}
        {selectedNode && (
          <div className="absolute right-0 top-0 bottom-0 z-20 w-[340px] animate-slide-in-right">
            <NodeDetailPanel
              node={selectedNode}
              edges={data.edges}
              allNodes={data.nodes}
              analysis={analysis}
              onClose={() => setSelectedNode(null)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
