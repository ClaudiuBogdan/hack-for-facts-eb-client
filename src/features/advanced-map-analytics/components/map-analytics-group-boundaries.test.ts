import { describe, expect, it } from 'vitest';
import {
  buildGroupWorkspaceBoundaryGeoJsonData,
  buildMapGroupBoundaryGeoJsonData,
} from './map-analytics-group-boundaries';
import type { UatFeature } from '@/components/maps/interfaces';
import type { FeatureCollection, MultiLineString } from 'geojson';

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

function getBoundaryLineStrings(boundaryData: unknown): number[][][] {
  const features =
    boundaryData &&
    typeof boundaryData === 'object' &&
    'type' in boundaryData &&
    boundaryData.type === 'FeatureCollection'
      ? (boundaryData as FeatureCollection<MultiLineString>).features
      : [];

  return features.flatMap((feature) =>
    feature.geometry?.type === 'MultiLineString' ? feature.geometry.coordinates : []
  );
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
        ? (boundaryData as FeatureCollection<MultiLineString>).features
        : [];
    expect(features).toHaveLength(1);
    expect(features[0]?.geometry?.type).toBe('MultiLineString');
    expect(features[0]?.geometry?.coordinates).toHaveLength(6);
    expect(
      getBoundaryLineStrings(boundaryData).some((coordinates) =>
        JSON.stringify(coordinates) === JSON.stringify([[1, 0], [1, 1]]) ||
        JSON.stringify(coordinates) === JSON.stringify([[1, 1], [1, 0]])
      )
    ).toBe(false);
  });

  it('builds one MultiLineString feature for each group in a workspace', () => {
    const boundaryData = buildGroupWorkspaceBoundaryGeoJsonData(
      [
        { id: 'grp_1', memberSirutaCodes: ['1001'] },
        { id: 'grp_2', memberSirutaCodes: ['2002'] },
      ],
      [
        createSquareFeature('1001', [[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]),
        createSquareFeature('2002', [[2, 0], [3, 0], [3, 1], [2, 1], [2, 0]]),
      ],
    );

    const features =
      boundaryData?.type === 'FeatureCollection'
        ? (boundaryData as FeatureCollection<MultiLineString>).features
        : [];
    expect(features).toHaveLength(2);
    expect(features.map((feature) => feature.properties?.groupId)).toEqual(['grp_1', 'grp_2']);
    expect(features.every((feature) => feature.geometry?.type === 'MultiLineString')).toBe(true);
  });

  it('uses the same optimized boundary path for a selected group', () => {
    const boundaryData = buildMapGroupBoundaryGeoJsonData(
      {
        id: 'grp_1',
        memberSirutaCodes: ['1001', '2002'],
      },
      [
        createSquareFeature('1001', [[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]),
        createSquareFeature('2002', [[1, 0], [2, 0], [2, 1], [1, 1], [1, 0]]),
      ],
    );

    const features =
      boundaryData?.type === 'FeatureCollection'
        ? (boundaryData as FeatureCollection<MultiLineString>).features
        : [];
    expect(features).toHaveLength(1);
    expect(features[0]?.geometry?.coordinates).toHaveLength(6);
  });

  it('ignores missing member SIRUTA codes without failing', () => {
    const boundaryData = buildGroupWorkspaceBoundaryGeoJsonData(
      [{ id: 'grp_1', memberSirutaCodes: ['1001', 'missing'] }],
      [createSquareFeature('1001', [[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]])],
    );

    expect(getBoundaryLineStrings(boundaryData)).toHaveLength(4);
  });

  it('removes segmented internal seams through the bounded geometry fallback', () => {
    const boundaryData = buildGroupWorkspaceBoundaryGeoJsonData(
      [{ id: 'grp_1', memberSirutaCodes: ['1001', '2002'] }],
      [
        createSquareFeature('1001', [[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]),
        createSquareFeature('2002', [[1, 0], [2, 0], [2, 1], [1, 1], [1, 0.5], [1, 0]]),
      ],
    );

    expect(
      getBoundaryLineStrings(boundaryData).some((coordinates) =>
        JSON.stringify(coordinates).includes('[1,0]') &&
        JSON.stringify(coordinates).includes('[1,1]')
      )
    ).toBe(false);
  });
});
