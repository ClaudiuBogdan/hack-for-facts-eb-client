import { z } from 'zod'

// ============================================================================
// Enums — mirror transparenta_prod.elections.* so the live adapter maps cleanly.
// ============================================================================

export const electionFamilySchema = z.enum([
  'local',
  'parlamentare',
  'prezidentiale',
  'europarlamentare',
  'referendum',
])
export type ElectionFamily = z.infer<typeof electionFamilySchema>

export const dataStatusSchema = z.enum([
  'live',
  'mock',
  'partial',
  'stale',
  'blocked',
  'unverified',
])
export type DataStatus = z.infer<typeof dataStatusSchema>

export const accessStatusSchema = z.enum([
  'ok',
  'inaccessible_with_evidence',
  'terminal_resource_requires_review',
])
export type AccessStatus = z.infer<typeof accessStatusSchema>

export const authoritySchema = z.enum(['AEP', 'BEC', 'ROAEP'])
export type ElectionAuthority = z.infer<typeof authoritySchema>

export const competitorTypeSchema = z.enum([
  'party',
  'alliance',
  'independent',
  'unknown',
])
export type CompetitorType = z.infer<typeof competitorTypeSchema>

export const reportingScopeTypeSchema = z.enum([
  'national',
  'county',
  'siruta',
  'polling_station',
  'diaspora',
])
export type ReportingScopeType = z.infer<typeof reportingScopeTypeSchema>

export const contestScopeTypeSchema = z.enum([
  'siruta',
  'county',
  'diaspora',
  'national',
  'chamber',
  'source_constituency',
])
export type ContestScopeType = z.infer<typeof contestScopeTypeSchema>

// ============================================================================
// CSV helpers — shared by search parsers and navigate calls.
// Multi-value params are comma-separated strings; arrays are stable for keys.
// ============================================================================

/** Split a CSV search param into a trimmed, deduplicated array (stable order). */
export function decodeCsvParam(value: unknown): readonly string[] {
  if (Array.isArray(value)) {
    return value.flatMap((item) => decodeCsvParam(item))
  }
  if (typeof value !== 'string') {
    return []
  }
  const parts = value
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
  const seen = new Set<string>()
  const result: string[] = []
  for (const part of parts) {
    if (!seen.has(part)) {
      seen.add(part)
      result.push(part)
    }
  }
  return result
}

/** Encode an array back into a CSV string. Empty arrays encode to undefined. */
export function encodeCsvParam(values: readonly string[]): string | undefined {
  if (values.length === 0) {
    return undefined
  }
  return values.join(',')
}

/**
 * Decode a CSV param and keep only values that are members of a Zod enum.
 * Invalid values are dropped (never throw) so bad filters don't crash routes.
 *
 * Accepts the `.enum` map of a `z.enum([...])` schema (zod v4 exposes it as a
 * `{ key: value }` record) or any `readonly string[]` of allowed values.
 */
export function normalizeEnumCsvParam<Value extends string>(
  value: unknown,
  enumLike: Readonly<Record<string, Value>> | readonly Value[],
): readonly Value[] {
  const decoded = decodeCsvParam(value)
  const allowed = new Set<string>(
    Array.isArray(enumLike) ? enumLike : Object.values(enumLike),
  )
  return decoded.filter((part): part is Value => allowed.has(part))
}

// ============================================================================
// Domain view-model schemas (domain design §6).
// Numeric fields are nullable; defaults are never 0 for election figures.
// ============================================================================

export const sourcePointerSchema = z.object({
  sourceResourceId: z.string(),
  sourceFileId: z.string().nullable(),
  sourceRowNumber: z.number().int().nullable(),
  sourceRowHash: z.string().nullable(),
  sourceUpdatedAt: z.string().nullable(),
  authority: z.string(),
  sourceFamily: z.string(),
  resourceUrl: z.string().nullable(),
  accessStatus: accessStatusSchema,
})
export type SourcePointer = z.infer<typeof sourcePointerSchema>

export const coverageMetaSchema = z.object({
  authorities: z.array(z.string()),
  yearsRange: z.tuple([z.number().int(), z.number().int()]).nullable(),
  retrievedAt: z.string().nullable(),
  publishedAt: z.string().nullable(),
  knownGaps: z.array(z.string()),
  inaccessibleCount: z.number().int(),
  dataStatus: dataStatusSchema,
})
export type CoverageMeta = z.infer<typeof coverageMetaSchema>

