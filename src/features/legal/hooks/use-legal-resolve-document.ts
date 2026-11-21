import { useQuery } from '@tanstack/react-query'
import { resolveLegalDocument } from '../api/legal-resolve-document-api'

/**
 * Resolve an old Portal page id to this act's form (legal_v2), or null.
 * Disabled without a page id. No retry: a failure is answered by reading the
 * act's default version with the "not this act's document" notice.
 */
export function useLegalResolveDocument(actId: string, documentId: string | null) {
  return useQuery({
    queryKey: ['legal', 'resolve-document', actId, documentId ?? ''] as const,
    queryFn: ({ signal }) => {
      if (documentId === null) throw new Error('unreachable: query disabled')
      return resolveLegalDocument(actId, documentId, signal)
    },
    enabled: documentId !== null,
    staleTime: 30 * 60 * 1000,
    retry: false,
  })
}
