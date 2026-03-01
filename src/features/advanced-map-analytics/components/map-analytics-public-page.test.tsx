import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AdvancedMapAnalyticsUrlStateSchema } from '@/schemas/advanced-map-analytics';

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
    render(<MapAnalyticsPublicPage mapId="map1" />);

    expect(screen.getByText('Loading public map...')).toBeInTheDocument();
  });

  it('renders shared workspace in read-only mode with API-loaded state', async () => {
    const mapState = AdvancedMapAnalyticsUrlStateSchema.parse({ mapName: 'Public map' });

    useAdvancedMapAnalyticsPublicMapQueryMock.mockReturnValue({
      isLoading: false,
      error: null,
      data: {
        lastSnapshot: {
          config: mapState,
        },
      },
    });

    const { MapAnalyticsPublicPage } = await import('./map-analytics-public-page');
    render(<MapAnalyticsPublicPage mapId="map1" />);

    await waitFor(() => {
      expect(screen.getByTestId('map-analytics-workspace')).toBeInTheDocument();
    });

    expect(mapAnalyticsWorkspaceMock).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'public',
        capabilities: { readOnly: true },
      })
    );
  });
});
