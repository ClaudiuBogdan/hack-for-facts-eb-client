import type { InsSeriesConfiguration } from '@/schemas/charts';
import type { InsObservation, InsPeriodicity } from '@/schemas/ins';
import { evaluateInsSeriesToMapVector } from '@/lib/map-series/ins-scalar';
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
  MapSeriesVectorCache,
  MapSeriesWarning,
} from '@/lib/map-series/interfaces';

let sirutaCodesPromise: Promise<string[]> | null = null;

const COUNTY_CODES = [
  'AB', 'AG', 'AR', 'B', 'BC', 'BH', 'BN', 'BR', 'BT', 'BV', 'BZ', 'CJ', 'CL', 'CS', 'CT',
  'CV', 'DB', 'DJ', 'GJ', 'GL', 'GR', 'HD', 'HR', 'IF', 'IL', 'IS', 'MH', 'MM', 'MS', 'NT',
  'OT', 'PH', 'SB', 'SJ', 'SM', 'SV', 'TL', 'TM', 'TR', 'VL', 'VN', 'VS',
] as const;

const MAX_MOCK_PERIODS = 12;
const INS_MOCK_COVERAGE_WARNING_THRESHOLD = 0.75;

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

function isInsSeries(
  series: GroupedSeriesDataRequest['series'][number]
): series is InsSeriesConfiguration {
  return series.type === 'ins-series';
}

function shouldSkipBaseRow(
  series: Exclude<GroupedSeriesDataRequest['series'][number], InsSeriesConfiguration>,
  sirutaCode: string
): boolean {
  const factor = toDeterministicFactor(`${series.id}::${sirutaCode}::missing`);

  if (series.type === 'commitments-analytics') {
    return factor < 0.08;
  }

  return factor < 0.03;
}

function buildMockBaseValue(
  series: Exclude<GroupedSeriesDataRequest['series'][number], InsSeriesConfiguration>,
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

  const normalization = series.filter.normalization ?? 'total';
  const baseMagnitude =
    normalization === 'percent_gdp'
      ? 0.05 + factor * 9
      : normalization === 'per_capita' || normalization === 'per_capita_euro'
        ? 60 + factor * 4500
        : 50_000 + factor * 4_500_000;
  return Number(baseMagnitude.toFixed(2));
}

interface MockInsPeriod {
  iso_period: string;
  year: number;
  quarter?: number | null;
  month?: number | null;
  periodicity: InsPeriodicity;
}

type SeriesPeriodInput = NonNullable<InsSeriesConfiguration['period']>;

function parseYearPeriod(period: string): MockInsPeriod | null {
  if (!/^\d{4}$/.test(period)) {
    return null;
  }
  const year = Number.parseInt(period, 10);
  return {
    iso_period: period,
    year,
    quarter: null,
    month: null,
    periodicity: 'ANNUAL',
  };
}

function parseQuarterPeriod(period: string): MockInsPeriod | null {
  const matched = period.match(/^(\d{4})-Q([1-4])$/);
  if (!matched) {
    return null;
  }
  const year = Number.parseInt(matched[1], 10);
  const quarter = Number.parseInt(matched[2], 10);
  return {
    iso_period: `${year}-Q${quarter}`,
    year,
    quarter,
    month: null,
    periodicity: 'QUARTERLY',
  };
}

function parseMonthPeriod(period: string): MockInsPeriod | null {
  const matched = period.match(/^(\d{4})-(0[1-9]|1[0-2])$/);
  if (!matched) {
    return null;
  }
  const year = Number.parseInt(matched[1], 10);
  const month = Number.parseInt(matched[2], 10);
  return {
    iso_period: `${year}-${matched[2]}`,
    year,
    quarter: Math.ceil(month / 3),
    month,
    periodicity: 'MONTHLY',
  };
}

function parsePeriodDate(date: string, type: SeriesPeriodInput['type']): MockInsPeriod | null {
  if (type === 'YEAR') {
    return parseYearPeriod(date);
  }
  if (type === 'QUARTER') {
    return parseQuarterPeriod(date);
  }
  return parseMonthPeriod(date);
}

