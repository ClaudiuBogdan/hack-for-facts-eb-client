/**
 * Maps the redesign GraphQL company shapes onto the UI's `PrivateCompanyProfile`
 * (the REST-era contract the 5-tab profile already consumes). Keeping the UI
 * contract stable means the mapping lives here, not in the components.
 *
 * Notable reconciliations vs. the old REST shape:
 * - `matchConfidence` is uppercase SAFE/UNMATCHED in GraphQL (no manual-review).
 * - financial years use `year` + string Money/BigInt scalars → coerced to
 *   `fiscalYear` + numbers, with `currency: 'RON'`.
 * - `fiscal.anafFound` is derived (the GraphQL surface has no explicit flag):
 *   ANAF is "found" when its snapshot date or any ANAF-sourced field is present.
 * - `sources` are synthesized from `asOf.onrc` / `asOf.anaf` (no fabricated URLs).
 */
import type {
  PrivateCompanyCaenActivity,
  PrivateCompanyFinancialYear,
  PrivateCompanyMatchConfidence,
  PrivateCompanyProfile,
  PrivateCompanySource,
} from '@/schemas/private-company'
import type {
  CompanyHubStats,
  PrivateCompanySearchResultPage,
} from '@/schemas/private-company-search'
import type {
  CompanyHubStatsResponse,
  CompanyProfileResponse,
  RawCompany,
  RawCompanyFinancialYear,
  RawCompanyListItem,
} from './company-queries'

function toNumberOrNull(value: string | number | null | undefined): number | null {
  if (value == null) return null
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) ? n : null
}

function mapMatchConfidence(raw: string): PrivateCompanyMatchConfidence {
  switch (raw.toUpperCase()) {
    case 'SAFE':
      return 'safe'
    case 'UNMATCHED':
      return 'unmatched'
    default:
      // Future-proof: any other confidence routes through manual review.
      return 'manual-review'
  }
}

function mapCaenSource(raw: string): PrivateCompanyCaenActivity['source'] {
  return raw.toLowerCase() === 'anaf' ? 'anaf' : 'onrc'
}

function mapFinancialYear(year: RawCompanyFinancialYear): PrivateCompanyFinancialYear {
  // netProfit / netLoss are a mutually-exclusive pair: the server sends "0.00"
  // for the inactive side (a profitable year carries netLoss "0.00"). The UI
  // (table + chart + at-a-glance) treats the pair as exclusive and renders any
  // non-null value, so a literal 0 would surface a misleading "0 RON loss".
  // Coerce a zero on either side to null to preserve that exclusivity.
  const netProfit = toNumberOrNull(year.netProfit)
  const netLoss = toNumberOrNull(year.netLoss)
  return {
    fiscalYear: year.year,
    turnover: toNumberOrNull(year.turnover),
    netProfit: netProfit || null,
    netLoss: netLoss || null,
    employees: toNumberOrNull(year.employees),
    currency: 'RON',
  }
}

function buildSources(company: RawCompany): PrivateCompanySource[] {
  const sources: PrivateCompanySource[] = []
  const onrcDate = company.asOf.onrc
  if (onrcDate) {
    sources.push({ id: 'onrc', snapshotDate: onrcDate })
  }
  const anafDate = company.asOf.anaf ?? company.fiscal?.asOf ?? null
  if (anafDate) {
    sources.push({ id: 'anaf', snapshotDate: anafDate })
  }
  return sources
}

/**
 * ANAF "found" is true when we have an ANAF snapshot or any ANAF-derived
 * fiscal/financial signal. Financials presence is the strongest signal.
 */
function deriveAnafFound(
  company: RawCompany,
  financials: PrivateCompanyFinancialYear[],
): boolean {
  if (financials.length > 0) return true
  if (company.asOf.anaf) return true
  const fiscal = company.fiscal
  if (!fiscal) return false
  return (
    fiscal.vatPayer != null ||
    fiscal.declaredFiscallyInactive != null ||
    fiscal.mainCaenCode != null ||
    fiscal.asOf != null
  )
}

