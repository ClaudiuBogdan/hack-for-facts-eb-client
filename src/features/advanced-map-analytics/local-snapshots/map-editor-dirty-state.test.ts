import { describe, expect, it } from 'vitest';
import { AdvancedMapAnalyticsUrlStateSchema } from '@/schemas/advanced-map-analytics';
import { createComparableMapEditorHash } from './map-editor-dirty-state';

describe('map-editor-dirty-state', () => {
  it('ignores viewport and view-mode changes when generating comparable hash', () => {
    const baseMapState = AdvancedMapAnalyticsUrlStateSchema.parse({
      mapName: 'Snapshot map',
      mapCenter: [45.1, 24.1],
      mapZoom: 8,
      activeView: 'map',
    });
    const changedViewportMapState = AdvancedMapAnalyticsUrlStateSchema.parse({
      mapName: 'Snapshot map',
      mapCenter: [46.5, 25.5],
      mapZoom: 10.5,
      activeView: 'table',
    });

    const firstHash = createComparableMapEditorHash(baseMapState, '');
    const secondHash = createComparableMapEditorHash(changedViewportMapState, '');

    expect(firstHash).toBe(secondHash);
  });

  it('includes configuration and description changes in comparable hash', () => {
    const baseMapState = AdvancedMapAnalyticsUrlStateSchema.parse({
      mapName: 'Version one',
    });
    const changedMapState = AdvancedMapAnalyticsUrlStateSchema.parse({
      mapName: 'Version two',
    });

    const baseHash = createComparableMapEditorHash(baseMapState, '');
    const changedConfigHash = createComparableMapEditorHash(changedMapState, '');
    const changedDescriptionHash = createComparableMapEditorHash(baseMapState, 'new note');

    expect(baseHash).not.toBe(changedConfigHash);
    expect(baseHash).not.toBe(changedDescriptionHash);
  });

  it('is stable for equivalent content with different key order', () => {
    const firstMapState = AdvancedMapAnalyticsUrlStateSchema.parse({
      mapName: 'Stable hash map',
      valueFilters: { rules: [] },
      mapLayers: { countyBoundaries: true },
    });
    const secondMapState = AdvancedMapAnalyticsUrlStateSchema.parse({
      mapLayers: { countyBoundaries: true },
      valueFilters: { rules: [] },
      mapName: 'Stable hash map',
    });

    const firstHash = createComparableMapEditorHash(firstMapState, '');
    const secondHash = createComparableMapEditorHash(secondMapState, '');

    expect(firstHash).toBe(secondHash);
  });
});
