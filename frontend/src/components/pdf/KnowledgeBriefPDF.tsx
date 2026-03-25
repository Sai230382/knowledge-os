"use client";
import {
  Document,
  Page,
  View,
  Text,
  StyleSheet,
} from "@react-pdf/renderer";
import { SynthesisOutput, AnalysisOutput } from "@/lib/types";

/* ─── Styles ─────────────────────────────────────────────── */
const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 9,
    color: "#1e293b",
    paddingTop: 0,
    paddingBottom: 40,
    paddingHorizontal: 0,
  },

  /* Header */
  header: {
    backgroundColor: "#0f172a",
    paddingHorizontal: 36,
    paddingTop: 28,
    paddingBottom: 22,
    marginBottom: 0,
  },
  headerBrand: {
    fontSize: 8,
    color: "#64748b",
    letterSpacing: 2,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: "Helvetica-Bold",
    color: "#ffffff",
    marginBottom: 6,
    lineHeight: 1.3,
  },
  headerMeta: {
    fontSize: 8,
    color: "#94a3b8",
  },
  headerAccent: {
    width: 36,
    height: 3,
    backgroundColor: "#3b82f6",
    marginBottom: 10,
    borderRadius: 2,
  },

  /* Body padding wrapper */
  body: {
    paddingHorizontal: 36,
    paddingTop: 24,
  },

  /* Section */
  section: {
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: "#64748b",
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: 8,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },

  /* Executive summary box */
  execBox: {
    backgroundColor: "#f0f9ff",
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: "#3b82f6",
    padding: 12,
    marginBottom: 20,
  },
  execLabel: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: "#3b82f6",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: 5,
  },
  execText: {
    fontSize: 9,
    color: "#334155",
    lineHeight: 1.6,
  },

  /* Severity cards */
  severityCard: {
    borderRadius: 5,
    padding: 10,
    marginBottom: 6,
    flexDirection: "row",
    gap: 8,
  },
  severityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 2,
    flexShrink: 0,
  },
  severityHeading: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: "#1e293b",
    marginBottom: 2,
  },
  severityText: {
    fontSize: 8,
    color: "#475569",
    lineHeight: 1.5,
  },

  /* 3-column grid */
  threeCol: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 20,
  },
  colBox: {
    flex: 1,
    borderRadius: 6,
    padding: 10,
  },
  colLabel: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: 7,
  },
  bulletRow: {
    flexDirection: "row",
    gap: 5,
    marginBottom: 4,
  },
  bulletDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 3,
    flexShrink: 0,
  },
  bulletText: {
    fontSize: 8,
    color: "#334155",
    lineHeight: 1.5,
    flex: 1,
  },

  /* Intel cards */
  intelCard: {
    backgroundColor: "#fafafa",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 5,
    padding: 9,
    marginBottom: 5,
  },
  intelHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 3,
  },
  intelTitle: {
    fontSize: 8.5,
    fontFamily: "Helvetica-Bold",
    color: "#1e293b",
    flex: 1,
  },
  intelBadge: {
    fontSize: 6.5,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 3,
    marginLeft: 6,
  },
  intelDesc: {
    fontSize: 8,
    color: "#475569",
    lineHeight: 1.5,
    marginBottom: 4,
  },
  intelMeta: {
    flexDirection: "row",
    gap: 12,
    flexWrap: "wrap",
  },
  intelMetaItem: {
    fontSize: 7.5,
    color: "#64748b",
  },
  intelMetaLabel: {
    fontFamily: "Helvetica-Bold",
    color: "#475569",
  },

  /* Gap cards */
  gapCard: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 5,
    padding: 9,
    marginBottom: 5,
    backgroundColor: "#fffbeb",
  },
  gapHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 3,
  },
  gapTitle: {
    fontSize: 8.5,
    fontFamily: "Helvetica-Bold",
    color: "#1e293b",
    flex: 1,
  },
  gapDesc: {
    fontSize: 8,
    color: "#475569",
    lineHeight: 1.5,
    marginBottom: 3,
  },
  gapFix: {
    fontSize: 7.5,
    color: "#64748b",
  },

  /* Footer */
  footer: {
    position: "absolute",
    bottom: 18,
    left: 36,
    right: 36,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    paddingTop: 6,
  },
  footerText: {
    fontSize: 7,
    color: "#94a3b8",
  },

  /* Divider */
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    marginBottom: 16,
  },

  subSectionLabel: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "#475569",
    marginBottom: 6,
    marginTop: 8,
  },

  riskBadge: {
    fontSize: 6.5,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 3,
  },

  noData: {
    fontSize: 8,
    color: "#94a3b8",
    fontStyle: "italic",
  },
});

