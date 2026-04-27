import type { DataValidationError } from '@/lib/chart-data-validation';
import { getAllInsObservations } from '@/lib/api/ins';
import type { InsObservation, InsObservationFilterInput, InsPeriodicity } from '@/schemas/ins';
import type { AnalyticsSeries, InsSeriesConfiguration } from '@/schemas/charts';
import type { PeriodDate, ReportPeriodInput, ReportPeriodType } from '@/schemas/reporting';
import { getUserLocale } from '@/lib/utils';

export interface InsSeriesMapperInput {
  series: InsSeriesConfiguration;
}

export interface InsSeriesMappingResult {
  series: AnalyticsSeries | null;
  warnings: DataValidationError[];
}

export interface InsSeriesRuntimeMapper {
  mapSeries(input: InsSeriesMapperInput): Promise<InsSeriesMappingResult>;
}

type ObservationWithValue = {
  observation: InsObservation;
  value: number;
  periodKey: number;
  periodLabel: string;
  unitLabel: string;
};

const PERIODICITY_PRIORITY: InsPeriodicity[] = ['ANNUAL', 'QUARTERLY', 'MONTHLY'];

export function getInsObservationPeriodKey(observation: InsObservation): number {
  const period = observation.time_period;
  return period.year * 10000 + (period.quarter ?? 0) * 100 + (period.month ?? 0);
}

