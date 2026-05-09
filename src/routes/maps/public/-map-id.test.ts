import { beforeEach, describe, expect, it, vi } from 'vitest';

const routeStub = vi.fn((options: Record<string, unknown>) => options);
const warmAdvancedAnalyticsMapResourcesMock = vi.fn();
const advancedMapAnalyticsPublicMapQueryOptionsMock = vi.fn();

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => routeStub,
}));

vi.mock('@/features/advanced-map-analytics/analytics-map-warmup', () => ({
  warmAdvancedAnalyticsMapResources: warmAdvancedAnalyticsMapResourcesMock,
}));

vi.mock('@/features/advanced-map-analytics/hooks/use-advanced-map-analytics', () => ({
  advancedMapAnalyticsPublicMapQueryOptions: advancedMapAnalyticsPublicMapQueryOptionsMock,
}));

describe('maps public route loader', () => {
  beforeEach(() => {
    vi.resetModules();
    routeStub.mockClear();
    warmAdvancedAnalyticsMapResourcesMock.mockReset();
    advancedMapAnalyticsPublicMapQueryOptionsMock.mockReset();
    warmAdvancedAnalyticsMapResourcesMock.mockResolvedValue(undefined);
    advancedMapAnalyticsPublicMapQueryOptionsMock.mockImplementation((publicId: string) => ({
      queryKey: ['advanced-map-analytics', 'public', publicId],
    }));
  });

  it('hydrates public map detail and starts base warmup', async () => {
    const queryClient = {
      ensureQueryData: vi.fn().mockResolvedValue({
        lastSnapshot: {
          config: {
            mapLayers: {
              countyBoundaries: false,
            },
          },
        },
      }),
    };

    const { Route } = await import('./$mapId');
    const routeWithLoader = Route as unknown as {
      loader: (input: Record<string, unknown>) => Promise<void>;
    };

    await routeWithLoader.loader({
      context: {
        queryClient,
      },
      params: { mapId: 'public-map-1' },
    });

    expect(advancedMapAnalyticsPublicMapQueryOptionsMock).toHaveBeenCalledWith('public-map-1');
    expect(queryClient.ensureQueryData).toHaveBeenCalledWith({
      queryKey: ['advanced-map-analytics', 'public', 'public-map-1'],
    });
    expect(warmAdvancedAnalyticsMapResourcesMock).toHaveBeenCalledTimes(1);
    expect(warmAdvancedAnalyticsMapResourcesMock).toHaveBeenCalledWith({
      queryClient,
    });
  });

  it('warms county boundaries when the public map enables them', async () => {
    const queryClient = {
      ensureQueryData: vi.fn().mockResolvedValue({
        lastSnapshot: {
          config: {
            mapLayers: {
              countyBoundaries: true,
            },
          },
        },
      }),
    };

    const { Route } = await import('./$mapId');
    const routeWithLoader = Route as unknown as {
      loader: (input: Record<string, unknown>) => Promise<void>;
    };

    await routeWithLoader.loader({
      context: {
        queryClient,
      },
      params: { mapId: 'public-map-2' },
    });

    expect(warmAdvancedAnalyticsMapResourcesMock).toHaveBeenNthCalledWith(1, {
      queryClient,
    });
    expect(warmAdvancedAnalyticsMapResourcesMock).toHaveBeenNthCalledWith(2, {
      queryClient,
      includeCountyGeoJson: true,
      preloadInteractiveMap: false,
    });
  });
});
