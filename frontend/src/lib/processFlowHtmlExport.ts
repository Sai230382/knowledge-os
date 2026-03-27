import { ProcessFlow } from "./types";

export function generateProcessFlowHTML(flow: ProcessFlow): string {
  const flowJSON = JSON.stringify(flow);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Process Flow — ${flow.process_name}</title>
<script src="https://d3js.org/d3.v7.min.js"><\/script>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8fafc; color: #1e293b; }
  body.dark { background: #0f172a; color: #e2e8f0; }
  #header { display: flex; align-items: center; justify-content: space-between; padding: 12px 20px; background: white; border-bottom: 1px solid #e2e8f0; }
  body.dark #header { background: #1e293b; border-color: #334155; }
  #header h1 { font-size: 16px; font-weight: 600; }
  #header p { font-size: 12px; color: #64748b; margin-top: 2px; }
  body.dark #header p { color: #94a3b8; }
  #controls { display: flex; gap: 8px; align-items: center; }
  #controls button { padding: 6px 12px; font-size: 12px; border: 1px solid #cbd5e1; border-radius: 6px; background: white; cursor: pointer; }
  body.dark #controls button { background: #334155; border-color: #475569; color: #e2e8f0; }
  #controls button:hover { background: #f1f5f9; }
  body.dark #controls button:hover { background: #475569; }
  #canvas { width: 100%; height: calc(100vh - 52px); }
  #detail-panel { position: fixed; top: 60px; right: 12px; width: 300px; max-height: 80vh; overflow-y: auto; background: white; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.15); border: 1px solid #e2e8f0; padding: 16px; display: none; }
  body.dark #detail-panel { background: #1e293b; border-color: #334155; }
  #detail-panel.visible { display: block; }
  #detail-panel .badge { display: inline-block; font-size: 10px; font-weight: 600; padding: 2px 8px; border-radius: 10px; margin-bottom: 8px; }
  #detail-panel h3 { font-size: 14px; font-weight: 600; margin-bottom: 6px; }
  #detail-panel p { font-size: 12px; color: #64748b; line-height: 1.5; }
  body.dark #detail-panel p { color: #94a3b8; }
  #detail-panel .close-btn { position: absolute; top: 8px; right: 12px; font-size: 18px; cursor: pointer; color: #94a3b8; background: none; border: none; }
  #legend { position: fixed; bottom: 12px; left: 12px; display: flex; gap: 12px; background: rgba(255,255,255,0.95); padding: 8px 12px; border-radius: 8px; border: 1px solid #e2e8f0; }
  body.dark #legend { background: rgba(15,23,42,0.95); border-color: #334155; }
  .legend-item { display: flex; align-items: center; gap: 4px; font-size: 10px; color: #64748b; }
  body.dark .legend-item { color: #94a3b8; }
  .legend-dot { width: 10px; height: 10px; border-radius: 2px; border: 1px solid; }
  .watermark { position: fixed; bottom: 12px; right: 12px; font-size: 10px; color: #94a3b8; }
</style>
</head>
<body>
<div id="header">
  <div>
    <h1>${flow.process_name}</h1>
    <p>${flow.description || flow.steps.length + " steps"}</p>
  </div>
  <div id="controls">
    <button onclick="resetZoom()">Reset View</button>
    <button onclick="toggleTheme()">Toggle Theme</button>
  </div>
</div>
<svg id="canvas"></svg>
<div id="detail-panel">
  <button class="close-btn" onclick="closePanel()">&times;</button>
  <div id="panel-content"></div>
</div>
<div id="legend">
  <div class="legend-item"><div class="legend-dot" style="background:#D1FAE5;border-color:#059669"></div>Start</div>
  <div class="legend-item"><div class="legend-dot" style="background:#EFF6FF;border-color:#2563EB"></div>Action</div>
  <div class="legend-item"><div class="legend-dot" style="background:#FFFBEB;border-color:#D97706"></div>Decision</div>
  <div class="legend-item"><div class="legend-dot" style="background:#FEE2E2;border-color:#DC2626"></div>End</div>
  <div class="legend-item"><div class="legend-dot" style="background:#FEF2F2;border-color:#EF4444"></div>Exception</div>
</div>
<div class="watermark">Contextus — Knowledge OS</div>

<script>
const FLOW = ${flowJSON};
const COLORS = {
  start: { fill: "#D1FAE5", stroke: "#059669", text: "#065F46" },
  end: { fill: "#FEE2E2", stroke: "#DC2626", text: "#991B1B" },
  action: { fill: "#EFF6FF", stroke: "#2563EB", text: "#1E40AF" },
  decision: { fill: "#FFFBEB", stroke: "#D97706", text: "#92400E" },
  exception: { fill: "#FEF2F2", stroke: "#EF4444", text: "#991B1B" },
};

const NODE_W = 200, NODE_H = 56, DIAMOND = 72, RANK_GAP = 100, SIB_GAP = 40, PAD = 60;

// Layout
const steps = FLOW.steps || [];
const stepMap = new Map(); steps.forEach(s => stepMap.set(s.id, s));
const startStep = steps.find(s => s.step_type === "start") || steps[0];
if (!startStep) { document.getElementById("canvas").innerHTML = '<text x="50%" y="50%" text-anchor="middle" fill="#64748b">No steps</text>'; throw "empty"; }

const rankMap = new Map();
const queue = [{ id: startStep.id, rank: 0 }];
const visited = new Set();
while (queue.length) {
  const { id, rank } = queue.shift();
  if (visited.has(id)) continue; visited.add(id);
  rankMap.set(id, Math.max(rankMap.get(id) || 0, rank));
  const s = stepMap.get(id);
  if (s) s.next_steps.forEach(n => { if (!visited.has(n)) queue.push({ id: n, rank: rank + 1 }); });
}
steps.forEach(s => { if (!rankMap.has(s.id)) rankMap.set(s.id, (Math.max(...rankMap.values()) || 0) + 1); });

const rankGroups = new Map();
steps.forEach(s => {
  const r = rankMap.get(s.id) || 0;
  if (!rankGroups.has(r)) rankGroups.set(r, []);
  rankGroups.get(r).push(s);
});

const nodes = []; const nodeMap = new Map();
[...rankGroups.keys()].sort((a,b)=>a-b).forEach(rank => {
  const group = rankGroups.get(rank);
  const totalW = group.length * NODE_W + (group.length - 1) * SIB_GAP;
  const startX = -totalW / 2;
  group.forEach((step, i) => {
    const isDiamond = step.step_type === "decision";
    const w = isDiamond ? DIAMOND * 1.8 : NODE_W;
    const h = isDiamond ? DIAMOND : NODE_H;
    const node = { step, x: startX + i * (NODE_W + SIB_GAP) + NODE_W / 2, y: rank * RANK_GAP + PAD, w, h };
    nodes.push(node); nodeMap.set(step.id, node);
  });
});

const edges = [];
steps.forEach(step => {
  const src = nodeMap.get(step.id); if (!src) return;
  step.next_steps.forEach(nid => {
    const tgt = nodeMap.get(nid); if (!tgt) return;
    edges.push({ source: src, target: tgt, label: (step.branch_labels || {})[nid] || "" });
  });
});

// Render
const svg = d3.select("#canvas");
const rect = document.getElementById("canvas").getBoundingClientRect();
svg.attr("width", rect.width).attr("height", rect.height);

const defs = svg.append("defs");
["arrow","arrow-red"].forEach((id, i) => {
  defs.append("marker").attr("id", id).attr("viewBox","0 0 10 6").attr("refX",10).attr("refY",3)
    .attr("markerWidth",10).attr("markerHeight",6).attr("orient","auto")
    .append("path").attr("d","M0,0 L10,3 L0,6 Z").attr("fill", i ? "#EF4444" : "#94A3B8");
});

const g = svg.append("g");
const zoomBehavior = d3.zoom().scaleExtent([0.2, 3]).on("zoom", e => g.attr("transform", e.transform));
svg.call(zoomBehavior);

// Auto-fit
const xs = nodes.map(n=>n.x), ys = nodes.map(n=>n.y);
const [minX,maxX,minY,maxY] = [Math.min(...xs)-NODE_W, Math.max(...xs)+NODE_W, Math.min(...ys)-NODE_H, Math.max(...ys)+NODE_H+PAD];
const gw = maxX-minX, gh = maxY-minY;
const scale = Math.min(rect.width/gw, rect.height/gh, 1) * 0.85;
const tx = rect.width/2 - ((minX+maxX)/2)*scale, ty = rect.height/2 - ((minY+maxY)/2)*scale;
svg.call(zoomBehavior.transform, d3.zoomIdentity.translate(tx, ty).scale(scale));

// Edges
edges.forEach(e => {
  const sx=e.source.x, sy=e.source.y+e.source.h/2, ex=e.target.x, ey=e.target.y-e.target.h/2;
  const isExc = e.target.step.step_type === "exception";
  const my = (sy+ey)/2;
  g.append("path").attr("d",\`M \${sx},\${sy} C \${sx},\${my} \${ex},\${my} \${ex},\${ey}\`)
    .attr("fill","none").attr("stroke",isExc?"#EF4444":"#94A3B8").attr("stroke-width",2)
    .attr("stroke-dasharray",isExc?"6,3":"none").attr("marker-end",isExc?"url(#arrow-red)":"url(#arrow)");
  if (e.label) {
    const lx=(sx+ex)/2, ly=my-8;
    g.append("rect").attr("x",lx-18).attr("y",ly-10).attr("width",36).attr("height",18).attr("rx",9)
      .attr("fill","white").attr("stroke","#CBD5E1").attr("stroke-width",1);
    g.append("text").attr("x",lx).attr("y",ly+2).attr("text-anchor","middle")
      .attr("font-size","10px").attr("font-weight","600").attr("fill","#64748B").text(e.label);
  }
});

// Nodes
nodes.forEach(n => {
  const c = COLORS[n.step.step_type] || COLORS.action;
  const ng = g.append("g").style("cursor","pointer").on("click", () => showDetail(n.step));

  if (n.step.step_type === "decision") {
    const s = DIAMOND/2;
    const pts = [[n.x,n.y-s],[n.x+s*1.3,n.y],[n.x,n.y+s],[n.x-s*1.3,n.y]].map(p=>p.join(",")).join(" ");
    ng.append("polygon").attr("points",pts).attr("fill",c.fill).attr("stroke",c.stroke).attr("stroke-width",2);
    const lbl = (n.step.condition || n.step.label); const tr = lbl.length > 25 ? lbl.slice(0,22)+"..." : lbl;
    ng.append("text").attr("x",n.x).attr("y",n.y+4).attr("text-anchor","middle")
      .attr("font-size","11px").attr("font-weight","600").attr("fill",c.text).text(tr);
  } else {
    const rx = (n.step.step_type==="start"||n.step.step_type==="end") ? 24 : 8;
    const isExc = n.step.step_type === "exception";
    ng.append("rect").attr("x",n.x-n.w/2).attr("y",n.y-n.h/2).attr("width",n.w).attr("height",n.h)
      .attr("rx",rx).attr("fill",c.fill).attr("stroke",c.stroke).attr("stroke-width",2)
      .attr("stroke-dasharray",isExc?"6,3":"none");
    const lbl = n.step.label; const tr = lbl.length > 28 ? lbl.slice(0,25)+"..." : lbl;
    ng.append("text").attr("x",n.x).attr("y",n.y+4).attr("text-anchor","middle")
      .attr("font-size","12px").attr("font-weight","600").attr("fill",c.text).text(tr);
  }
});

// Panel
function showDetail(step) {
  const panel = document.getElementById("detail-panel");
  const content = document.getElementById("panel-content");
  const badgeColors = { start:"background:#D1FAE5;color:#065F46", end:"background:#FEE2E2;color:#991B1B",
    action:"background:#DBEAFE;color:#1E40AF", decision:"background:#FEF3C7;color:#92400E", exception:"background:#FEE2E2;color:#991B1B" };
  content.innerHTML = \`
    <div class="badge" style="\${badgeColors[step.step_type] || badgeColors.action}">\${step.step_type}</div>
    <h3>\${step.label}</h3>
    \${step.description ? '<p style="margin-bottom:8px">' + step.description + '</p>' : ''}
    \${step.condition ? '<p style="margin-bottom:8px"><strong>Condition:</strong> ' + step.condition + '</p>' : ''}
    \${step.related_entities && step.related_entities.length ? '<p><strong>Related:</strong> ' + step.related_entities.join(", ") + '</p>' : ''}
  \`;
  panel.classList.add("visible");
}

function closePanel() { document.getElementById("detail-panel").classList.remove("visible"); }
function resetZoom() { svg.transition().duration(500).call(zoomBehavior.transform, d3.zoomIdentity.translate(tx, ty).scale(scale)); }
function toggleTheme() { document.body.classList.toggle("dark"); }
<\/script>
</body>
</html>`;
}
