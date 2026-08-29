import { createFileRoute } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'
import { createPublicPageCacheHeaders } from '@/lib/http-cache'

/**
 * The reading guide — the `Ghid` tab (main-page.md §3: editorial, no server
 * surface). No loader and no search schema: the page is measured-constant
 * prose from `legal-coverage.ts`, deliberately without a loading or failure
 * state, and it routes the reader into the finder, the directories and the
 * change feed.
 */
export const Route = createFileRoute('/legislation/guide')({
  headers: () =>
    createPublicPageCacheHeaders({
      sharedMaxAgeSeconds: 600,
      staleWhileRevalidateSeconds: 3600,
    }),
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
