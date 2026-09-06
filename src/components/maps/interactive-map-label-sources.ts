import { mapDecimalToRenderNumber } from '@/lib/map-series/decimal';
import type {
  Feature,
  FeatureCollection,
  Geometry,
  MultiPolygon,
  Polygon,
} from 'geojson';

import type { Currency, Normalization } from '@/schemas/charts';
import type { HeatmapCountyDataPoint, HeatmapUATDataPoint } from '@/schemas/heatmap';
import { formatAdvancedMapAnalyticsSeriesValue } from '@/components/maps/advanced-map-analytics/advanced-map-analytics-formatting';
import { getNormalizationUnit } from '@/lib/utils';

import type { ActiveMapRenderUnit, LabelMode } from './polygonLabels';
import {
  formatAmount,
  getFeatureHeatmapData,
  normalizeUatLabelName,
} from './polygonLabels';
import {
  type PreparedFeatureCollection,
  resolveFeatureIdentifier,
} from './interactive-map-data';

type PreparedLabelGeometry = {
  centroid: [number, number];
  bounds: [number, number, number, number];
  featureId: string;
  nameNormalized: string;
};

export type MapLabelSourceData = {
  countyLabels: FeatureCollection<Geometry, Record<string, unknown>>;
  countyFallbackLabels: FeatureCollection<Geometry, Record<string, unknown>>;
  uatLabels: FeatureCollection<Geometry, Record<string, unknown>>;
  renderUnitLabels: FeatureCollection<Geometry, Record<string, unknown>>;
  renderUnitMemberLabels: FeatureCollection<Geometry, Record<string, unknown>>;
};

// Label sources are pure data derived from GeoJSON and series inputs. Zoom
// thresholds and fade behavior stay in MapLibre paint/layout expressions so
// pan/zoom never rebuilds these collections on the React thread.

function coordinatesToBounds(coordinates: number[][][]): [number, number, number, number] | null {
  let minLng = Number.POSITIVE_INFINITY;
  let minLat = Number.POSITIVE_INFINITY;
  let maxLng = Number.NEGATIVE_INFINITY;
  let maxLat = Number.NEGATIVE_INFINITY;

  for (const ring of coordinates) {
    for (const coordinate of ring) {
      const [lng, lat] = coordinate;
      if (!Number.isFinite(lng) || !Number.isFinite(lat)) {
        continue;
      }
      minLng = Math.min(minLng, lng);
      minLat = Math.min(minLat, lat);
      maxLng = Math.max(maxLng, lng);
      maxLat = Math.max(maxLat, lat);
    }
  }

  if (!Number.isFinite(minLng) || !Number.isFinite(minLat)) {
    return null;
  }

  return [minLng, minLat, maxLng, maxLat];
}

function polygonRingArea(ring: number[][]): number {
  let area = 0;
  for (let index = 0; index < ring.length; index += 1) {
    const current = ring[index];
    const next = ring[(index + 1) % ring.length];
    area += current[0] * next[1] - next[0] * current[1];
  }
  return Math.abs(area / 2);
}

function getPrimaryPolygonCoordinates(geometry: Geometry): number[][][] | null {
  if (geometry.type === 'Polygon') {
    return (geometry as Polygon).coordinates;
  }

  if (geometry.type === 'MultiPolygon') {
    const multiPolygon = geometry as MultiPolygon;
    if (multiPolygon.coordinates.length === 0) {
      return null;
    }

    return multiPolygon.coordinates.reduce((largest, current) => {
      const largestArea = polygonRingArea(largest[0] ?? []);
      const currentArea = polygonRingArea(current[0] ?? []);
      return currentArea > largestArea ? current : largest;
    }, multiPolygon.coordinates[0]);
  }

  return null;
}

function calculatePolygonCentroid(coordinates: number[][][]): [number, number] | null {
  const polygon = coordinates[0];
  if (!polygon || polygon.length === 0) {
    return null;
  }

  let sumLat = 0;
  let sumLng = 0;
  let count = 0;
  for (const coordinate of polygon) {
    const [lng, lat] = coordinate;
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) {
      continue;
    }
    sumLng += lng;
    sumLat += lat;
    count += 1;
  }

  if (count === 0) {
    return null;
  }

  return [sumLat / count, sumLng / count];
}

