import { useQuery, type QueryOptions } from '@tanstack/react-query';
import { GeoJsonObject } from 'geojson';
import { convertDaysToMs } from '@/lib/utils';

export type MapViewType = 'UAT' | 'County';
export type GeoJsonAssetType = MapViewType | 'Region';

// Served straight from `public/geojson/`, not bundled through `?url`. Nitro's
// dev middleware routes any extension outside its asset allowlist (`.json`
// included) to the SSR handler, so a `/src/assets/**.json` URL answers with the
// 404 page in dev while working in a production build.
//
// Public assets carry no content hash, so the `-YYYY-MM-DD` suffix is the
// cache key: publish a boundary revision as a **new** dated file and repoint
// the entry below. Never overwrite a dated file — clients hold the old one for
// up to `gcTime`, and a shared URL would silently change underneath them.
const GEO_JSON_ASSET_URLS: Record<GeoJsonAssetType, string> = {
  UAT: '/geojson/uat-2026-03-09.json',
  County: '/geojson/judete-2026-03-09.json',
  Region: '/geojson/region-2026-07-25.json',
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

export function resolveGeoJsonAssetUrl(mapViewType: GeoJsonAssetType): string {
  return GEO_JSON_ASSET_URLS[mapViewType];
}

export function geoJsonQueryOptions(mapViewType: GeoJsonAssetType) {
  const geoJsonAssetUrl = resolveGeoJsonAssetUrl(mapViewType);

  return {
    queryKey: ['geoJsonData', mapViewType, geoJsonAssetUrl] as const,
    queryFn: () => fetchGeoJsonData(geoJsonAssetUrl),
    staleTime: ONE_HOUR_IN_MS,
    gcTime: convertDaysToMs(7),
  } satisfies QueryOptions<GeoJsonObject, Error, GeoJsonObject, readonly [string, GeoJsonAssetType, string]> & {
    staleTime?: number;
    gcTime?: number;
  };
}

export const useGeoJsonData = (
  mapViewType: GeoJsonAssetType,
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
