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

  /**
   * Runs `body` with `globalThis.window` removed, so the real
   * `shouldBlockLoaderForSsr` executes rather than a stub — otherwise an
   * inverted guard would ship green.
   */
  async function asServerRender<T>(body: () => Promise<T>): Promise<T> {
    const realWindow = globalThis.window;
    Reflect.deleteProperty(globalThis, 'window');
    try {
      return await body();
    } finally {
      Object.defineProperty(globalThis, 'window', {
        value: realWindow,
        configurable: true,
        writable: true,
      });
    }
  }

  async function importLoader() {
    const { Route } = await import('./$mapId');
    return (Route as unknown as {
      loader: (input: Record<string, unknown>) => Promise<void>;
    }).loader;
  }

  it('never blocks a client-side navigation on the map fetch', async () => {
    // This await was measured at ~1.25s of frozen previous page, with no
    // pendingComponent to show for it.
    const queryClient = {
      ensureQueryData: vi.fn(() => new Promise(() => {})),
    };
    const loader = await importLoader();

    await expect(
      loader({ context: { queryClient }, params: { mapId: 'public-map-3' } }),
    ).resolves.toBeUndefined();
    // The request still starts at click time — it just isn't awaited.
    expect(queryClient.ensureQueryData).toHaveBeenCalledTimes(1);
    expect(warmAdvancedAnalyticsMapResourcesMock).toHaveBeenCalledWith({
      queryClient,
    });
  });

  it('does await the map while server-rendering', async () => {
    let settle: (value: unknown) => void = () => {};
    const queryClient = {
      ensureQueryData: vi.fn(
        () => new Promise((resolve) => { settle = resolve; }),
      ),
    };
    const loader = await importLoader();

    let finished = false;
    const pending = asServerRender(async () => {
      await loader({
        context: { queryClient },
        params: { mapId: 'public-map-4' },
      });
      finished = true;
    });

    await Promise.resolve();
    expect(finished).toBe(false);

    settle({ lastSnapshot: { config: { mapLayers: { countyBoundaries: true } } } });
    await pending;
    expect(finished).toBe(true);
    expect(warmAdvancedAnalyticsMapResourcesMock).toHaveBeenNthCalledWith(2, {
      queryClient,
      includeCountyGeoJson: true,
      preloadInteractiveMap: false,
    });
  });

  it('does not let a failed map fetch reject the client navigation', async () => {
    const queryClient = {
      ensureQueryData: vi.fn().mockRejectedValue(new Error('boom')),
    };
    const loader = await importLoader();

    // The page's own query surfaces the failure; an unhandled rejection here
    // would take out the navigation instead.
    await expect(
      loader({ context: { queryClient }, params: { mapId: 'public-map-5' } }),
    ).resolves.toBeUndefined();
  });
});
