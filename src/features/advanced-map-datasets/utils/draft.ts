import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { generateHash } from '@/lib/utils';
import {
  createAdvancedMapDatasetPayloadDraft,
  type AdvancedMapDatasetJsonItem,
  type AdvancedMapDatasetJsonItemType,
  hasAdvancedMapDatasetPayloadDraftData,
  parseAdvancedMapDatasetNumericValue,
  resolveAdvancedMapDatasetPayloadDraft,
  type AdvancedMapDatasetDraft,
  type AdvancedMapDatasetDraftRow,
  type AdvancedMapDatasetImportIssue,
  type AdvancedMapDatasetImportResult,
  type AdvancedMapDatasetReferenceRow,
  type AdvancedMapDatasetSavePayload,
  type AdvancedMapDatasetVisibility,
} from '@/features/advanced-map-datasets/types';

const HEADER_ALIASES = {
  sirutaCode: ['siruta_code', 'siruta', 'siruta code', 'natcode'],
  cui: ['cui', 'uat_code', 'uat code'],
  name: ['name', 'uat', 'uat_name', 'uat name', 'locality'],
  county: ['county', 'county_name', 'county name', 'judet', 'județ'],
  value: ['value', 'valoare', 'amount'],
  text: ['text'],
  link: ['link'],
  markdown: ['markdown'],
} as const;

const PAYLOAD_TYPE_ORDER: readonly AdvancedMapDatasetJsonItemType[] = ['text', 'link', 'markdown'];

