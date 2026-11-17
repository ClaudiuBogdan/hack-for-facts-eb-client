import { z } from 'zod'
import { lazySchema, type LazyOutput } from '@/lib/route-contract'

/**
 * The `/ins` routes' URL contract: their search params, and the parse functions
 * the routes hand to `validateSearch`. Apart from `statistics.ts` (which
 * re-exports it) so that the route files, which every page loads, carry only
 * this; and lazy, so nothing here is built until an `/ins` route is matched.
 * See `docs/route-contracts.md`.
 */

/**
 * Free-form period anchor filter (e.g. "2024", "2024-Q1", "2024-03").
 * Invalid/non-string values degrade to no filter.
 */
const periodSearch = () =>
  z
    .preprocess(
      (value) => {
        // The router's search parser JSON-parses bare digits, so the natural
        // ?period=2019 arrives as a NUMBER — coerce before validating.
        const candidate = typeof value === 'number' ? String(value) : value
        if (typeof candidate !== 'string') return 'latest'
        const normalized = candidate.trim()
        return normalized.length > 0 ? normalized : 'latest'
      },
      z.union([z.literal('latest'), z.string().regex(/^\d{4}$/), z.string().regex(/^\d{4}-Q[1-4]$/), z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/)]),
    )
    .catch('latest')
export const statisticsPeriodSearchSchema = lazySchema(periodSearch)

/**
 * Search state for the statistics hub route (`/ins`).
 *
 * `indicator` is the county map's colouring — shareable, so a link can land
 * on "unemployment by county". `harta` and `judet` are the localities' map's
 * series and the county it shows, alike. The default view renders with no
 * params.
 */
const STATISTICS_HUB_INDICATORS = ['viata', 'salariu', 'pib', 'somaj', 'spor', 'varsta'] as const
export type StatisticsHubIndicatorKey = (typeof STATISTICS_HUB_INDICATORS)[number]

const STATISTICS_HUB_MAP_SERIES = ['populatie', 'spor-natural', 'sold-domiciliu', 'salariati', 'locuinte-noi', 'apa'] as const
export type StatisticsHubMapSeries = (typeof STATISTICS_HUB_MAP_SERIES)[number]

export const statisticsHubSearchSchema = lazySchema(() =>
  z
    .object({
      indicator: z.enum(STATISTICS_HUB_INDICATORS).optional().catch(undefined),
      harta: z.enum(STATISTICS_HUB_MAP_SERIES).optional().catch(undefined),
      /** A county code (`CJ`, `B`); one the map does not know is ignored there. */
      judet: z
        .string()
        .regex(/^[A-Z]{1,2}$/)
        .optional()
        .catch(undefined),
    })
    .catch({}),
)

export type StatisticsHubSearch = LazyOutput<typeof statisticsHubSearchSchema>

/**
 * Search state for the territory hub route
 * (`/ins/teritorii/$siruta`).
 *
 * - `period`: latest | YYYY | YYYY-Qn | YYYY-MM.
 *
 * All fields use `.catch` so malformed enum/string values from the URL
 * degrade to safe defaults instead of throwing during route validation.
 */
export const statisticsTerritoryHubSearchSchema = lazySchema(() =>
  z
    .object({
      period: periodSearch().optional().catch(undefined),
    })
    .catch({}),
)

export type StatisticsTerritoryHubSearch = LazyOutput<typeof statisticsTerritoryHubSearchSchema>

/**
 * Search state for the dataset explorer (`/ins/seturi`).
 *
 * Param names are Romanian to match the route segments. Every field is
 * `.optional().catch(undefined)` so a malformed value in a shared URL degrades
 * to "filter not applied" rather than throwing during route validation.
 *
 * - `q`: free-text dataset search (debounced, never a submit button).
 * - `context`: INS context (theme) code.
 * - `frecventa`: periodicity multi-select.
 * - `uat` / `judet`: coverage flags.
 * - `pagina`: 1-based page index.
 */
const EXPLORER_PERIODICITIES = ['ANNUAL', 'QUARTERLY', 'MONTHLY'] as const

/** The router JSON-parses a bare number or boolean; a search term is text whatever it looks like. */
const asText = (value: unknown) => (typeof value === 'number' || typeof value === 'boolean' ? String(value) : value)

