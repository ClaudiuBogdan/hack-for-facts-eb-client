import { describe, expect, it } from 'vitest';
import { createDefaultAdvancedMapAnalyticsSeries } from '@/schemas/advanced-map-analytics';
import {
  buildPublicEntityGroupContext,
  buildPublicEntitySeriesRows,
  buildPublicEntityUatSeriesRows,
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
    const sourceSeries = createDefaultAdvancedMapAnalyticsSeries('line-items-aggregated-yearly');
    sourceSeries.id = 'source_series';
    sourceSeries.label = 'Source value';

    const groupedSeries = createDefaultAdvancedMapAnalyticsSeries('map-grouped-value-series');
    if (groupedSeries.type !== 'map-grouped-value-series') {
      throw new Error('Unexpected series type in test setup');
    }
    groupedSeries.id = 'grouped_series';
    groupedSeries.label = 'Grouped value';
    groupedSeries.sourceSeriesId = sourceSeries.id;

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
        [sourceSeries.id, new Map([['1001', 123]])],
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

    const uatRows = buildPublicEntityUatSeriesRows({
      enabledSeries: [groupedSeries],
      activeSeriesId: groupedSeries.id,
      selection: {
        sirutaCode: '1001',
        title: 'Central cluster',
        uatName: 'Comuna Test',
      },
      valuesBySeriesId: new Map([
        [groupedSeries.id, new Map([['grp_1', 456], ['1001', 999]])],
        [sourceSeries.id, new Map([['1001', 123]])],
      ]),
      unitsBySeriesId: new Map([[groupedSeries.id, 'RON']]),
      domainsBySeriesId: new Map([
        [groupedSeries.id, { type: 'group', groupWorkspaceId: 'manual-map-groups' }],
      ]),
      groupValuesBySirutaCode: new Map([
        ['1001', { 'manual-map-groups': 'grp_1' }],
      ]),
    });

    expect(uatRows[0]?.value).toContain('123');
    expect(uatRows[0]?.value).not.toContain('456');
    expect(uatRows[0]?.value).not.toContain('999');
  });

  it('marks filtered group rows while keeping raw UAT member values available', () => {
    const sourceSeries = createDefaultAdvancedMapAnalyticsSeries('line-items-aggregated-yearly');
    sourceSeries.id = 'source_series';
    sourceSeries.label = 'Population';

    const groupedSeries = createDefaultAdvancedMapAnalyticsSeries('map-grouped-value-series');
    if (groupedSeries.type !== 'map-grouped-value-series') {
      throw new Error('Unexpected series type in test setup');
    }
    groupedSeries.id = 'grouped_series';
    groupedSeries.sourceSeriesId = sourceSeries.id;
    groupedSeries.label = 'Population';

    const filteredValuesBySeriesId = new Map([
      [groupedSeries.id, new Map<string, number | undefined>()],
      [sourceSeries.id, new Map<string, number | undefined>()],
    ]);
    const unfilteredValuesBySeriesId = new Map([
      [groupedSeries.id, new Map([['grp_1', 4_500]])],
      [sourceSeries.id, new Map([['1001', 2_000], ['2002', 2_500]])],
    ]);

    const groupRows = buildPublicEntitySeriesRows({
      enabledSeries: [groupedSeries],
      activeSeriesId: groupedSeries.id,
      selection: {
        sirutaCode: '1001',
        title: 'Comuna Test',
        uatName: 'Comuna Test',
      },
      valuesBySeriesId: filteredValuesBySeriesId,
      unfilteredValuesBySeriesId,
      unitsBySeriesId: new Map([[groupedSeries.id, 'loc.']]),
      domainsBySeriesId: new Map([
        [groupedSeries.id, { type: 'group', groupWorkspaceId: 'manual-map-groups' }],
      ]),
      groupValuesBySirutaCode: new Map([
        ['1001', { 'manual-map-groups': 'grp_1' }],
      ]),
    });

    expect(groupRows[0]).toMatchObject({
      value: 'Filtered out',
      isFilteredOut: true,
    });
    expect(groupRows[0]?.unfilteredValue).toContain('4.5');

    const context = buildPublicEntityGroupContext({
      activeGroupWorkspaceId: 'manual-map-groups',
      activeSeriesId: groupedSeries.id,
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
      groupSeriesRows: groupRows,
      groupValuesBySirutaCode: new Map([
        ['1001', { 'manual-map-groups': 'grp_1' }],
      ]),
      selection: {
        sirutaCode: '1001',
        title: 'Comuna Test',
        uatName: 'Comuna Test',
      },
      sourceSeriesIdBySeriesId: new Map([[groupedSeries.id, sourceSeries.id]]),
      uatMetadataBySirutaCode: new Map([
        ['1001', { uatName: 'Comuna Test', countyName: 'Alba' }],
        ['2002', { uatName: 'Second UAT', countyName: 'Alba' }],
      ]),
      uatSeriesRows: [],
      valuesBySeriesId: filteredValuesBySeriesId,
      unfilteredValuesBySeriesId,
      unitsBySeriesId: new Map([[groupedSeries.id, 'loc.']]),
    });

    expect(context?.memberRows?.map((row) => row.value)).toEqual([2_000, 2_500]);
  });

  it('keeps raw member values in group context for active UAT-domain series', () => {
    const populationSeries = createDefaultAdvancedMapAnalyticsSeries('geojson-dataset-series');
    if (populationSeries.type !== 'geojson-dataset-series') {
      throw new Error('Unexpected series type in test setup');
    }
    populationSeries.id = 'population';
    populationSeries.label = 'Population';

    const groupRows = buildPublicEntitySeriesRows({
      enabledSeries: [populationSeries],
      activeSeriesId: 'population',
      selection: {
        sirutaCode: '1001',
        title: 'Comuna Test',
        uatName: 'Comuna Test',
      },
      valuesBySeriesId: new Map([
        ['population', new Map<string, number | undefined>()],
      ]),
      unfilteredValuesBySeriesId: new Map([
        ['population', new Map([['1001', 483]])],
      ]),
      displayValuesBySeriesId: new Map([
        ['population', new Map<string, number | undefined>()],
      ]),
      unfilteredDisplayValuesBySeriesId: new Map([
        ['population', new Map([['1001', 980]])],
      ]),
      unitsBySeriesId: new Map([['population', 'loc.']]),
      domainsBySeriesId: new Map([['population', { type: 'uat' }]]),
      groupValuesBySirutaCode: new Map([
        ['1001', { 'manual-map-groups': 'grp_1' }],
      ]),
    });

    expect(groupRows[0]).toMatchObject({
      isFilteredOut: true,
    });
    expect(groupRows[0]?.unfilteredValue).toContain('980');

    const context = buildPublicEntityGroupContext({
      activeGroupWorkspaceId: 'manual-map-groups',
      activeSeriesId: 'population',
      groupMetadataById: new Map([
        [
          'manual-map-groups::grp_1',
          {
            groupWorkspaceId: 'manual-map-groups',
            groupingLabel: 'Manual groups',
            groupLabel: 'Central cluster',
            memberSirutaCodes: ['1001', '1002'],
          },
        ],
      ]),
      groupSeriesRows: [
        {
          id: 'population',
          isActive: true,
          label: 'Population',
          value: 'Filtered out',
          isFilteredOut: true,
        },
      ],
      groupValuesBySirutaCode: new Map([
        ['1001', { 'manual-map-groups': 'grp_1' }],
      ]),
      selection: {
        sirutaCode: '1001',
        title: 'Comuna Test',
        uatName: 'Comuna Test',
      },
      uatMetadataBySirutaCode: new Map([
        ['1001', { uatName: 'Comuna Test', countyName: 'Alba' }],
        ['1002', { uatName: 'Second UAT', countyName: 'Alba' }],
      ]),
      uatSeriesRows: [],
      valuesBySeriesId: new Map([
        ['population', new Map<string, number | undefined>()],
      ]),
      unfilteredValuesBySeriesId: new Map([
        [
          'population',
          new Map<string, number | undefined>([
            ['1001', 483],
            ['1002', 497],
          ]),
        ],
      ]),
      unitsBySeriesId: new Map([['population', 'loc.']]),
    });

    expect(context?.memberRows?.map((row) => row.value)).toEqual([483, 497]);
  });

  it('builds group context for public entity details', () => {
    const context = buildPublicEntityGroupContext({
      activeGroupWorkspaceId: 'manual-map-groups',
      groupMetadataById: new Map([
        [
          'manual-map-groups::grp_1',
          {
            groupWorkspaceId: 'manual-map-groups',
            groupingLabel: 'Manual groups',
            groupLabel: 'Central cluster',
            memberSirutaCodes: ['1001', '2002', '3003', '4004', '5005', '6006'],
          },
        ],
      ]),
      groupSeriesRows: [
        {
          id: 'series_1',
          isActive: true,
          label: 'Group value',
          value: '600',
        },
      ],
      groupValuesBySirutaCode: new Map([
        ['1001', { 'manual-map-groups': 'grp_1' }],
      ]),
      selection: {
        sirutaCode: '1001',
        title: 'Comuna Test',
        uatName: 'Comuna Test',
      },
      uatMetadataBySirutaCode: new Map([
        ['1001', { uatName: 'Comuna Test', countyName: 'Alba' }],
        ['2002', { uatName: 'Second UAT', countyName: 'Alba' }],
        ['3003', { uatName: 'Third UAT', countyName: 'Alba' }],
        ['4004', { uatName: 'Fourth UAT', countyName: 'Alba' }],
        ['5005', { uatName: 'Fifth UAT', countyName: 'Alba' }],
        ['6006', { uatName: 'Sixth UAT', countyName: 'Alba' }],
      ]),
      uatSeriesRows: [
        {
          id: 'series_1',
          isActive: true,
          label: 'UAT value',
          value: '100',
        },
      ],
      valuesBySeriesId: new Map([
        [
          'series_1',
          new Map([
            ['1001', 10],
            ['2002', 60],
            ['3003', 30],
            ['4004', undefined],
            ['5005', 50],
            ['6006', 20],
          ]),
        ],
      ]),
      unitsBySeriesId: new Map([['series_1', 'loc.']]),
    });

    expect(context).toMatchObject({
      groupLabel: 'Central cluster',
      memberCount: 6,
      selectedUatName: 'Comuna Test',
      workspaceLabel: 'Manual groups',
    });
    expect(context?.memberPreviewLabels).toEqual([
      'Comuna Test',
      'Second UAT',
      'Third UAT',
      'Fourth UAT',
      'Fifth UAT',
      '+1 more',
    ]);
    expect(context?.memberRows?.map((row) => row.sirutaCode)).toEqual([
      '1001',
      '2002',
      '3003',
      '4004',
      '5005',
      '6006',
    ]);
    expect(context?.memberRows?.find((row) => row.sirutaCode === '2002')?.formattedValue)
      .toContain('60');
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
