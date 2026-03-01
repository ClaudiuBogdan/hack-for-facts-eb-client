export const MAP_EDITOR_SEARCH_KEYS = [
  'version',
  'series',
  'activeSeriesId',
  'valueFilters',
  'activeView',
  'mapName',
  'seriesPanelCollapsed',
  'configPanelCollapsed',
  'valueFiltersPanelCollapsed',
  'binsPanelCollapsed',
  'binsPresets',
  'activeBinPresetId',
  'tableBinFiltersByPresetId',
  'mapCenter',
  'mapZoom',
] as const;

const MAP_EDITOR_SEARCH_KEY_SET = new Set<string>(MAP_EDITOR_SEARCH_KEYS);

export function hasMapEditorSearchParams(searchString: string): boolean {
  const params = new URLSearchParams(searchString);
  return MAP_EDITOR_SEARCH_KEYS.some((key) => params.has(key));
}

export function stripMapEditorSearchParams(
  search: Record<string, unknown>
): Record<string, unknown> {
  const preservedSearch: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(search)) {
    if (MAP_EDITOR_SEARCH_KEY_SET.has(key)) {
      continue;
    }
    preservedSearch[key] = value;
  }

  return preservedSearch;
}
