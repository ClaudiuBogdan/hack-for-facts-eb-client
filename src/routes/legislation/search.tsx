import { createFileRoute } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'
import { legalFinderSearchSchema } from '@/schemas/legal-search'

/**
 * The act finder — the `Caută` tab. The query and the historical widening
 * live in the URL, so a search is a shareable link. The page description is
 * deliberately honest about scope: this finds acts by number and by name;
 * full-text phrase search does not exist yet and the tab says so.
 */
export const Route = createFileRoute('/legislation/search')({
  validateSearch: legalFinderSearchSchema,
  // Never stored by a shared cache, on every path (root, 25 November 2026; CACHE-001): the page renders in the
  // reader's language from their cookie, and the CDN does not key on `Vary: Cookie`.
  headers: () => ({ 'Cache-Control': 'private, no-store', 'CDN-Cache-Control': 'no-store' }),
  head: () => ({
    meta: [
      { title: `${t`Caută în legislație`} — Transparenta.eu` },
      {
        name: 'description',
        content: t`Găsește un act normativ după număr (Legea 53/2003) sau după denumire (Codul muncii), cu statutul lui actual. Căutarea după expresii din textul legilor nu este încă disponibilă.`,
      },
    ],
  }),
})
