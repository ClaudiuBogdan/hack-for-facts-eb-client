import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AdvancedMapAnalyticsUrlStateSchema } from '@/schemas/advanced-map-analytics';
import type { AdvancedMapAnalyticsMapDetail } from '@/features/advanced-map-analytics/api/schemas';
import { createComparableMapEditorHash } from '@/features/advanced-map-analytics/local-snapshots/map-editor-dirty-state';

const getLatestLocalMapSnapshotMock = vi.fn();

vi.mock('@/features/advanced-map-analytics/local-snapshots/local-map-snapshots-db', () => ({
  getLatestLocalMapSnapshot: (...args: unknown[]) => getLatestLocalMapSnapshotMock(...args),
}));

function createMapQueryData(
  overrides: Partial<AdvancedMapAnalyticsMapDetail> = {}
): AdvancedMapAnalyticsMapDetail {
  return {
    id: 'map1',
    title: 'Test map',
    description: null,
    state: 'private',
    publicId: null,
    snapshotCount: 1,
    createdAt: '2026-03-01T10:00:00.000Z',
    updatedAt: '2026-03-01T10:00:00.000Z',
    lastSnapshot: {
      snapshotId: 'snap1',
      createdAt: '2026-03-01T10:00:00.000Z',
      schemaVersion: 1,
      stateAtSave: 'private',
      title: 'Test map',
      description: null,
      config: AdvancedMapAnalyticsUrlStateSchema.parse({ mapName: 'Server map' }),
    },
    ...overrides,
  };
}

function createDeferredPromise<T>() {
  let resolvePromise: ((value: T) => void) | undefined;
  const promise = new Promise<T>((resolve) => {
    resolvePromise = resolve;
  });

  return {
    promise,
    resolve: (value: T) => {
      resolvePromise?.(value);
    },
  };
}