function buildLabelGeometry(
  feature: Feature<Geometry, Record<string, unknown>>,
  mapViewType: 'UAT' | 'County',
): PreparedLabelGeometry | null {
  const geometry = feature.geometry;
  if (!geometry) {
    return null;
  }

  const primaryCoordinates = getPrimaryPolygonCoordinates(geometry);
  if (!primaryCoordinates) {
    return null;
  }

  const centroid = calculatePolygonCentroid(primaryCoordinates);
  const bounds = coordinatesToBounds(primaryCoordinates);
  if (!centroid || !bounds) {
    return null;
  }

  const properties = feature.properties ?? {};
  const featureId = resolveFeatureIdentifier(feature, mapViewType);
  const nameNormalized = normalizeUatLabelName(properties.name ?? properties.mnemonic ?? '');
  if (!featureId) {
    return null;
  }

  return {
    centroid,
    bounds,
    featureId,
    nameNormalized,
  };
}

function resolveActiveSeriesValue(
  properties: Record<string, unknown>,
  valuesBySirutaCode: Map<string, string | number | undefined> | undefined,
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

    const value = mapDecimalToRenderNumber(valuesBySirutaCode.get(String(candidate)));
    if (value !== undefined) {
      return value;
    }
  }

  return undefined;
}

function computeMaxLegacyPopulation(
  heatmapDataMap: Map<string | number, HeatmapUATDataPoint | HeatmapCountyDataPoint>,
  mapViewType: 'UAT' | 'County',
): number {
  let maxPopulation = 0;
  for (const dataPoint of heatmapDataMap.values()) {
    const population =
      mapViewType === 'County'
        ? Number((dataPoint as { county_population?: number }).county_population)
        : Number((dataPoint as { population?: number }).population);
    if (Number.isFinite(population)) {
      maxPopulation = Math.max(maxPopulation, population);
    }
  }
  return maxPopulation;
}

function createLabelCollection(
  features: Feature<Geometry, Record<string, unknown>>[] = [],
): FeatureCollection<Geometry, Record<string, unknown>> {
  return {
    type: 'FeatureCollection',
    features,
  };
}

function createEmptyLabelSourceData(): MapLabelSourceData {
  return {
    countyLabels: createLabelCollection(),
    countyFallbackLabels: createLabelCollection(),
    uatLabels: createLabelCollection(),
    renderUnitLabels: createLabelCollection(),
    renderUnitMemberLabels: createLabelCollection(),
  };
}

function getBoundsArea(bounds: [number, number, number, number]): number {
  const [minLng, minLat, maxLng, maxLat] = bounds;
  return Math.max(0, Math.abs(maxLng - minLng) * Math.abs(maxLat - minLat));
}

function calculateStaticLabelFontSize(
  value: number | undefined,
  maxValue: number,
  mapViewType: 'UAT' | 'County',
): number {
  const minFontSize = mapViewType === 'County' ? 13 : 12;
  const maxFontSize = mapViewType === 'County' ? 17 : 16;
  if (value === undefined || !Number.isFinite(value) || value <= 0 || maxValue <= 0) {
    return mapViewType === 'County' ? 14 : 13;
  }

  const normalizedValue = Math.max(0, Math.min(1, value / maxValue));
  return minFontSize + (maxFontSize - minFontSize) * Math.sqrt(normalizedValue);
}

function resolveLegacyLabelValue(
  feature: Feature<Geometry, Record<string, unknown>>,
  heatmapDataMap: Map<string | number, HeatmapUATDataPoint | HeatmapCountyDataPoint>,
  normalization: Normalization,
): {
  value: number | undefined;
  population: number | undefined;
} {
  const heatmapData = getFeatureHeatmapData(feature, heatmapDataMap);
  if (!heatmapData) {
    return {
      value: undefined,
      population: undefined,
    };
  }

  const isCounty = 'county_code' in heatmapData;
  const isPerCapita = normalization === 'per_capita' || normalization === 'per_capita_euro';
  const value =
    normalization === 'percent_gdp'
      ? heatmapData.amount
      : isPerCapita
        ? heatmapData.per_capita_amount
        : heatmapData.total_amount;
  const population = isCounty
    ? Number((heatmapData as { county_population?: number }).county_population)
    : Number((heatmapData as { population?: number }).population);

  return {
    value,
    population: Number.isFinite(population) ? population : undefined,
  };
}

function buildLabelPointFeature(
  geometry: PreparedLabelGeometry,
  properties: Record<string, unknown>,
): Feature<Geometry, Record<string, unknown>> {
  return {
    type: 'Feature',
    geometry: {
      type: 'Point',
      coordinates: [geometry.centroid[1], geometry.centroid[0]],
    },
    properties: {
      featureId: geometry.featureId,
      ...properties,
    },
  };
}