export const electionSummarySchema = z.object({
  electionKey: z.string(),
  family: electionFamilySchema,
  name: z.string(),
  date: z.string(),
  year: z.number().int(),
  round: z.number().int().nullable(),
  roundLabel: z.string().nullable(),
  authority: z.string(),
  publicationStatus: z.string(),
  isFinal: z.boolean(),
  contestCount: z.number().int(),
  coverage: coverageMetaSchema,
})
export type ElectionSummary = z.infer<typeof electionSummarySchema>

export const reportingUnitRefSchema = z.object({
  reportingUnitKey: z.string(),
  scopeType: reportingScopeTypeSchema,
  scopeKey: z.string(),
  name: z.string(),
  sirutaCode: z.string().nullable(),
  countyCode: z.string().nullable(),
  countyName: z.string().nullable(),
  pollingStationNumber: z.number().int().nullable(),
})
export type ReportingUnitRef = z.infer<typeof reportingUnitRefSchema>

export const contestSummarySchema = z.object({
  contestKey: z.string(),
  electionKey: z.string(),
  office: z.string(),
  officeLabel: z.string(),
  chamber: z.string().nullable(),
  roundLabel: z.string().nullable(),
  scopeType: contestScopeTypeSchema,
  scopeKey: z.string(),
  scopeLabel: z.string(),
  constituencyCode: z.string().nullable(),
  constituencyName: z.string().nullable(),
  isReferendum: z.boolean(),
})
export type ContestSummary = z.infer<typeof contestSummarySchema>

export const competitorResultSchema = z.object({
  competitorKey: z.string(),
  sourceLabel: z.string(),
  normalizedLabel: z.string().nullable(),
  competitorType: competitorTypeSchema,
  ballotPosition: z.number().int().nullable(),
  votes: z.number().int().nullable(),
  votePercent: z.number().nullable(),
  mandates: z.number().int().nullable(),
  rank: z.number().int().nullable(),
  provenance: sourcePointerSchema,
})
export type CompetitorResult = z.infer<typeof competitorResultSchema>

export const turnoutMetricsSchema = z.object({
  validVotes: z.number().int().nullable(),
  invalidVotes: z.number().int().nullable(),
  totalVotes: z.number().int().nullable(),
  registeredVoters: z.number().int().nullable(),
  turnoutPercent: z.number().nullable(),
  derived: z.boolean(),
  provenance: sourcePointerSchema.nullable(),
})
export type TurnoutMetrics = z.infer<typeof turnoutMetricsSchema>

export const contestResultsSchema = z.object({
  contest: contestSummarySchema,
  election: electionSummarySchema,
  unit: reportingUnitRefSchema,
  children: z.array(reportingUnitRefSchema),
  competitors: z.array(competitorResultSchema),
  turnout: turnoutMetricsSchema,
  coverage: coverageMetaSchema,
  totalCount: z.number().int().nullable(),
  page: z.number().int(),
  pageSize: z.number().int(),
})
export type ContestResults = z.infer<typeof contestResultsSchema>

export const mandateAllocationSchema = z.object({
  competitorKey: z.string(),
  sourceLabel: z.string(),
  allocationPhase: z.string(),
  mandates: z.number().int(),
  isFinal: z.boolean(),
  provenance: sourcePointerSchema,
})
export type MandateAllocation = z.infer<typeof mandateAllocationSchema>

export const candidacySchema = z.object({
  contestKey: z.string(),
  electionKey: z.string(),
  year: z.number().int(),
  officeLabel: z.string(),
  scopeLabel: z.string(),
  competitorKey: z.string().nullable(),
  competitorLabel: z.string().nullable(),
  ballotPosition: z.number().int().nullable(),
  listPosition: z.number().int().nullable(),
  isFinalList: z.boolean(),
  allianceMemberLabel: z.string().nullable(),
  votes: z.number().int().nullable(),
  provenance: sourcePointerSchema,
})
export type Candidacy = z.infer<typeof candidacySchema>

