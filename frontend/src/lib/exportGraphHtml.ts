/**
 * Export a D3 force graph as a standalone, interactive HTML file.
 *
 * The exported file includes:
 * - Full D3 force simulation with zoom/pan/drag
 * - Click-to-select with node highlighting and dimming
 * - Right-side detail panel with relationships and context intelligence
 * - Hover tooltips
 * - Legend and stats bar
 */

import { GraphNode, GraphEdge, ContextEdge, ContextIntelligence } from "./types";
import { NODE_COLORS, CONTEXT_TYPE_COLORS, CONTEXT_TYPE_LABELS } from "./constants";

interface ExportOptions {
  title: string;
  graphType: "knowledge" | "context";
  nodes: GraphNode[];
  edges: (GraphEdge | ContextEdge)[];
  contextIntelligence?: ContextIntelligence[];
  entityIndicators?: Record<string, { hasTribal: boolean; hasException: boolean }>;
}

/** Normalize edges so source/target are always string IDs */
function normalizeEdges(edges: (GraphEdge | ContextEdge)[]): (GraphEdge | ContextEdge)[] {
  return edges.map((e) => ({
    ...e,
    source: typeof e.source === "string" ? e.source : (e.source as GraphNode).id,
    target: typeof e.target === "string" ? e.target : (e.target as GraphNode).id,
  }));
}

