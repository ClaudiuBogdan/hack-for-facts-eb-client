import { useQuery } from '@tanstack/react-query';
import type { AdvancedMapDatasetReferenceRow } from '@/features/advanced-map-datasets/types';
import uatGeoJson from '@/assets/geojson/uat.json';

type UatGeoJsonFeature = {
  properties?: {
    natcode?: string;
    cui?: string;
    name?: string;
    county?: string;
    countyMn?: string;
    natLevName?: string;
  };
};

type UatGeoJsonCollection = {
  features?: UatGeoJsonFeature[];
};

function normalizeText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function isCountyLevelFeature(levelName: string): boolean {
  const normalizedLevelName = levelName.toLowerCase();
  return normalizedLevelName === 'judet' || normalizedLevelName.includes('consiliu judetean');
}

export interface AdvancedMapDatasetUatDirectory {
  rows: AdvancedMapDatasetReferenceRow[];
  bySirutaCode: Map<string, AdvancedMapDatasetReferenceRow>;
}

export async function getAdvancedMapDatasetUatDirectory(): Promise<AdvancedMapDatasetUatDirectory> {
  const collection = uatGeoJson as UatGeoJsonCollection;
  const features = Array.isArray(collection.features) ? collection.features : [];

  const rows: AdvancedMapDatasetReferenceRow[] = [];

  features.forEach((feature, index) => {
    const properties = feature.properties ?? {};
    const sirutaCode = normalizeText(properties.natcode);
    const cui = normalizeText(properties.cui);
    const name = normalizeText(properties.name);
    const countyName = normalizeText(properties.county);
    const countyCode = normalizeText(properties.countyMn);
    const natLevName = normalizeText(properties.natLevName);

    if (sirutaCode === '' || cui === '' || name === '' || countyName === '') {
      return;
    }

    if (isCountyLevelFeature(natLevName)) {
      return;
    }

    rows.push({
      uatId: `geojson:${index + 1}`,
      sirutaCode,
      cui,
      name,
      levelName: natLevName === '' ? null : natLevName,
      countyName,
      countyCode: countyCode === '' ? null : countyCode,
      isCounty: false,
    });
  });

  rows.sort((left, right) => left.name.localeCompare(right.name, 'ro'));

  const bySirutaCode = new Map(rows.map((row) => [row.sirutaCode, row]));

  return {
    rows,
    bySirutaCode,
  };
}

export function useAdvancedMapDatasetUatDirectoryQuery() {
  return useQuery<AdvancedMapDatasetUatDirectory, Error>({
    queryKey: ['advanced-map-datasets', 'uat-directory'],
    queryFn: async () => getAdvancedMapDatasetUatDirectory(),
    staleTime: Infinity,
    gcTime: Infinity,
  });
}
