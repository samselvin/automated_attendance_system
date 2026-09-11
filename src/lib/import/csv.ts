import { parse } from "csv-parse/sync";

export interface ParsedCsv {
  headers: string[];
  rows: Record<string, string>[];
}

/** Parses CSV text with a header row into header-keyed row objects. */
export function parseCsvText(csvText: string): ParsedCsv {
  const records: string[][] = parse(csvText, {
    skip_empty_lines: true,
    trim: true,
    bom: true,
  });

  if (records.length === 0) {
    return { headers: [], rows: [] };
  }

  const [headerRow, ...dataRows] = records;
  const headers = headerRow.map((h) => h.trim());

  const rows = dataRows.map((record) => {
    const row: Record<string, string> = {};
    headers.forEach((header, i) => {
      row[header] = (record[i] ?? "").trim();
    });
    return row;
  });

  return { headers, rows };
}

/** Applies a { targetField: sourceHeader } mapping to one parsed row. */
export function applyColumnMapping(
  row: Record<string, string>,
  mapping: Record<string, string>
): Record<string, string> {
  const mapped: Record<string, string> = {};
  for (const [targetField, sourceHeader] of Object.entries(mapping)) {
    mapped[targetField] = row[sourceHeader] ?? "";
  }
  return mapped;
}
