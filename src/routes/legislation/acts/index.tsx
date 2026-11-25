import { createFileRoute } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'
import { legalActsBrowseSearchSchema } from '@/schemas/legal-search'

/**
 * The acts directory — the `Acte` tab. Filters live in the URL
 * (actType/year/status, all optional) so a filtered view is a shareable
 * link; paging stays cursor-only and in memory, never a URL page number.
 */
export const Route = createFileRoute('/legislation/acts/')({
  validateSearch: legalActsBrowseSearchSchema,
  // Never stored by a shared cache, on every path (root, 25 November 2026; CACHE-001): the page renders in the
  // reader's language from their cookie, and the CDN does not key on `Vary: Cookie`.
  headers: () => ({ 'Cache-Control': 'private, no-store', 'CDN-Cache-Control': 'no-store' }),
  head: () => ({
    meta: [
      { title: `${t`Directorul actelor`} — Transparenta.eu` },
      {
        name: 'description',
        content: t`Toate actele din Portal Legislativ: filtrează după tip, an și statut, ordonate după cât de citate sunt.`,
      },
    ],
  }),
})
