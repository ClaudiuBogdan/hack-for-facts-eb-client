import { describe, expect, it } from 'vitest';
import { applyExperimentalMapValueFilters } from '@/lib/map-series/value-filters';
import {
  createDefaultExperimentalMapStatsValueFilterRule,
  createDefaultExperimentalMapValueFilterRule,
} from '@/schemas/experimental-map';
import type { MapSeriesVectorCache } from '@/lib/map-series/interfaces';

function createVectorCache(values: Record<string, Record<string, number | undefined>>): MapSeriesVectorCache {
  const cache: MapSeriesVectorCache = new Map();

  for (const [seriesId, vectorValues] of Object.entries(values)) {
    cache.set(seriesId, new Map(Object.entries(vectorValues)));
  }

  return cache;
}

describe('applyExperimentalMapValueFilters', () => {
  it('evaluates mixed AND/OR rules left-to-right', () => {
    const allValuesBySeriesId = createVectorCache({
      active: {
        s1: 5,
        s2: 15,
        s3: 25,
        s4: 35,
      },
    });

    const firstRule = createDefaultExperimentalMapValueFilterRule();
    firstRule.operator = 'lt';
    firstRule.value = 30;

    const secondRule = createDefaultExperimentalMapValueFilterRule();
    secondRule.joinWithPrevious = 'OR';
    secondRule.operator = 'gt';
    secondRule.value = 10;

    const thirdRule = createDefaultExperimentalMapValueFilterRule();
    thirdRule.joinWithPrevious = 'AND';
    thirdRule.operator = 'lt';
    thirdRule.value = 20;

    const result = applyExperimentalMapValueFilters({
      allValuesBySeriesId,
      displayValuesBySeriesId: allValuesBySeriesId,
      activeSeriesId: 'active',
      rules: [firstRule, secondRule, thirdRule],
    });

    const filteredVector = result.valuesBySeriesId.get('active');
    expect(filteredVector?.has('s1')).toBe(true);
    expect(filteredVector?.has('s2')).toBe(true);
    expect(filteredVector?.has('s3')).toBe(false);
    expect(filteredVector?.has('s4')).toBe(false);
  });

  it('evaluates AND stats rules on current band', () => {
    const valuesBySeriesId = createVectorCache({
      active: {
        s1: 10,
        s2: 9,
        s3: 8,
        s4: 7,
        s5: 6,
      },
    });

    const thresholdRule = createDefaultExperimentalMapValueFilterRule();
    thresholdRule.operator = 'lt';
    thresholdRule.value = 9;

    const rankRule = createDefaultExperimentalMapStatsValueFilterRule('rank');
    rankRule.joinWithPrevious = 'AND';
    rankRule.direction = 'top';
    rankRule.count = 1;

    const result = applyExperimentalMapValueFilters({
      allValuesBySeriesId: valuesBySeriesId,
      displayValuesBySeriesId: valuesBySeriesId,
      activeSeriesId: 'active',
      rules: [thresholdRule, rankRule],
    });

    const filteredVector = result.valuesBySeriesId.get('active');
    expect(filteredVector?.has('s3')).toBe(true);
    expect(filteredVector?.size).toBe(1);
  });

  it('evaluates OR stats rules on global baseline and unions results', () => {
    const valuesBySeriesId = createVectorCache({
      active: {
        s1: 10,
        s2: 9,
        s3: 8,
        s4: 7,
        s5: 6,
      },
    });

    const thresholdRule = createDefaultExperimentalMapValueFilterRule();
    thresholdRule.operator = 'lt';
    thresholdRule.value = 9;

    const rankRule = createDefaultExperimentalMapStatsValueFilterRule('rank');
    rankRule.joinWithPrevious = 'OR';
    rankRule.direction = 'top';
    rankRule.count = 1;

    const result = applyExperimentalMapValueFilters({
      allValuesBySeriesId: valuesBySeriesId,
      displayValuesBySeriesId: valuesBySeriesId,
      activeSeriesId: 'active',
      rules: [thresholdRule, rankRule],
    });

    const filteredVector = result.valuesBySeriesId.get('active');
    expect(filteredVector?.has('s1')).toBe(true);
    expect(filteredVector?.has('s3')).toBe(true);
    expect(filteredVector?.has('s4')).toBe(true);
    expect(filteredVector?.has('s5')).toBe(true);
    expect(filteredVector?.size).toBe(4);
  });

  it('skips disabled rules', () => {
    const valuesBySeriesId = createVectorCache({
      active: {
        s1: 5,
        s2: 15,
      },
    });

    const enabledRule = createDefaultExperimentalMapValueFilterRule();
    enabledRule.operator = 'gt';
    enabledRule.value = 0;

    const disabledRule = createDefaultExperimentalMapValueFilterRule();
    disabledRule.enabled = false;
    disabledRule.operator = 'lt';
    disabledRule.value = 0;

    const result = applyExperimentalMapValueFilters({
      allValuesBySeriesId: valuesBySeriesId,
      displayValuesBySeriesId: valuesBySeriesId,
      activeSeriesId: 'active',
      rules: [enabledRule, disabledRule],
    });

    expect(result.valuesBySeriesId.get('active')?.size).toBe(2);
    expect(result.warnings).toEqual([]);
  });

  it('supports all threshold operators with undefined-safe semantics', () => {
    const valuesBySeriesId = createVectorCache({
      active: {
        match: 10,
        equalWithinEpsilon: 10 + 1e-10,
        below: 9,
        above: 11,
        undefinedValue: undefined,
      },
    });

    const baseRule = createDefaultExperimentalMapValueFilterRule();
    baseRule.operator = 'eq';
    baseRule.value = 10;
    const eqResult = applyExperimentalMapValueFilters({
      allValuesBySeriesId: valuesBySeriesId,
      displayValuesBySeriesId: valuesBySeriesId,
      activeSeriesId: 'active',
      rules: [baseRule],
    });
    expect(eqResult.valuesBySeriesId.get('active')?.has('match')).toBe(true);
    expect(eqResult.valuesBySeriesId.get('active')?.has('equalWithinEpsilon')).toBe(true);
    expect(eqResult.valuesBySeriesId.get('active')?.has('below')).toBe(false);

    const neqRule = createDefaultExperimentalMapValueFilterRule();
    neqRule.operator = 'neq';
    neqRule.value = 10;
    const neqResult = applyExperimentalMapValueFilters({
      allValuesBySeriesId: valuesBySeriesId,
      displayValuesBySeriesId: valuesBySeriesId,
      activeSeriesId: 'active',
      rules: [neqRule],
    });
    expect(neqResult.valuesBySeriesId.get('active')?.has('below')).toBe(true);
    expect(neqResult.valuesBySeriesId.get('active')?.has('undefinedValue')).toBe(false);

    const betweenRule = createDefaultExperimentalMapValueFilterRule();
    betweenRule.operator = 'between';
    betweenRule.value = 9;
    betweenRule.secondValue = 10;
    const betweenResult = applyExperimentalMapValueFilters({
      allValuesBySeriesId: valuesBySeriesId,
      displayValuesBySeriesId: valuesBySeriesId,
      activeSeriesId: 'active',
      rules: [betweenRule],
    });
    expect(betweenResult.valuesBySeriesId.get('active')?.has('below')).toBe(true);
    expect(betweenResult.valuesBySeriesId.get('active')?.has('match')).toBe(true);
    expect(betweenResult.valuesBySeriesId.get('active')?.has('above')).toBe(false);

    const notBetweenRule = createDefaultExperimentalMapValueFilterRule();
    notBetweenRule.operator = 'not_between';
    notBetweenRule.value = 9;
    notBetweenRule.secondValue = 10;
    const notBetweenResult = applyExperimentalMapValueFilters({
      allValuesBySeriesId: valuesBySeriesId,
      displayValuesBySeriesId: valuesBySeriesId,
      activeSeriesId: 'active',
      rules: [notBetweenRule],
    });
    expect(notBetweenResult.valuesBySeriesId.get('active')?.has('above')).toBe(true);
    expect(notBetweenResult.valuesBySeriesId.get('active')?.has('below')).toBe(false);

    const isUndefinedRule = createDefaultExperimentalMapValueFilterRule();
    isUndefinedRule.operator = 'is_undefined';
    const isUndefinedResult = applyExperimentalMapValueFilters({
      allValuesBySeriesId: valuesBySeriesId,
      displayValuesBySeriesId: valuesBySeriesId,
      activeSeriesId: 'active',
      rules: [isUndefinedRule],
    });
    expect(isUndefinedResult.valuesBySeriesId.get('active')?.has('undefinedValue')).toBe(true);

    const isDefinedRule = createDefaultExperimentalMapValueFilterRule();
    isDefinedRule.operator = 'is_defined';
    const isDefinedResult = applyExperimentalMapValueFilters({
      allValuesBySeriesId: valuesBySeriesId,
      displayValuesBySeriesId: valuesBySeriesId,
      activeSeriesId: 'active',
      rules: [isDefinedRule],
    });
    expect(isDefinedResult.valuesBySeriesId.get('active')?.has('undefinedValue')).toBe(false);
  });

  it('supports percentile, rank and median stats rules', () => {
    const valuesBySeriesId = createVectorCache({
      active: {
        s1: 1,
        s2: 2,
        s3: 3,
        s4: 4,
        s5: 100,
      },
    });

    const percentileRule = createDefaultExperimentalMapStatsValueFilterRule('percentile_band');
    percentileRule.minPercentile = 0;
    percentileRule.maxPercentile = 50;

    const percentileResult = applyExperimentalMapValueFilters({
      allValuesBySeriesId: valuesBySeriesId,
      displayValuesBySeriesId: valuesBySeriesId,
      activeSeriesId: 'active',
      rules: [percentileRule],
    });

    expect(percentileResult.valuesBySeriesId.get('active')?.has('s1')).toBe(true);
    expect(percentileResult.valuesBySeriesId.get('active')?.has('s3')).toBe(true);
    expect(percentileResult.valuesBySeriesId.get('active')?.has('s4')).toBe(false);

    const rankRule = createDefaultExperimentalMapStatsValueFilterRule('rank');
    rankRule.direction = 'top';
    rankRule.count = 2;

    const rankResult = applyExperimentalMapValueFilters({
      allValuesBySeriesId: valuesBySeriesId,
      displayValuesBySeriesId: valuesBySeriesId,
      activeSeriesId: 'active',
      rules: [rankRule],
    });

    expect(rankResult.valuesBySeriesId.get('active')?.has('s5')).toBe(true);
    expect(rankResult.valuesBySeriesId.get('active')?.has('s4')).toBe(true);
    expect(rankResult.valuesBySeriesId.get('active')?.size).toBe(2);

    const medianRule = createDefaultExperimentalMapStatsValueFilterRule('median_compare');
    medianRule.mode = 'gte';

    const medianResult = applyExperimentalMapValueFilters({
      allValuesBySeriesId: valuesBySeriesId,
      displayValuesBySeriesId: valuesBySeriesId,
      activeSeriesId: 'active',
      rules: [medianRule],
    });

    expect(medianResult.valuesBySeriesId.get('active')?.has('s3')).toBe(true);
    expect(medianResult.valuesBySeriesId.get('active')?.has('s5')).toBe(true);
    expect(medianResult.valuesBySeriesId.get('active')?.has('s1')).toBe(false);
  });

  it('supports zscore, iqr and robust z-score stats rules', () => {
    const valuesBySeriesId = createVectorCache({
      active: {
        s1: 1,
        s2: 2,
        s3: 3,
        s4: 4,
        s5: 100,
      },
    });

    const zScoreRule = createDefaultExperimentalMapStatsValueFilterRule('zscore');
    zScoreRule.mode = 'abs_gte';
    zScoreRule.threshold = 1;

    const zScoreResult = applyExperimentalMapValueFilters({
      allValuesBySeriesId: valuesBySeriesId,
      displayValuesBySeriesId: valuesBySeriesId,
      activeSeriesId: 'active',
      rules: [zScoreRule],
    });

    expect(zScoreResult.valuesBySeriesId.get('active')?.has('s5')).toBe(true);

    const iqrRule = createDefaultExperimentalMapStatsValueFilterRule('iqr_outlier');
    iqrRule.side = 'upper';
    iqrRule.multiplier = 1.5;

    const iqrResult = applyExperimentalMapValueFilters({
      allValuesBySeriesId: valuesBySeriesId,
      displayValuesBySeriesId: valuesBySeriesId,
      activeSeriesId: 'active',
      rules: [iqrRule],
    });

    expect(iqrResult.valuesBySeriesId.get('active')?.has('s5')).toBe(true);
    expect(iqrResult.valuesBySeriesId.get('active')?.size).toBe(1);

    const madRule = createDefaultExperimentalMapStatsValueFilterRule('mad_robust_zscore');
    madRule.threshold = 2;

    const madResult = applyExperimentalMapValueFilters({
      allValuesBySeriesId: valuesBySeriesId,
      displayValuesBySeriesId: valuesBySeriesId,
      activeSeriesId: 'active',
      rules: [madRule],
    });

    expect(madResult.valuesBySeriesId.get('active')?.has('s5')).toBe(true);
    expect(madResult.valuesBySeriesId.get('active')?.size).toBe(1);
  });

  it('uses deterministic rank tie-breaking by siruta code', () => {
    const valuesBySeriesId = createVectorCache({
      active: {
        s2: 10,
        s1: 10,
        s3: 9,
      },
    });

    const rankRule = createDefaultExperimentalMapStatsValueFilterRule('rank');
    rankRule.direction = 'top';
    rankRule.count = 1;

    const result = applyExperimentalMapValueFilters({
      allValuesBySeriesId: valuesBySeriesId,
      displayValuesBySeriesId: valuesBySeriesId,
      activeSeriesId: 'active',
      rules: [rankRule],
    });

    expect(result.valuesBySeriesId.get('active')?.has('s1')).toBe(true);
    expect(result.valuesBySeriesId.get('active')?.size).toBe(1);
  });

  it('filters display vectors by rules targeting non-display series', () => {
    const allValuesBySeriesId = createVectorCache({
      active: {
        s1: 100,
        s2: 200,
      },
      population: {
        s1: 5000,
        s2: 2000,
      },
    });

    const displayValuesBySeriesId = createVectorCache({
      active: {
        s1: 100,
        s2: 200,
      },
    });

    const populationRule = createDefaultExperimentalMapValueFilterRule();
    populationRule.seriesRef = {
      mode: 'series',
      seriesId: 'population',
    };
    populationRule.operator = 'gte';
    populationRule.value = 3000;

    const result = applyExperimentalMapValueFilters({
      allValuesBySeriesId,
      displayValuesBySeriesId,
      activeSeriesId: 'active',
      rules: [populationRule],
    });

    const filteredDisplay = result.valuesBySeriesId.get('active');
    expect(filteredDisplay?.has('s1')).toBe(true);
    expect(filteredDisplay?.has('s2')).toBe(false);
  });

  it('emits warnings for invalid rules and missing source series', () => {
    const valuesBySeriesId = createVectorCache({
      active: {
        s1: 10,
      },
    });

    const missingValueRule = createDefaultExperimentalMapValueFilterRule();
    missingValueRule.operator = 'gt';
    missingValueRule.value = undefined;

    const missingSeriesRule = createDefaultExperimentalMapValueFilterRule();
    missingSeriesRule.seriesRef = {
      mode: 'series',
      seriesId: 'missing-series',
    };
    missingSeriesRule.operator = 'is_defined';

    const missingActiveRule = createDefaultExperimentalMapValueFilterRule();
    missingActiveRule.seriesRef = {
      mode: 'active',
    };
    missingActiveRule.operator = 'is_defined';

    const invalidResult = applyExperimentalMapValueFilters({
      allValuesBySeriesId: valuesBySeriesId,
      displayValuesBySeriesId: valuesBySeriesId,
      activeSeriesId: 'active',
      rules: [missingValueRule, missingSeriesRule],
    });
    expect(
      invalidResult.warnings.some((warning) => warning.type === 'value_filter_invalid_rule')
    ).toBe(true);
    expect(
      invalidResult.warnings.some((warning) => warning.type === 'value_filter_missing_series')
    ).toBe(true);

    const missingActiveResult = applyExperimentalMapValueFilters({
      allValuesBySeriesId: valuesBySeriesId,
      displayValuesBySeriesId: valuesBySeriesId,
      activeSeriesId: undefined,
      rules: [missingActiveRule],
    });
    expect(
      missingActiveResult.warnings.some((warning) => warning.type === 'value_filter_missing_active_series')
    ).toBe(true);
  });

  it('emits stats warnings for invalid params and zero variance', () => {
    const valuesBySeriesId = createVectorCache({
      active: {
        s1: 10,
        s2: 10,
        s3: 10,
      },
    });

    const invalidPercentileRule = createDefaultExperimentalMapStatsValueFilterRule('percentile_band');
    invalidPercentileRule.minPercentile = -10;
    invalidPercentileRule.maxPercentile = 90;

    const zeroVarianceRule = createDefaultExperimentalMapStatsValueFilterRule('zscore');
    zeroVarianceRule.mode = 'abs_gte';
    zeroVarianceRule.threshold = 2;

    const result = applyExperimentalMapValueFilters({
      allValuesBySeriesId: valuesBySeriesId,
      displayValuesBySeriesId: valuesBySeriesId,
      activeSeriesId: 'active',
      rules: [invalidPercentileRule, zeroVarianceRule],
    });

    expect(result.valuesBySeriesId.get('active')?.size).toBe(3);
    expect(result.warnings.some((warning) => warning.type === 'value_filter_stats_invalid_parameters')).toBe(true);
    expect(result.warnings.some((warning) => warning.type === 'value_filter_stats_zero_variance')).toBe(true);
  });

  it('emits stats no-defined warning when source has no numeric values', () => {
    const valuesBySeriesId = createVectorCache({
      active: {
        s1: undefined,
        s2: undefined,
      },
    });

    const statsRule = createDefaultExperimentalMapStatsValueFilterRule('median_compare');

    const result = applyExperimentalMapValueFilters({
      allValuesBySeriesId: valuesBySeriesId,
      displayValuesBySeriesId: valuesBySeriesId,
      activeSeriesId: 'active',
      rules: [statsRule],
    });

    expect(result.warnings.some((warning) => warning.type === 'value_filter_stats_no_defined_values')).toBe(true);
    expect(result.valuesBySeriesId.get('active')?.size).toBe(2);
  });

  it('emits no-match warning when all rows are filtered out', () => {
    const valuesBySeriesId = createVectorCache({
      active: {
        s1: 10,
        s2: 20,
      },
    });

    const noMatchRule = createDefaultExperimentalMapValueFilterRule();
    noMatchRule.operator = 'lt';
    noMatchRule.value = 0;

    const result = applyExperimentalMapValueFilters({
      allValuesBySeriesId: valuesBySeriesId,
      displayValuesBySeriesId: valuesBySeriesId,
      activeSeriesId: 'active',
      rules: [noMatchRule],
    });

    expect(result.valuesBySeriesId.get('active')?.size).toBe(0);
    expect(
      result.warnings.some((warning) => warning.type === 'value_filter_no_matches')
    ).toBe(true);
  });
});