export function mapCompanyProfile(
  response: CompanyProfileResponse,
): PrivateCompanyProfile | null {
  const company = response.company
  if (!company) return null

  const financials = (response.companyFinancials?.years ?? []).map(mapFinancialYear)
  const anafFound = deriveAnafFound(company, financials)
  const fiscal = company.fiscal

  const fiscalCaen =
    fiscal?.mainCaenCode != null
      ? { code: fiscal.mainCaenCode, rev: 'rev2' as const }
      : null

  return {
    organizationId: `org:${company.orgId}`,
    cui: company.cui,
    codInmatriculare: company.codInmatriculare,
    legalName: company.name,
    legalForm: company.legalForm,
    registrationDate: company.registrationDate,
    status: company.headlineStatus
      ? {
          code: company.headlineStatus.code,
          label: company.headlineStatus.label ?? company.headlineStatus.code,
        }
      : null,
    address: {
      display: company.address.display,
      county: company.address.county,
      locality: company.address.locality,
    },
    geography: company.territory
      ? {
          uatSirutaCode: company.territory.sirutaCode ?? '',
          uatName: company.territory.uatName ?? '',
          countyName: company.territory.countyName ?? '',
          matchConfidence: mapMatchConfidence(company.territory.matchConfidence),
        }
      : null,
    caenActivities: company.caenActivities.map((activity) => ({
      code: activity.code,
      rev: activity.rev,
      label: activity.label,
      source: mapCaenSource(activity.source),
    })),
    representatives: company.representatives.map((rep) => ({
      name: rep.name,
      role: rep.role,
    })),
    euBranches: company.euBranches.map((branch) => ({
      name: branch.branchName ?? branch.euid ?? '',
      country: branch.country ?? '',
      type: null,
    })),
    fiscal: {
      vatPayer: fiscal?.vatPayer ?? null,
      inactive: fiscal?.declaredFiscallyInactive ?? null,
      anafFound,
      asOfDate: company.asOf.anaf ?? fiscal?.asOf ?? company.asOf.onrc ?? '',
      fiscalCaen,
    },
    financials,
    sources: buildSources(company),
  }
}

// ---------------------------------------------------------------------------
// Search list item
// ---------------------------------------------------------------------------

/** The canonical search-row shape lives on the result page type. */
export type PrivateCompanySearchResultItem =
  PrivateCompanySearchResultPage['items'][number]

export function mapCompanyListItem(
  node: RawCompanyListItem,
): PrivateCompanySearchResultItem {
  return {
    cui: node.cui,
    name: node.name,
    legalForm: node.legalForm,
    status: node.headlineStatus
      ? {
          code: node.headlineStatus.code,
          label: node.headlineStatus.label ?? node.headlineStatus.code,
        }
      : null,
    county: node.county,
    vatPayer: node.vatPayer,
    declaredFiscallyInactive: node.declaredFiscallyInactive,
    registrationDate: node.registrationDatePresent ? node.registrationDate : null,
  }
}

// ---------------------------------------------------------------------------
// Hub stats
// ---------------------------------------------------------------------------

/**
 * The root `companyHubStats` field is nullable — cold compute is ~30s, so a
 * request can come back empty. `null` means "not ready, retry", never zeroes.
 */
export function mapCompanyHubStats(
  response: CompanyHubStatsResponse,
): CompanyHubStats | null {
  const stats = response.companyHubStats
  if (!stats) return null
  return {
    totalCompanies: stats.totalCompanies,
    activeCompanies: stats.activeCompanies,
    statusMix: stats.statusMix,
    topCounties: stats.topCounties,
    caenDivisions: stats.caenDivisions,
    coverage: stats.coverage,
    computedAt: stats.computedAt,
  }
}
