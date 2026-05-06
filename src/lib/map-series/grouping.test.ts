import { describe, expect, it } from 'vitest';
import {
  projectGroupedValuesToSiruta,
  resolveSeriesDisplayValueForSiruta,
} from '@/lib/map-series/grouping';
import type { MapGroupWorkspace } from '@/schemas/advanced-map-analytics';
import type { MapSeriesDomainCache, MapSeriesVectorCache } from '@/lib/map-series/interfaces';

describe('map series grouping helpers', () => {
  it('projects group-domain values to member UAT polygons for map rendering', () => {
    const groupWorkspaces: MapGroupWorkspace[] = [
      {
        id: 'manual',
        key: 'manual',
        label: 'Manual groups',
        groups: [
          {
            id: 'grp_1',
            memberSirutaCodes: ['1001', '1002'],
          },
        ],
      },
    ];

    const projected = projectGroupedValuesToSiruta({
      valuesBySeriesId: new Map([['grouped', new Map([['grp_1', 25]])]]),
      domainsBySeriesId: new Map([['grouped', { type: 'group', groupWorkspaceId: 'manual' }]]),
      groupWorkspaces,
    });

    expect(projected.get('grouped')?.get('1001')).toBe(25);
    expect(projected.get('grouped')?.get('1002')).toBe(25);
    expect(projected.get('grouped')?.has('grp_1')).toBe(false);
  });

  it('resolves grouped display values from the group id instead of member UAT ids', () => {
    const valuesBySeriesId: MapSeriesVectorCache = new Map([
      [
        'grouped',
        new Map([
          ['grp_1', 25],
          ['1001', 10],
        ]),
      ],
    ]);
    const domainsBySeriesId: MapSeriesDomainCache = new Map([
      ['grouped', { type: 'group', groupWorkspaceId: 'manual' }],
    ]);
    const groupValuesBySirutaCode = new Map([
      ['1001', { manual: 'grp_1' }],
      ['1002', { manual: 'grp_1' }],
    ]);

    expect(
      resolveSeriesDisplayValueForSiruta({
        seriesId: 'grouped',
        sirutaCode: '1001',
        valuesBySeriesId,
        domainsBySeriesId,
        groupValuesBySirutaCode,
      })
    ).toBe(25);
    expect(
      resolveSeriesDisplayValueForSiruta({
        seriesId: 'grouped',
        sirutaCode: '1002',
        valuesBySeriesId,
        domainsBySeriesId,
        groupValuesBySirutaCode,
      })
    ).toBe(25);
  });
});
