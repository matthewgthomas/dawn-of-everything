import fs from "node:fs/promises";
import path from "node:path";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const outputRoot = process.argv[2];
if (!outputRoot) throw new Error("Usage: node build_settlement_workbook.mjs OUTPUT_ROOT");

const dataDir = path.join(outputRoot, "data");
const dataset = JSON.parse(await fs.readFile(path.join(dataDir, "dataset.json"), "utf8"));
const validation = JSON.parse(await fs.readFile(path.join(dataDir, "validation_report.json"), "utf8"));
const exclusionsCsv = await fs.readFile(path.join(dataDir, "scope_exclusions.csv"), "utf8");

const workbook = Workbook.create();
const readMe = workbook.worksheets.add("Read Me");
const settlementsSheet = workbook.worksheets.add("Settlements");
const mentionsSheet = workbook.worksheets.add("Mentions");
const referencesSheet = workbook.worksheets.add("References");
const qaSheet = workbook.worksheets.add("QA");
const dictionarySheet = workbook.worksheets.add("Data Dictionary");
const exclusionsSheet = workbook.worksheets.add("Scope Exclusions");

const NAVY = "#17324D";
const TEAL = "#167D8D";
const AQUA = "#DDF2F3";
const PALE = "#F4F7F9";
const BORDER = "#CBD5E1";
const INK = "#1F2937";
const WHITE = "#FFFFFF";
const GREEN = "#E6F4EA";
const RED = "#FDE8E7";
const AMBER = "#FFF3CD";

function columnLetter(number) {
  let result = "";
  while (number > 0) {
    number -= 1;
    result = String.fromCharCode(65 + (number % 26)) + result;
    number = Math.floor(number / 26);
  }
  return result;
}

function numericValue(key, value) {
  const numericFields = new Set([
    "latitude", "longitude", "entity_resolution_score", "occupation_start_year",
    "occupation_end_year", "mention_paragraph_count", "first_source_line", "last_source_line",
    "source_line_start", "source_line_end", "chapter_number",
  ]);
  if (!numericFields.has(key) || value === "" || value === null || value === undefined) return value ?? "";
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : value;
}

function writeObjectTable(sheet, rows, tableName, widths, numericFormats = {}) {
  if (!rows.length) throw new Error(`${tableName} has no rows`);
  const headers = Object.keys(rows[0]);
  const matrix = [headers, ...rows.map((row) => headers.map((key) => numericValue(key, row[key])))];
  const lastColumn = columnLetter(headers.length);
  const lastRow = matrix.length;
  sheet.getRange(`A1:${lastColumn}${lastRow}`).values = matrix;
  sheet.getRange(`A1:${lastColumn}1`).format = {
    fill: NAVY,
    font: { bold: true, color: WHITE },
    wrapText: true,
    verticalAlignment: "center",
    borders: { preset: "all", style: "thin", color: BORDER },
  };
  sheet.getRange(`A2:${lastColumn}${lastRow}`).format = {
    font: { color: INK },
    verticalAlignment: "top",
    borders: { preset: "all", style: "thin", color: "#E2E8F0" },
  };
  sheet.getRange(`A1:${lastColumn}${lastRow}`).format.wrapText = true;
  sheet.getRange(`A1:${lastColumn}1`).format.rowHeight = 32;
  for (let i = 0; i < headers.length; i += 1) {
    const letter = columnLetter(i + 1);
    sheet.getRange(`${letter}1:${letter}${lastRow}`).format.columnWidth = widths[headers[i]] ?? 18;
    if (numericFormats[headers[i]]) {
      sheet.getRange(`${letter}2:${letter}${lastRow}`).format.numberFormat = numericFormats[headers[i]];
    }
  }
  sheet.freezePanes.freezeRows(1);
  sheet.freezePanes.freezeColumns(2);
  sheet.showGridLines = false;
  const table = sheet.tables.add(`A1:${lastColumn}${lastRow}`, true, tableName);
  table.style = "TableStyleMedium2";
  table.showBandedColumns = false;
  table.showFilterButton = true;
  return { headers, lastColumn, lastRow };
}

