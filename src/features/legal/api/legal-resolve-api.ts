import type { LegalResolveHit } from '@/schemas/legal'
import { isLegalMockEnabled } from '../lib/mock-mode'
import { resolveLegalActsLive } from './legal-resolve-api.live'

/**
 * The fixture is served only by the development server and the tests: in production the condition is the
 * constant `false` and the fixture's module is never emitted (the same guard as the search adapter's).
 */
const FIXTURE_BUILD = import.meta.env.DEV || import.meta.env.MODE === 'test'

/** Mock/live dispatcher for the citation/alias lookup. */
export async function resolveLegalActs(
  q: string,
  options: { readonly limit?: number; readonly signal?: AbortSignal } = {},
): Promise<LegalResolveHit[]> {
  if (FIXTURE_BUILD && isLegalMockEnabled()) return (await import('./legal-resolve-api.mock')).resolveLegalActsMock(q)
  return resolveLegalActsLive(q, options.limit ?? 8, options.signal)
}