/* ─── Helpers ────────────────────────────────────────────── */
const SEVERITY_COLORS: Record<string, { bg: string; dot: string }> = {
  critical: { bg: "#fff1f2", dot: "#ef4444" },
  warning:  { bg: "#fffbeb", dot: "#f59e0b" },
  success:  { bg: "#f0fdf4", dot: "#22c55e" },
  info:     { bg: "#f0f9ff", dot: "#3b82f6" },
};

const RISK_COLORS: Record<string, { bg: string; text: string }> = {
  high:   { bg: "#fee2e2", text: "#b91c1c" },
  medium: { bg: "#fef3c7", text: "#92400e" },
  low:    { bg: "#d1fae5", text: "#065f46" },
};

const INTEL_TYPE_LABELS: Record<string, string> = {
  tribal_knowledge:  "Tribal",
  exception:         "Exception",
  workaround:        "Workaround",
  process_variation: "Variation",
  hidden_pattern:    "Hidden Pattern",
};

const INTEL_TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  tribal_knowledge:  { bg: "#ede9fe", text: "#5b21b6" },
  exception:         { bg: "#fee2e2", text: "#991b1b" },
  workaround:        { bg: "#fef3c7", text: "#92400e" },
  process_variation: { bg: "#dbeafe", text: "#1e40af" },
  hidden_pattern:    { bg: "#d1fae5", text: "#065f46" },
};

