import type { MapSupportedSeries, MapGroupWorkspace } from '@/schemas/advanced-map-analytics';
import type { FinancialMapGroupRequest, FinancialMapGroupValue } from './interfaces';

export function isFinancialPerCapita(series: MapSupportedSeries | undefined): boolean {
  return (series?.type === 'line-items-aggregated-yearly' || series?.type === 'commitments-analytics')
    && (series.filter.normalization === 'per_capita' || series.filter.normalization === 'per_capita_euro');
}
/** Only non-additive direct financial groups need server normalization. */
export function buildFinancialMapGroups(series: MapSupportedSeries[], workspaces: MapGroupWorkspace[] = []): FinancialMapGroupRequest[] {
  const sources = new Map(series.map(item => [item.id, item]));
  const groups = new Map<string, FinancialMapGroupRequest>();
  for (const item of series) {
    if (item.type !== 'map-grouped-value-series' || item.aggregation !== 'sum' || !isFinancialPerCapita(sources.get(item.sourceSeriesId))) continue;
    const workspace = workspaces.find(value => value.id === item.groupWorkspaceId);
    for (const group of workspace?.groups ?? []) {
      if (group.memberSirutaCodes.length === 0) continue;
      const request = { groupWorkspaceId: item.groupWorkspaceId, groupId: group.id, sourceSeriesId: item.sourceSeriesId, memberTerritoryCodes: [...group.memberSirutaCodes].sort() };
      groups.set(JSON.stringify([request.groupWorkspaceId, request.groupId, request.sourceSeriesId]), request);
    }
  }
  return [...groups.values()].sort((a,b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
}

/** A snapshot is usable only for its exact group membership as well as its base filters. */
export function matchesFinancialMapGroups(requests: FinancialMapGroupRequest[], values: FinancialMapGroupValue[] = []): boolean {
  const key = (value: FinancialMapGroupRequest | FinancialMapGroupValue) => JSON.stringify([value.groupWorkspaceId, value.groupId, value.sourceSeriesId, [...value.memberTerritoryCodes].sort()]);
  const keys = new Set(values.map(key));
  return values.length === requests.length && keys.size === requests.length && requests.every(request => keys.has(key(request)));
}
