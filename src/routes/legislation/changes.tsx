import { createFileRoute } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'
import { legalChangesSearchSchema } from '@/schemas/legal-search'

/**
 * The global change feed — the `Modificări` tab. The cohort view, a custom
 * date window, the event kind and the pipeline source all live in the URL, so
 * a filtered feed is a shareable link; paging stays cursor-only and in
 * memory, never a URL page number (84k+ events, keyset cursors bound to the
 * filter).
 */
export const Route = createFileRoute('/legislation/changes')({
  validateSearch: legalChangesSearchSchema,
  // Never stored by a shared cache, on every path (root, 25 November 2026; CACHE-001): the page renders in the
  // reader's language from their cookie, and the CDN does not key on `Vary: Cookie`.
  headers: () => ({ 'Cache-Control': 'private, no-store', 'CDN-Cache-Control': 'no-store' }),
  head: () => ({
    meta: [
      { title: `${t`Modificări legislative`} — Transparenta.eu` },
      {
        name: 'description',
        content: t`Fluxul modificărilor legislative: ce act s-a schimbat, prin ce act, felul schimbării și data intrării în vigoare — inclusiv modificările anunțate pentru viitor și cele fără dată înregistrată.`,
      },
    ],
  }),
})
