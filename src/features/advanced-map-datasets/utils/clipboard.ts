import type {
  AdvancedMapDatasetDraft,
  AdvancedMapDatasetDraftRow,
  AdvancedMapDatasetImportResult,
  AdvancedMapDatasetReferenceRow,
} from '@/features/advanced-map-datasets/types';
import { hasAdvancedMapDatasetPayloadDraftData } from '@/features/advanced-map-datasets/types';
import {
  formatAdvancedMapDatasetJsonValue,
  getAdvancedMapDatasetPayloadTypes,
  getAdvancedMapDatasetRowNumberText,
  parseAdvancedMapDatasetTextImport,
} from '@/features/advanced-map-datasets/utils/draft';

function hasTabularClipboardShape(rawText: string): boolean {
  return /[\t\n\r]/.test(rawText);
}

function looksLikeSirutaPaste(rawText: string, referenceRows: readonly AdvancedMapDatasetReferenceRow[]): boolean {
  const lines = rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line !== '');

  if (lines.length === 0) {
    return false;
  }

  const firstLine = lines[0] ?? '';
  const firstLineCells = firstLine.split(/[\t,;]/).map((cell) => cell.trim().toLowerCase());
  const firstCell = firstLineCells[0] ?? '';
  const secondCell = firstLineCells[1] ?? '';

  const firstCellLooksLikeSirutaHeader = firstCell === 'siruta_code' || firstCell === 'siruta' || firstCell === 'natcode';
  const secondCellLooksLikeValueHeader =
    secondCell === 'value' ||
    secondCell === 'valoare' ||
    secondCell === 'amount' ||
    secondCell === 'text' ||
    secondCell === 'link' ||
    secondCell === 'markdown';

  if (firstCellLooksLikeSirutaHeader && secondCellLooksLikeValueHeader) {
    return true;
  }

  const knownSirutas = new Set(referenceRows.map((row) => row.sirutaCode));
  return lines.every((line, index) => {
    if (index === 0 && firstCellLooksLikeSirutaHeader) {
      return true;
    }
    const [firstCell] = line.split(/[\t,;]/);
    return typeof firstCell === 'string' && knownSirutas.has(firstCell.trim());
  });
}

function escapeTabularCell(value: string): string {
  return value.replace(/\r?\n/g, ' ').replace(/\t/g, ' ').trim();
}

export function serializeAdvancedMapDatasetRowsToClipboardTsv(
  rows: readonly Pick<
    AdvancedMapDatasetDraftRow,
    'sirutaCode' | 'valueNumber' | 'valueJson' | 'rawValue' | 'valueText' | 'value' | 'name' | 'countyName' | 'cui'
  >[]
): string {
  const payloadTypes = getAdvancedMapDatasetPayloadTypes(rows);
  const lines = [[
    'siruta_code',
    'value',
    ...payloadTypes,
    'name',
    'county',
    'cui',
  ].join('\t')];

  for (const row of rows) {
    lines.push(
      [
        escapeTabularCell(row.sirutaCode),
        escapeTabularCell(getAdvancedMapDatasetRowNumberText(row)),
        ...payloadTypes.map((payloadType) =>
          escapeTabularCell(
            row.valueJson?.type === payloadType ? formatAdvancedMapDatasetJsonValue(row.valueJson) : ''
          )
        ),
        escapeTabularCell(row.name),
        escapeTabularCell(row.countyName),
        escapeTabularCell(row.cui),
      ].join('\t')
    );
  }

  return `${lines.join('\n')}\n`;
}

export function tryParseAdvancedMapDatasetTabularPaste(
  rawText: string,
  referenceRows: readonly AdvancedMapDatasetReferenceRow[]
): AdvancedMapDatasetImportResult | null {
  if (!hasTabularClipboardShape(rawText) || !looksLikeSirutaPaste(rawText, referenceRows)) {
    return null;
  }

  const parsed = parseAdvancedMapDatasetTextImport(rawText, [...referenceRows]);
  if (
    parsed.rows.every(
      (row) =>
        getAdvancedMapDatasetRowNumberText(row).trim() === '' && row.valueJson === null
    ) ||
    parsed.issues.length > 0
  ) {
    return null;
  }

  return parsed;
}

