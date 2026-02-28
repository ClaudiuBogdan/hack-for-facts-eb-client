import { generateHash, getNormalizationUnit } from '@/lib/utils';
import {
  parseGroupedSeriesWideCsv,
  serializeGroupedSeriesWideMatrixCsv,
} from '@/lib/map-series/csv';
import type {
  GroupedSeriesDataRequest,
  GroupedSeriesDataResponse,
  GroupedSeriesManifestEntry,
  GroupedSeriesRow,
  MapSeriesDataAdapter,
} from '@/lib/map-series/interfaces';

let sirutaCodesPromise: Promise<string[]> | null = null;

function toDeterministicFactor(seed: string): number {
  const hashed = generateHash(seed);
  const parsed = Number.parseInt(hashed.slice(0, 8), 16);
  return Number.isFinite(parsed) ? parsed / 0xffffffff : 0;
}

async function loadAllSirutaCodes(): Promise<string[]> {
  if (!sirutaCodesPromise) {
    sirutaCodesPromise = fetch('/assets/geojson/uat.json')
      .then(async (response) => {
        if (!response.ok) {
          throw new Error('Failed to load UAT geometry for mock map-series adapter');
        }
        return response.json() as Promise<{
          features?: Array<{ properties?: { natcode?: string } }>;
        }>;
      })
      .then((geoJson) => {
        const features = geoJson.features ?? [];
        const codes = new Set<string>();
        for (const feature of features) {
          const natcode = feature.properties?.natcode;
          if (typeof natcode === 'string' && natcode.trim().length > 0) {
            codes.add(natcode.trim());
          }
        }
        return Array.from(codes).sort((left, right) => left.localeCompare(right));
      })
      .catch((error) => {
        // Allow retry after transient failures.
        sirutaCodesPromise = null;
        throw error;
      });
  }

  return sirutaCodesPromise;
}

function resolveSeriesUnit(series: GroupedSeriesDataRequest['series'][number]): string | undefined {
  if (series.unit && series.unit.trim().length > 0) {
    return series.unit;
  }

  if (series.type === 'line-items-aggregated-yearly' || series.type === 'commitments-analytics') {
    return getNormalizationUnit({
      normalization: series.filter.normalization,
      currency: series.filter.currency,
      show_period_growth: series.filter.show_period_growth,
    });
  }

  return undefined;
}

function shouldSkipRow(
  series: GroupedSeriesDataRequest['series'][number],
  sirutaCode: string
): boolean {
  const factor = toDeterministicFactor(`${series.id}::${sirutaCode}::missing`);

  if (series.type === 'ins-series') {
    return factor < 0.35;
  }

  if (series.type === 'commitments-analytics') {
    return factor < 0.08;
  }

  return factor < 0.03;
}

function buildMockValue(
  series: GroupedSeriesDataRequest['series'][number],
  sirutaCode: string
): number {
  const factor = toDeterministicFactor(`${series.id}::${sirutaCode}::value`);

  if (series.type === 'line-items-aggregated-yearly') {
    const normalization = series.filter.normalization ?? 'total';
    const baseMagnitude =
      normalization === 'percent_gdp'
        ? 0.1 + factor * 18
        : normalization === 'per_capita' || normalization === 'per_capita_euro'
          ? 100 + factor * 9000
          : 100_000 + factor * 8_000_000;
    const categoryMultiplier = series.filter.account_category === 'vn' ? 1.15 : 1;
    return Number((baseMagnitude * categoryMultiplier).toFixed(2));
  }

  if (series.type === 'commitments-analytics') {
    const normalization = series.filter.normalization ?? 'total';
    const baseMagnitude =
      normalization === 'percent_gdp'
        ? 0.05 + factor * 9
        : normalization === 'per_capita' || normalization === 'per_capita_euro'
          ? 60 + factor * 4500
          : 50_000 + factor * 4_500_000;
    return Number(baseMagnitude.toFixed(2));
  }

  // INS mock values tend to be smaller and more sparse.
  return Number((1 + factor * 500).toFixed(2));
}

function buildManifestSeries(
  requestSeries: GroupedSeriesDataRequest['series'],
  valuesBySeriesId: ReturnType<typeof parseGroupedSeriesWideCsv>['valuesBySeriesId']
): GroupedSeriesManifestEntry[] {
  return requestSeries.map((series) => ({
    series_id: series.id,
    unit: resolveSeriesUnit(series),
    defined_value_count: valuesBySeriesId.get(series.id)?.size ?? 0,
  }));
}

export const mockMapSeriesDataAdapter: MapSeriesDataAdapter = {
  async fetchGroupedSeriesData(request) {
    const sirutaCodes = await loadAllSirutaCodes();
    const rows: GroupedSeriesRow[] = [];

    for (const series of request.series) {
      for (const sirutaCode of sirutaCodes) {
        if (shouldSkipRow(series, sirutaCode)) {
          continue;
        }

        rows.push({
          series_id: series.id,
          siruta_code: sirutaCode,
          value: buildMockValue(series, sirutaCode),
        });
      }
    }

    // Keep parser in the execution path so the client contract remains stable
    // when backend starts returning map-series CSV payloads.
    const csvRaw = serializeGroupedSeriesWideMatrixCsv(
      rows,
      request.series.map((series) => series.id)
    );
    const parsed = parseGroupedSeriesWideCsv(csvRaw);

    return {
      manifest: {
        generated_at: new Date().toISOString(),
        format: 'wide_matrix_v1',
        granularity: 'UAT',
        series: buildManifestSeries(request.series, parsed.valuesBySeriesId),
      },
      payload: {
        mime: 'text/csv',
        compression: 'none',
        data: csvRaw,
      },
      warnings: parsed.warnings,
    } satisfies GroupedSeriesDataResponse;
  },
};

export async function fetchGroupedSeriesData(
  request: GroupedSeriesDataRequest
): Promise<GroupedSeriesDataResponse> {
  return mockMapSeriesDataAdapter.fetchGroupedSeriesData(request);
}
