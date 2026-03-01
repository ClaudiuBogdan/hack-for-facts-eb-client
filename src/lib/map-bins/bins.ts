import type { MapSeriesWarning } from '@/lib/map-series/interfaces';
import {
  createUniqueAdvancedMapAnalyticsId,
  type AdvancedMapAnalyticsBin,
  type AdvancedMapAnalyticsBinsPresetConfig,
} from '@/schemas/advanced-map-analytics';

export const NO_DATA_GROUP_ID = 'NO_DATA';
export const LARGE_BIN_WARNING_THRESHOLD = 12;

const DEFAULT_MANUAL_COLORS = [
  '#fff7bc',
  '#fee391',
  '#fec44f',
  '#fe9929',
  '#d95f0e',
  '#993404',
];

export interface BinsValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: MapSeriesWarning[];
}

export interface ClassifiedBin {
  groupId: string;
  label: string;
  color: string;
  isNoData: boolean;
}

export interface ClassifySeriesValuesResult {
  groupsBySiruta: Map<string, ClassifiedBin>;
  palette: ClassifiedBin[];
  warnings: MapSeriesWarning[];
}

export function validateBinsConfig(config: AdvancedMapAnalyticsBinsPresetConfig): BinsValidationResult {
  const errors: string[] = [];
  const warnings: MapSeriesWarning[] = [];
  const seenBinIds = new Set<string>();

  if (config.defaultBinCount < 1 || !Number.isInteger(config.defaultBinCount)) {
    errors.push('Default bin count must be an integer greater than or equal to 1.');
  }

  if (!isHexColor(config.noData.color)) {
    errors.push('NO_DATA color must be a valid hex color.');
  }

  if (config.boundaries.minInclusive !== true || config.boundaries.maxExclusive !== true) {
    errors.push('Only [min, max) boundary semantics are supported in phase 1.');
  }

  if (config.bins.length > LARGE_BIN_WARNING_THRESHOLD) {
    warnings.push({
      type: 'bins_large_count',
      message: `Large bin count (${config.bins.length}) may reduce readability.`,
      details: {
        binCount: config.bins.length,
        threshold: LARGE_BIN_WARNING_THRESHOLD,
      },
    });
  }

  for (let index = 0; index < config.bins.length; index += 1) {
    const currentBin = config.bins[index];
    if (!currentBin) {
      continue;
    }

    if (currentBin.id.trim().length === 0) {
      errors.push(`Bin ${index + 1} id must be a non-empty string.`);
    } else if (seenBinIds.has(currentBin.id)) {
      errors.push(`Bin ${index + 1} id must be unique.`);
    } else {
      seenBinIds.add(currentBin.id);
    }

    if (!Number.isFinite(currentBin.min)) {
      errors.push(`Bin ${index + 1} min must be a finite number.`);
    }

    if (currentBin.max !== null && !Number.isFinite(currentBin.max)) {
      errors.push(`Bin ${index + 1} max must be a finite number or null.`);
    }

    if (currentBin.max !== null && currentBin.max <= currentBin.min) {
      errors.push(`Bin ${index + 1} max must be greater than min.`);
    }

    if (!isHexColor(currentBin.color)) {
      errors.push(`Bin ${index + 1} color must be a valid hex color.`);
    }

    if (index < config.bins.length - 1 && currentBin.max === null) {
      errors.push(`Only the last bin can be open-ended (max = null).`);
    }
  }

  const lastBin = config.bins[config.bins.length - 1];
  if (lastBin && lastBin.max !== null) {
    errors.push('The last bin must be open-ended (max = null).');
  }

  for (let index = 1; index < config.bins.length; index += 1) {
    const previousBin = config.bins[index - 1];
    const currentBin = config.bins[index];

    if (!previousBin || !currentBin) {
      continue;
    }

    if (currentBin.min < previousBin.min) {
      errors.push(`Bin ${index + 1} min must be greater than or equal to previous bin min.`);
    }

    if (previousBin.max !== null && currentBin.min < previousBin.max) {
      errors.push(`Bin ${index + 1} overlaps with bin ${index}.`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

export function classifyValue(
  value: number | undefined,
  config: AdvancedMapAnalyticsBinsPresetConfig
): ClassifiedBin {
  if (value === undefined || value === null || !Number.isFinite(value)) {
    return getNoDataClassification(config);
  }

  for (let index = 0; index < config.bins.length; index += 1) {
    const bin = config.bins[index];
    if (!bin) {
      continue;
    }
    if (isBinDisabled(bin)) {
      continue;
    }

    const isWithinMin = value >= bin.min;
    const isWithinMax = bin.max === null ? true : value < bin.max;
    if (isWithinMin && isWithinMax) {
      return {
        groupId: bin.id,
        label: getComposedBinLabel(bin, index),
        color: bin.color,
        isNoData: false,
      };
    }
  }

  return getNoDataClassification(config);
}

export function classifySeriesValues(
  activeValues: Map<string, number | undefined> | undefined,
  config: AdvancedMapAnalyticsBinsPresetConfig
): ClassifySeriesValuesResult {
  const groupsBySiruta = new Map<string, ClassifiedBin>();
  const palette = buildDiscretePaletteFromConfig(config);
  const warnings: MapSeriesWarning[] = [];
  const validation = validateBinsConfig(config);

  warnings.push(...validation.warnings);

  if (!validation.isValid || config.bins.length < 1) {
    warnings.push({
      type: 'bins_invalid_config',
      message: 'Bins configuration is invalid.',
      details: {
        errors:
          config.bins.length < 1
            ? ['At least one bin is required when bins are enabled.']
            : validation.errors,
      },
    });
    return {
      groupsBySiruta,
      palette,
      warnings,
    };
  }

  if (!activeValues || activeValues.size === 0) {
    warnings.push({
      type: 'bins_empty_defined_values',
      message: 'Cannot classify bins because there are no active values.',
    });
    return {
      groupsBySiruta,
      palette,
      warnings,
    };
  }

  let definedCount = 0;
  for (const [sirutaCode, value] of activeValues.entries()) {
    if (Number.isFinite(value)) {
      definedCount += 1;
    }
    groupsBySiruta.set(sirutaCode, classifyValue(value, config));
  }

  if (definedCount === 0) {
    warnings.push({
      type: 'bins_empty_defined_values',
      message: 'Cannot classify bins because all active values are missing.',
    });
  }

  return {
    groupsBySiruta,
    palette,
    warnings,
  };
}

export function generateSequentialBins(
  values: Array<number | undefined>,
  count: number,
  colorMode: AdvancedMapAnalyticsBinsPresetConfig['colorMode'],
  gradient: AdvancedMapAnalyticsBinsPresetConfig['gradient']
): AdvancedMapAnalyticsBin[] {
  const finiteValues = values.filter((value): value is number => Number.isFinite(value));
  if (finiteValues.length === 0) {
    return [];
  }

  const generatedBinIds = new Set<string>();
  const createGeneratedBinId = () => {
    const id = createUniqueAdvancedMapAnalyticsId(generatedBinIds);
    generatedBinIds.add(id);
    return id;
  };

  const binCount = Math.max(1, Math.trunc(count));
  const minValue = Math.min(...finiteValues);
  const maxValue = Math.max(...finiteValues);
  const colors =
    colorMode === 'gradient'
      ? buildGradientPalette(binCount, gradient.startColor, gradient.endColor)
      : buildManualPalette(binCount);

  if (minValue === maxValue) {
    return Array.from({ length: binCount }, (_, index) => {
      const binMin = index === 0 ? minValue : minValue + index;
      const binMax = index === binCount - 1 ? null : binMin + 1;
      return {
        id: createGeneratedBinId(),
        min: round(binMin),
        max: binMax === null ? null : round(binMax),
        label: getDefaultBinTitle(index),
        color: colors[index] ?? colors[colors.length - 1] ?? '#d7301f',
      };
    });
  }

  const step = (maxValue - minValue) / binCount;

  return Array.from({ length: binCount }, (_, index) => {
    const binMin = minValue + step * index;
    const binMax = index === binCount - 1 ? null : minValue + step * (index + 1);
    const roundedMin = round(binMin);
    const roundedMax = binMax === null ? null : round(binMax);

    return {
      id: createGeneratedBinId(),
      min: roundedMin,
      max: roundedMax,
      label: getDefaultBinTitle(index),
      color: colors[index] ?? colors[colors.length - 1] ?? '#d7301f',
    };
  });
}

export function applyGradientColorsToBins(
  bins: AdvancedMapAnalyticsBin[],
  gradient: AdvancedMapAnalyticsBinsPresetConfig['gradient']
): AdvancedMapAnalyticsBin[] {
  if (bins.length === 0) {
    return bins;
  }

  const colors = buildGradientPalette(bins.length, gradient.startColor, gradient.endColor);
  return bins.map((bin, index) => ({
    ...bin,
    color: colors[index] ?? bin.color,
  }));
}

export function buildDiscretePaletteFromConfig(config: AdvancedMapAnalyticsBinsPresetConfig): ClassifiedBin[] {
  const rows = config.bins.reduce<ClassifiedBin[]>((accumulator, bin, index) => {
    if (isBinDisabled(bin)) {
      return accumulator;
    }

    accumulator.push({
      groupId: bin.id,
      label: getComposedBinLabel(bin, index),
      color: bin.color,
      isNoData: false,
    });
    return accumulator;
  }, []);

  rows.push(getNoDataClassification(config));
  return rows;
}

export function getNoDataClassification(config: AdvancedMapAnalyticsBinsPresetConfig): ClassifiedBin {
  return {
    groupId: NO_DATA_GROUP_ID,
    label: config.noData.label || 'Fara date',
    color: config.noData.color,
    isNoData: true,
  };
}

export function getDefaultBinTitle(index: number): string {
  return `Label ${index + 1}`;
}

function getBinTitle(bin: AdvancedMapAnalyticsBin, index: number): string {
  if (bin.label.trim().length > 0) {
    return bin.label;
  }
  return getDefaultBinTitle(index);
}

function getComposedBinLabel(bin: AdvancedMapAnalyticsBin, index: number): string {
  return `${getBinTitle(bin, index)} — ${formatBinLabel(bin.min, bin.max)}`;
}

function isBinDisabled(bin: AdvancedMapAnalyticsBin): boolean {
  return bin.disabled === true;
}

function formatBinLabel(min: number, max: number | null): string {
  const formatter = new Intl.NumberFormat('ro-RO', {
    maximumFractionDigits: 2,
  });
  if (max === null) {
    return `>= ${formatter.format(min)}`;
  }
  return `${formatter.format(min)} - ${formatter.format(max)}`;
}

function buildManualPalette(count: number): string[] {
  if (count <= DEFAULT_MANUAL_COLORS.length) {
    return DEFAULT_MANUAL_COLORS.slice(0, count);
  }

  return Array.from({ length: count }, (_, index) => {
    const paletteIndex = Math.floor((index / Math.max(1, count - 1)) * (DEFAULT_MANUAL_COLORS.length - 1));
    return DEFAULT_MANUAL_COLORS[paletteIndex] ?? DEFAULT_MANUAL_COLORS[DEFAULT_MANUAL_COLORS.length - 1];
  });
}

function buildGradientPalette(count: number, startColor: string, endColor: string): string[] {
  const start = hexToRgb(startColor);
  const end = hexToRgb(endColor);
  if (!start || !end) {
    return buildManualPalette(count);
  }

  if (count === 1) {
    return [rgbToHex(start.r, start.g, start.b)];
  }

  return Array.from({ length: count }, (_, index) => {
    const ratio = index / (count - 1);
    const red = Math.round(start.r + (end.r - start.r) * ratio);
    const green = Math.round(start.g + (end.g - start.g) * ratio);
    const blue = Math.round(start.b + (end.b - start.b) * ratio);
    return rgbToHex(red, green, blue);
  });
}

function hexToRgb(hexColor: string): { r: number; g: number; b: number } | null {
  const normalized = normalizeHex(hexColor);
  if (!normalized) {
    return null;
  }

  const value = normalized.slice(1);
  const red = Number.parseInt(value.slice(0, 2), 16);
  const green = Number.parseInt(value.slice(2, 4), 16);
  const blue = Number.parseInt(value.slice(4, 6), 16);
  if (!Number.isFinite(red) || !Number.isFinite(green) || !Number.isFinite(blue)) {
    return null;
  }

  return { r: red, g: green, b: blue };
}

function rgbToHex(red: number, green: number, blue: number): string {
  return `#${[red, green, blue]
    .map((component) => component.toString(16).padStart(2, '0'))
    .join('')}`;
}

function normalizeHex(color: string): string | null {
  if (/^#[0-9a-fA-F]{6}$/.test(color)) {
    return color.toLowerCase();
  }
  if (/^#[0-9a-fA-F]{3}$/.test(color)) {
    const short = color.slice(1);
    return `#${short
      .split('')
      .map((chunk) => `${chunk}${chunk}`)
      .join('')
      .toLowerCase()}`;
  }
  return null;
}

function isHexColor(color: string): boolean {
  return normalizeHex(color) !== null;
}

function round(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}
