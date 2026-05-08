import type {
  MapGroup,
  MapGroupWorkspace,
  MapSupportedSeries,
} from '@/schemas/advanced-map-analytics';
import type {
  MapSeriesDomainCache,
  MapSeriesVector,
  MapSeriesVectorCache,
} from '@/lib/map-series/interfaces';
import {
  resolveSeriesDisplayValueForSiruta,
} from '@/lib/map-series/grouping';
import type {
  AdvancedMapAnalyticsTableRow,
  AdvancedMapAnalyticsTableRowMode,
  AdvancedMapAnalyticsTableSeriesColumn,
} from './advanced-map-analytics-table-types';

export interface AdvancedMapAnalyticsTableUatMetadata {
  uatName: string;
  countyName: string;
  entityCui?: string;
}

export interface AdvancedMapAnalyticsTableRowsResult {
  rows: AdvancedMapAnalyticsTableRow[];
  rowMode: AdvancedMapAnalyticsTableRowMode;
  hiddenUngroupedUatCount: number;
}

const EMPTY_TABLE_ROWS: AdvancedMapAnalyticsTableRow[] = [];
const TABLE_ROW_NAME_COLLATOR = new Intl.Collator(undefined, {
  sensitivity: 'base',
});

export const EMPTY_ADVANCED_MAP_ANALYTICS_TABLE_ROWS_RESULT: AdvancedMapAnalyticsTableRowsResult = {
  rows: EMPTY_TABLE_ROWS,
  rowMode: 'uat_rows',
  hiddenUngroupedUatCount: 0,
};

export function getDefaultAdvancedMapAnalyticsTableRowMode(params: {
  activeGroupWorkspace?: MapGroupWorkspace;
}): AdvancedMapAnalyticsTableRowMode {
  return params.activeGroupWorkspace && params.activeGroupWorkspace.groups.length > 0
    ? 'group_rows_with_members'
    : 'uat_rows';
}

export function resolveAdvancedMapAnalyticsTableRowMode(params: {
  preferredRowMode: AdvancedMapAnalyticsTableRowMode | null | undefined;
  activeGroupWorkspace?: MapGroupWorkspace;
}): AdvancedMapAnalyticsTableRowMode {
  const fallback = getDefaultAdvancedMapAnalyticsTableRowMode({
    activeGroupWorkspace: params.activeGroupWorkspace,
  });

  const preferred = params.preferredRowMode ?? fallback;
  if (preferred === 'uat_rows') {
    return preferred;
  }

  return params.activeGroupWorkspace && params.activeGroupWorkspace.groups.length > 0
    ? preferred
    : 'uat_rows';
}

export function buildAdvancedMapAnalyticsTableRows(params: {
  rowMode: AdvancedMapAnalyticsTableRowMode;
  activeGroupWorkspace?: MapGroupWorkspace;
  seriesColumns: AdvancedMapAnalyticsTableSeriesColumn[];
  enabledSeries: MapSupportedSeries[];
  valuesBySeriesId: MapSeriesVectorCache;
  mapValuesBySeriesId: MapSeriesVectorCache;
  displayValuesBySeriesId?: MapSeriesVectorCache;
  domainsBySeriesId: MapSeriesDomainCache;
  groupValuesBySirutaCode: Map<string, Record<string, string | undefined>>;
  uatMetadataBySirutaCode: Map<string, AdvancedMapAnalyticsTableUatMetadata>;
  activeSeriesId?: string;
  showMemberValues: boolean;
  unknownCountyLabel: string;
}): AdvancedMapAnalyticsTableRowsResult {
  const effectiveRowMode = resolveAdvancedMapAnalyticsTableRowMode({
    preferredRowMode: params.rowMode,
    activeGroupWorkspace: params.activeGroupWorkspace,
  });

  if (effectiveRowMode === 'uat_rows' || !params.activeGroupWorkspace) {
    return {
      rows: buildUatRows(params),
      rowMode: 'uat_rows',
      hiddenUngroupedUatCount: 0,
    };
  }

  const rows = buildGroupRows({
    ...params,
    rowMode: effectiveRowMode,
    activeGroupWorkspace: params.activeGroupWorkspace,
  });
  const rowScopeSeriesColumns = getRowScopeSeriesColumns({
    seriesColumns: params.seriesColumns,
    activeSeriesId: params.activeSeriesId,
  });

  return {
    rows,
    rowMode: effectiveRowMode,
    hiddenUngroupedUatCount: countUngroupedUats({
      activeGroupWorkspace: params.activeGroupWorkspace,
      rowScopeSeriesColumns,
      mapValuesBySeriesId: params.mapValuesBySeriesId,
      domainsBySeriesId: params.domainsBySeriesId,
    }),
  };
}

