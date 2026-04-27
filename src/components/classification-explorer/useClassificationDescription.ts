import { useQuery } from '@tanstack/react-query'
import type { ClassificationType } from '@/types/classification-explorer'
import { getUserLocale } from '@/lib/utils'
import { loadClassificationDescription } from '@/lib/description-loader'

export function useClassificationDescription(type: ClassificationType, code: string) {
  const locale = getUserLocale()
  return useQuery({
    queryKey: ['classification-description', locale, type, code],
    queryFn: () => loadClassificationDescription(locale, type, code),
    staleTime: 1000 * 60 * 60,
    gcTime: 1000 * 60 * 60 * 24,
  })
}