function normalizeHeaderCell(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function normalizeCell(value: unknown): string {
  if (value === undefined || value === null) {
    return '';
  }

  return String(value).trim();
}

function parseNumericValue(rawValue: string): number | null {
  return parseAdvancedMapDatasetNumericValue(rawValue);
}

export function parseDatasetValueText(valueText: string): number | null {
  return parseNumericValue(valueText);
}

export function getAdvancedMapDatasetRowNumberText(
  row: Pick<AdvancedMapDatasetDraftRow, 'valueNumber' | 'rawValue' | 'valueText' | 'value'>
): string {
  if (typeof row.valueNumber === 'string' && row.valueNumber.trim().length > 0) {
    return row.valueNumber;
  }

  if (typeof row.valueText === 'string' && row.valueText.trim().length > 0) {
    return row.valueText;
  }

  if (typeof row.rawValue === 'string' && row.rawValue.trim().length > 0) {
    return row.rawValue;
  }

  if (typeof row.valueNumber === 'string') {
    return row.valueNumber;
  }

  if (typeof row.value === 'string') {
    return row.value;
  }

  if (typeof row.value === 'number' && Number.isFinite(row.value)) {
    return String(row.value);
  }

  return '';
}

export function formatAdvancedMapDatasetJsonValue(
  valueJson: AdvancedMapDatasetJsonItem | null | undefined
): string {
  if (!valueJson) {
    return '';
  }

  if (valueJson.type === 'text') {
    return valueJson.value.text;
  }

  if (valueJson.type === 'markdown') {
    return valueJson.value.markdown;
  }

  const label = valueJson.value.label?.trim() ?? '';
  return label.length > 0 ? `[${label}](${valueJson.value.url})` : valueJson.value.url;
}

export function getAdvancedMapDatasetPayloadTypes(
  rows: readonly Pick<AdvancedMapDatasetDraftRow, 'valueJson'>[]
): AdvancedMapDatasetJsonItemType[] {
  const presentTypes = new Set<AdvancedMapDatasetJsonItemType>();

  for (const row of rows) {
    if (row.valueJson) {
      presentTypes.add(row.valueJson.type);
    }
  }

  return PAYLOAD_TYPE_ORDER.filter((type) => presentTypes.has(type));
}

function findHeaderIndex(headers: string[], aliases: readonly string[]): number {
  return headers.findIndex((header) => aliases.includes(header as (typeof aliases)[number]));
}

function findReferenceRow(
  input: {
    sirutaCode?: string;
    cui?: string;
    name?: string;
  },
  directory: {
    bySirutaCode: Map<string, AdvancedMapDatasetReferenceRow>;
    byCui: Map<string, AdvancedMapDatasetReferenceRow>;
    byName: Map<string, AdvancedMapDatasetReferenceRow>;
  }
): AdvancedMapDatasetReferenceRow | null {
  const sirutaCode = input.sirutaCode?.trim();
  if (sirutaCode !== undefined && sirutaCode !== '') {
    return directory.bySirutaCode.get(sirutaCode) ?? null;
  }

  const cui = input.cui?.trim();
  if (cui !== undefined && cui !== '') {
    return directory.byCui.get(cui) ?? null;
  }

  const name = input.name?.trim().toLowerCase();
  if (name !== undefined && name !== '') {
    return directory.byName.get(name) ?? null;
  }

  return null;
}

function createDraftRow(
  referenceRow: AdvancedMapDatasetReferenceRow,
  rawValue: string,
  valueJson: AdvancedMapDatasetJsonItem | null,
  source: AdvancedMapDatasetDraftRow['source'],
  validationMessage: string | null
): AdvancedMapDatasetDraftRow {
  const parsedNumericValue = parseNumericValue(rawValue);

  return {
    ...referenceRow,
    valueNumber: rawValue,
    valueJson,
    payloadDraft: valueJson ? createAdvancedMapDatasetPayloadDraft(valueJson) : null,
    value: rawValue,
    rawValue,
    valueText: rawValue,
    source,
    importedFrom: source,
    isEmpty: rawValue.trim() === '',
    parsedNumericValue,
    payloadValidationMessage: null,
    validationMessage,
    validationError: validationMessage,
  };
}

function parseGridData(
  matrix: string[][],
  referenceRows: AdvancedMapDatasetReferenceRow[]
): AdvancedMapDatasetImportResult {
  const issues: AdvancedMapDatasetImportIssue[] = [];
  const bySirutaCode = new Map(referenceRows.map((row) => [row.sirutaCode, row]));
  const byCui = new Map(referenceRows.map((row) => [row.cui, row]));
  const byName = new Map(referenceRows.map((row) => [row.name.trim().toLowerCase(), row]));
  const directory = { bySirutaCode, byCui, byName };

  if (matrix.length === 0) {
    const emptyRows = referenceRows.map((row) => createDraftRow(row, '', null, 'import', null));
    return {
      rows: emptyRows,
      draftRows: emptyRows,
      importedCount: 0,
      rejectedCount: 0,
      skippedCount: 0,
      issues,
    };
  }

  const headers = matrix[0]?.map((cell) => normalizeHeaderCell(cell)) ?? [];
  const valueIndex = findHeaderIndex(headers, HEADER_ALIASES.value);
  const sirutaIndex = findHeaderIndex(headers, HEADER_ALIASES.sirutaCode);
  const cuiIndex = findHeaderIndex(headers, HEADER_ALIASES.cui);
  const nameIndex = findHeaderIndex(headers, HEADER_ALIASES.name);
  const textIndex = findHeaderIndex(headers, HEADER_ALIASES.text);
  const linkIndex = findHeaderIndex(headers, HEADER_ALIASES.link);
  const markdownIndex = findHeaderIndex(headers, HEADER_ALIASES.markdown);
  const hasDataColumn = valueIndex >= 0 || textIndex >= 0 || linkIndex >= 0 || markdownIndex >= 0;
  const hasRecognizedHeader = hasDataColumn && (sirutaIndex >= 0 || cuiIndex >= 0 || nameIndex >= 0);
  const bodyRows = hasRecognizedHeader ? matrix.slice(1) : matrix;

  const nextRowsBySirutaCode = new Map(referenceRows.map((row) => [row.sirutaCode, createDraftRow(row, '', null, 'manual', null)]));
  const seenSirutaCodes = new Set<string>();

  bodyRows.forEach((cells, index) => {
    const rowNumber = index + (hasRecognizedHeader ? 2 : 1);
    const normalizedCells = cells.map((cell) => normalizeCell(cell));

    const referenceRow = hasRecognizedHeader
      ? findReferenceRow(
          {
            sirutaCode: sirutaIndex >= 0 ? normalizedCells[sirutaIndex] : undefined,
            cui: cuiIndex >= 0 ? normalizedCells[cuiIndex] : undefined,
            name: nameIndex >= 0 ? normalizedCells[nameIndex] : undefined,
          },
          directory
        )
      : findReferenceRow(
          {
            sirutaCode: normalizedCells[0],
          },
          directory
        );

    if (referenceRow === null) {
      issues.push({
        rowIndex: rowNumber,
        rowNumber,
        message: 'Unknown UAT reference in imported data',
      });
      return;
    }

    if (seenSirutaCodes.has(referenceRow.sirutaCode)) {
      issues.push({
        rowIndex: rowNumber,
        rowNumber,
        message: `Duplicate UAT row for ${referenceRow.name}`,
      });
      return;
    }

    const rawValue = hasRecognizedHeader
      ? normalizedCells[valueIndex] ?? ''
      : normalizedCells[1] ?? '';
    const textPayload = textIndex >= 0 ? normalizedCells[textIndex] ?? '' : '';
    const linkPayload = linkIndex >= 0 ? normalizedCells[linkIndex] ?? '' : '';
    const markdownPayload = markdownIndex >= 0 ? normalizedCells[markdownIndex] ?? '' : '';
    const payloadEntries = [
      textPayload.trim() !== '' ? ({ type: 'text', value: textPayload } as const) : null,
      linkPayload.trim() !== '' ? ({ type: 'link', value: linkPayload } as const) : null,
      markdownPayload.trim() !== '' ? ({ type: 'markdown', value: markdownPayload } as const) : null,
    ].filter(
      (
        entry
      ): entry is { type: AdvancedMapDatasetJsonItemType; value: string } => entry !== null
    );

    if (payloadEntries.length > 1) {
      issues.push({
        rowIndex: rowNumber,
        rowNumber,
        message: 'Only one payload type can be imported per row',
      });
      return;
    }

    const valueJson: AdvancedMapDatasetJsonItem | null =
      payloadEntries[0]?.type === 'text'
        ? {
            type: 'text' as const,
            value: {
              text: payloadEntries[0].value.trim(),
            },
          }
        : payloadEntries[0]?.type === 'markdown'
          ? {
              type: 'markdown' as const,
              value: {
                markdown: payloadEntries[0].value.trim(),
              },
            }
          : payloadEntries[0]?.type === 'link'
            ? (() => {
                const trimmed = payloadEntries[0].value.trim();
                const markdownLinkMatch = /^\[([^\]]+)\]\((https?:\/\/[^)]+)\)$/i.exec(trimmed);
                return markdownLinkMatch
                  ? {
                      type: 'link' as const,
                      value: {
                        url: markdownLinkMatch[2]!.trim(),
                        label: markdownLinkMatch[1]!.trim(),
                      },
                    }
                  : {
                      type: 'link' as const,
                      value: {
                        url: trimmed,
                        label: null,
                      },
                    };
              })()
            : null;
    const parsedNumericValue = parseNumericValue(rawValue);
    const validationMessage =
      rawValue !== '' && parsedNumericValue === null ? 'Only numeric values can be saved.' : null;

    seenSirutaCodes.add(referenceRow.sirutaCode);
    nextRowsBySirutaCode.set(
      referenceRow.sirutaCode,
      createDraftRow(referenceRow, rawValue, valueJson, 'import', validationMessage)
    );
  });

  return {
    rows: Array.from(nextRowsBySirutaCode.values()).sort((left, right) =>
      left.name.localeCompare(right.name)
    ),
    draftRows: Array.from(nextRowsBySirutaCode.values()).sort((left, right) =>
      left.name.localeCompare(right.name)
    ),
    importedCount: Array.from(nextRowsBySirutaCode.values()).filter((row) => {
      return getAdvancedMapDatasetRowNumberText(row).trim().length > 0 || row.valueJson !== null;
    }).length,
    rejectedCount: issues.length,
    skippedCount: 0,
    issues,
  };
}