function buildUatRows(params: {
  seriesColumns: AdvancedMapAnalyticsTableSeriesColumn[];
  valuesBySeriesId: MapSeriesVectorCache;
  mapValuesBySeriesId: MapSeriesVectorCache;
  displayValuesBySeriesId?: MapSeriesVectorCache;
  domainsBySeriesId: MapSeriesDomainCache;
  groupValuesBySirutaCode: Map<string, Record<string, string | undefined>>;
  uatMetadataBySirutaCode: Map<string, AdvancedMapAnalyticsTableUatMetadata>;
  activeSeriesId?: string;
  unknownCountyLabel: string;
}): AdvancedMapAnalyticsTableRow[] {
  const rowScopeSeriesColumns = getRowScopeSeriesColumns({
    seriesColumns: params.seriesColumns,
    activeSeriesId: params.activeSeriesId,
  });
  const uniqueSirutaCodes = new Set<string>();

  for (const seriesColumn of rowScopeSeriesColumns) {
    const vector = params.mapValuesBySeriesId.get(seriesColumn.id);
    if (!vector) {
      continue;
    }

    for (const [sirutaCode, value] of vector.entries()) {
      if (value === undefined) {
        continue;
      }
      uniqueSirutaCodes.add(String(sirutaCode));
    }
  }

  return [...uniqueSirutaCodes]
    .map((sirutaCode) => {
      const metadata = params.uatMetadataBySirutaCode.get(sirutaCode);
      const uatName = metadata?.uatName || `UAT ${sirutaCode}`;
      const countyName = metadata?.countyName || params.unknownCountyLabel;
      const rowValuesBySeriesId: Record<string, number | undefined> = {};

      for (const seriesColumn of params.seriesColumns) {
        rowValuesBySeriesId[seriesColumn.id] =
          params.displayValuesBySeriesId?.get(seriesColumn.id)?.get(sirutaCode) ??
          resolveSeriesDisplayValueForSiruta({
            seriesId: seriesColumn.id,
            sirutaCode,
            valuesBySeriesId: params.valuesBySeriesId,
            domainsBySeriesId: params.domainsBySeriesId,
            groupValuesBySirutaCode: params.groupValuesBySirutaCode,
          });
      }

      return {
        rowId: getUatTableRowId(sirutaCode),
        kind: 'uat',
        depth: 0,
        sirutaCode,
        uatName,
        countyName,
        entityCui: metadata?.entityCui,
        groupValuesByGroupingId: params.groupValuesBySirutaCode.get(sirutaCode),
        valuesBySeriesId: rowValuesBySeriesId,
        searchText: buildSearchText([uatName, countyName, sirutaCode, metadata?.entityCui]),
        binFilterKey: sirutaCode,
      } satisfies AdvancedMapAnalyticsTableRow;
    })
    .sort(compareAdvancedMapAnalyticsRowsByNameAndKey);
}

