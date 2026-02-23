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

import { graphqlRequest } from './graphql';
import { getAuthToken } from '../auth';
import { API_FETCH_REFERRER_POLICY } from './fetch-options';

describe('graphql api', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', fetchMock);
  });

  it('uses origin referrer policy for graphql requests', async () => {
    vi.mocked(getAuthToken).mockResolvedValue('test-token');
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      text: vi.fn().mockResolvedValue(JSON.stringify({ data: { ok: true } })),
    } satisfies Partial<Response>);

    await graphqlRequest<{ ok: boolean }>('query TestQuery { ok }');

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.example.com/graphql',
      expect.objectContaining({
        method: 'POST',
        referrerPolicy: API_FETCH_REFERRER_POLICY,
      })
    );
  });
});
