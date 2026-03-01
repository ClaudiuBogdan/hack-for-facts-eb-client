import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AdvancedMapAnalyticsUrlStateSchema,
  type AdvancedMapAnalyticsUrlState,
} from '@/schemas/advanced-map-analytics';

const navigateMock = vi.fn();
const mapEditorPagePropsSpy = vi.fn();

let mockedParams = { mapId: 'map_1' };
let mockedSearch: Record<string, unknown> = {};

vi.mock('@tanstack/react-router', () => ({
  createLazyFileRoute: () => () => ({
    useParams: () => mockedParams,
    useSearch: () => mockedSearch,
  }),
  useNavigate: () => navigateMock,
}));

vi.mock('@/features/advanced-map-analytics/components/map-analytics-editor-page', () => ({
  MapAnalyticsEditorPage: (props: unknown) => {
    mapEditorPagePropsSpy(props);
    return <div data-testid="map-editor-page" />;
  },
}));

describe('MapEditorRouteComponent', () => {
  beforeEach(() => {
    mockedParams = { mapId: 'map_1' };
    mockedSearch = {
      ...AdvancedMapAnalyticsUrlStateSchema.parse({
        mapName: 'Existing map',
        activeView: 'map',
        mapCenter: [46.5, 24.5],
        mapZoom: 9,
      }),
      currency: 'EUR',
      inflation_adjusted: true,
    };
    navigateMock.mockReset();
    mapEditorPagePropsSpy.mockReset();
  });

  it('replaces object updates and keeps global search params', async () => {
    const { MapEditorRouteComponent } = await import('./$mapId.lazy');
    render(<MapEditorRouteComponent />);

    expect(screen.getByTestId('map-editor-page')).toBeInTheDocument();

    const setMapState = getSetMapStateFromProps();
    const nextSnapshotState = AdvancedMapAnalyticsUrlStateSchema.parse({
      mapName: 'Snapshot map',
      activeView: 'table',
    });

    setMapState(nextSnapshotState);
    const nextSearch = runSearchUpdater(mockedSearch);
    expect(getNavigateCall().to).toBe('/maps/editor/$mapId');
    expect(getNavigateCall().params).toEqual({ mapId: 'map_1' });

    expect(nextSearch.currency).toBe('EUR');
    expect(nextSearch.inflation_adjusted).toBe(true);
    expect(nextSearch.mapName).toBe('Snapshot map');
    expect(nextSearch.activeView).toBe('table');
    expect('mapCenter' in nextSearch).toBe(false);
    expect('mapZoom' in nextSearch).toBe(false);
  });

  it('replaces functional updates and keeps global search params', async () => {
    const { MapEditorRouteComponent } = await import('./$mapId.lazy');
    render(<MapEditorRouteComponent />);

    const setMapState = getSetMapStateFromProps();
    setMapState(() =>
      AdvancedMapAnalyticsUrlStateSchema.parse({
        mapName: 'Functional snapshot map',
        activeView: 'table',
      })
    );
    const nextSearch = runSearchUpdater(mockedSearch);
    expect(getNavigateCall().to).toBe('/maps/editor/$mapId');
    expect(getNavigateCall().params).toEqual({ mapId: 'map_1' });

    expect(nextSearch.currency).toBe('EUR');
    expect(nextSearch.inflation_adjusted).toBe(true);
    expect(nextSearch.mapName).toBe('Functional snapshot map');
    expect(nextSearch.activeView).toBe('table');
    expect('mapCenter' in nextSearch).toBe(false);
    expect('mapZoom' in nextSearch).toBe(false);
  });

  it('skips navigation when map id is missing', async () => {
    mockedParams = { mapId: '' };
    const { MapEditorRouteComponent } = await import('./$mapId.lazy');
    render(<MapEditorRouteComponent />);

    const setMapState = getSetMapStateFromProps();
    setMapState(
      AdvancedMapAnalyticsUrlStateSchema.parse({
        mapName: 'Snapshot map',
        activeView: 'table',
      })
    );

    expect(navigateMock).not.toHaveBeenCalled();
  });
});

function getSetMapStateFromProps() {
  const props = mapEditorPagePropsSpy.mock.calls[0]?.[0] as
    | {
        setMapState: (
          updater:
            | AdvancedMapAnalyticsUrlState
            | ((previousState: AdvancedMapAnalyticsUrlState) => AdvancedMapAnalyticsUrlState)
        ) => void;
      }
    | undefined;

  if (!props) {
    throw new Error('Missing MapAnalyticsEditorPage props.');
  }

  return props.setMapState;
}

function runSearchUpdater(previousSearch: Record<string, unknown>) {
  const navigateCall = navigateMock.mock.calls[0]?.[0] as
    | {
        search: (previousSearch: Record<string, unknown>) => Record<string, unknown>;
      }
    | undefined;

  if (!navigateCall) {
    throw new Error('Missing navigate call.');
  }

  return navigateCall.search(previousSearch);
}

function getNavigateCall() {
  const navigateCall = navigateMock.mock.calls[0]?.[0] as
    | {
        to?: string;
        params?: Record<string, unknown>;
      }
    | undefined;

  if (!navigateCall) {
    throw new Error('Missing navigate call.');
  }

  return navigateCall;
}