function buildFeatureLabel(
  feature: Feature<Geometry, Record<string, unknown>>,
  geometry: PreparedLabelGeometry,
  mapViewType: 'UAT' | 'County',
  heatmapDataMap: Map<string | number, HeatmapUATDataPoint | HeatmapCountyDataPoint>,
  normalization: Normalization,
  currency: Currency | undefined,
  labelMode: LabelMode,
  maxPopulation: number,
  options?: {
    activeSeriesValuesBySirutaCode?: Map<string, string | number | undefined>;
    activeSeriesUnit?: string;
    suppressActiveSeriesAmount?: boolean;
  },
): Feature<Geometry, Record<string, unknown>> | null {
  const properties = feature.properties ?? {};
  const name = geometry.nameNormalized || normalizeUatLabelName(properties.name ?? properties.mnemonic ?? '');
  if (!name) {
    return null;
  }

  const isCounty = mapViewType === 'County';
  let value: number | undefined;
  let amountText: string | undefined;
  let fontSize: number;

  if (labelMode === 'legacy-heatmap') {
    const unit = getNormalizationUnit({
      normalization: normalization as never,
      currency: currency as never,
    });
    const legacyValue = resolveLegacyLabelValue(feature, heatmapDataMap, normalization);
    value = legacyValue.value;

    if (value === undefined || !Number.isFinite(value)) {
      return null;
    }

    amountText = formatAmount(value, unit);
    fontSize = calculateStaticLabelFontSize(legacyValue.population, maxPopulation, mapViewType);
  } else {
    value = resolveActiveSeriesValue(properties, options?.activeSeriesValuesBySirutaCode);
    if (value === undefined || !Number.isFinite(value)) {
      return null;
    }

    amountText = options?.suppressActiveSeriesAmount
      ? undefined
      : formatAdvancedMapAnalyticsSeriesValue(value, options?.activeSeriesUnit);
    fontSize = isCounty ? 14 : 13;
  }

  const labelTextWithValue = amountText ? `${name}\n${amountText}` : name;
  return buildLabelPointFeature(geometry, {
    labelText: name,
    labelValueText: amountText,
    labelTextWithValue,
    fontSize,
    value,
    labelMode,
  });
}

function buildCountyFallbackLabel(geometry: PreparedLabelGeometry): Feature<Geometry, Record<string, unknown>> {
  return buildLabelPointFeature(geometry, {
    labelText: geometry.nameNormalized,
    fontSize: 14,
    labelMode: 'county-fallback',
  });
}

function appendCountyFallbackLabels(
  labelSourceData: MapLabelSourceData,
  countyGeoJsonData: FeatureCollection<Geometry, Record<string, unknown>> | null,
): void {
  if (!countyGeoJsonData) {
    return;
  }

  for (const feature of countyGeoJsonData.features) {
    const geometry = buildLabelGeometry(feature, 'County');
    if (!geometry) {
      continue;
    }
    labelSourceData.countyFallbackLabels.features.push(buildCountyFallbackLabel(geometry));
  }
}

function buildRenderUnitLabelPoint(
  renderUnit: ActiveMapRenderUnit,
  memberGeometries: PreparedLabelGeometry[],
  activeSeriesUnit?: string,
): Feature<Geometry, Record<string, unknown>> | null {
  const value = mapDecimalToRenderNumber(renderUnit.value);
  if (value === undefined || memberGeometries.length === 0) {
    return null;
  }

  let weightedLat = 0;
  let weightedLng = 0;
  let totalWeight = 0;
  for (const geometry of memberGeometries) {
    const area = getBoundsArea(geometry.bounds);
    const weight = area > 0 ? area : 1;
    weightedLat += geometry.centroid[0] * weight;
    weightedLng += geometry.centroid[1] * weight;
    totalWeight += weight;
  }

  if (totalWeight <= 0) {
    return null;
  }

  const label = normalizeUatLabelName(renderUnit.label || renderUnit.id);
  if (!label) {
    return null;
  }

  const amountText = formatAdvancedMapAnalyticsSeriesValue(value, renderUnit.unit ?? activeSeriesUnit);
  return {
    type: 'Feature',
    geometry: {
      type: 'Point',
      coordinates: [weightedLng / totalWeight, weightedLat / totalWeight],
    },
    properties: {
      labelText: label,
      labelValueText: amountText,
      labelTextWithValue: `${label}\n${amountText}`,
      fontSize: 20,
      featureId: `render-unit:${renderUnit.id}`,
      value,
    },
  };
}