function parseDelimitedText(rawText: string): string[][] {
  const delimiter = rawText.includes('\t') ? '\t' : '';
  const result = Papa.parse<string[]>(rawText, {
    delimiter,
    skipEmptyLines: 'greedy',
  });

  return result.data.map((row) => row.map((cell) => normalizeCell(cell)));
}

export function parseAdvancedMapDatasetTextImport(
  rawText: string,
  referenceRows: AdvancedMapDatasetReferenceRow[]
): AdvancedMapDatasetImportResult {
  // See docs/specs/specs-202604092015-custom-map-data-series-editor.md:
  // spreadsheet import can fill `value` plus exactly one typed payload column per row.
  return parseGridData(parseDelimitedText(rawText), referenceRows);
}

export async function parseAdvancedMapDatasetFileImport(
  file: File,
  referenceRows: AdvancedMapDatasetReferenceRow[]
): Promise<AdvancedMapDatasetImportResult> {
  if (file.name.toLowerCase().endsWith('.csv') || file.name.toLowerCase().endsWith('.tsv')) {
    return parseAdvancedMapDatasetTextImport(await file.text(), referenceRows);
  }

  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  const firstSheet = firstSheetName ? workbook.Sheets[firstSheetName] : undefined;

  if (firstSheet === undefined) {
    const emptyRows = referenceRows.map((row) => createDraftRow(row, '', null, 'manual', null));
    return {
      rows: emptyRows,
      draftRows: emptyRows,
      importedCount: 0,
      rejectedCount: 1,
      skippedCount: 0,
      issues: [{ rowIndex: 1, rowNumber: 1, message: 'The uploaded workbook has no readable sheet.' }],
    };
  }

  const matrix = XLSX.utils.sheet_to_json<(string | number | null)[]>(firstSheet, {
    header: 1,
    defval: '',
    raw: false,
  }).map((row) => row.map((cell) => normalizeCell(cell)));

  return parseGridData(matrix, referenceRows);
}