const settlementWidths = {
  settlement_id: 12, canonical_name: 27, aliases_in_book: 30, settlement_type: 24,
  latitude: 13, longitude: 13, coordinate_note: 40, coordinate_precision: 22,
  coordinate_source_url: 38, wikidata_id: 14, wikidata_url: 34, wikipedia_url: 38,
  wikidata_description: 40, entity_resolution_score: 15, occupation_start_year: 16,
  occupation_end_year: 16, occupation_interval_display: 25, occupation_qualifier: 18,
  occupation_basis: 24, curation_note: 44, mention_paragraph_count: 15,
  sections_mentioned: 48, first_source_line: 15, last_source_line: 15,
};
const mentionWidths = {
  mention_id: 12, settlement_id: 12, canonical_name: 27, matched_aliases: 30,
  paragraph_id: 13, source_line_start: 15, source_line_end: 15, section: 38,
  section_kind: 18, chapter_number: 15, complete_paragraph_text: 92,
  book_note_ids: 24, book_note_texts: 70, bibliography_keys: 36,
  full_bibliography_entries: 90,
};
const referenceWidths = {
  reference_id: 13, bibliography_key: 28, full_bibliography_entry: 100,
  reference_url: 52, reference_url_kind: 18, linked_book_note_ids: 38,
};

const settlementRegion = writeObjectTable(
  settlementsSheet,
  dataset.settlements,
  "SettlementsTable",
  settlementWidths,
  {
    latitude: "0.000000",
    longitude: "0.000000",
    entity_resolution_score: "0.0",
    occupation_start_year: "0",
    occupation_end_year: "0",
    mention_paragraph_count: "0",
    first_source_line: "0",
    last_source_line: "0",
  },
);
settlementsSheet.getRange(`A2:${settlementRegion.lastColumn}${settlementRegion.lastRow}`).format.rowHeight = 45;

const mentionRegion = writeObjectTable(
  mentionsSheet,
  dataset.mentions,
  "MentionsTable",
  mentionWidths,
  { source_line_start: "0", source_line_end: "0", chapter_number: "0" },
);
mentionsSheet.getRange(`A2:${mentionRegion.lastColumn}${mentionRegion.lastRow}`).format.rowHeight = 75;

const referenceRegion = writeObjectTable(
  referencesSheet,
  dataset.references,
  "ReferencesTable",
  referenceWidths,
);
referencesSheet.getRange(`A2:${referenceRegion.lastColumn}${referenceRegion.lastRow}`).format.rowHeight = 48;

// QA sheet combines the independent audit, build diagnostics, and live workbook formulas.
const qaHeaders = ["source", "check", "status", "observed", "expected", "detail"];
const qaRows = [
  ...validation.checks.map((row) => ["independent validator", row.check, row.status, row.observed, row.expected, row.detail]),
  ...dataset.qa.map((row) => ["dataset build", row.check, row.status.toUpperCase(), row.value, "", ""]),
];
qaSheet.getRange(`A1:F${qaRows.length + 1}`).values = [qaHeaders, ...qaRows];
qaSheet.getRange("A1:F1").format = {
  fill: NAVY, font: { bold: true, color: WHITE }, wrapText: true,
  borders: { preset: "all", style: "thin", color: BORDER },
};
qaSheet.getRange(`A2:F${qaRows.length + 1}`).format = {
  font: { color: INK }, wrapText: true, verticalAlignment: "top",
  borders: { preset: "all", style: "thin", color: "#E2E8F0" },
};
qaSheet.getRange(`A1:F${qaRows.length + 1}`).format.rowHeight = 28;
qaSheet.getRange(`A1:A${qaRows.length + 1}`).format.columnWidth = 20;
qaSheet.getRange(`B1:B${qaRows.length + 1}`).format.columnWidth = 50;
qaSheet.getRange(`C1:C${qaRows.length + 1}`).format.columnWidth = 13;
qaSheet.getRange(`D1:E${qaRows.length + 1}`).format.columnWidth = 24;
qaSheet.getRange(`F1:F${qaRows.length + 1}`).format.columnWidth = 55;
qaSheet.tables.add(`A1:F${qaRows.length + 1}`, true, "QATable").style = "TableStyleMedium2";

