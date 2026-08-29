/**
 * RUNTIME proof that a user's search query never reaches the logger.
 *
 * The sibling `search-telemetry-privacy.test.ts` reads the source and forbids
 * known leak shapes. That catches a straight reintroduction, but it is a text
 * matcher: `logger.info(query)`, `{ ...variables }`, or `{ raw: query.trim() }`
 * would all sail past it (codex review 2026-08-26).
 *
 * This drives the real call sites with a unique SENTINEL and asserts the
 * sentinel appears nowhere in ANY argument handed to the logger — a property of
 * behaviour rather than of spelling, so it holds however the leak is written.
 * Both the success and failure paths are exercised, because `logger.info`
 * becomes a Sentry breadcrumb and `logger.error` a full Sentry event.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

/** Distinctive enough that an accidental substring match is not plausible. */
const SENTINEL = 'zzq-secret-search-term-7f3a91'

const logged: unknown[] = []

vi.mock('../logger', () => ({
  createLogger: () => ({
    info: (...args: unknown[]) => logged.push(...args),
    warn: (...args: unknown[]) => logged.push(...args),
    error: (...args: unknown[]) => logged.push(...args),
    debug: (...args: unknown[]) => logged.push(...args),
  }),
}))

vi.mock('./auth-token', () => ({ getAuthToken: async () => null }))

const { searchEntities } = await import('./entities')

/** Everything the logger was handed, flattened to one searchable string. */
const loggedText = (): string =>
  logged
    .map((arg) => {
      try {
        return typeof arg === 'string' ? arg : JSON.stringify(arg)
      } catch {
        // A circular payload still must not hide a leak from this assertion.
        return String(arg)
      }
    })
    .join('\n')

beforeEach(() => {
  logged.length = 0
})

describe('the raw search term never reaches the logger at runtime', () => {
  it('does not log it on the SUCCESS path', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(JSON.stringify({ data: { entities: { nodes: [] } } }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      ),
    )

    await searchEntities(SENTINEL, 5).catch(() => undefined)

    // The call sites must have logged SOMETHING, or this proves nothing.
    expect(logged.length).toBeGreaterThan(0)
    expect(loggedText()).not.toContain(SENTINEL)
  })

  it('does not log it on the FAILURE path (which ships a full Sentry event)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('network down')
      }),
    )

    await searchEntities(SENTINEL, 5).catch(() => undefined)

    expect(logged.length).toBeGreaterThan(0)
    expect(loggedText()).not.toContain(SENTINEL)
  })

  it('still logs the query LENGTH, so the diagnostic was not simply deleted', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(JSON.stringify({ data: { entities: { nodes: [] } } }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      ),
    )

    await searchEntities(SENTINEL, 5).catch(() => undefined)

    expect(loggedText()).toContain(String(SENTINEL.length))
  })
})