export function hydrateAdvancedMapDatasetDraftWithReferenceRows(
  draft: AdvancedMapDatasetDraft,
  referenceRows: readonly AdvancedMapDatasetReferenceRow[]
): AdvancedMapDatasetDraft {
  const referenceRowsBySirutaCode = new Map(referenceRows.map((row) => [row.sirutaCode, row]));
  const existingRowsBySirutaCode = new Map(draft.rows.map((row) => [row.sirutaCode, row]));
  let didChange = false;

  const nextRows = referenceRows.map((referenceRow) => {
    const row = existingRowsBySirutaCode.get(referenceRow.sirutaCode);
    if (!row) {
      didChange = true;
      return createDraftRow(referenceRow, '', null, 'manual', null);
    }

    const matchedReferenceRow = referenceRowsBySirutaCode.get(row.sirutaCode);
    if (!matchedReferenceRow) {
      return row;
    }

    const nextRow: AdvancedMapDatasetDraftRow = {
      ...row,
      uatId: matchedReferenceRow.uatId,
      cui: matchedReferenceRow.cui,
      name: matchedReferenceRow.name,
      levelName: matchedReferenceRow.levelName ?? null,
      countyName: matchedReferenceRow.countyName,
      countyCode: matchedReferenceRow.countyCode ?? null,
      isCounty: matchedReferenceRow.isCounty ?? false,
      reference: {
        uatId: matchedReferenceRow.uatId,
        id: matchedReferenceRow.uatId,
        cui: matchedReferenceRow.cui,
        sirutaCode: matchedReferenceRow.sirutaCode,
        name: matchedReferenceRow.name,
        levelName: matchedReferenceRow.levelName ?? null,
        countyName: matchedReferenceRow.countyName,
        countyCode: matchedReferenceRow.countyCode ?? null,
        isCounty: matchedReferenceRow.isCounty ?? false,
      },
    };

    const hasChanged =
      nextRow.uatId !== row.uatId ||
      nextRow.cui !== row.cui ||
      nextRow.name !== row.name ||
      nextRow.levelName !== row.levelName ||
      nextRow.countyName !== row.countyName ||
      nextRow.countyCode !== row.countyCode ||
      nextRow.isCounty !== row.isCounty ||
      nextRow.reference?.levelName !== row.reference?.levelName;

    if (hasChanged) {
      didChange = true;
      return nextRow;
    }

    return row;
  });

  for (const row of draft.rows) {
    if (referenceRowsBySirutaCode.has(row.sirutaCode)) {
      continue;
    }

    nextRows.push(row);
  }

  if (!didChange) {
    return draft;
  }

  return {
    ...draft,
    rows: nextRows,
    rowsBySirutaCode: Object.fromEntries(nextRows.map((row) => [row.sirutaCode, row])),
  };
}

