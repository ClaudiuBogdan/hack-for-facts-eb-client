import {
  buildInsSeriesObservationFilter,
  getInsObservationPeriodKey,
  getInsObservationUnitLabel,
  insObservationMatchesClassificationSelection,
  mapReportPeriodTypeToInsPeriodicity,
  parseInsObservationValue,
  reduceInsObservationValues,
  selectDefaultInsPeriodicity,
} from '@/lib/ins-chart-series-utils';
import type { InsSeriesConfiguration } from '@/schemas/charts';
import type { InsObservation, InsObservationFilterInput } from '@/schemas/ins';
import type { PeriodDate, ReportPeriodInput } from '@/schemas/reporting';
import type { InsSeriesScalarResult, MapSeriesWarning } from '@/lib/map-series/interfaces';

interface EvaluateInsSeriesToMapVectorInput {
  series: InsSeriesConfiguration;
  observations: InsObservation[];
}

function toStringSet(values?: string[]): Set<string> {
  return new Set((values ?? []).map((value) => value.trim()).filter((value) => value.length > 0));
}

function normalizeObservationPeriodDate(
  observation: InsObservation,
  type: ReportPeriodInput['type']
): PeriodDate | null {
  const period = observation.time_period;
  const year = String(period.year);

  if (type === 'YEAR') {
    return year as PeriodDate;
  }

  if (type === 'QUARTER') {
    if (!period.quarter || period.quarter < 1 || period.quarter > 4) {
      return null;
    }
    return `${year}-Q${period.quarter}` as PeriodDate;
  }

  if (!period.month || period.month < 1 || period.month > 12) {
    return null;
  }
  return `${year}-${String(period.month).padStart(2, '0')}` as PeriodDate;
}

function matchesPeriodFilter(
  observation: InsObservation,
  period: ReportPeriodInput | undefined
): boolean {
  if (!period) {
    return true;
  }

  const normalizedPeriodDate = normalizeObservationPeriodDate(observation, period.type);
  if (!normalizedPeriodDate) {
    return false;
  }

  if (period.selection.dates) {
    const dates = toStringSet(period.selection.dates as string[]);
    return dates.has(normalizedPeriodDate);
  }

  const interval = period.selection.interval;
  if (!interval) {
    return true;
  }

  return normalizedPeriodDate >= interval.start && normalizedPeriodDate <= interval.end;
}

function createRawObservationFilterMatcher(filter: InsObservationFilterInput) {
  const territoryCodes = toStringSet(filter.territoryCodes);
  const sirutaCodes = toStringSet(filter.sirutaCodes);
  const unitCodes = toStringSet(filter.unitCodes);
  const classificationTypeCodes = toStringSet(filter.classificationTypeCodes);
  const classificationValueCodes = toStringSet(filter.classificationValueCodes);

  return (observation: InsObservation): boolean => {
    if (filter.hasValue !== false) {
      const value = observation.value?.trim();
      if (!value) {
        return false;
      }
    }

    if (territoryCodes.size > 0) {
      const territoryCode = observation.territory?.code?.trim() ?? '';
      if (!territoryCodes.has(territoryCode)) {
        return false;
      }
    }

    if (sirutaCodes.size > 0) {
      const sirutaCode = observation.territory?.siruta_code?.trim() ?? '';
      if (!sirutaCodes.has(sirutaCode)) {
        return false;
      }
    }

    if (unitCodes.size > 0) {
      const unitCode = observation.unit?.code?.trim() ?? '';
      if (!unitCodes.has(unitCode)) {
        return false;
      }
    }

    if (classificationTypeCodes.size > 0) {
      const hasMatchingType = (observation.classifications ?? []).some((classification) =>
        classificationTypeCodes.has(classification.type_code?.trim() ?? '')
      );
      if (!hasMatchingType) {
        return false;
      }
    }

    if (classificationValueCodes.size > 0) {
      const hasMatchingValue = (observation.classifications ?? []).some((classification) =>
        classificationValueCodes.has(classification.code?.trim() ?? '')
      );
      if (!hasMatchingValue) {
        return false;
      }
    }

    return matchesPeriodFilter(observation, filter.period);
  };
}

function resolveOutputUnit(
  unitOverride: string | undefined,
  units: Set<string>
): string | undefined {
  const normalizedOverride = unitOverride?.trim();
  if (normalizedOverride && normalizedOverride.length > 0) {
    return normalizedOverride;
  }

  const normalizedUnits = [...units].filter((value) => value.trim().length > 0);
  if (normalizedUnits.length === 0) {
    return undefined;
  }

  return normalizedUnits.sort((left, right) => left.localeCompare(right))[0];
}

