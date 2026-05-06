import type { Calculation, Operand } from '@/schemas/charts';
import type { MapGroupWorkspace, MapSupportedSeries } from '@/schemas/advanced-map-analytics';
import {
  areSeriesDomainsEqual,
  evaluateGroupedValueSeries,
  getGroupedSeriesDomain,
  getSeriesDomainKey,
  getUatDomain,
} from '@/lib/map-series/grouping';
import type {
  MapSeriesCalculationResult,
  MapSeriesDomain,
  MapSeriesVector,
  MapSeriesVectorCache,
  MapSeriesWarning,
} from '@/lib/map-series/interfaces';

interface CalculateMapSeriesValuesParams {
  series: MapSupportedSeries[];
  baseValuesBySeriesId: MapSeriesVectorCache;
  groupWorkspaces?: MapGroupWorkspace[];
  unitsBySeriesId?: Map<string, string | undefined>;
  sparseCoverageThreshold?: number;
}

const DEFAULT_SPARSE_COVERAGE_THRESHOLD = 0.4;
const MAX_PER_SERIES_WARNING_COUNT = 20;

export function calculateMapSeriesValues(
  params: CalculateMapSeriesValuesParams
): MapSeriesCalculationResult {
  const seriesById = new Map(params.series.map((series) => [series.id, series]));
  const groupWorkspacesById = new Map((params.groupWorkspaces ?? []).map((grouping) => [grouping.id, grouping]));
  const valuesBySeriesId: MapSeriesVectorCache = new Map();
  const unitsBySeriesId = new Map(params.unitsBySeriesId ?? []);
  const domainsBySeriesId = new Map<string, MapSeriesDomain>();
  const keysByDomainKey = new Map<string, Set<string>>();
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

  const addDomainKey = (domain: MapSeriesDomain, key: string) => {
    const domainKey = getSeriesDomainKey(domain);
    const keys = keysByDomainKey.get(domainKey) ?? new Set<string>();
    keys.add(key);
    keysByDomainKey.set(domainKey, keys);
  };

  for (const [seriesId, vector] of params.baseValuesBySeriesId.entries()) {
    const domain = getUatDomain();
    valuesBySeriesId.set(seriesId, new Map(vector));
    domainsBySeriesId.set(seriesId, domain);
    for (const key of vector.keys()) {
      addDomainKey(domain, key);
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

    const isDerivedSeries =
      series.type === 'map-grouped-value-series' ||
      series.type === 'aggregated-series-calculation';
    if (isDerivedSeries && visiting.has(seriesId)) {
      pushWarning({
        type: 'missing_dependency',
        seriesId,
        message: `Detected recursive series dependency while evaluating ${seriesId}`,
      });
      return undefined;
    }

    if (series.type === 'map-grouped-value-series') {
      visiting.add(seriesId);
      const sourceVector = evaluateSeries(series.sourceSeriesId);
      const sourceDomain = domainsBySeriesId.get(series.sourceSeriesId);
      if (!sourceVector || !sourceDomain) {
        pushWarning({
          type: 'missing_dependency',
          seriesId: series.id,
          dependencySeriesId: series.sourceSeriesId,
          message: `Grouped series depends on missing source series ${series.sourceSeriesId}`,
        });
        const emptyVector = new Map<string, number | undefined>();
        valuesBySeriesId.set(series.id, emptyVector);
        domainsBySeriesId.set(series.id, getGroupedSeriesDomain(series));
        visiting.delete(seriesId);
        return emptyVector;
      }

      if (sourceDomain.type !== 'uat') {
        pushWarning({
          type: 'domain_mismatch',
          seriesId: series.id,
          dependencySeriesId: series.sourceSeriesId,
          message: `Grouped series ${series.label || series.id} can only aggregate UAT-domain source series.`,
          details: {
            sourceDomain,
          },
        });
        const emptyVector = new Map<string, number | undefined>();
        valuesBySeriesId.set(series.id, emptyVector);
        domainsBySeriesId.set(series.id, getGroupedSeriesDomain(series));
        visiting.delete(seriesId);
        return emptyVector;
      }

      const grouping = groupWorkspacesById.get(series.groupWorkspaceId);
      if (!grouping) {
        pushWarning({
          type: 'missing_grouping',
          seriesId: series.id,
          message: `Grouped series ${series.label || series.id} references missing grouping ${series.groupWorkspaceId}.`,
          details: {
            groupWorkspaceId: series.groupWorkspaceId,
          },
        });
        const emptyVector = new Map<string, number | undefined>();
        valuesBySeriesId.set(series.id, emptyVector);
        domainsBySeriesId.set(series.id, getGroupedSeriesDomain(series));
        visiting.delete(seriesId);
        return emptyVector;
      }

      const vector = evaluateGroupedValueSeries({
        series,
        grouping,
        sourceValues: sourceVector,
      });
      const domain = getGroupedSeriesDomain(series);
      valuesBySeriesId.set(series.id, vector);
      domainsBySeriesId.set(series.id, domain);
      for (const key of vector.keys()) {
        addDomainKey(domain, key);
      }

      const sourceUnit = unitsBySeriesId.get(series.sourceSeriesId);
      const seriesUnit = typeof series.unit === 'string' && series.unit.trim().length > 0
        ? series.unit
        : sourceUnit;
      unitsBySeriesId.set(series.id, seriesUnit);

      visiting.delete(seriesId);
      return vector;
    }

    if (series.type !== 'aggregated-series-calculation') {
      const baseVector = params.baseValuesBySeriesId.get(series.id) ?? new Map<string, number | undefined>();
      const nextVector = new Map(baseVector);
      const domain = getUatDomain();
      valuesBySeriesId.set(series.id, nextVector);
      domainsBySeriesId.set(series.id, domain);
      for (const key of nextVector.keys()) {
        addDomainKey(domain, key);
      }
      return nextVector;
    }

    visiting.add(seriesId);

    const dependencyDomains: MapSeriesDomain[] = [];
    const dependencyKeys = new Set<string>();
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

      const dependencyDomain = domainsBySeriesId.get(dependencySeriesId);
      if (dependencyDomain) {
        dependencyDomains.push(dependencyDomain);
      }

      for (const key of dependencyVector.keys()) {
        dependencyKeys.add(key);
      }
    }

    const calculationDomain = inferCalculationDomain({
      seriesId,
      dependencyDomains,
      pushWarning,
    });
    if (!calculationDomain) {
      const emptyVector = new Map<string, number | undefined>();
      visiting.delete(seriesId);
      valuesBySeriesId.set(series.id, emptyVector);
      return emptyVector;
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
    const calculationKeys = dependencyKeys.size > 0
      ? dependencyKeys
      : (keysByDomainKey.get(getSeriesDomainKey(calculationDomain)) ?? new Set<string>());

    for (const key of calculationKeys) {
      const value = evaluateOperand(series.calculation, key, series.id, evaluateSeries, pushWarning);
      vector.set(key, value);
    }

    visiting.delete(seriesId);
    valuesBySeriesId.set(seriesId, vector);
    domainsBySeriesId.set(seriesId, calculationDomain);
    for (const key of vector.keys()) {
      addDomainKey(calculationDomain, key);
    }

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
    domainsBySeriesId,
    warnings,
  };
}

function inferCalculationDomain(params: {
  seriesId: string;
  dependencyDomains: MapSeriesDomain[];
  pushWarning: (warning: MapSeriesWarning) => void;
}): MapSeriesDomain | undefined {
  if (params.dependencyDomains.length === 0) {
    return getUatDomain();
  }

  const [firstDomain] = params.dependencyDomains;
  if (!firstDomain) {
    return getUatDomain();
  }

  const mismatchedDomain = params.dependencyDomains.find(
    (domain) => !areSeriesDomainsEqual(domain, firstDomain)
  );
  if (!mismatchedDomain) {
    return firstDomain;
  }

  params.pushWarning({
    type: 'domain_mismatch',
    seriesId: params.seriesId,
    message: `Calculation series ${params.seriesId} references incompatible series domains.`,
    details: {
      domains: params.dependencyDomains.map((domain) => getSeriesDomainKey(domain)),
    },
  });

  return undefined;
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
