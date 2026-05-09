import { describe, expect, it } from 'vitest';
import type { Feature, FeatureCollection, Polygon } from 'geojson';
import { getEntityFeatureInfo } from './utils';
import type { EntityDetailsData } from '@/lib/api/entities';

function createPolygonFeatureCollection(
  features: Array<Feature<Polygon>>
): FeatureCollection<Polygon> {
  return {
    type: 'FeatureCollection',
    features,
  };
}

describe('entity utils', () => {
  it('matches Bucharest on the county map when the entity is resolved through the municipality CUI', () => {
    const entity: EntityDetailsData = {
      cui: '4267117',
      name: 'Municipiul Bucuresti',
      default_report_type: 'PRINCIPAL_AGGREGATED',
      entity_type: 'admin_municipality',
      uat: {
        county_code: 'b',
      },
    };
    const geoJsonData = createPolygonFeatureCollection([
      {
        type: 'Feature',
        properties: { mnemonic: 'B' },
        geometry: {
          type: 'Polygon',
          coordinates: [[[26, 44], [27, 44], [27, 45], [26, 45], [26, 44]]],
        },
      },
    ]);

    const featureInfo = getEntityFeatureInfo(entity, geoJsonData);

    expect(featureInfo).toMatchObject({
      center: [44.5, 26.5],
      featureId: 'B',
    });
    expect(featureInfo?.zoom).toBeGreaterThan(0);
  });

  it('centers Bucharest municipality on sector geometries in the UAT map', () => {
    const entity: EntityDetailsData = {
      cui: '4267117',
      name: 'Municipiul Bucuresti',
      default_report_type: 'PRINCIPAL_AGGREGATED',
      entity_type: 'admin_municipality',
      uat: null,
    };
    const geoJsonData = createPolygonFeatureCollection([
      {
        type: 'Feature',
        properties: {
          countyMn: 'B',
          name: 'București Sectorul 1',
          natLevName: 'Sectoarele municipiului Bucuresti',
          natcode: '179141',
        },
        geometry: {
          type: 'Polygon',
          coordinates: [[[26, 44], [27, 44], [27, 45], [26, 45], [26, 44]]],
        },
      },
      {
        type: 'Feature',
        properties: {
          countyMn: 'B',
          name: 'București Sectorul 2',
          natLevName: 'Sectoarele municipiului Bucuresti',
          natcode: '179150',
        },
        geometry: {
          type: 'Polygon',
          coordinates: [[[27, 45], [28, 45], [28, 46], [27, 46], [27, 45]]],
        },
      },
    ]);

    const featureInfo = getEntityFeatureInfo(entity, geoJsonData);

    expect(featureInfo).toMatchObject({
      center: [45, 27],
      featureId: '4267117',
    });
    expect(featureInfo?.zoom).toBeGreaterThan(0);
  });

  it('normalizes county codes before matching county geometry', () => {
    const entity: EntityDetailsData = {
      cui: '34',
      name: 'Consiliul Judetean Teleorman',
      default_report_type: 'PRINCIPAL_AGGREGATED',
      entity_type: 'admin_county_council',
      uat: {
        county_code: ' tr ',
      },
    };
    const geoJsonData = createPolygonFeatureCollection([
      {
        type: 'Feature',
        properties: { mnemonic: 'TR' },
        geometry: {
          type: 'Polygon',
          coordinates: [[[25, 43.5], [26, 43.5], [26, 44.5], [25, 44.5], [25, 43.5]]],
        },
      },
    ]);

    const featureInfo = getEntityFeatureInfo(entity, geoJsonData);

    expect(featureInfo).toMatchObject({
      center: [44, 25.5],
      featureId: 'TR',
    });
  });

  it('matches UAT features by SIRUTA code without changing the center order', () => {
    const entity: EntityDetailsData = {
      cui: '12345678',
      name: 'Primaria Test',
      default_report_type: 'PRINCIPAL_AGGREGATED',
      entity_type: 'admin_municipality',
      uat: {
        siruta_code: 123456,
      },
    };
    const geoJsonData = createPolygonFeatureCollection([
      {
        type: 'Feature',
        properties: { natcode: '123456' },
        geometry: {
          type: 'Polygon',
          coordinates: [[[23, 46], [24, 46], [24, 47], [23, 47], [23, 46]]],
        },
      },
    ]);

    const featureInfo = getEntityFeatureInfo(entity, geoJsonData);

    expect(featureInfo).toMatchObject({
      center: [46.5, 23.5],
      featureId: '123456',
    });
    expect(featureInfo?.zoom).toBeCloseTo(7.1, 1);
  });

  it('caps tiny UAT feature zoom so the embedded map keeps surrounding context', () => {
    const entity: EntityDetailsData = {
      cui: '12345678',
      name: 'Primaria Test',
      default_report_type: 'PRINCIPAL_AGGREGATED',
      entity_type: 'admin_municipality',
      uat: {
        siruta_code: 123456,
      },
    };
    const geoJsonData = createPolygonFeatureCollection([
      {
        type: 'Feature',
        properties: { natcode: '123456' },
        geometry: {
          type: 'Polygon',
          coordinates: [[
            [23, 46],
            [23.01, 46],
            [23.01, 46.01],
            [23, 46.01],
            [23, 46],
          ]],
        },
      },
    ]);

    const featureInfo = getEntityFeatureInfo(entity, geoJsonData);

    expect(featureInfo?.zoom).toBe(10);
  });
});
