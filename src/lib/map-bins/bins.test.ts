import { describe, expect, it } from 'vitest';
import { ExperimentalMapBinSchema, ExperimentalMapBinsPresetConfigSchema } from '@/schemas/experimental-map';
import {
  applyGradientColorsToBins,
  classifySeriesValues,
  classifyValue,
  generateSequentialBins,
  NO_DATA_GROUP_ID,
  validateBinsConfig,
} from '@/lib/map-bins/bins';

describe('map-bins', () => {
  it('classifies null/NaN as NO_DATA', () => {
    const firstBin = ExperimentalMapBinSchema.parse({
      min: 0,
      max: null,
      label: '>= 0',
      color: '#ff0000',
    });
    const config = ExperimentalMapBinsPresetConfigSchema.parse({
      bins: [firstBin],
    });

    expect(classifyValue(undefined, config).groupId).toBe(NO_DATA_GROUP_ID);
    expect(classifyValue(Number.NaN, config).groupId).toBe(NO_DATA_GROUP_ID);
  });

  it('uses [min, max) semantics and open-ended top bin', () => {
    const firstBin = ExperimentalMapBinSchema.parse({
      min: 0,
      max: 10,
      label: '0-10',
      color: '#ff0000',
    });
    const secondBin = ExperimentalMapBinSchema.parse({
      min: 10,
      max: null,
      label: '>=10',
      color: '#00ff00',
    });
    const config = ExperimentalMapBinsPresetConfigSchema.parse({
      bins: [firstBin, secondBin],
    });

    expect(classifyValue(9.999, config).groupId).toBe(firstBin.id);
    expect(classifyValue(10, config).groupId).toBe(secondBin.id);
    expect(classifyValue(1000, config).groupId).toBe(secondBin.id);
  });

  it('maps out-of-range values to NO_DATA when there are gaps', () => {
    const firstBin = ExperimentalMapBinSchema.parse({
      min: 0,
      max: 10,
      label: '0-10',
      color: '#ff0000',
    });
    const secondBin = ExperimentalMapBinSchema.parse({
      min: 20,
      max: null,
      label: '>=20',
      color: '#00ff00',
    });
    const config = ExperimentalMapBinsPresetConfigSchema.parse({
      bins: [firstBin, secondBin],
    });

    expect(classifyValue(15, config).groupId).toBe('NO_DATA');
  });

  it('skips disabled bins during classification and palette generation', () => {
    const disabledBin = ExperimentalMapBinSchema.parse({
      min: 0,
      max: 10,
      label: '0-10',
      color: '#ff0000',
      disabled: true,
    });
    const enabledBin = ExperimentalMapBinSchema.parse({
      min: 10,
      max: null,
      label: '>=10',
      color: '#00ff00',
    });
    const config = ExperimentalMapBinsPresetConfigSchema.parse({
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
    const overlapFirstBin = ExperimentalMapBinSchema.parse({
      min: 0,
      max: 10,
      label: '',
      color: '#ff0000',
    });
    const overlapSecondBin = ExperimentalMapBinSchema.parse({
      min: 9,
      max: null,
      label: '',
      color: '#00ff00',
    });
    const overlapping = ExperimentalMapBinsPresetConfigSchema.parse({
      bins: [overlapFirstBin, overlapSecondBin],
    });
    const overlapResult = validateBinsConfig(overlapping);
    expect(overlapResult.isValid).toBe(false);
    expect(overlapResult.errors.join(' ')).toContain('overlaps');

    const gapFirstBin = ExperimentalMapBinSchema.parse({
      min: 0,
      max: 10,
      label: '',
      color: '#ff0000',
    });
    const gapSecondBin = ExperimentalMapBinSchema.parse({
      min: 15,
      max: null,
      label: '',
      color: '#00ff00',
    });
    const gapped = ExperimentalMapBinsPresetConfigSchema.parse({
      bins: [gapFirstBin, gapSecondBin],
    });
    const gapResult = validateBinsConfig(gapped);
    expect(gapResult.isValid).toBe(true);
  });

  it('classifies series vectors and returns deterministic palette', () => {
    const firstBin = ExperimentalMapBinSchema.parse({
      min: 0,
      max: 100,
      label: '0-100',
      color: '#ff0000',
    });
    const secondBin = ExperimentalMapBinSchema.parse({
      min: 100,
      max: null,
      label: '>=100',
      color: '#00ff00',
    });
    const config = ExperimentalMapBinsPresetConfigSchema.parse({
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
});
