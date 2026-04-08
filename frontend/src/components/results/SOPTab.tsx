"use client";
import { useState } from "react";
import { AnalysisOutput, SOPOutput, ProcessFlow } from "@/lib/types";
import { generateSOP, generateProcessFlows } from "@/lib/api";
import dynamic from "next/dynamic";

const SOPDocxDownload = dynamic(() => import("@/components/sop/SOPDocxDownload"), {
  ssr: false,
  loading: () => (
    <button disabled className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-slate-100 dark:bg-slate-800 text-slate-400 rounded-lg">
      Loading…
    </button>
  ),
});

interface SOPTabProps {
  analysis: AnalysisOutput;
}

const IMPACT_STYLES: Record<string, { bg: string; text: string }> = {
  high: { bg: "bg-red-100 dark:bg-red-900/40", text: "text-red-700 dark:text-red-300" },
  medium: { bg: "bg-amber-100 dark:bg-amber-900/40", text: "text-amber-700 dark:text-amber-300" },
  low: { bg: "bg-green-100 dark:bg-green-900/40", text: "text-green-700 dark:text-green-300" },
};

const SOURCE_LABELS: Record<string, string> = {
  sme_highlight: "SME Insight",
  gap_analysis: "Gap Analysis",
  pattern: "Industry Pattern",
  tribal_knowledge: "Tribal Knowledge",
};

