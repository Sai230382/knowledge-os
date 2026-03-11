"use client";
import { useRef, useState, useEffect, useMemo } from "react";
import { useForceGraph } from "@/hooks/useForceGraph";
import GraphLegend from "./GraphLegend";
import GraphControls from "./GraphControls";
import NodeDetailPanel from "./NodeDetailPanel";
import { GraphData, GraphNode, AnalysisOutput } from "@/lib/types";
import { GRAPH_CONFIG, getNodeColor, getNodeLabel } from "@/lib/constants";

interface KnowledgeGraphProps {
  data: GraphData;
  analysis: AnalysisOutput;
  fullscreen?: boolean;
}

export default function KnowledgeGraph({ data, analysis, fullscreen }: KnowledgeGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 500 });
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);

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

  // Sanitize: remove nodes with empty IDs and edges with invalid source/target
  const sanitizedData = useMemo(() => {
    const validNodes = data.nodes.filter((n) => n.id && n.label);
    const nodeIds = new Set(validNodes.map((n) => n.id));
    const validEdges = data.edges.filter((e) => {
      const src = typeof e.source === "string" ? e.source : e.source?.id;
      const tgt = typeof e.target === "string" ? e.target : e.target?.id;
      return src && tgt && nodeIds.has(src) && nodeIds.has(tgt);
    });
    return { nodes: validNodes, edges: validEdges };
  }, [data]);

  // Build entity indicators map from context_intelligence
  const entityIndicators = useMemo(() => {
    const map: Record<string, { hasTribal: boolean; hasException: boolean }> = {};
    const intel = analysis.context_intelligence || [];
    sanitizedData.nodes.forEach((n) => {
      const hasTribal = intel.some(
        (ci) => ci.related_entities && ci.related_entities.includes(n.id) &&
                (ci.intel_type === "tribal_knowledge" || ci.intel_type === "workaround" || ci.intel_type === "hidden_pattern")
      );
      const hasException = intel.some(
        (ci) => ci.related_entities && ci.related_entities.includes(n.id) &&
                ci.intel_type === "exception"
      );
      if (hasTribal || hasException) {
        map[n.id] = { hasTribal, hasException };
      }
    });
    return map;
  }, [sanitizedData.nodes, analysis.context_intelligence]);

  // Count by type
  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    sanitizedData.nodes.forEach((n) => {
      counts[n.type] = (counts[n.type] || 0) + 1;
    });
    return counts;
  }, [sanitizedData.nodes]);

  useForceGraph(svgRef, sanitizedData, dimensions, GRAPH_CONFIG, {
    onNodeClick: (node) => {
      // D3 sends null-ish when background is clicked
      if (node && node.id) {
        setSelectedNode(node);
      } else {
        setSelectedNode(null);
      }
    },
    entityIndicators,
  });

  if (sanitizedData.nodes.length === 0) {
    return (
      <div className="text-center py-12 text-slate-400 dark:text-slate-500">
        <p className="text-sm">No entities found for knowledge graph</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Stats bar - entity counts by category */}
      <div className="flex items-center gap-4 px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-t-lg flex-shrink-0">
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
          {sanitizedData.nodes.length} entities, {sanitizedData.edges.length} relationships
        </span>
        <div className="h-3 border-l border-slate-300 dark:border-slate-600" />
        {Object.entries(typeCounts).map(([type, count]) => (
          <div key={type} className="flex items-center gap-1.5">
            <div
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: getNodeColor(type) }}
            />
            <span className="text-xs text-slate-600 dark:text-slate-400">
              {getNodeLabel(type)}: <span className="font-semibold">{count}</span>
            </span>
          </div>
        ))}
        <div className="h-3 border-l border-slate-300 dark:border-slate-600" />
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
          <span className="text-xs text-slate-500 dark:text-slate-400">Tribal Knowledge</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
          <span className="text-xs text-slate-500 dark:text-slate-400">Exception</span>
        </div>
      </div>

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
        <GraphLegend activeTypes={Object.keys(typeCounts)} />
        {!selectedNode && (
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