// Headline contest — election hub summary band.
export const headlineContestSchema = z.object({
  contest: contestSummarySchema,
  topCompetitor: competitorResultSchema.nullable(),
  turnout: turnoutMetricsSchema,
})
export type HeadlineContest = z.infer<typeof headlineContestSchema>

// ============================================================================
// Search params — defaults render with no query params.
// Invalid params normalize/drop; no route crash for bad filters.
// Use .catch on each field so a single bad value can't invalidate siblings.
// ============================================================================

const emptyString = '' as const

function firstSearchValue(value: unknown): unknown {
  return Array.isArray(value) ? value[0] : value
}

function optionalStringParam(value: unknown): string | undefined {
  const first = firstSearchValue(value)
  if (typeof first !== 'string') return undefined
  const trimmed = first.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

function optionalIntParam(
  value: unknown,
  min: number,
  max: number,
): number | undefined {
  const first = firstSearchValue(value)
  if (first === undefined || first === null || first === '') return undefined
  const parsed = Number(first)
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) return undefined
  return parsed
}

function stringParam(value: unknown): string {
  const first = firstSearchValue(value)
  return typeof first === 'string' ? first : emptyString
}

// --- Landing search ---------------------------------------------------------

export const electionsLandingSortSchema = z.enum([
  'date_desc',
  'date_asc',
  'name_asc',
])

export const electionsLandingSearchSchema = z
  .object({
    q: z.unknown().optional().transform(stringParam),
    family: z.unknown().optional().transform((value) =>
      normalizeEnumCsvParam(value, electionFamilySchema.enum),
    ),
    authority: z.unknown().optional().transform((value) =>
      normalizeEnumCsvParam(value, authoritySchema.enum),
    ),
    year: z.unknown().optional().transform((value) => optionalIntParam(value, 1900, 2100)),
    yearFrom: z.unknown().optional().transform((value) => optionalIntParam(value, 1900, 2100)),
    yearTo: z.unknown().optional().transform((value) => optionalIntParam(value, 1900, 2100)),
    round: z.unknown().optional().transform((value) => optionalIntParam(value, 1, 2)),
    arhiva: z.unknown().optional().transform((value) => optionalIntParam(value, 0, 1) ?? 0),
    sort: z.unknown().optional().transform((value) => {
      const parsed = electionsLandingSortSchema.safeParse(firstSearchValue(value))
      return parsed.success ? parsed.data : 'date_desc'
    }),
  })

export type ElectionsLandingSearch = z.infer<typeof electionsLandingSearchSchema>

export const DEFAULT_ELECTIONS_LANDING_SEARCH: ElectionsLandingSearch = {
  q: emptyString,
  family: [],
  authority: [],
  year: undefined,
  yearFrom: undefined,
  yearTo: undefined,
  round: undefined,
  arhiva: 0,
  sort: 'date_desc',
}

export function parseElectionsLandingSearch(search: unknown): ElectionsLandingSearch {
  const parsed = electionsLandingSearchSchema.safeParse(search ?? {})
  return parsed.success ? parsed.data : DEFAULT_ELECTIONS_LANDING_SEARCH
}

// --- Election hub search ----------------------------------------------------

export const electionHubTabSchema = z.enum(['contests', 'sumar'])
export const electionHubScopeSchema = z.enum([
  'national',
  'county',
  'siruta',
  'diaspora',
  'source_constituency',
])

export const electionHubSearchSchema = z
  .object({
    tab: z.unknown().optional().transform((value) => {
      const parsed = electionHubTabSchema.safeParse(firstSearchValue(value))
      return parsed.success ? parsed.data : 'contests'
    }),
    office: z.unknown().optional().transform((value) => decodeCsvParam(value)),
    scope: z.unknown().optional().transform((value) =>
      normalizeEnumCsvParam(value, electionHubScopeSchema.enum),
    ),
    q: z.unknown().optional().transform(stringParam),
  })

export type ElectionHubSearch = z.infer<typeof electionHubSearchSchema>

export const DEFAULT_ELECTION_HUB_SEARCH: ElectionHubSearch = {
  tab: 'contests',
  office: [],
  scope: [],
  q: emptyString,
}

export function parseElectionHubSearch(search: unknown): ElectionHubSearch {
  const parsed = electionHubSearchSchema.safeParse(search ?? {})
  return parsed.success ? parsed.data : DEFAULT_ELECTION_HUB_SEARCH
}

