import { act, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { AdvancedMapAnalyticsUrlStateSchema } from '@/schemas/advanced-map-analytics';
import { createComparableMapEditorHash } from '@/features/advanced-map-analytics/local-snapshots/map-editor-dirty-state';

const useAuthMock = vi.fn();
const useMapQueryMock = vi.fn();
const useSaveSnapshotMutationMock = vi.fn();
const useMapLocalSnapshotsMock = vi.fn();
const getLatestLocalMapSnapshotMock = vi.fn();
const workspaceMock = vi.fn();
const ownerConfigModalMock = vi.fn();
const saveSnapshotDialogMock = vi.fn();
const localSnapshotsModalMock = vi.fn();
const navigateMock = vi.fn();
const updateMapDescriptionMock = vi.fn();
const mapEditorDraftByMapId = new Map<string, { mapDescription: string; updatedAt: string | null }>();

vi.mock('@/lib/auth', () => ({
  useAuth: () => useAuthMock(),
  AuthSignInButton: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock('@/features/advanced-map-analytics/hooks/use-advanced-map-analytics', () => ({
  useAdvancedMapAnalyticsMapQuery: (...args: unknown[]) => useMapQueryMock(...args),
  useSaveAdvancedMapAnalyticsSnapshotMutation: (...args: unknown[]) => useSaveSnapshotMutationMock(...args),
}));

vi.mock('@/features/advanced-map-analytics/hooks/use-map-local-snapshots', () => ({
  useMapLocalSnapshots: (...args: unknown[]) => useMapLocalSnapshotsMock(...args),
}));

vi.mock('@/features/advanced-map-analytics/hooks/use-uploaded-map-dataset-public-guard', () => ({
  useUploadedMapDatasetPublicGuard: () => ({
    privateDatasetTitles: [],
    blockingMessage: null,
    isChecking: false,
  }),
}));

vi.mock('@/features/advanced-map-analytics/local-snapshots/local-map-snapshots-db', () => ({
  getLatestLocalMapSnapshot: (...args: unknown[]) => getLatestLocalMapSnapshotMock(...args),
}));

vi.mock('@/features/advanced-map-analytics/store/map-editor-draft-store', () => ({
  useMapEditorDraftStore: (
    mapId: string,
    selector: (state: {
      mapDescription: string;
      updatedAt: string | null;
      updateMapDescription: (value: string) => void;
    }) => unknown
  ) => {
    if (!mapEditorDraftByMapId.has(mapId)) {
      mapEditorDraftByMapId.set(mapId, { mapDescription: '', updatedAt: null });
    }

    const draftState = mapEditorDraftByMapId.get(mapId)!;
    return selector({
      mapDescription: draftState.mapDescription,
      updatedAt: draftState.updatedAt,
      updateMapDescription: (value: string) => updateMapDescriptionMock(mapId, value),
    });
  },
}));

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => navigateMock,
}));

vi.mock('./map-analytics-workspace', () => ({
  MapAnalyticsWorkspace: (props: unknown) => {
    workspaceMock(props);
    return <div data-testid="map-workspace" />;
  },
}));

vi.mock('./map-analytics-owner-config-modal', () => ({
  MapAnalyticsOwnerConfigModal: (props: unknown) => {
    ownerConfigModalMock(props);
    return <div data-testid="owner-config-modal" />;
  },
}));

vi.mock('./map-analytics-save-snapshot-dialog', () => ({
  MapAnalyticsSaveSnapshotDialog: (props: unknown) => {
    saveSnapshotDialogMock(props);
    return <div data-testid="save-snapshot-dialog" />;
  },
}));

vi.mock('./map-analytics-local-snapshots-modal', () => ({
  MapAnalyticsLocalSnapshotsModal: (props: unknown) => {
    localSnapshotsModalMock(props);
    return <div data-testid="local-snapshots-modal" />;
  },
}));

function createGroupedSeriesData(seriesId = 'series_1') {
  return {
    manifest: {
      generated_at: '2026-03-01T10:00:00.000Z',
      format: 'wide_matrix_v1' as const,
      granularity: 'UAT' as const,
      series: [
        {
          series_id: seriesId,
          unit: 'RON',
          defined_value_count: 1,
        },
      ],
    },
    payload: {
      mime: 'text/csv' as const,
      compression: 'none' as const,
      data: `siruta_code,${seriesId}\n1001,10`,
    },
    warnings: [],
  };
}

function createDeferredPromise<T>() {
  let resolve: (value: T) => void = () => {};
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });

  return { promise, resolve };
}