export const statisticsDatasetExplorerSearchSchema = lazySchema(() =>
  z
    .object({
      // `?q=2024` arrives as a number: a year is a search term too.
      q: z.preprocess(asText, z.string().trim().min(1).optional()).catch(undefined),
      // Every theme code is a digit, so coerce it back or every theme link drops.
      context: z.preprocess(asText, z.string().trim().min(1).optional()).catch(undefined),
      // A single `?frecventa=ANNUAL` is one filter, not a malformed list; a
      // pasted link that repeats a cadence names it once; an empty list is none.
      frecventa: z
        .preprocess(
          (value) => {
            const list = typeof value === 'string' ? [value] : value
            return Array.isArray(list) ? Array.from(new Set(list)) : list
          },
          z.array(z.enum(EXPLORER_PERIODICITIES)).min(1).optional(),
        )
        .catch(undefined),
      uat: z.boolean().optional().catch(undefined),
      judet: z.boolean().optional().catch(undefined),
      pagina: z.number().int().min(1).optional().catch(undefined),
    })
    .catch({}),
)

export type StatisticsDatasetExplorerSearch = LazyOutput<typeof statisticsDatasetExplorerSearchSchema>

/**
 * Search state for the dataset detail route (`/ins/seturi/$cod`).
 *
 * Preserve identity input for descriptor-aware validation in source-selection.
 * Invalid explicit selections must remain visible and editable.
 */
export const statisticsDatasetDetailSearchSchema = lazySchema(() =>
  z
    .object({
      // Identity selections stay intact for explicit validation and recovery.
      teritoriu: z.unknown().optional(),
      clasificari: z.unknown().optional(),
      unitate: z.unknown().optional(),
      frecventa: z.enum(['ANNUAL', 'QUARTERLY', 'MONTHLY']).optional().catch(undefined),
      din: z.number().int().min(1900).max(2100).optional().catch(undefined),
      pana: z.number().int().min(1900).max(2100).optional().catch(undefined),
      /**
       * A period to mark on the series — the year a place's page was read at
       * („2020"), or that year's month or quarter for a sub-annual matrix
       * („2020-12"). The router parses a bare year as a number.
       */
      perioada: z
        .preprocess((value) => (typeof value === 'number' ? String(value) : value), z.string().regex(/^\d{4}(?:-(?:0[1-9]|1[0-2]|Q[1-4]))?$/))
        .optional()
        .catch(undefined),
    })
    .catch({}),
)

export type StatisticsDatasetDetailSearch = LazyOutput<typeof statisticsDatasetDetailSearchSchema>

/**
 * Search state for the local comparisons route (`/ins/comparatii`).
 *
 * Raw URL intent is validated after routing. Territory tokens distinguish county
 * codes from SIRUTA; an explicitly selected single territory remains an
 * intermediate comparison rather than being replaced with example data.
 */
export const statisticsComparisonsSearchSchema = lazySchema(() =>
  z.object({
    // Explicit invalid intent must survive routing to the validation UI.
    cod: z.unknown().optional(),
    teritorii: z.unknown().optional(),
    perioada: z.unknown().optional(),
    /** The start of the compared window; `perioada` is its end. */
    din: z.unknown().optional(),
    clasificari: z.unknown().optional(),
    unitate: z.unknown().optional(),
    frecventa: z.unknown().optional(),
    /** `valori` or `schimbare`: the chart's scale. Absent, the page picks one from the rows. */
    vedere: z.unknown().optional(),
  }),
)

export type StatisticsComparisonsSearch = LazyOutput<typeof statisticsComparisonsSearchSchema>

/** Parse function for TanStack Router `validateSearch` on the landing route. */
export function parseStatisticsHubSearch(search: Record<string, unknown>): StatisticsHubSearch {
  return statisticsHubSearchSchema.parse(search)
}

/** Parse function for TanStack Router `validateSearch` on the dataset explorer. */
export function parseStatisticsDatasetExplorerSearch(search: Record<string, unknown>): StatisticsDatasetExplorerSearch {
  return statisticsDatasetExplorerSearchSchema.parse(search)
}

/** Parse function for TanStack Router `validateSearch` on the dataset detail. */
export function parseStatisticsDatasetDetailSearch(search: Record<string, unknown>): StatisticsDatasetDetailSearch {
  return statisticsDatasetDetailSearchSchema.parse(search)
}

/** Parse function for TanStack Router `validateSearch` on the comparisons page. */
export function parseStatisticsComparisonsSearch(search: Record<string, unknown>): StatisticsComparisonsSearch {
  return statisticsComparisonsSearchSchema.parse(search)
}

/** Parse function for TanStack Router `validateSearch` on the territory hub. */
export function parseStatisticsTerritoryHubSearch(search: Record<string, unknown>): StatisticsTerritoryHubSearch {
  const parsed = statisticsTerritoryHubSearchSchema.parse(search)
  if (parsed.period === 'latest') {
    return {}
  }
  return parsed
}
