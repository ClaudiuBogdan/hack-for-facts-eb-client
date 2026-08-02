import { isMockDataEnabled } from '@/lib/scraper-references/mock-mode'

export const LEGAL_DATASET_ID = 'legal-acts'

/**
 * The `/legislation` surfaces render from typed mocks by default.
 *
 * The two lanes are at different stages, and this flag governs both:
 *
 *  - **act detail** (`legal-act-api.live.ts`) is a real adapter, built and
 *    verified against the production `legalAct` query;
 *  - **the overview** (`legal-api.live.ts`) is still a stub that fails loudly —
 *    its four calls are specified but unwritten (`main-page.md` §5).
 *
 * So the default stays mock until the overview lands, rather than shipping a
 * module whose front door throws while its detail pages work. Set
 * `VITE_LEGAL_USE_LIVE_API=true` (with `VITE_API_URL` pointed at a redesign API)
 * to take both lanes live.
 *
 * Every surface that renders under this flag must say so — the act page carries
 * a `DataStatusBadge` and a provenance note, because its fixtures are real acts
 * copied from production and are indistinguishable from served data otherwise.
 */
export function isLegalMockEnabled(): boolean {
  if (import.meta.env.VITE_LEGAL_USE_LIVE_API === 'true') {
    return false
  }

  if (isMockDataEnabled(LEGAL_DATASET_ID)) {
    return true
  }

  // The overview's live lane is still a stub, so the domain stays mock-first
  // unless explicitly opted in above.
  return true
}
