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

const defaultDraftMapState = AdvancedMapAnalyticsUrlStateSchema.parse({ mapName: 'Draft map' });

describe('useMapEditorInitialState', () => {
  beforeEach(() => {
    getLatestLocalMapSnapshotMock.mockReset();
    getLatestLocalMapSnapshotMock.mockResolvedValue(null);
    window.history.replaceState(null, '', '/maps/editor/map1');
  });

  it('resolves server state and sets baseline hash when no local or session draft is newer', async () => {
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
        isMapQueryFetching: false,
        draftMapState: defaultDraftMapState,
        draftMapDescription: '',
        draftUpdatedAt: null,
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
        isMapQueryFetching: false,
        draftMapState: defaultDraftMapState,
        draftMapDescription: '',
        draftUpdatedAt: null,
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

  it('prefers newer session draft over local snapshot and server snapshot', async () => {
    const setMapState = vi.fn();
    const setBaselineFromHash = vi.fn();
    const setMapDescriptionDraft = vi.fn();
    const setIsInitialStateResolved = vi.fn();
    const sessionDraftState = AdvancedMapAnalyticsUrlStateSchema.parse({ mapName: 'Session draft' });
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
        isMapQueryFetching: false,
        draftMapState: sessionDraftState,
        draftMapDescription: 'Session description',
        draftUpdatedAt: '2026-03-01T12:00:00.000Z',
        isLoaded: true,
        isSignedIn: true,
        setMapState,
        setBaselineFromHash,
        setMapDescriptionDraft,
        setIsInitialStateResolved,
      })
    );

    await waitFor(() => {
      expect(setMapState).toHaveBeenCalledWith(sessionDraftState);
      expect(setMapDescriptionDraft).toHaveBeenCalledWith('Session description');
      expect(setIsInitialStateResolved).toHaveBeenCalledWith(true);
    });
  });

  it('re-resolves with updated draft input before initial resolution completes', async () => {
    const setMapState = vi.fn();
    const setBaselineFromHash = vi.fn();
    const setMapDescriptionDraft = vi.fn();
    const setIsInitialStateResolved = vi.fn();
    const firstResolutionDeferred = createDeferredPromise<null>();
    const updatedDraftState = AdvancedMapAnalyticsUrlStateSchema.parse({ mapName: 'Updated draft' });
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

    getLatestLocalMapSnapshotMock
      .mockReturnValueOnce(firstResolutionDeferred.promise)
      .mockResolvedValueOnce(null);

    const { useMapEditorInitialState } = await import('./use-map-editor-initial-state');
    const initialDraftProps: {
      draftMapState: ReturnType<typeof AdvancedMapAnalyticsUrlStateSchema.parse>;
      draftMapDescription: string;
      draftUpdatedAt: string | null;
    } = {
      draftMapState: defaultDraftMapState,
      draftMapDescription: '',
      draftUpdatedAt: null,
    };
    const { rerender } = renderHook(
      ({
        draftMapState,
        draftMapDescription,
        draftUpdatedAt,
        isMapQueryFetching,
      }: {
        draftMapState: ReturnType<typeof AdvancedMapAnalyticsUrlStateSchema.parse>;
        draftMapDescription: string;
        draftUpdatedAt: string | null;
        isMapQueryFetching: boolean;
      }) =>
        useMapEditorInitialState({
          mapId: 'map1',
          mapQueryData,
          isMapQueryFetching,
          draftMapState,
          draftMapDescription,
          draftUpdatedAt,
          isLoaded: true,
          isSignedIn: true,
          setMapState,
          setBaselineFromHash,
          setMapDescriptionDraft,
          setIsInitialStateResolved,
        }),
      {
        initialProps: {
          ...initialDraftProps,
          isMapQueryFetching: false,
        },
      }
    );

    rerender({
      draftMapState: updatedDraftState,
      draftMapDescription: 'Updated draft description',
      draftUpdatedAt: '2026-03-01T12:00:00.000Z',
      isMapQueryFetching: false,
    });
    firstResolutionDeferred.resolve(null);

    await waitFor(() => {
      expect(setMapState).toHaveBeenCalledWith(updatedDraftState);
      expect(setMapDescriptionDraft).toHaveBeenCalledWith('Updated draft description');
      expect(setIsInitialStateResolved).toHaveBeenCalledWith(true);
    });
    expect(setMapState).not.toHaveBeenCalledWith(
      AdvancedMapAnalyticsUrlStateSchema.parse({ mapName: 'Server map' })
    );
  });

  it('does not resolve when auth is not loaded', async () => {
    const setIsInitialStateResolved = vi.fn();
    const mapQueryData = createMapQueryData();

    const { useMapEditorInitialState } = await import('./use-map-editor-initial-state');

    renderHook(() =>
      useMapEditorInitialState({
        mapId: 'map1',
        mapQueryData,
        isMapQueryFetching: false,
        draftMapState: defaultDraftMapState,
        draftMapDescription: '',
        draftUpdatedAt: null,
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

  it('resets initial-state resolution when mapId changes', async () => {
    const setMapDescriptionDraft = vi.fn();
    const setIsInitialStateResolved = vi.fn();
    const mapQueryData = createMapQueryData();

    const { useMapEditorInitialState } = await import('./use-map-editor-initial-state');

    const { rerender } = renderHook(
      ({ mapId }: { mapId: string }) =>
        useMapEditorInitialState({
          mapId,
          mapQueryData,
          isMapQueryFetching: false,
          draftMapState: defaultDraftMapState,
          draftMapDescription: '',
          draftUpdatedAt: null,
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
    expect(setMapDescriptionDraft).not.toHaveBeenCalledWith('');
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
          isMapQueryFetching: false,
          draftMapState: defaultDraftMapState,
          draftMapDescription: '',
          draftUpdatedAt: null,
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
        isMapQueryFetching: false,
        draftMapState: defaultDraftMapState,
        draftMapDescription: '',
        draftUpdatedAt: null,
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

  it('waits for a pending map refetch before resolving initial state', async () => {
    const setMapState = vi.fn();
    const setBaselineFromHash = vi.fn();
    const setMapDescriptionDraft = vi.fn();
    const setIsInitialStateResolved = vi.fn();
    const cachedEmptyQueryData = createMapQueryData({
      description: '',
      lastSnapshot: {
        snapshotId: 'snap_cached',
        createdAt: '2026-03-01T10:00:00.000Z',
        schemaVersion: 1,
        stateAtSave: 'private',
        title: 'Cached map',
        description: null,
        config: AdvancedMapAnalyticsUrlStateSchema.parse({}),
      },
    });
    const freshQueryData = createMapQueryData({
      description: 'Fresh description',
      lastSnapshot: {
        snapshotId: 'snap_fresh',
        createdAt: '2026-03-01T10:01:00.000Z',
        schemaVersion: 1,
        stateAtSave: 'private',
        title: 'Fresh map',
        description: null,
        config: AdvancedMapAnalyticsUrlStateSchema.parse({ mapName: 'Fresh map' }),
      },
    });

    const { useMapEditorInitialState } = await import('./use-map-editor-initial-state');
    const { rerender } = renderHook(
      ({
        mapQueryData,
        isMapQueryFetching,
      }: {
        mapQueryData: AdvancedMapAnalyticsMapDetail;
        isMapQueryFetching: boolean;
      }) =>
        useMapEditorInitialState({
          mapId: 'map1',
          mapQueryData,
          isMapQueryFetching,
          draftMapState: defaultDraftMapState,
          draftMapDescription: '',
          draftUpdatedAt: null,
          isLoaded: true,
          isSignedIn: true,
          setMapState,
          setBaselineFromHash,
          setMapDescriptionDraft,
          setIsInitialStateResolved,
        }),
      {
        initialProps: {
          mapQueryData: cachedEmptyQueryData,
          isMapQueryFetching: true,
        },
      }
    );

    expect(setMapState).not.toHaveBeenCalled();

    rerender({
      mapQueryData: freshQueryData,
      isMapQueryFetching: false,
    });

    await waitFor(() => {
      expect(setMapState).toHaveBeenCalledWith(freshQueryData.lastSnapshot.config);
      expect(setMapDescriptionDraft).toHaveBeenCalledWith('Fresh description');
      expect(setIsInitialStateResolved).toHaveBeenCalledWith(true);
    });
    expect(setMapState).not.toHaveBeenCalledWith(cachedEmptyQueryData.lastSnapshot.config);
  });
});