const formulaStart = qaRows.length + 4;
qaSheet.getRange(`A${formulaStart}:D${formulaStart}`).values = [["Live workbook assertions", "observed", "expected", "status"]];
qaSheet.getRange(`A${formulaStart}:D${formulaStart}`).format = {
  fill: TEAL, font: { bold: true, color: WHITE },
  borders: { preset: "all", style: "thin", color: BORDER },
};
const formulaLabels = [
  ["Settlement row count"], ["Mention row count"], ["Reference row count"], ["Coordinates present"],
];
qaSheet.getRange(`A${formulaStart + 1}:A${formulaStart + 4}`).values = formulaLabels;
qaSheet.getRange(`B${formulaStart + 1}:B${formulaStart + 4}`).formulas = [
  [`=COUNTA(Settlements!$A$2:$A$${settlementRegion.lastRow})`],
  [`=COUNTA(Mentions!$A$2:$A$${mentionRegion.lastRow})`],
  [`=COUNTA(References!$A$2:$A$${referenceRegion.lastRow})`],
  [`=COUNT(Settlements!$E$2:$E$${settlementRegion.lastRow})`],
];
qaSheet.getRange(`C${formulaStart + 1}:C${formulaStart + 4}`).values = [[
  dataset.settlements.length,
], [
  dataset.mentions.length,
], [
  dataset.references.length,
], [
  dataset.settlements.filter((row) => row.latitude !== "" && row.longitude !== "").length,
]];
qaSheet.getRange(`D${formulaStart + 1}:D${formulaStart + 4}`).formulas = [
  [`=IF(B${formulaStart + 1}=C${formulaStart + 1},"PASS","FAIL")`],
  [`=IF(B${formulaStart + 2}=C${formulaStart + 2},"PASS","FAIL")`],
  [`=IF(B${formulaStart + 3}=C${formulaStart + 3},"PASS","FAIL")`],
  [`=IF(B${formulaStart + 4}=C${formulaStart + 4},"PASS","FAIL")`],
];
qaSheet.getRange(`A${formulaStart + 1}:D${formulaStart + 4}`).format = {
  borders: { preset: "all", style: "thin", color: BORDER },
};
qaSheet.getRange(`A${formulaStart + 1}:A${formulaStart + 4}`).format.columnWidth = 50;
qaSheet.freezePanes.freezeRows(1);
qaSheet.showGridLines = false;

// Read Me provides a compact, formula-backed landing page.
readMe.getRange("A1:H2").merge();
readMe.getRange("A1:H2").values = [["Settlements in The Dawn of Everything"]];
readMe.getRange("A1:H2").format = {
  fill: NAVY, font: { bold: true, color: WHITE, size: 22 },
  horizontalAlignment: "left", verticalAlignment: "center",
};
readMe.getRange("A4:H5").merge();
readMe.getRange("A4:H5").values = [[
  "A curated catalogue of named, real human settlements in the book’s substantive chapters and notes. Each included mention retains the complete source paragraph, note links, and resolved bibliography entries.",
]];
readMe.getRange("A4:H5").format = {
  fill: AQUA, font: { color: INK, italic: true }, wrapText: true,
  verticalAlignment: "center", borders: { preset: "outside", style: "thin", color: BORDER },
};
readMe.getRange("A7:B7").values = [["Live metric", "value"]];
readMe.getRange("A7:B7").format = { fill: TEAL, font: { bold: true, color: WHITE } };
readMe.getRange("A8:A14").values = [
  ["Canonical settlements"], ["Settlement-paragraph mentions"], ["Linked bibliography entries"],
  ["Coordinate coverage"], ["Occupation-start coverage"], ["Independent checks passed"], ["Independent checks failed"],
];
readMe.getRange("B8:B14").formulas = [
  [`=COUNTA(Settlements!$A$2:$A$${settlementRegion.lastRow})`],
  [`=COUNTA(Mentions!$A$2:$A$${mentionRegion.lastRow})`],
  [`=COUNTA(References!$A$2:$A$${referenceRegion.lastRow})`],
  [`=COUNT(Settlements!$E$2:$E$${settlementRegion.lastRow})/COUNTA(Settlements!$A$2:$A$${settlementRegion.lastRow})`],
  [`=COUNT(Settlements!$O$2:$O$${settlementRegion.lastRow})/COUNTA(Settlements!$A$2:$A$${settlementRegion.lastRow})`],
  [`=COUNTIF(QA!$C$2:$C$${validation.checks.length + 1},"PASS")`],
  [`=COUNTIF(QA!$C$2:$C$${validation.checks.length + 1},"FAIL")`],
];
readMe.getRange("B11:B12").format.numberFormat = "0.0%";
readMe.getRange("A7:B14").format.borders = { preset: "all", style: "thin", color: BORDER };

