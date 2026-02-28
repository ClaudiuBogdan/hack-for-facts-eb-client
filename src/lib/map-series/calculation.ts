import type { Calculation, Operand } from '@/schemas/charts';
import type { MapSupportedSeries } from '@/schemas/experimental-map';
import type {
  MapSeriesCalculationResult,
  MapSeriesVector,
  MapSeriesVectorCache,
  MapSeriesWarning,
} from '@/lib/map-series/interfaces';

interface CalculateMapSeriesValuesParams {
  series: MapSupportedSeries[];
  baseValuesBySeriesId: MapSeriesVectorCache;
  unitsBySeriesId?: Map<string, string | undefined>;
  sparseCoverageThreshold?: number;
}

const DEFAULT_SPARSE_COVERAGE_THRESHOLD = 0.4;
const MAX_PER_SERIES_WARNING_COUNT = 20;

export function calculateMapSeriesValues(
  params: CalculateMapSeriesValuesParams
): MapSeriesCalculationResult {
  const seriesById = new Map(params.series.map((series) => [series.id, series]));
  const valuesBySeriesId: MapSeriesVectorCache = new Map();
  const unitsBySeriesId = new Map(params.unitsBySeriesId ?? []);
  const warnings: MapSeriesWarning[] = [];
  const warningDedup = new Set<string>();
  const warningCountBySeriesAndType = new Map<string, number>();

  const pushWarning = (warning: MapSeriesWarning) => {
    const dedupeKey = [
      warning.type,
      warning.seriesId ?? '',
      warning.dependencySeriesId ?? '',
      warning.sirutaCode ?? '',
      warning.message,
    ].join('::');
    if (warningDedup.has(dedupeKey)) {
      return;
    }

    if (warning.seriesId) {
      const seriesCounterKey = `${warning.seriesId}::${warning.type}`;
      const currentCount = warningCountBySeriesAndType.get(seriesCounterKey) ?? 0;
      if (currentCount >= MAX_PER_SERIES_WARNING_COUNT) {
        return;
      }
      warningCountBySeriesAndType.set(seriesCounterKey, currentCount + 1);
    }

    warningDedup.add(dedupeKey);
    warnings.push(warning);
  };

  const allSirutaCodes = new Set<string>();
  for (const [seriesId, vector] of params.baseValuesBySeriesId.entries()) {
    valuesBySeriesId.set(seriesId, new Map(vector));
    for (const sirutaCode of vector.keys()) {
      allSirutaCodes.add(sirutaCode);
    }
  }

  for (const series of params.series) {
    if (!unitsBySeriesId.has(series.id)) {
      unitsBySeriesId.set(series.id, series.unit);
    }
  }

  const visiting = new Set<string>();

  const evaluateSeries = (seriesId: string): MapSeriesVector | undefined => {
    if (valuesBySeriesId.has(seriesId)) {
      return valuesBySeriesId.get(seriesId);
    }

    const series = seriesById.get(seriesId);
    if (!series) {
      pushWarning({
        type: 'missing_dependency',
        seriesId,
        message: `Series ${seriesId} is missing and cannot be evaluated`,
      });
      return undefined;
    }

    if (series.type !== 'aggregated-series-calculation') {
      const baseVector = params.baseValuesBySeriesId.get(series.id) ?? new Map<string, number | undefined>();
      const nextVector = new Map(baseVector);
      valuesBySeriesId.set(series.id, nextVector);
      return nextVector;
    }

    if (visiting.has(seriesId)) {
      pushWarning({
        type: 'missing_dependency',
        seriesId,
        message: `Detected recursive calculation dependency while evaluating ${seriesId}`,
      });
      return undefined;
    }

    visiting.add(seriesId);

    const referencedSeriesIds = collectReferencedSeriesIds(series.calculation);
    for (const dependencySeriesId of referencedSeriesIds) {
      const dependencyVector = evaluateSeries(dependencySeriesId);
      if (!dependencyVector) {
        pushWarning({
          type: 'missing_dependency',
          seriesId: series.id,
          dependencySeriesId,
          message: `Calculation series depends on missing series ${dependencySeriesId}`,
        });
        continue;
      }

      for (const sirutaCode of dependencyVector.keys()) {
        allSirutaCodes.add(sirutaCode);
      }
    }

    const dependencyUnits = referencedSeriesIds
      .map((referenceId) => unitsBySeriesId.get(referenceId))
      .filter((unit): unit is string => !!unit && unit.trim().length > 0);
    const uniqueDependencyUnits = Array.from(new Set(dependencyUnits));

    if (!series.unit && uniqueDependencyUnits.length > 1) {
      pushWarning({
        type: 'mixed_unit',
        seriesId,
        message: `Calculation series ${series.label || series.id} mixes incompatible units`,
        details: {
          units: uniqueDependencyUnits,
        },
      });
    }

    if (!series.unit && uniqueDependencyUnits.length > 0) {
      unitsBySeriesId.set(series.id, uniqueDependencyUnits[0]);
    }

    if (series.unit) {
      unitsBySeriesId.set(series.id, series.unit);
    }

    const vector = new Map<string, number | undefined>();

    for (const sirutaCode of allSirutaCodes) {
      const value = evaluateOperand(series.calculation, sirutaCode, series.id, evaluateSeries, pushWarning);
      vector.set(sirutaCode, value);
    }

    visiting.delete(seriesId);
    valuesBySeriesId.set(seriesId, vector);

    const sparseCoverageThreshold =
      typeof params.sparseCoverageThreshold === 'number'
        ? params.sparseCoverageThreshold
        : DEFAULT_SPARSE_COVERAGE_THRESHOLD;
    maybePushSparseCoverageWarning(series.id, vector, sparseCoverageThreshold, pushWarning);

    return vector;
  };

  for (const series of params.series) {
    evaluateSeries(series.id);
  }

  return {
    valuesBySeriesId,
    unitsBySeriesId,
    warnings,
  };
}

