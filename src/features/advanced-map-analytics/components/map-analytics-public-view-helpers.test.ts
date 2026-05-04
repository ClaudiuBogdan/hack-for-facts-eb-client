import { describe, expect, it } from 'vitest';
import { createDefaultAdvancedMapAnalyticsSeries } from '@/schemas/advanced-map-analytics';
import { buildPublicMapTooltipContent } from './map-analytics-public-view-helpers';

describe('map analytics public view helpers', () => {
  it('uses group metadata as tooltip identity for grouped active series', () => {
    const groupedSeries = createDefaultAdvancedMapAnalyticsSeries('map-grouped-value-series');
    if (groupedSeries.type !== 'map-grouped-value-series') {
      throw new Error('Unexpected series type in test setup');
    }
    groupedSeries.id = 'grouped_series';
    groupedSeries.label = 'Grouped value';

    const getTooltipContent = buildPublicMapTooltipContent({
      enabledSeries: [groupedSeries],
      activeSeries: groupedSeries,
      activeSeriesId: groupedSeries.id,
      valuesBySeriesId: new Map([
        [groupedSeries.id, new Map([['1001', 456]])],
      ]),
      unitsBySeriesId: new Map([[groupedSeries.id, 'RON']]),
      binsCanApply: false,
      binsClassification: {
        groupsBySiruta: new Map(),
        palette: [],
        warnings: [],
      },
      activeNoDataConfig: undefined,
      domainsBySeriesId: new Map([
        [groupedSeries.id, { type: 'group', groupingId: 'manual-map-groups' }],
      ]),
      groupValuesBySirutaCode: new Map([
        ['1001', { 'manual-map-groups': 'grp_1' }],
      ]),
      groupMetadataById: new Map([
        [
          'manual-map-groups::grp_1',
          {
            groupingId: 'manual-map-groups',
            groupingLabel: 'Manual groups',
            groupLabel: 'Central cluster',
            memberSirutaCodes: ['1001', '2002'],
          },
        ],
      ]),
    });

    const tooltipHtml = getTooltipContent({
      properties: {
        natcode: '1001',
        name: 'Comuna Test',
        county: 'Harghita',
        cui: '12345678',
      },
      heatmapData: [],
      mapViewType: 'UAT',
      filters: {},
    });

    expect(tooltipHtml).toContain('Central cluster');
    expect(tooltipHtml).toContain('Manual groups');
    expect(tooltipHtml).toContain('2 UATs');
    expect(tooltipHtml).toContain('Grouped value');
    expect(tooltipHtml).not.toContain('CUI:');
    expect(tooltipHtml).not.toContain('Harghita');
  });
});