readMe.getRange("D7:H7").merge();
readMe.getRange("D7:H7").values = [["How to use the workbook"]];
readMe.getRange("D7:H7").format = { fill: TEAL, font: { bold: true, color: WHITE } };
readMe.getRange("D8:H14").merge();
readMe.getRange("D8:H14").values = [[
  "Settlements is the canonical place table. Mentions is the evidentiary table: filter by settlement, chapter, line, note ID, or bibliography key and read the full paragraph. References holds every linked bibliography entry. QA reports source-fidelity and relational checks. Data Dictionary defines each field; Scope Exclusions documents boundary cases.",
]];
readMe.getRange("D8:H14").format = {
  fill: PALE, wrapText: true, verticalAlignment: "top",
  borders: { preset: "all", style: "thin", color: BORDER },
};

readMe.getRange("A17:H17").merge();
readMe.getRange("A17:H17").values = [["Conventions and caveats"]];
readMe.getRange("A17:H17").format = { fill: NAVY, font: { bold: true, color: WHITE } };
readMe.getRange("A18:H23").merge();
readMe.getRange("A18:H23").values = [[
  "Negative years mean BCE; positive years mean CE. Dates summarize known habitation and can be approximate or episodic. Coordinates are representative points, not boundaries. Aztlán, Hor-mer, and Onondaga town are intentionally unlocated because no unique defensible point can be assigned. Blank mention references mean the paragraph has no linked book note or no resolvable author–year entry—not that the settlement lacks scholarship. Scope excludes fictional places, countries/regions, natural features, cultures used generically, individual buildings, and unnamed settlements.",
]];
readMe.getRange("A18:H23").format = {
  fill: PALE, wrapText: true, verticalAlignment: "top",
  borders: { preset: "all", style: "thin", color: BORDER },
};
readMe.getRange("A25:H26").merge();
readMe.getRange("A25:H26").values = [[
  `Release: 2026-08-31 · Source: book/The_Dawn_of_Everything.txt · Validation: ${validation.summary.passed}/${validation.summary.checks} independent checks passed`,
]];
readMe.getRange("A25:H26").format = { fill: AQUA, font: { color: NAVY, bold: true }, verticalAlignment: "center" };
readMe.getRange("A1:B26").format.columnWidth = 28;
readMe.getRange("C1:C26").format.columnWidth = 4;
readMe.getRange("D1:H26").format.columnWidth = 18;
readMe.getRange("A4:H5").format.rowHeight = 34;
readMe.getRange("A18:H23").format.rowHeight = 28;
readMe.showGridLines = false;

