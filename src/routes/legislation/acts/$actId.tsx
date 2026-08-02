import { createFileRoute } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'
import { fetchLegalActDetail } from '@/features/legal/api/legal-act-api'
import { createPublicPageCacheHeaders } from '@/lib/http-cache'
import type { LegalActDetail } from '@/schemas/legal'

export type LegalActRouteLoaderData = {
  readonly act: LegalActDetail | null
}

export const Route = createFileRoute('/legislation/acts/$actId')({
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
