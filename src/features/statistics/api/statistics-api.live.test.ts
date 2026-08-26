import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/auth', () => ({
  getAuthToken: vi.fn().mockResolvedValue(null),
}))

vi.mock('@/config/env', () => ({
  env: { VITE_API_URL: 'http://api.test' },
  getApiBaseUrl: () => 'http://api.test',
  getSiteUrl: () => 'http://localhost:3000',
}))

import { submitDatasetRequestLive } from './statistics-api.live'

const jsonResponse = (status: number, body: unknown): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })

describe('submitDatasetRequestLive (REST envelope)', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock)
    fetchMock.mockReset()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('accepts only a 2xx body that says ok:true', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(201, { ok: true, data: { id: '1', datasetCode: 'POP107D' } }),
    )
    const result = await submitDatasetRequestLive({ datasetCode: 'POP107D' })
    expect(result.accepted).toBe(true)
  })

  it('treats a 2xx body carrying ok:false as REJECTED', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(201, { ok: false, error: 'ValidationError' }),
    )
    const result = await submitDatasetRequestLive({ datasetCode: 'POP107D' })
    expect(result.accepted).toBe(false)
  })

  it('maps a 400 ValidationError to the dataset-check message', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(400, {
        ok: false,
        error: 'ValidationError',
        message: 'Unknown INS dataset code: NOPE',
      }),
    )
    const result = await submitDatasetRequestLive({ datasetCode: 'NOPE' })
    expect(result.accepted).toBe(false)
    expect(result.message).toMatch(/Verifică setul de date/)
  })

  it('maps a 429 to the rate-limit message', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(429, {
        statusCode: 429,
        ok: false,
        error: 'RateLimitExceededError',
        message: 'Too many requests',
      }),
    )
    const result = await submitDatasetRequestLive({ datasetCode: 'POP107D' })
    expect(result.accepted).toBe(false)
    expect(result.message).toMatch(/Prea multe cereri/)
  })

  it('treats an unreadable 2xx body as a rejection, never a success', async () => {
    fetchMock.mockResolvedValue(
      new Response('<html>proxy error</html>', { status: 200 }),
    )
    const result = await submitDatasetRequestLive({ datasetCode: 'POP107D' })
    expect(result.accepted).toBe(false)
  })
})