function buildDefaultMockInsPeriods(): MockInsPeriod[] {
  return [
    parseYearPeriod('2022'),
    parseYearPeriod('2023'),
    parseYearPeriod('2024'),
  ].filter((value): value is MockInsPeriod => value !== null);
}

function expandPeriodInterval(period: SeriesPeriodInput): MockInsPeriod[] {
  const interval = period.selection.interval;
  if (!interval) {
    return [];
  }

  if (period.type === 'YEAR') {
    const start = Number.parseInt(interval.start, 10);
    const end = Number.parseInt(interval.end, 10);
    if (!Number.isFinite(start) || !Number.isFinite(end)) {
      return [];
    }
    const rangeStart = Math.min(start, end);
    const rangeEnd = Math.max(start, end);
    const periods: MockInsPeriod[] = [];
    for (let year = rangeStart; year <= rangeEnd && periods.length < MAX_MOCK_PERIODS; year += 1) {
      const parsed = parseYearPeriod(String(year));
      if (parsed) {
        periods.push(parsed);
      }
    }
    return periods;
  }

  if (period.type === 'QUARTER') {
    const parsedStart = parseQuarterPeriod(interval.start);
    const parsedEnd = parseQuarterPeriod(interval.end);
    if (!parsedStart || !parsedEnd || !parsedStart.quarter || !parsedEnd.quarter) {
      return [];
    }

    const startKey = parsedStart.year * 4 + (parsedStart.quarter - 1);
    const endKey = parsedEnd.year * 4 + (parsedEnd.quarter - 1);
    const rangeStart = Math.min(startKey, endKey);
    const rangeEnd = Math.max(startKey, endKey);
    const periods: MockInsPeriod[] = [];

    for (let key = rangeStart; key <= rangeEnd && periods.length < MAX_MOCK_PERIODS; key += 1) {
      const year = Math.floor(key / 4);
      const quarter = (key % 4) + 1;
      const parsed = parseQuarterPeriod(`${year}-Q${quarter}`);
      if (parsed) {
        periods.push(parsed);
      }
    }
    return periods;
  }

  const parsedStart = parseMonthPeriod(interval.start);
  const parsedEnd = parseMonthPeriod(interval.end);
  if (!parsedStart || !parsedEnd || !parsedStart.month || !parsedEnd.month) {
    return [];
  }

  const startKey = parsedStart.year * 12 + (parsedStart.month - 1);
  const endKey = parsedEnd.year * 12 + (parsedEnd.month - 1);
  const rangeStart = Math.min(startKey, endKey);
  const rangeEnd = Math.max(startKey, endKey);
  const periods: MockInsPeriod[] = [];

  for (let key = rangeStart; key <= rangeEnd && periods.length < MAX_MOCK_PERIODS; key += 1) {
    const year = Math.floor(key / 12);
    const monthIndex = key % 12;
    const month = String(monthIndex + 1).padStart(2, '0');
    const parsed = parseMonthPeriod(`${year}-${month}`);
    if (parsed) {
      periods.push(parsed);
    }
  }
  return periods;
}

function buildMockInsPeriods(series: InsSeriesConfiguration): MockInsPeriod[] {
  const period = series.period;
  if (!period) {
    return buildDefaultMockInsPeriods();
  }

  const parsedFromDates =
    period.selection.dates
      ?.map((date) => parsePeriodDate(date, period.type))
      .filter((value): value is MockInsPeriod => value !== null) ?? [];

  if (parsedFromDates.length > 0) {
    return parsedFromDates.slice(0, MAX_MOCK_PERIODS);
  }

  const parsedFromInterval = expandPeriodInterval(period);
  if (parsedFromInterval.length > 0) {
    return parsedFromInterval.slice(0, MAX_MOCK_PERIODS);
  }

  return buildDefaultMockInsPeriods();
}

function mapSirutaToCountyCode(sirutaCode: string): string {
  const factor = toDeterministicFactor(`${sirutaCode}::county`);
  const index = Math.floor(factor * COUNTY_CODES.length);
  return COUNTY_CODES[Math.min(Math.max(index, 0), COUNTY_CODES.length - 1)] ?? 'B';
}

