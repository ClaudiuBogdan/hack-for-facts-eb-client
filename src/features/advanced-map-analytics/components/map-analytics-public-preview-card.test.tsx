import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AdvancedMapAnalyticsUrlStateSchema,
  createDefaultAdvancedMapAnalyticsSeries,
} from '@/schemas/advanced-map-analytics';
import type { AdvancedMapAnalyticsUrlState } from '@/schemas/advanced-map-analytics';

const mapAnalyticsWorkspaceMock = vi.fn();

vi.mock('@/features/advanced-map-analytics/components/map-analytics-workspace', () => ({
  MapAnalyticsWorkspace: (props: unknown) => {
    mapAnalyticsWorkspaceMock(props);
    return <div data-testid="map-analytics-workspace" />;
  },
}));

describe('MapAnalyticsPublicPreviewCard', () => {
  beforeEach(() => {
    mapAnalyticsWorkspaceMock.mockReset();
  });

  it('renders the workspace in preview layout with the compact chrome', async () => {
    const mapStateDefinition = AdvancedMapAnalyticsUrlStateSchema.parse({ mapName: 'Public map' });

    const { MapAnalyticsPublicPreviewCard } = await import('./map-analytics-public-preview-card');
    render(
      <MapAnalyticsPublicPreviewCard
        mapKey="expenses"
        mapDescription="# Public description"
        mapStateDefinition={mapStateDefinition}
        selectedYearOverride={2025}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('map-analytics-workspace')).toBeInTheDocument();
    });

    expect(screen.getByText('Public map')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Open map description' }),
    ).toBeEnabled();

    const latestWorkspaceProps = getLatestWorkspaceProps();

    expect(latestWorkspaceProps).toMatchObject({
      layout: 'preview',
      mode: 'public',
      capabilities: { readOnly: true },
      mapDescription: '# Public description',
    });
    expect('bundledGroupedSeriesData' in latestWorkspaceProps).toBe(false);
    expect('bundledRemoteBaseSeriesHash' in latestWorkspaceProps).toBe(false);
  });

  it('opens the description modal from the info button', async () => {
    const mapStateDefinition = AdvancedMapAnalyticsUrlStateSchema.parse({ mapName: 'Public map' });

    const { MapAnalyticsPublicPreviewCard } = await import('./map-analytics-public-preview-card');
    render(
      <MapAnalyticsPublicPreviewCard
        mapKey="expenses"
        mapDescription="# Public description"
        mapStateDefinition={mapStateDefinition}
        selectedYearOverride={2024}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Open map description' }));

    expect(screen.getByText('Map description')).toBeInTheDocument();
    expect(screen.getByText('Public description')).toBeInTheDocument();
  });

  it('applies runtime overrides to compatible remote series and the map title', async () => {
    const mapSeries = createDefaultAdvancedMapAnalyticsSeries('line-items-aggregated-yearly');
    if (mapSeries.type !== 'line-items-aggregated-yearly') {
      throw new Error('Expected execution series');
    }

    const mapStateDefinition = AdvancedMapAnalyticsUrlStateSchema.parse({
      mapName: 'Public map',
      series: [
        {
          ...mapSeries,
          filter: {
            ...mapSeries.filter,
            report_period: {
              type: 'YEAR',
              selection: {
                interval: {
                  start: '2025',
                  end: '2025',
                },
              },
            },
          },
        },
      ],
    });

    const { MapAnalyticsPublicPreviewCard } = await import('./map-analytics-public-preview-card');
    render(
      <MapAnalyticsPublicPreviewCard
        mapKey="expenses"
        mapDescription="# Public description"
        mapStateDefinition={mapStateDefinition}
        selectedYearOverride={2023}
        reportTypeOverride="Executie bugetara detaliata"
        normalizationOverride="per_capita"
        currencyOverride="EUR"
        inflationAdjustedOverride={true}
        mapNameOverride="Cheltuieli UAT (2023)"
      />
    );

    await waitFor(() => {
      expect(mapAnalyticsWorkspaceMock).toHaveBeenCalled();
    });

    const latestWorkspaceProps = getLatestWorkspaceProps();
    const series = latestWorkspaceProps.mapState.series[0];
    if (!series || series.type !== 'line-items-aggregated-yearly') {
      throw new Error('Expected transformed execution series');
    }

    expect(screen.getByText('Cheltuieli UAT (2023)')).toBeInTheDocument();
    expect(series.filter.report_period).toEqual({
      type: 'YEAR',
      selection: {
        interval: {
          start: '2023',
          end: '2023',
        },
      },
    });
    expect(series.filter.report_type).toBe('Executie bugetara detaliata');
    expect(series.filter.normalization).toBe('per_capita');
    expect(series.filter.currency).toBe('EUR');
    expect(series.filter.inflation_adjusted).toBe(true);
  });

  it('emits viewport changes from the preview workspace state', async () => {
    const mapStateDefinition = AdvancedMapAnalyticsUrlStateSchema.parse({ mapName: 'Public map' });
    const onMapViewportChange = vi.fn();

    const { MapAnalyticsPublicPreviewCard } = await import('./map-analytics-public-preview-card');
    render(
      <MapAnalyticsPublicPreviewCard
        mapKey="expenses"
        mapDescription="# Public description"
        mapStateDefinition={mapStateDefinition}
        selectedYearOverride={2025}
        onMapViewportChange={onMapViewportChange}
      />
    );

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

  it('applies viewport overrides to the preview state without bundled data', async () => {
    const mapStateDefinition = AdvancedMapAnalyticsUrlStateSchema.parse({
      mapName: 'Public map',
      mapZoom: 7.1,
      mapCenter: [45.2, 24.1],
    });

    const { MapAnalyticsPublicPreviewCard } = await import('./map-analytics-public-preview-card');
    render(
      <MapAnalyticsPublicPreviewCard
        mapKey="expenses"
        mapDescription="# Public description"
        mapStateDefinition={mapStateDefinition}
        selectedYearOverride={2025}
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
        }),
      );
    });
  });

  it('keeps the active viewport override when switching to a different map definition', async () => {
    const initialMapStateDefinition = AdvancedMapAnalyticsUrlStateSchema.parse({
      mapName: 'Public map 1',
      mapZoom: 7.1,
      mapCenter: [45.2, 24.1],
    });
    const nextMapStateDefinition = AdvancedMapAnalyticsUrlStateSchema.parse({
      mapName: 'Public map 2',
      mapZoom: 6.4,
      mapCenter: [46.4, 26.4],
    });
    const onMapViewportChange = vi.fn();

    const { MapAnalyticsPublicPreviewCard } = await import('./map-analytics-public-preview-card');
    const { rerender } = render(
      <MapAnalyticsPublicPreviewCard
        mapKey="expenses"
        mapDescription="# Public description"
        mapStateDefinition={initialMapStateDefinition}
        selectedYearOverride={2025}
        mapZoomOverride={9.3}
        mapCenterOverride={[46.7, 25.1]}
        onMapViewportChange={onMapViewportChange}
      />
    );

    await waitFor(() => {
      expect(mapAnalyticsWorkspaceMock).toHaveBeenCalledWith(
        expect.objectContaining({
          mapState: expect.objectContaining({
            mapZoom: 9.3,
            mapCenter: [46.7, 25.1],
          }),
        }),
      );
    });

    onMapViewportChange.mockClear();

    rerender(
      <MapAnalyticsPublicPreviewCard
        mapKey="income"
        mapDescription="# Public description"
        mapStateDefinition={nextMapStateDefinition}
        selectedYearOverride={2025}
        mapZoomOverride={9.3}
        mapCenterOverride={[46.7, 25.1]}
        onMapViewportChange={onMapViewportChange}
      />
    );

    await waitFor(() => {
      expect(mapAnalyticsWorkspaceMock).toHaveBeenCalledWith(
        expect.objectContaining({
          mapState: expect.objectContaining({
            mapName: 'Public map 2',
            mapZoom: 9.3,
            mapCenter: [46.7, 25.1],
          }),
        }),
      );
    });

    expect(onMapViewportChange).not.toHaveBeenCalledWith({
      mapZoom: 6.4,
      mapCenter: [46.4, 26.4],
    });
  });
});

function getLatestWorkspaceProps(): {
  layout?: string;
  mode?: string;
  capabilities?: {
    readOnly?: boolean;
  };
  mapDescription?: string;
  mapState: AdvancedMapAnalyticsUrlState;
  setMapState: (
    updater:
      | AdvancedMapAnalyticsUrlState
      | ((previousState: AdvancedMapAnalyticsUrlState) => AdvancedMapAnalyticsUrlState)
  ) => void;
} {
  const latestCallIndex = mapAnalyticsWorkspaceMock.mock.calls.length - 1;
  const latestCall = mapAnalyticsWorkspaceMock.mock.calls[latestCallIndex]?.[0] as
    | {
        layout?: string;
        mode?: string;
        capabilities?: {
          readOnly?: boolean;
        };
        mapDescription?: string;
        mapState: AdvancedMapAnalyticsUrlState;
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
