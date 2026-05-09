import type { AdvancedMapAnalyticsUrlState } from '@/schemas/advanced-map-analytics';

type AdvancedMapAnalyticsDraftSizeInput = {
  readonly mapState: AdvancedMapAnalyticsUrlState;
  readonly mapDescription: string;
};

function getMapStateForDraftSizeWarning(mapState: AdvancedMapAnalyticsUrlState) {
  return {
    version: mapState.version,
    series: mapState.series,
    activeSeriesId: mapState.activeSeriesId,
    groupWorkspaces: mapState.groupWorkspaces,
    activeGroupWorkspaceId: mapState.activeGroupWorkspaceId,
    valueFilters: mapState.valueFilters,
    activeView: mapState.activeView,
    analyticsWidgets: mapState.analyticsWidgets,
    mapName: mapState.mapName,
    mapLayers: mapState.mapLayers,
    seriesPanelCollapsed: mapState.seriesPanelCollapsed,
    configPanelCollapsed: mapState.configPanelCollapsed,
    valueFiltersPanelCollapsed: mapState.valueFiltersPanelCollapsed,
    binsPanelCollapsed: mapState.binsPanelCollapsed,
    binsPresets: mapState.binsPresets,
    activeBinPresetId: mapState.activeBinPresetId,
    tableBinFiltersByPresetId: mapState.tableBinFiltersByPresetId,
  } satisfies Omit<AdvancedMapAnalyticsUrlState, 'mapCenter' | 'mapZoom'>;
}

export function getAdvancedMapAnalyticsDraftSizeWarningLength({
  mapState,
  mapDescription,
}: AdvancedMapAnalyticsDraftSizeInput): number {
  return JSON.stringify({
    mapState: getMapStateForDraftSizeWarning(mapState),
    mapDescription,
  }).length;
}