describe('MapAnalyticsEditorPage', () => {
  beforeEach(() => {
    useAuthMock.mockReset();
    useMapQueryMock.mockReset();
    useSaveSnapshotMutationMock.mockReset();
    useMapLocalSnapshotsMock.mockReset();
    getLatestLocalMapSnapshotMock.mockReset();
    workspaceMock.mockReset();
    ownerConfigModalMock.mockReset();
    saveSnapshotDialogMock.mockReset();
    localSnapshotsModalMock.mockReset();
    navigateMock.mockReset();
    updateMapDescriptionMock.mockReset();
    mapEditorDraftByMapId.clear();
    mapEditorDraftByMapId.set('map1', { mapDescription: '', updatedAt: null });
    updateMapDescriptionMock.mockImplementation((mapId: string, value: string) => {
      const draftState = mapEditorDraftByMapId.get(mapId);
      if (!draftState) {
        return;
      }

      draftState.mapDescription = value;
      draftState.updatedAt = new Date().toISOString();
    });
    window.history.replaceState(null, '', '/maps/editor/map1');

    useSaveSnapshotMutationMock.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });
    useMapLocalSnapshotsMock.mockReturnValue({
      snapshots: [],
      isLoading: false,
      isDirty: false,
      createManualSnapshot: vi.fn(),
      restoreSnapshot: vi.fn(),
      deleteSnapshot: vi.fn(),
      clearSnapshots: vi.fn(),
      markCurrentAsSaved: vi.fn(),
      setBaselineFromHash: vi.fn(),
    });
    getLatestLocalMapSnapshotMock.mockResolvedValue(null);
  });

  it('hydrates map state from API snapshot when map search is absent', async () => {
    const setMapState = vi.fn();
    const lastSnapshotConfig = AdvancedMapAnalyticsUrlStateSchema.parse({ mapName: 'Hydrated map' });
    const groupedSeriesData = createGroupedSeriesData();

    useAuthMock.mockReturnValue({ isLoaded: true, isSignedIn: true });
    useMapQueryMock.mockReturnValue({
      isLoading: false,
      error: null,
      data: {
        publicId: 'public_abc123',
        title: 'Hydrated map',
        description: '## Saved map description',
        state: 'private',
        groupedSeriesData,
        lastSnapshot: {
          config: lastSnapshotConfig,
        },
      },
    });

    const { MapAnalyticsEditorPage } = await import('./map-analytics-editor-page');
    render(
      <MapAnalyticsEditorPage
        mapId="map1"
        mapState={AdvancedMapAnalyticsUrlStateSchema.parse({})}
        setMapState={setMapState}
      />
    );

    await waitFor(() => {
      expect(setMapState).toHaveBeenCalledWith(lastSnapshotConfig);
    });

    expect(screen.getByTestId('map-workspace')).toBeInTheDocument();
    expect(screen.getByTestId('owner-config-modal')).toBeInTheDocument();
    expect(screen.getByTestId('save-snapshot-dialog')).toBeInTheDocument();
    expect(screen.getByTestId('local-snapshots-modal')).toBeInTheDocument();
    expect(workspaceMock).toHaveBeenCalledWith(
      expect.objectContaining({
        mapDescription: '## Saved map description',
        bundledGroupedSeriesData: groupedSeriesData,
        bundledRemoteBaseSeriesHash: expect.any(String),
      })
    );
    expect(ownerConfigModalMock).toHaveBeenCalledWith(
      expect.objectContaining({
        currentPublicId: 'public_abc123',
        mapDescription: '## Saved map description',
        onMapDescriptionChange: expect.any(Function),
        onRequestSaveSnapshot: expect.any(Function),
      })
    );
  });

  it('shows sign-in gate when unauthenticated', async () => {
    useAuthMock.mockReturnValue({ isLoaded: true, isSignedIn: false });
    useMapQueryMock.mockReturnValue({ isLoading: false, error: null, data: null });

    const { MapAnalyticsEditorPage } = await import('./map-analytics-editor-page');
    render(
      <MapAnalyticsEditorPage
        mapId="map1"
        mapState={AdvancedMapAnalyticsUrlStateSchema.parse({})}
        setMapState={vi.fn()}
      />
    );

    expect(screen.getByText('Sign in required')).toBeInTheDocument();
  });

  it('shows API error message when bundled grouped-series data is missing', async () => {
    useAuthMock.mockReturnValue({ isLoaded: true, isSignedIn: true });
    useMapQueryMock.mockReturnValue({
      isLoading: false,
      data: null,
      error: new Error('Owner map detail response missing grouped-series bundled data.'),
    });

    const { MapAnalyticsEditorPage } = await import('./map-analytics-editor-page');
    render(
      <MapAnalyticsEditorPage
        mapId="map1"
        mapState={AdvancedMapAnalyticsUrlStateSchema.parse({})}
        setMapState={vi.fn()}
      />
    );

    expect(
      screen.getByText('Owner map detail response missing grouped-series bundled data.')
    ).toBeInTheDocument();
  });

  it('resolves with server snapshot when no newer draft timestamp exists', async () => {
    const setMapState = vi.fn();
    const providedMapState = AdvancedMapAnalyticsUrlStateSchema.parse({
      mapName: 'Provided map state',
      activeView: 'table',
    });
    const lastSnapshotConfig = AdvancedMapAnalyticsUrlStateSchema.parse({ mapName: 'Hydrated map' });
    window.history.replaceState(
      null,
      '',
      '/maps/editor/map1?mapName=Provided%20map%20state&activeView=table'
    );

    useAuthMock.mockReturnValue({ isLoaded: true, isSignedIn: true });
    useMapQueryMock.mockReturnValue({
      isLoading: false,
      error: null,
      data: {
        publicId: null,
        title: 'Hydrated map',
        description: null,
        state: 'private',
        lastSnapshot: {
          config: lastSnapshotConfig,
        },
      },
    });

    const { MapAnalyticsEditorPage } = await import('./map-analytics-editor-page');
    render(<MapAnalyticsEditorPage mapId="map1" mapState={providedMapState} setMapState={setMapState} />);

    await waitFor(() => {
      expect(setMapState).toHaveBeenCalledWith(lastSnapshotConfig);
    });
    expect(getLatestLocalMapSnapshotMock).toHaveBeenCalledWith('map1');
  });

  it('sets baseline from server snapshot when URL state differs only in ignored fields', async () => {
    const setBaselineFromHash = vi.fn();
    const serverSnapshotConfig = AdvancedMapAnalyticsUrlStateSchema.parse({
      mapName: 'Snapshot map',
      activeView: 'analytics',
      mapCenter: [46.05086, 25.01306],
      mapZoom: 7.4,
    });
    const urlMapState = AdvancedMapAnalyticsUrlStateSchema.parse({
      mapName: 'Snapshot map',
      activeView: 'map',
      mapCenter: [46.04797, 25.0089],
      mapZoom: 7.4,
    });
    const serverDescription = 'Server description';
    const expectedServerBaselineHash = createComparableMapEditorHash(
      serverSnapshotConfig,
      serverDescription
    );

    useMapLocalSnapshotsMock.mockReturnValue({
      snapshots: [],
      isLoading: false,
      isDirty: false,
      createManualSnapshot: vi.fn(),
      restoreSnapshot: vi.fn(),
      deleteSnapshot: vi.fn(),
      clearSnapshots: vi.fn(),
      markCurrentAsSaved: vi.fn(),
      setBaselineFromHash,
    });
    useAuthMock.mockReturnValue({ isLoaded: true, isSignedIn: true });
    useMapQueryMock.mockReturnValue({
      isLoading: false,
      error: null,
      data: {
        publicId: null,
        title: 'Snapshot map',
        description: serverDescription,
        state: 'private',
        lastSnapshot: {
          createdAt: '2026-03-03T10:05:00.000Z',
          config: serverSnapshotConfig,
        },
      },
    });
    window.history.replaceState(
      null,
      '',
      '/maps/editor/map1?mapName=Snapshot%20map&activeView=map&mapCenter=%5B46.04797%2C25.0089%5D&mapZoom=7.4'
    );

    const { MapAnalyticsEditorPage } = await import('./map-analytics-editor-page');
    render(<MapAnalyticsEditorPage mapId="map1" mapState={urlMapState} setMapState={vi.fn()} />);

    await waitFor(() => {
      expect(setBaselineFromHash).toHaveBeenCalledWith(expectedServerBaselineHash);
      expect(workspaceMock).toHaveBeenCalledWith(
        expect.objectContaining({
          hasPendingChanges: false,
        })
      );
    });
  });

  it('rehydrates when map id changes', async () => {
    const setMapState = vi.fn();
    const firstSnapshotConfig = AdvancedMapAnalyticsUrlStateSchema.parse({ mapName: 'Map one snapshot' });
    const secondSnapshotConfig = AdvancedMapAnalyticsUrlStateSchema.parse({ mapName: 'Map two snapshot' });

    useAuthMock.mockReturnValue({ isLoaded: true, isSignedIn: true });
    useMapQueryMock.mockImplementation((mapId: string) => ({
      isLoading: false,
      error: null,
      data: {
        publicId: null,
        title: mapId === 'map1' ? 'Map one' : 'Map two',
        description: null,
        state: 'private',
        lastSnapshot: {
          config: mapId === 'map1' ? firstSnapshotConfig : secondSnapshotConfig,
        },
      },
    }));

    const { MapAnalyticsEditorPage } = await import('./map-analytics-editor-page');
    const { rerender } = render(
      <MapAnalyticsEditorPage
        mapId="map1"
        mapState={AdvancedMapAnalyticsUrlStateSchema.parse({})}
        setMapState={setMapState}
      />
    );

    await waitFor(() => {
      expect(setMapState).toHaveBeenNthCalledWith(1, firstSnapshotConfig);
    });

    window.history.replaceState(null, '', '/maps/editor/map2');
    rerender(
      <MapAnalyticsEditorPage
        mapId="map2"
        mapState={AdvancedMapAnalyticsUrlStateSchema.parse({})}
        setMapState={setMapState}
      />
    );

    await waitFor(() => {
      expect(setMapState).toHaveBeenNthCalledWith(2, secondSnapshotConfig);
    });
  });

  it('loads latest local snapshot when URL state is absent and local is newer than server', async () => {
    const setMapState = vi.fn();
    const localMapState = AdvancedMapAnalyticsUrlStateSchema.parse({ mapName: 'Local draft' });
    const serverMapState = AdvancedMapAnalyticsUrlStateSchema.parse({ mapName: 'Server snapshot' });
    useAuthMock.mockReturnValue({ isLoaded: true, isSignedIn: true });
    useMapQueryMock.mockReturnValue({
      isLoading: false,
      error: null,
      data: {
        publicId: null,
        title: 'Map one',
        description: 'Server description',
        state: 'private',
        lastSnapshot: {
          createdAt: '2026-03-03T10:00:00.000Z',
          config: serverMapState,
        },
      },
    });
    useMapLocalSnapshotsMock.mockReturnValue({
      snapshots: [{ id: 1 }],
      isLoading: false,
      isDirty: true,
      createManualSnapshot: vi.fn(),
      restoreSnapshot: vi.fn(),
      deleteSnapshot: vi.fn(),
      clearSnapshots: vi.fn(),
      markCurrentAsSaved: vi.fn(),
      setBaselineFromHash: vi.fn(),
    });
    getLatestLocalMapSnapshotMock.mockResolvedValue({
      id: 123,
      mapId: 'map1',
      createdAt: '2026-03-03T10:05:00.000Z',
      updatedAt: '2026-03-03T10:05:00.000Z',
      source: 'auto',
      description: null,
      stateAtSave: 'private',
      mapState: localMapState,
      mapDescription: 'Local description',
      comparableHash: 'hash_local',
    });

    const { MapAnalyticsEditorPage } = await import('./map-analytics-editor-page');
    render(
      <MapAnalyticsEditorPage
        mapId="map1"
        mapState={AdvancedMapAnalyticsUrlStateSchema.parse({})}
        setMapState={setMapState}
      />
    );

    await waitFor(() => {
      expect(setMapState).toHaveBeenCalledWith(localMapState);
    });
    await waitFor(() => {
      expect(workspaceMock).toHaveBeenCalledWith(
        expect.objectContaining({
          mapDescription: 'Local description',
          hasPendingChanges: true,
        })
      );
    });
  });

  it('loads server snapshot when URL state is absent and server is newer or equal', async () => {
    const setMapState = vi.fn();
    const localMapState = AdvancedMapAnalyticsUrlStateSchema.parse({ mapName: 'Local draft' });
    const serverMapState = AdvancedMapAnalyticsUrlStateSchema.parse({ mapName: 'Server snapshot' });
    useAuthMock.mockReturnValue({ isLoaded: true, isSignedIn: true });
    useMapQueryMock.mockReturnValue({
      isLoading: false,
      error: null,
      data: {
        publicId: null,
        title: 'Map one',
        description: 'Server description',
        state: 'private',
        lastSnapshot: {
          createdAt: '2026-03-03T10:05:00.000Z',
          config: serverMapState,
        },
      },
    });
    getLatestLocalMapSnapshotMock.mockResolvedValue({
      id: 123,
      mapId: 'map1',
      createdAt: '2026-03-03T10:00:00.000Z',
      updatedAt: '2026-03-03T10:00:00.000Z',
      source: 'auto',
      description: null,
      stateAtSave: 'private',
      mapState: localMapState,
      mapDescription: 'Local description',
      comparableHash: 'hash_local',
    });

    const { MapAnalyticsEditorPage } = await import('./map-analytics-editor-page');
    render(
      <MapAnalyticsEditorPage
        mapId="map1"
        mapState={AdvancedMapAnalyticsUrlStateSchema.parse({})}
        setMapState={setMapState}
      />
    );

    await waitFor(() => {
      expect(setMapState).toHaveBeenCalledWith(serverMapState);
    });
    expect(workspaceMock).toHaveBeenCalledWith(
      expect.objectContaining({
        mapDescription: 'Server description',
      })
    );
  });

  it('keeps pending changes hidden until startup resolution completes', async () => {
    const setMapState = vi.fn();
    const deferredLocalSnapshot = createDeferredPromise<null>();
    useAuthMock.mockReturnValue({ isLoaded: true, isSignedIn: true });
    useMapQueryMock.mockReturnValue({
      isLoading: false,
      error: null,
      data: {
        publicId: null,
        title: 'Map one',
        description: null,
        state: 'private',
        lastSnapshot: {
          createdAt: '2026-03-03T10:00:00.000Z',
          config: AdvancedMapAnalyticsUrlStateSchema.parse({ mapName: 'Server snapshot' }),
        },
      },
    });
    useMapLocalSnapshotsMock.mockReturnValue({
      snapshots: [{ id: 1 }],
      isLoading: false,
      isDirty: true,
      createManualSnapshot: vi.fn(),
      restoreSnapshot: vi.fn(),
      deleteSnapshot: vi.fn(),
      clearSnapshots: vi.fn(),
      markCurrentAsSaved: vi.fn(),
      setBaselineFromHash: vi.fn(),
    });
    getLatestLocalMapSnapshotMock.mockReturnValue(deferredLocalSnapshot.promise);

    const { MapAnalyticsEditorPage } = await import('./map-analytics-editor-page');
    render(
      <MapAnalyticsEditorPage
        mapId="map1"
        mapState={AdvancedMapAnalyticsUrlStateSchema.parse({})}
        setMapState={setMapState}
      />
    );

    expect(workspaceMock).toHaveBeenCalledWith(
      expect.objectContaining({
        hasPendingChanges: false,
      })
    );
    expect(useMapLocalSnapshotsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        isBaselineReady: false,
      })
    );

    deferredLocalSnapshot.resolve(null);

    await waitFor(() => {
      expect(useMapLocalSnapshotsMock).toHaveBeenCalledWith(
        expect.objectContaining({
          isBaselineReady: true,
        })
      );
      expect(workspaceMock).toHaveBeenCalledWith(
        expect.objectContaining({
          hasPendingChanges: true,
        })
      );
    });
  });

  it('navigates to maps editor list when delete succeeds', async () => {
    const setMapState = vi.fn();
    useAuthMock.mockReturnValue({ isLoaded: true, isSignedIn: true });
    useMapQueryMock.mockReturnValue({
      isLoading: false,
      error: null,
      data: {
        publicId: null,
        title: 'Map one',
        description: null,
        state: 'private',
        lastSnapshot: {
          config: AdvancedMapAnalyticsUrlStateSchema.parse({ mapName: 'Map one snapshot' }),
        },
      },
    });

    const { MapAnalyticsEditorPage } = await import('./map-analytics-editor-page');
    render(
      <MapAnalyticsEditorPage
        mapId="map1"
        mapState={AdvancedMapAnalyticsUrlStateSchema.parse({})}
        setMapState={setMapState}
      />
    );

    await waitFor(() => {
      expect(setMapState).toHaveBeenCalled();
    });

    const modalProps = ownerConfigModalMock.mock.calls[0]?.[0] as { onDeleted: () => void } | undefined;
    expect(modalProps).toBeDefined();
    act(() => {
      modalProps?.onDeleted();
    });

    expect(navigateMock).toHaveBeenCalledWith({ to: '/maps/editor', replace: true });
  });

  it('passes dirty and local snapshots state to workspace controls', async () => {
    useAuthMock.mockReturnValue({ isLoaded: true, isSignedIn: true });
    useMapQueryMock.mockReturnValue({
      isLoading: false,
      error: null,
      data: {
        publicId: null,
        title: 'Map one',
        description: null,
        state: 'private',
        lastSnapshot: {
          config: AdvancedMapAnalyticsUrlStateSchema.parse({ mapName: 'Map one snapshot' }),
        },
      },
    });
    useMapLocalSnapshotsMock.mockReturnValue({
      snapshots: [{ id: 1 }, { id: 2 }],
      isLoading: false,
      isDirty: true,
      createManualSnapshot: vi.fn(),
      restoreSnapshot: vi.fn(),
      deleteSnapshot: vi.fn(),
      clearSnapshots: vi.fn(),
      markCurrentAsSaved: vi.fn(),
      setBaselineFromHash: vi.fn(),
    });

    const { MapAnalyticsEditorPage } = await import('./map-analytics-editor-page');
    render(
      <MapAnalyticsEditorPage
        mapId="map1"
        mapState={AdvancedMapAnalyticsUrlStateSchema.parse({})}
        setMapState={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(workspaceMock).toHaveBeenCalledWith(
        expect.objectContaining({
          hasPendingChanges: true,
          localSnapshotCount: 2,
        })
      );
    });
  });

  it('does not reset server baseline when restoring a local snapshot', async () => {
    const setMapState = vi.fn();
    const setBaselineFromHash = vi.fn();
    const restoredMapState = AdvancedMapAnalyticsUrlStateSchema.parse({ mapName: 'Restored local' });
    useAuthMock.mockReturnValue({ isLoaded: true, isSignedIn: true });
    useMapQueryMock.mockReturnValue({
      isLoading: false,
      error: null,
      data: {
        publicId: null,
        title: 'Map one',
        description: 'Server description',
        state: 'private',
        lastSnapshot: {
          createdAt: '2026-03-03T10:05:00.000Z',
          config: AdvancedMapAnalyticsUrlStateSchema.parse({ mapName: 'Server snapshot' }),
        },
      },
    });
    useMapLocalSnapshotsMock.mockReturnValue({
      snapshots: [{ id: 1 }],
      isLoading: false,
      isDirty: true,
      createManualSnapshot: vi.fn(),
      restoreSnapshot: vi.fn().mockResolvedValue({
        id: 1,
        mapId: 'map1',
        createdAt: '2026-03-03T10:10:00.000Z',
        updatedAt: '2026-03-03T10:10:00.000Z',
        source: 'manual',
        description: null,
        stateAtSave: 'private',
        mapState: restoredMapState,
        mapDescription: 'Restored description',
        comparableHash: 'local_hash',
      }),
      deleteSnapshot: vi.fn(),
      clearSnapshots: vi.fn(),
      markCurrentAsSaved: vi.fn(),
      setBaselineFromHash,
    });

    const { MapAnalyticsEditorPage } = await import('./map-analytics-editor-page');
    render(
      <MapAnalyticsEditorPage
        mapId="map1"
        mapState={AdvancedMapAnalyticsUrlStateSchema.parse({})}
        setMapState={setMapState}
      />
    );

    await waitFor(() => {
      expect(setBaselineFromHash).toHaveBeenCalledTimes(1);
    });

    const localSnapshotsModalProps = localSnapshotsModalMock.mock.calls[0]?.[0] as
      | { onLoad: (snapshotId: number) => Promise<void> }
      | undefined;
    expect(localSnapshotsModalProps).toBeDefined();
    await act(async () => {
      await localSnapshotsModalProps?.onLoad(1);
    });

    expect(setMapState).toHaveBeenCalledWith(restoredMapState);
    expect(setBaselineFromHash).toHaveBeenCalledTimes(1);
  });

  it('keeps export backup best-effort when local snapshot creation fails', async () => {
    const setMapState = vi.fn();
    const createManualSnapshot = vi.fn().mockRejectedValue(new Error('indexeddb unavailable'));
    useAuthMock.mockReturnValue({ isLoaded: true, isSignedIn: true });
    useMapQueryMock.mockReturnValue({
      isLoading: false,
      error: null,
      data: {
        publicId: null,
        title: 'Map one',
        description: null,
        state: 'private',
        lastSnapshot: {
          config: AdvancedMapAnalyticsUrlStateSchema.parse({ mapName: 'Map one snapshot' }),
        },
      },
    });
    useMapLocalSnapshotsMock.mockReturnValue({
      snapshots: [],
      isLoading: false,
      isDirty: false,
      createManualSnapshot,
      restoreSnapshot: vi.fn(),
      deleteSnapshot: vi.fn(),
      clearSnapshots: vi.fn(),
      markCurrentAsSaved: vi.fn(),
      setBaselineFromHash: vi.fn(),
    });

    const { MapAnalyticsEditorPage } = await import('./map-analytics-editor-page');
    render(
      <MapAnalyticsEditorPage
        mapId="map1"
        mapState={AdvancedMapAnalyticsUrlStateSchema.parse({})}
        setMapState={setMapState}
      />
    );

    await waitFor(() => {
      expect(setMapState).toHaveBeenCalled();
    });

    const workspaceProps = workspaceMock.mock.calls[0]?.[0] as
      | { onBeforeExportConfig?: () => Promise<void> }
      | undefined;
    const ownerModalProps = ownerConfigModalMock.mock.calls[0]?.[0] as
      | { onBeforeExportConfig?: () => Promise<void> }
      | undefined;
    expect(workspaceProps?.onBeforeExportConfig).toBeTypeOf('function');
    expect(ownerModalProps?.onBeforeExportConfig).toBeTypeOf('function');

    await expect(workspaceProps?.onBeforeExportConfig?.()).resolves.toBeUndefined();
    await expect(ownerModalProps?.onBeforeExportConfig?.()).resolves.toBeUndefined();
    expect(createManualSnapshot).toHaveBeenCalledTimes(2);
  });
});
