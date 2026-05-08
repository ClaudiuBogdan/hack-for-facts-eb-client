import type { GeoJSONSource, Map as MapLibreMap } from 'maplibre-gl';
import type {
  Feature,
  FeatureCollection,
  GeoJsonObject,
  Geometry,
} from 'geojson';

import { DEFAULT_FEATURE_STYLE } from './constants';
import type { InteractiveMapFeatureStyle } from './map-types';

export const EMPTY_FEATURE_COLLECTION: FeatureCollection<Geometry, Record<string, unknown>> = {
  type: 'FeatureCollection',
  features: [],
};

export const MAP_FILL_COLOR_PROPERTY = '__mapFillColor';
export const MAP_FILL_OPACITY_PROPERTY = '__mapFillOpacity';
export const MAP_LINE_COLOR_PROPERTY = '__mapLineColor';
export const MAP_LINE_OPACITY_PROPERTY = '__mapLineOpacity';
export const MAP_LINE_WIDTH_PROPERTY = '__mapLineWidth';

const sourceDataCacheByMap = new WeakMap<
  MapLibreMap,
  Map<string, FeatureCollection<Geometry, Record<string, unknown>>>
>();

export type PreparedFeature = Feature<Geometry, Record<string, unknown>> & {
  id: string;
  properties: Record<string, unknown> & {
    __featureId: string;
  };
};

export type PreparedFeatureCollection = FeatureCollection<Geometry, PreparedFeature['properties']> & {
  features: PreparedFeature[];
};

export type MapFeatureStyleProperties = {
  [MAP_FILL_COLOR_PROPERTY]: string;
  [MAP_FILL_OPACITY_PROPERTY]: number;
  [MAP_LINE_COLOR_PROPERTY]: string;
  [MAP_LINE_OPACITY_PROPERTY]: number;
  [MAP_LINE_WIDTH_PROPERTY]: number;
};

export type StyledFeatureProperties = PreparedFeature['properties'] & MapFeatureStyleProperties;

export type StyledFeature = Feature<Geometry, StyledFeatureProperties> & {
  id: string;
  properties: StyledFeatureProperties;
};

export type StyledFeatureCollection = FeatureCollection<Geometry, StyledFeatureProperties> & {
  features: StyledFeature[];
};

export function isFeatureCollection(
  geoJsonData: GeoJsonObject | null | undefined,
): geoJsonData is FeatureCollection<Geometry, Record<string, unknown>> {
  return Boolean(geoJsonData && geoJsonData.type === 'FeatureCollection' && 'features' in geoJsonData);
}

export function resolveFeatureIdentifier(
  feature: Feature<Geometry, Record<string, unknown>>,
  mapViewType: 'UAT' | 'County',
): string | null {
  const properties = feature.properties ?? {};
  const candidates =
    mapViewType === 'UAT'
      ? [properties.natcode, properties.siruta_code, properties.uat_code, properties.id]
      : [properties.mnemonic, properties.county_code, properties.id];

  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim().length > 0) {
      return candidate.trim();
    }

    if (typeof candidate === 'number' && Number.isFinite(candidate)) {
      return String(candidate);
    }
  }

  return null;
}

export function prepareGeoJsonData(
  geoJsonData: GeoJsonObject | null,
  mapViewType: 'UAT' | 'County',
): PreparedFeatureCollection {
  if (!isFeatureCollection(geoJsonData)) {
    return EMPTY_FEATURE_COLLECTION as PreparedFeatureCollection;
  }

  const features = geoJsonData.features
    .map((feature, index): PreparedFeature | null => {
      if (!feature.geometry) {
        return null;
      }

      const normalizedFeature = feature as Feature<Geometry, Record<string, unknown>>;
      const featureId =
        resolveFeatureIdentifier(normalizedFeature, mapViewType) ?? `${mapViewType.toLowerCase()}-${index}`;
      const properties = {
        ...(normalizedFeature.properties ?? {}),
        __featureId: featureId,
      };

      return {
        ...normalizedFeature,
        id: featureId,
        properties,
      };
    })
    .filter((feature): feature is PreparedFeature => feature !== null);

  return {
    type: 'FeatureCollection',
    features,
  };
}

