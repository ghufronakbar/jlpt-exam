import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import { autoTable } from "jspdf-autotable";
import { SECTION_COLUMNS, type ProgressLevelView } from "../components/progress-tabs";

// Header/row shape is shared by both export formats so the exported file
// always matches exactly what the table on screen shows.
function buildHeaderRow(view: ProgressLevelView): string[] {
  return [
    "Paket",
    "Tanggal",
    ...view.mondaiColumns.map((column) => `${column.label} (%)`),
    ...SECTION_COLUMNS.map((column) => `${column.label} Skor`),
    ...SECTION_COLUMNS.map((column) => `${column.label} Skor (%)`),
    ...SECTION_COLUMNS.map((column) => `${column.label} Berbobot`),
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

export function exportProgressToPdf(view: ProgressLevelView) {
  const doc = new jsPDF({ orientation: "landscape" });
  doc.text(`Progress — ${view.level}`, 14, 12);
  autoTable(doc, {
    head: [buildHeaderRow(view)],
    body: buildDataRows(view).map((row) => row.map(String)),
    startY: 18,
    styles: { fontSize: 7 },
    headStyles: { fillColor: [40, 40, 40] },
  });
  doc.save(`progress-${view.level}.pdf`);
}
