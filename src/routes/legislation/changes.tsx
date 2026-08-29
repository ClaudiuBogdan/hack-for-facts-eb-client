import { createFileRoute } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'
import { createPublicPageCacheHeaders } from '@/lib/http-cache'
import { legalChangesSearchSchema } from '@/schemas/legal'

/**
 * The global change feed — the `Modificări` tab. The cohort view, a custom
 * date window, the event kind and the pipeline source all live in the URL, so
 * a filtered feed is a shareable link; paging stays cursor-only and in
 * memory, never a URL page number (84k+ events, keyset cursors bound to the
 * filter).
 */
export const Route = createFileRoute('/legislation/changes')({
  validateSearch: legalChangesSearchSchema,
  headers: () =>
    createPublicPageCacheHeaders({
      sharedMaxAgeSeconds: 600,
      staleWhileRevalidateSeconds: 3600,
    }),
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
