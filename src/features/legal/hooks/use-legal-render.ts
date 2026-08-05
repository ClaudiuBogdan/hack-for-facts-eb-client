import { useQuery } from '@tanstack/react-query'
import { fetchLegalRender } from '../api/legal-render-api'

export function legalRenderQueryKey(documentId: string, chunkIndex?: number) {
  return ['legal', 'render', documentId, chunkIndex ?? 0] as const
}

/**
 * The base render read: the complete envelope (single-chunk document) or the
 * physical manifest (chunked one). A generation is immutable — recompiles
 * mint a new one — so a long staleTime is correct; the browser HTTP cache
 * handles revalidation underneath via the route's ETag.
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
