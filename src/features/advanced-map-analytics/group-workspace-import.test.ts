import { describe, expect, it } from 'vitest';
import { MapGroupWorkspaceSchema } from '@/schemas/advanced-map-analytics';
import { parseGroupWorkspaceCsvImport } from './group-workspace-import';

const references = [
  { sirutaCode: '1017', name: 'Alba Iulia' },
  { sirutaCode: '1071', name: 'Ciugud' },
  { sirutaCode: '1874', name: 'Sebes' },
  { sirutaCode: '50923', name: 'Baile Herculane' },
  { sirutaCode: '52115', name: 'Cornea' },
  { sirutaCode: '52721', name: 'Domasnea' },
];

describe('parseGroupWorkspaceCsvImport', () => {
  it('parses minimal row-per-UAT CSV', () => {
    const result = parseGroupWorkspaceCsvImport(
      ['siruta_code,group', '1017,Group 1', '1071,Group 1', '1874,Group 2'].join('\n'),
      references
    );

    expect(result.format).toBe('row-per-uat');
    expect(result.hasErrors).toBe(false);
    expect(result.groupCount).toBe(2);
    expect(result.assignedUatCount).toBe(3);
    expect(result.groups[0]).toMatchObject({
      label: 'Group 1',
      primarySirutaCode: '1017',
      memberSirutaCodes: ['1017', '1071'],
      memberOrder: ['1017', '1071'],
    });
  });

  it('uses labels, primary flags, and order in row-per-UAT CSV', () => {
    const result = parseGroupWorkspaceCsvImport(
      [
        'natcode,group_key,label,is_primary,member_order',
        '1071,alba,Alba area,false,2',
        '1017,alba,Alba area,true,1',
        '1874,alba,Alba area,false,3',
      ].join('\n'),
      references
    );

    expect(result.hasErrors).toBe(false);
    expect(result.groups).toHaveLength(1);
    expect(result.groups[0]).toMatchObject({
      label: 'Alba area',
      primarySirutaCode: '1017',
      memberSirutaCodes: ['1017', '1071', '1874'],
      memberOrder: ['1017', '1071', '1874'],
    });
  });

  it('parses simulation cluster CSV and prefers canonical UAT names', () => {
    const result = parseGroupWorkspaceCsvImport(
      [
        'cluster_id,anchor_uat_id,anchor_name,merged_uat_ids',
        '50923,50923,BăIle Herculane,50923;52115;52721',
      ].join('\n'),
      references
    );

    expect(result.format).toBe('simulation-cluster');
    expect(result.hasErrors).toBe(false);
    expect(result.groups).toEqual([
      {
        id: 'cluster_50923',
        label: 'Baile Herculane',
        primarySirutaCode: '50923',
        memberSirutaCodes: ['50923', '52115', '52721'],
        memberOrder: ['50923', '52115', '52721'],
      },
    ]);
  });

  it('blocks unknown SIRUTA codes', () => {
    const result = parseGroupWorkspaceCsvImport(
      ['siruta_code,group', '1017,Group 1', '9999,Group 1'].join('\n'),
      references
    );

    expect(result.hasErrors).toBe(true);
    expect(result.issues).toContainEqual({
      severity: 'error',
      rowNumber: 3,
      message: 'Unknown SIRUTA code 9999.',
    });
  });

  it('blocks UATs assigned to multiple groups', () => {
    const result = parseGroupWorkspaceCsvImport(
      ['siruta_code,group', '1017,Group 1', '1017,Group 2'].join('\n'),
      references
    );

    expect(result.hasErrors).toBe(true);
    expect(result.issues).toContainEqual({
      severity: 'error',
      rowNumber: 3,
      message: 'SIRUTA 1017 is assigned to multiple groups.',
    });
  });

  it('dedupes duplicate UATs inside one group with a warning', () => {
    const result = parseGroupWorkspaceCsvImport(
      ['siruta_code,group', '1017,Group 1', '1017,Group 1'].join('\n'),
      references
    );

    expect(result.hasErrors).toBe(false);
    expect(result.groups[0]?.memberSirutaCodes).toEqual(['1017']);
    expect(result.issues).toContainEqual({
      severity: 'warning',
      rowNumber: 3,
      message: 'Ignored duplicate SIRUTA 1017 inside group Group 1.',
    });
  });

  it('produces schema-valid group workspaces', () => {
    const result = parseGroupWorkspaceCsvImport(
      ['siruta_code,group', '1017,Group 1', '1071,Group 1'].join('\n'),
      references
    );

    expect(() =>
      MapGroupWorkspaceSchema.parse({
        id: 'workspace_1',
        key: 'imported-group-workspace-workspace_1',
        label: 'Imported workspace',
        granularity: 'uat',
        groups: result.groups,
      })
    ).not.toThrow();
  });
});