export function mergeAdvancedMapDatasetClipboardRowsIntoDraft(
  draft: AdvancedMapDatasetDraft,
  importedRows: readonly AdvancedMapDatasetDraftRow[],
  source: AdvancedMapDatasetDraftRow['source'] = 'paste'
): AdvancedMapDatasetDraft {
  const currentRowsBySirutaCode = new Map(draft.rows.map((row) => [row.sirutaCode, row]));
  const importedRowsBySirutaCode = new Map<string, AdvancedMapDatasetDraftRow>();

  for (const importedRow of importedRows) {
    const valueText = getAdvancedMapDatasetRowNumberText(importedRow);
    if (valueText.trim() === '' && importedRow.valueJson === null) {
      continue;
    }

    importedRowsBySirutaCode.set(importedRow.sirutaCode, {
      ...importedRow,
      source,
      importedFrom: source,
    });
  }

  if (importedRowsBySirutaCode.size === 0) {
    return draft;
  }

  let didChange = false;
  const nextRows: AdvancedMapDatasetDraftRow[] = draft.rows.map((row) => {
    const importedRow = importedRowsBySirutaCode.get(row.sirutaCode);
    if (!importedRow) {
      return row;
    }

    didChange = true;
    const valueText = getAdvancedMapDatasetRowNumberText(importedRow);

    return {
      ...row,
      uatId: importedRow.uatId,
      sirutaCode: importedRow.sirutaCode,
      cui: importedRow.cui,
      name: importedRow.name,
      levelName: importedRow.levelName ?? null,
      countyName: importedRow.countyName,
      countyCode: importedRow.countyCode ?? null,
      isCounty: importedRow.isCounty ?? false,
      valueNumber: valueText,
      valueJson: importedRow.valueJson ?? row.valueJson ?? null,
      payloadDraft: importedRow.payloadDraft ?? row.payloadDraft ?? null,
      value: valueText,
      rawValue: valueText,
      valueText,
      source,
      importedFrom: source,
      isEmpty: valueText.trim() === '' && (importedRow.valueJson ?? row.valueJson ?? null) === null && !hasAdvancedMapDatasetPayloadDraftData(importedRow.payloadDraft ?? row.payloadDraft),
      parsedNumericValue: importedRow.parsedNumericValue ?? null,
      payloadValidationMessage:
        importedRow.payloadValidationMessage !== undefined
          ? importedRow.payloadValidationMessage
          : (row.payloadValidationMessage ?? null),
      validationMessage: importedRow.validationMessage ?? null,
      validationError: importedRow.validationError ?? null,
      reference: importedRow.reference ?? row.reference,
    };
  });

  for (const importedRow of importedRowsBySirutaCode.values()) {
    if (currentRowsBySirutaCode.has(importedRow.sirutaCode)) {
      continue;
    }

    didChange = true;
    const valueText = getAdvancedMapDatasetRowNumberText(importedRow);
    nextRows.push({
      ...importedRow,
      valueNumber: valueText,
      source,
      importedFrom: source,
      value: valueText,
      rawValue: valueText,
      valueText,
      isEmpty: valueText.trim() === '' && (importedRow.valueJson ?? null) === null && !hasAdvancedMapDatasetPayloadDraftData(importedRow.payloadDraft),
      parsedNumericValue: importedRow.parsedNumericValue ?? null,
      payloadValidationMessage:
        importedRow.payloadValidationMessage !== undefined
          ? importedRow.payloadValidationMessage
          : null,
      validationMessage: importedRow.validationMessage ?? null,
      validationError: importedRow.validationError ?? null,
    });
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
