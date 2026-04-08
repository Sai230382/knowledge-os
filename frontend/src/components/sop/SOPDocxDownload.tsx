"use client";
import { useState } from "react";
import { SOPOutput } from "@/lib/types";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  HeadingLevel,
  BorderStyle,
  ShadingType,
  Header,
  Footer,
  PageNumber,
  PageBreak,
  LevelFormat,
  convertInchesToTwip,
} from "docx";
import { saveAs } from "file-saver";

interface SOPDocxDownloadProps {
  sop: SOPOutput;
}

// ─── Constants ───
const INDIGO = "4338CA";
const INDIGO_LIGHT = "E0E7FF";
const AMBER = "D97706";
const AMBER_BG = "FEF3C7";
const EMERALD = "059669";
const SLATE_BG = "F1F5F9";
const BORDER_CLR = "CBD5E1";
const W = 9360; // Content width in DXA (US Letter, 1" margins)

const b1 = (c = BORDER_CLR) => ({ style: BorderStyle.SINGLE, size: 1, color: c });
const borders = (c = BORDER_CLR) => ({ top: b1(c), bottom: b1(c), left: b1(c), right: b1(c) });
const cellM = { top: 60, bottom: 60, left: 100, right: 100 };

function hCell(text: string, w: number) {
  return new TableCell({
    width: { size: w, type: WidthType.DXA },
    borders: borders(INDIGO),
    shading: { type: ShadingType.CLEAR, fill: INDIGO },
    margins: cellM,
    children: [new Paragraph({ children: [new TextRun({ text, bold: true, color: "FFFFFF", size: 20, font: "Arial" })] })],
  });
}
function dCell(text: string, w: number, bold = false) {
  return new TableCell({
    width: { size: w, type: WidthType.DXA },
    borders: borders(),
    margins: cellM,
    children: [new Paragraph({ children: [new TextRun({ text, size: 20, font: "Arial", bold })] })],
  });
}

