"use client";
import { useState } from "react";
import { pdf } from "@react-pdf/renderer";
import { SynthesisOutput, AnalysisOutput } from "@/lib/types";
import KnowledgeBriefPDF from "./KnowledgeBriefPDF";

interface Props {
  synthesis: SynthesisOutput;
  analysis: AnalysisOutput;
}

export default function PDFDownloadButton({ synthesis, analysis }: Props) {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleDownload = async () => {
    setIsGenerating(true);
    try {
      const blob = await pdf(
        <KnowledgeBriefPDF synthesis={synthesis} analysis={analysis} />
      ).toBlob();

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const safeTitle = synthesis.title
        .replace(/[^a-z0-9]/gi, "-")
        .toLowerCase()
        .slice(0, 50);
      a.href = url;
      a.download = `knowledge-brief-${safeTitle}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("PDF generation failed:", err);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <button
      onClick={handleDownload}
      disabled={isGenerating}
      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white rounded-lg transition-colors shadow-sm"
    >
      {isGenerating ? (
        <>
          <svg
            className="w-3.5 h-3.5 animate-spin"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v8H4z"
            />
          </svg>
          Generating…
        </>
      ) : (
        <>
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
            />
          </svg>
          Download PDF
        </>
      )}
    </button>
  );
}
