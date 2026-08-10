import type { LegalResolveHit } from '@/schemas/legal'
import { isLegalMockEnabled } from '../lib/mock-mode'
import { resolveLegalActsLive } from './legal-resolve-api.live'
import { resolveLegalActsMock } from './legal-resolve-api.mock'

/** Mock/live dispatcher for the citation/alias lookup. */
export async function resolveLegalActs(
  q: string,
  options: { readonly limit?: number; readonly signal?: AbortSignal } = {},
): Promise<LegalResolveHit[]> {
  if (isLegalMockEnabled()) return resolveLegalActsMock(q)
  return resolveLegalActsLive(q, options.limit ?? 8, options.signal)
}
