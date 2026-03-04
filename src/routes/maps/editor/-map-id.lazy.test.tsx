import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AdvancedMapAnalyticsUrlStateSchema,
  type AdvancedMapAnalyticsUrlState,
} from '@/schemas/advanced-map-analytics';

const navigateMock = vi.fn();
const mapEditorPagePropsSpy = vi.fn();
const updateMapStateMock = vi.fn();
const replaceDraftMock = vi.fn();
const hasMapEditorSearchParamsMock = vi.fn();
const stripMapEditorSearchParamsMock = vi.fn();

let mockedParams = { mapId: 'map_1' };
let mockedSearch: Record<string, unknown> = {};

const draftState = {
  mapState: AdvancedMapAnalyticsUrlStateSchema.parse({
    mapName: 'Draft map',
    activeView: 'map',
  }),
  mapDescription: 'Draft description',
  updateMapState: updateMapStateMock,
  replaceDraft: replaceDraftMock,
};

vi.mock('@tanstack/react-router', () => ({
  createLazyFileRoute: () => () => ({
    useParams: () => mockedParams,
    useSearch: () => mockedSearch,
  }),
  useNavigate: () => navigateMock,
}));

vi.mock('@/features/advanced-map-analytics/hooks/use-map-editor-storage-fallback-warning', () => ({
  useMapEditorStorageFallbackWarning: () => {},
}));

vi.mock('@/features/advanced-map-analytics/store/map-editor-draft-store', () => ({
  useMapEditorDraftStore: (_mapId: string, selector: (state: typeof draftState) => unknown) =>
    selector(draftState),
}));

vi.mock('@/features/advanced-map-analytics/map-editor-search', () => ({
  hasMapEditorSearchParams: (...args: unknown[]) => hasMapEditorSearchParamsMock(...args),
  stripMapEditorSearchParams: (...args: unknown[]) => stripMapEditorSearchParamsMock(...args),
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
      currency: 'EUR',
      inflation_adjusted: true,
    };
    navigateMock.mockReset();
    mapEditorPagePropsSpy.mockReset();
    updateMapStateMock.mockReset();
    replaceDraftMock.mockReset();
    hasMapEditorSearchParamsMock.mockReset();
    stripMapEditorSearchParamsMock.mockReset();
    hasMapEditorSearchParamsMock.mockReturnValue(false);
    stripMapEditorSearchParamsMock.mockImplementation((value) => value);
  });

  it('passes draft-backed state and updater to the editor page', async () => {
    const { MapEditorRouteComponent } = await import('./$mapId.lazy');
    render(<MapEditorRouteComponent />);

    expect(screen.getByTestId('map-editor-page')).toBeInTheDocument();

    const props = mapEditorPagePropsSpy.mock.calls[0]?.[0] as
      | {
          mapId: string;
          mapState: AdvancedMapAnalyticsUrlState;
          setMapState: (
            updater:
              | AdvancedMapAnalyticsUrlState
              | ((previousState: AdvancedMapAnalyticsUrlState) => AdvancedMapAnalyticsUrlState)
          ) => void;
        }
      | undefined;

    expect(props?.mapId).toBe('map_1');
    expect(props?.mapState.mapName).toBe('Draft map');

    const nextState = AdvancedMapAnalyticsUrlStateSchema.parse({ mapName: 'Next state' });
    props?.setMapState(nextState);
    expect(updateMapStateMock).toHaveBeenCalledWith(nextState);
    expect(navigateMock).not.toHaveBeenCalled();
  });

  it('migrates legacy editor search into draft store and strips URL params', async () => {
    mockedSearch = {
      ...AdvancedMapAnalyticsUrlStateSchema.parse({
        mapName: 'Legacy search map',
        activeView: 'table',
      }),
      currency: 'EUR',
    };
    hasMapEditorSearchParamsMock.mockReturnValue(true);
    stripMapEditorSearchParamsMock.mockReturnValue({ currency: 'EUR' });

    const { MapEditorRouteComponent } = await import('./$mapId.lazy');
    render(<MapEditorRouteComponent />);

    await waitFor(() => {
      expect(replaceDraftMock).toHaveBeenCalledWith(
        expect.objectContaining({
          mapState: expect.objectContaining({ mapName: 'Legacy search map' }),
          mapDescription: 'Draft description',
        })
      );
    });

    expect(navigateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: '/maps/editor/$mapId',
        params: { mapId: 'map_1' },
        replace: true,
        resetScroll: false,
      })
    );
  });
});
