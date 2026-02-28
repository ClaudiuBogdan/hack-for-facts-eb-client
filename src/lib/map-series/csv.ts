import Papa from 'papaparse';
import type { GroupedSeriesRow, MapSeriesWarning } from '@/lib/map-series/interfaces';

interface ParsedCsvResult {
  rows: GroupedSeriesRow[];
  warnings: MapSeriesWarning[];
}

export function parseGroupedSeriesCsv(csvRaw: string): ParsedCsvResult {
  const warnings: MapSeriesWarning[] = [];
  const parsed = Papa.parse<Record<string, string>>(csvRaw, {
    header: true,
    delimiter: ',',
    skipEmptyLines: 'greedy',
    transformHeader: (header) => header.trim().toLowerCase(),
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

  const dedupeMap = new Map<string, GroupedSeriesRow>();

  for (const [index, row] of (parsed.data ?? []).entries()) {
    const seriesId = row.series_id?.trim();
    const sirutaCode = row.siruta_code?.trim();
    const valueRaw = row.value?.trim();

    if (!seriesId || !sirutaCode || valueRaw === undefined || valueRaw === '') {
      warnings.push({
        type: 'invalid_row',
        message: `Skipped CSV row ${index + 2}: missing series_id/siruta_code/value`,
        details: {
          rowIndex: index + 2,
        },
      });
      continue;
    }

    const value = Number(valueRaw);
    if (!Number.isFinite(value)) {
      warnings.push({
        type: 'invalid_row',
        message: `Skipped CSV row ${index + 2}: value is not a finite number`,
        details: {
          rowIndex: index + 2,
          value: valueRaw,
        },
      });
      continue;
    }

    const dedupeKey = `${seriesId}::${sirutaCode}`;
    if (dedupeMap.has(dedupeKey)) {
      warnings.push({
        type: 'duplicate_row',
        seriesId,
        sirutaCode,
        message: `Duplicate row for ${seriesId}/${sirutaCode}; last value wins`,
      });
    }

    dedupeMap.set(dedupeKey, {
      series_id: seriesId,
      siruta_code: sirutaCode,
      value,
    });
  }

  return {
    rows: Array.from(dedupeMap.values()),
    warnings,
  };
}

export function serializeGroupedSeriesRowsCsv(rows: GroupedSeriesRow[]): string {
  const csvResult = Papa.unparse(rows, {
    columns: ['series_id', 'siruta_code', 'value'],
    header: true,
  });

  return csvResult;
}
