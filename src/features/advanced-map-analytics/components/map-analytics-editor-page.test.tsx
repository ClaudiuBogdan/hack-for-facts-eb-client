import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { AdvancedMapAnalyticsUrlStateSchema } from '@/schemas/advanced-map-analytics';

const useAuthMock = vi.fn();
const useMapQueryMock = vi.fn();
const workspaceMock = vi.fn();

vi.mock('@/lib/auth', () => ({
  useAuth: () => useAuthMock(),
  AuthSignInButton: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock('@/features/advanced-map-analytics/hooks/use-advanced-map-analytics', () => ({
  useAdvancedMapAnalyticsMapQuery: (...args: unknown[]) => useMapQueryMock(...args),
}));

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => vi.fn(),
}));

vi.mock('./map-analytics-workspace', () => ({
  MapAnalyticsWorkspace: (props: unknown) => {
    workspaceMock(props);
    return <div data-testid="map-workspace" />;
  },
}));

vi.mock('./map-analytics-owner-config-modal', () => ({
  MapAnalyticsOwnerConfigModal: () => <div data-testid="owner-config-modal" />,
}));

describe('MapAnalyticsEditorPage', () => {
  beforeEach(() => {
    useAuthMock.mockReset();
    useMapQueryMock.mockReset();
    workspaceMock.mockReset();
    window.history.replaceState(null, '', '/maps/editor/map1');
  });

  it('hydrates map state from API snapshot when map search is absent', async () => {
    const setMapState = vi.fn();
    const lastSnapshotConfig = AdvancedMapAnalyticsUrlStateSchema.parse({ mapName: 'Hydrated map' });

    useAuthMock.mockReturnValue({ isLoaded: true, isSignedIn: true });
    useMapQueryMock.mockReturnValue({
      isLoading: false,
      error: null,
      data: {
        title: 'Hydrated map',
        description: null,
        state: 'private',
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

  it('does not hydrate from API when map state is already provided', async () => {
    const setMapState = vi.fn();
    const providedMapState = AdvancedMapAnalyticsUrlStateSchema.parse({
      mapName: 'Provided map state',
      activeView: 'table',
    });
    const lastSnapshotConfig = AdvancedMapAnalyticsUrlStateSchema.parse({ mapName: 'Hydrated map' });

    useAuthMock.mockReturnValue({ isLoaded: true, isSignedIn: true });
    useMapQueryMock.mockReturnValue({
      isLoading: false,
      error: null,
      data: {
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

    expect(screen.getByTestId('map-workspace')).toBeInTheDocument();
    expect(setMapState).not.toHaveBeenCalled();
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
});