function toTrimmedCodeSet(codes?: string[]): Set<string> {
  return new Set((codes ?? []).map((code) => code.trim()).filter((code) => code.length > 0));
}

function resolveCoverageScopeSirutaCodes(
  series: InsSeriesConfiguration,
  allSirutaCodes: string[]
): string[] {
  const selectedSirutaCodes = toTrimmedCodeSet(series.sirutaCodes);
  const selectedTerritoryCodes = toTrimmedCodeSet(series.territoryCodes);

  return allSirutaCodes.filter((sirutaCode) => {
    if (selectedSirutaCodes.size > 0 && !selectedSirutaCodes.has(sirutaCode)) {
      return false;
    }

    if (selectedTerritoryCodes.size > 0) {
      const countyCode = mapSirutaToCountyCode(sirutaCode);
      if (!selectedTerritoryCodes.has(countyCode)) {
        return false;
      }
    }

    return true;
  });
}

function resolvePrimaryUnitCode(series: InsSeriesConfiguration): string {
  const explicitUnitCode = series.unitCodes?.find((code) => code.trim().length > 0);
  if (explicitUnitCode) {
    return explicitUnitCode;
  }
  return 'PERS';
}

function resolveUnitSymbol(unitCode: string): string {
  const normalized = unitCode.trim().toUpperCase();
  if (normalized === 'PROC' || normalized === '%') {
    return '%';
  }
  if (normalized === 'PERS') {
    return 'pers.';
  }
  return normalized;
}

function buildPrimaryClassifications(series: InsSeriesConfiguration): Array<{ typeCode: string; code: string }> {
  const selected = Object.entries(series.classificationSelections ?? {})
    .map(([typeCode, codes]) => ({
      typeCode,
      code: (codes?.[0] ?? '').trim(),
    }))
    .filter((entry) => entry.typeCode.trim().length > 0 && entry.code.length > 0);

  if (selected.length > 0) {
    return selected;
  }

  return [
    {
      typeCode: 'SEXE',
      code: 'TOTAL',
    },
  ];
}