export function stripEmptyDraftRows(rows: readonly AdvancedMapDatasetDraftRow[]): AdvancedMapDatasetDraftRow[] {
  return rows.filter((row) => {
    const valueNumber = getAdvancedMapDatasetRowNumberText(row).trim();
    return valueNumber !== '' || row.valueJson !== null || hasAdvancedMapDatasetPayloadDraftData(row.payloadDraft);
  });
}

export function serializeAdvancedMapDatasetRowsToCsv(
  rows: readonly AdvancedMapDatasetDraftRow[]
): string {
  // See docs/specs/specs-202604092015-custom-map-data-series-editor.md:
  // export keeps `value` first and uses payload type names as extra columns.
  const payloadTypes = getAdvancedMapDatasetPayloadTypes(rows);
  const header = ['siruta_code', 'value', ...payloadTypes, 'name', 'county', 'cui', 'level'].join(',');
  const lines = [header];

  stripEmptyDraftRows(rows)
    .slice()
    .sort((left, right) => left.sirutaCode.localeCompare(right.sirutaCode))
    .forEach((row) => {
      const value = getAdvancedMapDatasetRowNumberText(row).trim();
      const fields = [
        row.sirutaCode,
        value,
        ...payloadTypes.map((payloadType) =>
          row.valueJson?.type === payloadType ? formatAdvancedMapDatasetJsonValue(row.valueJson) : ''
        ),
        row.name,
        row.countyName,
        row.cui,
        row.levelName ?? '',
      ];
      lines.push(fields.map((f) => escapeCsvField(f)).join(','));
    });

  return `${lines.join('\n')}\n`;
}

