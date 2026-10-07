import { hasPublishedLitigation } from '@/features/justice/api/company-litigation-api'
import { useCompanyLitigation } from '@/features/justice/hooks/use-company-litigation'
import type { JudicialCompanyLitigation } from '@/schemas/judicial'

/**
 * The company's published litigation when the profile has a litigation band,
 * else null. The band stands only when published name-to-CUI links count at
 * least one case: with none, the judicial API cannot tell „no cases" from
 * „not linked yet" — every company today, as no link is published — and a
 * band that could only say so would stand on every profile. A failed or
 * pending read shows no band either.
 */
export function useCompanyLitigationShown(cui: string): JudicialCompanyLitigation | null {
  const query = useCompanyLitigation(cui)
  return hasPublishedLitigation(query.data) ? query.data : null
}
