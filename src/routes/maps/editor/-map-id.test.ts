import { beforeEach, describe, expect, it, vi } from 'vitest';

const routeStub = vi.fn((options: Record<string, unknown>) => options);
const warmAdvancedAnalyticsMapResourcesMock = vi.fn();

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => routeStub,
}));

vi.mock('@/features/advanced-map-analytics/analytics-map-warmup', () => ({
  warmAdvancedAnalyticsMapResources: warmAdvancedAnalyticsMapResourcesMock,
}));

describe('maps editor route warmup', () => {
  beforeEach(() => {
    vi.resetModules();
    routeStub.mockClear();
    warmAdvancedAnalyticsMapResourcesMock.mockReset();
    warmAdvancedAnalyticsMapResourcesMock.mockResolvedValue(undefined);
  });

  it('starts analytics map warmup on route load', async () => {
    const queryClient = {
      prefetchQuery: vi.fn(),
    };

    const { Route } = await import('./$mapId');
    const routeWithLoader = Route as unknown as {
      loader: (input: Record<string, unknown>) => void;
    };

    expect(routeWithLoader.loader).toBeTypeOf('function');

    routeWithLoader.loader({
      context: {
        queryClient,
      },
    });

    expect(warmAdvancedAnalyticsMapResourcesMock).toHaveBeenCalledWith({
      queryClient,
    });
  });
});
