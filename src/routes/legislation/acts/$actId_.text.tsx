import { createFileRoute } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'
import { fetchLegalActDetail } from '@/features/legal/api/legal-act-api'
import { createPublicPageCacheHeaders } from '@/lib/http-cache'
import { legalReaderSearchSchema } from '@/schemas/legal'
import type { LegalActDetail } from '@/schemas/legal'

export type LegalReaderRouteLoaderData = {
  readonly act: LegalActDetail | null
}

/**
 * The act READER — un-nested from `$actId` (trailing `_`) because the act
 * page is a route of its own with no Outlet; the reader is a sibling
 * full-page surface, not a tab of the card.
 *
 * The loader resolves only the ACT (identity, citation, canonical document
 * id) — the text body arrives over the cacheable render REST route on the
 * client, where the browser HTTP cache and the chunked-document protocol
 * live. `?doc=` selects a non-canonical expression; `?nod=` is a
 * document_nodes PATH deep link (validated here, resolved once the outline
 * surface is wired).
 */
export const Route = createFileRoute('/legislation/acts/$actId_/text')({
  validateSearch: legalReaderSearchSchema,
  loader: async ({ params, abortController }) => {
    const act = await fetchLegalActDetail(params.actId, abortController.signal)
    return { act } satisfies LegalReaderRouteLoaderData
  },
  headers: () =>
    createPublicPageCacheHeaders({
      sharedMaxAgeSeconds: 600,
      staleWhileRevalidateSeconds: 3600,
    }),
  head: ({ loaderData }) => {
    const act = (loaderData as LegalReaderRouteLoaderData | undefined)?.act ?? null
    return {
      meta: [
        {
          title:
            act === null
              ? `${t`Text de lege`} — Transparenta.eu`
              : `${act.displayCitation} — ${t`textul actului`} — Transparenta.eu`,
        },
      ],
    }
  },
})
