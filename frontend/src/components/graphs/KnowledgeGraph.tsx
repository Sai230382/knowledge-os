"use client";
import { useRef, useState, useEffect, useMemo, useCallback } from "react";
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

const ENTITY_TYPES = ["person", "process", "technology", "concept"] as const;

export default function KnowledgeGraph({ data, analysis, fullscreen }: KnowledgeGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 500 });
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [hiddenTypes, setHiddenTypes] = useState<Set<string>>(new Set());

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

  // Sanitize: remove nodes with empty IDs, edges with invalid refs, orphan nodes, and filtered types
  const sanitizedData = useMemo(() => {
    const validNodes = data.nodes.filter((n) => n.id && n.label && !hiddenTypes.has(n.type));
    const nodeIds = new Set(validNodes.map((n) => n.id));
    const validEdges = data.edges.filter((e) => {
      const src = typeof e.source === "string" ? e.source : e.source?.id;
      const tgt = typeof e.target === "string" ? e.target : e.target?.id;
      return src && tgt && nodeIds.has(src) && nodeIds.has(tgt);
    });
    // Remove orphan nodes (no connections) — they float away and add clutter
    const connectedIds = new Set<string>();
    validEdges.forEach((e) => {
      const src = typeof e.source === "string" ? e.source : e.source?.id;
      const tgt = typeof e.target === "string" ? e.target : e.target?.id;
      if (src) connectedIds.add(src);
      if (tgt) connectedIds.add(tgt);
    });
    const connectedNodes = validNodes.filter((n) => connectedIds.has(n.id));
    return { nodes: connectedNodes, edges: validEdges };
  }, [data, hiddenTypes]);

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

  // Count by type (from full data, not filtered — so toggles always show counts)
  const allTypeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    data.nodes.filter((n) => n.id && n.label).forEach((n) => {
      counts[n.type] = (counts[n.type] || 0) + 1;
    });
    return counts;
  }, [data.nodes]);

  // Filtered counts for display
  const filteredTypeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    sanitizedData.nodes.forEach((n) => {
      counts[n.type] = (counts[n.type] || 0) + 1;
    });
    return counts;
  }, [sanitizedData.nodes]);

  const handleNodeClick = useCallback((node: GraphNode) => {
    if (node && node.id) {
      setSelectedNode(node);
    } else {
      setSelectedNode(null);
    }
  }, []);

  const toggleType = useCallback((type: string) => {
    setHiddenTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  }, []);

  useForceGraph(svgRef, sanitizedData, dimensions, GRAPH_CONFIG, {
    onNodeClick: handleNodeClick,
    entityIndicators,
    edgeLabelMaxLength: 0,   // Hide edge labels — details in panel on click
  });

  if (data.nodes.length === 0) {
    return (
      <div className="text-center py-12 text-slate-400 dark:text-slate-500">
        <p className="text-sm">No entities found for knowledge graph</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Stats bar - entity counts by category + type filters */}
      <div className="flex items-center gap-3 px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-t-lg flex-shrink-0 flex-wrap">
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
          {sanitizedData.nodes.length} entities, {sanitizedData.edges.length} relationships
        </span>
        <div className="h-3 border-l border-slate-300 dark:border-slate-600" />

        {/* Entity type filter toggles */}
        <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider">Filter:</span>
        {Object.entries(allTypeCounts).map(([type, totalCount]) => {
          const isHidden = hiddenTypes.has(type);
          const activeCount = filteredTypeCounts[type] || 0;
          return (
            <button
              key={type}
              onClick={() => toggleType(type)}
              className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium transition-all ${
                isHidden
                  ? "bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500 opacity-50"
                  : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 shadow-sm border border-slate-200 dark:border-slate-600"
              }`}
              title={isHidden ? `Show ${getNodeLabel(type)}` : `Hide ${getNodeLabel(type)}`}
            >
              <div
                className={`w-2.5 h-2.5 rounded-full transition-opacity ${isHidden ? "opacity-30" : ""}`}
                style={{ backgroundColor: getNodeColor(type) }}
              />
              <span>{getNodeLabel(type)}</span>
              <span className={`font-semibold ${isHidden ? "" : "text-slate-900 dark:text-white"}`}>
                {isHidden ? totalCount : activeCount}
              </span>
            </button>
          );
        })}

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
        <GraphLegend activeTypes={Object.keys(filteredTypeCounts)} />
        {!selectedNode && (
          <div className="absolute top-3 left-3 backdrop-blur border rounded-lg px-3 py-1.5 text-xs" style={{ backgroundColor: 'var(--graph-hint-bg)', borderColor: 'var(--graph-hint-border)', color: 'var(--graph-hint-text)' }}>
            Click a node to inspect details &middot; Toggle entity types above to filter
          </div>
        )}

        {/* Overlay side panel — absolutely positioned so graph doesn't resize */}
        {selectedNode && (
          <div className="absolute right-0 top-0 bottom-0 z-20 w-[340px] animate-slide-in-right">
            <NodeDetailPanel
              node={selectedNode}
              edges={data.edges}
              allNodes={sanitizedData.nodes}
              analysis={analysis}
              onClose={() => setSelectedNode(null)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
