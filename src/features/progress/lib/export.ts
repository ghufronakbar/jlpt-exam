import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import { autoTable } from "jspdf-autotable";
import { MONDAI_TYPE_TRANSLATIONS } from "@/constants/jlpt";
import { SCORING_SECTION_TRANSLATIONS } from "@/lib/jlpt-score";
import { SECTION_COLUMNS, type ProgressLevelView } from "../components/progress-tabs";

// Header/row shape is shared by both export formats so the exported file
// always matches exactly what the table on screen shows. Labels here are
// Indonesian-only (not the bilingual Japanese+Indonesian used on-screen) —
// jsPDF's built-in fonts (Helvetica/Times/Courier) only cover WinAnsi/Latin-1,
// so any Japanese character renders as mojibake, not just missing. Excel has
// no such limitation, but it's kept Indonesian-only too so both exports stay
// label-consistent with each other.
function buildHeaderRow(view: ProgressLevelView): string[] {
  return [
    "Paket",
    "Tanggal",
    ...view.mondaiColumns.map(
      (column) => `${MONDAI_TYPE_TRANSLATIONS[column.mondaiType]} (%)`,
    ),
    ...SECTION_COLUMNS.map((column) => `${SCORING_SECTION_TRANSLATIONS[column.key]} Skor`),
    ...SECTION_COLUMNS.map((column) => `${SCORING_SECTION_TRANSLATIONS[column.key]} Skor (%)`),
    ...SECTION_COLUMNS.map((column) => `${SCORING_SECTION_TRANSLATIONS[column.key]} Berbobot`),
    "Total Skor",
    "Total (%)",
    "Total Berbobot",
  ];
}

function buildDataRows(view: ProgressLevelView): (string | number)[][] {
  return view.rows.map((row) => [
    row.packageName,
    row.dateLabel,
    ...view.mondaiColumns.map((column) => row.mondaiAccuracy[column.mondaiType] ?? ""),
    ...SECTION_COLUMNS.map((column) => row.sections[column.key]?.plainScore ?? ""),
    ...SECTION_COLUMNS.map((column) => row.sections[column.key]?.accuracy ?? ""),
    ...SECTION_COLUMNS.map((column) => row.sections[column.key]?.weightedScore ?? ""),
    row.totalPlain,
    row.totalAccuracy,
    row.totalWeighted,
  ]);
}

export function exportProgressToExcel(view: ProgressLevelView) {
  const worksheet = XLSX.utils.aoa_to_sheet([buildHeaderRow(view), ...buildDataRows(view)]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, view.level);
  XLSX.writeFile(workbook, `progress-${view.level}.xlsx`);
}

// Package names carry kanji (e.g. "JLPT N2 - 2018年12月"), which jsPDF also
// can't render — strip anything outside Latin-1 rather than leaking mojibake.
function toPdfSafeText(value: string | number): string | number {
  if (typeof value !== "string") return value;
  return value
    .replace(/[^\x00-\xFF]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function exportProgressToPdf(view: ProgressLevelView) {
  const doc = new jsPDF({ orientation: "landscape" });
  doc.text(`Progress - ${view.level}`, 14, 12);
  autoTable(doc, {
    head: [buildHeaderRow(view)],
    body: buildDataRows(view).map((row) => row.map((cell) => String(toPdfSafeText(cell)))),
    startY: 18,
    styles: { fontSize: 7 },
    headStyles: { fillColor: [40, 40, 40] },
  });
  doc.save(`progress-${view.level}.pdf`);
}
