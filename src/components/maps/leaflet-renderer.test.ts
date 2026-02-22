import { afterEach, describe, expect, it, vi } from 'vitest';
import { shouldUseCanvasRenderer } from './leaflet-renderer';

type RendererNavigator = Pick<Navigator, 'userAgent' | 'platform' | 'maxTouchPoints'>;

const DEFAULT_NAVIGATOR: RendererNavigator = {
  userAgent: '',
  platform: '',
  maxTouchPoints: 0,
};

function stubNavigator(overrides: Partial<RendererNavigator>): void {
  const nextNavigator = { ...DEFAULT_NAVIGATOR, ...overrides } as Navigator;
  vi.stubGlobal('navigator', nextNavigator);
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('shouldUseCanvasRenderer', () => {
  it('returns false for Android Opera', () => {
    stubNavigator({
      userAgent: 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Mobile Safari/537.36 OPR/95.0.0.0',
    });

    expect(shouldUseCanvasRenderer()).toBe(false);
  });

  it('returns false for Android Chrome', () => {
    stubNavigator({
      userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Mobile Safari/537.36',
    });

    expect(shouldUseCanvasRenderer()).toBe(false);
  });

  it('returns false for iPhone', () => {
    stubNavigator({
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.3 Mobile/15E148 Safari/604.1',
    });

    expect(shouldUseCanvasRenderer()).toBe(false);
  });

  it('returns false for iPadOS desktop mode', () => {
    stubNavigator({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.3 Safari/605.1.15',
      platform: 'MacIntel',
      maxTouchPoints: 5,
    });

    expect(shouldUseCanvasRenderer()).toBe(false);
  });

  it('returns true for desktop Chrome', () => {
    stubNavigator({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_2_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36',
      platform: 'MacIntel',
      maxTouchPoints: 0,
    });

    expect(shouldUseCanvasRenderer()).toBe(true);
  });

  it('returns true when navigator is unavailable', () => {
    vi.stubGlobal('navigator', undefined);

    expect(shouldUseCanvasRenderer()).toBe(true);
  });
});