export function evaluateInsSeriesToMapVector(
  input: EvaluateInsSeriesToMapVectorInput
): InsSeriesScalarResult {
  const { series, observations } = input;
  const warnings: MapSeriesWarning[] = [];

  if (!series.datasetCode || series.datasetCode.trim().length === 0) {
    warnings.push({
      type: 'ins_dataset_missing',
      seriesId: series.id,
      message: `INS series ${series.id} is missing datasetCode.`,
    });
    return {
      valuesBySiruta: new Map(),
      unit: series.unit,
      warnings,
    };
  }

  const observationFilter = buildInsSeriesObservationFilter(series);
  const rawFilterMatcher = createRawObservationFilterMatcher(observationFilter);
  const classSelection = series.classificationSelections ?? {};
  const filteredObservations = observations
    .filter((observation) => rawFilterMatcher(observation))
    .filter((observation) =>
      insObservationMatchesClassificationSelection(observation, classSelection)
    );

  if (filteredObservations.length === 0) {
    warnings.push({
      type: 'ins_no_observations',
      seriesId: series.id,
      message: `No INS observations matched filters for dataset ${series.datasetCode}.`,
    });

    return {
      valuesBySiruta: new Map(),
      unit: series.unit,
      warnings,
    };
  }

  const requestedPeriodicity = mapReportPeriodTypeToInsPeriodicity(series.period?.type);
  const effectivePeriodicity =
    requestedPeriodicity ?? selectDefaultInsPeriodicity(filteredObservations);

  if (!effectivePeriodicity) {
    warnings.push({
      type: 'ins_no_observations',
      seriesId: series.id,
      message: `Could not determine INS periodicity for dataset ${series.datasetCode}.`,
    });
    return {
      valuesBySiruta: new Map(),
      unit: series.unit,
      warnings,
    };
  }

  const periodicityFiltered = filteredObservations.filter(
    (observation) => observation.time_period.periodicity === effectivePeriodicity
  );

  if (periodicityFiltered.length === 0) {
    warnings.push({
      type: 'ins_no_observations',
      seriesId: series.id,
      message: `No INS observations available for periodicity ${effectivePeriodicity}.`,
      details: {
        periodicity: effectivePeriodicity,
      },
    });
    return {
      valuesBySiruta: new Map(),
      unit: series.unit,
      warnings,
    };
  }

  const groupedValuesBySiruta = new Map<string, Array<{ periodKey: number; value: number }>>();
  const observedUnits = new Set<string>();
  let skippedNoSirutaCount = 0;
  let skippedNonNumericCount = 0;

  for (const observation of periodicityFiltered) {
    const sirutaCode = observation.territory?.siruta_code?.trim();
    if (!sirutaCode) {
      skippedNoSirutaCount += 1;
      continue;
    }

    const parsedValue = parseInsObservationValue(observation.value);
    if (parsedValue == null) {
      skippedNonNumericCount += 1;
      continue;
    }

    const unitLabel = getInsObservationUnitLabel(observation).trim();
    if (unitLabel.length > 0) {
      observedUnits.add(unitLabel);
    }

    if (!groupedValuesBySiruta.has(sirutaCode)) {
      groupedValuesBySiruta.set(sirutaCode, []);
    }
    groupedValuesBySiruta.get(sirutaCode)?.push({
      periodKey: getInsObservationPeriodKey(observation),
      value: parsedValue,
    });
  }

  if (groupedValuesBySiruta.size === 0 && skippedNoSirutaCount > 0) {
    warnings.push({
      type: 'ins_no_siruta_values',
      seriesId: series.id,
      message: `INS observations matched dataset ${series.datasetCode} but none contained siruta_code.`,
      details: {
        skippedNoSirutaCount,
      },
    });
  }

  if (groupedValuesBySiruta.size === 0) {
    warnings.push({
      type: 'ins_no_observations',
      seriesId: series.id,
      message: `No numeric INS observations remained after filtering for dataset ${series.datasetCode}.`,
      details: {
        skippedNoSirutaCount,
        skippedNonNumericCount,
      },
    });
    return {
      valuesBySiruta: new Map(),
      unit: resolveOutputUnit(series.unit, observedUnits),
      warnings,
    };
  }

  const outputUnit = resolveOutputUnit(series.unit, observedUnits);
  if (!series.unit && observedUnits.size > 1) {
    warnings.push({
      type: 'ins_mixed_units',
      seriesId: series.id,
      message: `INS series ${series.id} has mixed units: ${[...observedUnits].join(', ')}`,
      details: {
        units: [...observedUnits].sort((left, right) => left.localeCompare(right)),
        resolvedUnit: outputUnit,
      },
    });
  }

  const aggregation = series.aggregation ?? 'sum';
  const valuesBySiruta = new Map<string, number | undefined>();

  for (const [sirutaCode, entries] of groupedValuesBySiruta.entries()) {
    const orderedValues = [...entries]
      .sort((left, right) => left.periodKey - right.periodKey)
      .map((entry) => entry.value);
    const reduced = reduceInsObservationValues(orderedValues, aggregation);
    if (reduced == null || !Number.isFinite(reduced)) {
      continue;
    }
    valuesBySiruta.set(sirutaCode, reduced);
  }

  if (valuesBySiruta.size === 0) {
    warnings.push({
      type: 'ins_no_observations',
      seriesId: series.id,
      message: `INS aggregation produced no defined values for dataset ${series.datasetCode}.`,
      details: {
        aggregation,
      },
    });
  }

  return {
    valuesBySiruta,
    unit: outputUnit,
    warnings,
  };
}
