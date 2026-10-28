import type { Feature, Geometry } from 'geojson';
import type { HeatmapCountyDataPoint, HeatmapUATDataPoint } from '@/schemas/heatmap';
import { formatValueWithUnit } from '@/lib/utils';

/**
 * The label helpers the MapLibre map shares with the Leaflet ones in
 * `polygonLabels.ts`. This module imports no Leaflet: `InteractiveMap` and its
 * label sources import from here, so the MapLibre chunk does not carry
 * Leaflet (46 KB zstd) for two constants and three pure functions.
 */

export type LabelMode = 'legacy-heatmap' | 'active-series';

export interface ActiveMapRenderUnit {
  id: string;
  label: string;
  memberSirutaCodes: string[];
  value?: string | number;
  unit?: string;
}

// Legacy thresholds used by /map.
export const ZOOM_THRESHOLDS = {
  UAT_NAME_MIN: 9,
  UAT_AMOUNT_MIN: 11,
  COUNTY_AMOUNT_MIN: 0,
} as const;

// Advanced map analytics thresholds used by /maps/editor and /maps/public.
export const ADVANCED_ZOOM_THRESHOLDS = {
  UAT_NAME_MIN: 8,
  UAT_AMOUNT_MIN: 9.5,
} as const;

export function normalizeWhitespace(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

/**
 * "Short name" for map labels intentionally uses only the normal UAT name.
 */
export function normalizeUatLabelName(rawName: unknown): string {
  if (typeof rawName !== 'string') {
    return '';
  }

  return normalizeWhitespace(rawName);
}

/**
 * Format amount for legacy labels.
 */
export function formatAmount(amount: number, unit: string): string {
  return formatValueWithUnit(amount, unit, 'compact');
}

/**
 * Get heatmap data for a feature.
 */
export function getFeatureHeatmapData(
  feature: Feature<Geometry, Record<string, unknown>>,
  heatmapDataMap: Map<string | number, HeatmapUATDataPoint | HeatmapCountyDataPoint>
): HeatmapUATDataPoint | HeatmapCountyDataPoint | undefined {
  const properties = feature.properties;
  if (!properties) {
    return undefined;
  }

  const candidates = [
    properties.natcode,
    properties.mnemonic,
    properties.siruta_code,
    properties.uat_code,
  ].filter(Boolean) as Array<string | number>;

  for (const key of candidates) {
    const found = heatmapDataMap.get(key);
    if (found) {
      return found;
    }
  }

  return undefined;
}
