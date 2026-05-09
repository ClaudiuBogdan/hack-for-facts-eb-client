import { describe, expect, it } from 'vitest';
import {
  hasMapEditorSearchParams,
  MAP_EDITOR_SEARCH_KEYS,
  stripMapEditorSearchParams,
} from '@/features/advanced-map-analytics/map-editor-search';

describe('map-editor-search', () => {
  it('detects map editor search keys in URL search string', () => {
    const searchWithMapKeys = '?currency=EUR&version=1&mapName=Snapshot%20A';
    expect(hasMapEditorSearchParams(searchWithMapKeys)).toBe(true);

    const searchWithGlobalKeysOnly = '?currency=EUR&inflation_adjusted=true';
    expect(hasMapEditorSearchParams(searchWithGlobalKeysOnly)).toBe(false);
  });

  it('strips only map editor keys and keeps global keys', () => {
    const originalSearch: Record<string, unknown> = {
      currency: 'EUR',
      inflation_adjusted: true,
      mapName: 'Snapshot A',
      mapLayers: { countyBoundaries: false, roads: true, populationGrid: true },
      showCountyBoundaries: false,
      activeView: 'table',
      analyticsWidgets: [{ key: 'series_totals', enabled: true }],
      mapCenter: [46.5, 24.5],
      mapZoom: 9,
    };

    const strippedSearch = stripMapEditorSearchParams(originalSearch);

    expect(strippedSearch).toEqual({
      currency: 'EUR',
      inflation_adjusted: true,
    });

    for (const key of MAP_EDITOR_SEARCH_KEYS) {
      expect(strippedSearch[key]).toBeUndefined();
    }
  });
});
