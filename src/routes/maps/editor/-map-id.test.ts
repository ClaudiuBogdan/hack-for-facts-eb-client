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

  it('waits for the warm-up on a hover preload only, so its code arrives inside the quiet preload', async () => {
    let settle: () => void = () => undefined;
    warmAdvancedAnalyticsMapResourcesMock.mockReturnValue(
      new Promise<void>((resolve) => {
        settle = resolve;
      }),
    );
    const { Route } = await import('./$mapId');
    const loader = (Route as unknown as {
      loader: (input: Record<string, unknown>) => Promise<void>;
    }).loader;
    const queryClient = { prefetchQuery: vi.fn() };

    // A visit does not wait.
    await loader({ context: { queryClient }, preload: false });

    let preloaded = false;
    const preloading = loader({ context: { queryClient }, preload: true }).then(() => {
      preloaded = true;
    });
    await Promise.resolve();
    expect(preloaded).toBe(false);
    settle();
    await preloading;
    expect(preloaded).toBe(true);
  });
});