function formatDate(): string {
  return new Date().toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

/* ─── Sub-components ─────────────────────────────────────── */
function BulletItem({ text, color }: { text: string; color: string }) {
  return (
    <View style={styles.bulletRow}>
      <View style={[styles.bulletDot, { backgroundColor: color }]} />
      <Text style={styles.bulletText}>{text}</Text>
    </View>
  );
}

/* ─── Main PDF Document ──────────────────────────────────── */
interface Props {
  synthesis: SynthesisOutput;
  analysis: AnalysisOutput;
}

export default function KnowledgeBriefPDF({ synthesis, analysis }: Props) {
  const contextIntel = analysis.context_intelligence || [];
  const tribalKnowledge = contextIntel.filter(
    (i) => i.intel_type === "tribal_knowledge"
  );
  const exceptions = contextIntel.filter(
    (i) => i.intel_type === "exception" || i.intel_type === "workaround"
  );
  const otherIntel = contextIntel.filter(
    (i) =>
      i.intel_type !== "tribal_knowledge" &&
      i.intel_type !== "exception" &&
      i.intel_type !== "workaround"
  );
  const gaps = analysis.gap_analysis || [];

  return (
    <Document
      title={synthesis.title}
      author="Contextus — Knowledge OS"
      subject="Knowledge Brief"
    >
      <Page size="A4" style={styles.page}>
        {/* ── Header ── */}
        <View style={styles.header}>
          <Text style={styles.headerBrand}>Contextus · Knowledge OS</Text>
          <View style={styles.headerAccent} />
          <Text style={styles.headerTitle}>{synthesis.title}</Text>
          <Text style={styles.headerMeta}>Generated {formatDate()}</Text>
        </View>

        <View style={styles.body}>
          {/* ── Executive Summary ── */}
          <View style={styles.execBox}>
            <Text style={styles.execLabel}>Executive Summary</Text>
            <Text style={styles.execText}>{synthesis.executive_summary}</Text>
          </View>

          {/* ── Key Findings ── */}
          {synthesis.sections.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Key Findings</Text>
              {synthesis.sections.map((sec, i) => {
                const colors =
                  SEVERITY_COLORS[sec.severity] || SEVERITY_COLORS.info;
                return (
                  <View
                    key={i}
                    style={[
                      styles.severityCard,
                      { backgroundColor: colors.bg },
                    ]}
                  >
                    <View
                      style={[
                        styles.severityDot,
                        { backgroundColor: colors.dot },
                      ]}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.severityHeading}>{sec.heading}</Text>
                      <Text style={styles.severityText}>{sec.content}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          {/* ── Risks / Quick Wins / Strategic ── */}
          <View style={styles.threeCol}>
            {synthesis.key_risks.length > 0 && (
              <View
                style={[
                  styles.colBox,
                  { backgroundColor: "#fff1f2", borderWidth: 1, borderColor: "#fecaca" },
                ]}
              >
                <Text style={[styles.colLabel, { color: "#dc2626" }]}>
                  Key Risks
                </Text>
                {synthesis.key_risks.map((r, i) => (
                  <BulletItem key={i} text={r} color="#ef4444" />
                ))}
              </View>
            )}
            {synthesis.quick_wins.length > 0 && (
              <View
                style={[
                  styles.colBox,
                  { backgroundColor: "#f0fdf4", borderWidth: 1, borderColor: "#bbf7d0" },
                ]}
              >
                <Text style={[styles.colLabel, { color: "#16a34a" }]}>
                  Quick Wins
                </Text>
                {synthesis.quick_wins.map((w, i) => (
                  <BulletItem key={i} text={w} color="#22c55e" />
                ))}
              </View>
            )}
            {synthesis.strategic_recommendations.length > 0 && (
              <View
                style={[
                  styles.colBox,
                  { backgroundColor: "#eff6ff", borderWidth: 1, borderColor: "#bfdbfe" },
                ]}
              >
                <Text style={[styles.colLabel, { color: "#1d4ed8" }]}>
                  Strategic
                </Text>
                {synthesis.strategic_recommendations.map((s, i) => (
                  <BulletItem key={i} text={s} color="#3b82f6" />
                ))}
              </View>
            )}
          </View>

          {/* ── Hidden Intelligence ── */}
          {contextIntel.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Hidden Intelligence</Text>

              {tribalKnowledge.length > 0 && (
                <>
                  <Text style={styles.subSectionLabel}>
                    Tribal Knowledge ({tribalKnowledge.length})
                  </Text>
                  {tribalKnowledge.map((item, i) => {
                    const typeColors =
                      INTEL_TYPE_COLORS[item.intel_type] ||
                      INTEL_TYPE_COLORS.tribal_knowledge;
                    const riskColors =
                      RISK_COLORS[item.risk_level] || RISK_COLORS.medium;
                    return (
                      <View key={i} style={styles.intelCard}>
                        <View style={styles.intelHeader}>
                          <Text style={styles.intelTitle}>{item.title}</Text>
                          <View style={{ flexDirection: "row", gap: 4 }}>
                            <View
                              style={[
                                styles.riskBadge,
                                { backgroundColor: riskColors.bg },
                              ]}
                            >
                              <Text style={{ color: riskColors.text, fontSize: 6.5 }}>
                                {item.risk_level} risk
                              </Text>
                            </View>
                          </View>
                        </View>
                        <Text style={styles.intelDesc}>{item.description}</Text>
                        <View style={styles.intelMeta}>
                          {item.trigger ? (
                            <Text style={styles.intelMetaItem}>
                              <Text style={styles.intelMetaLabel}>Trigger: </Text>
                              {item.trigger}
                            </Text>
                          ) : null}
                          {item.impact ? (
                            <Text style={styles.intelMetaItem}>
                              <Text style={styles.intelMetaLabel}>Impact: </Text>
                              {item.impact}
                            </Text>
                          ) : null}
                        </View>
                        {item.formalization_action ? (
                          <Text
                            style={[
                              styles.intelMetaItem,
                              { marginTop: 3, color: "#7c3aed" },
                            ]}
                          >
                            <Text
                              style={{
                                fontFamily: "Helvetica-Bold",
                                color: "#7c3aed",
                              }}
                            >
                              Action:{" "}
                            </Text>
                            {item.formalization_action}
                          </Text>
                        ) : null}
                      </View>
                    );
                  })}
                </>
              )}

              {exceptions.length > 0 && (
                <>
                  <Text style={[styles.subSectionLabel, { marginTop: 10 }]}>
                    Exceptions & Workarounds ({exceptions.length})
                  </Text>
                  {exceptions.map((item, i) => {
                    const typeColors =
                      INTEL_TYPE_COLORS[item.intel_type] ||
                      INTEL_TYPE_COLORS.exception;
                    const riskColors =
                      RISK_COLORS[item.risk_level] || RISK_COLORS.medium;
                    return (
                      <View key={i} style={styles.intelCard}>
                        <View style={styles.intelHeader}>
                          <Text style={styles.intelTitle}>{item.title}</Text>
                          <View style={{ flexDirection: "row", gap: 4 }}>
                            <View
                              style={[
                                styles.intelBadge,
                                { backgroundColor: typeColors.bg },
                              ]}
                            >
                              <Text style={{ color: typeColors.text, fontSize: 6.5 }}>
                                {INTEL_TYPE_LABELS[item.intel_type] ||
                                  item.intel_type}
                              </Text>
                            </View>
                            <View
                              style={[
                                styles.riskBadge,
                                { backgroundColor: riskColors.bg },
                              ]}
                            >
                              <Text style={{ color: riskColors.text, fontSize: 6.5 }}>
                                {item.risk_level} risk
                              </Text>
                            </View>
                          </View>
                        </View>
                        <Text style={styles.intelDesc}>{item.description}</Text>
                        <View style={styles.intelMeta}>
                          {item.trigger ? (
                            <Text style={styles.intelMetaItem}>
                              <Text style={styles.intelMetaLabel}>Trigger: </Text>
                              {item.trigger}
                            </Text>
                          ) : null}
                          {item.impact ? (
                            <Text style={styles.intelMetaItem}>
                              <Text style={styles.intelMetaLabel}>Impact: </Text>
                              {item.impact}
                            </Text>
                          ) : null}
                        </View>
                      </View>
                    );
                  })}
                </>
              )}

              {otherIntel.length > 0 && (
                <>
                  <Text style={[styles.subSectionLabel, { marginTop: 10 }]}>
                    Hidden Patterns ({otherIntel.length})
                  </Text>
                  {otherIntel.map((item, i) => {
                    const typeColors =
                      INTEL_TYPE_COLORS[item.intel_type] ||
                      INTEL_TYPE_COLORS.hidden_pattern;
                    return (
                      <View key={i} style={styles.intelCard}>
                        <View style={styles.intelHeader}>
                          <Text style={styles.intelTitle}>{item.title}</Text>
                          <View
                            style={[
                              styles.intelBadge,
                              { backgroundColor: typeColors.bg },
                            ]}
                          >
                            <Text style={{ color: typeColors.text, fontSize: 6.5 }}>
                              {INTEL_TYPE_LABELS[item.intel_type] ||
                                item.intel_type}
                            </Text>
                          </View>
                        </View>
                        <Text style={styles.intelDesc}>{item.description}</Text>
                      </View>
                    );
                  })}
                </>
              )}
            </View>
          )}

          {/* ── Gap Analysis ── */}
          {gaps.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Gap Analysis</Text>
              {gaps.map((gap, i) => {
                const riskColors =
                  RISK_COLORS[gap.risk_level] || RISK_COLORS.medium;
                return (
                  <View key={i} style={styles.gapCard}>
                    <View style={styles.gapHeader}>
                      <Text style={styles.gapTitle}>{gap.title}</Text>
                      <View
                        style={[
                          styles.riskBadge,
                          { backgroundColor: riskColors.bg },
                        ]}
                      >
                        <Text style={{ color: riskColors.text, fontSize: 6.5 }}>
                          {gap.risk_level} risk
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.gapDesc}>{gap.description}</Text>
                    {gap.recommendation ? (
                      <Text style={styles.gapFix}>
                        <Text
                          style={{
                            fontFamily: "Helvetica-Bold",
                            color: "#475569",
                          }}
                        >
                          Fix:{" "}
                        </Text>
                        {gap.recommendation}
                      </Text>
                    ) : null}
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* ── Footer ── */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            Contextus · Knowledge OS · Confidential
          </Text>
          <Text
            style={styles.footerText}
            render={({ pageNumber, totalPages }) =>
              `Page ${pageNumber} of ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  );
}
