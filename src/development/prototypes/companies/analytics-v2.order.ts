import { COMPANY_ANALYSIS_SIZE_BANDS, type CompanyAnalysisBucket, type CompanyAnalysisDimension } from '@/schemas/company-analytics'

/** A size band's place, as the API lists the bands: the two a statement could not place, then smallest to largest. */
function sizeRank(key: string | null): number {
  return (COMPANY_ANALYSIS_SIZE_BANDS as readonly (string | null)[]).indexOf(key)
}

/** An axis's groups in reading order: sizes smallest to largest, whatever they weigh; every other axis as the API ranked it. */
export function orderedGroups(dimension: CompanyAnalysisDimension, groups: readonly CompanyAnalysisBucket[]): readonly CompanyAnalysisBucket[] {
  return dimension === 'EMPLOYEE_SIZE' ? [...groups].sort((a, b) => sizeRank(a.key) - sizeRank(b.key)) : groups
}