function buildGroupRows(params: {
  rowMode: Exclude<AdvancedMapAnalyticsTableRowMode, 'uat_rows'>;
  activeGroupWorkspace: MapGroupWorkspace;
  seriesColumns: AdvancedMapAnalyticsTableSeriesColumn[];
  enabledSeries: MapSupportedSeries[];
  valuesBySeriesId: MapSeriesVectorCache;
  domainsBySeriesId: MapSeriesDomainCache;
  groupValuesBySirutaCode: Map<string, Record<string, string | undefined>>;
  uatMetadataBySirutaCode: Map<string, AdvancedMapAnalyticsTableUatMetadata>;
  activeSeriesId?: string;
  showMemberValues: boolean;
  unknownCountyLabel: string;
}): AdvancedMapAnalyticsTableRow[] {
  const seriesById = new Map(params.enabledSeries.map((series) => [series.id, series]));
  const rowScopeSeriesColumns = getRowScopeSeriesColumns({
    seriesColumns: params.seriesColumns,
    activeSeriesId: params.activeSeriesId,
  });
  const rows: AdvancedMapAnalyticsTableRow[] = [];
  const groupWorkspaceLabel =
    params.activeGroupWorkspace.label ||
    params.activeGroupWorkspace.key ||
    params.activeGroupWorkspace.id;

  for (const group of params.activeGroupWorkspace.groups) {
    const orderedMemberCodes = getOrderedGroupMemberCodes(group);
    const memberMetadata = orderedMemberCodes.map((sirutaCode) => ({
      sirutaCode,
      metadata: params.uatMetadataBySirutaCode.get(sirutaCode),
    }));
    const groupLabel = group.label || group.id;
    const primarySirutaCode = orderedMemberCodes[0] ?? group.primarySirutaCode;
    const primaryUatName = primarySirutaCode
      ? params.uatMetadataBySirutaCode.get(primarySirutaCode)?.uatName ?? `UAT ${primarySirutaCode}`
      : undefined;
    const groupRowId = getGroupTableRowId(params.activeGroupWorkspace.id, group.id);
    const groupValuesBySeriesId: Record<string, number | undefined> = {};

    for (const seriesColumn of params.seriesColumns) {
      groupValuesBySeriesId[seriesColumn.id] = resolveGroupRowSeriesValue({
        seriesId: seriesColumn.id,
        group,
        groupWorkspaceId: params.activeGroupWorkspace.id,
        valuesBySeriesId: params.valuesBySeriesId,
        domainsBySeriesId: params.domainsBySeriesId,
      });
    }

    const hasScopedValue = rowScopeSeriesColumns.some(
      (seriesColumn) => groupValuesBySeriesId[seriesColumn.id] !== undefined
    );
    if (!hasScopedValue) {
      continue;
    }

    rows.push({
      rowId: groupRowId,
      kind: 'group',
      depth: 0,
      sirutaCode: group.id,
      uatName: groupLabel,
      countyName: groupWorkspaceLabel,
      groupWorkspaceId: params.activeGroupWorkspace.id,
      groupWorkspaceLabel,
      groupId: group.id,
      groupLabel,
      primarySirutaCode,
      primaryUatName,
      memberCount: orderedMemberCodes.length,
      memberSirutaCodes: orderedMemberCodes,
      groupValuesByGroupingId: {
        [params.activeGroupWorkspace.id]: group.id,
      },
      valuesBySeriesId: groupValuesBySeriesId,
      searchText: buildSearchText([
        groupLabel,
        group.id,
        groupWorkspaceLabel,
        primaryUatName,
        ...memberMetadata.flatMap((entry) => [
          entry.sirutaCode,
          entry.metadata?.uatName,
          entry.metadata?.countyName,
          entry.metadata?.entityCui,
        ]),
      ]),
      binFilterKey: group.id,
    });

    if (params.rowMode !== 'group_rows_with_members') {
      continue;
    }

    for (const entry of memberMetadata) {
      const uatName = entry.metadata?.uatName || `UAT ${entry.sirutaCode}`;
      const countyName = entry.metadata?.countyName || params.unknownCountyLabel;
      const memberValuesBySeriesId: Record<string, number | undefined> = {};

      for (const seriesColumn of params.seriesColumns) {
        const series = seriesById.get(seriesColumn.id);
        memberValuesBySeriesId[seriesColumn.id] = params.showMemberValues
          ? resolveMemberRowSeriesValue({
              series,
              seriesId: seriesColumn.id,
              sirutaCode: entry.sirutaCode,
              valuesBySeriesId: params.valuesBySeriesId,
              domainsBySeriesId: params.domainsBySeriesId,
            })
          : undefined;
      }

      rows.push({
        rowId: getGroupMemberTableRowId(
          params.activeGroupWorkspace.id,
          group.id,
          entry.sirutaCode
        ),
        kind: 'group-member',
        parentRowId: groupRowId,
        depth: 1,
        sirutaCode: entry.sirutaCode,
        uatName,
        countyName,
        entityCui: entry.metadata?.entityCui,
        groupWorkspaceId: params.activeGroupWorkspace.id,
        groupWorkspaceLabel,
        groupId: group.id,
        groupLabel,
        primarySirutaCode,
        primaryUatName,
        memberCount: orderedMemberCodes.length,
        memberSirutaCodes: orderedMemberCodes,
        groupValuesByGroupingId: params.groupValuesBySirutaCode.get(entry.sirutaCode),
        valuesBySeriesId: memberValuesBySeriesId,
        searchText: buildSearchText([
          groupLabel,
          group.id,
          groupWorkspaceLabel,
          entry.sirutaCode,
          uatName,
          countyName,
          entry.metadata?.entityCui,
        ]),
        binFilterKey: group.id,
      });
    }
  }

  return rows;
}

