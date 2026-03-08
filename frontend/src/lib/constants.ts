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
};

export const NODE_LABELS: Record<string, string> = {
  person: "People",
  process: "Processes",
  technology: "Technologies",
  concept: "Concepts",
  organization: "Organizations",
};
