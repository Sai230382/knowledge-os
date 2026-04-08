"use client";
import { useState } from "react";
import { AnalysisOutput, SOPOutput, ProcessFlow } from "@/lib/types";
import { generateSOP, generateProcessFlows } from "@/lib/api";
import dynamic from "next/dynamic";

const SOPDocxDownload = dynamic(() => import("@/components/sop/SOPDocxDownload"), {
  ssr: false,
  loading: () => (
    <button disabled className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-slate-100 dark:bg-slate-800 text-slate-400 rounded-lg">
      Loading...
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
  const [expandedPhases, setExpandedPhases] = useState<Set<number>>(new Set());

  const handleGenerate = async () => {
    setIsLoading(true);
    setError("");
    try {
      let processFlows: ProcessFlow[] | undefined;
      try {
        processFlows = await generateProcessFlows(analysis);
      } catch {
        // Process flows are optional
      }
      const result = await generateSOP(analysis, processFlows);
      setSop(result);
      // Expand all phases by default
      const allPhases = new Set(result.phases.map((p) => p.phase_number));
      setExpandedPhases(allPhases);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate SOP");
    } finally {
      setIsLoading(false);
    }
  };

  const togglePhase = (num: number) => {
    setExpandedPhases((prev) => {
      const next = new Set(prev);
      if (next.has(num)) next.delete(num);
      else next.add(num);
      return next;
    });
  };

  // ─── Loading State ───
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <div className="w-10 h-10 border-4 border-indigo-200 dark:border-indigo-800 border-t-indigo-600 dark:border-t-indigo-400 rounded-full animate-spin" />
        <p className="text-sm text-slate-500 dark:text-slate-400">Generating Standard Operating Procedure...</p>
        <p className="text-xs text-slate-400 dark:text-slate-500">Structuring processes, capturing tribal knowledge, and identifying opportunities</p>
      </div>
    );
  }

  // ─── Empty State ───
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
            Generate a professional SOP document following the corporate template format. Includes process narrative with phases, screenshot placeholders, tribal knowledge, and areas of opportunity. Download as Word (.docx).
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
      {/* ── Cover Header ── */}
      <div className="bg-gradient-to-r from-indigo-600 to-indigo-800 dark:from-indigo-700 dark:to-indigo-900 rounded-lg p-6 text-white">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-indigo-200 text-xs font-medium uppercase tracking-wider">Standard Operating Procedure</p>
            <h2 className="text-xl font-bold">{sop.sop_title}</h2>
            <div className="flex items-center gap-4 text-xs text-indigo-200">
              <span>SOP #: {sop.sop_number}</span>
              <span>Version {sop.version}</span>
              <span>Owner: {sop.sop_owner}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <SOPDocxDownload sop={sop} />
            <button
              onClick={handleGenerate}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Regenerate
            </button>
          </div>
        </div>
      </div>

      {/* ── Document History ── */}
      <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg p-5">
        <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-3">Document History</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-3 italic">This is an on-line document. Refer to the SOP Owner for the location where the latest version is stored.</p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-indigo-50 dark:bg-indigo-900/30">
                <th className="text-left py-2 px-3 font-semibold text-indigo-700 dark:text-indigo-300">Creation Date</th>
                <th className="text-left py-2 px-3 font-semibold text-indigo-700 dark:text-indigo-300">Document Author</th>
                <th className="text-left py-2 px-3 font-semibold text-indigo-700 dark:text-indigo-300">Approved by</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-slate-100 dark:border-slate-700/50">
                <td className="py-2 px-3 text-slate-600 dark:text-slate-400">{sop.creation_date}</td>
                <td className="py-2 px-3 text-slate-600 dark:text-slate-400">{sop.document_author}</td>
                <td className="py-2 px-3 text-slate-600 dark:text-slate-400">{sop.approved_by}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Table of Contents ── */}
      <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
        <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">Table of Contents</h3>
        <div className="space-y-1 text-sm">
          <p className="text-slate-600 dark:text-slate-300 font-medium">Overview</p>
          <p className="text-slate-500 dark:text-slate-400 pl-4">Purpose and Scope</p>
          <p className="text-slate-500 dark:text-slate-400 pl-4">Definitions</p>
          <p className="text-slate-500 dark:text-slate-400 pl-4">Systems used in this process group</p>
          <p className="text-slate-500 dark:text-slate-400 pl-4">Process Map / Flowchart</p>
          <p className="text-slate-500 dark:text-slate-400 pl-4">Roles and Responsibilities</p>
          <p className="text-slate-600 dark:text-slate-300 font-medium mt-1">Process Narrative</p>
          {sop.phases.map((p) => (
            <p key={p.phase_number} className="text-slate-500 dark:text-slate-400 pl-4">
              {p.phase_number}. {p.title}
            </p>
          ))}
          <p className="text-slate-600 dark:text-slate-300 font-medium mt-1">Related Documents</p>
          <p className="text-slate-600 dark:text-slate-300 font-medium">Areas of Opportunity</p>
          <p className="text-slate-600 dark:text-slate-300 font-medium">Sign Off</p>
          {sop.appendix_items.length > 0 && (
            <p className="text-slate-600 dark:text-slate-300 font-medium">Appendix</p>
          )}
        </div>
      </div>

      {/* ── OVERVIEW Section ── */}
      <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg p-5 space-y-5">
        <h3 className="text-base font-bold text-indigo-700 dark:text-indigo-400 border-b border-indigo-200 dark:border-indigo-800 pb-2">Overview</h3>

        {/* Purpose and Scope */}
        <div>
          <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1">Purpose and Scope</h4>
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{sop.purpose_and_scope}</p>
        </div>

        {/* Definitions / Acronyms */}
        {sop.acronyms.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">Definitions</h4>
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/30">
                  <th className="text-left py-1.5 px-3 font-semibold text-slate-500 dark:text-slate-400 w-1/3">Abbreviation</th>
                  <th className="text-left py-1.5 px-3 font-semibold text-slate-500 dark:text-slate-400">Long Form</th>
                </tr>
              </thead>
              <tbody>
                {sop.acronyms.map((a, i) => (
                  <tr key={i} className="border-b border-slate-100 dark:border-slate-700/50">
                    <td className="py-1.5 px-3 font-medium text-slate-700 dark:text-slate-300">{a.abbreviation}</td>
                    <td className="py-1.5 px-3 text-slate-600 dark:text-slate-400">{a.long_form}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Systems used */}
        {sop.systems_used.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1">Systems used in this process group</h4>
            <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-0.5 list-disc list-inside">
              {sop.systems_used.map((s, i) => <li key={i}>{s}</li>)}
            </ul>
          </div>
        )}

        {/* Process Map / Flowchart */}
        <div>
          <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1">Process Map / Flowchart</h4>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">{sop.process_map_description}</p>
          <div className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg p-8 flex flex-col items-center justify-center gap-2 bg-slate-50/50 dark:bg-slate-900/20">
            <svg className="w-10 h-10 text-slate-400 dark:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7" />
            </svg>
            <p className="text-xs text-slate-500 dark:text-slate-400 text-center italic">Insert process map / flowchart here. Use the Process Flow tab to generate and export the visual diagram.</p>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium uppercase tracking-wider">Process Map Placeholder</span>
          </div>
        </div>

        {/* Roles and Responsibilities */}
        {sop.roles_responsibilities.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">Roles and Responsibilities in performing this activity</h4>
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-indigo-50 dark:bg-indigo-900/30">
                  <th className="text-left py-2 px-3 font-semibold text-indigo-700 dark:text-indigo-300 w-1/3">Role</th>
                  <th className="text-left py-2 px-3 font-semibold text-indigo-700 dark:text-indigo-300">Responsibility</th>
                </tr>
              </thead>
              <tbody>
                {sop.roles_responsibilities.map((rr, i) => (
                  <tr key={i} className="border-b border-slate-100 dark:border-slate-700/50">
                    <td className="py-2 px-3 font-medium text-slate-700 dark:text-slate-200">{rr.role}</td>
                    <td className="py-2 px-3 text-slate-600 dark:text-slate-400">{rr.responsibility}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── PROCESS NARRATIVE ── */}
      <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
        <div className="p-5 border-b border-slate-200 dark:border-slate-700">
          <h3 className="text-base font-bold text-indigo-700 dark:text-indigo-400">Process Narrative</h3>
          {sop.process_narrative_intro && (
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">{sop.process_narrative_intro}</p>
          )}

          {/* Upstream / Downstream */}
          {(sop.upstream_dependencies.length > 0 || sop.downstream_dependencies.length > 0) && (
            <div className="mt-3 grid grid-cols-2 gap-4">
              {sop.upstream_dependencies.length > 0 && (
                <div className="bg-blue-50 dark:bg-blue-950/20 rounded-md p-3">
                  <h5 className="text-[10px] font-semibold text-blue-700 dark:text-blue-300 uppercase tracking-wider mb-1">Upstream Dependencies</h5>
                  <ul className="text-xs text-blue-800 dark:text-blue-200 space-y-0.5">
                    {sop.upstream_dependencies.map((d, i) => <li key={i}>- {d}</li>)}
                  </ul>
                </div>
              )}
              {sop.downstream_dependencies.length > 0 && (
                <div className="bg-purple-50 dark:bg-purple-950/20 rounded-md p-3">
                  <h5 className="text-[10px] font-semibold text-purple-700 dark:text-purple-300 uppercase tracking-wider mb-1">Downstream Dependencies</h5>
                  <ul className="text-xs text-purple-800 dark:text-purple-200 space-y-0.5">
                    {sop.downstream_dependencies.map((d, i) => <li key={i}>- {d}</li>)}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Phases */}
        {sop.phases.map((phase) => (
          <div key={phase.phase_number} className="border-b border-slate-200 dark:border-slate-700 last:border-b-0">
            {/* Phase header — collapsible */}
            <button
              onClick={() => togglePhase(phase.phase_number)}
              className="w-full flex items-center justify-between p-5 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="w-7 h-7 rounded-full bg-indigo-600 dark:bg-indigo-500 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                  {phase.phase_number}
                </span>
                <div className="text-left">
                  <h4 className="text-sm font-bold text-slate-800 dark:text-white">{phase.title}</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Role performed by: <span className="text-blue-600 dark:text-blue-400 font-medium">{phase.role_performed_by}</span>
                  </p>
                </div>
              </div>
              <svg
                className={`w-4 h-4 text-slate-400 transition-transform ${expandedPhases.has(phase.phase_number) ? "rotate-180" : ""}`}
                fill="none" stroke="currentColor" viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {expandedPhases.has(phase.phase_number) && (
              <div className="px-5 pb-5 space-y-4">
                {phase.description && (
                  <p className="text-sm text-slate-600 dark:text-slate-400">{phase.description}</p>
                )}

                {/* Sub-steps */}
                {phase.sub_steps.map((step) => (
                  <div key={step.step_number} className="pl-6 border-l-2 border-indigo-200 dark:border-indigo-800 space-y-3">
                    {/* Step header */}
                    <div>
                      <h5 className="text-sm font-semibold text-slate-800 dark:text-white">
                        <span className="text-indigo-600 dark:text-indigo-400 mr-1.5">{step.step_number}</span>
                        {step.title}
                      </h5>
                    </div>

                    {/* Description */}
                    <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{step.description}</p>

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
                              <span className="text-amber-500 flex-shrink-0">-</span>
                              {tip}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ── Related Documents ── */}
      {sop.related_documents.length > 0 && (
        <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg p-5">
          <h3 className="text-base font-bold text-indigo-700 dark:text-indigo-400 border-b border-indigo-200 dark:border-indigo-800 pb-2 mb-3">Related Documents</h3>
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/30">
                <th className="text-left py-2 px-3 font-semibold text-slate-500 dark:text-slate-400">Document Title / ID</th>
                <th className="text-left py-2 px-3 font-semibold text-slate-500 dark:text-slate-400">Used For</th>
                <th className="text-left py-2 px-3 font-semibold text-slate-500 dark:text-slate-400">Link / File Path</th>
              </tr>
            </thead>
            <tbody>
              {sop.related_documents.map((doc, i) => (
                <tr key={i} className="border-b border-slate-100 dark:border-slate-700/50">
                  <td className="py-2 px-3 font-medium text-slate-700 dark:text-slate-200">{doc.title}</td>
                  <td className="py-2 px-3 text-slate-600 dark:text-slate-400">{doc.used_for}</td>
                  <td className="py-2 px-3 text-slate-500 dark:text-slate-400 italic">{doc.link_path}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Areas of Opportunity ── */}
      {sop.areas_of_opportunity.length > 0 && (
        <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg p-5">
          <h3 className="text-base font-bold text-emerald-700 dark:text-emerald-400 border-b border-emerald-200 dark:border-emerald-800 pb-2 mb-4">Areas of Opportunity</h3>
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

      {/* ── Sign Off ── */}
      <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg p-5">
        <h3 className="text-base font-bold text-indigo-700 dark:text-indigo-400 border-b border-indigo-200 dark:border-indigo-800 pb-2 mb-3">Sign Off</h3>
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-indigo-50 dark:bg-indigo-900/30">
              <th className="text-left py-2 px-3 font-semibold text-indigo-700 dark:text-indigo-300">Last Attestation Date</th>
              <th className="text-left py-2 px-3 font-semibold text-indigo-700 dark:text-indigo-300">SME Approver</th>
              <th className="text-left py-2 px-3 font-semibold text-indigo-700 dark:text-indigo-300">Team Manager</th>
              <th className="text-left py-2 px-3 font-semibold text-indigo-700 dark:text-indigo-300">Ops Manager</th>
              <th className="text-left py-2 px-3 font-semibold text-indigo-700 dark:text-indigo-300">Status</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-slate-100 dark:border-slate-700/50">
              <td className="py-3 px-3 text-slate-400 dark:text-slate-500 italic" colSpan={5}>Pending approval signatures</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ── Appendix ── */}
      {sop.appendix_items.length > 0 && (
        <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg p-5">
          <h3 className="text-base font-bold text-indigo-700 dark:text-indigo-400 border-b border-indigo-200 dark:border-indigo-800 pb-2 mb-3">Appendix</h3>
          {sop.appendix_items.map((item, i) => (
            <div key={i} className="mb-3">
              <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1">{item.title}</h4>
              <p className="text-xs text-slate-600 dark:text-slate-400">{item.content}</p>
            </div>
          ))}
        </div>
      )}

      {error && <p className="text-sm text-red-500 text-center">{error}</p>}
    </div>
  );
}
