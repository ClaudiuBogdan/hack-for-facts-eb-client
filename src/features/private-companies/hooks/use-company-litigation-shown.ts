import { LITIGATION_PAGE_SIZE } from '@/features/justice/components/litigation-slice-section'
import { getJusticeQueryOutcome, useCompanyLitigation } from '@/features/justice/hooks/use-justice-data'

/**
 * Whether the company profile has a litigation band: only when the justice
 * read answers — with cases or with none — and never while it is unavailable,
 * which is every company until the live litigation API is connected. A band
 * that could only say „unavailable" would stand on every profile.
 *
 * Read on the first page, the page the band opens on: whether a company has
 * litigation does not depend on the page of it being read, and a page change
 * must not take the band away while the next page loads.
 */
export function useCompanyLitigationShown(cui: string): boolean {
  const query = useCompanyLitigation({ cui, page: 1, pageSize: LITIGATION_PAGE_SIZE })
  const outcome = getJusticeQueryOutcome(query.data)
  return outcome !== undefined && outcome.kind !== 'unavailable'
}