function buildMockInsObservations(
  series: InsSeriesConfiguration,
  sirutaCodes: string[]
): InsObservation[] {
  const periods = buildMockInsPeriods(series);
  const observations: InsObservation[] = [];
  const primaryUnitCode = resolvePrimaryUnitCode(series);
  const primaryUnitSymbol = resolveUnitSymbol(primaryUnitCode);
  const alternativeUnitCode = primaryUnitCode === 'PERS' ? 'PROC' : 'PERS';
  const alternativeUnitSymbol = resolveUnitSymbol(alternativeUnitCode);
  const primaryClassifications = buildPrimaryClassifications(series);

  for (const sirutaCode of sirutaCodes) {
    const coverageFactor = toDeterministicFactor(`${series.id}::${sirutaCode}::ins-coverage`);
    if (coverageFactor < 0.18) {
      continue;
    }

    const territoryCode = mapSirutaToCountyCode(sirutaCode);

    for (const period of periods) {
      const valueFactor = toDeterministicFactor(
        `${series.id}::${sirutaCode}::${period.iso_period}::base-value`
      );
      const baseValue = Number((40 + valueFactor * 5500).toFixed(2));

      observations.push({
        dataset_code: series.datasetCode ?? 'INS_MOCK',
        value: String(baseValue),
        value_status: null,
        time_period: period,
        territory: {
          code: territoryCode,
          siruta_code: sirutaCode,
          level: 'LAU',
          name_ro: `UAT ${sirutaCode}`,
        },
        unit: {
          code: primaryUnitCode,
          symbol: primaryUnitSymbol,
          name_ro: primaryUnitCode,
        },
        classifications: primaryClassifications.map((entry) => ({
          type_code: entry.typeCode,
          code: entry.code,
          name_ro: entry.code,
          name_en: entry.code,
        })),
      });

      const shouldAddClassificationAlternative =
        toDeterministicFactor(`${series.id}::${sirutaCode}::${period.iso_period}::class-alt`) < 0.45;
      if (shouldAddClassificationAlternative && primaryClassifications.length > 0) {
        const [first, ...rest] = primaryClassifications;
        const alternativeCode = `${first.code}_ALT`;
        observations.push({
          dataset_code: series.datasetCode ?? 'INS_MOCK',
          value: String(Number((baseValue * 0.33).toFixed(2))),
          value_status: null,
          time_period: period,
          territory: {
            code: territoryCode,
            siruta_code: sirutaCode,
            level: 'LAU',
            name_ro: `UAT ${sirutaCode}`,
          },
          unit: {
            code: primaryUnitCode,
            symbol: primaryUnitSymbol,
            name_ro: primaryUnitCode,
          },
          classifications: [
            {
              type_code: first.typeCode,
              code: alternativeCode,
              name_ro: alternativeCode,
              name_en: alternativeCode,
            },
            ...rest.map((entry) => ({
              type_code: entry.typeCode,
              code: entry.code,
              name_ro: entry.code,
              name_en: entry.code,
            })),
          ],
        });
      }

      const shouldAddMixedUnitValue =
        toDeterministicFactor(`${series.id}::${sirutaCode}::${period.iso_period}::unit-alt`) < 0.08;
      if (shouldAddMixedUnitValue) {
        observations.push({
          dataset_code: series.datasetCode ?? 'INS_MOCK',
          value: String(Number((baseValue / 100).toFixed(4))),
          value_status: null,
          time_period: period,
          territory: {
            code: territoryCode,
            siruta_code: sirutaCode,
            level: 'LAU',
            name_ro: `UAT ${sirutaCode}`,
          },
          unit: {
            code: alternativeUnitCode,
            symbol: alternativeUnitSymbol,
            name_ro: alternativeUnitCode,
          },
          classifications: primaryClassifications.map((entry) => ({
            type_code: entry.typeCode,
            code: entry.code,
            name_ro: entry.code,
            name_en: entry.code,
          })),
        });
      }

      const shouldAddMissingValue =
        toDeterministicFactor(`${series.id}::${sirutaCode}::${period.iso_period}::missing`) < 0.04;
      if (shouldAddMissingValue) {
        observations.push({
          dataset_code: series.datasetCode ?? 'INS_MOCK',
          value: null,
          value_status: 'MISSING',
          time_period: period,
          territory: {
            code: territoryCode,
            siruta_code: sirutaCode,
            level: 'LAU',
            name_ro: `UAT ${sirutaCode}`,
          },
          unit: {
            code: primaryUnitCode,
            symbol: primaryUnitSymbol,
            name_ro: primaryUnitCode,
          },
          classifications: primaryClassifications.map((entry) => ({
            type_code: entry.typeCode,
            code: entry.code,
            name_ro: entry.code,
            name_en: entry.code,
          })),
        });
      }
    }
  }

  return observations;
}

interface MockInsSeriesEvaluationResult {
  vector: Map<string, number | undefined>;
  unit?: string;
  warnings: MapSeriesWarning[];
}

function evaluateMockInsSeries(
  series: InsSeriesConfiguration,
  sirutaCodes: string[]
): MockInsSeriesEvaluationResult {
  const observations = buildMockInsObservations(series, sirutaCodes);
  const scalarResult = evaluateInsSeriesToMapVector({
    series,
    observations,
  });

  const warnings = [...scalarResult.warnings];
  const coverageScopeSirutaCodes = resolveCoverageScopeSirutaCodes(series, sirutaCodes);
  const coverageScopeSirutaCodeSet = new Set(coverageScopeSirutaCodes);
  const definedCountInScope = [...scalarResult.valuesBySiruta.keys()].filter((sirutaCode) =>
    coverageScopeSirutaCodeSet.has(sirutaCode)
  ).length;
  const totalCountInScope = coverageScopeSirutaCodes.length;
  const coverage = totalCountInScope === 0 ? 0 : definedCountInScope / totalCountInScope;
  if (coverage > 0 && coverage < INS_MOCK_COVERAGE_WARNING_THRESHOLD) {
    warnings.push({
      type: 'ins_partial_mock_coverage',
      seriesId: series.id,
      message: `Mock INS coverage is ${Math.round(coverage * 100)}% for ${series.id}.`,
      details: {
        coverage,
        definedCount: definedCountInScope,
        totalCount: totalCountInScope,
      },
    });
  }

  return {
    vector: scalarResult.valuesBySiruta,
    unit: scalarResult.unit,
    warnings,
  };
}

