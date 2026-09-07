import type { FeatureCollection, GeoJsonObject } from 'geojson';
import type { MapViewType } from '@/hooks/useGeoJson';

/** Advanced-map vectors use UAT SIRUTA codes or county mnemonics as their territory key. */
export function adaptMapBoundaryData(
  data: GeoJsonObject | null | undefined,
  granularity: MapViewType,
): GeoJsonObject | null | undefined {
  if (granularity === 'UAT' || data?.type !== 'FeatureCollection') return data;
  const collection = data as FeatureCollection;
  return {
    ...collection,
    features: collection.features.map(feature => ({
      ...feature,
      properties: {
        ...feature.properties,
        natcode: feature.properties?.mnemonic,
        county: feature.properties?.name,
      },
    })),
  } as FeatureCollection;
}
