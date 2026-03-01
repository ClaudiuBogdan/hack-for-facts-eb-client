import { useQuery, type QueryOptions } from "@tanstack/react-query";
import { GeoJsonObject } from 'geojson';
import { convertDaysToMs } from '@/lib/utils';

type MapViewType = 'UAT' | 'County'
const isBrowser = typeof window !== 'undefined'
const ONE_HOUR_IN_MS = 60 * 60 * 1000;
const CACHE_MAX_AGE_SECONDS = 60 * 60;
const CACHE_STALE_WHILE_REVALIDATE_SECONDS = 60 * 60 * 24 * 365;

const fetchGeoJsonData = async (path: string): Promise<GeoJsonObject> => {
    const response = await fetch(path, {
        cache: 'force-cache',
        headers: {
            // Cache for 1 hour, then allow long stale-while-revalidate for resilience.
            'Cache-Control': `public, max-age=${CACHE_MAX_AGE_SECONDS}, stale-while-revalidate=${CACHE_STALE_WHILE_REVALIDATE_SECONDS}`,
        },
    });
    if (!response.ok) {
        throw new Error(`Network response was not ok when fetching ${path}`);
    }
    const data = await response.json();
    return data;
};

export function geoJsonQueryOptions(mapViewType: MapViewType) {
    const geoJsonPath = mapViewType === 'UAT' ? '/assets/geojson/uat.json' : '/assets/geojson/judete.json';
    return {
        queryKey: ['geoJsonData', mapViewType] as const,
        queryFn: () => fetchGeoJsonData(geoJsonPath),
        staleTime: ONE_HOUR_IN_MS,
        gcTime: convertDaysToMs(7),
    } satisfies QueryOptions<GeoJsonObject, Error, GeoJsonObject, readonly [string, MapViewType]> & {
        staleTime?: number;
        gcTime?: number;
    };
}

export const useGeoJsonData = (mapViewType: MapViewType) => {
    return useQuery<GeoJsonObject, Error>({
        ...geoJsonQueryOptions(mapViewType),
        staleTime: ONE_HOUR_IN_MS,
        gcTime: convertDaysToMs(7),
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        refetchOnMount: false,
        // Relative asset URLs (e.g. /assets/geojson/*.json) are browser-only.
        enabled: isBrowser && !!mapViewType,
    });
};