const descriptions = {
  settlement_id: "Canonical settlement identifier within this dataset release.",
  canonical_name: "Preferred name used for the settlement in this dataset.",
  aliases_in_book: "Alternative spellings or names matched in the book.",
  settlement_type: "Curated functional/type description.",
  latitude: "Representative latitude in decimal degrees (WGS 84).",
  longitude: "Representative longitude in decimal degrees (WGS 84).",
  coordinate_note: "What the coordinate represents or why it is blank.",
  coordinate_precision: "Precision class such as city centroid, site centroid, or approximate historical core.",
  coordinate_source_url: "Source URL for the selected coordinate.",
  wikidata_id: "Resolved Wikidata entity identifier when applicable.",
  wikidata_url: "URL of the resolved Wikidata entity.",
  wikipedia_url: "Resolved English Wikipedia page when available.",
  wikidata_description: "Entity description used during resolution review.",
  entity_resolution_score: "Heuristic match score; 100 identifies a curated entity override.",
  occupation_start_year: "Earliest summarized habitation year; negative means BCE.",
  occupation_end_year: "Latest summarized habitation year; negative means BCE.",
  occupation_interval_display: "Human-readable occupation interval.",
  occupation_qualifier: "Approximation, continuity, or episodic-use qualifier.",
  occupation_basis: "High-level provenance class for the occupation interval.",
  curation_note: "Settlement-specific inclusion, identity, or dating caveat.",
  mention_paragraph_count: "Count of distinct source paragraphs linked to the settlement.",
  sections_mentioned: "Book sections containing at least one linked paragraph.",
  first_source_line: "First source-text line containing a linked mention.",
  last_source_line: "Last source-text line containing a linked mention.",
  mention_id: "Stable identifier for one settlement–paragraph relation.",
  matched_aliases: "Aliases whose literal occurrence linked the paragraph to the settlement.",
  paragraph_id: "Identifier of the normalized source paragraph.",
  source_line_start: "First source line in the full paragraph.",
  source_line_end: "Last source line in the full paragraph.",
  section: "Chapter or notes section containing the paragraph.",
  section_kind: "Chapter-versus-notes classification.",
  chapter_number: "Numeric chapter number where available.",
  complete_paragraph_text: "Complete normalized paragraph containing the settlement mention.",
  book_note_ids: "Book note identifiers attached to the paragraph.",
  book_note_texts: "Complete linked note text.",
  bibliography_keys: "Resolved author–year keys from linked notes.",
  full_bibliography_entries: "Complete book-bibliography entries for resolved keys.",
  reference_id: "Stable identifier for a linked bibliography entry.",
  bibliography_key: "Author–year key used to join a note citation to the bibliography.",
  full_bibliography_entry: "Complete bibliography entry; repeated-author em dashes are expanded.",
  reference_url: "Curated canonical record URL or generated Google Scholar fallback.",
  reference_url_kind: "Link provenance class: DOI, canonical page, repository, catalogue, or Scholar search.",
  linked_book_note_ids: "All settlement-linked book notes that cite the entry.",
};

const dictionaryRows = [];
for (const [sheetName, rows] of [
  ["Settlements", dataset.settlements],
  ["Mentions", dataset.mentions],
  ["References", dataset.references],
]) {
  for (const field of Object.keys(rows[0])) {
    let type = "text";
    if (["latitude", "longitude", "entity_resolution_score"].includes(field)) type = "decimal";
    if (["occupation_start_year", "occupation_end_year", "mention_paragraph_count", "first_source_line", "last_source_line", "source_line_start", "source_line_end", "chapter_number"].includes(field)) type = "integer";
    dictionaryRows.push([sheetName, field, type, descriptions[field] ?? "Curated dataset field."]);
  }
}
dictionarySheet.getRange(`A1:D${dictionaryRows.length + 1}`).values = [
  ["sheet", "field", "type", "definition"],
  ...dictionaryRows,
];
dictionarySheet.getRange("A1:D1").format = { fill: NAVY, font: { bold: true, color: WHITE } };
dictionarySheet.getRange(`A2:D${dictionaryRows.length + 1}`).format = {
  wrapText: true, verticalAlignment: "top",
  borders: { preset: "all", style: "thin", color: "#E2E8F0" },
};
dictionarySheet.getRange(`A1:D${dictionaryRows.length + 1}`).format.rowHeight = 30;
dictionarySheet.getRange(`A1:A${dictionaryRows.length + 1}`).format.columnWidth = 18;
dictionarySheet.getRange(`B1:B${dictionaryRows.length + 1}`).format.columnWidth = 32;
dictionarySheet.getRange(`C1:C${dictionaryRows.length + 1}`).format.columnWidth = 15;
dictionarySheet.getRange(`D1:D${dictionaryRows.length + 1}`).format.columnWidth = 80;
dictionarySheet.tables.add(`A1:D${dictionaryRows.length + 1}`, true, "DataDictionaryTable").style = "TableStyleMedium2";
dictionarySheet.freezePanes.freezeRows(1);
dictionarySheet.showGridLines = false;