export function buildLabelSourceData(args: {
  geoJsonData: PreparedFeatureCollection;
  countyGeoJsonData: FeatureCollection<Geometry, Record<string, unknown>> | null;
  showLabels: boolean;
  mapViewType: 'UAT' | 'County';
  heatmapDataMap: Map<string | number, HeatmapUATDataPoint | HeatmapCountyDataPoint>;
  normalization: Normalization;
  currency?: Currency;
  labelMode: LabelMode;
  activeSeriesValuesBySirutaCode?: Map<string, string | number | undefined>;
  activeRenderUnits?: ActiveMapRenderUnit[];
  activeSeriesUnit?: string;
}): MapLabelSourceData {
  const {
    geoJsonData,
    countyGeoJsonData,
    showLabels,
    mapViewType,
    heatmapDataMap,
    normalization,
    currency,
    labelMode,
    activeSeriesValuesBySirutaCode,
    activeRenderUnits,
    activeSeriesUnit,
  } = args;

  if (!showLabels || geoJsonData.features.length === 0) {
    return createEmptyLabelSourceData();
  }

  const maxPopulation =
    labelMode === 'legacy-heatmap'
      ? computeMaxLegacyPopulation(heatmapDataMap, mapViewType)
      : 0;
  const labelSourceData = createEmptyLabelSourceData();

  if (labelMode === 'active-series' && activeRenderUnits?.length) {
    const renderUnitMemberSirutaCodes = new Set<string>();
    for (const renderUnit of activeRenderUnits) {
      for (const sirutaCode of renderUnit.memberSirutaCodes) {
        renderUnitMemberSirutaCodes.add(sirutaCode);
      }
    }

    const geometriesBySirutaCode = new Map<string, PreparedLabelGeometry>();
    const featuresBySirutaCode = new Map<string, Feature<Geometry, Record<string, unknown>>>();

    for (const feature of geoJsonData.features) {
      const properties = feature.properties ?? {};
      const sirutaCode = properties.natcode ?? properties.siruta_code ?? properties.uat_code;
      if (sirutaCode === undefined || sirutaCode === null) {
        continue;
      }

      const geometry = buildLabelGeometry(feature, mapViewType);
      if (!geometry) {
        continue;
      }

      const key = String(sirutaCode);
      if (!renderUnitMemberSirutaCodes.has(key)) {
        continue;
      }

      geometriesBySirutaCode.set(key, geometry);
      featuresBySirutaCode.set(key, feature);
    }

    for (const renderUnit of activeRenderUnits) {
      const memberGeometries = renderUnit.memberSirutaCodes
        .map((sirutaCode) => geometriesBySirutaCode.get(sirutaCode))
        .filter((geometry): geometry is PreparedLabelGeometry => geometry !== undefined);
      const label = buildRenderUnitLabelPoint(renderUnit, memberGeometries, activeSeriesUnit);
      if (label) {
        labelSourceData.renderUnitLabels.features.push(label);
      }
    }

    for (const sirutaCode of renderUnitMemberSirutaCodes) {
      const feature = featuresBySirutaCode.get(sirutaCode);
      const geometry = geometriesBySirutaCode.get(sirutaCode);
      if (!feature || !geometry) {
        continue;
      }

      labelSourceData.renderUnitMemberLabels.features.push(
        buildLabelPointFeature(geometry, {
          labelText: geometry.nameNormalized,
          fontSize: 13,
          featureId: geometry.featureId,
          labelMode: 'render-unit-member',
          sourceFeatureId: feature.id,
        }),
      );
    }

    if (mapViewType === 'UAT') {
      appendCountyFallbackLabels(labelSourceData, countyGeoJsonData);
    }

    return labelSourceData;
  }

  for (const feature of geoJsonData.features) {
    const geometry = buildLabelGeometry(feature, mapViewType);
    if (!geometry) {
      continue;
    }

    const label = buildFeatureLabel(
      feature,
      geometry,
      mapViewType,
      heatmapDataMap,
      normalization,
      currency,
      labelMode,
      maxPopulation,
      {
        activeSeriesValuesBySirutaCode,
        activeSeriesUnit,
      },
    );
    if (label) {
      if (mapViewType === 'County') {
        labelSourceData.countyLabels.features.push(label);
      } else {
        labelSourceData.uatLabels.features.push(label);
      }
    }
  }

  if (mapViewType === 'UAT') {
    appendCountyFallbackLabels(labelSourceData, countyGeoJsonData);
  }

  return labelSourceData;
}

export const __interactiveMapLabelSourceTestUtils = {
  buildLabelGeometry,
  buildLabelPointFeature,
  calculatePolygonCentroid,
  coordinatesToBounds,
  getPrimaryPolygonCoordinates,
};
