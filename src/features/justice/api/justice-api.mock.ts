import {
  caseSearchResultSchema,
  companyLitigationResultSchema,
  courtCaseloadResultSchema,
  judicialCaseDetailSchema,
  justiceOverviewSchema,
  type CaseSearchResult,
  type CaseSearchFacets,
  type CaseSearchRow,
  type CaseSearchState,
  type CourtAnalyticsSearchState,
  type CompanyLitigationResult,
  type CourtCaseloadResult,
  type JudicialCaseDetail,
  type JusticeOverview,
} from '@/schemas/justice'
import {
  getMockCompanyLitigation,
  getMockCourtCaseload,
  getMockJudicialCase,
  mockCaseSearchResult,
  mockJusticeOverview,
  mockJusticeOverviewPartial,
  mockJusticeOverviewStale,
} from '../mocks/fixtures'

const SIMULATED_LATENCY_MS = 120
const ZERO_RESULTS_COVERAGE_NOTE =
  'nu am găsit cauze publicabile în acoperirea curentă • date dense din 2021 • fără ICCJ'

function delay(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, SIMULATED_LATENCY_MS))
}

export async function fetchJusticeOverviewMock(): Promise<JusticeOverview> {
  await delay()
  if (import.meta.env.VITE_JUSTICE_MOCK_VARIANT === 'overview-error') {
    throw new Error('Mock justice overview error')
  }
  if (import.meta.env.VITE_JUSTICE_MOCK_VARIANT === 'overview-partial') {
    return justiceOverviewSchema.parse(mockJusticeOverviewPartial)
  }
  if (import.meta.env.VITE_JUSTICE_MOCK_VARIANT === 'overview-stale') {
    return justiceOverviewSchema.parse(mockJusticeOverviewStale)
  }
  return justiceOverviewSchema.parse(mockJusticeOverview)
}

export async function fetchCourtCaseloadMock(
  courtId: string,
  search?: Partial<CourtAnalyticsSearchState>,
): Promise<CourtCaseloadResult | null> {
  await delay()
  const fixture = getMockCourtCaseload(courtId)
  if (fixture === null) {
    return null
  }
  return courtCaseloadResultSchema.parse(applyCourtCaseloadSearch(fixture, search))
}

export async function fetchJudicialCaseMock(
  caseId: string,
): Promise<JudicialCaseDetail | null> {
  await delay()
  const fixture = getMockJudicialCase(caseId)
  if (fixture === null) {
    return null
  }
  return judicialCaseDetailSchema.parse(fixture)
}

export async function fetchCaseSearchMock(
  search: CaseSearchState,
): Promise<CaseSearchResult> {
  await delay()
  const filteredRows = filterMockCaseRows(mockCaseSearchResult.rows, search)
  const sortedRows = sortMockCaseRows(filteredRows, search.sort ?? 'recent')
  const page = search.page ?? 1
  const pageSize = search.pageSize ?? 25
  const rows = sortedRows.slice((page - 1) * pageSize, page * pageSize)
  const result: CaseSearchResult = {
    ...mockCaseSearchResult,
    rows,
    facets: buildCaseSearchFacets(filteredRows),
    pagination: {
      ...mockCaseSearchResult.pagination,
      page,
      pageSize,
      total: filteredRows.length,
    },
    provenance: {
      ...mockCaseSearchResult.provenance,
      status:
        search.court === 'STALE-MOCK'
          ? 'stale'
          : search.category === 'PARTIAL-MOCK'
            ? 'partial'
            : mockCaseSearchResult.provenance.status,
      coverageNote:
        filteredRows.length === 0
          ? ZERO_RESULTS_COVERAGE_NOTE
          : mockCaseSearchResult.provenance.coverageNote,
    },
  }
  return caseSearchResultSchema.parse(result)
}

function filterMockCaseRows(
  rows: readonly CaseSearchRow[],
  search: CaseSearchState,
): CaseSearchRow[] {
  if (search.court === 'NO-COVERAGE') {
    return []
  }
  if (search.partyKey === 'no-publishable-litigator') {
    return []
  }

  return rows.filter((row) => {
    if (search.caseNumber && row.caseNumber !== search.caseNumber) {
      return false
    }
    if (search.tier && row.courtLevel !== search.tier) {
      return false
    }
    if (search.court && !['STALE-MOCK', 'NO-COVERAGE'].includes(search.court)) {
      if (row.institutionCode !== search.court) return false
    }
    if (search.category && search.category !== 'PARTIAL-MOCK') {
      if (!row.category || !splitFacetParam(search.category).includes(row.category)) {
        return false
      }
    }
    if (search.stage) {
      if (!row.stage || !splitFacetParam(search.stage).includes(row.stage)) {
        return false
      }
    }
    if (search.year) {
      if (!row.sourceOpenedAt?.startsWith(String(search.year))) return false
    }
    if (search.hasAppeal === 'true' && !row.hasAppeal) return false
    if (search.hasAppeal === 'false' && row.hasAppeal) return false
    if (search.partyKey) {
      const normalizedPartyKey = search.partyKey.toLowerCase()
      const hasPreviewMatch = row.namedPartiesPreview.some((party) =>
        party.nameKey.toLowerCase() === normalizedPartyKey,
      )
      if (!hasPreviewMatch) return false
    }
    if (search.partyKind) {
      const hasKind = row.namedPartiesPreview.some(
        (party) => party.partyKind === search.partyKind,
      )
      if (!hasKind) return false
    }
    if (search.role) {
      const roles = splitFacetParam(search.role)
      const hasRole = row.namedPartiesPreview.some((party) =>
        roles.includes(party.role),
      )
      if (!hasRole) return false
    }
    return true
  })
}