function resolveGroupRowSeriesValue(params: {
  seriesId: string;
  group: MapGroup;
  groupWorkspaceId: string;
  valuesBySeriesId: MapSeriesVectorCache;
  domainsBySeriesId: MapSeriesDomainCache;
}): number | undefined {
  const domain = params.domainsBySeriesId.get(params.seriesId);
  const vector = params.valuesBySeriesId.get(params.seriesId);
  if (!domain || !vector) {
    return undefined;
  }

  if (domain.type === 'group') {
    return domain.groupWorkspaceId === params.groupWorkspaceId
      ? vector.get(params.group.id)
      : undefined;
  }

  return sumMemberValues(vector, getOrderedGroupMemberCodes(params.group));
}

function resolveMemberRowSeriesValue(params: {
  series: MapSupportedSeries | undefined;
  seriesId: string;
  sirutaCode: string;
  valuesBySeriesId: MapSeriesVectorCache;
  domainsBySeriesId: MapSeriesDomainCache;
}): number | undefined {
  if (params.series?.type === 'map-grouped-value-series') {
    return params.valuesBySeriesId.get(params.series.sourceSeriesId)?.get(params.sirutaCode);
  }

  const domain = params.domainsBySeriesId.get(params.seriesId);
  if (domain?.type !== 'uat') {
    return undefined;
  }

  return params.valuesBySeriesId.get(params.seriesId)?.get(params.sirutaCode);
}

function sumMemberValues(vector: MapSeriesVector, memberSirutaCodes: string[]): number | undefined {
  let sum = 0;
  let hasFiniteValue = false;
  for (const sirutaCode of memberSirutaCodes) {
    const value = vector.get(sirutaCode);
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      continue;
    }
    sum += value;
    hasFiniteValue = true;
  }
  return hasFiniteValue ? sum : undefined;
}

function getOrderedGroupMemberCodes(group: MapGroup): string[] {
  const members = new Set(group.memberSirutaCodes);
  const ordered: string[] = [];
  const addMember = (sirutaCode: string | undefined) => {
    if (!sirutaCode || !members.has(sirutaCode) || ordered.includes(sirutaCode)) {
      return;
    }
    ordered.push(sirutaCode);
  };

  addMember(group.primarySirutaCode);
  for (const sirutaCode of group.memberOrder ?? []) {
    addMember(sirutaCode);
  }
  for (const sirutaCode of group.memberSirutaCodes) {
    addMember(sirutaCode);
  }
  return ordered;
}

