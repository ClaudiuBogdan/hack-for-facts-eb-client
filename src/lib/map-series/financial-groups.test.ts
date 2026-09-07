import { describe, expect, it } from 'vitest';
import { createDefaultAdvancedMapAnalyticsSeries, type MapGroupWorkspace } from '@/schemas/advanced-map-analytics';
import { buildFinancialMapGroups, matchesFinancialMapGroups } from './financial-groups';
import { advancedMapAnalyticsSeriesDataQueryOptions } from '@/hooks/useAdvancedMapAnalyticsSeriesData';
import { calculateMapSeriesValues } from './calculation';

function fixture() {
  const source = createDefaultAdvancedMapAnalyticsSeries('line-items-aggregated-yearly');
  if (source.type !== 'line-items-aggregated-yearly') throw Error('Invalid fixture');
  source.filter.normalization = 'per_capita';
  const grouped = createDefaultAdvancedMapAnalyticsSeries('map-grouped-value-series');
  if (grouped.type !== 'map-grouped-value-series') throw Error('Invalid fixture');
  grouped.sourceSeriesId = source.id;
  grouped.groupWorkspaceId = 'workspace';
  grouped.aggregation = 'sum';
  const workspace: MapGroupWorkspace = { id: 'workspace', key: 'custom', label: 'Custom', groups: [{ id: 'g', label: 'Group', memberSirutaCodes: ['A','B'] }] };
  return { source, grouped, workspace };
}
describe('financial map group integration', () => {
  it('uses the native union value instead of adding displayed per-capita cells', () => {
    const { source, grouped, workspace } = fixture();
    const series = [source, grouped];
    const requests = buildFinancialMapGroups(series, [workspace]);
    expect(requests).toHaveLength(1);
    const values = [{ ...requests[0], value: '15', unit: 'RON/capita', missingYears: [] }];
    const result = calculateMapSeriesValues({ series, groupWorkspaces: [workspace], baseValuesBySeriesId: new Map([[source.id, new Map([['A','10'],['B','10']])]]), financialGroupValues: values });
    expect(result.valuesBySeriesId.get(grouped.id)?.get('g')).toBe('15');
    expect(matchesFinancialMapGroups(requests, values)).toBe(true);
    expect(matchesFinancialMapGroups([{ ...requests[0], memberTerritoryCodes: ['A'] }], values)).toBe(false);
  });
  it('does not fall back to a sum of ratios when server group values are absent', () => {
    const { source, grouped, workspace } = fixture();
    const result = calculateMapSeriesValues({ series: [source, grouped], groupWorkspaces: [workspace], baseValuesBySeriesId: new Map([[source.id, new Map([['A','10'],['B','10']])]]) });
    expect(result.valuesBySeriesId.get(grouped.id)?.get('g')).toBeUndefined();
    expect(result.warnings.some(warning => warning.type === 'missing_population')).toBe(true);
  });
  it('does not sum calculated descendants of financial per-capita values', () => {
    const { source, grouped, workspace } = fixture();
    const calculation = createDefaultAdvancedMapAnalyticsSeries('aggregated-series-calculation');
    if (calculation.type !== 'aggregated-series-calculation') throw Error('Invalid fixture');
    calculation.calculation = { op: 'multiply', args: [source.id, 2] };
    grouped.sourceSeriesId = calculation.id;
    const series = [source, calculation, grouped];
    const result = calculateMapSeriesValues({ series, groupWorkspaces: [workspace], baseValuesBySeriesId: new Map([[source.id, new Map([['A','10'],['B','10']])]]) });
    expect(result.valuesBySeriesId.get(calculation.id)?.get('A')).toBe('20');
    expect(result.valuesBySeriesId.get(grouped.id)?.get('g')).toBeUndefined();
    expect(buildFinancialMapGroups(series, [workspace])).toEqual([]);
  });
  it('separates live queries when only group membership changes', () => {
    const { source, grouped, workspace } = fixture();
    const series = [source, grouped];
    const before = advancedMapAnalyticsSeriesDataQueryOptions({ series, groupWorkspaces: [workspace] });
    const after = advancedMapAnalyticsSeriesDataQueryOptions({ series, groupWorkspaces: [{ ...workspace, groups: [{ ...workspace.groups[0], memberSirutaCodes: ['A'] }] }] });
    expect(before.queryKey).not.toEqual(after.queryKey);
  });
  it('keeps first-observation and additive nominal groups local', () => {
    const { source, grouped, workspace } = fixture();
    grouped.aggregation = 'first';
    expect(buildFinancialMapGroups([source, grouped], [workspace])).toEqual([]);
    grouped.aggregation = 'sum'; source.filter.normalization = 'total';
    expect(buildFinancialMapGroups([source, grouped], [workspace])).toEqual([]);
  });
});
