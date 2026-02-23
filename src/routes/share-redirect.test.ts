import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildShareRedirectHref, navigateShareRedirect, type ShareRouter } from './share-redirect';

describe('share redirect helper', () => {
  const parseLocationMock = vi.fn();
  const navigateMock = vi.fn();
  const replaceLocationMock = vi.fn();
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  const createRouter = (): ShareRouter => ({
    parseLocation: parseLocationMock,
    state: {
      location: {
        state: { __TSR_index: 4 },
      },
    },
  });

  beforeEach(() => {
    vi.clearAllMocks();
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('builds a client-side href using router parseLocation', () => {
    parseLocationMock.mockImplementation((location: { href: string }) => ({ href: location.href }));
    const router = createRouter();

    const href = buildShareRedirectHref(
      router,
      'http://localhost/charts/demo?view=overview#section',
      'http://localhost'
    );

    expect(parseLocationMock).toHaveBeenCalledWith(
      expect.objectContaining({
        href: '/charts/demo?view=overview#section',
        pathname: '/charts/demo',
        search: '?view=overview',
        hash: '#section',
        state: { __TSR_index: 4 },
      })
    );
    expect(href).toBe('/charts/demo?view=overview#section');
  });

  it('uses router navigation for valid share redirects', async () => {
    parseLocationMock.mockImplementation((location: { href: string }) => ({ href: location.href }));
    const router = createRouter();

    await navigateShareRedirect({
      redirectUrl: 'http://localhost/charts/demo?view=overview',
      currentOrigin: 'http://localhost',
      router,
      navigate: navigateMock,
      replaceLocation: replaceLocationMock,
    });

    expect(navigateMock).toHaveBeenCalledWith({
      href: '/charts/demo?view=overview',
      replace: true,
    });
    expect(replaceLocationMock).not.toHaveBeenCalled();
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it('falls back to hard redirect for invalid URLs', async () => {
    const router = createRouter();

    await navigateShareRedirect({
      redirectUrl: 'http://[::1',
      currentOrigin: 'http://localhost',
      router,
      navigate: navigateMock,
      replaceLocation: replaceLocationMock,
    });

    expect(navigateMock).not.toHaveBeenCalled();
    expect(replaceLocationMock).toHaveBeenCalledWith('http://[::1');
    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
  });

  it('falls back to hard redirect when router navigation fails', async () => {
    parseLocationMock.mockImplementation((location: { href: string }) => ({ href: location.href }));
    navigateMock.mockRejectedValue(new Error('navigation failed'));
    const router = createRouter();

    await navigateShareRedirect({
      redirectUrl: 'http://localhost/charts/demo?view=overview',
      currentOrigin: 'http://localhost',
      router,
      navigate: navigateMock,
      replaceLocation: replaceLocationMock,
    });

    expect(navigateMock).toHaveBeenCalledTimes(1);
    expect(replaceLocationMock).toHaveBeenCalledWith('http://localhost/charts/demo?view=overview');
    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
  });
});