// The exclusions table is imported from a deliberately simple CSV with no quoted commas.
const exclusionRows = exclusionsCsv.trim().split(/\r?\n/).map((line) => line.split(","));
exclusionsSheet.getRange(`A1:C${exclusionRows.length}`).values = exclusionRows;
exclusionsSheet.getRange("A1:C1").format = { fill: NAVY, font: { bold: true, color: WHITE } };
exclusionsSheet.getRange(`A2:C${exclusionRows.length}`).format = {
  wrapText: true, verticalAlignment: "top",
  borders: { preset: "all", style: "thin", color: "#E2E8F0" },
};
exclusionsSheet.getRange(`A1:A${exclusionRows.length}`).format.columnWidth = 34;
exclusionsSheet.getRange(`B1:B${exclusionRows.length}`).format.columnWidth = 38;
exclusionsSheet.getRange(`C1:C${exclusionRows.length}`).format.columnWidth = 90;
exclusionsSheet.getRange(`A2:C${exclusionRows.length}`).format.rowHeight = 45;
exclusionsSheet.tables.add(`A1:C${exclusionRows.length}`, true, "ScopeExclusionsTable").style = "TableStyleMedium2";
exclusionsSheet.freezePanes.freezeRows(1);
exclusionsSheet.showGridLines = false;

// Status highlighting kept minimal and semantic.
qaSheet.getRange(`C2:C${qaRows.length + 1}`).conditionalFormats.addCustom("=C2=\"PASS\"", { fill: GREEN, font: { color: "#176B3A", bold: true } });
qaSheet.getRange(`C2:C${qaRows.length + 1}`).conditionalFormats.addCustom("=C2=\"FAIL\"", { fill: RED, font: { color: "#9B1C1C", bold: true } });
qaSheet.getRange(`C2:C${qaRows.length + 1}`).conditionalFormats.addCustom("=C2=\"REVIEW\"", { fill: AMBER, font: { color: "#7A4E00", bold: true } });

await fs.mkdir(outputRoot, { recursive: true });
const outputPath = path.join(outputRoot, "dawn_of_everything_settlements.xlsx");
const xlsx = await SpreadsheetFile.exportXlsx(workbook);
await xlsx.save(outputPath);

const previewDir = path.join(outputRoot, "previews");
await fs.mkdir(previewDir, { recursive: true });
const previewRanges = {
  "Read Me": "A1:H26",
  "Settlements": "A1:L16",
  "Mentions": "A1:O10",
  "References": "A1:D14",
  "QA": `A1:F${formulaStart + 4}`,
  "Data Dictionary": `A1:D${Math.min(dictionaryRows.length + 1, 48)}`,
  "Scope Exclusions": `A1:C${exclusionRows.length}`,
};
for (const [sheetName, range] of Object.entries(previewRanges)) {
  const preview = await workbook.render({ sheetName, range, scale: 1, format: "png" });
  const safeName = sheetName.toLowerCase().replaceAll(" ", "_");
  await fs.writeFile(path.join(previewDir, `${safeName}.png`), new Uint8Array(await preview.arrayBuffer()));
}

const inspection = await workbook.inspect({
  kind: "workbook,sheet,table,formula",
  maxChars: 10000,
  tableMaxRows: 4,
  tableMaxCols: 8,
  tableMaxCellChars: 80,
});
await fs.writeFile(path.join(outputRoot, "workbook_inspection.txt"), inspection.ndjson ?? String(inspection), "utf8");

const formulaErrorScan = await workbook.inspect({
  kind: "match",
  searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A",
  options: { useRegex: true, maxResults: 300 },
  summary: "final formula error scan",
});
await fs.writeFile(path.join(outputRoot, "formula_error_scan.txt"), formulaErrorScan.ndjson ?? String(formulaErrorScan), "utf8");

console.log(JSON.stringify({
  outputPath,
  sheets: 7,
  settlements: dataset.settlements.length,
  mentions: dataset.mentions.length,
  references: dataset.references.length,
  validationPassed: validation.summary.passed,
}, null, 2));
