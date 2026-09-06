import { sumMapDecimals } from '@/lib/map-series/decimal';
import type { ActiveMapRenderUnit } from '@/components/maps/polygonLabels';
import type {
  MapGroupWorkspace,
  MapSupportedSeries,
} from '@/schemas/advanced-map-analytics';
import type {
  MapSeriesDomain,
  MapSeriesDomainCache,
  MapSeriesVector,
  MapSeriesVectorCache,
} from '@/lib/map-series/interfaces';

export interface ActiveMapRenderUnitContext {
  renderUnitIdBySirutaCode: Map<string, string>;
  renderUnitsById: Map<string, ActiveMapRenderUnit>;
  valueBySirutaCode: Map<string, string | undefined>;
}

function resolveWorkspaceGroups(params: {
  groupWorkspaces: readonly MapGroupWorkspace[];
  groupWorkspaceId: string | undefined;
  activeManualGroupId?: string;
}): readonly MapGroupWorkspace['groups'][number][] | undefined {
  if (!params.groupWorkspaceId) {
    return undefined;
  }

  const workspace = params.groupWorkspaces.find((entry) => entry.id === params.groupWorkspaceId);
  if (!workspace) {
    return undefined;
  }

  const groups = params.activeManualGroupId
    ? workspace.groups.filter((group) => group.id === params.activeManualGroupId)
    : workspace.groups;

  return groups.length > 0 ? groups : undefined;
}

function sumGroupMemberValues(
  group: MapGroupWorkspace['groups'][number],
  sourceVector: MapSeriesVector | undefined
): string | undefined {
  return sumMapDecimals(group.memberSirutaCodes.map(code => sourceVector?.get(code)));
}

function resolveGroupValue(params: {
  seriesId: string;
  seriesDomain: MapSeriesDomain | undefined;
  groupWorkspaceId: string;
  group: MapGroupWorkspace['groups'][number];
  valuesBySeriesId: MapSeriesVectorCache;
  mapValuesBySeriesId: MapSeriesVectorCache;
}): string | undefined {
  if (params.seriesDomain?.type === 'group') {
    return params.seriesDomain.groupWorkspaceId === params.groupWorkspaceId
      ? params.valuesBySeriesId.get(params.seriesId)?.get(params.group.id)
      : undefined;
  }

  const sourceVector =
    params.valuesBySeriesId.get(params.seriesId) ??
    params.mapValuesBySeriesId.get(params.seriesId);
  return sumGroupMemberValues(params.group, sourceVector);
}

export function buildActiveMapRenderUnitContext(params: {
  activeSeriesId?: string;
  activeSeries?: MapSupportedSeries;
  activeSeriesUnit?: string;
  activeGroupWorkspaceId?: string;
  activeManualGroupId?: string;
  groupWorkspaces: readonly MapGroupWorkspace[];
  valuesBySeriesId: MapSeriesVectorCache;
  mapValuesBySeriesId: MapSeriesVectorCache;
  domainsBySeriesId: MapSeriesDomainCache;
}): ActiveMapRenderUnitContext | undefined {
  if (!params.activeSeries || !params.activeSeriesId) {
    return undefined;
  }

  const activeSeriesDomain = params.domainsBySeriesId.get(params.activeSeriesId);
  const groupWorkspaceId = activeSeriesDomain?.type === 'group'
    ? activeSeriesDomain.groupWorkspaceId
    : params.activeGroupWorkspaceId;
  const groups = resolveWorkspaceGroups({
    groupWorkspaces: params.groupWorkspaces,
    groupWorkspaceId,
    activeManualGroupId: params.activeManualGroupId,
  });

  if (!groupWorkspaceId || !groups) {
    return undefined;
  }

  const renderUnitIdBySirutaCode = new Map<string, string>();
  const renderUnitsById = new Map<string, ActiveMapRenderUnit>();
  const valueBySirutaCode = new Map<string, string | undefined>();

  for (const group of groups) {
    const groupValue = resolveGroupValue({
      seriesId: params.activeSeriesId,
      seriesDomain: activeSeriesDomain,
      groupWorkspaceId,
      group,
      valuesBySeriesId: params.valuesBySeriesId,
      mapValuesBySeriesId: params.mapValuesBySeriesId,
    });

    renderUnitsById.set(group.id, {
      id: group.id,
      label: group.label?.trim() || group.id,
      memberSirutaCodes: group.memberSirutaCodes,
      value: groupValue,
      unit: params.activeSeriesUnit,
    });

    for (const sirutaCode of group.memberSirutaCodes) {
      renderUnitIdBySirutaCode.set(sirutaCode, group.id);
      valueBySirutaCode.set(sirutaCode, groupValue);
    }
  }

  return {
    renderUnitIdBySirutaCode,
    renderUnitsById,
    valueBySirutaCode,
  };
}

export function buildManualGroupDisplayValuesBySeriesId(params: {
  activeGroupWorkspaceId?: string;
  activeManualGroupId?: string;
  groupWorkspaces: readonly MapGroupWorkspace[];
  enabledSeries: readonly MapSupportedSeries[];
  valuesBySeriesId: MapSeriesVectorCache;
  mapValuesBySeriesId: MapSeriesVectorCache;
  domainsBySeriesId: MapSeriesDomainCache;
}): MapSeriesVectorCache | undefined {
  const groups = resolveWorkspaceGroups({
    groupWorkspaces: params.groupWorkspaces,
    groupWorkspaceId: params.activeGroupWorkspaceId,
    activeManualGroupId: params.activeManualGroupId,
  });

  if (!params.activeGroupWorkspaceId || !groups) {
    return undefined;
  }

  const scopedValuesBySeriesId: MapSeriesVectorCache = new Map();

  for (const series of params.enabledSeries) {
    const seriesDomain = params.domainsBySeriesId.get(series.id);
    const displayVector = new Map<string, string | undefined>();

    for (const group of groups) {
      const groupValue = resolveGroupValue({
        seriesId: series.id,
        seriesDomain,
        groupWorkspaceId: params.activeGroupWorkspaceId,
        group,
        valuesBySeriesId: params.valuesBySeriesId,
        mapValuesBySeriesId: params.mapValuesBySeriesId,
      });

      for (const sirutaCode of group.memberSirutaCodes) {
        displayVector.set(sirutaCode, groupValue);
      }
    }

    scopedValuesBySeriesId.set(series.id, displayVector);
  }

  return scopedValuesBySeriesId;
}
