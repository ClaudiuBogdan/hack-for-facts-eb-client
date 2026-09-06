import { describe, expect, it } from 'vitest';
import { getMapDecimalRange, normalizeMapDecimal, readMapDecimal, sumMapDecimals, mapDecimalToRenderNumber } from './decimal';
import { calculateMapSeriesValues } from './calculation';
import { parseGroupedSeriesWideCsv, serializeGroupedSeriesWideMatrixCsv } from './csv';
import { applyAdvancedMapAnalyticsValueFilters } from './value-filters';
import { classifyValue, generateSequentialBins, getContinuousGradientColor, validateBinsConfig } from '@/lib/map-bins/bins';
import {
  AdvancedMapAnalyticsBinsPresetConfigSchema,
  createDefaultAdvancedMapAnalyticsSeries,
  createDefaultAdvancedMapAnalyticsStatsValueFilterRule,
} from '@/schemas/advanced-map-analytics';

const LOW = '9007199254740992';
const HIGH = '9007199254740993';

describe('map decimal source values', () => {
  it('round trips adjacent large values and fractional text through CSV', () => {
    const rows = [
      { series_id: 's', siruta_code: '1', value: LOW },
      { series_id: 's', siruta_code: '2', value: HIGH },
      { series_id: 's', siruta_code: '3', value: '0.123456' },
    ];
    const parsed = parseGroupedSeriesWideCsv(serializeGroupedSeriesWideMatrixCsv(rows, ['s']), ['s']);
    expect([...parsed.valuesBySeriesId.get('s')!.values()]).toEqual(rows.map(row => row.value));
    expect(parsed.warnings).toEqual([]);
  });

  it('sums decimals and refuses incomplete groups or nonfinite results', () => {
    expect(sumMapDecimals(['0.1', '0.2'])).toBe('0.3');
    expect(sumMapDecimals([LOW, '1'])).toBe(HIGH);
    expect(sumMapDecimals(['10', undefined])).toBeUndefined();
    expect(sumMapDecimals(['10', 'NaN'])).toBeUndefined();
    expect(sumMapDecimals([])).toBeUndefined();
    expect(readMapDecimal('Infinity')).toBeUndefined();
    expect(readMapDecimal('1_000')).toBeUndefined();
  });

  it('refuses a numeric bin set that would omit unrepresentable values', () => {
    expect(generateSequentialBins(['10', '1e309'], 5, 'gradient', { startColor: '#000000', endColor: '#ffffff' })).toEqual([]);
    expect(mapDecimalToRenderNumber('invalid')).toBeUndefined();
    expect(mapDecimalToRenderNumber('')).toBeUndefined();
  });

  it('keeps numeric constant configuration and performs decimal arithmetic', () => {
    const source = createDefaultAdvancedMapAnalyticsSeries('line-items-aggregated-yearly');
    const calculation = createDefaultAdvancedMapAnalyticsSeries('aggregated-series-calculation');
    if (calculation.type !== 'aggregated-series-calculation') throw new Error('Unexpected series');
    calculation.calculation = { op: 'sum', args: [source.id, 0.2] };
    const result = calculateMapSeriesValues({
      series: [source, calculation],
      baseValuesBySeriesId: new Map([[source.id, new Map([['1', '0.1']])]]),
    });
    expect(result.valuesBySeriesId.get(calculation.id)?.get('1')).toBe('0.3');
    expect(calculation.calculation.args[1]).toBe(0.2);
  });

  it('ranks distinct values exactly even when their difference is tiny', () => {
    const values = new Map([['s', new Map([['a', '10'], ['z', '10.0000000001']])]]);
    const rule = createDefaultAdvancedMapAnalyticsStatsValueFilterRule('rank');
    rule.count = 1;
    rule.direction = 'top';
    const result = applyAdvancedMapAnalyticsValueFilters({
      allValuesBySeriesId: values,
      displayValuesBySeriesId: values,
      activeSeriesId: 's',
      rules: [rule],
    });
    expect([...result.valuesBySeriesId.get('s')!.keys()]).toEqual(['z']);
  });

  it('keeps distinct large values at opposite ends of the color scale', () => {
    const range = getMapDecimalRange([LOW, HIGH], 5, 95);
    expect(range).toEqual({ min: LOW, max: HIGH });
    expect(normalizeMapDecimal(LOW, range.min, range.max)).toBe(0);
    expect(normalizeMapDecimal(HIGH, range.min, range.max)).toBe(1);
    const gradient = { startColor: '#000000', endColor: '#ffffff' };
    expect(getContinuousGradientColor(LOW, range, gradient, '#ff0000')).toBe('#000000');
    expect(getContinuousGradientColor(HIGH, range, gradient, '#ff0000')).toBe('#ffffff');
  });

  it('compares source decimals against the existing numeric bin controls', () => {
    const config = AdvancedMapAnalyticsBinsPresetConfigSchema.parse({ bins: [
      { min: 0, max: 1, color: '#000000' },
      { min: 1, max: null, color: '#ffffff' },
    ] });
    expect(classifyValue('0.99999999999999999999', config).color).toBe('#000000');
    expect(classifyValue('1', config).color).toBe('#ffffff');
  });

  it.each(['9007199254740995', '-9007199254740995', '0.000001', '0.1234567', '0.0000006', '-0.1234567'])('automatic numeric bins include the original value %s', value => {
    const bins = generateSequentialBins([value], 5, 'gradient', { startColor: '#000000', endColor: '#ffffff' });
    const config = AdvancedMapAnalyticsBinsPresetConfigSchema.parse({ bins });
    expect(validateBinsConfig(config).isValid).toBe(true);
    expect(classifyValue(value, config).isNoData).toBe(false);
  });
});
