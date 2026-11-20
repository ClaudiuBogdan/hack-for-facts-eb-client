import { useQuery } from '@tanstack/react-query'
import { fetchLegalRender } from '../api/legal-render-api'

export function legalRenderQueryKey(documentId: string, chunkIndex?: number) {
  return ['legal', 'render', documentId, chunkIndex ?? 0] as const
}

/** A legal_v2 form id (`f<form_id>`); the legacy source's ids are numeric. */
export const isLegalV2DocumentId = (documentId: string): boolean => /^f\d+$/.test(documentId)

/**
 * How long a served render counts as fresh in the query cache, per source:
 *
 *  - legacy: a generation is immutable (recompiles mint a new one), so 30
 *    minutes is safe;
 *  - legal_v2: 0. The server answers `no-store` because link targets,
 *    custody and privacy can change under one composition, and a withdrawn
 *    text must not come back from the cache when the page is reopened — every
 *    mount revalidates. Measured nothing; it follows the server's contract.
 */
export const LEGACY_RENDER_STALE_MS = 30 * 60 * 1000
export const V2_RENDER_STALE_MS = 0

/**
 * The base render read: the complete envelope (single-chunk document) or the
 * physical manifest (chunked one). The query cache is the ONLY cache the
 * reader relies on: the legacy route adds an ETag the browser may revalidate
 * against, but a legal_v2 render is `no-store` with no ETag or 304, so every
 * refetch is a full read — and a chunk fetched across a change is caught by
 * the chunked reader's generation pin, not by HTTP caching.
 *
 * `legalV2` (the act's `dataSource === 'legal_v2'`, or an `f…` id) makes the
 * read revalidate on every mount (`V2_RENDER_STALE_MS`); legacy reads keep
 * their 30-minute freshness.
 *
 * `retry: false` — failures arrive PRE-CLASSIFIED (`LegalRenderFailureError`)
 * and three of the five kinds are terminal facts; blind retries would just
 * hammer a 403/404/409 three times. The reader offers its own retry action
 * exactly where `failure.retryable` says one is meaningful.
 */
export function useLegalRender(
  documentId: string | null,
  options: { readonly legalV2?: boolean } = {},
) {
  const legalV2 =
    options.legalV2 === true || (documentId !== null && isLegalV2DocumentId(documentId))
  return useQuery({
    queryKey: legalRenderQueryKey(documentId ?? ''),
    queryFn: ({ signal }) => {
      if (documentId === null) throw new Error('unreachable: query disabled')
      return fetchLegalRender(documentId, { signal })
    },
    enabled: documentId !== null,
    staleTime: legalV2 ? V2_RENDER_STALE_MS : LEGACY_RENDER_STALE_MS,
    ...(legalV2 && { refetchOnMount: 'always' as const }),
    retry: false,
  })
}