describe('useMapEditorInitialState', () => {
  beforeEach(() => {
    getLatestLocalMapSnapshotMock.mockReset();
    getLatestLocalMapSnapshotMock.mockResolvedValue(null);
    window.history.replaceState(null, '', '/maps/editor/map1');
  });

  it('resolves server state and sets baseline hash when no URL state or local snapshot', async () => {
    const setMapState = vi.fn();
    const setBaselineFromHash = vi.fn();
    const setMapDescriptionDraft = vi.fn();
    const setIsInitialStateResolved = vi.fn();
    const mapQueryData = createMapQueryData({ description: 'Server description' });

    const { useMapEditorInitialState } = await import('./use-map-editor-initial-state');

    renderHook(() =>
      useMapEditorInitialState({
        mapId: 'map1',
        mapQueryData,
        isLoaded: true,
        isSignedIn: true,
        setMapState,
        setBaselineFromHash,
        setMapDescriptionDraft,
        setIsInitialStateResolved,
      })
    );

    const expectedHash = createComparableMapEditorHash(
      mapQueryData.lastSnapshot.config,
      'Server description'
    );

    await waitFor(() => {
      expect(setBaselineFromHash).toHaveBeenCalledWith(expectedHash);
      expect(setMapState).toHaveBeenCalledWith(mapQueryData.lastSnapshot.config);
      expect(setMapDescriptionDraft).toHaveBeenCalledWith('Server description');
      expect(setIsInitialStateResolved).toHaveBeenCalledWith(true);
    });
  });

  it('prefers newer local snapshot over server snapshot', async () => {
    const setMapState = vi.fn();
    const setBaselineFromHash = vi.fn();
    const setMapDescriptionDraft = vi.fn();
    const setIsInitialStateResolved = vi.fn();
    const localMapState = AdvancedMapAnalyticsUrlStateSchema.parse({ mapName: 'Local draft' });
    const mapQueryData = createMapQueryData({
      lastSnapshot: {
        snapshotId: 'snap1',
        createdAt: '2026-03-01T10:00:00.000Z',
        schemaVersion: 1,
        stateAtSave: 'private',
        title: 'Test map',
        description: null,
        config: AdvancedMapAnalyticsUrlStateSchema.parse({ mapName: 'Server map' }),
      },
    });

    getLatestLocalMapSnapshotMock.mockResolvedValue({
      id: 1,
      mapId: 'map1',
      createdAt: '2026-03-01T11:00:00.000Z',
      updatedAt: '2026-03-01T11:00:00.000Z',
      source: 'auto',
      description: null,
      stateAtSave: 'private',
      mapState: localMapState,
      mapDescription: 'Local description',
      comparableHash: 'hash_local',
    });

    const { useMapEditorInitialState } = await import('./use-map-editor-initial-state');

    renderHook(() =>
      useMapEditorInitialState({
        mapId: 'map1',
        mapQueryData,
        isLoaded: true,
        isSignedIn: true,
        setMapState,
        setBaselineFromHash,
        setMapDescriptionDraft,
        setIsInitialStateResolved,
      })
    );

    await waitFor(() => {
      expect(setMapState).toHaveBeenCalledWith(localMapState);
      expect(setMapDescriptionDraft).toHaveBeenCalledWith('Local description');
      expect(setIsInitialStateResolved).toHaveBeenCalledWith(true);
    });
  });

  it('skips local snapshot check when URL editor state is present', async () => {
    const setMapState = vi.fn();
    const setBaselineFromHash = vi.fn();
    const setMapDescriptionDraft = vi.fn();
    const setIsInitialStateResolved = vi.fn();
    const mapQueryData = createMapQueryData();

    window.history.replaceState(null, '', '/maps/editor/map1?mapName=URL%20state');

    const { useMapEditorInitialState } = await import('./use-map-editor-initial-state');

    renderHook(() =>
      useMapEditorInitialState({
        mapId: 'map1',
        mapQueryData,
        isLoaded: true,
        isSignedIn: true,
        setMapState,
        setBaselineFromHash,
        setMapDescriptionDraft,
        setIsInitialStateResolved,
      })
    );

    await waitFor(() => {
      expect(setIsInitialStateResolved).toHaveBeenCalledWith(true);
    });

    expect(setMapState).not.toHaveBeenCalled();
    expect(getLatestLocalMapSnapshotMock).not.toHaveBeenCalled();
  });

  it('does not resolve when auth is not loaded', async () => {
    const setIsInitialStateResolved = vi.fn();
    const mapQueryData = createMapQueryData();

    const { useMapEditorInitialState } = await import('./use-map-editor-initial-state');

    renderHook(() =>
      useMapEditorInitialState({
        mapId: 'map1',
        mapQueryData,
        isLoaded: false,
        isSignedIn: false,
        setMapState: vi.fn(),
        setBaselineFromHash: vi.fn(),
        setMapDescriptionDraft: vi.fn(),
        setIsInitialStateResolved,
      })
    );

    expect(setIsInitialStateResolved).not.toHaveBeenCalledWith(true);
  });

  it('resets state when mapId changes', async () => {
    const setMapDescriptionDraft = vi.fn();
    const setIsInitialStateResolved = vi.fn();
    const mapQueryData = createMapQueryData();

    const { useMapEditorInitialState } = await import('./use-map-editor-initial-state');

    const { rerender } = renderHook(
      ({ mapId }: { mapId: string }) =>
        useMapEditorInitialState({
          mapId,
          mapQueryData,
          isLoaded: true,
          isSignedIn: true,
          setMapState: vi.fn(),
          setBaselineFromHash: vi.fn(),
          setMapDescriptionDraft,
          setIsInitialStateResolved,
        }),
      { initialProps: { mapId: 'map1' } }
    );

    await waitFor(() => {
      expect(setIsInitialStateResolved).toHaveBeenCalledWith(true);
    });

    setMapDescriptionDraft.mockClear();
    setIsInitialStateResolved.mockClear();

    rerender({ mapId: 'map2' });

    expect(setIsInitialStateResolved).toHaveBeenCalledWith(false);
    expect(setMapDescriptionDraft).toHaveBeenCalledWith('');
  });

  it('ignores stale async resolution after mapId changes', async () => {
    const setMapState = vi.fn();
    const setBaselineFromHash = vi.fn();
    const setMapDescriptionDraft = vi.fn();
    const setIsInitialStateResolved = vi.fn();
    const firstMapDeferredSnapshot = createDeferredPromise<{
      id: number;
      mapId: string;
      createdAt: string;
      updatedAt: string;
      source: 'auto';
      description: string | null;
      stateAtSave: 'private';
      mapState: ReturnType<typeof AdvancedMapAnalyticsUrlStateSchema.parse>;
      mapDescription: string;
      comparableHash: string;
    } | null>();
    const secondMapSnapshot = {
      id: 2,
      mapId: 'map2',
      createdAt: '2026-03-02T11:00:00.000Z',
      updatedAt: '2026-03-02T11:00:00.000Z',
      source: 'auto' as const,
      description: null,
      stateAtSave: 'private' as const,
      mapState: AdvancedMapAnalyticsUrlStateSchema.parse({ mapName: 'Map 2 local draft' }),
      mapDescription: 'Map 2 local description',
      comparableHash: 'hash_map_2',
    };
    getLatestLocalMapSnapshotMock
      .mockReturnValueOnce(firstMapDeferredSnapshot.promise)
      .mockResolvedValueOnce(secondMapSnapshot);

    const { useMapEditorInitialState } = await import('./use-map-editor-initial-state');
    const { rerender } = renderHook(
      ({ mapId, mapQueryData }: { mapId: string; mapQueryData: AdvancedMapAnalyticsMapDetail }) =>
        useMapEditorInitialState({
          mapId,
          mapQueryData,
          isLoaded: true,
          isSignedIn: true,
          setMapState,
          setBaselineFromHash,
          setMapDescriptionDraft,
          setIsInitialStateResolved,
        }),
      {
        initialProps: {
          mapId: 'map1',
          mapQueryData: createMapQueryData({
            id: 'map1',
            lastSnapshot: {
              snapshotId: 'snap_map_1',
              createdAt: '2026-03-01T10:00:00.000Z',
              schemaVersion: 1,
              stateAtSave: 'private',
              title: 'Map 1',
              description: null,
              config: AdvancedMapAnalyticsUrlStateSchema.parse({ mapName: 'Map 1 server' }),
            },
          }),
        },
      }
    );

    rerender({
      mapId: 'map2',
      mapQueryData: createMapQueryData({
        id: 'map2',
        lastSnapshot: {
          snapshotId: 'snap_map_2',
          createdAt: '2026-03-02T10:00:00.000Z',
          schemaVersion: 1,
          stateAtSave: 'private',
          title: 'Map 2',
          description: null,
          config: AdvancedMapAnalyticsUrlStateSchema.parse({ mapName: 'Map 2 server' }),
        },
      }),
    });

    firstMapDeferredSnapshot.resolve({
      id: 1,
      mapId: 'map1',
      createdAt: '2026-03-01T11:00:00.000Z',
      updatedAt: '2026-03-01T11:00:00.000Z',
      source: 'auto',
      description: null,
      stateAtSave: 'private',
      mapState: AdvancedMapAnalyticsUrlStateSchema.parse({ mapName: 'Map 1 local draft' }),
      mapDescription: 'Map 1 local description',
      comparableHash: 'hash_map_1',
    });

    await waitFor(() => {
      expect(setMapState).toHaveBeenCalledWith(secondMapSnapshot.mapState);
      expect(setMapDescriptionDraft).toHaveBeenCalledWith(secondMapSnapshot.mapDescription);
      expect(setIsInitialStateResolved).toHaveBeenCalledWith(true);
    });
    expect(setMapState).not.toHaveBeenCalledWith(
      AdvancedMapAnalyticsUrlStateSchema.parse({ mapName: 'Map 1 local draft' })
    );
  });

  it('still resolves initialization when local snapshot loading fails', async () => {
    const setMapState = vi.fn();
    const setBaselineFromHash = vi.fn();
    const setMapDescriptionDraft = vi.fn();
    const setIsInitialStateResolved = vi.fn();
    const mapQueryData = createMapQueryData({ description: 'Server description' });

    getLatestLocalMapSnapshotMock.mockRejectedValue(new Error('indexeddb unavailable'));

    const { useMapEditorInitialState } = await import('./use-map-editor-initial-state');

    renderHook(() =>
      useMapEditorInitialState({
        mapId: 'map1',
        mapQueryData,
        isLoaded: true,
        isSignedIn: true,
        setMapState,
        setBaselineFromHash,
        setMapDescriptionDraft,
        setIsInitialStateResolved,
      })
    );

    await waitFor(() => {
      expect(setBaselineFromHash).toHaveBeenCalled();
      expect(setMapState).toHaveBeenCalledWith(mapQueryData.lastSnapshot.config);
      expect(setMapDescriptionDraft).toHaveBeenCalledWith('Server description');
      expect(setIsInitialStateResolved).toHaveBeenCalledWith(true);
    });
  });
});
