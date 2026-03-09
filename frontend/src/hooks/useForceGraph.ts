"use client";
import { useEffect, useRef } from "react";
import * as d3 from "d3";
import { GraphData, GraphNode, GraphEdge } from "@/lib/types";
import { getNodeColor } from "@/lib/constants";

interface ForceConfig {
  forces: {
    charge: { strength: number; distanceMin: number; distanceMax: number };
    link: { distance: number; strength: number };
    collision: { radius: number; strength: number; iterations: number };
    center: { strength: number };
  };
  simulation: {
    alphaDecay: number;
    velocityDecay: number;
    warmupTicks: number;
  };
}

interface UseForceGraphOptions {
  onNodeClick?: (node: GraphNode) => void;
  entityIndicators?: Record<string, { hasTribal: boolean; hasException: boolean }>;
  edgeLabelMaxLength?: number; // 0 = hide, undefined = full
  nodeLabelMaxLength?: number; // undefined = full
  edgeColorFn?: (edge: GraphEdge) => string; // custom edge coloring
}

export function useForceGraph(
  svgRef: React.RefObject<SVGSVGElement | null>,
  data: GraphData | null,
  dimensions: { width: number; height: number },
  config: ForceConfig,
  options?: UseForceGraphOptions
) {
  const simulationRef = useRef<d3.Simulation<GraphNode, GraphEdge> | null>(null);
  const onNodeClickRef = useRef(options?.onNodeClick);
  onNodeClickRef.current = options?.onNodeClick;

  useEffect(() => {
    if (!svgRef.current || !data || data.nodes.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();
    svg.on(".zoom", null);
    svg.on(".deselect", null);

    const { width, height } = dimensions;
    const fc = config.forces;
    const sc = config.simulation;
    const indicators = options?.entityIndicators || {};

    // Flag to prevent background click from immediately undoing node selection
    let nodeJustClicked = false;

    // Deep clone
    const nodes: GraphNode[] = data.nodes.map((n) => ({ ...n }));
    const edges: GraphEdge[] = data.edges.map((e) => ({ ...e }));

    const g = svg.append("g");

    // Invisible background rect for deselection clicks
    const bgRect = g
      .append("rect")
      .attr("class", "bg-rect")
      .attr("width", width * 4)
      .attr("height", height * 4)
      .attr("x", -width * 2)
      .attr("y", -height * 2)
      .attr("fill", "transparent")
      .style("cursor", "default");

    // Read CSS variable colors for theming
    const computedStyle = getComputedStyle(document.documentElement);
    const edgeColor =
      computedStyle.getPropertyValue("--graph-edge").trim() || "#CBD5E1";
    const edgeLabelColor =
      computedStyle.getPropertyValue("--graph-edge-label").trim() || "#64748B";
    const nodeLabelColor =
      computedStyle.getPropertyValue("--graph-node-label").trim() || "#334155";
    const nodeStrokeColor =
      computedStyle.getPropertyValue("--graph-node-stroke").trim() || "#FFFFFF";
    const arrowColor =
      computedStyle.getPropertyValue("--graph-arrow").trim() || "#94A3B8";

    // Zoom — disable double-click zoom
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.15, 5])
      .filter((event) => {
        if (event.type === "dblclick") return false;
        return true;
      })
      .on("zoom", (event) => g.attr("transform", event.transform));
    svg.call(zoom);
    svg.on("dblclick.zoom", null);

    // Arrow markers
    const defs = svg.append("defs");
    defs
      .append("marker")
      .attr("id", "arrowhead")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 28)
      .attr("refY", 0)
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,-4L8,0L0,4")
      .attr("fill", arrowColor);

    // Glow filter for selected node
    const glowFilter = defs.append("filter").attr("id", "glow");
    glowFilter
      .append("feGaussianBlur")
      .attr("stdDeviation", "3")
      .attr("result", "coloredBlur");
    const feMerge = glowFilter.append("feMerge");
    feMerge.append("feMergeNode").attr("in", "coloredBlur");
    feMerge.append("feMergeNode").attr("in", "SourceGraphic");

    // Force simulation
    const simulation = d3
      .forceSimulation<GraphNode>(nodes)
      .force(
        "link",
        d3
          .forceLink<GraphNode, GraphEdge>(edges)
          .id((d) => d.id)
          .distance(fc.link.distance)
          .strength(fc.link.strength)
      )
      .force(
        "charge",
        d3
          .forceManyBody<GraphNode>()
          .strength(fc.charge.strength)
          .distanceMin(fc.charge.distanceMin)
          .distanceMax(fc.charge.distanceMax)
      )
      .force(
        "center",
        d3.forceCenter(width / 2, height / 2).strength(fc.center.strength)
      )
      .force(
        "collision",
        d3
          .forceCollide<GraphNode>()
          .radius(fc.collision.radius)
          .strength(fc.collision.strength)
          .iterations(fc.collision.iterations)
      )
      .alphaDecay(sc.alphaDecay)
      .velocityDecay(sc.velocityDecay);

    simulation.tick(sc.warmupTicks);

    // Edges
    const linkGroup = g.append("g").attr("class", "links");

    const edgeColorFn = options?.edgeColorFn;
    const links = linkGroup
      .selectAll("line")
      .data(edges)
      .join("line")
      .attr("stroke", (d) => edgeColorFn ? edgeColorFn(d) : edgeColor)
      .attr("stroke-width", (d) => edgeColorFn ? 2 : 1.5)
      .attr("stroke-opacity", (d) => edgeColorFn ? 0.7 : 0.5)
      .attr("marker-end", "url(#arrowhead)");

    const edgeLabelMax = options?.edgeLabelMaxLength;
    const linkLabels = linkGroup
      .selectAll("text")
      .data(edges)
      .join("text")
      .text((d) => {
        if (edgeLabelMax === 0) return "";
        if (edgeLabelMax && d.label.length > edgeLabelMax) return d.label.slice(0, edgeLabelMax) + "...";
        return d.label;
      })
      .attr("font-size", 9)
      .attr("text-anchor", "middle")
      .attr("fill", edgeLabelColor)
      .attr("dy", -4)
      .attr("pointer-events", "none");

    // Nodes
    const nodeGroup = g.append("g").attr("class", "nodes");

    // ---- Visual highlight helpers ----
    function applyNodeSelection(d: GraphNode) {
      // Reset all
      nodeGs
        .select("circle:first-child")
        .attr("stroke", nodeStrokeColor)
        .attr("stroke-width", 2.5)
        .attr("filter", "drop-shadow(0 1px 3px rgba(0,0,0,0.2))");

      // Highlight clicked node
      nodeGs.each(function (n) {
        if (n.id === d.id) {
          d3.select(this)
            .select("circle:first-child")
            .attr("stroke", "#3B82F6")
            .attr("stroke-width", 3.5)
            .attr("filter", "url(#glow)");
        }
      });

      // Highlight connected edges
      links
        .attr("stroke", (e) => {
          const src =
            typeof e.source === "string"
              ? e.source
              : (e.source as GraphNode).id;
          const tgt =
            typeof e.target === "string"
              ? e.target
              : (e.target as GraphNode).id;
          if (src === d.id || tgt === d.id) return "#3B82F6";
          return edgeColorFn ? edgeColorFn(e) : edgeColor;
        })
        .attr("stroke-width", (e) => {
          const src =
            typeof e.source === "string"
              ? e.source
              : (e.source as GraphNode).id;
          const tgt =
            typeof e.target === "string"
              ? e.target
              : (e.target as GraphNode).id;
          return src === d.id || tgt === d.id ? 3 : (edgeColorFn ? 2 : 1.5);
        })
        .attr("stroke-opacity", (e) => {
          const src =
            typeof e.source === "string"
              ? e.source
              : (e.source as GraphNode).id;
          const tgt =
            typeof e.target === "string"
              ? e.target
              : (e.target as GraphNode).id;
          return src === d.id || tgt === d.id ? 1 : 0.3;
        });

      // Dim unconnected nodes
      nodeGs.style("opacity", (n) => {
        if (n.id === d.id) return 1;
        const connected = edges.some((e) => {
          const src =
            typeof e.source === "string"
              ? e.source
              : (e.source as GraphNode).id;
          const tgt =
            typeof e.target === "string"
              ? e.target
              : (e.target as GraphNode).id;
          return (
            (src === d.id && tgt === n.id) || (tgt === d.id && src === n.id)
          );
        });
        return connected ? 1 : 0.3;
      });
    }

    function resetHighlights() {
      nodeGs
        .select("circle:first-child")
        .attr("stroke", nodeStrokeColor)
        .attr("stroke-width", 2.5)
        .attr("filter", "drop-shadow(0 1px 3px rgba(0,0,0,0.2))");
      links
        .attr("stroke", (d) => edgeColorFn ? edgeColorFn(d) : edgeColor)
        .attr("stroke-width", edgeColorFn ? 2 : 1.5)
        .attr("stroke-opacity", edgeColorFn ? 0.7 : 0.5);
      nodeGs.style("opacity", 1);
    }

    // ---- Drag behaviour with click detection ----
    let dragStartX = 0;
    let dragStartY = 0;
    let wasDragged = false;

    const dragBehavior = d3
      .drag<SVGGElement, GraphNode>()
      .on("start", (event, d) => {
        dragStartX = event.x;
        dragStartY = event.y;
        wasDragged = false;
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      })
      .on("drag", (event, d) => {
        const dx = event.x - dragStartX;
        const dy = event.y - dragStartY;
        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
          wasDragged = true;
        }
        d.fx = event.x;
        d.fy = event.y;
      })
      .on("end", (event, d) => {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;

        // If mouse barely moved → treat as click
        if (!wasDragged) {
          nodeJustClicked = true;
          applyNodeSelection(d);
          onNodeClickRef.current?.(d);
          // Clear flag after a short delay so background handler doesn't fire
          setTimeout(() => {
            nodeJustClicked = false;
          }, 100);
        }
      });

    const nodeGs = nodeGroup
      .selectAll<SVGGElement, GraphNode>("g")
      .data(nodes)
      .join("g")
      .style("cursor", "pointer")
      .call(dragBehavior);

    // CRITICAL: Stop click events on nodes from bubbling to background
    nodeGs.on("click", (event) => {
      event.stopPropagation();
    });

    // Main node circle
    nodeGs
      .append("circle")
      .attr("r", 14)
      .attr("fill", (d) => getNodeColor(d.type))
      .attr("stroke", nodeStrokeColor)
      .attr("stroke-width", 2.5)
      .attr("filter", "drop-shadow(0 1px 3px rgba(0,0,0,0.2))");

    // Tribal knowledge indicator (small amber dot, top-right)
    nodeGs
      .filter((d) => indicators[d.id]?.hasTribal)
      .append("circle")
      .attr("cx", 10)
      .attr("cy", -10)
      .attr("r", 5)
      .attr("fill", "#F59E0B")
      .attr("stroke", nodeStrokeColor)
      .attr("stroke-width", 1.5);

    // Exception indicator (small red dot, top-left)
    nodeGs
      .filter((d) => indicators[d.id]?.hasException)
      .append("circle")
      .attr("cx", -10)
      .attr("cy", -10)
      .attr("r", 5)
      .attr("fill", "#EF4444")
      .attr("stroke", nodeStrokeColor)
      .attr("stroke-width", 1.5);

    // Node type icon (letter inside circle)
    nodeGs
      .append("text")
      .text((d) => {
        // Show first 1-2 chars of the type as the icon letter
        const typeMap: Record<string, string> = {
          person: "P",
          process: "Pr",
          technology: "T",
          concept: "C",
          organization: "O",
          regulation: "R",
          location: "L",
          department: "D",
          event: "E",
          metric: "M",
          financial_instrument: "F",
          document: "Dc",
          role: "Rl",
          service: "S",
          product: "Pd",
        };
        return typeMap[d.type] || d.type.charAt(0).toUpperCase();
      })
      .attr("text-anchor", "middle")
      .attr("dy", 4)
      .attr("font-size", 9)
      .attr("font-weight", 700)
      .attr("fill", "#fff")
      .attr("pointer-events", "none");

    // Node labels — truncate at word boundary
    const nodeLabelMax = options?.nodeLabelMaxLength;
    nodeGs
      .append("text")
      .text((d) => {
        if (nodeLabelMax && d.label.length > nodeLabelMax) {
          const truncated = d.label.slice(0, nodeLabelMax);
          const lastSpace = truncated.lastIndexOf(" ");
          return (lastSpace > nodeLabelMax * 0.4 ? truncated.slice(0, lastSpace) : truncated) + "...";
        }
        return d.label;
      })
      .attr("dy", 28)
      .attr("text-anchor", "middle")
      .attr("font-size", 11)
      .attr("font-weight", 500)
      .attr("fill", nodeLabelColor)
      .attr("pointer-events", "none");

    // ---- Background deselect ----
    // Click on the invisible bgRect → deselect
    bgRect.on("click", () => {
      if (nodeJustClicked) return;
      resetHighlights();
      onNodeClickRef.current?.(null as unknown as GraphNode);
    });

    // Also catch clicks directly on the <svg> element (outside the <g>)
    svg.on("click.deselect", (event) => {
      if (nodeJustClicked) return;
      if (event.target === svgRef.current) {
        resetHighlights();
        onNodeClickRef.current?.(null as unknown as GraphNode);
      }
    });

    // Hover effects
    nodeGs
      .on("mouseover", function () {
        d3.select(this)
          .select("circle:first-child")
          .transition()
          .duration(150)
          .attr("r", 18);
      })
      .on("mouseout", function () {
        d3.select(this)
          .select("circle:first-child")
          .transition()
          .duration(150)
          .attr("r", 14);
      });

    // Tick
    simulation.on("tick", () => {
      links
        .attr("x1", (d) => (d.source as GraphNode).x!)
        .attr("y1", (d) => (d.source as GraphNode).y!)
        .attr("x2", (d) => (d.target as GraphNode).x!)
        .attr("y2", (d) => (d.target as GraphNode).y!);

      linkLabels
        .attr("x", (d) =>
          ((d.source as GraphNode).x! + (d.target as GraphNode).x!) / 2
        )
        .attr("y", (d) =>
          ((d.source as GraphNode).y! + (d.target as GraphNode).y!) / 2
        );

      nodeGs.attr("transform", (d) => `translate(${d.x},${d.y})`);
    });

    simulationRef.current = simulation;

    // Fit to view
    const bounds = g.node()?.getBBox();
    if (bounds && bounds.width > 0) {
      const padding = 60;
      const scale = Math.min(
        width / (bounds.width + padding * 2),
        height / (bounds.height + padding * 2),
        1.2
      );
      const tx = width / 2 - (bounds.x + bounds.width / 2) * scale;
      const ty = height / 2 - (bounds.y + bounds.height / 2) * scale;
      svg
        .transition()
        .duration(600)
        .call(
          zoom.transform,
          d3.zoomIdentity.translate(tx, ty).scale(scale)
        );
    }

    return () => {
      simulation.stop();
    };
  }, [data, dimensions, config, options?.entityIndicators]);

  return simulationRef;
}