function sortMockCaseRows(
  rows: readonly CaseSearchRow[],
  sort: CaseSearchState['sort'],
): CaseSearchRow[] {
  const next = [...rows]
  if (sort === 'oldest') {
    return next.sort((a, b) => compareNullableDate(a.sourceOpenedAt, b.sourceOpenedAt))
  }
  if (sort === 'court') {
    return next.sort((a, b) =>
      (a.courtName ?? '').localeCompare(b.courtName ?? '', 'ro'),
    )
  }
  if (sort === 'category') {
    return next.sort((a, b) =>
      (a.categoryName ?? '').localeCompare(b.categoryName ?? '', 'ro'),
    )
  }
  return next.sort((a, b) => compareNullableDate(b.sourceOpenedAt, a.sourceOpenedAt))
}

function compareNullableDate(a: string | null, b: string | null): number {
  if (a === b) return 0
  if (a === null) return 1
  if (b === null) return -1
  return a.localeCompare(b)
}

function splitFacetParam(value: string): string[] {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

function buildCaseSearchFacets(rows: readonly CaseSearchRow[]): CaseSearchFacets {
  const tiers = new Map<string, number>()
  const categories = new Map<string, { readonly label: string; count: number }>()
  const stages = new Map<string, { readonly label: string; count: number }>()
  const roles = new Map<string, number>()
  const years = new Map<number, number>()

  for (const row of rows) {
    increment(tiers, row.courtLevel)
    if (row.category && row.categoryName) {
      incrementWithLabel(categories, row.category, row.categoryName)
    }
    if (row.stage && row.stageName) {
      incrementWithLabel(stages, row.stage, row.stageName)
    }
    const year = row.sourceOpenedAt ? Number(row.sourceOpenedAt.slice(0, 4)) : NaN
    if (Number.isInteger(year)) {
      increment(years, year)
    }
    for (const party of row.namedPartiesPreview) {
      increment(roles, party.role)
    }
  }

  return {
    tiers: [...tiers.entries()].map(([value, count]) => ({ value, count })),
    categories: [...categories.entries()].map(([value, item]) => ({
      value,
      label: item.label,
      count: item.count,
    })),
    stages: [...stages.entries()].map(([value, item]) => ({
      value,
      label: item.label,
      count: item.count,
    })),
    roles: [...roles.entries()].map(([value, count]) => ({ value, count })),
    years: [...years.entries()]
      .map(([year, count]) => ({ year, count }))
      .sort((a, b) => b.year - a.year),
  }
}

function increment<TKey>(map: Map<TKey, number>, key: TKey): void {
  map.set(key, (map.get(key) ?? 0) + 1)
}

function incrementWithLabel(
  map: Map<string, { label: string; count: number }>,
  key: string,
  label: string,
): void {
  const existing = map.get(key)
  if (existing) {
    existing.count += 1
    return
  }
  map.set(key, { label, count: 1 })
}

function applyCourtCaseloadSearch(
  result: CourtCaseloadResult,
  search?: Partial<CourtAnalyticsSearchState>,
): CourtCaseloadResult {
  if (!search?.year && !search?.category) {
    return result
  }
  const volumeByYear = search.year
    ? result.volumeByYear.filter((item) => item.year === search.year)
    : result.volumeByYear
  const byCategory = search.category
    ? result.byCategory.filter((item) => item.category === search.category)
    : result.byCategory
  return {
    ...result,
    volumeByYear,
    byCategory,
    provenance:
      search.category && byCategory.length === 0
        ? {
            ...result.provenance,
            status: 'partial',
            coverageNote:
              'categoria selectată nu are agregate în fixture-ul mock curent',
          }
        : result.provenance,
  }
}

export async function fetchCompanyLitigationMock(input: {
  readonly cui: string
  readonly page?: number
  readonly pageSize?: number
}): Promise<CompanyLitigationResult> {
  await delay()
  const sourceFixture = getMockCompanyLitigation(input.cui)
  const page = input.page ?? 1
  const pageSize = input.pageSize ?? 25
  const pagedCases = sourceFixture.cases.slice(
    (page - 1) * pageSize,
    page * pageSize,
  )
  const result: CompanyLitigationResult = {
    ...sourceFixture,
    cases: pagedCases,
    pagination: {
      page,
      pageSize,
      total: sourceFixture.pagination.total,
    },
  }
  return companyLitigationResultSchema.parse(result)
}