function escapeCsvField(value: string): string {
  const str = String(value ?? '');
  if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export interface AdvancedMapDatasetJsonExportRow {
  siruta_code: string;
  value_number: number | null;
  value_json: AdvancedMapDatasetJsonItem | null;
  name: string;
  county: string;
  cui: string;
  level: string | null;
}

export interface AdvancedMapDatasetJsonExport {
  schema_version: 1;
  metadata: {
    title: string;
    description: string | null;
    unit: string | null;
    visibility: AdvancedMapDatasetVisibility;
    exported_at: string;
  };
  rows: AdvancedMapDatasetJsonExportRow[];
}

export function serializeAdvancedMapDatasetToJson(
  draft: AdvancedMapDatasetDraft
): string {
  const exportData: AdvancedMapDatasetJsonExport = {
    schema_version: 1,
    metadata: {
      title: draft.title.trim(),
      description: draft.description.trim() === '' ? null : draft.description.trim(),
      unit: draft.unit.trim() === '' ? null : draft.unit.trim(),
      visibility: draft.visibility,
      exported_at: new Date().toISOString(),
    },
    rows: stripEmptyDraftRows(draft.rows)
      .slice()
      .sort((left, right) => left.sirutaCode.localeCompare(right.sirutaCode))
      .map((row) => {
        const parsedValue = parseDatasetValueText(getAdvancedMapDatasetRowNumberText(row));
        return {
          siruta_code: row.sirutaCode,
          value_number: parsedValue,
          value_json: row.valueJson ?? null,
          name: row.name,
          county: row.countyName,
          cui: row.cui,
          level: row.levelName ?? null,
        };
      }),
  };

  return JSON.stringify(exportData, null, 2);
}

export function createComparableAdvancedMapDatasetDraftHash(draft: AdvancedMapDatasetDraft): string {
  const comparablePayload = {
    title: draft.title.trim(),
    description: draft.description.trim(),
    markdown: draft.markdown.trim(),
    unit: draft.unit.trim(),
    visibility: draft.visibility,
    rows: stripEmptyDraftRows(draft.rows)
      .map((row) => ({
        sirutaCode: row.sirutaCode,
        valueNumber: getAdvancedMapDatasetRowNumberText(row).trim(),
        valueJson: row.valueJson,
        payloadDraft: hasAdvancedMapDatasetPayloadDraftData(row.payloadDraft) ? row.payloadDraft : null,
      }))
      .sort((left, right) => left.sirutaCode.localeCompare(right.sirutaCode)),
  };

  return generateHash(JSON.stringify(comparablePayload));
}

export function createComparableAdvancedMapDatasetRowsHash(
  rows: readonly Pick<
    AdvancedMapDatasetDraftRow,
    'sirutaCode' | 'valueNumber' | 'valueJson' | 'payloadDraft' | 'rawValue' | 'valueText' | 'value'
  >[]
): string {
  const comparableRows = rows
    .filter((row) => {
      const valueNumber = getAdvancedMapDatasetRowNumberText(row).trim();
      return valueNumber !== '' || row.valueJson !== null || hasAdvancedMapDatasetPayloadDraftData(row.payloadDraft);
    })
    .map((row) => ({
      sirutaCode: row.sirutaCode,
      valueNumber: getAdvancedMapDatasetRowNumberText(row).trim(),
      valueJson: row.valueJson,
      payloadDraft: hasAdvancedMapDatasetPayloadDraftData(row.payloadDraft) ? row.payloadDraft : null,
    }))
    .sort((left, right) => left.sirutaCode.localeCompare(right.sirutaCode));

  return generateHash(JSON.stringify(comparableRows));
}

export function validateAdvancedMapDatasetDraftForSave(
  draft: AdvancedMapDatasetDraft
): { ok: true; payload: AdvancedMapDatasetSavePayload } | { ok: false; issues: string[] } {
  // Save/export rules are intentionally split:
  // - datasets persist { valueNumber, valueJson }
  // - grouped-series / map CSV consume only valueNumber
  // - CSV/clipboard export uses payload type names as columns when present
  // See: docs/specs/specs-202604092015-custom-map-data-series-editor.md
  const issues: string[] = [];

  const title = draft.title.trim();
  const unit = draft.unit.trim();
  const nonEmptyRows = stripEmptyDraftRows(draft.rows);

  if (title === '') {
    issues.push('Title is required.');
  }

  if (nonEmptyRows.length === 0) {
    issues.push('At least one row with a numeric value or payload is required.');
  }

  const seenSirutaCodes = new Set<string>();
  for (const row of nonEmptyRows) {
    if (seenSirutaCodes.has(row.sirutaCode)) {
      issues.push(`Duplicate row for ${row.name}.`);
      continue;
    }

    seenSirutaCodes.add(row.sirutaCode);

    if (getAdvancedMapDatasetRowNumberText(row).trim() !== '' && row.parsedNumericValue === null) {
      issues.push(`Row for ${row.name} must contain a numeric value.`);
    }

    const payloadState = resolveAdvancedMapDatasetPayloadDraft(row.payloadDraft, row.valueJson);
    if (payloadState.hasDraftData && payloadState.validationMessage !== null) {
      issues.push(`Row for ${row.name} must contain a valid payload.`);
    }

    if (row.valueJson?.type === 'link' && !/^https?:\/\//i.test(row.valueJson.value.url.trim())) {
      issues.push(`Row for ${row.name} must contain a valid link payload.`);
    }
  }

  if (issues.length > 0) {
    return { ok: false, issues };
  }

  return {
    ok: true,
    payload: {
      title,
      description: draft.description.trim() === '' ? null : draft.description.trim(),
      markdown: draft.markdown.trim() === '' ? null : draft.markdown.trim(),
      unit: unit === '' ? null : unit,
      visibility: draft.visibility,
      csvText: serializeAdvancedMapDatasetRowsToCsv(nonEmptyRows),
      rowsCsv: serializeAdvancedMapDatasetRowsToCsv(nonEmptyRows),
      rows: nonEmptyRows
        .map((row) => ({
          sirutaCode: row.sirutaCode.trim(),
          valueNumber:
            getAdvancedMapDatasetRowNumberText(row).trim() === ''
              ? null
              : getAdvancedMapDatasetRowNumberText(row).trim(),
          valueJson: row.valueJson ?? null,
        }))
        .filter((row) => row.sirutaCode.length > 0 && (row.valueNumber !== null || row.valueJson !== null)),
      rowCount: nonEmptyRows.length,
      hasJsonRows: nonEmptyRows.some((row) => row.valueJson !== null),
    },
  };
}