export function exportGraphHtml(opts: ExportOptions) {
  const { title, graphType, nodes, entityIndicators, contextIntelligence } = opts;
  const edges = normalizeEdges(opts.edges);

  const serializableNodes = nodes.map((n) => ({
    id: n.id,
    label: n.label,
    type: n.type,
    description: n.description || "",
  }));
  const serializableEdges = edges.map((e) => ({
    source: e.source as string,
    target: e.target as string,
    label: e.label || "",
    strength: e.strength || 0.5,
    context_type: (e as ContextEdge).context_type || "",
  }));
  const serializableIntel = (contextIntelligence || []).map((ci) => ({
    title: ci.title || "",
    description: ci.description || "",
    intel_type: ci.intel_type || "",
    trigger: ci.trigger || "",
    impact: ci.impact || "",
    risk_level: ci.risk_level || "low",
    formalization_action: ci.formalization_action || "",
    related_entities: ci.related_entities || [],
  }));

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(title)}</title>
<script src="https://d3js.org/d3.v7.min.js"><\/script>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0F172A; color: #E2E8F0; overflow: hidden; }
  #header { padding: 10px 20px; background: #1E293B; border-bottom: 1px solid #334155; display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
  #header h1 { font-size: 15px; font-weight: 600; color: #F8FAFC; }
  #header .stats { font-size: 12px; color: #94A3B8; }
  #header .legend { display: flex; gap: 12px; margin-left: auto; flex-wrap: wrap; }
  .legend-item { display: flex; align-items: center; gap: 5px; font-size: 11px; color: #94A3B8; }
  .legend-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
  .legend-line { width: 16px; height: 2px; border-radius: 1px; flex-shrink: 0; }
  #main { display: flex; width: 100vw; height: calc(100vh - 44px); }
  #graph { flex: 1; position: relative; }
  svg { width: 100%; height: 100%; background: linear-gradient(135deg, #0F172A, #1E293B); }
  .tooltip { position: fixed; padding: 8px 12px; background: #1E293B; border: 1px solid #475569; border-radius: 8px; font-size: 12px; color: #E2E8F0; pointer-events: none; opacity: 0; transition: opacity 0.15s; max-width: 280px; z-index: 100; box-shadow: 0 4px 12px rgba(0,0,0,0.4); }
  .tooltip .t-label { font-weight: 600; margin-bottom: 2px; }
  .tooltip .t-type { color: #94A3B8; font-size: 11px; text-transform: capitalize; }
  .hint { position: absolute; bottom: 14px; left: 50%; transform: translateX(-50%); font-size: 11px; color: #64748B; background: #1E293B; border: 1px solid #334155; padding: 5px 14px; border-radius: 20px; white-space: nowrap; }

  /* Detail panel */
  #panel { width: 0; overflow: hidden; transition: width 0.25s ease; background: #0F172A; border-left: 1px solid #334155; flex-shrink: 0; }
  #panel.open { width: 360px; }
  #panel-inner { width: 360px; height: 100%; overflow-y: auto; }
  .panel-header { position: sticky; top: 0; background: #1E293B; border-bottom: 1px solid #334155; padding: 14px 16px; z-index: 5; display: flex; align-items: flex-start; justify-content: space-between; }
  .panel-header .node-info { display: flex; align-items: center; gap: 10px; }
  .panel-header .node-dot { width: 14px; height: 14px; border-radius: 50%; flex-shrink: 0; border: 2px solid #1E293B; box-shadow: 0 1px 3px rgba(0,0,0,0.3); }
  .panel-header .node-label { font-size: 14px; font-weight: 600; color: #F1F5F9; }
  .panel-header .node-type { font-size: 11px; color: #94A3B8; text-transform: capitalize; }
  .panel-close { background: none; border: none; color: #64748B; cursor: pointer; font-size: 18px; padding: 2px 6px; line-height: 1; }
  .panel-close:hover { color: #CBD5E1; }
  .panel-body { padding: 14px 16px; }
  .section-title { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #64748B; margin-bottom: 8px; }
  .section-title.intel { color: #F59E0B; }
  .about-text { font-size: 13px; color: #CBD5E1; line-height: 1.5; margin-bottom: 16px; }

  /* Connection cards */
  .conn-card { background: #1E293B; border-radius: 8px; padding: 10px 12px; margin-bottom: 8px; }
  .conn-top { display: flex; align-items: center; gap: 8px; }
  .conn-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
  .conn-name { font-size: 13px; font-weight: 500; color: #E2E8F0; flex: 1; }
  .conn-badge { font-size: 9px; padding: 2px 6px; border-radius: 10px; font-weight: 600; color: #fff; flex-shrink: 0; }
  .conn-rel { font-size: 11px; color: #94A3B8; margin-top: 4px; }
  .conn-arrow { font-weight: 600; }
  .conn-bar-bg { width: 100%; height: 3px; background: #334155; border-radius: 2px; margin-top: 6px; }
  .conn-bar { height: 3px; border-radius: 2px; }

  /* Intel cards */
  .intel-card { background: #422006; border: 1px solid #92400E; border-radius: 8px; padding: 10px 12px; margin-bottom: 8px; }
  .intel-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; }
  .intel-title { font-size: 13px; font-weight: 500; color: #FDE68A; flex: 1; }
  .intel-desc { font-size: 11px; color: #FBBF24; margin-top: 4px; line-height: 1.45; }
  .intel-meta { display: flex; align-items: center; gap: 8px; margin-top: 6px; flex-wrap: wrap; }
  .risk-badge { font-size: 10px; padding: 2px 8px; border-radius: 10px; font-weight: 500; }
  .risk-high { background: #7F1D1D; color: #FCA5A5; }
  .risk-medium { background: #78350F; color: #FCD34D; }
  .risk-low { background: #14532D; color: #86EFAC; }
  .intel-action { font-size: 11px; color: #F59E0B; margin-top: 6px; }
  .intel-action strong { font-weight: 600; }

  .empty-msg { text-align: center; padding: 20px 0; font-size: 12px; color: #475569; }
</style>
</head>
<body>
<div id="header">
  <h1>${escapeHtml(title)}</h1>
  <span class="stats" id="stats"></span>
  <div class="legend" id="legend"></div>
</div>
<div id="main">
  <div id="graph">
    <svg id="svg"></svg>
    <div class="hint" id="hint">Scroll to zoom &middot; Drag to pan &middot; Click a node for details</div>
  </div>
  <div id="panel">
    <div id="panel-inner"></div>
  </div>
</div>
<div class="tooltip" id="tooltip"></div>

<script>
const DATA = {
  nodes: ${JSON.stringify(serializableNodes)},
  edges: ${JSON.stringify(serializableEdges)},
  intel: ${JSON.stringify(serializableIntel)},
  indicators: ${JSON.stringify(entityIndicators || {})},
  graphType: ${JSON.stringify(graphType)},
};

const NODE_COLORS = ${JSON.stringify(NODE_COLORS)};
const CTX_COLORS = ${JSON.stringify(CONTEXT_TYPE_COLORS)};
const CTX_LABELS = ${JSON.stringify(CONTEXT_TYPE_LABELS)};
const NODE_LABELS = {person:'People',process:'Processes',technology:'Technologies',concept:'Concepts',organization:'Organizations'};

function getColor(type) { return NODE_COLORS[type] || '#78716C'; }
function getLabel(type) { return NODE_LABELS[type] || type.replace(/_/g,' ').replace(/\\b\\w/g,c=>c.toUpperCase())+'s'; }
function esc(s) { const d=document.createElement('div'); d.textContent=s; return d.innerHTML; }

// Stats
document.getElementById('stats').textContent = DATA.nodes.length + ' entities, ' + DATA.edges.length + ' relationships';

// Legend
const legendEl = document.getElementById('legend');
[...new Set(DATA.nodes.map(n=>n.type))].forEach(t => {
  legendEl.innerHTML += '<div class="legend-item"><div class="legend-dot" style="background:'+getColor(t)+'"></div>'+getLabel(t)+'</div>';
});
if (DATA.graphType === 'context') {
  Object.entries(CTX_COLORS).forEach(([k,c]) => {
    legendEl.innerHTML += '<div class="legend-item"><div class="legend-line" style="background:'+c+'"></div>'+(CTX_LABELS[k]||k)+'</div>';
  });
} else {
  [{c:'#F59E0B',l:'Tribal Knowledge'},{c:'#EF4444',l:'Exception'}].forEach(i => {
    legendEl.innerHTML += '<div class="legend-item"><div class="legend-dot" style="background:'+i.c+'"></div>'+i.l+'</div>';
  });
}

// --- D3 Graph ---
const svg = d3.select('#svg');
const graphEl = document.getElementById('graph');
const width = graphEl.clientWidth;
const height = graphEl.clientHeight;
svg.attr('viewBox', [0, 0, width, height]);

const g = svg.append('g');

// Background rect for deselection
g.append('rect').attr('width',width*4).attr('height',height*4).attr('x',-width*2).attr('y',-height*2).attr('fill','transparent');

const zoom = d3.zoom().scaleExtent([0.1, 6]).filter(e=>e.type!=='dblclick').on('zoom', e=>g.attr('transform',e.transform));
svg.call(zoom);

const defs = svg.append('defs');
defs.append('marker').attr('id','arrow').attr('viewBox','0 -5 10 10').attr('refX',28).attr('refY',0).attr('markerWidth',6).attr('markerHeight',6).attr('orient','auto')
  .append('path').attr('d','M0,-4L8,0L0,4').attr('fill','#475569');
const glowF = defs.append('filter').attr('id','glow');
glowF.append('feGaussianBlur').attr('stdDeviation','3').attr('result','blur');
const fm = glowF.append('feMerge'); fm.append('feMergeNode').attr('in','blur'); fm.append('feMergeNode').attr('in','SourceGraphic');

const nodes = DATA.nodes.map(d=>({...d}));
const edgesData = DATA.edges.map(d=>({...d}));

const sim = d3.forceSimulation(nodes)
  .force('link', d3.forceLink(edgesData).id(d=>d.id).distance(160).strength(0.3))
  .force('charge', d3.forceManyBody().strength(-500).distanceMax(800))
  .force('center', d3.forceCenter(width/2, height/2).strength(0.04))
  .force('collision', d3.forceCollide().radius(55).strength(0.9).iterations(4))
  .alphaDecay(0.02).velocityDecay(0.35);
sim.tick(150);

const linkG = g.append('g');
const links = linkG.selectAll('line').data(edgesData).join('line')
  .attr('stroke', d => DATA.graphType==='context' ? (CTX_COLORS[d.context_type]||'#475569') : '#475569')
  .attr('stroke-width', DATA.graphType==='context' ? 2 : 1.5)
  .attr('stroke-opacity', DATA.graphType==='context' ? 0.7 : 0.5)
  .attr('marker-end','url(#arrow)');

const nodeG = g.append('g');
const typeMap = {person:'P',process:'Pr',technology:'T',concept:'C',organization:'O'};
const nodeGs = nodeG.selectAll('g').data(nodes).join('g').style('cursor','pointer');

nodeGs.append('circle').attr('r',14).attr('fill',d=>getColor(d.type)).attr('stroke','#1E293B').attr('stroke-width',2.5).attr('filter','drop-shadow(0 1px 3px rgba(0,0,0,0.4))');

if (DATA.graphType==='knowledge') {
  nodeGs.filter(d=>DATA.indicators[d.id]?.hasTribal).append('circle').attr('cx',10).attr('cy',-10).attr('r',5).attr('fill','#F59E0B').attr('stroke','#1E293B').attr('stroke-width',1.5);
  nodeGs.filter(d=>DATA.indicators[d.id]?.hasException).append('circle').attr('cx',-10).attr('cy',-10).attr('r',5).attr('fill','#EF4444').attr('stroke','#1E293B').attr('stroke-width',1.5);
}

nodeGs.append('text').text(d=>typeMap[d.type]||d.type.charAt(0).toUpperCase()).attr('text-anchor','middle').attr('dy',4).attr('font-size',9).attr('font-weight',700).attr('fill','#fff').attr('pointer-events','none');
nodeGs.append('text').text(d=>d.label.length>25?d.label.slice(0,22)+'...':d.label).attr('dy',28).attr('text-anchor','middle').attr('font-size',11).attr('font-weight',500).attr('fill','#CBD5E1').attr('pointer-events','none');

// Tooltip
const tooltip = document.getElementById('tooltip');
nodeGs.on('mouseover',(e,d)=>{
  d3.select(e.currentTarget).select('circle:first-child').transition().duration(150).attr('r',18);
  tooltip.innerHTML='<div class="t-label">'+esc(d.label)+'</div><div class="t-type">'+esc(d.type.replace(/_/g,' '))+'</div>'+(d.description?'<div style="color:#CBD5E1;font-size:11px;margin-top:4px">'+esc(d.description)+'</div>':'');
  tooltip.style.opacity=1;
}).on('mousemove',e=>{tooltip.style.left=(e.clientX+14)+'px';tooltip.style.top=(e.clientY-14)+'px';}).on('mouseout',e=>{
  d3.select(e.currentTarget).select('circle:first-child').transition().duration(150).attr('r',14);
  tooltip.style.opacity=0;
});

// --- Selection & Detail Panel ---
const panel = document.getElementById('panel');
const panelInner = document.getElementById('panel-inner');
const hintEl = document.getElementById('hint');
let selectedId = null;
let nodeJustClicked = false;

function getEdgeId(e,field) { return typeof e[field]==='string' ? e[field] : e[field].id; }

function highlightNode(d) {
  nodeGs.select('circle:first-child').attr('stroke','#1E293B').attr('stroke-width',2.5).attr('filter','drop-shadow(0 1px 3px rgba(0,0,0,0.4))');
  nodeGs.filter(n=>n.id===d.id).select('circle:first-child').attr('stroke','#3B82F6').attr('stroke-width',3.5).attr('filter','url(#glow)');
  links.attr('stroke',e=>{
    const s=getEdgeId(e,'source'),t=getEdgeId(e,'target');
    if(s===d.id||t===d.id) return '#3B82F6';
    return DATA.graphType==='context'?(CTX_COLORS[e.context_type]||'#475569'):'#475569';
  }).attr('stroke-width',e=>{
    const s=getEdgeId(e,'source'),t=getEdgeId(e,'target');
    return (s===d.id||t===d.id)?3:(DATA.graphType==='context'?2:1.5);
  }).attr('stroke-opacity',e=>{
    const s=getEdgeId(e,'source'),t=getEdgeId(e,'target');
    return (s===d.id||t===d.id)?1:0.2;
  });
  nodeGs.style('opacity',n=>{
    if(n.id===d.id) return 1;
    return edgesData.some(e=>{const s=getEdgeId(e,'source'),t=getEdgeId(e,'target');return(s===d.id&&t===n.id)||(t===d.id&&s===n.id);})?1:0.25;
  });
}

function resetHighlights() {
  nodeGs.select('circle:first-child').attr('stroke','#1E293B').attr('stroke-width',2.5).attr('filter','drop-shadow(0 1px 3px rgba(0,0,0,0.4))');
  links.attr('stroke',d=>DATA.graphType==='context'?(CTX_COLORS[d.context_type]||'#475569'):'#475569')
    .attr('stroke-width',DATA.graphType==='context'?2:1.5).attr('stroke-opacity',DATA.graphType==='context'?0.7:0.5);
  nodeGs.style('opacity',1);
}

function showPanel(d) {
  selectedId = d.id;
  highlightNode(d);
  hintEl.style.display = 'none';

  // Find connections
  const conns = edgesData.filter(e=>{const s=getEdgeId(e,'source'),t=getEdgeId(e,'target');return s===d.id||t===d.id;}).map(e=>{
    const s=getEdgeId(e,'source'),t=getEdgeId(e,'target');
    const isSource=s===d.id;
    const otherId=isSource?t:s;
    const other=nodes.find(n=>n.id===otherId);
    return{node:other,label:e.label,dir:isSource?'outgoing':'incoming',strength:e.strength,ctxType:e.context_type||''};
  });

  // Find related context intelligence
  const relIntel = DATA.intel.filter(ci=>ci.related_entities&&ci.related_entities.includes(d.id));

  let html = '<div class="panel-header"><div class="node-info"><div class="node-dot" style="background:'+getColor(d.type)+'"></div><div><div class="node-label">'+esc(d.label)+'</div><div class="node-type">'+esc(getLabel(d.type))+'</div></div></div><button class="panel-close" onclick="closePanel()">&times;</button></div>';
  html += '<div class="panel-body">';

  // About
  if(d.description) {
    html += '<div class="section-title">About</div><div class="about-text">'+esc(d.description)+'</div>';
  }

  // Relationships
  if(conns.length>0) {
    html += '<div class="section-title">Relationships ('+conns.length+')</div>';
    conns.forEach(c=>{
      const color = c.node ? getColor(c.node.type) : '#475569';
      const barColor = c.ctxType ? (CTX_COLORS[c.ctxType]||'#3B82F6') : '#60A5FA';
      html += '<div class="conn-card"><div class="conn-top"><div class="conn-dot" style="background:'+color+'"></div><div class="conn-name">'+esc(c.node?.label||'Unknown')+'</div>';
      if(c.ctxType) html += '<div class="conn-badge" style="background:'+(CTX_COLORS[c.ctxType]||'#475569')+'">'+(CTX_LABELS[c.ctxType]||c.ctxType)+'</div>';
      html += '</div>';
      html += '<div class="conn-rel">'+(c.dir==='outgoing'?'<span class="conn-arrow" style="color:#3B82F6">&#8594;</span> ':'<span class="conn-arrow" style="color:#10B981">&#8592;</span> ')+esc(c.label)+'</div>';
      html += '<div class="conn-bar-bg"><div class="conn-bar" style="width:'+(c.strength*100)+'%;background:'+barColor+'"></div></div>';
      html += '</div>';
    });
  }

  // Context Intelligence
  if(relIntel.length>0) {
    html += '<div class="section-title intel" style="margin-top:16px">&#9432; Context Intelligence ('+relIntel.length+')</div>';
    relIntel.forEach(ci=>{
      html += '<div class="intel-card"><div class="intel-top"><div class="intel-title">'+esc(ci.title)+'</div>';
      if(ci.intel_type) html += '<div class="conn-badge" style="background:'+(CTX_COLORS[ci.intel_type]||'#475569')+'">'+(CTX_LABELS[ci.intel_type]||ci.intel_type)+'</div>';
      html += '</div>';
      html += '<div class="intel-desc">'+esc(ci.description)+'</div>';
      html += '<div class="intel-meta"><span class="risk-badge risk-'+ci.risk_level+'">Risk: '+ci.risk_level+'</span></div>';
      if(ci.formalization_action) html += '<div class="intel-action"><strong>Action:</strong> '+esc(ci.formalization_action)+'</div>';
      html += '</div>';
    });
  }

  if(relIntel.length===0 && conns.length===0) {
    html += '<div class="empty-msg">No relationships or context intelligence linked to this entity</div>';
  } else if(relIntel.length===0) {
    html += '<div class="empty-msg" style="margin-top:12px">No context intelligence linked to this entity</div>';
  }

  html += '</div>';
  panelInner.innerHTML = html;
  panel.classList.add('open');
}

function closePanel() {
  panel.classList.remove('open');
  selectedId = null;
  resetHighlights();
  hintEl.style.display = '';
}
window.closePanel = closePanel;

// Drag with click detection
let dsx,dsy,wd;
const drag = d3.drag()
  .on('start',(e,d)=>{dsx=e.x;dsy=e.y;wd=false;if(!e.active)sim.alphaTarget(0.3).restart();d.fx=d.x;d.fy=d.y;})
  .on('drag',(e,d)=>{if(Math.abs(e.x-dsx)>3||Math.abs(e.y-dsy)>3)wd=true;d.fx=e.x;d.fy=e.y;})
  .on('end',(e,d)=>{if(!e.active)sim.alphaTarget(0);d.fx=null;d.fy=null;if(!wd){nodeJustClicked=true;showPanel(d);setTimeout(()=>{nodeJustClicked=false;},100);}});
nodeGs.call(drag);
nodeGs.on('click',e=>e.stopPropagation());

// Background click deselects
svg.on('click',e=>{if(nodeJustClicked)return;if(e.target.tagName==='svg'||e.target.tagName==='rect')closePanel();});

// Tick
sim.on('tick',()=>{
  links.attr('x1',d=>d.source.x).attr('y1',d=>d.source.y).attr('x2',d=>d.target.x).attr('y2',d=>d.target.y);
  nodeGs.attr('transform',d=>'translate('+d.x+','+d.y+')');
});

// Fit to view
setTimeout(()=>{
  const b=g.node().getBBox();
  if(b.width>0){
    const p=60,s=Math.min(width/(b.width+p*2),height/(b.height+p*2),1.2);
    const tx=width/2-(b.x+b.width/2)*s,ty=height/2-(b.y+b.height/2)*s;
    svg.transition().duration(600).call(zoom.transform,d3.zoomIdentity.translate(tx,ty).scale(s));
  }
},100);
<\/script>
</body>
</html>`;

  // Trigger download
  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${title.replace(/[^a-zA-Z0-9_-]/g, "_")}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
