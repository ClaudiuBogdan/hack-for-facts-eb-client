import { describe, expect, it } from 'vitest';
import type { FeatureCollection } from 'geojson';
import { adaptMapBoundaryData } from './map-boundary-data';
import { buildPublicMapFeatureStyle, buildPublicMapTooltipContent, buildUatMetadataBySirutaCode, selectUatFeatures } from './components/map-analytics-public-view-helpers';
import { createDefaultAdvancedMapAnalyticsSeries } from '@/schemas/advanced-map-analytics';

const raw: FeatureCollection = { type: 'FeatureCollection', features: [{ type: 'Feature', properties: { mnemonic: 'CJ', countyCode: 127, name: 'Cluj' }, geometry: { type: 'Polygon', coordinates: [] } }] };

describe('advanced-map county boundaries', () => {
  it('uses the native mnemonic for colors, tooltips and table metadata without changing the asset', () => {
    const features = selectUatFeatures(adaptMapBoundaryData(raw, 'County'));
    const feature = features[0]!;
    expect(feature.properties).toMatchObject({ natcode: 'CJ', mnemonic: 'CJ', county: 'Cluj', countyCode: 127 });
    expect(raw.features[0]!.properties).not.toHaveProperty('natcode');
    expect(buildUatMetadataBySirutaCode(features).get('CJ')).toMatchObject({ uatName: 'Cluj', countyName: 'Cluj' });
    const bins = { groupsBySiruta: new Map(), palette: [], warnings: [] };
    const values = new Map([['CJ', '123']]);
    const style = buildPublicMapFeatureStyle({ binsCanApply: false, binsClassification: bins, activeNoDataConfig: undefined, isContinuousIntervalMode: true, colorRange: { min: 0, max: 123 }, values, gradient: { startColor: '#ffffff', endColor: '#ff0000' } });
    expect(style(feature, new Map([['CJ', { siruta_code: 'CJ', uat_id: 'CJ', uat_code: 'CJ', uat_name: '', county_code: '', county_name: '', population: 0, amount: 123, total_amount: 123, per_capita_amount: 123 }]]))).toMatchObject({ fillColor: '#ff0000', fillOpacity: 0.7 });
    const series = createDefaultAdvancedMapAnalyticsSeries('line-items-aggregated-yearly');
    const tooltip = buildPublicMapTooltipContent({ enabledSeries: [series], activeSeries: series, activeSeriesId: series.id, valuesBySeriesId: new Map([[series.id, values]]), unitsBySeriesId: new Map([[series.id, 'RON']]), binsCanApply: false, binsClassification: bins, activeNoDataConfig: undefined });
    const html = tooltip({ properties: feature.properties, heatmapData: [], mapViewType: 'County', filters: {} });
    expect(html).toContain('Cluj');
    expect(html).toContain('123');
  });
  it('leaves UAT keys and absent data unchanged', () => {
    expect(adaptMapBoundaryData(raw, 'UAT')).toBe(raw);
    expect(adaptMapBoundaryData(undefined, 'County')).toBeUndefined();
  });
});
