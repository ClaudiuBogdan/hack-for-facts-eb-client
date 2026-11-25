import { createFileRoute } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'

/**
 * The reading guide — the `Ghid` tab (main-page.md §3: editorial, no server
 * surface). No loader and no search schema: the page is measured-constant
 * prose from `legal-coverage.ts`, deliberately without a loading or failure
 * state, and it routes the reader into the finder, the directories and the
 * change feed.
 */
export const Route = createFileRoute('/legislation/guide')({
  // Never stored by a shared cache, on every path (root, 25 November 2026; CACHE-001): the page renders in the
  // reader's language from their cookie, and the CDN does not key on `Vary: Cookie`.
  headers: () => ({ 'Cache-Control': 'private, no-store', 'CDN-Cache-Control': 'no-store' }),
  head: () => ({
    meta: [
      { title: `${t`Ghidul legislației`} — Transparenta.eu` },
      {
        name: 'description',
        content: t`Cum folosești corect datele legislative: cum găsești o lege, cum citești statutul ei, ce nu îți pot spune aceste date — deciziile Curții Constituționale nu schimbă statutul actelor — și unde găsești forma oficială.`,
      },
    ],
  }),
})