function countUngroupedUats(params: {
  activeGroupWorkspace: MapGroupWorkspace;
  rowScopeSeriesColumns: AdvancedMapAnalyticsTableSeriesColumn[];
  mapValuesBySeriesId: MapSeriesVectorCache;
  domainsBySeriesId: MapSeriesDomainCache;
}): number {
  const groupedSirutaCodes = new Set(
    params.activeGroupWorkspace.groups.flatMap((group) => group.memberSirutaCodes)
  );
  const scopedSirutaCodes = new Set<string>();
  for (const seriesColumn of params.rowScopeSeriesColumns) {
    const domain = params.domainsBySeriesId.get(seriesColumn.id);
    if (domain?.type === 'group') {
      continue;
    }

    const vector = params.mapValuesBySeriesId.get(seriesColumn.id);
    if (!vector) {
      continue;
    }

    for (const [sirutaCode, value] of vector.entries()) {
      if (value === undefined) {
        continue;
      }
      scopedSirutaCodes.add(String(sirutaCode));
    }
  }

  let count = 0;
  for (const sirutaCode of scopedSirutaCodes) {
    if (!groupedSirutaCodes.has(sirutaCode)) {
      count += 1;
    }
  }
  return count;
}

export function compareAdvancedMapAnalyticsRowsByNameAndKey(
  left: AdvancedMapAnalyticsTableRow,
  right: AdvancedMapAnalyticsTableRow
): number {
  const nameCompare = TABLE_ROW_NAME_COLLATOR.compare(left.uatName, right.uatName);
  if (nameCompare !== 0) {
    return nameCompare;
  }

  return getAdvancedMapAnalyticsTableRowId(left).localeCompare(getAdvancedMapAnalyticsTableRowId(right));
}

function getRowScopeSeriesColumns(params: {
  seriesColumns: AdvancedMapAnalyticsTableSeriesColumn[];
  activeSeriesId?: string;
}): AdvancedMapAnalyticsTableSeriesColumn[] {
  const activeSeriesColumn = params.activeSeriesId
    ? params.seriesColumns.find((seriesColumn) => seriesColumn.id === params.activeSeriesId)
    : undefined;

  return activeSeriesColumn ? [activeSeriesColumn] : params.seriesColumns;
}

export function getAdvancedMapAnalyticsTableRowKind(row: AdvancedMapAnalyticsTableRow) {
  return row.kind ?? 'uat';
}

export function getAdvancedMapAnalyticsTableRowId(row: AdvancedMapAnalyticsTableRow): string {
  if (row.rowId) {
    return row.rowId;
  }
  if (row.kind === 'group' && row.groupWorkspaceId && row.groupId) {
    return getGroupTableRowId(row.groupWorkspaceId, row.groupId);
  }
  if (row.kind === 'group-member' && row.groupWorkspaceId && row.groupId && row.sirutaCode) {
    return getGroupMemberTableRowId(row.groupWorkspaceId, row.groupId, row.sirutaCode);
  }
  return getUatTableRowId(row.sirutaCode ?? row.uatName);
}

export function getAdvancedMapAnalyticsTableRowSearchText(row: AdvancedMapAnalyticsTableRow): string {
  return row.searchText ?? buildSearchText([
    row.uatName,
    row.countyName,
    row.sirutaCode,
    row.entityCui,
    row.groupId,
    row.groupLabel,
    row.primaryUatName,
  ]);
}

export function getAdvancedMapAnalyticsTableRowBinFilterKey(row: AdvancedMapAnalyticsTableRow): string {
  return row.binFilterKey ?? row.groupId ?? row.sirutaCode ?? getAdvancedMapAnalyticsTableRowId(row);
}

export function isAdvancedMapAnalyticsGroupedTableRowMode(rowMode: AdvancedMapAnalyticsTableRowMode): boolean {
  return rowMode !== 'uat_rows';
}

function getUatTableRowId(sirutaCode: string): string {
  return `uat:${sirutaCode}`;
}

function getGroupTableRowId(groupWorkspaceId: string, groupId: string): string {
  return `group:${groupWorkspaceId}:${groupId}`;
}

function getGroupMemberTableRowId(groupWorkspaceId: string, groupId: string, sirutaCode: string): string {
  return `group-member:${groupWorkspaceId}:${groupId}:${sirutaCode}`;
}

function buildSearchText(values: Array<string | undefined>): string {
  return values
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value))
    .join(' ')
    .toLocaleLowerCase();
}
