import { describe, expect, it } from 'vitest';
import { buildGroupWorkspaceBoundaryGeoJsonData } from './map-analytics-group-boundaries';
import type { UatFeature } from '@/components/maps/interfaces';
import type { FeatureCollection, LineString } from 'geojson';

function createSquareFeature(
  sirutaCode: string,
  coordinates: [number, number][]
): UatFeature {
  return {
    type: 'Feature',
    properties: {
      natcode: sirutaCode,
      name: `UAT ${sirutaCode}`,
      county: 'Alba',
    },
    geometry: {
      type: 'Polygon',
      coordinates: [coordinates],
    },
  };
}

describe('buildGroupWorkspaceBoundaryGeoJsonData', () => {
  it('builds exterior group boundaries without internal member seams', () => {
    const boundaryData = buildGroupWorkspaceBoundaryGeoJsonData(
      [
        {
          id: 'grp_1',
          memberSirutaCodes: ['1001', '2002'],
        },
      ],
      [
        createSquareFeature('1001', [[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]),
        createSquareFeature('2002', [[1, 0], [2, 0], [2, 1], [1, 1], [1, 0]]),
      ]
    );

    expect(boundaryData?.type).toBe('FeatureCollection');
    const features =
      boundaryData?.type === 'FeatureCollection'
        ? (boundaryData as FeatureCollection<LineString>).features
        : [];
    expect(features).toHaveLength(6);
    expect(features.every((feature) => feature.geometry?.type === 'LineString')).toBe(true);
    expect(
      features.some((feature) => {
        if (feature.geometry?.type !== 'LineString') {
          return false;
        }

        const coordinates = feature.geometry.coordinates;
        return JSON.stringify(coordinates) === JSON.stringify([[1, 0], [1, 1]]) ||
          JSON.stringify(coordinates) === JSON.stringify([[1, 1], [1, 0]]);
      })
    ).toBe(false);
  });
});
