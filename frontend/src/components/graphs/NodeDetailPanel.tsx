"use client";
import { GraphNode, GraphEdge, ContextEdge, AnalysisOutput } from "@/lib/types";
import { getNodeColor, getNodeLabel, CONTEXT_TYPE_COLORS, CONTEXT_TYPE_LABELS } from "@/lib/constants";

interface NodeDetailPanelProps {
  node: GraphNode;
  edges: GraphEdge[];
  allNodes: GraphNode[];
  analysis: AnalysisOutput;
  onClose: () => void;
}

export default function NodeDetailPanel({ node, edges, allNodes, analysis, onClose }: NodeDetailPanelProps) {
  // Find edges connected to this node
  const connectedEdges = edges.filter((e) => {
    const sourceId = typeof e.source === "string" ? e.source : e.source.id;
    const targetId = typeof e.target === "string" ? e.target : e.target.id;
    return sourceId === node.id || targetId === node.id;
  });

  // Get connected nodes with relationship labels
  const connections = connectedEdges.map((e) => {
    const sourceId = typeof e.source === "string" ? e.source : e.source.id;
    const targetId = typeof e.target === "string" ? e.target : e.target.id;
    const isSource = sourceId === node.id;
    const otherId = isSource ? targetId : sourceId;
    const otherNode = allNodes.find((n) => n.id === otherId);
    const contextType = (e as ContextEdge).context_type || "";
    return {
      node: otherNode,
      label: e.label,
      direction: isSource ? "outgoing" : "incoming",
      strength: e.strength,
      contextType,
    };
  });

  // Find related tribal knowledge
  const relatedTribal = analysis.tribal_knowledge.filter(
    (tk) => tk.related_entities && tk.related_entities.includes(node.id)
  );

  // Find related exceptions
  const relatedExceptions = analysis.exceptions.filter(
    (ex) => ex.related_entities && ex.related_entities.includes(node.id)
  );

  const RISK_COLORS: Record<string, string> = {
    high: "text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-950",
    medium: "text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-950",
    low: "text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-950",
  };
  const DEFAULT_RISK_COLOR = "text-slate-600 bg-slate-50 dark:text-slate-400 dark:bg-slate-800";

  return (
    <div className="w-full h-full border-l border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-y-auto shadow-2xl">
      {/* Header */}
      <div className="sticky top-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 px-4 py-3 z-10">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className="w-4 h-4 rounded-full flex-shrink-0 border-2 border-white dark:border-slate-800 shadow"
              style={{ backgroundColor: getNodeColor(node.type) }}
            />
            <div>
              <h3 className="font-semibold text-slate-800 dark:text-slate-100 text-sm leading-tight">{node.label}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 capitalize">{getNodeLabel(node.type)}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <div className="px-4 py-3 space-y-4">
        {/* Description */}
        {node.description && (
          <div>
            <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">About</h4>
            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{node.description}</p>
          </div>
        )}

        {/* Relationships */}
        {connections.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
              Relationships ({connections.length})
            </h4>
            <div className="space-y-2">
              {connections.map((conn, i) => (
                <div key={i} className="flex items-start gap-2 bg-slate-50 dark:bg-slate-800 rounded-lg px-3 py-2">
                  <div
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1"
                    style={{ backgroundColor: conn.node ? getNodeColor(conn.node.type) : "#94A3B8" }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">
                        {conn.node?.label || "Unknown"}
                      </p>
                      {conn.contextType && (
                        <span
                          className="text-[9px] px-1.5 py-0.5 rounded-full font-semibold text-white flex-shrink-0"
                          style={{ backgroundColor: CONTEXT_TYPE_COLORS[conn.contextType] || "#94A3B8" }}
                        >
                          {CONTEXT_TYPE_LABELS[conn.contextType] || conn.contextType}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                      {conn.direction === "outgoing" ? (
                        <><span className="text-blue-500">{"\u2192"}</span> {conn.label}</>
                      ) : (
                        <><span className="text-green-500">{"\u2190"}</span> {conn.label}</>
                      )}
                    </p>
                    <div className="mt-1.5 w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1">
                      <div
                        className="h-1 rounded-full"
                        style={{
                          width: `${conn.strength * 100}%`,
                          backgroundColor: conn.contextType ? (CONTEXT_TYPE_COLORS[conn.contextType] || "#3B82F6") : "#60A5FA",
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tribal Knowledge */}
        {relatedTribal.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              Tribal Knowledge ({relatedTribal.length})
            </h4>
            <ul className="space-y-2">
              {relatedTribal.map((tk, i) => (
                <li key={i} className="bg-amber-50 dark:bg-amber-950/50 border border-amber-100 dark:border-amber-800 rounded-lg px-3 py-2">
                  <p className="text-sm font-medium text-amber-900 dark:text-amber-200">{tk.title}</p>
                  <p className="text-xs text-amber-700 dark:text-amber-400 mt-1 leading-relaxed">{tk.description}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${RISK_COLORS[tk.risk_if_lost] || DEFAULT_RISK_COLOR}`}>
                      Risk: {tk.risk_if_lost}
                    </span>
                  </div>
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-1.5">
                    <span className="font-medium">Action:</span> {tk.formalization_action}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Exceptions */}
        {relatedExceptions.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-red-600 dark:text-red-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              Exceptions ({relatedExceptions.length})
            </h4>
            <ul className="space-y-2">
              {relatedExceptions.map((ex, i) => (
                <li key={i} className="bg-red-50 dark:bg-red-950/50 border border-red-100 dark:border-red-800 rounded-lg px-3 py-2">
                  <p className="text-sm font-medium text-red-900 dark:text-red-200">{ex.title}</p>
                  <p className="text-xs text-red-700 dark:text-red-400 mt-1 leading-relaxed">{ex.description}</p>
                  <p className="text-xs text-red-600 dark:text-red-400 mt-1.5">
                    <span className="font-medium">Trigger:</span> {ex.trigger}
                  </p>
                  <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">
                    <span className="font-medium">Handling:</span> {ex.handling}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* No special data */}
        {relatedTribal.length === 0 && relatedExceptions.length === 0 && (
          <div className="text-center py-4 text-slate-400 dark:text-slate-500">
            <p className="text-xs">No tribal knowledge or exceptions linked to this entity</p>
          </div>
        )}
      </div>
    </div>
  );
}
