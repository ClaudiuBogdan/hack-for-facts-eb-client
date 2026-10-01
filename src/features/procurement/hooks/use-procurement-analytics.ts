import { createContext, useContext, useMemo } from 'react'
import { hashKey, useQueries, useQuery } from '@tanstack/react-query'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'
import { useGeoJsonData } from '@/hooks/useGeoJson'
import { SEARCH_DEBOUNCE_MS } from '@/features/landing/hooks/use-landing-search'
import { useDebouncedValue } from '@/lib/hooks/useDebouncedValue'
import { COMPANY_HUB_SNAPSHOT } from '@/features/private-companies/lib/hub-snapshot'
import {
  nameKeys,
  planAnswer,
  planNames,
  planRecords,
  readAnalyticsCutoff,
  readCpvDivisions,
  readCpvMatches,
  type AnalyticsCutoff,
  type Concentration,
  type Figures,
  type Point,
  type Ranking,
  type RecordsSort,
  type Scope,
} from '../api/procurement-analytics-api'
import { fetchProcurementGeographyOptions } from '../api/procurement-reference-api'
import { procurementAnalyticsKeys } from '../lib/analytics-keys'
import { analyticsSearchOf, queryOf, repaired, siteSearchOf, urlSearchOf, type AnalyticsSearch, type Query, type ResolvedPeriod } from '../lib/analytics-model'
import type { Namer } from '../lib/analytics-text'
import { placeIndexOf, type PlaceFeatures, type PlaceIndex } from '../lib/analytics-places'
import { homeYear } from '../lib/home-model'
import { formatProcurementCountyName } from '../lib/procurement-geography'

/**
 * The analytics page's state and reads: the query its address holds, the
 * names of what it shows, the answer (each read on its own, planned in
 * `procurement-analytics-api.ts`) and the records, a page at a time. On the
 * first render each read starts from what the route's loader read on the
 * server under the same key (the seed), and reads only what it lacks.
 */

const STALE = 10 * 60 * 1000

// ────────────────────────────────────────────────────────────────── seed ──

/** What the route's loader read on the server: each read's key and its data. */
export type AnalyticsSeed = readonly { readonly key: readonly unknown[]; readonly data: unknown }[]

export interface AnalyticsSeedValue {
  /** The server's reads by their keys' hashes. */
  readonly reads: ReadonlyMap<string, unknown>
  /** The year the server planned the cutoff's key under; null for none. */
  readonly latest: number | null
}

export const AnalyticsSeedContext = createContext<AnalyticsSeedValue>({ reads: new Map(), latest: null })

/** The seed by each key's hash, for the page's provider. */
export function seedMap(seed: AnalyticsSeed | undefined): ReadonlyMap<string, unknown> {
  return new Map((seed ?? []).map((read) => [hashKey(read.key), read.data]))
}

/** A read's initial data when the server read it under the same key; nothing otherwise. */
function useSeeded(): <T>(read: { readonly key: readonly unknown[]; readonly read?: (signal: AbortSignal) => Promise<T> }) => { readonly initialData?: T } {
  const { reads } = useContext(AnalyticsSeedContext)
  return <T>(read: { readonly key: readonly unknown[] }) => {
    const hash = hashKey(read.key)
    return reads.has(hash) ? { initialData: reads.get(hash) as T } : {}
  }
}

// ───────────────────────────────────────────────────────────────── state ──

/** The address's values as the model reads them: a number the URL carries bare is its digits. */
export function useSearchStrings(): AnalyticsSearch {
  return analyticsSearchOf(useSearch({ from: '/procurement/analytics' }))
}

/** The query the address holds, and a way to move to another (pushed: Back undoes a drill). */
export function useAnalyticsQuery(): readonly [Query, (next: Query) => void, AnalyticsSearch] {
  const strings = useSearchStrings()
  const query = queryOf(strings)
  const navigate = useNavigate({ from: '/procurement/analytics' })
  // A change of question stays where the reader is: the page answers in place, it is not a new page.
  // The site's own keys stay with it: without `?lang=en` the next render would be in Romanian.
  const move = (next: Query) => void navigate({ search: (previous) => ({ ...siteSearchOf(previous), ...urlSearchOf(repaired(next)) }), resetScroll: false })
  return [query, move, strings] as const
}

