import L from 'leaflet';
import { Feature, Geometry, MultiPolygon, Polygon } from 'geojson';
import { HeatmapCountyDataPoint, HeatmapUATDataPoint } from '@/schemas/heatmap';
import { formatAdvancedMapAnalyticsSeriesValue } from '@/components/maps/advanced-map-analytics/advanced-map-analytics-formatting';
import { formatValueWithUnit, getNormalizationUnit } from '@/lib/utils';
import type { Currency, Normalization } from '@/schemas/charts';

export type LabelMode = 'legacy-heatmap' | 'active-series';

export interface FeatureLabelGeometry {
  centroid: [number, number];
  bounds: L.LatLngBounds;
}

export interface PolygonLabelData {
  text: string;
  amount?: string;
  position: [number, number];
  bounds: L.LatLngBounds;
  area: number;
  fontSize: number;
  visible: boolean;
  showAmount: boolean;
  featureId: string;
  hasValue: boolean;
  value?: number;
}

export interface ProcessFeatureForLabelOptions {
  labelMode?: LabelMode;
  activeSeriesValuesBySirutaCode?: Map<string, number | undefined>;
  activeSeriesUnit?: string;
  precomputedGeometry?: FeatureLabelGeometry;
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

const MIN_FALLBACK_LABEL_FONT_SIZE = 8;
const MIN_COUNTY_LABEL_FONT_SIZE = 9;
const MIN_ADVANCED_LABEL_FONT_SIZE = 9;

function normalizeWhitespace(value: string): string {
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

function truncateLabelText(text: string, maxLength: number): string {
  if (maxLength <= 1) {
    return '…';
  }

  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength - 1)}…`;
}

function resolveFeatureIdentifier(properties: Record<string, unknown>): string {
  const candidates = [
    properties.natcode,
    properties.mnemonic,
    properties.siruta_code,
    properties.uat_code,
    properties.id,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim().length > 0) {
      return candidate.trim();
    }

    if (typeof candidate === 'number' && Number.isFinite(candidate)) {
      return String(candidate);
    }
  }

  return '';
}

/**
 * Calculate the centroid of a polygon using the geometric center.
 */
export function calculatePolygonCentroid(coordinates: number[][][]): [number, number] | null {
  if (!coordinates || coordinates.length === 0) {
    return null;
  }

  const polygon = coordinates[0];
  let sumLat = 0;
  let sumLng = 0;
  const count = polygon.length;

  if (count === 0) {
    return null;
  }

  for (let i = 0; i < count; i += 1) {
    sumLng += polygon[i][0];
    sumLat += polygon[i][1];
  }

  return [sumLat / count, sumLng / count];
}

/**
 * Calculate the area of a polygon in screen pixels at current zoom level.
 */
export function calculatePolygonScreenArea(bounds: L.LatLngBounds, map: L.Map): number {
  const northEastPoint = map.latLngToContainerPoint(bounds.getNorthEast());
  const southWestPoint = map.latLngToContainerPoint(bounds.getSouthWest());

  const width = Math.abs(northEastPoint.x - southWestPoint.x);
  const height = Math.abs(northEastPoint.y - southWestPoint.y);

  return width * height;
}

/**
 * Get appropriate font size based on polygon area and zoom level.
 */
export function calculateFontSize(screenArea: number, zoom: number, baseSize: number = 12): number {
  const areaFactor = Math.sqrt(screenArea) / 100;
  const zoomFactor = Math.pow(1.15, zoom - 7);
  const calculatedSize = baseSize * areaFactor * zoomFactor;

  return Math.max(9, Math.min(20, calculatedSize));
}

/**
 * Calculate font size based on population value to create visual hierarchy.
 */
export function calculateFontSizeByValue(
  value: number,
  maxValue: number,
  zoom: number,
  mapViewType: 'UAT' | 'County'
): number {
  const minFontSize = mapViewType === 'County' ? 11 : 12;
  const maxFontSize = mapViewType === 'County' ? 20 : 28;
  const zoomFactor = Math.pow(1.15, zoom - (mapViewType === 'County' ? 6 : 9));
  const normalizedValue = maxValue > 0 ? value / maxValue : 0;
  const scaleFactor = Math.sqrt(normalizedValue);
  const baseSize = minFontSize + (maxFontSize - minFontSize) * scaleFactor;
  const calculatedSize = baseSize * zoomFactor;

  return Math.max(minFontSize, Math.min(maxFontSize * 1.3, calculatedSize));
}

/**
 * Calculate text width in pixels (approximate).
 */
export function estimateTextWidth(text: string, fontSize: number): number {
  return text.length * fontSize * 0.6;
}

/**
 * Check if label fits within polygon bounds at current zoom.
 */
export function doesLabelFit(
  text: string,
  fontSize: number,
  bounds: L.LatLngBounds,
  map: L.Map,
  withAmount: boolean = false
): boolean {
  const textWidth = estimateTextWidth(text, fontSize);
  const textHeight = fontSize * (withAmount ? 2.5 : 1.2);

  const northEastPoint = map.latLngToContainerPoint(bounds.getNorthEast());
  const southWestPoint = map.latLngToContainerPoint(bounds.getSouthWest());

  const boundsWidth = Math.abs(northEastPoint.x - southWestPoint.x);
  const boundsHeight = Math.abs(northEastPoint.y - southWestPoint.y);

  return textWidth <= boundsWidth * 0.8 && textHeight <= boundsHeight * 0.8;
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

function extractGeometryData(geometry: Geometry): { primaryCoordinates: number[][][]; allCoordinates: number[][][] } | null {
  if (geometry.type === 'Polygon') {
    const polygon = geometry as Polygon;
    return {
      primaryCoordinates: polygon.coordinates,
      allCoordinates: [polygon.coordinates[0]],
    };
  }

  if (geometry.type === 'MultiPolygon') {
    const multiPolygon = geometry as MultiPolygon;
    if (multiPolygon.coordinates.length === 0) {
      return null;
    }

    const primaryCoordinates = multiPolygon.coordinates.reduce((largest, current) => {
      return current[0].length > largest[0].length ? current : largest;
    }, multiPolygon.coordinates[0]);

    return {
      primaryCoordinates,
      allCoordinates: multiPolygon.coordinates.map((coordinates) => coordinates[0]),
    };
  }

  return null;
}

/**
 * Build geometry metadata that can be cached between pan/zoom redraws.
 */
export function buildFeatureLabelGeometry(
  feature: Feature<Geometry, Record<string, unknown>>
): FeatureLabelGeometry | null {
  const geometry = feature.geometry;
  if (!geometry) {
    return null;
  }

  const geometryData = extractGeometryData(geometry);
  if (!geometryData) {
    return null;
  }

  const centroid = calculatePolygonCentroid(geometryData.primaryCoordinates);
  if (!centroid) {
    return null;
  }

  const latLngs: L.LatLng[] = [];
  for (const coordinates of geometryData.allCoordinates) {
    for (const coordinate of coordinates) {
      latLngs.push(L.latLng(coordinate[1], coordinate[0]));
    }
  }

  if (latLngs.length === 0) {
    return null;
  }

  return {
    centroid,
    bounds: L.latLngBounds(latLngs),
  };
}

function resolveActiveSeriesValue(
  properties: Record<string, unknown>,
  valuesBySirutaCode: Map<string, number | undefined> | undefined
): number | undefined {
  if (!valuesBySirutaCode) {
    return undefined;
  }

  const candidates = [
    properties.natcode,
    properties.siruta_code,
    properties.uat_code,
    properties.mnemonic,
  ];

  for (const candidate of candidates) {
    if (candidate === undefined || candidate === null) {
      continue;
    }

    const key = String(candidate);
    const value = valuesBySirutaCode.get(key);
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
  }

  return undefined;
}

function getBoundsDimensions(bounds: L.LatLngBounds, map: L.Map): { width: number; height: number } {
  const northEastPoint = map.latLngToContainerPoint(bounds.getNorthEast());
  const southWestPoint = map.latLngToContainerPoint(bounds.getSouthWest());

  return {
    width: Math.abs(northEastPoint.x - southWestPoint.x),
    height: Math.abs(northEastPoint.y - southWestPoint.y),
  };
}

/**
 * Process a feature to extract label data.
 */
export function processFeatureForLabel(
  feature: Feature<Geometry, Record<string, unknown>>,
  map: L.Map,
  zoom: number,
  mapViewType: 'UAT' | 'County',
  heatmapDataMap: Map<string | number, HeatmapUATDataPoint | HeatmapCountyDataPoint>,
  normalization: Normalization,
  currency?: Currency,
  maxValue?: number,
  options?: ProcessFeatureForLabelOptions
): PolygonLabelData | null {
  const properties = feature.properties;
  if (!properties) {
    return null;
  }

  const labelMode = options?.labelMode ?? 'legacy-heatmap';
  const rawName = properties.name ?? properties.mnemonic ?? '';
  const name = normalizeUatLabelName(rawName);
  if (!name) {
    return null;
  }

  const featureId = resolveFeatureIdentifier(properties) || name;
  const isCounty = mapViewType === 'County';
  const isUat = mapViewType === 'UAT';

  const minimumNameZoom =
    labelMode === 'active-series'
      ? ADVANCED_ZOOM_THRESHOLDS.UAT_NAME_MIN
      : ZOOM_THRESHOLDS.UAT_NAME_MIN;

  if (isUat && zoom < minimumNameZoom) {
    return null;
  }

  const geometry = options?.precomputedGeometry ?? buildFeatureLabelGeometry(feature);
  if (!geometry) {
    return null;
  }

  const screenArea = calculatePolygonScreenArea(geometry.bounds, map);
  let value: number | undefined;
  let showAmount = false;
  let amountText: string | undefined;

  if (labelMode === 'legacy-heatmap') {
    const heatmapData = getFeatureHeatmapData(feature, heatmapDataMap);
    if (!heatmapData) {
      return null;
    }

    const unit = getNormalizationUnit({
      normalization: normalization as never,
      currency: currency as never,
    });
    const isPerCapita = normalization === 'per_capita' || normalization === 'per_capita_euro';

    if (normalization === 'percent_gdp') {
      value = heatmapData.amount;
    } else if (isPerCapita) {
      value = heatmapData.per_capita_amount;
    } else {
      value = heatmapData.total_amount;
    }

    if (value === undefined || !Number.isFinite(value)) {
      return null;
    }

    // Keep legacy /map behavior unchanged (UAT amount line follows legacy name threshold).
    showAmount = isCounty
      ? zoom >= ZOOM_THRESHOLDS.COUNTY_AMOUNT_MIN
      : zoom >= ZOOM_THRESHOLDS.UAT_NAME_MIN;
    amountText = showAmount ? formatAmount(value, unit) : undefined;
  } else {
    value = resolveActiveSeriesValue(properties, options?.activeSeriesValuesBySirutaCode);
    if (value === undefined || !Number.isFinite(value)) {
      return null;
    }
    showAmount = Boolean(value !== undefined && (isCounty || zoom >= ADVANCED_ZOOM_THRESHOLDS.UAT_AMOUNT_MIN));
    amountText = showAmount
      ? formatAdvancedMapAnalyticsSeriesValue(value, options?.activeSeriesUnit)
      : undefined;
  }

  let fontSize: number;
  if (labelMode === 'legacy-heatmap') {
    const heatmapData = getFeatureHeatmapData(feature, heatmapDataMap);
    const population = heatmapData
      ? isCounty
        ? Number((heatmapData as { county_population?: number }).county_population)
        : Number((heatmapData as { population?: number }).population)
      : undefined;

    if (
      maxValue !== undefined &&
      maxValue > 0 &&
      population !== undefined &&
      Number.isFinite(population) &&
      population > 0
    ) {
      fontSize = calculateFontSizeByValue(population, maxValue, zoom, mapViewType);
    } else {
      fontSize = calculateFontSize(screenArea, zoom);
      fontSize = isCounty ? Math.max(11, fontSize * 0.85) : Math.max(12, fontSize);
    }
  } else {
    fontSize = calculateFontSize(screenArea, zoom, 11);
    fontSize = isCounty ? Math.max(10, fontSize * 0.9) : Math.max(10, fontSize);
  }

  let displayText = name;
  const minimumFontSize =
    labelMode === 'active-series'
      ? MIN_ADVANCED_LABEL_FONT_SIZE
      : (isCounty ? MIN_COUNTY_LABEL_FONT_SIZE : MIN_FALLBACK_LABEL_FONT_SIZE);

  while (
    fontSize > minimumFontSize &&
    !doesLabelFit(displayText, fontSize, geometry.bounds, map, showAmount)
  ) {
    fontSize -= 0.5;
  }

  if (!doesLabelFit(displayText, fontSize, geometry.bounds, map, showAmount)) {
    const dimensions = getBoundsDimensions(geometry.bounds, map);
    const maxTextWidth = dimensions.width * 0.78;
    const estimatedCharacterWidth = Math.max(1, fontSize * 0.58);
    const maxCharacters = Math.max(4, Math.floor(maxTextWidth / estimatedCharacterWidth));
    displayText = truncateLabelText(displayText, maxCharacters);
  }

  return {
    text: displayText,
    amount: amountText,
    position: geometry.centroid,
    bounds: geometry.bounds,
    area: screenArea,
    fontSize,
    visible: true,
    showAmount,
    featureId,
    hasValue: value !== undefined && Number.isFinite(value),
    value,
  };
}
