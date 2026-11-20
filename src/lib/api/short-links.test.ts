import { beforeEach, describe, expect, it, vi } from 'vitest';

const log = vi.hoisted(() => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }));
vi.mock('@/lib/logger', () => ({
  createLogger: vi.fn(() => log),
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

  it('logs and throws neither the code nor the shared URL, on any path (LOG-001)', async () => {
    vi.mocked(getAuthToken).mockResolvedValue('token');
    const json = (body: unknown, status: number, statusText: string) => new Response(JSON.stringify(body), { status, statusText });

    fetchMock.mockResolvedValueOnce(json({ ok: false, error: 'Secret123', message: "Short link with code 'Secret123' not found" }, 404, 'Secret123'));
    await expect(resolveShortLinkCode('Secret123')).rejects.toThrow(/^Resolve short link failed: 404$/u);

    fetchMock.mockResolvedValueOnce(json({ ok: false, error: 'insert of https://transparenta.eu/alerts/new?preset=private failed' }, 500, 'Internal Server Error'));
    await expect(createShortLink('https://transparenta.eu/alerts/new?preset=private')).rejects.toThrow(/^Create short link failed: 500$/u);

    fetchMock.mockResolvedValueOnce(new Response('<html>Secret123</html>', { status: 502, statusText: 'Bad Gateway' }));
    await expect(resolveShortLinkCode('Secret123')).rejects.toThrow(/^Resolve short link failed: 502$/u);

    // A 2xx body that says it failed, and an unreadable one.
    fetchMock.mockResolvedValueOnce(json({ ok: false, error: 'Secret123' }, 200, 'OK'));
    await expect(resolveShortLinkCode('Secret123')).rejects.toThrow(/^Resolve short link failed: 200$/u);
    fetchMock.mockResolvedValueOnce(new Response('Secret123 not json', { status: 200 }));
    await expect(resolveShortLinkCode('Secret123')).rejects.toThrow(/^Resolve short link failed$/u);

    // A 2xx answer without a code or URL.
    fetchMock.mockResolvedValueOnce(json({ ok: true, data: {} }, 200, 'OK'));
    await expect(createShortLink('https://transparenta.eu/alerts/new?preset=private')).rejects.toThrow(/^Create short link failed: 200$/u);
    fetchMock.mockResolvedValueOnce(json({ ok: true, data: { url: '' } }, 200, 'OK'));
    await expect(resolveShortLinkCode('Secret123')).rejects.toThrow(/^Resolve short link failed: 200$/u);

    // What fetch itself throws.
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch https://api.example/api/v1/short-links/Secret123'));
    await expect(resolveShortLinkCode('Secret123')).rejects.toThrow(/^Resolve short link failed$/u);
    fetchMock.mockRejectedValueOnce(new TypeError('body https://transparenta.eu/alerts/new?preset=private'));
    await expect(createShortLink('https://transparenta.eu/alerts/new?preset=private')).rejects.toThrow(/^Create short link failed$/u);

    vi.mocked(getAuthToken).mockResolvedValueOnce(null as never);
    await expect(createShortLink('https://transparenta.eu/alerts/new?preset=private')).rejects.toThrow(/^Create short link failed: not authenticated$/u);

    const logged = JSON.stringify([...log.info.mock.calls, ...log.error.mock.calls.map(([message, extra]) => [message, String((extra as { error?: unknown })?.error)])]);
    expect(log.error).toHaveBeenCalledTimes(10);
    expect(logged).not.toContain('Secret123');
    expect(logged).not.toContain('preset=private');
  });
});