export function prepareBoundaryGeoJsonData(
  geoJsonData: GeoJsonObject | null | undefined,
): FeatureCollection<Geometry, Record<string, unknown>> {
  return isFeatureCollection(geoJsonData) ? geoJsonData : EMPTY_FEATURE_COLLECTION;
}

export function prepareStyledGeoJsonData(
  geoJsonData: PreparedFeatureCollection,
  resolveFeatureStyle: (feature: PreparedFeature) => InteractiveMapFeatureStyle,
): StyledFeatureCollection {
  if (geoJsonData.features.length === 0) {
    return EMPTY_FEATURE_COLLECTION as StyledFeatureCollection;
  }

  return {
    type: 'FeatureCollection',
    features: geoJsonData.features.map((feature): StyledFeature => {
      const preparedFeature = feature as PreparedFeature;
      return {
        ...preparedFeature,
        id: preparedFeature.id,
        properties: {
          ...preparedFeature.properties,
          // Persistent polygon style belongs in source properties. MapLibre
          // replays feature-state into retained tiles during pan/zoom, so
          // feature-state is reserved for transient hover state only.
          ...styleToMapFeatureProperties(resolveFeatureStyle(preparedFeature)),
        },
      };
    }),
  };
}

export function toNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

export function parseDashArray(value: InteractiveMapFeatureStyle['dashArray']): number[] | undefined {
  if (Array.isArray(value)) {
    return value.map(Number).filter((item) => Number.isFinite(item));
  }

  if (typeof value !== 'string') {
    return undefined;
  }

  const parsed = value
    .split(/[,\s]+/)
    .map((item) => Number(item))
    .filter((item) => Number.isFinite(item) && item > 0);

  return parsed.length > 0 ? parsed : undefined;
}

export function resolveCssColorValue(value: string | undefined, fallback: string): string {
  if (!value?.startsWith('var(')) {
    return value ?? fallback;
  }

  if (typeof window === 'undefined') {
    return fallback;
  }

  const variableName = value.match(/var\(\s*(--[\w-]+)\s*(?:,.*?)?\)/)?.[1];
  if (!variableName) {
    return fallback;
  }

  const resolved = window
    .getComputedStyle(document.documentElement)
    .getPropertyValue(variableName)
    .trim();

  return resolved || fallback;
}

export function styleToMapFeatureProperties(style: InteractiveMapFeatureStyle): MapFeatureStyleProperties {
  const fallbackFillColor = DEFAULT_FEATURE_STYLE.fillColor ?? '#f0f0f0';
  const fallbackLineColor = DEFAULT_FEATURE_STYLE.color ?? '#cccccc';
  return {
    [MAP_FILL_COLOR_PROPERTY]: resolveCssColorValue(style.fillColor, fallbackFillColor),
    [MAP_FILL_OPACITY_PROPERTY]: toNumber(style.fillOpacity, toNumber(DEFAULT_FEATURE_STYLE.fillOpacity, 0.5)),
    [MAP_LINE_COLOR_PROPERTY]: resolveCssColorValue(style.color, fallbackLineColor),
    [MAP_LINE_OPACITY_PROPERTY]: toNumber(style.opacity, toNumber(DEFAULT_FEATURE_STYLE.opacity, 1)),
    [MAP_LINE_WIDTH_PROPERTY]: toNumber(style.weight, toNumber(DEFAULT_FEATURE_STYLE.weight, 1)),
  };
}

function getGeoJsonSource(map: MapLibreMap, sourceId: string): GeoJSONSource | null {
  const source = map.getSource(sourceId);
  return source && 'setData' in source ? (source as GeoJSONSource) : null;
}

export function setGeoJsonSourceData(
  map: MapLibreMap,
  sourceId: string,
  data: FeatureCollection<Geometry, Record<string, unknown>>,
): boolean {
  let sourceDataCache = sourceDataCacheByMap.get(map);
  if (!sourceDataCache) {
    sourceDataCache = new Map();
    sourceDataCacheByMap.set(map, sourceDataCache);
  }
  const source = getGeoJsonSource(map, sourceId);
  if (!source) {
    return false;
  }
  if (sourceDataCache.get(sourceId) === data) {
    return false;
  }

  source.setData(data);
  sourceDataCache.set(sourceId, data);
  return true;
}
