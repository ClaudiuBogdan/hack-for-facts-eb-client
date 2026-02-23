import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/logger', () => ({
  createLogger: vi.fn(() => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  })),
}));

vi.mock('../auth', () => ({
  getAuthToken: vi.fn(),
}));

vi.mock('@/config/env', () => ({
  getApiBaseUrl: vi.fn(() => 'https://api.example.com'),
}));

import { getAuthToken } from '../auth';
import { API_FETCH_REFERRER_POLICY } from './fetch-options';
import { createShortLink, resolveShortLinkCode } from './shortLinks';

describe('short links api', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', fetchMock);
  });

  it('uses origin referrer policy when creating short links', async () => {
    vi.mocked(getAuthToken).mockResolvedValue('test-token');
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: vi.fn().mockResolvedValue({ ok: true, data: { code: 'abc123' } }),
    } satisfies Partial<Response>);

    const result = await createShortLink('https://transparenta.eu/charts/demo');

    expect(result).toBe('abc123');
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.example.com/api/v1/short-links',
      expect.objectContaining({
        method: 'POST',
        referrerPolicy: API_FETCH_REFERRER_POLICY,
      })
    );
  });

  it('uses origin referrer policy when resolving short link codes', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: vi.fn().mockResolvedValue({ ok: true, data: { url: 'https://transparenta.eu/charts/demo' } }),
    } satisfies Partial<Response>);

    const result = await resolveShortLinkCode('abc123');

    expect(result).toBe('https://transparenta.eu/charts/demo');
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.example.com/api/v1/short-links/abc123',
      expect.objectContaining({
        method: 'GET',
        referrerPolicy: API_FETCH_REFERRER_POLICY,
      })
    );
  });
});
