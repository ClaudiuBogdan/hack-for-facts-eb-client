import 'fake-indexeddb/auto';
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AdvancedMapAnalyticsUrlStateSchema } from '@/schemas/advanced-map-analytics';
import { deleteLocalMapSnapshotsDatabase } from '@/features/advanced-map-analytics/local-snapshots/local-map-snapshots-db';
import { useMapLocalSnapshots } from './use-map-local-snapshots';

async function waitForAutosaveCycle(): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => {
      window.setTimeout(resolve, 2_200);
    });
  });
}

describe('useMapLocalSnapshots', () => {
  beforeEach(async () => {
    await deleteLocalMapSnapshotsDatabase();
  });

  afterEach(async () => {
    await deleteLocalMapSnapshotsDatabase();
  });

  it('autosaves after debounce and deduplicates by comparable hash', async () => {
    const initialMapState = AdvancedMapAnalyticsUrlStateSchema.parse({ mapName: 'Initial map' });
    const updatedMapState = AdvancedMapAnalyticsUrlStateSchema.parse({ mapName: 'Updated map' });

    const { result, rerender } = renderHook(
      ({ mapState }) =>
        useMapLocalSnapshots({
          mapId: 'map_1',
          mapState,
          mapDescription: '',
          currentVisibility: 'private',
          enabled: true,
        }),
      { initialProps: { mapState: initialMapState } }
    );

    act(() => {
      result.current.markCurrentAsSaved();
    });

    rerender({ mapState: updatedMapState });
    await waitForAutosaveCycle();

    await waitFor(() => {
      expect(result.current.snapshots).toHaveLength(1);
    });
    expect(result.current.snapshots[0].mapState.mapName).toBe('Updated map');

    rerender({ mapState: updatedMapState });
    await waitForAutosaveCycle();

    await waitFor(() => {
      expect(result.current.snapshots).toHaveLength(1);
    });
  }, 15_000);

  it('coalesces recent autosaves into a single auto snapshot entry', async () => {
    const firstState = AdvancedMapAnalyticsUrlStateSchema.parse({ mapName: 'Version one' });
    const secondState = AdvancedMapAnalyticsUrlStateSchema.parse({ mapName: 'Version two' });
    const { result, rerender } = renderHook(
      ({ mapState }) =>
        useMapLocalSnapshots({
          mapId: 'map_1',
          mapState,
          mapDescription: '',
          currentVisibility: 'private',
          enabled: true,
        }),
      { initialProps: { mapState: firstState } }
    );

    act(() => {
      result.current.markCurrentAsSaved();
    });

    rerender({ mapState: secondState });
    await waitForAutosaveCycle();

    await waitFor(() => {
      expect(result.current.snapshots).toHaveLength(1);
    });
    const firstSnapshotId = result.current.snapshots[0].id;

    rerender({
      mapState: AdvancedMapAnalyticsUrlStateSchema.parse({ mapName: 'Version three' }),
    });

    await waitForAutosaveCycle();

    await waitFor(() => {
      expect(result.current.snapshots).toHaveLength(1);
    });
    expect(result.current.snapshots[0].id).toBe(firstSnapshotId);
    expect(result.current.snapshots[0].mapState.mapName).toBe('Version three');
  }, 15_000);

  it('does not report dirty state or autosave before baseline is ready', async () => {
    const initialMapState = AdvancedMapAnalyticsUrlStateSchema.parse({ mapName: 'Initial map' });
    const updatedMapState = AdvancedMapAnalyticsUrlStateSchema.parse({ mapName: 'Updated map' });

    const { result, rerender } = renderHook(
      ({ mapState, isBaselineReady }) =>
        useMapLocalSnapshots({
          mapId: 'map_1',
          mapState,
          mapDescription: '',
          currentVisibility: 'private',
          enabled: true,
          isBaselineReady,
        }),
      {
        initialProps: {
          mapState: initialMapState,
          isBaselineReady: false,
        },
      }
    );

    rerender({
      mapState: updatedMapState,
      isBaselineReady: false,
    });
    await waitForAutosaveCycle();

    await waitFor(() => {
      expect(result.current.snapshots).toHaveLength(0);
      expect(result.current.isDirty).toBe(false);
    });

    rerender({
      mapState: updatedMapState,
      isBaselineReady: true,
    });

    await waitFor(() => {
      expect(result.current.isDirty).toBe(true);
    });
    await waitForAutosaveCycle();

    await waitFor(() => {
      expect(result.current.snapshots).toHaveLength(1);
    });
  }, 20_000);
});
