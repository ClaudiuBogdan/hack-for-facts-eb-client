import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const navigateMock = vi.fn();
const mapPublicPagePropsSpy = vi.fn();

let mockedParams = { mapId: 'public_map_1' };
let mockedSearch: Record<string, unknown> = {};

vi.mock('@tanstack/react-router', () => ({
  createLazyFileRoute: () => () => ({
    useParams: () => mockedParams,
    useSearch: () => mockedSearch,
  }),
  useNavigate: () => navigateMock,
}));

vi.mock('@/features/advanced-map-analytics/components/map-analytics-public-page', () => ({
  MapAnalyticsPublicPage: (props: unknown) => {
    mapPublicPagePropsSpy(props);
    return <div data-testid="map-public-page" />;
  },
}));

describe('PublicMapRouteComponent', () => {
  beforeEach(() => {
    mockedParams = { mapId: 'public_map_1' };
    mockedSearch = {};
    navigateMock.mockReset();
    mapPublicPagePropsSpy.mockReset();
  });

  it('passes parsed viewport overrides from URL search to public page', async () => {
    mockedSearch = {
      currency: 'EUR',
      inflation_adjusted: true,
      mapZoom: 9.4,
      mapCenter: [46.5, 24.5],
    };

    const { PublicMapRouteComponent } = await import('./$mapId.lazy');
    render(<PublicMapRouteComponent />);

    expect(screen.getByTestId('map-public-page')).toBeInTheDocument();
    expect(mapPublicPagePropsSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        publicId: 'public_map_1',
        mapZoomOverride: 9.4,
        mapCenterOverride: [46.5, 24.5],
        onMapViewportChange: expect.any(Function),
      })
    );
  });

  it('ignores invalid viewport search values', async () => {
    mockedSearch = {
      mapZoom: 'invalid',
      mapCenter: [120, 250],
    };

    const { PublicMapRouteComponent } = await import('./$mapId.lazy');
    render(<PublicMapRouteComponent />);

    expect(mapPublicPagePropsSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        publicId: 'public_map_1',
        mapZoomOverride: undefined,
        mapCenterOverride: undefined,
      })
    );
  });

  it('updates viewport search while preserving global params', async () => {
    mockedSearch = {
      currency: 'EUR',
      inflation_adjusted: true,
      mapZoom: 9,
      mapCenter: [46, 24],
    };

    const { PublicMapRouteComponent } = await import('./$mapId.lazy');
    render(<PublicMapRouteComponent />);

    const onMapViewportChange = getOnMapViewportChangeFromProps();
    onMapViewportChange({
      mapZoom: 10.2,
      mapCenter: [47.1, 25.2],
    });

    const navigateCall = navigateMock.mock.calls[0]?.[0] as
      | {
          replace: boolean;
          resetScroll: boolean;
          search: (previousSearch: Record<string, unknown>) => Record<string, unknown>;
        }
      | undefined;
    if (!navigateCall) {
      throw new Error('Missing navigate call.');
    }

    expect(navigateCall.replace).toBe(true);
    expect(navigateCall.resetScroll).toBe(false);

    const nextSearch = navigateCall.search({
      currency: 'EUR',
      inflation_adjusted: true,
      extra: 'keep-this',
      mapZoom: 9,
      mapCenter: [46, 24],
    });

    expect(nextSearch).toEqual({
      currency: 'EUR',
      inflation_adjusted: true,
      extra: 'keep-this',
      mapZoom: 10.2,
      mapCenter: [47.1, 25.2],
    });
  });

  it('returns previous search object when viewport is unchanged', async () => {
    mockedSearch = {
      currency: 'EUR',
      mapZoom: 10.2,
      mapCenter: [47.1, 25.2],
    };

    const { PublicMapRouteComponent } = await import('./$mapId.lazy');
    render(<PublicMapRouteComponent />);

    const onMapViewportChange = getOnMapViewportChangeFromProps();
    onMapViewportChange({
      mapZoom: 10.2,
      mapCenter: [47.1, 25.2],
    });

    const navigateCall = navigateMock.mock.calls[0]?.[0] as
      | {
          search: (previousSearch: Record<string, unknown>) => Record<string, unknown>;
        }
      | undefined;
    if (!navigateCall) {
      throw new Error('Missing navigate call.');
    }

    const previousSearch = {
      currency: 'EUR',
      mapZoom: 10.2,
      mapCenter: [47.1, 25.2],
    };
    const nextSearch = navigateCall.search(previousSearch);
    expect(nextSearch).toBe(previousSearch);
  });
});

function getOnMapViewportChangeFromProps(): (next: {
  mapZoom?: number;
  mapCenter?: [number, number];
}) => void {
  const props = mapPublicPagePropsSpy.mock.calls[0]?.[0] as
    | {
        onMapViewportChange: (next: {
          mapZoom?: number;
          mapCenter?: [number, number];
        }) => void;
      }
    | undefined;

  if (!props) {
    throw new Error('Missing MapAnalyticsPublicPage props.');
  }

  return props.onMapViewportChange;
}
