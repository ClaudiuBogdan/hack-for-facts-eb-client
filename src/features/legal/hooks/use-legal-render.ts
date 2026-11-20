import { useQuery } from '@tanstack/react-query'
import { fetchLegalRender } from '../api/legal-render-api'

export function legalRenderQueryKey(documentId: string, chunkIndex?: number) {
  return ['legal', 'render', documentId, chunkIndex ?? 0] as const
}

/**
 * The base render read: the complete envelope (single-chunk document) or the
 * physical manifest (chunked one). The long staleTime is the ONLY cache the
 * reader relies on: the legacy route adds an ETag the browser may revalidate
 * against, but a legal_v2 render is `no-store` with no ETag or 304, so every
 * refetch is a full read — and a chunk fetched across a change is caught by
 * the chunked reader's generation pin, not by HTTP caching.
 *
 * `retry: false` — failures arrive PRE-CLASSIFIED (`LegalRenderFailureError`)
 * and three of the five kinds are terminal facts; blind retries would just
 * hammer a 403/404/409 three times. The reader offers its own retry action
 * exactly where `failure.retryable` says one is meaningful.
 */
export function useLegalRender(documentId: string | null) {
  return useQuery({
    queryKey: legalRenderQueryKey(documentId ?? ''),
    queryFn: ({ signal }) => {
      if (documentId === null) throw new Error('unreachable: query disabled')
      return fetchLegalRender(documentId, { signal })
    },
    enabled: documentId !== null,
    staleTime: 30 * 60 * 1000,
    retry: false,
  })
}
