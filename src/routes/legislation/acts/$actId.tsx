import { createFileRoute } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'
import { fetchLegalActDetail } from '@/features/legal/api/legal-act-api'
import { createPublicPageCacheHeaders } from '@/lib/http-cache'
import { legalReaderSearchSchema } from '@/schemas/legal'
import type { LegalActDetail } from '@/schemas/legal'

export type LegalActRouteLoaderData = {
  readonly act: LegalActDetail | null
}

/**
 * The whole act lives here — fișa AND text on one page (user decision
 * 2026-08-10). `?doc=` reads a non-canonical expression; `?nod=` is a
 * document_nodes PATH deep link into the text. The old `/text` sibling
 * redirects here with its search intact.
 */
export const Route = createFileRoute('/legislation/acts/$actId')({
  validateSearch: legalReaderSearchSchema,
  loader: async ({ params, abortController }) => {
    const act = await fetchLegalActDetail(params.actId, abortController.signal)
    return { act } satisfies LegalActRouteLoaderData
  },
  headers: () =>
    createPublicPageCacheHeaders({
      sharedMaxAgeSeconds: 600,
      staleWhileRevalidateSeconds: 3600,
    }),
  head: ({ loaderData }) => {
    const act = (loaderData as LegalActRouteLoaderData | undefined)?.act ?? null
    if (act === null) {
      return {
        meta: [{ title: `${t`Act normativ`} — Transparenta.eu` }],
      }
    }

    // The plain-language summary is the only description worth serving, but it
    // runs to 800 characters — trimmed to a meta-friendly length rather than
    // substituting boilerplate.
    const description =
      act.summary?.plainLanguageSummary?.slice(0, 180) ??
      t`Statut, date cheie și dovada publicării în Monitorul Oficial.`

    return {
      meta: [
        { title: `${act.displayCitation} — Transparenta.eu` },
        { name: 'description', content: description },
      ],
    }
  },
})
