/**
 * The render transport slice, three claims:
 *
 *  1. The Zod contract ACCEPTS the committed real artifacts end-to-end — both
 *     the single-chunk envelope and the manifest + chunk groups — via the mock
 *     lane, which passes through the same schema as the live lane.
 *  2. The live lane classifies every non-2xx into a distinct failure fact
 *     (not_found / restricted / unavailable / inconsistent / transport), and a
 *     network error is TRANSPORT — never "this act has no text".
 *  3. A 200 whose body does not match the contract (mislabeled kind, malformed
 *     block) is rejected, not rendered.
 */

import { afterEach, describe, expect, it, vi } from 'vitest'

import { classifyRenderFailure, LegalRenderFailureError } from '../lib/legal-render-error'
import { fetchLegalRenderLive, renderUrl } from './legal-render-api.live'
import { fetchLegalRenderMock } from './legal-render-api.mock'

vi.mock('@/config/env', () => ({
  env: { VITE_APP_ENVIRONMENT: 'test' },
  getApiBaseUrl: () => 'https://api.example.com',
}))

afterEach(() => {
  vi.unstubAllGlobals()
})

const failureOf = async (promise: Promise<unknown>) => {
  try {
    await promise
  } catch (error) {
    if (error instanceof LegalRenderFailureError) return error.failure
    throw error
  }
  throw new Error('expected the call to fail')
}

describe('mock lane serves the committed real artifacts through the live contract', () => {
  it('serves the single-chunk act as a complete envelope', async () => {
    const data = await fetchLegalRenderMock('100023')
    expect(data.kind).toBe('envelope')
    expect(data.chunkCount).toBe(1)
    if (data.kind !== 'envelope') return
    expect(data.tldf.document_id).toBe('100023')
    expect(data.tldf.blocks.length).toBeGreaterThan(0)
    expect(data.tldf.marks.length).toBeGreaterThan(0)
  })

  it('serves the chunked act as manifest first, then chunk groups by index', async () => {
    const manifest = await fetchLegalRenderMock('100019')
    expect(manifest.kind).toBe('manifest')
    expect(manifest.chunkCount).toBe(3)
    if (manifest.kind !== 'manifest') return
    expect(manifest.tldf.chunks).toHaveLength(2)

    const group = await fetchLegalRenderMock('100019', { chunkIndex: 1 })
    expect(group.kind).toBe('chunk')
    if (group.kind !== 'chunk') return
    expect(group.tldf.blocks.length).toBe(manifest.tldf.chunks[0]?.block_count)
  })

  it('answers UNAVAILABLE for a document it holds no fixture for — never an invented text', async () => {
    const failure = await failureOf(fetchLegalRenderMock('999999'))
    expect(failure.kind).toBe('unavailable')
    expect(failure.renderStatus).toBe('content_unavailable')
    expect(failure.retryable).toBe(false)
  })
})

describe('live lane failure classification', () => {
  const stubFetch = (status: number, body: unknown) => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(JSON.stringify(body), {
          status,
          headers: { 'content-type': 'application/json' },
        }),
      ),
    )
  }

  it('encodes the document id into the URL as one path segment', () => {
    expect(renderUrl('100023')).toBe(
      'https://api.example.com/api/v1/legal/documents/100023/render',
    )
    expect(renderUrl('a/b', 2)).toBe(
      'https://api.example.com/api/v1/legal/documents/a%2Fb/render/chunks/2',
    )
  })

  it('404 NOT_FOUND → not_found, terminal', async () => {
    stubFetch(404, { ok: false, error: 'NOT_FOUND', message: 'no served render' })
    const failure = await failureOf(fetchLegalRenderLive('42'))
    expect(failure).toMatchObject({ kind: 'not_found', retryable: false, status: 404 })
  })

  it('403 RENDER_RESTRICTED → restricted, terminal', async () => {
    stubFetch(403, { ok: false, error: 'RENDER_RESTRICTED', message: 'restricted' })
    const failure = await failureOf(fetchLegalRenderLive('42'))
    expect(failure).toMatchObject({ kind: 'restricted', retryable: false })
  })

  it('409 RENDER_UNAVAILABLE carries the render status through', async () => {
    stubFetch(409, {
      ok: false,
      error: 'RENDER_UNAVAILABLE',
      message: 'no servable text',
      renderStatus: 'superseded_pending',
    })
    const failure = await failureOf(fetchLegalRenderLive('42'))
    expect(failure).toMatchObject({
      kind: 'unavailable',
      renderStatus: 'superseded_pending',
      retryable: false,
    })
  })

  it('409 RENDER_INCONSISTENT → inconsistent, retryable (a lane repair, not a fact about the act)', async () => {
    stubFetch(409, { ok: false, error: 'RENDER_INCONSISTENT', message: 'refused partial' })
    const failure = await failureOf(fetchLegalRenderLive('42'))
    expect(failure).toMatchObject({ kind: 'inconsistent', retryable: true })
  })

  it('a 5xx or unknown code is TRANSPORT — the existence question stays open', async () => {
    stubFetch(502, { ok: false, error: 'Upstream', message: 'bad gateway' })
    const failure = await failureOf(fetchLegalRenderLive('42'))
    expect(failure).toMatchObject({ kind: 'transport', retryable: true })
  })

  it('a network error is TRANSPORT, never absence', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('socket hang up')
      }),
    )
    const failure = await failureOf(fetchLegalRenderLive('42'))
    expect(failure).toMatchObject({ kind: 'transport', retryable: true })
  })

  it('rejects a 200 whose payload does not match the TLDF contract', async () => {
    stubFetch(200, {
      ok: true,
      data: {
        documentId: '42',
        kind: 'envelope',
        chunkIndex: 0,
        chunkCount: 1,
        tldf: { format: 'tldf', format_version: '1.0' }, // truncated head
      },
      meta: {
        requestId: 'r',
        runId: '1',
        textSha256: 'x',
        compilerVersion: 'v3',
        compiledAt: 'now',
      },
    })
    const failure = await failureOf(fetchLegalRenderLive('42'))
    expect(failure.kind).toBe('transport')
    expect(failure.message).toContain('TLDF contract')
  })
})

describe('classifyRenderFailure edge shapes', () => {
  it('an unparseable error body still classifies by transport, with a synthesized message', () => {
    const failure = classifyRenderFailure(500, 'nginx html page', '42')
    expect(failure.kind).toBe('transport')
    expect(failure.message).toContain('500')
  })

  it('a status/code mismatch (403 without its code) stays transport, not restricted', () => {
    const failure = classifyRenderFailure(403, { ok: false, error: 'WEIRD', message: 'm' }, '42')
    expect(failure.kind).toBe('transport')
  })
})
