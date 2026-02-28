import { useQuery, type QueryOptions } from "@tanstack/react-query";
import { GeoJsonObject } from 'geojson';
import { convertDaysToMs } from '@/lib/utils';

type MapViewType = 'UAT' | 'County'
const isBrowser = typeof window !== 'undefined'

const fetchGeoJsonData = async (path: string): Promise<GeoJsonObject> => {
    const response = await fetch(path, {
        cache: 'force-cache',
        headers: {
            // This header instructs the browser and intermediate caches to store the response for 7 days (max-age=604800),
            // and allows serving stale content while revalidating for up to 1 year (stale-while-revalidate=31536000).
            'Cache-Control': 'public, max-age=604800, stale-while-revalidate=31536000',
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
        staleTime: convertDaysToMs(1),
        gcTime: convertDaysToMs(7),
    } satisfies QueryOptions<GeoJsonObject, Error, GeoJsonObject, readonly [string, MapViewType]> & {
        staleTime?: number;
        gcTime?: number;
    };
}

export const useGeoJsonData = (mapViewType: MapViewType) => {
    return useQuery<GeoJsonObject, Error>({
        ...geoJsonQueryOptions(mapViewType),
        staleTime: convertDaysToMs(1),
        gcTime: convertDaysToMs(7),
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        refetchOnMount: false,
        // Relative asset URLs (e.g. /assets/geojson/*.json) are browser-only.
        enabled: isBrowser && !!mapViewType,
    });
};
