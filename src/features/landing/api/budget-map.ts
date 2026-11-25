import type { FeatureCollection, Geometry } from 'geojson'
import { fetchGroupedSeriesData } from '@/lib/api/map-series'
import { SeriesConfigurationSchema, type AnalyticsFilterType, type SeriesConfiguration } from '@/schemas/charts'
import type { BudgetFigures } from '../lib/budget-map-measures'
import type { LabelPoints } from '../lib/budget-map-style'

/**
 * What the landing's budget map reads.
 *
 * - The figures: every primărie's income and expenses for one year, from the
 *   grouped-series endpoint the app's own map uses — one request, ~45 KB.
 * - The shapes and label points: dated static files, served immutable and
 *   compressed (`nitro.config.ts`). A new boundary file gets a new date and a
 *   new `yarn map:label-points` run beside it.
 */

export const UAT_SHAPES_URL = '/geojson/uat-2026-10-28.json'
export const COUNTY_SHAPES_URL = '/geojson/judete-2026-10-28.json'
export const LABEL_POINTS_URL = '/geojson/label-points-2026-10-28.json'

const REPORT_TYPE = 'Executie bugetara agregata la nivel de ordonator principal'

export type ShapeCollection = FeatureCollection<Geometry, Record<string, unknown>>

export interface BudgetMapFigures {
  readonly byUat: ReadonlyMap<string, BudgetFigures>
  /**
   * Budgets with figures but no shape on the map — the server reports them
   * (`BUDGET_MAP_COVERAGE`, `outsideViewRows`). Today it is the capital's own
   * budget: the map draws București as its six sectors.
   */
  readonly outsideMap: number
}

/**
 * What the figures are counted over; the defaults are the landing's map.
 *
 * - `per_capita`: lei per inhabitant, divided by the server with its own
 *   population series.
 * - `County`: one row per county code, summing every territorial executive in
 *   it — the primării and the county council (in București, the sectors and
 *   the capital's own budget).
 */
export interface BudgetFiguresOptions {
  readonly normalization?: 'total' | 'per_capita'
  readonly granularity?: 'UAT' | 'County'
}

/**
 * The series' timestamps, fixed: the schema stamps `createdAt`/`updatedAt` with
 * the current time, the server keeps them, and its grouped-series cache hashes
 * the whole series — so a fresh stamp made every landing visitor miss it
 * (~0.55 s of aggregation instead of ~0.1 s).
 */
const STABLE_STAMP = '2026-01-01T00:00:00.000Z'

/**
 * Reported receipts (`vn`) and payments (`ch`) per SIRUTA, in RON, one year,
 * every primărie: the cash execution as reported to ANAF, transfers and
 * financing flows included — the figures its entity page shows. The map shows
 * their difference.
 *
 * No exclusions on purpose. The app's analytics defaults (`withDefaultExcludes`)
 * drop rows by code prefix without pairing an internal receipt with its
 * payment in the same scope, so they are not an art. 3 consolidation (which
 * eliminates paired internal flows and keeps the cash difference of a fixed
 * scope); they moved the map away from the entity page (Cluj, Timișoara,
 * Sector 4 — `docs/design/landing/design.md` §Budget map). Law 273/2006, arts.
 * 3, 57, 58: https://legislatie.just.ro/Public/DetaliiDocumentAfis/257231
 * Method, legal basis and checks: `docs/budget-balance-methodology.md`.
 */
export async function fetchBudgetFigures(year: string, { normalization = 'total', granularity = 'UAT' }: BudgetFiguresOptions = {}): Promise<BudgetMapFigures> {
  const series = (id: 'income' | 'expenses', account: 'vn' | 'ch') =>
    SeriesConfigurationSchema.parse({
      id,
      type: 'line-items-aggregated-yearly',
      label: id,
      createdAt: STABLE_STAMP,
      updatedAt: STABLE_STAMP,
      filter: {
        report_period: { type: 'YEAR', selection: { interval: { start: year, end: year } } },
        account_category: account,
        report_type: REPORT_TYPE,
        is_territorial_executive: true,
        normalization,
        currency: 'RON',
        inflation_adjusted: false,
        show_period_growth: false,
      } satisfies AnalyticsFilterType,
    }) as SeriesConfiguration
  const response = await fetchGroupedSeriesData({ granularity, series: [series('income', 'vn'), series('expenses', 'ch')] })
  const outsideMap = Math.max(
    0,
    ...(response.warnings ?? []).map((warning) => {
      const rows = (warning.details as { outsideViewRows?: unknown } | undefined)?.outsideViewRows
      return warning.type === 'BUDGET_MAP_COVERAGE' && typeof rows === 'number' ? rows : 0
    }),
  )
  return { byUat: parseFiguresCsv(response.payload.data), outsideMap }
}

/** The wide CSV, `siruta_code,<series>…`, read by hand: two numeric columns. */
export function parseFiguresCsv(csv: string): ReadonlyMap<string, BudgetFigures> {
  const lines = csv.split('\n')
  const header = lines[0]?.split(',') ?? []
  const incomeAt = header.indexOf('income')
  const expensesAt = header.indexOf('expenses')
  const number = (raw: string | undefined) => {
    if (raw === undefined || raw.trim() === '') return null
    const value = Number(raw)
    return Number.isFinite(value) ? value : null
  }
  const out = new Map<string, BudgetFigures>()
  for (const line of lines.slice(1)) {
    const cells = line.split(',')
    if (!cells[0]) continue
    out.set(cells[0], { income: incomeAt < 0 ? null : number(cells[incomeAt]), expenses: expensesAt < 0 ? null : number(cells[expensesAt]) })
  }
  return out
}

/** A static file at low fetch priority: the map never competes with what the page shows first. */
export async function fetchStaticJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { priority: 'low' } as RequestInit)
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`)
  return (await response.json()) as T
}

export type { LabelPoints }