// ──────────────────────────────────────────────────────────────── cutoff ──

/** Each population's newest complete month, from the shared national read (never from a narrow selection). */
export function useCutoff() {
  // The server's year when it read: its clock and a reader's can straddle the new year.
  const latest = useContext(AnalyticsSeedContext).latest ?? homeYear()
  const seeded = useSeeded()
  const key = procurementAnalyticsKeys.cutoff(latest)
  return useQuery({ queryKey: key, queryFn: () => readAnalyticsCutoff(latest), staleTime: STALE, ...seeded<AnalyticsCutoff>({ key }) })
}

// ───────────────────────────────────────────────────────────────── names ──

/** Names for everything on screen: the filters' values, the answer's keys. */
export function useNamer(query: Query, answer: Pick<Answer, 'ranking'>, extra: readonly Ranking[] = []): Namer {
  const names = useNames(nameKeys(query, [answer.ranking.data, ...extra]))
  const counties = useCounties()
  const divisions = useCpvDivisions()
  const needLocalities =
    query.filters.loc?.level === 'localitate' ||
    query.filters.loc_firma?.level === 'localitate' ||
    ((query.dupa.axis === 'loc' || query.dupa.axis === 'loc_firma') && query.dupa.level === 'localitate')
  const localities = useLocalities(needLocalities)
  return useMemo(
    () => ({
      names: names.data,
      divisions: divisions.data ?? new Map<string, { readonly ro: string | null; readonly en: string | null }>(),
      counties: new Map((counties.data?.counties ?? []).map((county) => [county.countyCode, formatProcurementCountyName(county.countyName)])),
      localities,
    }),
    [names.data, divisions.data, counties.data, localities],
  )
}

/** The names of what the page shows — the answer's keys, plus the filters' own values. */
export function useNames(keys: { readonly orgs: readonly string[]; readonly cpv: readonly string[] }) {
  const seeded = useSeeded()
  const plan = planNames(keys)
  return useQuery({
    queryKey: plan.key,
    queryFn: ({ signal }) => plan.read(signal),
    enabled: plan.enabled,
    staleTime: 60 * 60 * 1000,
    placeholderData: (previous) => previous,
    ...seeded(plan),
  })
}

/** Every CPV division's name (the client's own list names nine). */
export function useCpvDivisions() {
  const seeded = useSeeded()
  const key = procurementAnalyticsKeys.cpvDivisions()
  return useQuery({ queryKey: key, queryFn: ({ signal }) => readCpvDivisions(signal), staleTime: 24 * 60 * 60 * 1000, ...seeded<ReadonlyMap<string, { readonly ro: string | null; readonly en: string | null }>>({ key }) })
}

export function useCounties() {
  const seeded = useSeeded()
  const key = procurementAnalyticsKeys.counties()
  return useQuery({ queryKey: key, queryFn: () => fetchProcurementGeographyOptions(), staleTime: 24 * 60 * 60 * 1000, ...seeded<Awaited<ReturnType<typeof fetchProcurementGeographyOptions>>>({ key }) })
}

/**
 * Localities by SIRUTA from the map's own files (the API has no locality
 * names), only when a locality is on screen — a county's own code included:
 * the institutions registered at it (the county council) are the county's.
 */
export function useLocalities(enabled: boolean) {
  const geo = useGeoJsonData('UAT', { enabled })
  const counties = useGeoJsonData('County', { enabled })
  // Built once per read of the files: a map built on every render would give the namer a new identity each time.
  return useMemo(() => {
    const features = (geo.data as PlaceFeatures)?.features
    if (!features) return null
    const names = new Map<string, { name: string; kind: string | null; county: string | null; population: number | null }>()
    for (const feature of (counties.data as PlaceFeatures)?.features ?? []) {
      const props = feature.properties ?? {}
      if (props.countyCode === undefined || props.countyCode === null) continue
      const county = String(props.name ?? '')
      names.set(String(props.countyCode), { name: t`Județul ${county}`, kind: 'judet', county: typeof props.mnemonic === 'string' ? props.mnemonic : null, population: null })
    }
    for (const feature of features) {
      const props = feature.properties ?? {}
      const code = props.natcode
      if (code === undefined || code === null) continue
      names.set(String(code), {
        name: String(props.name ?? code),
        kind: typeof props.natLevName === 'string' ? props.natLevName : null,
        county: typeof props.countyMn === 'string' ? props.countyMn : null,
        population: typeof props.insPop2021 === 'number' ? props.insPop2021 : null,
      })
    }
    return names
  }, [geo.data, counties.data])
}

