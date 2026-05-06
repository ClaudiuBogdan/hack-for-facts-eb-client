import { describe, expect, it } from 'vitest';
import { createDefaultAdvancedMapAnalyticsSeries } from '@/schemas/advanced-map-analytics';
import {
  buildPublicEntitySeriesRows,
  buildPublicMapFeatureStyle,
  buildPublicMapTooltipContent,
} from './map-analytics-public-view-helpers';

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
        [groupedSeries.id, new Map([['grp_1', 456], ['1001', 999]])],
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
        [groupedSeries.id, { type: 'group', groupWorkspaceId: 'manual-map-groups' }],
      ]),
      groupValuesBySirutaCode: new Map([
        ['1001', { 'manual-map-groups': 'grp_1' }],
      ]),
      groupMetadataById: new Map([
        [
          'manual-map-groups::grp_1',
          {
            groupWorkspaceId: 'manual-map-groups',
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
    expect(tooltipHtml).toContain('456');
    expect(tooltipHtml).not.toContain('999');
    expect(tooltipHtml).not.toContain('CUI:');
    expect(tooltipHtml).not.toContain('Harghita');
  });

  it('uses group-domain values in public entity details rows', () => {
    const groupedSeries = createDefaultAdvancedMapAnalyticsSeries('map-grouped-value-series');
    if (groupedSeries.type !== 'map-grouped-value-series') {
      throw new Error('Unexpected series type in test setup');
    }
    groupedSeries.id = 'grouped_series';
    groupedSeries.label = 'Grouped value';

    const rows = buildPublicEntitySeriesRows({
      enabledSeries: [groupedSeries],
      activeSeriesId: groupedSeries.id,
      selection: {
        sirutaCode: '1001',
        title: 'Central cluster',
        uatName: 'Comuna Test',
      },
      valuesBySeriesId: new Map([
        [groupedSeries.id, new Map([['grp_1', 456], ['1001', 999]])],
      ]),
      unitsBySeriesId: new Map([[groupedSeries.id, 'RON']]),
      domainsBySeriesId: new Map([
        [groupedSeries.id, { type: 'group', groupWorkspaceId: 'manual-map-groups' }],
      ]),
      groupValuesBySirutaCode: new Map([
        ['1001', { 'manual-map-groups': 'grp_1' }],
      ]),
    });

    expect(rows[0]?.value).toContain('456');
    expect(rows[0]?.value).not.toContain('999');
  });

  it('uses render-unit display values for UAT-domain public tooltips and details', () => {
    const sourceSeries = createDefaultAdvancedMapAnalyticsSeries('line-items-aggregated-yearly');
    sourceSeries.id = 'source_series';
    sourceSeries.label = 'Source value';

    const valuesBySeriesId = new Map<string, Map<string, number | undefined>>([
      [sourceSeries.id, new Map([['1001', 10], ['2002', 20]])],
    ]);
    const displayValuesBySeriesId = new Map<string, Map<string, number | undefined>>([
      [sourceSeries.id, new Map([['1001', 30], ['2002', 30]])],
    ]);

    const getTooltipContent = buildPublicMapTooltipContent({
      enabledSeries: [sourceSeries],
      activeSeries: sourceSeries,
      activeSeriesId: sourceSeries.id,
      valuesBySeriesId,
      displayValuesBySeriesId,
      unitsBySeriesId: new Map([[sourceSeries.id, 'RON']]),
      binsCanApply: false,
      binsClassification: {
        groupsBySiruta: new Map(),
        palette: [],
        warnings: [],
      },
      activeNoDataConfig: undefined,
      domainsBySeriesId: new Map([[sourceSeries.id, { type: 'uat' }]]),
      groupValuesBySirutaCode: new Map(),
      groupMetadataById: new Map([
        [
          'manual-map-groups::grp_1',
          {
            groupWorkspaceId: 'manual-map-groups',
            groupingLabel: 'Manual groups',
            groupLabel: 'Central cluster',
            memberSirutaCodes: ['1001', '2002'],
          },
        ],
      ]),
      activeGroupWorkspaceId: 'manual-map-groups',
      renderUnitIdBySirutaCode: new Map([['1001', 'grp_1']]),
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
    expect(tooltipHtml).toContain('Source value');
    expect(tooltipHtml).toContain('30');
    expect(tooltipHtml).not.toContain('RON 10');

    const rows = buildPublicEntitySeriesRows({
      enabledSeries: [sourceSeries],
      activeSeriesId: sourceSeries.id,
      selection: {
        sirutaCode: '1001',
        title: 'Central cluster',
        uatName: 'Comuna Test',
      },
      valuesBySeriesId,
      displayValuesBySeriesId,
      unitsBySeriesId: new Map([[sourceSeries.id, 'RON']]),
      domainsBySeriesId: new Map([[sourceSeries.id, { type: 'uat' }]]),
      groupValuesBySirutaCode: new Map(),
    });

    expect(rows[0]?.value).toContain('30');
    expect(rows[0]?.value).not.toContain('RON 10');
  });

  it('uses render unit ids for public map bin colors', () => {
    const getFeatureStyle = buildPublicMapFeatureStyle({
      binsCanApply: true,
      binsClassification: {
        groupsBySiruta: new Map([
          ['grp_1', { groupId: 'bin_1', label: 'Bin 1', color: '#123456', isNoData: false }],
        ]),
        palette: [],
        warnings: [],
      },
      activeNoDataConfig: undefined,
      isContinuousIntervalMode: false,
      colorRange: { min: 0, max: 100 },
      renderUnitIdBySirutaCode: new Map([
        ['1001', 'grp_1'],
        ['2002', 'grp_1'],
      ]),
    });

    const firstMemberStyle = getFeatureStyle(
      {
        type: 'Feature',
        properties: { natcode: '1001', name: 'First UAT', county: 'Alba' },
        geometry: {
          type: 'Polygon',
          coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]],
        },
      },
      new Map()
    );
    const secondMemberStyle = getFeatureStyle(
      {
        type: 'Feature',
        properties: { natcode: '2002', name: 'Second UAT', county: 'Alba' },
        geometry: {
          type: 'Polygon',
          coordinates: [[[1, 0], [2, 0], [2, 1], [1, 1], [1, 0]]],
        },
      },
      new Map()
    );

    expect(firstMemberStyle.fillColor).toBe('#123456');
    expect(secondMemberStyle.fillColor).toBe('#123456');
    expect(firstMemberStyle.color).toBe('#0f172a');
    expect(firstMemberStyle.weight).toBe(0.2);
    expect(firstMemberStyle.opacity).toBe(1);
  });
});