function buildManifestSeries(
  requestSeries: GroupedSeriesDataRequest['series'],
  valuesBySeriesId: ReturnType<typeof parseGroupedSeriesWideCsv>['valuesBySeriesId'],
  unitsBySeriesId: Map<string, string | undefined>
): GroupedSeriesManifestEntry[] {
  return requestSeries.map((series) => ({
    series_id: series.id,
    unit: unitsBySeriesId.get(series.id) ?? resolveSeriesUnit(series),
    defined_value_count: valuesBySeriesId.get(series.id)?.size ?? 0,
  }));
}

export interface MockInsSeriesVectorsResponse {
  valuesBySeriesId: MapSeriesVectorCache;
  unitsBySeriesId: Map<string, string | undefined>;
  warnings: MapSeriesWarning[];
}

export async function fetchMockInsSeriesVectors(
  seriesList: InsSeriesConfiguration[]
): Promise<MockInsSeriesVectorsResponse> {
  const sirutaCodes = await loadAllSirutaCodes();
  const valuesBySeriesId: MapSeriesVectorCache = new Map();
  const unitsBySeriesId = new Map<string, string | undefined>();
  const warnings: MapSeriesWarning[] = [];

  for (const series of seriesList) {
    const evaluation = evaluateMockInsSeries(series, sirutaCodes);
    valuesBySeriesId.set(series.id, new Map(evaluation.vector));
    unitsBySeriesId.set(series.id, evaluation.unit ?? resolveSeriesUnit(series));
    warnings.push(...evaluation.warnings);
  }

  return {
    valuesBySeriesId,
    unitsBySeriesId,
    warnings,
  };
}

export const mockMapSeriesDataAdapter: MapSeriesDataAdapter = {
  async fetchGroupedSeriesData(request) {
    const sirutaCodes = await loadAllSirutaCodes();
    const rows: GroupedSeriesRow[] = [];
    const warnings: MapSeriesWarning[] = [];
    const unitsBySeriesId = new Map<string, string | undefined>();

    for (const series of request.series) {
      if (isInsSeries(series)) {
        const evaluation = evaluateMockInsSeries(series, sirutaCodes);
        unitsBySeriesId.set(series.id, evaluation.unit ?? resolveSeriesUnit(series));
        warnings.push(...evaluation.warnings);
        for (const [sirutaCode, value] of evaluation.vector.entries()) {
          if (value === undefined || !Number.isFinite(value)) {
            continue;
          }
          rows.push({
            series_id: series.id,
            siruta_code: sirutaCode,
            value,
          });
        }
        continue;
      }

      unitsBySeriesId.set(series.id, resolveSeriesUnit(series));
      for (const sirutaCode of sirutaCodes) {
        if (shouldSkipBaseRow(series, sirutaCode)) {
          continue;
        }

        rows.push({
          series_id: series.id,
          siruta_code: sirutaCode,
          value: buildMockBaseValue(series, sirutaCode),
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
        series: buildManifestSeries(request.series, parsed.valuesBySeriesId, unitsBySeriesId),
      },
      payload: {
        mime: 'text/csv',
        compression: 'none',
        data: csvRaw,
      },
      warnings: [...warnings, ...parsed.warnings],
    } satisfies GroupedSeriesDataResponse;
  },
};

export async function fetchGroupedSeriesData(
  request: GroupedSeriesDataRequest
): Promise<GroupedSeriesDataResponse> {
  return mockMapSeriesDataAdapter.fetchGroupedSeriesData(request);
}
