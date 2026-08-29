import { useQuery } from '@tanstack/react-query'
import { fetchLegalOutline } from '../api/legal-outline-api'

export function legalOutlineQueryKey(documentId: string) {
  return ['legal', 'outline', documentId] as const
}

/**
 * The document outline (TOC entries + `?nod=` resolution substrate). Outlines
 * are generation-scoped and generations are immutable, so the long staleTime
 * mirrors `useLegalRender`. `retry: false` for the same reason there: the
 * reader renders its own honest degradation (single column, muted retry
 * line) instead of hammering a failing query — and an outline failure must
 * never block the text itself.
 */
export function useLegalOutline(documentId: string | null) {
  return useQuery({
    queryKey: legalOutlineQueryKey(documentId ?? ''),
    queryFn: ({ signal }) => {
      if (documentId === null) throw new Error('unreachable: query disabled')
      return fetchLegalOutline(documentId, signal)
    },
    enabled: documentId !== null,
    staleTime: 30 * 60 * 1000,
    retry: false,
  })
}
