import { beforeEach, describe, expect, it, vi } from 'vitest';

const routeStub = vi.fn((options: Record<string, unknown>) => options);
const warmAdvancedAnalyticsMapResourcesMock = vi.fn();
const advancedMapAnalyticsPublicMapQueryOptionsMock = vi.fn();
const startPublicMapReadMock = vi.fn();

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => routeStub,
}));

vi.mock('@/features/advanced-map-analytics/analytics-map-warmup', () => ({
  warmAdvancedAnalyticsMapResources: warmAdvancedAnalyticsMapResourcesMock,
}));

vi.mock('@/features/advanced-map-analytics/hooks/public-map-read', () => ({
  startPublicMapRead: startPublicMapReadMock,
}));

// The server's path only: the browser's loader never imports the decoding hooks.
vi.mock('@/features/advanced-map-analytics/hooks/use-advanced-map-analytics', () => ({
  advancedMapAnalyticsPublicMapQueryOptions: advancedMapAnalyticsPublicMapQueryOptionsMock,
  warmCountyBoundariesIfUsed: (queryClient: unknown, publicMap: { lastSnapshot?: { config?: { mapLayers?: { countyBoundaries?: boolean } } } } | undefined) => {
    if (publicMap?.lastSnapshot?.config?.mapLayers?.countyBoundaries) {
      void warmAdvancedAnalyticsMapResourcesMock({ queryClient, includeCountyGeoJson: true, preloadInteractiveMap: false });
    }
  },
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
    startPublicMapReadMock.mockReset();
  });

  it('starts the map\'s payload read and the base warm-up in the browser, leaving the decoding to the page', async () => {
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

    expect(startPublicMapReadMock).toHaveBeenCalledWith(queryClient, 'public-map-1');
    expect(advancedMapAnalyticsPublicMapQueryOptionsMock).not.toHaveBeenCalled();
    expect(queryClient.ensureQueryData).not.toHaveBeenCalled();
    expect(warmAdvancedAnalyticsMapResourcesMock).toHaveBeenCalledTimes(1);
    expect(warmAdvancedAnalyticsMapResourcesMock).toHaveBeenCalledWith({
      queryClient,
    });
  });

  it('waits for the base warm-up on a hover preload only, so its code arrives inside the quiet preload', async () => {
    let settle: () => void = () => undefined;
    warmAdvancedAnalyticsMapResourcesMock.mockReturnValue(
      new Promise<void>((resolve) => {
        settle = resolve;
      }),
    );
    const queryClient = {
      ensureQueryData: vi.fn().mockResolvedValue({
        lastSnapshot: { config: { mapLayers: { countyBoundaries: false } } },
      }),
    };
    const { Route } = await import('./$mapId');
    const loader = (Route as unknown as {
      loader: (input: Record<string, unknown>) => Promise<void>;
    }).loader;

    // A visit does not wait.
    await loader({ context: { queryClient }, params: { mapId: 'm' }, preload: false });

    let preloaded = false;
    const preloading = loader({
      context: { queryClient },
      params: { mapId: 'm' },
      preload: true,
    }).then(() => {
      preloaded = true;
    });
    await Promise.resolve();
    await Promise.resolve();
    expect(preloaded).toBe(false);
    settle();
    await preloading;
    expect(preloaded).toBe(true);
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
    expect(startPublicMapReadMock).toHaveBeenCalledTimes(1);
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

    // The server imports the decoding hooks, then reads the decoded map.
    await vi.waitFor(() => expect(queryClient.ensureQueryData).toHaveBeenCalledWith({ queryKey: ['advanced-map-analytics', 'public', 'public-map-4'] }));
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