function buildDocx(sop: SOPOutput): Document {
  const c: (Paragraph | Table)[] = [];

  // ─── COVER PAGE ───
  c.push(
    new Paragraph({ spacing: { after: 800 } }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 100 },
      children: [new TextRun({ text: "Standard Operating Procedure", size: 28, color: "64748B", font: "Arial" })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 },
      children: [new TextRun({ text: sop.sop_title, bold: true, size: 52, color: INDIGO, font: "Arial" })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 100 },
      children: [new TextRun({ text: `SOP Number: ${sop.sop_number}`, size: 24, color: "475569", font: "Arial" })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 400 },
      children: [new TextRun({ text: `SOP Owner: ${sop.sop_owner}`, size: 22, color: "64748B", font: "Arial" })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 100 },
      children: [new TextRun({ text: `Last Attestation Date: ${sop.last_attestation_date}`, size: 20, color: "94A3B8", font: "Arial" })] }),
    new Paragraph({ alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: `Version ${sop.version}`, size: 20, color: "94A3B8", font: "Arial" })] }),
    new Paragraph({ children: [new PageBreak()] }),
  );

  // ─── DOCUMENT HISTORY ───
  c.push(
    new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { after: 200 },
      children: [new TextRun({ text: "Document History", bold: true, color: INDIGO, font: "Arial" })] }),
    new Paragraph({ spacing: { after: 100 },
      children: [new TextRun({ text: "Document Location", bold: true, size: 22, font: "Arial" })] }),
    new Paragraph({ spacing: { after: 200 },
      children: [new TextRun({ text: "This is an on-line document. Refer to the SOP Owner for the location where the latest version is stored or if you are in any doubt about the accuracy of this document.", size: 20, color: "475569", font: "Arial", italics: true })] }),
    new Paragraph({ spacing: { after: 100 },
      children: [new TextRun({ text: "Document Creation", bold: true, size: 22, font: "Arial" })] }),
    new Table({
      width: { size: W, type: WidthType.DXA },
      columnWidths: [3120, 3120, 3120],
      rows: [
        new TableRow({ children: [hCell("Creation Date", 3120), hCell("Document Author", 3120), hCell("Approved by", 3120)] }),
        new TableRow({ children: [dCell(sop.creation_date, 3120), dCell(sop.document_author, 3120), dCell(sop.approved_by, 3120)] }),
      ],
    }),
    new Paragraph({ spacing: { before: 200, after: 100 },
      children: [new TextRun({ text: "Revision History", bold: true, size: 22, font: "Arial" })] }),
    new Table({
      width: { size: W, type: WidthType.DXA },
      columnWidths: [1600, 1300, 3160, 1700, 1600],
      rows: [
        new TableRow({ children: [hCell("Revision Date", 1600), hCell("Version", 1300), hCell("Change Reason", 3160), hCell("Author", 1700), hCell("Approved by", 1600)] }),
        new TableRow({ children: [dCell(sop.creation_date, 1600), dCell(sop.version, 1300), dCell("SOP Creation", 3160), dCell(sop.document_author, 1700), dCell(sop.approved_by, 1600)] }),
      ],
    }),
    new Paragraph({ children: [new PageBreak()] }),
  );

  // ─── OVERVIEW ───
  c.push(
    new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { after: 200 },
      children: [new TextRun({ text: "Overview", bold: true, color: INDIGO, font: "Arial" })] }),
  );

  // Purpose and Scope
  c.push(
    new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { after: 100 },
      children: [new TextRun({ text: "Purpose and Scope", bold: true, font: "Arial" })] }),
    new Paragraph({ spacing: { after: 200 },
      children: [new TextRun({ text: sop.purpose_and_scope, size: 20, color: "475569", font: "Arial" })] }),
  );

  // Definitions / Acronyms
  if (sop.acronyms.length > 0) {
    c.push(
      new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { after: 100 },
        children: [new TextRun({ text: "Definitions", bold: true, font: "Arial" })] }),
      new Paragraph({ spacing: { after: 80 },
        children: [new TextRun({ text: "Acronyms", bold: true, size: 20, font: "Arial" })] }),
      new Table({
        width: { size: W, type: WidthType.DXA },
        columnWidths: [3000, 6360],
        rows: [
          new TableRow({ children: [hCell("Abbreviation", 3000), hCell("Long Form", 6360)] }),
          ...sop.acronyms.map((a) => new TableRow({ children: [dCell(a.abbreviation, 3000, true), dCell(a.long_form, 6360)] })),
        ],
      }),
    );
  }

  // Systems used
  if (sop.systems_used.length > 0) {
    c.push(
      new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 100 },
        children: [new TextRun({ text: "Systems used in this process group", bold: true, font: "Arial" })] }),
    );
    sop.systems_used.forEach((s) => {
      c.push(new Paragraph({ numbering: { reference: "bullets", level: 0 }, spacing: { after: 40 },
        children: [new TextRun({ text: s, size: 20, font: "Arial" })] }));
    });
  }

  // Process Map / Flowchart
  c.push(
    new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 100 },
      children: [new TextRun({ text: "Process Map / Flowchart", bold: true, font: "Arial" })] }),
    new Paragraph({ spacing: { after: 100 },
      children: [new TextRun({ text: sop.process_map_description, size: 20, color: "475569", font: "Arial" })] }),
    new Paragraph({
      alignment: AlignmentType.CENTER, spacing: { before: 100, after: 100 },
      border: { top: { style: BorderStyle.DASHED, size: 2, color: "94A3B8" }, bottom: { style: BorderStyle.DASHED, size: 2, color: "94A3B8" }, left: { style: BorderStyle.DASHED, size: 2, color: "94A3B8" }, right: { style: BorderStyle.DASHED, size: 2, color: "94A3B8" } },
      shading: { type: ShadingType.CLEAR, fill: SLATE_BG },
      children: [new TextRun({ text: "[INSERT PROCESS MAP / FLOWCHART HERE]", bold: true, size: 20, color: "94A3B8", font: "Arial" })],
    }),
  );

  // Roles & Responsibilities
  if (sop.roles_responsibilities.length > 0) {
    c.push(
      new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 100 },
        children: [new TextRun({ text: "Roles and Responsibilities in performing this activity", bold: true, font: "Arial" })] }),
      new Table({
        width: { size: W, type: WidthType.DXA },
        columnWidths: [3000, 6360],
        rows: [
          new TableRow({ children: [hCell("Role", 3000), hCell("Responsibility", 6360)] }),
          ...sop.roles_responsibilities.map((rr) => new TableRow({ children: [dCell(rr.role, 3000, true), dCell(rr.responsibility, 6360)] })),
        ],
      }),
    );
  }

  c.push(new Paragraph({ children: [new PageBreak()] }));

  // ─── PROCESS NARRATIVE ───
  c.push(
    new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { after: 200 },
      children: [new TextRun({ text: "Process Narrative", bold: true, color: INDIGO, font: "Arial" })] }),
  );

  if (sop.process_narrative_intro) {
    c.push(new Paragraph({ spacing: { after: 100 },
      children: [new TextRun({ text: sop.process_narrative_intro, size: 20, color: "475569", font: "Arial" })] }));
  }

  // Upstream / Downstream
  if (sop.upstream_dependencies.length > 0) {
    c.push(new Paragraph({ spacing: { before: 100, after: 40 },
      children: [new TextRun({ text: "Upstream:", bold: true, size: 20, font: "Arial" })] }));
    sop.upstream_dependencies.forEach((d) => {
      c.push(new Paragraph({ numbering: { reference: "bullets", level: 0 }, spacing: { after: 30 },
        children: [new TextRun({ text: d, size: 20, font: "Arial" })] }));
    });
  }
  if (sop.downstream_dependencies.length > 0) {
    c.push(new Paragraph({ spacing: { before: 100, after: 40 },
      children: [new TextRun({ text: "Downstream:", bold: true, size: 20, font: "Arial" })] }));
    sop.downstream_dependencies.forEach((d) => {
      c.push(new Paragraph({ numbering: { reference: "bullets", level: 0 }, spacing: { after: 30 },
        children: [new TextRun({ text: d, size: 20, font: "Arial" })] }));
    });
  }

  // Phases
  sop.phases.forEach((phase) => {
    c.push(
      new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 300, after: 100 },
        children: [new TextRun({ text: `${phase.phase_number}. ${phase.title}`, bold: true, font: "Arial" })] }),
      new Paragraph({ spacing: { after: 60 },
        children: [new TextRun({ text: phase.description, size: 20, color: "475569", font: "Arial" })] }),
      new Paragraph({ spacing: { after: 120 },
        children: [
          new TextRun({ text: "Role performed by: ", bold: true, size: 20, color: "64748B", font: "Arial" }),
          new TextRun({ text: phase.role_performed_by, size: 20, color: "3B82F6", font: "Arial" }),
        ] }),
    );

    // Sub-steps
    phase.sub_steps.forEach((step) => {
      c.push(
        new Paragraph({ spacing: { before: 160, after: 60 },
          children: [
            new TextRun({ text: `${step.step_number}  `, bold: true, size: 22, color: INDIGO, font: "Arial" }),
            new TextRun({ text: step.title, bold: true, size: 22, color: "1E293B", font: "Arial" }),
          ] }),
        new Paragraph({ spacing: { after: 80 }, indent: { left: convertInchesToTwip(0.3) },
          children: [new TextRun({ text: step.description, size: 20, color: "475569", font: "Arial" })] }),
      );

      // Screenshot placeholder
      if (step.screenshot_description) {
        c.push(
          new Paragraph({
            alignment: AlignmentType.CENTER, spacing: { before: 80, after: 40 },
            border: { top: { style: BorderStyle.DASHED, size: 2, color: "94A3B8" }, bottom: { style: BorderStyle.DASHED, size: 2, color: "94A3B8" }, left: { style: BorderStyle.DASHED, size: 2, color: "94A3B8" }, right: { style: BorderStyle.DASHED, size: 2, color: "94A3B8" } },
            shading: { type: ShadingType.CLEAR, fill: SLATE_BG },
            children: [new TextRun({ text: "[SCREENSHOT PLACEHOLDER]", bold: true, size: 20, color: "94A3B8", font: "Arial" })],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER, spacing: { after: 80 },
            border: { top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" }, bottom: { style: BorderStyle.DASHED, size: 2, color: "94A3B8" }, left: { style: BorderStyle.DASHED, size: 2, color: "94A3B8" }, right: { style: BorderStyle.DASHED, size: 2, color: "94A3B8" } },
            shading: { type: ShadingType.CLEAR, fill: SLATE_BG },
            children: [new TextRun({ text: step.screenshot_description, italics: true, size: 18, color: "64748B", font: "Arial" })],
          }),
        );
      }

      // Tips / Tribal Knowledge
      if (step.tips_notes.length > 0) {
        c.push(
          new Paragraph({ spacing: { before: 80, after: 30 },
            shading: { type: ShadingType.CLEAR, fill: AMBER_BG },
            border: { top: { style: BorderStyle.SINGLE, size: 1, color: AMBER }, bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" }, left: { style: BorderStyle.SINGLE, size: 6, color: AMBER }, right: { style: BorderStyle.SINGLE, size: 1, color: AMBER } },
            children: [new TextRun({ text: "Tips & Tribal Knowledge", bold: true, size: 18, color: AMBER, font: "Arial" })],
          }),
        );
        step.tips_notes.forEach((tip, idx) => {
          const isLast = idx === step.tips_notes.length - 1;
          c.push(
            new Paragraph({ spacing: { after: isLast ? 80 : 20 }, indent: { left: convertInchesToTwip(0.2) },
              shading: { type: ShadingType.CLEAR, fill: AMBER_BG },
              border: { top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" }, bottom: isLast ? { style: BorderStyle.SINGLE, size: 1, color: AMBER } : { style: BorderStyle.NONE, size: 0, color: "FFFFFF" }, left: { style: BorderStyle.SINGLE, size: 6, color: AMBER }, right: { style: BorderStyle.SINGLE, size: 1, color: AMBER } },
              children: [new TextRun({ text: `- ${tip}`, size: 18, color: "92400E", font: "Arial" })],
            }),
          );
        });
      }
    });
  });

  // ─── RELATED DOCUMENTS ───
  if (sop.related_documents.length > 0) {
    c.push(
      new Paragraph({ children: [new PageBreak()] }),
      new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { after: 200 },
        children: [new TextRun({ text: "Related Documents", bold: true, color: INDIGO, font: "Arial" })] }),
      new Table({
        width: { size: W, type: WidthType.DXA },
        columnWidths: [3120, 3120, 3120],
        rows: [
          new TableRow({ children: [hCell("Document Title / ID", 3120), hCell("Used For", 3120), hCell("Link / File Path", 3120)] }),
          ...sop.related_documents.map((d) => new TableRow({ children: [dCell(d.title, 3120, true), dCell(d.used_for, 3120), dCell(d.link_path, 3120)] })),
        ],
      }),
    );
  }

  // ─── AREAS OF OPPORTUNITY ───
  if (sop.areas_of_opportunity.length > 0) {
    c.push(
      new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 400, after: 200 },
        children: [new TextRun({ text: "Areas of Opportunity", bold: true, color: EMERALD, font: "Arial" })] }),
    );
    sop.areas_of_opportunity.forEach((opp, i) => {
      const impactColor = opp.impact === "high" ? "DC2626" : opp.impact === "medium" ? AMBER : EMERALD;
      c.push(
        new Paragraph({ spacing: { before: 160, after: 60 },
          children: [
            new TextRun({ text: `${i + 1}. ${opp.title}`, bold: true, size: 22, color: "1E293B", font: "Arial" }),
            new TextRun({ text: `  [${opp.impact.toUpperCase()} IMPACT]`, bold: true, size: 18, color: impactColor, font: "Arial" }),
          ] }),
        new Paragraph({ spacing: { after: 40 },
          children: [new TextRun({ text: opp.description, size: 20, color: "475569", font: "Arial" })] }),
        new Paragraph({ spacing: { after: 30 },
          children: [
            new TextRun({ text: "Current State: ", bold: true, size: 20, color: "64748B", font: "Arial" }),
            new TextRun({ text: opp.current_state, size: 20, color: "475569", font: "Arial" }),
          ] }),
        new Paragraph({ spacing: { after: 100 },
          children: [
            new TextRun({ text: "Improvement: ", bold: true, size: 20, color: EMERALD, font: "Arial" }),
            new TextRun({ text: opp.improvement, size: 20, color: "065F46", font: "Arial" }),
          ] }),
      );
    });
  }

  // ─── SIGN OFF ───
  c.push(
    new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 400, after: 200 },
      children: [new TextRun({ text: "Sign Off", bold: true, color: INDIGO, font: "Arial" })] }),
    new Table({
      width: { size: W, type: WidthType.DXA },
      columnWidths: [1872, 1872, 1872, 1872, 1872],
      rows: [
        new TableRow({ children: [hCell("Last Attestation Date", 1872), hCell("SME Approver", 1872), hCell("Team Manager", 1872), hCell("Ops Manager", 1872), hCell("Approval Status", 1872)] }),
        new TableRow({ children: [dCell("", 1872), dCell("", 1872), dCell("", 1872), dCell("", 1872), dCell("", 1872)] }),
        new TableRow({ children: [dCell("", 1872), dCell("", 1872), dCell("", 1872), dCell("", 1872), dCell("", 1872)] }),
      ],
    }),
  );

  // ─── APPENDIX ───
  if (sop.appendix_items.length > 0) {
    c.push(
      new Paragraph({ children: [new PageBreak()] }),
      new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { after: 200 },
        children: [new TextRun({ text: "Appendix", bold: true, color: INDIGO, font: "Arial" })] }),
    );
    sop.appendix_items.forEach((item) => {
      c.push(
        new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { after: 80 },
          children: [new TextRun({ text: item.title, bold: true, font: "Arial" })] }),
        new Paragraph({ spacing: { after: 120 },
          children: [new TextRun({ text: item.content, size: 20, color: "475569", font: "Arial" })] }),
      );
    });
  }

  // ─── Footer ───
  c.push(
    new Paragraph({ spacing: { before: 400 } }),
    new Paragraph({ alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: "Generated by Contextus - Knowledge OS", size: 18, color: "CBD5E1", italics: true, font: "Arial" })] }),
  );

  return new Document({
    numbering: {
      config: [{
        reference: "bullets",
        levels: [{ level: 0, format: LevelFormat.BULLET, text: "\u2022", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } } }],
      }],
    },
    styles: {
      default: { document: { run: { font: "Arial", size: 22 } } },
      paragraphStyles: [
        { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
          run: { size: 32, bold: true, font: "Arial" },
          paragraph: { spacing: { before: 240, after: 240 }, outlineLevel: 0 } },
        { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
          run: { size: 26, bold: true, font: "Arial" },
          paragraph: { spacing: { before: 180, after: 180 }, outlineLevel: 1 } },
      ],
    },
    sections: [{
      properties: {
        page: {
          size: { width: 12240, height: 15840 },
          margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
        },
      },
      headers: {
        default: new Header({
          children: [new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [
              new TextRun({ text: `${sop.sop_title}  |  ${sop.sop_number}  |  v${sop.version}`, size: 16, color: "94A3B8", font: "Arial" }),
            ],
          })],
        }),
      },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: "Page ", size: 16, color: "94A3B8", font: "Arial" }),
              new TextRun({ children: [PageNumber.CURRENT], size: 16, color: "94A3B8", font: "Arial" }),
            ],
          })],
        }),
      },
      children: c,
    }],
  });
}

export default function SOPDocxDownload({ sop }: SOPDocxDownloadProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleDownload = async () => {
    setIsGenerating(true);
    try {
      const doc = buildDocx(sop);
      const blob = await Packer.toBlob(doc);
      const safeTitle = sop.sop_title
        .replace(/[^a-zA-Z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .toLowerCase()
        .slice(0, 60);
      saveAs(blob, `sop-${safeTitle || "document"}.docx`);
    } catch (err) {
      console.error("Failed to generate DOCX:", err);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <button
      onClick={handleDownload}
      disabled={isGenerating}
      className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-white/90 hover:bg-white disabled:bg-white/50 text-indigo-700 rounded-lg transition-colors font-medium shadow-sm"
    >
      {isGenerating ? (
        <>
          <div className="w-3 h-3 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin" />
          Generating...
        </>
      ) : (
        <>
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Download .docx
        </>
      )}
    </button>
  );
}