export function parseInsObservationValue(value: string | null | undefined): number | null {
  if (value == null) return null;
  const parsed = Number(String(value).replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
}

export function getInsObservationUnitLabel(observation: InsObservation): string {
  const locale = getUserLocale() === 'en' ? 'en' : 'ro';
  const localizedUnitName = locale === 'en'
    ? observation.unit?.name_en || observation.unit?.name_ro || ''
    : observation.unit?.name_ro || observation.unit?.name_en || '';
  return observation.unit?.symbol || observation.unit?.code || localizedUnitName;
}

function isPeriodDateForType(date: string, type: ReportPeriodType): date is PeriodDate {
  if (type === 'YEAR') return /^\d{4}$/.test(date);
  if (type === 'QUARTER') return /^\d{4}-Q[1-4]$/.test(date);
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(date);
}

function normalizeSeriesPeriod(period: InsSeriesConfiguration['period']): ReportPeriodInput | undefined {
  if (!period) return undefined;

  if (period.selection.interval) {
    const interval = period.selection.interval;
    if (
      !isPeriodDateForType(interval.start, period.type) ||
      !isPeriodDateForType(interval.end, period.type)
    ) {
      return undefined;
    }

    return {
      type: period.type,
      selection: {
        interval: {
          start: interval.start,
          end: interval.end,
        },
      },
    };
  }

  const dates = (period.selection.dates ?? []).filter((date) =>
    isPeriodDateForType(date, period.type)
  );
  if (dates.length === 0) return undefined;

  return {
    type: period.type,
    selection: {
      dates: Array.from(new Set(dates)),
    },
  };
}

function buildObservationFilter(series: InsSeriesConfiguration): InsObservationFilterInput {
  const filter: InsObservationFilterInput = {
    hasValue: series.hasValue ?? true,
  };

  if (series.territoryCodes?.length) {
    filter.territoryCodes = series.territoryCodes;
  }
  if (series.sirutaCodes?.length) {
    filter.sirutaCodes = series.sirutaCodes;
  }
  if (series.unitCodes?.length) {
    filter.unitCodes = series.unitCodes;
  }
  const normalizedPeriod = normalizeSeriesPeriod(series.period);
  if (normalizedPeriod) {
    filter.period = normalizedPeriod;
  }

  if (series.classificationSelections && Object.keys(series.classificationSelections).length > 0) {
    filter.classificationTypeCodes = Object.keys(series.classificationSelections);
    const allValues = Object.values(series.classificationSelections)
      .flatMap((codes) => codes)
      .filter((code) => code?.trim().length > 0);

    if (allValues.length > 0) {
      filter.classificationValueCodes = Array.from(new Set(allValues));
    }
  }

  return filter;
}

export function selectDefaultInsPeriodicity(observations: InsObservation[]): InsPeriodicity | null {
  const seen = new Set<InsPeriodicity>();
  observations.forEach((observation) => {
    seen.add(observation.time_period.periodicity);
  });

  if (seen.size === 0) return null;

  for (const periodicity of PERIODICITY_PRIORITY) {
    if (seen.has(periodicity)) return periodicity;
  }

  return observations[0]?.time_period.periodicity ?? null;
}

export function mapReportPeriodTypeToInsPeriodicity(
  periodType: ReportPeriodType | undefined
): InsPeriodicity | null {
  if (periodType === 'MONTH') return 'MONTHLY';
  if (periodType === 'QUARTER') return 'QUARTERLY';
  if (periodType === 'YEAR') return 'ANNUAL';
  return null;
}

function normalizePeriodicityForChart(periodicity: InsPeriodicity): 'year' | 'quarter' | 'month' {
  if (periodicity === 'MONTHLY') return 'month';
  if (periodicity === 'QUARTERLY') return 'quarter';
  return 'year';
}

function normalizePeriodTypeForChart(
  periodType: ReportPeriodType | undefined
): 'year' | 'quarter' | 'month' | null {
  if (periodType === 'MONTH') return 'month';
  if (periodType === 'QUARTER') return 'quarter';
  if (periodType === 'YEAR') return 'year';
  return null;
}

export function insObservationMatchesClassificationSelection(
  observation: InsObservation,
  selection: Record<string, string[]>
): boolean {
  if (!selection || Object.keys(selection).length === 0) {
    return true;
  }

  const classifications = observation.classifications ?? [];
  for (const [typeCode, selectedCodes] of Object.entries(selection)) {
    if (selectedCodes.length === 0) continue;

    const hasMatch = classifications.some((classification) => {
      if (!classification?.type_code || !classification?.code) return false;
      return classification.type_code === typeCode && selectedCodes.includes(classification.code);
    });

    if (!hasMatch) {
      return false;
    }
  }

  return true;
}

export function reduceInsObservationValues(
  values: number[],
  aggregation: InsSeriesConfiguration['aggregation']
): number | null {
  if (values.length === 0) return null;

  if (aggregation === 'first') {
    return values[0] ?? null;
  }
  if (aggregation === 'average') {
    return values.reduce((acc, value) => acc + value, 0) / values.length;
  }

  return values.reduce((acc, value) => acc + value, 0);
}

export async function mapInsSeriesToAnalyticsSeries(series: InsSeriesConfiguration): Promise<InsSeriesMappingResult> {
  const warnings: DataValidationError[] = [];

  if (!series.datasetCode) {
    warnings.push({
      type: 'missing_data',
      seriesId: series.id,
      message: 'INS series datasetCode is missing. No data fetched.',
    });
    return { series: null, warnings };
  }

  const filter = buildObservationFilter(series);
  const observations = await getAllInsObservations({
    datasetCode: series.datasetCode,
    filter,
    pageSize: 1000,
    maxPages: 30,
  });

  const classSelection = series.classificationSelections ?? {};
  const classFiltered = observations.filter((observation) =>
    insObservationMatchesClassificationSelection(observation, classSelection)
  );

  if (classFiltered.length === 0) {
    warnings.push({
      type: 'empty_series',
      seriesId: series.id,
      message: `No INS observations found for dataset ${series.datasetCode} with current filters.`,
    });

    return {
      series: {
        seriesId: series.id,
        xAxis: { name: 'Period', type: 'STRING', unit: 'year' },
        yAxis: { name: 'Value', type: 'FLOAT', unit: series.unit || '' },
        data: [],
      },
      warnings,
    };
  }

  const observedPeriodicities = Array.from(
    new Set(classFiltered.map((observation) => observation.time_period.periodicity))
  );

  const requestedPeriodicity = mapReportPeriodTypeToInsPeriodicity(series.period?.type);
  const effectivePeriodicity = requestedPeriodicity ?? selectDefaultInsPeriodicity(classFiltered);
  if (!effectivePeriodicity) {
    warnings.push({
      type: 'missing_data',
      seriesId: series.id,
      message: `Cannot determine periodicity for INS dataset ${series.datasetCode}.`,
    });
    return { series: null, warnings };
  }

  if (!requestedPeriodicity && observedPeriodicities.length > 1) {
    warnings.push({
      type: 'auto_adjusted_value',
      seriesId: series.id,
      message: `Multiple periodicities found (${observedPeriodicities.join(', ')}). Auto-selected ${effectivePeriodicity}.`,
      value: observedPeriodicities,
    });
  }

  const periodicityFiltered = classFiltered.filter(
    (observation) => observation.time_period.periodicity === effectivePeriodicity
  );

  const normalizedObservations: ObservationWithValue[] = [];

  for (const observation of periodicityFiltered) {
    const parsed = parseInsObservationValue(observation.value);
    if (parsed == null) {
      if (series.hasValue !== false) {
        warnings.push({
          type: 'invalid_y_value',
          seriesId: series.id,
          message: `Skipping non-numeric INS observation value at ${observation.time_period.iso_period}.`,
          value: observation.value,
        });
      }
      continue;
    }

    normalizedObservations.push({
      observation,
      value: parsed,
      periodKey: getInsObservationPeriodKey(observation),
      periodLabel: observation.time_period.iso_period,
      unitLabel: getInsObservationUnitLabel(observation),
    });
  }

  if (normalizedObservations.length === 0) {
    warnings.push({
      type: 'empty_series',
      seriesId: series.id,
      message: `No numeric INS values available for dataset ${series.datasetCode}.`,
    });

    return {
      series: {
        seriesId: series.id,
        xAxis: { name: 'Period', type: 'STRING', unit: normalizePeriodicityForChart(effectivePeriodicity) },
        yAxis: { name: 'Value', type: 'FLOAT', unit: series.unit || '' },
        data: [],
      },
      warnings,
    };
  }

  const unitSet = new Set(normalizedObservations.map((entry) => entry.unitLabel || '').filter((entry) => entry.length > 0));

  if (unitSet.size > 1) {
    warnings.push({
      type: 'invalid_y_value',
      seriesId: series.id,
      message: `INS series has mixed units (${Array.from(unitSet).join(', ')}). Please filter to a single unit.`,
      value: Array.from(unitSet),
    });

    return {
      series: {
        seriesId: series.id,
        xAxis: { name: 'Period', type: 'STRING', unit: normalizePeriodicityForChart(effectivePeriodicity) },
        yAxis: { name: 'Value', type: 'FLOAT', unit: series.unit || '' },
        data: [],
      },
      warnings,
    };
  }

  const grouped = new Map<string, { periodKey: number; values: number[] }>();

  normalizedObservations
    .sort((left, right) => left.periodKey - right.periodKey)
    .forEach((entry) => {
      const existing = grouped.get(entry.periodLabel);
      if (existing) {
        existing.values.push(entry.value);
      } else {
        grouped.set(entry.periodLabel, {
          periodKey: entry.periodKey,
          values: [entry.value],
        });
      }
    });

  const data = Array.from(grouped.entries())
    .map(([periodLabel, payload]) => {
      const value = reduceInsObservationValues(payload.values, series.aggregation ?? 'sum');
      if (value == null || !Number.isFinite(value)) return null;
      return {
        x: periodLabel,
        y: value,
        periodKey: payload.periodKey,
      };
    })
    .filter((point): point is { x: string; y: number; periodKey: number } => point !== null)
    .sort((left, right) => left.periodKey - right.periodKey)
    .map(({ x, y }) => ({ x, y }));

  const inferredUnit = Array.from(unitSet)[0] ?? '';
  const xAxisUnitFromPeriod = normalizePeriodTypeForChart(series.period?.type);

  return {
    series: {
      seriesId: series.id,
      xAxis: {
        name: 'Period',
        type: 'STRING',
        unit: xAxisUnitFromPeriod ?? normalizePeriodicityForChart(effectivePeriodicity),
      },
      yAxis: {
        name: 'Value',
        type: 'FLOAT',
        unit: series.unit || inferredUnit,
      },
      data,
    },
    warnings,
  };
}

export const insSeriesRuntimeMapper: InsSeriesRuntimeMapper = {
  mapSeries: async ({ series }) => mapInsSeriesToAnalyticsSeries(series),
};

export function buildInsSeriesObservationFilter(series: InsSeriesConfiguration): InsObservationFilterInput {
  return buildObservationFilter(series);
}
