import { describe, expect, it } from 'vitest';
import { AdvancedMapAnalyticsBinSchema, AdvancedMapAnalyticsBinsPresetConfigSchema } from '@/schemas/advanced-map-analytics';
import {
  applyGradientColorsToBins,
  classifySeriesValues,
  classifyValue,
  generateSequentialBins,
  NO_DATA_GROUP_ID,
  normalizeContinuousPercentilesForCommit,
  validateBinsConfig,
} from '@/lib/map-bins/bins';

describe('map-bins', () => {
  it('applies continuous percentile defaults when missing from serialized config', () => {
    const parsedConfig = AdvancedMapAnalyticsBinsPresetConfigSchema.parse({});

    expect(parsedConfig.intervalMode).toBe('discrete');
    expect(parsedConfig.continuousPercentiles).toEqual({ min: 5, max: 95 });
  });

  it('rejects invalid continuous percentile pairs in schema', () => {
    const parsedConfig = AdvancedMapAnalyticsBinsPresetConfigSchema.safeParse({
      continuousPercentiles: {
        min: 50,
        max: 50,
      },
    });

    expect(parsedConfig.success).toBe(false);
  });

  it('accepts continuous mode without bins and ignores discrete bin structure checks', () => {
    const config = AdvancedMapAnalyticsBinsPresetConfigSchema.parse({
      intervalMode: 'continuous',
      bins: [
        {
          min: 100,
          max: 10,
          label: 'invalid range',
          color: '#ff0000',
        },
      ],
    });

    const validationResult = validateBinsConfig(config);
    expect(validationResult.isValid).toBe(true);
  });

  it('rejects out-of-range continuous percentiles during validation', () => {
    const config = AdvancedMapAnalyticsBinsPresetConfigSchema.parse({
      intervalMode: 'continuous',
      continuousPercentiles: {
        min: 5,
        max: 95,
      },
    });

    const validationResult = validateBinsConfig({
      ...config,
      continuousPercentiles: {
        min: -1,
        max: 120,
      },
    });

    expect(validationResult.isValid).toBe(false);
    expect(validationResult.errors.join(' ')).toContain('between 0 and 100');
  });

  it('normalizes percentile edits by clamping and preserving opposite bound', () => {
    const current = { min: 5, max: 95 };
    const normalizedMin = normalizeContinuousPercentilesForCommit(current, 'min', 100);
    const normalizedMax = normalizeContinuousPercentilesForCommit(current, 'max', 2);

    expect(normalizedMin.max).toBe(95);
    expect(normalizedMin.min).toBeLessThan(normalizedMin.max);
    expect(normalizedMax.min).toBe(5);
    expect(normalizedMax.max).toBeGreaterThan(normalizedMax.min);
  });

  it('classifies null/NaN as NO_DATA', () => {
    const firstBin = AdvancedMapAnalyticsBinSchema.parse({
      min: 0,
      max: null,
      label: '>= 0',
      color: '#ff0000',
    });
    const config = AdvancedMapAnalyticsBinsPresetConfigSchema.parse({
      bins: [firstBin],
    });

    expect(classifyValue(undefined, config).groupId).toBe(NO_DATA_GROUP_ID);
    expect(classifyValue(Number.NaN, config).groupId).toBe(NO_DATA_GROUP_ID);
  });

  it('uses [min, max) semantics and open-ended top bin', () => {
    const firstBin = AdvancedMapAnalyticsBinSchema.parse({
      min: 0,
      max: 10,
      label: '0-10',
      color: '#ff0000',
    });
    const secondBin = AdvancedMapAnalyticsBinSchema.parse({
      min: 10,
      max: null,
      label: '>=10',
      color: '#00ff00',
    });
    const config = AdvancedMapAnalyticsBinsPresetConfigSchema.parse({
      bins: [firstBin, secondBin],
    });

    expect(classifyValue(9.999, config).groupId).toBe(firstBin.id);
    expect(classifyValue(10, config).groupId).toBe(secondBin.id);
    expect(classifyValue(1000, config).groupId).toBe(secondBin.id);
  });

  it('maps out-of-range values to NO_DATA when there are gaps', () => {
    const firstBin = AdvancedMapAnalyticsBinSchema.parse({
      min: 0,
      max: 10,
      label: '0-10',
      color: '#ff0000',
    });
    const secondBin = AdvancedMapAnalyticsBinSchema.parse({
      min: 20,
      max: null,
      label: '>=20',
      color: '#00ff00',
    });
    const config = AdvancedMapAnalyticsBinsPresetConfigSchema.parse({
      bins: [firstBin, secondBin],
    });

    expect(classifyValue(15, config).groupId).toBe('NO_DATA');
  });

  it('skips disabled bins during classification and palette generation', () => {
    const disabledBin = AdvancedMapAnalyticsBinSchema.parse({
      min: 0,
      max: 10,
      label: '0-10',
      color: '#ff0000',
      disabled: true,
    });
    const enabledBin = AdvancedMapAnalyticsBinSchema.parse({
      min: 10,
      max: null,
      label: '>=10',
      color: '#00ff00',
    });
    const config = AdvancedMapAnalyticsBinsPresetConfigSchema.parse({
      bins: [disabledBin, enabledBin],
    });

    const classificationResult = classifySeriesValues(
      new Map([
        ['1001', 5],
        ['1002', 15],
      ]),
      config
    );

    expect(classificationResult.groupsBySiruta.get('1001')?.groupId).toBe('NO_DATA');
    expect(classificationResult.groupsBySiruta.get('1002')?.groupId).toBe(enabledBin.id);
    expect(classificationResult.palette.map((entry) => entry.groupId)).toEqual([enabledBin.id, 'NO_DATA']);
  });

  it('validates overlaps as invalid while allowing gaps', () => {
    const overlapFirstBin = AdvancedMapAnalyticsBinSchema.parse({
      min: 0,
      max: 10,
      label: '',
      color: '#ff0000',
    });
    const overlapSecondBin = AdvancedMapAnalyticsBinSchema.parse({
      min: 9,
      max: null,
      label: '',
      color: '#00ff00',
    });
    const overlapping = AdvancedMapAnalyticsBinsPresetConfigSchema.parse({
      bins: [overlapFirstBin, overlapSecondBin],
    });
    const overlapResult = validateBinsConfig(overlapping);
    expect(overlapResult.isValid).toBe(false);
    expect(overlapResult.errors.join(' ')).toContain('overlaps');

    const gapFirstBin = AdvancedMapAnalyticsBinSchema.parse({
      min: 0,
      max: 10,
      label: '',
      color: '#ff0000',
    });
    const gapSecondBin = AdvancedMapAnalyticsBinSchema.parse({
      min: 15,
      max: null,
      label: '',
      color: '#00ff00',
    });
    const gapped = AdvancedMapAnalyticsBinsPresetConfigSchema.parse({
      bins: [gapFirstBin, gapSecondBin],
    });
    const gapResult = validateBinsConfig(gapped);
    expect(gapResult.isValid).toBe(true);
  });

  it('classifies series vectors and returns deterministic palette', () => {
    const firstBin = AdvancedMapAnalyticsBinSchema.parse({
      min: 0,
      max: 100,
      label: '0-100',
      color: '#ff0000',
    });
    const secondBin = AdvancedMapAnalyticsBinSchema.parse({
      min: 100,
      max: null,
      label: '>=100',
      color: '#00ff00',
    });
    const config = AdvancedMapAnalyticsBinsPresetConfigSchema.parse({
      bins: [firstBin, secondBin],
    });

    const values = new Map<string, number | undefined>([
      ['1001', 50],
      ['1002', 150],
      ['1003', undefined],
    ]);

    const result = classifySeriesValues(values, config);
    expect(result.groupsBySiruta.get('1001')?.groupId).toBe(firstBin.id);
    expect(result.groupsBySiruta.get('1002')?.groupId).toBe(secondBin.id);
    expect(result.groupsBySiruta.get('1003')?.groupId).toBe('NO_DATA');
    expect(result.palette.map((entry) => entry.groupId)).toEqual([firstBin.id, secondBin.id, 'NO_DATA']);
  });

  it('generates sequential bins with open-ended last bin', () => {
    const bins = generateSequentialBins([10, 20, 30, 40, 50], 5, 'manual', {
      startColor: '#fff7bc',
      endColor: '#d7301f',
    });

    expect(bins).toHaveLength(5);
    expect(bins[4]?.max).toBeNull();
    expect(bins[0]?.min).toBe(10);
    expect(new Set(bins.map((bin) => bin.id)).size).toBe(bins.length);
  });

  it('applies gradient colors to existing bins', () => {
    const baseBins = generateSequentialBins([100, 200, 300], 3, 'manual', {
      startColor: '#fff7bc',
      endColor: '#d7301f',
    });
    const gradientBins = applyGradientColorsToBins(baseBins, {
      startColor: '#0000ff',
      endColor: '#ff0000',
    });

    expect(gradientBins).toHaveLength(baseBins.length);
    expect(gradientBins[0]?.color).toBe('#0000ff');
    expect(gradientBins[gradientBins.length - 1]?.color).toBe('#ff0000');
  });

  it('prefers rounded boundaries for uneven ranges', () => {
    const bins = generateSequentialBins([227, 47_699.4, 95_171.8, 142_644.2, 190_116.6], 5, 'manual', {
      startColor: '#fff7bc',
      endColor: '#d7301f',
    });

    expect(bins).toHaveLength(5);
    expect(bins.map((bin) => bin.min)).toEqual([0, 40_000, 80_000, 120_000, 160_000]);
    expect(bins.map((bin) => bin.max)).toEqual([40_000, 80_000, 120_000, 160_000, null]);
  });
});
