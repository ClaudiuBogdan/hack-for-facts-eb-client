import { useQuery, type QueryOptions } from '@tanstack/react-query';
import { GeoJsonObject } from 'geojson';
import countyGeoJsonUrl from '@/assets/geojson/judete.json?url';
import uatGeoJsonUrl from '@/assets/geojson/uat.json?url';
import { convertDaysToMs } from '@/lib/utils';

export type MapViewType = 'UAT' | 'County';

const GEO_JSON_ASSET_URLS: Record<MapViewType, string> = {
  UAT: uatGeoJsonUrl,
  County: countyGeoJsonUrl,
};

const isBrowser = typeof window !== 'undefined';
const ONE_HOUR_IN_MS = 60 * 60 * 1000;

export const fetchGeoJsonData = async (path: string): Promise<GeoJsonObject> => {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Network response was not ok when fetching ${path}`);
  }
  const data = await response.json();
  return data;
};

export function resolveGeoJsonAssetUrl(mapViewType: MapViewType): string {
  return GEO_JSON_ASSET_URLS[mapViewType];
}

export function geoJsonQueryOptions(mapViewType: MapViewType) {
  const geoJsonAssetUrl = resolveGeoJsonAssetUrl(mapViewType);

  return {
    queryKey: ['geoJsonData', mapViewType, geoJsonAssetUrl] as const,
    queryFn: () => fetchGeoJsonData(geoJsonAssetUrl),
    staleTime: ONE_HOUR_IN_MS,
    gcTime: convertDaysToMs(7),
  } satisfies QueryOptions<GeoJsonObject, Error, GeoJsonObject, readonly [string, MapViewType, string]> & {
    staleTime?: number;
    gcTime?: number;
  };
}

export const useGeoJsonData = (
  mapViewType: MapViewType,
  options?: {
    enabled?: boolean;
  }
) => {
  return useQuery<GeoJsonObject, Error>({
    ...geoJsonQueryOptions(mapViewType),
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
    enabled: isBrowser && !!mapViewType && (options?.enabled ?? true),
  });
};
