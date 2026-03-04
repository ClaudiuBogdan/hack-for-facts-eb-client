import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { AdvancedMapAnalyticsUrlStateSchema } from '@/schemas/advanced-map-analytics';

const navigateMock = vi.fn();
let mockedSearch: Record<string, unknown> = {};
let authState = { isLoaded: true, isSignedIn: true };
const createMapMutateAsyncMock = vi.fn();
const saveSnapshotMutateAsyncMock = vi.fn();
const consumeMapCloneHandoffMock = vi.fn();
const analyticsCaptureMock = vi.fn();

vi.mock('@tanstack/react-router', () => ({
  createLazyFileRoute: () => () => ({
    useSearch: () => mockedSearch,
  }),
  useNavigate: () => navigateMock,
}));

vi.mock('@/lib/auth', () => ({
  useAuth: () => authState,
  AuthSignInButton: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock('@/features/advanced-map-analytics/hooks/use-map-editor-storage-fallback-warning', () => ({
  useMapEditorStorageFallbackWarning: () => {},
}));

vi.mock('@/features/advanced-map-analytics/store/map-clone-handoff', () => ({
  consumeMapCloneHandoff: (...args: unknown[]) => consumeMapCloneHandoffMock(...args),
}));

vi.mock('@/lib/analytics', () => ({
  Analytics: {
    capture: (...args: unknown[]) => analyticsCaptureMock(...args),
    EVENTS: {
      AdvancedMapAnalyticsCloneHandoffUsed: 'advanced_map_analytics_clone_handoff_used',
      AdvancedMapAnalyticsLegacyCloneStateUsed: 'advanced_map_analytics_legacy_clone_state_used',
    },
  },
}));

vi.mock('@/features/advanced-map-analytics/hooks/use-advanced-map-analytics', () => ({
  useCreateAdvancedMapAnalyticsMapMutation: () => ({
    mutateAsync: createMapMutateAsyncMock,
  }),
  useSaveAdvancedMapAnalyticsSnapshotMutation: () => ({
    mutateAsync: saveSnapshotMutateAsyncMock,
  }),
}));

describe('NewMapRouteComponent', () => {
  beforeEach(() => {
    mockedSearch = {};
    authState = { isLoaded: true, isSignedIn: true };
    navigateMock.mockReset();
    createMapMutateAsyncMock.mockReset();
    saveSnapshotMutateAsyncMock.mockReset();
    consumeMapCloneHandoffMock.mockReset();
    analyticsCaptureMock.mockReset();
    consumeMapCloneHandoffMock.mockReturnValue(null);
    createMapMutateAsyncMock.mockResolvedValue({
      id: 'map_created_1',
      lastSnapshot: {
        config: AdvancedMapAnalyticsUrlStateSchema.parse({ mapName: 'Created map' }),
      },
    });
    saveSnapshotMutateAsyncMock.mockResolvedValue({
      snapshotId: 'snapshot_1',
    });
  });

  it('creates map from default state and redirects to /maps/editor/:mapId', async () => {
    const { NewMapRouteComponent } = await import('./new.lazy');

    render(<NewMapRouteComponent />);

    await waitFor(() => {
      expect(createMapMutateAsyncMock).toHaveBeenCalledTimes(1);
    });

    expect(createMapMutateAsyncMock).toHaveBeenCalledWith(
      expect.objectContaining({
        state: 'private',
      })
    );
    expect(saveSnapshotMutateAsyncMock).not.toHaveBeenCalled();

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          to: '/maps/editor/$mapId',
          params: { mapId: 'map_created_1' },
          replace: true,
        })
      );
    });
  });

  it('creates map from legacy state query and keeps clone snapshot save', async () => {
    mockedSearch = {
      state: AdvancedMapAnalyticsUrlStateSchema.parse({
        mapName: 'Cloned map',
      }),
    };

    const { NewMapRouteComponent } = await import('./new.lazy');
    render(<NewMapRouteComponent />);

    await waitFor(() => {
      expect(createMapMutateAsyncMock).toHaveBeenCalledTimes(1);
    });

    expect(createMapMutateAsyncMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Cloned map',
        mapState: expect.objectContaining({ mapName: 'Cloned map' }),
      })
    );

    await waitFor(() => {
      expect(saveSnapshotMutateAsyncMock).toHaveBeenCalledWith(
        expect.objectContaining({
          mapId: 'map_created_1',
          title: 'Cloned map',
          stateAtSave: 'private',
          mapState: expect.objectContaining({ mapName: 'Cloned map' }),
        })
      );
    });

    expect(analyticsCaptureMock).toHaveBeenCalledWith(
      'advanced_map_analytics_legacy_clone_state_used',
      expect.any(Object)
    );
  });

  it('creates map from cloneRef handoff payload', async () => {
    mockedSearch = {
      cloneRef: 'clone_ref_1',
    };
    consumeMapCloneHandoffMock.mockReturnValue({
      mapState: AdvancedMapAnalyticsUrlStateSchema.parse({ mapName: 'Handoff map' }),
      mapDescription: 'Imported description',
    });

    const { NewMapRouteComponent } = await import('./new.lazy');
    render(<NewMapRouteComponent />);

    await waitFor(() => {
      expect(consumeMapCloneHandoffMock).toHaveBeenCalledWith('clone_ref_1');
    });

    await waitFor(() => {
      expect(createMapMutateAsyncMock).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Handoff map',
          description: 'Imported description',
          mapState: expect.objectContaining({ mapName: 'Handoff map' }),
        })
      );
    });

    expect(saveSnapshotMutateAsyncMock).toHaveBeenCalledWith(
      expect.objectContaining({
        mapPatch: {
          description: 'Imported description',
        },
      })
    );

    expect(analyticsCaptureMock).toHaveBeenCalledWith(
      'advanced_map_analytics_clone_handoff_used',
      expect.any(Object)
    );
  });

  it('shows sign-in gate when user is not authenticated', async () => {
    authState = { isLoaded: true, isSignedIn: false };

    const { NewMapRouteComponent } = await import('./new.lazy');
    render(<NewMapRouteComponent />);

    expect(screen.getByText('Sign in required')).toBeInTheDocument();
    expect(createMapMutateAsyncMock).not.toHaveBeenCalled();
  });

  it('does not loop create attempts when map creation fails', async () => {
    createMapMutateAsyncMock.mockRejectedValueOnce(new Error('Create failed'));

    const { NewMapRouteComponent } = await import('./new.lazy');
    render(<NewMapRouteComponent />);

    await waitFor(() => {
      expect(screen.getByText('Failed to create map')).toBeInTheDocument();
    });

    expect(createMapMutateAsyncMock).toHaveBeenCalledTimes(1);
  });

  it('retries creation only when Retry is clicked', async () => {
    createMapMutateAsyncMock
      .mockRejectedValueOnce(new Error('Create failed'))
      .mockResolvedValueOnce({
        id: 'map_created_2',
        lastSnapshot: {
          config: AdvancedMapAnalyticsUrlStateSchema.parse({ mapName: 'Retry map' }),
        },
      });

    const { NewMapRouteComponent } = await import('./new.lazy');
    render(<NewMapRouteComponent />);

    await waitFor(() => {
      expect(screen.getByText('Failed to create map')).toBeInTheDocument();
    });

    expect(createMapMutateAsyncMock).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));

    await waitFor(() => {
      expect(createMapMutateAsyncMock).toHaveBeenCalledTimes(2);
    });
  });

  it('shows invalid map link state and does not auto-create when clone state is malformed', async () => {
    mockedSearch = {
      state: '{"mapName":',
    };

    const { NewMapRouteComponent } = await import('./new.lazy');
    render(<NewMapRouteComponent />);

    expect(screen.getByText('Invalid map link')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create empty map' })).toBeInTheDocument();
    expect(createMapMutateAsyncMock).not.toHaveBeenCalled();
  });

  it('shows invalid map link when cloneRef cannot be consumed', async () => {
    mockedSearch = {
      cloneRef: 'missing_ref',
    };

    const { NewMapRouteComponent } = await import('./new.lazy');
    render(<NewMapRouteComponent />);

    expect(screen.getByText('Invalid map link')).toBeInTheDocument();
    expect(createMapMutateAsyncMock).not.toHaveBeenCalled();
  });

  it('creates an empty map when user confirms invalid map link recovery', async () => {
    mockedSearch = {
      state: '{"mapName":',
    };

    const { NewMapRouteComponent } = await import('./new.lazy');
    render(<NewMapRouteComponent />);

    fireEvent.click(screen.getByRole('button', { name: 'Create empty map' }));

    await waitFor(() => {
      expect(createMapMutateAsyncMock).toHaveBeenCalledTimes(1);
    });

    expect(createMapMutateAsyncMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Untitled map',
        state: 'private',
        mapState: AdvancedMapAnalyticsUrlStateSchema.parse({}),
      })
    );
    expect(saveSnapshotMutateAsyncMock).not.toHaveBeenCalled();
  });

  it('retries clone snapshot persistence without creating another map', async () => {
    mockedSearch = {
      state: AdvancedMapAnalyticsUrlStateSchema.parse({
        mapName: 'Clone retry map',
      }),
    };
    saveSnapshotMutateAsyncMock
      .mockRejectedValueOnce(new Error('Snapshot failed'))
      .mockResolvedValueOnce({ snapshotId: 'snapshot_2' });

    const { NewMapRouteComponent } = await import('./new.lazy');
    render(<NewMapRouteComponent />);

    await waitFor(() => {
      expect(screen.getByText('Failed to create map')).toBeInTheDocument();
    });

    expect(createMapMutateAsyncMock).toHaveBeenCalledTimes(1);
    expect(saveSnapshotMutateAsyncMock).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));

    await waitFor(() => {
      expect(saveSnapshotMutateAsyncMock).toHaveBeenCalledTimes(2);
    });

    expect(createMapMutateAsyncMock).toHaveBeenCalledTimes(1);
  });
});