/** The place index's reads, each with its state: the API's regions and counties, and the map's files. */
export interface PlaceReads {
  readonly index: PlaceIndex
  /** The map's files are being read. */
  readonly loading: boolean
  /** The map's files could not be read: the regions and the counties still stand, from the API. */
  readonly failed: boolean
  readonly retry: () => void
  readonly countiesLoading: boolean
  /** The API's regions and counties could not be read. */
  readonly countiesFailed: boolean
  readonly retryCounties: () => void
}

/** The last index built, by its reads: the institution's and the firm's pickers share one (3,186 UATs each time otherwise). */
let lastPlaceIndex: { readonly reads: readonly unknown[]; readonly index: PlaceIndex } | null = null

function sharedPlaceIndex(geography: Parameters<typeof placeIndexOf>[0], uat: unknown, counties: unknown): PlaceIndex {
  const reads = [geography, uat, counties]
  if (lastPlaceIndex && lastPlaceIndex.reads.every((read, position) => read === reads[position])) return lastPlaceIndex.index
  const index = placeIndexOf(geography, uat as PlaceFeatures, counties as PlaceFeatures)
  lastPlaceIndex = { reads, index }
  return index
}

/**
 * Every region, county and locality a location filter can name, for the
 * filters' place picker (`analytics-places.ts`). The map's files (3 MB) are
 * read only once a place is being looked for, or a locality is on screen.
 */
export function usePlaceIndex(enabled: boolean): PlaceReads {
  const geography = useCounties()
  const uat = useGeoJsonData('UAT', { enabled })
  const counties = useGeoJsonData('County', { enabled })
  const index = useMemo(() => sharedPlaceIndex(geography.data, uat.data, counties.data), [geography.data, uat.data, counties.data])
  const failed = enabled && (uat.isError || counties.isError)
  return {
    index,
    // From the files' own reads, not the index: a failed read of the API's counties must not pass for localities loading.
    loading: enabled && !failed && (uat.data === undefined || counties.data === undefined),
    failed,
    retry: () => {
      if (uat.isError) void uat.refetch()
      if (counties.isError) void counties.refetch()
    },
    countiesLoading: geography.isPending,
    countiesFailed: geography.isError,
    retryCounties: () => void geography.refetch(),
  }
}

/** Residents on 1 January 2025 by county (INS POP105A, the companies hub's snapshot), for lei per resident. */
export const COUNTY_POPULATION: ReadonlyMap<string, number> = new Map(COMPANY_HUB_SNAPSHOT.counties.map((county) => [county.code, county.population]))
export function countyPopulationNote(): string {
  return t`INS POP105A, 1 ianuarie 2025`
}

/** The shortest term a category search asks about. */
export const CPV_SEARCH_MIN = 3

/**
 * Categories whose name holds a reader's words, for the quick filter and
 * the filters' category field. Read once the typing pauses (as the site's
 * search does); the last answer stays on screen while the next is read, so a
 * list does not flicker between keystrokes. `settled` says the answer on
 * screen is the one for what is typed now.
 */
export function useCpvSearch(term: string) {
  const trimmed = term.trim()
  const asked = useDebouncedValue(trimmed, SEARCH_DEBOUNCE_MS)
  const read = useQuery({
    queryKey: procurementAnalyticsKeys.cpvSearch(asked),
    queryFn: ({ signal }) => readCpvMatches(asked, signal),
    enabled: asked.length >= CPV_SEARCH_MIN,
    staleTime: 60 * 60 * 1000,
    placeholderData: (previous) => previous,
  })
  const current = asked === trimmed && trimmed.length >= CPV_SEARCH_MIN
  return {
    data: trimmed.length >= CPV_SEARCH_MIN ? read.data : undefined,
    isError: current && read.isError,
    settled: current && read.isSuccess && !read.isPlaceholderData && !read.isFetching,
    retry: () => void read.refetch(),
  }
}

