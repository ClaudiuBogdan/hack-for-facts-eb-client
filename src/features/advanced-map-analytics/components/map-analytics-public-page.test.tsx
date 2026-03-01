import { act, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AdvancedMapAnalyticsUrlStateSchema } from '@/schemas/advanced-map-analytics';
import type { AdvancedMapAnalyticsUrlState } from '@/schemas/advanced-map-analytics';

const useAdvancedMapAnalyticsPublicMapQueryMock = vi.fn();
const mapAnalyticsWorkspaceMock = vi.fn();

vi.mock('@/features/advanced-map-analytics/hooks/use-advanced-map-analytics', () => ({
  useAdvancedMapAnalyticsPublicMapQuery: (...args: unknown[]) =>
    useAdvancedMapAnalyticsPublicMapQueryMock(...args),
}));

vi.mock('./map-analytics-workspace', () => ({
  MapAnalyticsWorkspace: (props: unknown) => {
    mapAnalyticsWorkspaceMock(props);
    return <div data-testid="map-analytics-workspace" />;
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

describe('MapAnalyticsPublicPage', () => {
  beforeEach(() => {
    useAdvancedMapAnalyticsPublicMapQueryMock.mockReset();
    mapAnalyticsWorkspaceMock.mockReset();
  });

  it('shows loading state while fetching', async () => {
    useAdvancedMapAnalyticsPublicMapQueryMock.mockReturnValue({
      isLoading: true,
      data: null,
      error: null,
    });

    const { MapAnalyticsPublicPage } = await import('./map-analytics-public-page');
    render(<MapAnalyticsPublicPage publicId="map1" />);

    expect(screen.getByText('Loading public map...')).toBeInTheDocument();
  });

  it('renders shared workspace in read-only mode with API-loaded state', async () => {
    const mapState = AdvancedMapAnalyticsUrlStateSchema.parse({ mapName: 'Public map' });
    const groupedSeriesData = createGroupedSeriesData();

    useAdvancedMapAnalyticsPublicMapQueryMock.mockReturnValue({
      isLoading: false,
      error: null,
      data: {
        description: '# Public description',
        groupedSeriesData,
        lastSnapshot: {
          config: mapState,
        },
      },
    });

    const { MapAnalyticsPublicPage } = await import('./map-analytics-public-page');
    render(<MapAnalyticsPublicPage publicId="map1" />);

    await waitFor(() => {
      expect(screen.getByTestId('map-analytics-workspace')).toBeInTheDocument();
    });

    expect(mapAnalyticsWorkspaceMock).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'public',
        capabilities: { readOnly: true },
        mobileControlsDefaultCollapsed: true,
        mapDescription: '# Public description',
        bundledGroupedSeriesData: groupedSeriesData,
        bundledRemoteBaseSeriesHash: expect.any(String),
      })
    );
  });

  it('applies map viewport overrides to workspace state', async () => {
    const mapState = AdvancedMapAnalyticsUrlStateSchema.parse({
      mapName: 'Public map',
      mapZoom: 7,
      mapCenter: [45.5, 24.2],
    });
    const groupedSeriesData = createGroupedSeriesData();

    useAdvancedMapAnalyticsPublicMapQueryMock.mockReturnValue({
      isLoading: false,
      error: null,
      data: {
        description: '# Public description',
        groupedSeriesData,
        lastSnapshot: {
          config: mapState,
        },
      },
    });

    const { MapAnalyticsPublicPage } = await import('./map-analytics-public-page');
    render(
      <MapAnalyticsPublicPage
        publicId="map1"
        mapZoomOverride={9.3}
        mapCenterOverride={[46.7, 25.1]}
      />
    );

    await waitFor(() => {
      expect(mapAnalyticsWorkspaceMock).toHaveBeenCalledWith(
        expect.objectContaining({
          mapState: expect.objectContaining({
            mapZoom: 9.3,
            mapCenter: [46.7, 25.1],
          }),
        })
      );
    });
  });

  it('emits viewport changes from workspace state through callback', async () => {
    const mapState = AdvancedMapAnalyticsUrlStateSchema.parse({ mapName: 'Public map' });
    const groupedSeriesData = createGroupedSeriesData();
    const onMapViewportChange = vi.fn();

    useAdvancedMapAnalyticsPublicMapQueryMock.mockReturnValue({
      isLoading: false,
      error: null,
      data: {
        description: '# Public description',
        groupedSeriesData,
        lastSnapshot: {
          config: mapState,
        },
      },
    });

    const { MapAnalyticsPublicPage } = await import('./map-analytics-public-page');
    render(<MapAnalyticsPublicPage publicId="map1" onMapViewportChange={onMapViewportChange} />);

    await waitFor(() => {
      expect(screen.getByTestId('map-analytics-workspace')).toBeInTheDocument();
    });

    const workspaceProps = getLatestWorkspaceProps();
    await act(async () => {
      workspaceProps.setMapState((previousState) => ({
        ...previousState,
        mapZoom: 10.1,
        mapCenter: [47.2, 26.3],
      }));
    });

    await waitFor(() => {
      expect(onMapViewportChange).toHaveBeenCalledWith({
        mapZoom: 10.1,
        mapCenter: [47.2, 26.3],
      });
    });
  });

  it('shows API error when bundled grouped-series data is missing', async () => {
    useAdvancedMapAnalyticsPublicMapQueryMock.mockReturnValue({
      isLoading: false,
      data: null,
      error: new Error('Public map detail response missing grouped-series bundled data.'),
    });

    const { MapAnalyticsPublicPage } = await import('./map-analytics-public-page');
    render(<MapAnalyticsPublicPage publicId="map1" />);

    expect(
      screen.getByText('Public map detail response missing grouped-series bundled data.')
    ).toBeInTheDocument();
  });
});

function getLatestWorkspaceProps(): {
  setMapState: (
    updater:
      | AdvancedMapAnalyticsUrlState
      | ((previousState: AdvancedMapAnalyticsUrlState) => AdvancedMapAnalyticsUrlState)
  ) => void;
} {
  const latestCallIndex = mapAnalyticsWorkspaceMock.mock.calls.length - 1;
  const latestCall = mapAnalyticsWorkspaceMock.mock.calls[latestCallIndex]?.[0] as
    | {
        setMapState: (
          updater:
            | AdvancedMapAnalyticsUrlState
            | ((previousState: AdvancedMapAnalyticsUrlState) => AdvancedMapAnalyticsUrlState)
        ) => void;
      }
    | undefined;

  if (!latestCall) {
    throw new Error('Missing MapAnalyticsWorkspace props.');
  }

  return latestCall;
}
