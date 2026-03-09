export const GRAPH_CONFIG = {
  forces: {
    charge: {
      strength: -300,
      distanceMin: 30,
      distanceMax: 500,
    },
    link: {
      distance: 120,
      strength: 0.4,
    },
    collision: {
      radius: 40,
      strength: 0.8,
      iterations: 3,
    },
    center: {
      strength: 0.05,
    },
  },
  simulation: {
    alphaDecay: 0.02,
    velocityDecay: 0.4,
    warmupTicks: 100,
  },
};

export const CONTEXT_GRAPH_CONFIG = {
  forces: {
    charge: {
      strength: -400,
      distanceMin: 40,
      distanceMax: 600,
    },
    link: {
      distance: 160,
      strength: 0.3,
    },
    collision: {
      radius: 55,
      strength: 0.9,
      iterations: 4,
    },
    center: {
      strength: 0.04,
    },
  },
  simulation: {
    alphaDecay: 0.02,
    velocityDecay: 0.35,
    warmupTicks: 150,
  },
};

export const NODE_COLORS: Record<string, string> = {
  person: "#6366F1",
  process: "#10B981",
  technology: "#F59E0B",
  concept: "#8B5CF6",
  organization: "#EC4899",
  regulation: "#EF4444",
  location: "#14B8A6",
  department: "#F97316",
  event: "#06B6D4",
  metric: "#84CC16",
  financial_instrument: "#A855F7",
  document: "#64748B",
  role: "#3B82F6",
  service: "#22D3EE",
  product: "#E879F9",
};

// Fallback colors for any dynamic types not listed above
const FALLBACK_COLORS = ["#78716C", "#0EA5E9", "#D946EF", "#FB923C", "#2DD4BF", "#A3E635"];

export function getNodeColor(type: string): string {
  if (NODE_COLORS[type]) return NODE_COLORS[type];
  // Generate a consistent color for unknown types based on string hash
  let hash = 0;
  for (let i = 0; i < type.length; i++) hash = type.charCodeAt(i) + ((hash << 5) - hash);
  return FALLBACK_COLORS[Math.abs(hash) % FALLBACK_COLORS.length];
}

export const NODE_LABELS: Record<string, string> = {
  person: "People",
  process: "Processes",
  technology: "Technologies",
  concept: "Concepts",
  organization: "Organizations",
  regulation: "Regulations",
  location: "Locations",
  department: "Departments",
  event: "Events",
  metric: "Metrics",
  financial_instrument: "Financial Instruments",
  document: "Documents",
  role: "Roles",
  service: "Services",
  product: "Products",
};

export function getNodeLabel(type: string): string {
  if (NODE_LABELS[type]) return NODE_LABELS[type];
  // Capitalize and pluralize unknown types: "my_type" → "My Types"
  return type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) + "s";
}
