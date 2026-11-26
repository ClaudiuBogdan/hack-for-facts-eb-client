import { createFileRoute } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'
import { legalFinderSearchSchema } from '@/schemas/legal-search'

/**
 * The act finder — the `Caută` tab. The query and the filters live in the URL,
 * so a search is a shareable link. The page description says what the page
 * offers (owner, 26 November 2026): acts by number, by name and by words in
 * their text. Which of these an answer actually searched depends on the engine
 * that gave it, and each answer says so itself.
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
        content: t`Găsește un act normativ după număr (Legea 98/2016), după nume (Codul civil) sau după cuvinte din textul lui, cu statutul lui actual.`,
      },
    ],
  }),
})
