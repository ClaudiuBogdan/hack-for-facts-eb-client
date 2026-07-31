import { describe, expect, it } from 'vitest';
import { buildAdvancedMapDatasetUatDirectory } from './use-advanced-map-dataset-uat-directory';
import uatGeoJson from '../../../../public/geojson/uat-2026-03-09.json';

describe('advanced-map-dataset-uat-directory', () => {
  it('loads the editor directory from local geojson data', () => {
    const directory = buildAdvancedMapDatasetUatDirectory(uatGeoJson);

    expect(directory.rows.length).toBeGreaterThan(3000);
    expect(directory.rows[0]).toMatchObject({
      sirutaCode: expect.any(String),
      cui: expect.any(String),
      name: expect.any(String),
      countyName: expect.any(String),
    });

    const known = directory.bySirutaCode.get('153400');
    expect(known).toMatchObject({
      sirutaCode: '153400',
      cui: '4781141',
      name: 'Năsturelu',
      countyName: 'Teleorman',
      countyCode: 'TR',
    });

    const sibiu = directory.bySirutaCode.get('143450');
    expect(sibiu).toMatchObject({
      sirutaCode: '143450',
      name: 'Sibiu',
      countyName: 'Sibiu',
      levelName: 'Municipiu resedinta de judet',
    });
  });
});