// --- Contest explorer search ------------------------------------------------

export const contestViewSchema = z.enum(['lista', 'tabel', 'harta'])
export const contestTabSchema = z.enum(['rezultate', 'candidaturi', 'mandate', 'date'])
export const contestScopeParamSchema = z.enum([
  'national',
  'county',
  'siruta',
  'diaspora',
  'polling_station',
])
export const contestSortSchema = z.enum([
  'votes_desc',
  'votes_asc',
  'percent_desc',
  'percent_asc',
  'rank_asc',
])

export const contestSearchSchema = z
  .object({
    geo: z.unknown().optional().transform(optionalStringParam),
    scope: z.unknown().optional().transform((value) => {
      const parsed = contestScopeParamSchema.safeParse(firstSearchValue(value))
      return parsed.success ? parsed.data : undefined
    }),
    view: z.unknown().optional().transform((value) => {
      const parsed = contestViewSchema.safeParse(firstSearchValue(value))
      return parsed.success ? parsed.data : 'lista'
    }),
    metric: z.unknown().optional().transform((value) => optionalStringParam(value) ?? 'voturi'),
    sort: z.unknown().optional().transform((value) => {
      const parsed = contestSortSchema.safeParse(firstSearchValue(value))
      return parsed.success ? parsed.data : 'votes_desc'
    }),
    expert: z.unknown().optional().transform((value) => optionalIntParam(value, 0, 1) ?? 0),
    compare: z.unknown().optional().transform(optionalStringParam),
    tab: z.unknown().optional().transform((value) => {
      const parsed = contestTabSchema.safeParse(firstSearchValue(value))
      return parsed.success ? parsed.data : 'rezultate'
    }),
    page: z.unknown().optional().transform((value) => optionalIntParam(value, 1, 100000) ?? 1),
    pageSize: z.unknown().optional().transform((value) => optionalIntParam(value, 1, 200) ?? 50),
  })

export type ContestSearch = z.infer<typeof contestSearchSchema>

export const DEFAULT_CONTEST_SEARCH: ContestSearch = {
  geo: undefined,
  scope: undefined,
  view: 'lista',
  metric: 'voturi',
  sort: 'votes_desc',
  expert: 0,
  compare: undefined,
  tab: 'rezultate',
  page: 1,
  pageSize: 50,
}

export function parseContestSearch(search: unknown): ContestSearch {
  const parsed = contestSearchSchema.safeParse(search ?? {})
  return parsed.success ? parsed.data : DEFAULT_CONTEST_SEARCH
}

// ============================================================================
// Stable query-key builders (kept here so search parsers and hooks agree).
// ============================================================================

export function electionsLandingQueryKey(search: ElectionsLandingSearch): readonly unknown[] {
  return [
    'elections',
    'landing',
    search.q ?? '',
    search.family.join(','),
    search.authority.join(','),
    search.year ?? null,
    search.yearFrom ?? null,
    search.yearTo ?? null,
    search.round ?? null,
    search.arhiva ?? 0,
    search.sort ?? 'date_desc',
  ] as const
}

export function electionHubQueryKey(
  electionKey: string,
  search: ElectionHubSearch,
): readonly unknown[] {
  return [
    'elections',
    'hub',
    electionKey,
    search.tab ?? 'contests',
    search.office.join(','),
    search.scope.join(','),
    search.q ?? '',
  ] as const
}

export function contestResultsQueryKey(
  contestKey: string,
  search: Pick<ContestSearch, 'geo' | 'scope' | 'metric' | 'page' | 'pageSize' | 'expert'>,
): readonly unknown[] {
  return [
    'elections',
    'contest-results',
    contestKey,
    search.geo ?? null,
    search.scope ?? null,
    search.metric ?? 'voturi',
    search.page ?? 1,
    search.pageSize ?? 50,
    search.expert ?? 0,
  ] as const
}

export function contestMandatesQueryKey(contestKey: string): readonly unknown[] {
  return ['elections', 'contest-mandates', contestKey] as const
}

export function contestCandidaciesQueryKey(contestKey: string): readonly unknown[] {
  return ['elections', 'contest-candidacies', contestKey] as const
}