// ────────────────────────────────────────────────────────── the answer ──

export interface Answer {
  readonly period: ResolvedPeriod | null
  /** Each population's cutoff; `failed` when it could not be read and the last complete year's end stands in. */
  readonly cutoff: AnalyticsCutoff | null
  readonly figures: { readonly data: { readonly now: Figures | null; readonly before: Figures | null } | undefined; readonly isError: boolean; readonly retry: () => void }
  readonly concentration: { readonly data: Concentration | null | undefined; readonly isError: boolean }
  readonly ranking: { readonly data: Ranking | undefined; readonly isError: boolean; readonly isFetching: boolean; readonly retry: () => void }
  readonly series: { readonly data: readonly Point[] | undefined; readonly isError: boolean; readonly retry: () => void }
  readonly years: { readonly data: readonly Point[] | undefined; readonly isError: boolean; readonly retry: () => void }
  /** The reads it made, for „Cum am calculat". */
  readonly scopes: { readonly now: Scope | null; readonly years: Scope | null }
}

/** Everything the page reads for a query, each read on its own. */
export function useAnswer(query: Query, options: { readonly topN: number; readonly years: boolean }): Answer {
  const cutoffRead = useCutoff()
  const seeded = useSeeded()
  const plan = planAnswer(query, cutoffRead.data ?? null, options)
  const dimension = plan.dimension
  const [figures, concentration, ranking, series, years] = useQueries({
    queries: [
      { queryKey: plan.figures.key, queryFn: ({ signal }: { signal: AbortSignal }) => plan.figures.read(signal), enabled: plan.figures.enabled, staleTime: STALE, ...seeded(plan.figures) },
      { queryKey: plan.concentration.key, queryFn: ({ signal }: { signal: AbortSignal }) => plan.concentration.read(signal), enabled: plan.concentration.enabled, staleTime: STALE, ...seeded(plan.concentration) },
      {
        queryKey: plan.ranking.key,
        queryFn: ({ signal }: { signal: AbortSignal }) => plan.ranking.read(signal),
        enabled: plan.ranking.enabled,
        staleTime: STALE,
        placeholderData: (previous: Ranking | undefined) => (previous && previous.dimension === dimension ? previous : undefined),
        ...seeded(plan.ranking),
      },
      { queryKey: plan.series.key, queryFn: ({ signal }: { signal: AbortSignal }) => plan.series.read(signal), enabled: plan.series.enabled, staleTime: STALE, ...seeded(plan.series) },
      { queryKey: plan.years.key, queryFn: ({ signal }: { signal: AbortSignal }) => plan.years.read(signal), enabled: plan.years.enabled, staleTime: STALE, ...seeded(plan.years) },
    ],
  })
  return {
    period: plan.period,
    cutoff: cutoffRead.data ?? null,
    figures: { data: figures.data as Answer['figures']['data'], isError: figures.isError, retry: () => void figures.refetch() },
    concentration: { data: plan.supplierFixed ? null : (concentration.data as Concentration | null | undefined), isError: concentration.isError },
    ranking: { data: ranking.data as Ranking | undefined, isError: ranking.isError, isFetching: ranking.isFetching, retry: () => void ranking.refetch() },
    series: { data: series.data as readonly Point[] | undefined, isError: series.isError, retry: () => void series.refetch() },
    years: { data: years.data as readonly Point[] | undefined, isError: years.isError, retry: () => void years.refetch() },
    scopes: { now: plan.scopes.now, years: plan.scopes.years },
  }
}

// ─────────────────────────────────────────────────────────────── records ──

export function useRecords(query: Query, period: ResolvedPeriod | null, sort: RecordsSort, page: number, enabled: boolean) {
  const seeded = useSeeded()
  const plan = planRecords(query, period, sort, page)
  return useQuery({
    queryKey: plan.key,
    queryFn: ({ signal }) => plan.read(signal),
    enabled: enabled && plan.enabled,
    staleTime: STALE,
    retry: false,
    ...seeded(plan),
  })
}
