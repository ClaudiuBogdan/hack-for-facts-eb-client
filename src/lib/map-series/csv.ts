import Papa from 'papaparse';
import type {
  GroupedSeriesRow,
  MapSeriesVectorCache,
  MapSeriesWarning,
} from '@/lib/map-series/interfaces';

interface ParsedWideCsvResult {
  seriesIds: string[];
  valuesBySeriesId: MapSeriesVectorCache;
  warnings: MapSeriesWarning[];
}

export function parseGroupedSeriesWideCsv(
  csvRaw: string,
  expectedSeriesIds?: readonly string[]
): ParsedWideCsvResult {
  const warnings: MapSeriesWarning[] = [];

  const parsed = Papa.parse<Record<string, string>>(csvRaw, {
    header: true,
    delimiter: ',',
    skipEmptyLines: 'greedy',
    dynamicTyping: false,
  });

  if (parsed.errors.length > 0) {
    for (const error of parsed.errors) {
      warnings.push({
        type: 'invalid_row',
        message: `CSV parse error at row ${error.row ?? '-'}: ${error.message}`,
        details: {
          code: error.code,
          row: error.row,
        },
      });
    }
  }

  const fields = parsed.meta.fields ?? [];
  if (!fields.includes('siruta_code')) {
    warnings.push({
      type: 'invalid_row',
      message: 'Missing required siruta_code CSV header',
    });

    return {
      seriesIds: [],
      valuesBySeriesId: new Map(),
      warnings,
    };
  }

  const discoveredSeriesIds = fields.filter((field) => field !== 'siruta_code');
  const normalizedExpectedSeriesIds = expectedSeriesIds
    ? [...new Set(expectedSeriesIds.filter((seriesId) => seriesId.trim().length > 0))]
    : undefined;
  const expectedSeriesIdSet = normalizedExpectedSeriesIds
    ? new Set(normalizedExpectedSeriesIds)
    : undefined;
  const seriesIds = normalizedExpectedSeriesIds ?? discoveredSeriesIds;

  if (expectedSeriesIdSet) {
    for (const discoveredSeriesId of discoveredSeriesIds) {
      if (expectedSeriesIdSet.has(discoveredSeriesId)) {
        continue;
      }
      warnings.push({
        type: 'invalid_row',
        message: `Ignored unexpected CSV series column: ${discoveredSeriesId}`,
        seriesId: discoveredSeriesId,
      });
    }

    for (const expectedSeriesId of normalizedExpectedSeriesIds ?? []) {
      if (discoveredSeriesIds.includes(expectedSeriesId)) {
        continue;
      }
      warnings.push({
        type: 'invalid_row',
        message: `Expected CSV series column is missing: ${expectedSeriesId}`,
        seriesId: expectedSeriesId,
      });
    }
  }

  const valuesBySeriesId: MapSeriesVectorCache = new Map();

  for (const seriesId of seriesIds) {
    valuesBySeriesId.set(seriesId, new Map());
  }

  const seenSirutaCodes = new Set<string>();

  for (const [index, row] of (parsed.data ?? []).entries()) {
    const rowIndex = index + 2;
    const sirutaCodeRaw = row.siruta_code;
    const sirutaCode = typeof sirutaCodeRaw === 'string' ? sirutaCodeRaw.trim() : '';

    if (sirutaCode.length === 0) {
      warnings.push({
        type: 'invalid_row',
        message: `Skipped CSV row ${rowIndex}: missing siruta_code`,
        details: { rowIndex },
      });
      continue;
    }

    if (seenSirutaCodes.has(sirutaCode)) {
      warnings.push({
        type: 'duplicate_row',
        sirutaCode,
        message: `Duplicate row for ${sirutaCode}; last row wins`,
      });
    }
    seenSirutaCodes.add(sirutaCode);

    for (const seriesId of seriesIds) {
      const rawValue = row[seriesId];
      const trimmedValue = typeof rawValue === 'string' ? rawValue.trim() : '';
      const vector = valuesBySeriesId.get(seriesId);

      if (vector === undefined) {
        continue;
      }

      if (trimmedValue === '' || trimmedValue.toLowerCase() === 'null') {
        vector.delete(sirutaCode);
        continue;
      }

      const value = Number(trimmedValue);
      if (!Number.isFinite(value)) {
        warnings.push({
          type: 'invalid_row',
          message: `Skipped value for row ${rowIndex}, series ${seriesId}: value is not a finite number`,
          seriesId,
          sirutaCode,
          details: {
            rowIndex,
            value: rawValue,
          },
        });
        vector.delete(sirutaCode);
        continue;
      }

      vector.set(sirutaCode, value);
    }
  }

  return {
    seriesIds,
    valuesBySeriesId,
    warnings,
  };
}

function escapeCsvCell(value: string): string {
  const requiresQuoting =
    value.includes(',') || value.includes('"') || value.includes('\n') || value.includes('\r');

  if (!requiresQuoting) {
    return value;
  }

  const escaped = value.replace(/"/g, '""');
  return `"${escaped}"`;
}

function toCellValue(value: number | undefined): string {
  if (value === undefined) {
    return 'null';
  }

  return value.toString();
}

export function serializeGroupedSeriesWideMatrixCsv(
  rows: GroupedSeriesRow[],
  seriesOrder: string[]
): string {
  const rowValuesBySiruta = new Map<string, Map<string, number>>();

  for (const row of rows) {
    if (!rowValuesBySiruta.has(row.siruta_code)) {
      rowValuesBySiruta.set(row.siruta_code, new Map());
    }

    const valuesBySeries = rowValuesBySiruta.get(row.siruta_code);
    if (valuesBySeries === undefined) {
      continue;
    }

    valuesBySeries.set(row.series_id, row.value);
  }

  const sortedSirutaCodes = Array.from(rowValuesBySiruta.keys()).sort((left, right) =>
    left.localeCompare(right)
  );

  const header = ['siruta_code', ...seriesOrder].map((cell) => escapeCsvCell(cell)).join(',');

  if (sortedSirutaCodes.length === 0) {
    return header;
  }

  const csvRows = sortedSirutaCodes.map((sirutaCode) => {
    const valuesBySeries = rowValuesBySiruta.get(sirutaCode) ?? new Map<string, number>();
    const cells = [escapeCsvCell(sirutaCode)];

    for (const seriesId of seriesOrder) {
      const value = valuesBySeries.get(seriesId);
      cells.push(toCellValue(value));
    }

    return cells.join(',');
  });

  return [header, ...csvRows].join('\n');
}
