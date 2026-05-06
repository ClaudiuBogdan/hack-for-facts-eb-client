import { describe, expect, it } from 'vitest';
import { createDefaultAdvancedMapAnalyticsSeries, type MapGroupWorkspace } from '@/schemas/advanced-map-analytics';
import type { MapSeriesDomainCache, MapSeriesVectorCache } from '@/lib/map-series/interfaces';
import {
  buildAdvancedMapAnalyticsTableRows,
  getDefaultAdvancedMapAnalyticsTableRowMode,
} from './advanced-map-analytics-table-rows';
import type { AdvancedMapAnalyticsTableSeriesColumn } from './advanced-map-analytics-table-types';

describe('advanced map analytics table rows', () => {
  const workspace: MapGroupWorkspace = {
    id: 'manual',
    key: 'manual',
    label: 'Manual groups',
    groups: [
      {
        id: 'grp_1',
        label: 'Group 1',
        primarySirutaCode: '1002',
        memberSirutaCodes: ['1001', '1002'],
        memberOrder: ['1001', '1002'],
      },
    ],
  };

  const sourceSeries = createDefaultAdvancedMapAnalyticsSeries('line-items-aggregated-yearly');
  sourceSeries.id = 'source';
  sourceSeries.label = 'Source';

  const groupedSeries = createDefaultAdvancedMapAnalyticsSeries('map-grouped-value-series');
  if (groupedSeries.type !== 'map-grouped-value-series') {
    throw new Error('Expected grouped value series.');
  }
  groupedSeries.id = 'grouped';
  groupedSeries.label = 'Grouped';
  groupedSeries.sourceSeriesId = sourceSeries.id;
  groupedSeries.groupWorkspaceId = workspace.id;

  const seriesColumns: AdvancedMapAnalyticsTableSeriesColumn[] = [
    { id: sourceSeries.id, label: 'Source' },
    { id: groupedSeries.id, label: 'Grouped' },
  ];

  const valuesBySeriesId: MapSeriesVectorCache = new Map([
    [
      sourceSeries.id,
      new Map([
        ['1001', 10],
        ['1002', 15],
        ['9999', 99],
      ]),
    ],
    [groupedSeries.id, new Map([['grp_1', 25]])],
  ]);

  const domainsBySeriesId: MapSeriesDomainCache = new Map([
    [sourceSeries.id, { type: 'uat' }],
    [groupedSeries.id, { type: 'group', groupWorkspaceId: workspace.id }],
  ]);

  const groupValuesBySirutaCode = new Map([
    ['1001', { manual: 'grp_1' }],
    ['1002', { manual: 'grp_1' }],
  ]);

  const uatMetadataBySirutaCode = new Map([
    ['1001', { uatName: 'Alpha', countyName: 'Alba' }],
    ['1002', { uatName: 'Beta', countyName: 'Bihor' }],
    ['8888', { uatName: 'Metadata only', countyName: 'Dolj' }],
    ['9999', { uatName: 'Ungrouped', countyName: 'Cluj' }],
  ]);

  it('defaults to grouped rows with members when a group workspace is active', () => {
    expect(getDefaultAdvancedMapAnalyticsTableRowMode({ activeGroupWorkspace: workspace }))
      .toBe('group_rows_with_members');
  });

  it('builds group rows with summed source values and direct grouped values', () => {
    const result = buildAdvancedMapAnalyticsTableRows({
      rowMode: 'group_rows',
      activeGroupWorkspace: workspace,
      seriesColumns,
      enabledSeries: [sourceSeries, groupedSeries],
      valuesBySeriesId,
      mapValuesBySeriesId: valuesBySeriesId,
      domainsBySeriesId,
      groupValuesBySirutaCode,
      uatMetadataBySirutaCode,
      activeSeriesId: sourceSeries.id,
      showMemberValues: true,
      unknownCountyLabel: 'Unknown county',
    });

    expect(result.rows).toHaveLength(1);
    expect(result.hiddenUngroupedUatCount).toBe(1);
    expect(result.rows[0]).toMatchObject({
      kind: 'group',
      groupId: 'grp_1',
      uatName: 'Group 1',
      primaryUatName: 'Beta',
      memberCount: 2,
      valuesBySeriesId: {
        source: 25,
        grouped: 25,
      },
    });
  });

  it('adds ordered member rows with raw source values', () => {
    const result = buildAdvancedMapAnalyticsTableRows({
      rowMode: 'group_rows_with_members',
      activeGroupWorkspace: workspace,
      seriesColumns,
      enabledSeries: [sourceSeries, groupedSeries],
      valuesBySeriesId,
      mapValuesBySeriesId: valuesBySeriesId,
      domainsBySeriesId,
      groupValuesBySirutaCode,
      uatMetadataBySirutaCode,
      activeSeriesId: sourceSeries.id,
      showMemberValues: true,
      unknownCountyLabel: 'Unknown county',
    });

    expect(result.rows.map((row) => row.uatName)).toEqual(['Group 1', 'Beta', 'Alpha']);
    expect(result.rows[1]).toMatchObject({
      kind: 'group-member',
      sirutaCode: '1002',
      valuesBySeriesId: {
        source: 15,
        grouped: 15,
      },
    });
    expect(result.rows[2]?.valuesBySeriesId.source).toBe(10);
  });

  it('can hide member values while keeping group totals', () => {
    const result = buildAdvancedMapAnalyticsTableRows({
      rowMode: 'group_rows_with_members',
      activeGroupWorkspace: workspace,
      seriesColumns,
      enabledSeries: [sourceSeries, groupedSeries],
      valuesBySeriesId,
      mapValuesBySeriesId: valuesBySeriesId,
      domainsBySeriesId,
      groupValuesBySirutaCode,
      uatMetadataBySirutaCode,
      activeSeriesId: sourceSeries.id,
      showMemberValues: false,
      unknownCountyLabel: 'Unknown county',
    });

    expect(result.rows[0]?.valuesBySeriesId.source).toBe(25);
    expect(result.rows[1]?.valuesBySeriesId.source).toBeUndefined();
    expect(result.rows[1]?.valuesBySeriesId.grouped).toBeUndefined();
  });

  it('excludes group rows without an active-series value', () => {
    const workspaceWithEmptyGroup: MapGroupWorkspace = {
      ...workspace,
      groups: [
        ...workspace.groups,
        {
          id: 'grp_empty',
          label: 'No active values',
          primarySirutaCode: '2001',
          memberSirutaCodes: ['2001'],
          memberOrder: ['2001'],
        },
      ],
    };

    const result = buildAdvancedMapAnalyticsTableRows({
      rowMode: 'group_rows_with_members',
      activeGroupWorkspace: workspaceWithEmptyGroup,
      seriesColumns,
      enabledSeries: [sourceSeries, groupedSeries],
      valuesBySeriesId,
      mapValuesBySeriesId: valuesBySeriesId,
      domainsBySeriesId,
      groupValuesBySirutaCode,
      uatMetadataBySirutaCode: new Map([
        ...uatMetadataBySirutaCode,
        ['2001', { uatName: 'No value UAT', countyName: 'Iași' }],
      ]),
      activeSeriesId: sourceSeries.id,
      showMemberValues: true,
      unknownCountyLabel: 'Unknown county',
    });

    expect(result.rows.map((row) => row.groupId)).toEqual(['grp_1', 'grp_1', 'grp_1']);
  });

  it('counts only active ungrouped UAT rows as hidden in grouped modes', () => {
    const sparseSourceValues: MapSeriesVectorCache = new Map([
      [sourceSeries.id, new Map([['9999', 99]])],
      [groupedSeries.id, new Map()],
    ]);

    const result = buildAdvancedMapAnalyticsTableRows({
      rowMode: 'group_rows',
      activeGroupWorkspace: workspace,
      seriesColumns,
      enabledSeries: [sourceSeries, groupedSeries],
      valuesBySeriesId: sparseSourceValues,
      mapValuesBySeriesId: sparseSourceValues,
      domainsBySeriesId,
      groupValuesBySirutaCode,
      uatMetadataBySirutaCode,
      activeSeriesId: sourceSeries.id,
      showMemberValues: true,
      unknownCountyLabel: 'Unknown county',
    });

    expect(result.rows).toEqual([]);
    expect(result.hiddenUngroupedUatCount).toBe(1);
  });
});