export default function SOPTab({ analysis }: SOPTabProps) {
  const [sop, setSop] = useState<SOPOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  const handleGenerate = async () => {
    setIsLoading(true);
    setError("");
    try {
      // First generate process flows if not available, then SOP
      let processFlows: ProcessFlow[] | undefined;
      try {
        processFlows = await generateProcessFlows(analysis);
      } catch {
        // Process flows are optional, continue without them
      }
      const result = await generateSOP(analysis, processFlows);
      setSop(result);
      // Expand all sections by default
      const allIds = new Set(result.sections.map((s) => s.section_id));
      setExpandedSections(allIds);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate SOP");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSection = (id: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <div className="w-10 h-10 border-4 border-indigo-200 dark:border-indigo-800 border-t-indigo-600 dark:border-t-indigo-400 rounded-full animate-spin" />
        <p className="text-sm text-slate-500 dark:text-slate-400">Generating Standard Operating Procedure...</p>
        <p className="text-xs text-slate-400 dark:text-slate-500">Structuring processes, capturing tribal knowledge, and identifying opportunities</p>
      </div>
    );
  }

  if (!sop) {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center">
          <svg className="w-8 h-8 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <div className="text-center space-y-2">
          <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200">Standard Operating Procedure</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md">
            Generate a professional SOP document with step-by-step procedures, screenshot placeholders, tribal knowledge tips, and areas of opportunity. Download as Word (.docx).
          </p>
        </div>
        <button
          onClick={handleGenerate}
          className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Generate SOP
        </button>
        {error && <p className="text-sm text-red-500">{error}</p>}
      </div>
    );
  }

  // ─── Rendered SOP ───
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center">
            <svg className="w-4 h-4 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-white">{sop.document_title}</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Version {sop.version} · Effective {sop.effective_date}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <SOPDocxDownload sop={sop} />
          <button
            onClick={handleGenerate}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 rounded-lg transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Regenerate
          </button>
        </div>
      </div>

      {/* Table of Contents */}
      <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
        <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">Table of Contents</h3>
        <ol className="space-y-1 text-sm">
          <li className="text-slate-600 dark:text-slate-300">1. Purpose &amp; Scope</li>
          <li className="text-slate-600 dark:text-slate-300">2. Roles &amp; Responsibilities</li>
          {sop.sections.map((sec, i) => (
            <li key={sec.section_id} className="text-slate-600 dark:text-slate-300">
              {i + 3}. {sec.title}
            </li>
          ))}
          <li className="text-slate-600 dark:text-slate-300">{sop.sections.length + 3}. Areas of Opportunity</li>
          {sop.glossary.length > 0 && (
            <li className="text-slate-600 dark:text-slate-300">{sop.sections.length + 4}. Glossary</li>
          )}
        </ol>
      </div>

      {/* Purpose & Scope */}
      <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg p-5 space-y-4">
        <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
          <span className="w-6 h-6 rounded bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 text-xs font-bold flex items-center justify-center">1</span>
          Purpose &amp; Scope
        </h3>
        <div>
          <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Purpose</h4>
          <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{sop.purpose}</p>
        </div>
        <div>
          <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Scope</h4>
          <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{sop.scope}</p>
        </div>
      </div>

      {/* Roles & Responsibilities */}
      {sop.roles_responsibilities.length > 0 && (
        <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg p-5">
          <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2 mb-4">
            <span className="w-6 h-6 rounded bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 text-xs font-bold flex items-center justify-center">2</span>
            Roles &amp; Responsibilities
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider w-1/4">Role</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Responsibilities</th>
                </tr>
              </thead>
              <tbody>
                {sop.roles_responsibilities.map((rr, i) => (
                  <tr key={i} className="border-b border-slate-100 dark:border-slate-700/50">
                    <td className="py-2.5 px-3 font-medium text-slate-700 dark:text-slate-200 align-top">{rr.role}</td>
                    <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">
                      <ul className="list-disc list-inside space-y-0.5">
                        {rr.responsibilities.map((r, j) => (
                          <li key={j}>{r}</li>
                        ))}
                      </ul>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Process Sections */}
      {sop.sections.map((section, sIdx) => (
        <div key={section.section_id} className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
          {/* Section header — collapsible */}
          <button
            onClick={() => toggleSection(section.section_id)}
            className="w-full flex items-center justify-between p-5 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="w-6 h-6 rounded bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 text-xs font-bold flex items-center justify-center flex-shrink-0">
                {sIdx + 3}
              </span>
              <div className="text-left">
                <h3 className="text-sm font-bold text-slate-800 dark:text-white">{section.title}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{section.purpose}</p>
              </div>
            </div>
            <svg
              className={`w-4 h-4 text-slate-400 transition-transform ${expandedSections.has(section.section_id) ? "rotate-180" : ""}`}
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {expandedSections.has(section.section_id) && (
            <div className="border-t border-slate-200 dark:border-slate-700 p-5 space-y-4">
              {/* Section scope */}
              {section.scope && (
                <p className="text-xs text-slate-500 dark:text-slate-400 italic">{section.scope}</p>
              )}

              {/* Steps */}
              <div className="space-y-5">
                {section.steps.map((step) => (
                  <div key={step.step_number} className="relative pl-10">
                    {/* Step number badge */}
                    <div className="absolute left-0 top-0 w-7 h-7 rounded-full bg-indigo-600 dark:bg-indigo-500 text-white text-xs font-bold flex items-center justify-center">
                      {step.step_number}
                    </div>

                    <div className="space-y-3">
                      {/* Title + role */}
                      <div>
                        <h4 className="text-sm font-semibold text-slate-800 dark:text-white">{step.title}</h4>
                        {step.responsible_role && (
                          <span className="inline-block mt-1 text-[10px] px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-medium">
                            {step.responsible_role}
                          </span>
                        )}
                      </div>

                      {/* Description */}
                      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{step.description}</p>

                      {/* Inputs / Outputs / Tools row */}
                      {(step.inputs.length > 0 || step.outputs.length > 0 || step.tools_systems.length > 0) && (
                        <div className="grid grid-cols-3 gap-3">
                          {step.inputs.length > 0 && (
                            <div className="bg-slate-50 dark:bg-slate-900/30 rounded-md p-2.5">
                              <h5 className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Inputs</h5>
                              <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-0.5">
                                {step.inputs.map((inp, i) => <li key={i}>• {inp}</li>)}
                              </ul>
                            </div>
                          )}
                          {step.outputs.length > 0 && (
                            <div className="bg-slate-50 dark:bg-slate-900/30 rounded-md p-2.5">
                              <h5 className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Outputs</h5>
                              <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-0.5">
                                {step.outputs.map((out, i) => <li key={i}>• {out}</li>)}
                              </ul>
                            </div>
                          )}
                          {step.tools_systems.length > 0 && (
                            <div className="bg-slate-50 dark:bg-slate-900/30 rounded-md p-2.5">
                              <h5 className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Tools / Systems</h5>
                              <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-0.5">
                                {step.tools_systems.map((t, i) => <li key={i}>• {t}</li>)}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Screenshot placeholder */}
                      {step.screenshot_description && (
                        <div className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg p-6 flex flex-col items-center justify-center gap-2 bg-slate-50/50 dark:bg-slate-900/20">
                          <svg className="w-8 h-8 text-slate-400 dark:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          <p className="text-xs text-slate-500 dark:text-slate-400 text-center max-w-md italic">
                            {step.screenshot_description}
                          </p>
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium uppercase tracking-wider">Screenshot Placeholder</span>
                        </div>
                      )}

                      {/* Tips / Tribal Knowledge */}
                      {step.tips_notes.length > 0 && (
                        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-lg p-3">
                          <div className="flex items-center gap-1.5 mb-1.5">
                            <svg className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <h5 className="text-[10px] font-semibold text-amber-700 dark:text-amber-300 uppercase tracking-wider">Tips &amp; Tribal Knowledge</h5>
                          </div>
                          <ul className="text-xs text-amber-800 dark:text-amber-200 space-y-1">
                            {step.tips_notes.map((tip, i) => (
                              <li key={i} className="flex gap-1.5">
                                <span className="text-amber-500 flex-shrink-0">▸</span>
                                {tip}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Exceptions */}
              {section.exceptions.length > 0 && (
                <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/50 rounded-lg p-3 mt-4">
                  <h5 className="text-[10px] font-semibold text-red-700 dark:text-red-300 uppercase tracking-wider mb-1.5">Exception Handling</h5>
                  <ul className="text-xs text-red-800 dark:text-red-200 space-y-1">
                    {section.exceptions.map((exc, i) => (
                      <li key={i} className="flex gap-1.5">
                        <span className="text-red-400 flex-shrink-0">⚠</span>
                        {exc}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      ))}

      {/* Areas of Opportunity */}
      {sop.areas_of_opportunity.length > 0 && (
        <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg p-5">
          <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2 mb-4">
            <span className="w-6 h-6 rounded bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center justify-center">
              {sop.sections.length + 3}
            </span>
            Areas of Opportunity
          </h3>
          <div className="space-y-3">
            {sop.areas_of_opportunity.map((opp, i) => {
              const impactStyle = IMPACT_STYLES[opp.impact] || IMPACT_STYLES.medium;
              return (
                <div key={i} className="border border-slate-200 dark:border-slate-700 rounded-lg p-4">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h4 className="text-sm font-semibold text-slate-800 dark:text-white">{opp.title}</h4>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${impactStyle.bg} ${impactStyle.text}`}>
                        {opp.impact} impact
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-medium">
                        {SOURCE_LABELS[opp.source] || opp.source}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mb-2">{opp.description}</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-50 dark:bg-slate-900/30 rounded-md p-2.5">
                      <h5 className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Current State</h5>
                      <p className="text-xs text-slate-600 dark:text-slate-400">{opp.current_state}</p>
                    </div>
                    <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-md p-2.5">
                      <h5 className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-1">Improvement</h5>
                      <p className="text-xs text-emerald-700 dark:text-emerald-300">{opp.improvement}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Glossary */}
      {sop.glossary.length > 0 && (
        <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg p-5">
          <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2 mb-4">
            <span className="w-6 h-6 rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold flex items-center justify-center">
              {sop.sections.length + 4}
            </span>
            Glossary
          </h3>
          <div className="grid grid-cols-2 gap-x-6 gap-y-2">
            {sop.glossary.map((item, i) => (
              <div key={i} className="flex gap-2 py-1.5 border-b border-slate-100 dark:border-slate-700/50">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 flex-shrink-0">{item.term}:</span>
                <span className="text-xs text-slate-500 dark:text-slate-400">{item.definition}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {error && <p className="text-sm text-red-500 text-center">{error}</p>}
    </div>
  );
}