function evaluateOperand(
  operand: Operand,
  sirutaCode: string,
  seriesId: string,
  evaluateSeries: (seriesId: string) => MapSeriesVector | undefined,
  pushWarning: (warning: MapSeriesWarning) => void
): number | undefined {
  if (typeof operand === 'number') {
    return operand;
  }

  if (typeof operand === 'string') {
    const dependencyVector = evaluateSeries(operand);
    if (!dependencyVector) {
      pushWarning({
        type: 'missing_dependency',
        seriesId,
        dependencySeriesId: operand,
        message: `Calculation series depends on missing series ${operand}`,
      });
      return undefined;
    }

    return dependencyVector.get(sirutaCode);
  }

  const args = operand.args.map((arg) =>
    evaluateOperand(arg, sirutaCode, seriesId, evaluateSeries, pushWarning)
  );

  if (args.some((value) => value === undefined)) {
    pushWarning({
      type: 'undefined_merge_result',
      seriesId,
      sirutaCode,
      message: `Undefined value propagated while evaluating ${seriesId}`,
    });
    return undefined;
  }

  return applyOperation(operand.op, args as number[], seriesId, sirutaCode, pushWarning);
}

function applyOperation(
  operation: Calculation['op'],
  values: number[],
  seriesId: string,
  sirutaCode: string,
  pushWarning: (warning: MapSeriesWarning) => void
): number | undefined {
  if (values.length === 0) {
    return undefined;
  }

  if (operation === 'sum') {
    return values.reduce((accumulator, value) => accumulator + value, 0);
  }

  if (operation === 'subtract') {
    const [head, ...tail] = values;
    return tail.reduce((accumulator, value) => accumulator - value, head);
  }

  if (operation === 'multiply') {
    return values.reduce((accumulator, value) => accumulator * value, 1);
  }

  const [numerator, ...divisors] = values;
  let result = numerator;
  for (const divisor of divisors) {
    if (divisor === 0) {
      pushWarning({
        type: 'divide_by_zero',
        seriesId,
        sirutaCode,
        message: `Division by zero in ${seriesId}`,
      });
      return undefined;
    }
    result /= divisor;
  }

  return Number.isFinite(result) ? result : undefined;
}

function collectReferencedSeriesIds(calculation: Calculation): string[] {
  const dependencies = new Set<string>();

  const visit = (operand: Operand) => {
    if (typeof operand === 'string') {
      dependencies.add(operand);
      return;
    }

    if (typeof operand === 'number') {
      return;
    }

    for (const argument of operand.args) {
      visit(argument);
    }
  };

  visit(calculation);

  return Array.from(dependencies);
}

function maybePushSparseCoverageWarning(
  seriesId: string,
  vector: MapSeriesVector,
  threshold: number,
  pushWarning: (warning: MapSeriesWarning) => void
) {
  if (vector.size === 0) {
    return;
  }

  let definedCount = 0;
  for (const value of vector.values()) {
    if (value !== undefined) {
      definedCount += 1;
    }
  }

  const coverage = definedCount / vector.size;
  if (coverage < threshold) {
    pushWarning({
      type: 'sparse_coverage',
      seriesId,
      message: `Series ${seriesId} covers ${Math.round(coverage * 100)}% of UAT values`,
      details: {
        coverage,
        definedCount,
        totalCount: vector.size,
      },
    });
  }
}
