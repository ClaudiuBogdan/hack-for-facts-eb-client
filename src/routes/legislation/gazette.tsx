import { createFileRoute } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'
import { gazetteBrowseSearchSchema } from '@/schemas/legal-search'

/**
 * The gazette directory — the `Monitorul Oficial` tab. Filters and the page
 * number live in the URL (year/part/page, all optional — the component
 * supplies the newest corpus year when absent, because the server refuses a
 * year-less browse), so a filtered page is a shareable link.
 */
export const Route = createFileRoute('/legislation/gazette')({
  validateSearch: gazetteBrowseSearchSchema,
  // Never stored by a shared cache, on every path (root, 25 November 2026; CACHE-001): the page renders in the
  // reader's language from their cookie, and the CDN does not key on `Vary: Cookie`.
  headers: () => ({ 'Cache-Control': 'private, no-store', 'CDN-Cache-Control': 'no-store' }),
  head: () => ({
    meta: [
      { title: `${t`Monitorul Oficial`} — Transparenta.eu` },
      {
        name: 'description',
        content: t`Edițiile Monitorului Oficial din decembrie 1989 încoace: numărul, data, partea și PDF-ul oficial, cu cuprinsul fiecărei ediții acolo unde arhiva îl are.`,
      },
    ],
  }),
})
