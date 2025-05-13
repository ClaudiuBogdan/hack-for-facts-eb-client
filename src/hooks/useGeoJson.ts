import { useQuery } from "@tanstack/react-query";
import { GeoJsonObject } from 'geojson';

const fetchGeoJsonData = async (): Promise<GeoJsonObject> => {
  // Assuming uats.json is in the public folder or served at this path
  const response = await fetch('assets/uats.json');
  if (!response.ok) {
    throw new Error('Network response was not ok when fetching uats.json');
  }
  return response.json();
};

export const useGeoJson = () => {
  return useQuery<GeoJsonObject, Error>({
    queryKey: ['geoJsonUatData'], // Unique key for this query
    queryFn: fetchGeoJsonData,
    staleTime: 1000 * 60 * 60 * 24, // 1 day
  });
}; 