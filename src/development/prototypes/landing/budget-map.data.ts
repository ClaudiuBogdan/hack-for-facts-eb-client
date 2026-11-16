import { useQuery } from '@tanstack/react-query'
import { fetchGroupedSeriesData } from '@/lib/api/map-series'
import { withDefaultExcludes } from '@/lib/filterUtils'
import { SeriesConfigurationSchema, type AnalyticsFilterType, type SeriesConfiguration } from '@/schemas/charts'
import type { UatMapGeometry } from '@/features/statistics/lib/uat-map-snapshot'

/**
 * The data every variant of the landing budget map shares: the balance of each
 * primărie for one year, and — for the SVG and canvas variants — the INS hub's
 * pre-projected shapes with a SIRUTA → CUI lookup beside them, so a tap can open
 * the primărie's own page. The MapLibre variant reads the raw GeoJSON instead;
 * that difference is part of what is being measured.
 */

export const PROTOTYPE_MARKER = 'TRANSPARENTA_PROTOTYPE_MUST_NOT_SHIP'

export const BUDGET_YEAR = '2025'

const REPORT_TYPE = 'Executie bugetara agregata la nivel de ordonator principal'

export type MeasureId = 'balance' | 'income' | 'expenses'

export interface BudgetFigures {
  readonly income: number | null
  readonly expenses: number | null
}

/**
 * Income and expenses per SIRUTA, both in RON, one year, every primărie — with
 * the app's default exclusions (`withDefaultExcludes`): transfers between
 * budgets left out of income and of expenses, as the app's own map and every
 * entity page count them. Without them the figures here would not be the ones
 * the primărie's page shows, which the tooltip links to.
 */
export async function fetchBudgetFigures(year: string): Promise<ReadonlyMap<string, BudgetFigures>> {
  const series = (id: 'income' | 'expenses', account: 'vn' | 'ch') =>
    SeriesConfigurationSchema.parse({
      id,
      type: 'line-items-aggregated-yearly',
      label: id,
      filter: withDefaultExcludes({
        report_period: { type: 'YEAR', selection: { interval: { start: year, end: year } } },
        account_category: account,
        report_type: REPORT_TYPE,
        is_territorial_executive: true,
        normalization: 'total',
        currency: 'RON',
        inflation_adjusted: false,
        show_period_growth: false,
      } as AnalyticsFilterType),
    }) as SeriesConfiguration
  const response = await fetchGroupedSeriesData({ granularity: 'UAT', series: [series('income', 'vn'), series('expenses', 'ch')] })
  return parseFiguresCsv(response.payload.data)
}

/** The wide CSV: `siruta_code,<series>…`. Read by hand: it is two numeric columns. */
export function parseFiguresCsv(csv: string): ReadonlyMap<string, BudgetFigures> {
  const lines = csv.split('\n')
  const header = lines[0]?.split(',') ?? []
  const incomeAt = header.indexOf('income')
  const expensesAt = header.indexOf('expenses')
  const out = new Map<string, BudgetFigures>()
  const num = (raw: string | undefined) => {
    if (raw === undefined || raw === '') return null
    const value = Number(raw)
    return Number.isFinite(value) ? value : null
  }
  for (let i = 1; i < lines.length; i += 1) {
    const cells = lines[i]!.split(',')
    if (!cells[0]) continue
    out.set(cells[0], { income: num(cells[incomeAt]), expenses: num(cells[expensesAt]) })
  }
  return out
}

/** One cache entry for the figures, whoever asks first: a variant, or the background prefetch. */
export const budgetFiguresQuery = (year = BUDGET_YEAR) => ({
  queryKey: ['prototype', 'landing-budget-map', 'figures', year] as const,
  queryFn: () => fetchBudgetFigures(year),
  staleTime: Infinity,
})

export function useBudgetFigures(year = BUDGET_YEAR) {
  return useQuery(budgetFiguresQuery(year))
}

export interface CompactShapes {
  readonly geometry: UatMapGeometry
  /** The primărie's CUI, aligned with `geometry.siruta`; '' where the GeoJSON has none. */
  readonly cui: readonly string[]
}

export function useCompactShapes() {
  return useQuery({
    queryKey: ['prototype', 'landing-budget-map', 'compact-shapes'],
    queryFn: async (): Promise<CompactShapes> => {
      const [geometry, cui] = await Promise.all([
        import('@/features/statistics/data/uat-map-geometry.json').then((module) => module.default as unknown as UatMapGeometry),
        import('./budget-map.cui.json').then((module) => module.default as readonly string[]),
      ])
      return { geometry, cui }
    },
    staleTime: Infinity,
  })
}

// ── what a figure means on the map ────────────────────────────────────────

export interface MeasureClass {
  readonly color: string
  /**
   * Exactly the values the class holds, in words (DESIGN.md decision log,
   * 2026-10-02): a class holds its lower bound, not its upper one — „−10 – sub
   * −3", „sub −20", „20 sau mai mult". In the measure's unit, which the legend
   * names once.
   */
  readonly label: string
  /** The class's bounds, for placing a value along the legend's bar; null at an open end. */
  readonly from: number | null
  readonly to: number | null
}

/** A measure's colours for one set of values: the classes the legend lists, and where a value falls. */
export interface MeasureScale {
  readonly classes: readonly MeasureClass[]
  readonly classOf: (value: number | null) => number | null
  /** What the bar's two ends mean, where the colours part at a middle (deficit and surplus). */
  readonly ends?: { readonly below: string; readonly above: string }
}

/**
 * One map of the picker. Pure: switching maps recomputes the values, the
 * scale and the labels from the measure; nothing is kept between switches.
 */
export interface Measure {
  readonly id: MeasureId
  /** The picker's and the tooltip's name for it. */
  readonly title: string
  /** What it is, in one line, under its name in the picker. */
  readonly description: string
  /** The picker's heading it sits under, once there are several. */
  readonly group: string
  /** Its colours, light to dark (or one end to the other): the picker's preview of the map. */
  readonly ramp: readonly string[]
  /** What the legend's classes are counted in. */
  readonly unit: string
  /** One sentence on how the figure is made, beside the source; empty when it is the source's own. */
  readonly note: string
  /** The figure the colour is drawn from, or null where there is none. */
  readonly value: (figures: BudgetFigures | undefined) => number | null
  /** The figure with its unit, as a map label and the tooltip print it. */
  readonly format: (value: number | null) => string
  /** The colours for these values (quantile measures need all of them). */
  readonly scale: (values: readonly (number | null)[]) => MeasureScale
}

/** ColorBrewer RdBu, 7 classes: deficit red, surplus blue, the middle neutral. */
const DIVERGING = ['#b2182b', '#ef8a62', '#fddbc7', '#e7e5e4', '#d1e5f0', '#67a9cf', '#2166ac'] as const
/**
 * The totals in the balance's own family: income on its blue arm (money in,
 * as a surplus is), expenses on its red arm (money out, as a deficit is), so
 * the three maps speak one colour language.
 *
 * Five classes cut at percentiles (`TOTAL_PERCENTILES`), not seven equal ones:
 * equal classes gave each colour a seventh of the country, so either the dark
 * end covered a third of it (too strong) or nothing stood out (too pale). Here
 * half the primării share one light tint and each class above is clearly
 * stronger, to the top 3% in the arm's deep end — the tops read at a glance.
 * Steps interpolated in Lab along RdBu's anchors (`d3-interpolate`).
 */
const INCOME_RAMP = ['#e8f2f7', '#b2d5e7', '#599fca', '#256aae', '#0b3d73'] as const
const EXPENSES_RAMP = ['#fdede3', '#fac0a4', '#de725a', '#b6232e', '#7a0f24'] as const
/** Where the totals' classes part: the bottom half, to 75%, to 90%, to 97%, the top 3%. */
const TOTAL_PERCENTILES = [0.5, 0.75, 0.9, 0.97] as const

/** In percent of income. */
const BALANCE_EDGES = [-20, -10, -3, 3, 10, 20] as const

const compactRo = new Intl.NumberFormat('ro-RO', { notation: 'compact', maximumFractionDigits: 1 })
const decimalRo = new Intl.NumberFormat('ro-RO', { maximumFractionDigits: 1 })
const percent = new Intl.NumberFormat('ro-RO', { maximumFractionDigits: 1, signDisplay: 'exceptZero' })

/** A typographic minus: a hyphen reads as a dash beside a range's own. */
const minus = (text: string) => text.replace(/^-/, '−')

/**
 * A short amount: `mii` for thousands, as Romanian writes it (the compact
 * notation's own `K` reads as English), `mil.` and `mld.` above.
 */
function compactParts(value: number): { readonly number: string; readonly suffix: string } {
  const size = Math.abs(value)
  if (size < 1e3) return { number: decimalRo.format(value), suffix: '' }
  if (size < 1e6) return { number: decimalRo.format(value / 1e3), suffix: 'mii' }
  const [number = '', suffix = ''] = compactRo.format(value).split(/\s+/)
  return { number, suffix }
}
/** An amount rounded as `compactParts` prints it: one decimal of its thousands, millions or billions. */
export function asPrinted(value: number): number {
  const size = Math.abs(value)
  const step = size < 1e3 ? 0.1 : size < 1e6 ? 1e2 : size < 1e9 ? 1e5 : 1e8
  return Math.round(value / step) * step
}
const compact = (value: number) => {
  const { number, suffix } = compactParts(value)
  return suffix ? `${number}\u00a0${suffix}` : number
}

export function formatLei(value: number | null): string {
  return value === null ? '—' : `${minus(compact(value))} lei`
}

/** A share (0.081) as a percent: „−8,1%". */
export function formatShare(value: number | null): string {
  return formatPercent(value === null ? null : value * 100)
}

/** A figure already in percent: „−8,1%". */
export function formatPercent(value: number | null): string {
  return value === null ? '—' : `${minus(percent.format(value))}%`
}

/** The class of `value` among ascending `edges`: 0 below the first, `edges.length` from the last up. */
export function classAmong(edges: readonly number[], value: number | null): number | null {
  if (value === null) return null
  let k = 0
  while (k < edges.length && value >= edges[k]!) k += 1
  return k
}

/** The values at these shares of the way through the values present, ascending: where classes part. */
export function percentileEdges(values: readonly (number | null)[], shares: readonly number[]): readonly number[] {
  const sorted = values.filter((value): value is number => value !== null).sort((a, b) => a - b)
  if (sorted.length === 0) return []
  return shares.map((share) => sorted[Math.min(sorted.length - 1, Math.floor(share * sorted.length))]!)
}

/**
 * The classes between ascending `edges`, labelled by the design rule. A range
 * whose two ends share a suffix names it once: „5,2 – sub 8,1 mil.".
 */
export function classesBetween(edges: readonly number[], colors: readonly string[], parts: (value: number) => { readonly number: string; readonly suffix: string }): MeasureClass[] {
  const word = ({ number, suffix }: { number: string; suffix: string }) => minus(suffix ? `${number}\u00a0${suffix}` : number)
  return colors.map((color, i) => {
    const from = i === 0 ? null : edges[i - 1]!
    const to = i === edges.length ? null : edges[i]!
    let label: string
    if (from === null) label = `sub ${word(parts(to!))}`
    else if (to === null) label = `${word(parts(from))} sau mai mult`
    else {
      const [a, b] = [parts(from), parts(to)]
      label = a.suffix === b.suffix ? `${minus(a.number)} – sub ${word(b)}` : `${word(a)} – sub ${word(b)}`
    }
    return { color, label, from, to }
  })
}

function totalMeasure(id: 'income' | 'expenses', title: string, description: string, ramp: readonly string[]): Measure {
  return {
    id,
    title,
    description,
    group: 'Buget',
    ramp,
    unit: 'lei',
    note: '',
    value: (figures) => figures?.[id] ?? null,
    format: formatLei,
    scale: (values) => {
      // Classified on the edges as the labels print them, so a colour never contradicts its words;
      // equal edges merge (no empty „X – sub X" class); the strongest colours are the ones kept.
      const edges = [...new Set(percentileEdges(values, TOTAL_PERCENTILES).map(asPrinted))]
      if (edges.length === 0) return { classes: [], classOf: () => null }
      return { classes: classesBetween(edges, ramp.slice(ramp.length - edges.length - 1), compactParts), classOf: (value) => classAmong(edges, value) }
    },
  }
}

const BALANCE_SCALE: MeasureScale = {
  classes: classesBetween(BALANCE_EDGES, DIVERGING, (value) => ({ number: decimalRo.format(value), suffix: '' })),
  classOf: (value) => classAmong(BALANCE_EDGES, value),
  ends: { below: 'Deficit', above: 'Excedent' },
}

export const MEASURES: readonly Measure[] = [
  {
    id: 'balance',
    title: 'Sold bugetar',
    description: 'Venituri minus cheltuieli, ca procent din venituri',
    group: 'Buget',
    ramp: DIVERGING,
    unit: '% din venituri',
    note: 'Soldul este diferența dintre venituri și cheltuieli, raportată la venituri.',
    // In percent, as the classes are: one unit from the value to the legend.
    value: (figures) => {
      if (!figures || figures.income === null || figures.expenses === null || figures.income <= 0) return null
      return ((figures.income - figures.expenses) / figures.income) * 100
    },
    format: formatPercent,
    scale: () => BALANCE_SCALE,
  },
  totalMeasure('income', 'Venituri totale', `Tot ce a încasat primăria în ${BUDGET_YEAR}, în lei`, INCOME_RAMP),
  totalMeasure('expenses', 'Cheltuieli totale', `Tot ce a cheltuit primăria în ${BUDGET_YEAR}, în lei`, EXPENSES_RAMP),
]

const integerRo = new Intl.NumberFormat('ro-RO')

/** „1 primărie", „6 primării", „20 de primării": Romanian puts „de" from twenty up (and at 100, 200…). */
export function primarii(count: number): string {
  if (count === 1) return '1 primărie'
  const tail = count % 100
  return tail === 0 || tail >= 20 ? `${integerRo.format(count)} de primării` : `${integerRo.format(count)} primării`
}

/** Where a value sits along a legend bar of the scale's classes, 0 to 1; mid-class at an open end. */
export function positionOnScale(scale: MeasureScale, value: number | null): number | null {
  const k = scale.classOf(value)
  if (k === null || value === null) return null
  const { from, to } = scale.classes[k]!
  const within = from === null || to === null || to === from ? 0.5 : Math.min(1, Math.max(0, (value - from) / (to - from)))
  return (k + within) / scale.classes.length
}

export function measureById(id: MeasureId): Measure {
  return MEASURES.find((measure) => measure.id === id) ?? MEASURES[0]!
}

export const NO_DATA_COLOR = '#a8a29e'

/** How many UATs have a figure, of all of them. */
export function coverageOf(values: readonly (number | null)[]): { readonly withData: number; readonly total: number } {
  return { withData: values.filter((value) => value !== null).length, total: values.length }
}

/** A measure's value per UAT, aligned with `siruta`. */
export function measureValues(measure: Measure, siruta: readonly string[], figures: ReadonlyMap<string, BudgetFigures>): readonly (number | null)[] {
  return siruta.map((code) => measure.value(figures.get(code)))
}

const KIND_PREFIX: Readonly<Record<string, string>> = {
  comuna: 'Comuna',
  oras: 'Orașul',
  municipiu: 'Municipiul',
  resedinta: 'Municipiul',
  capitala: 'Municipiul',
}

export function uatTitle(name: string, kind: string | undefined) {
  const prefix = kind ? KIND_PREFIX[kind] : undefined
  return prefix ? `${prefix} ${name}` : name
}

/** Time from navigation start to a variant's first full drawing, for the readout. */
export function markDrawn(variant: string) {
  if (typeof performance === 'undefined') return
  const name = `budget-map:${variant}:drawn`
  if (performance.getEntriesByName(name).length > 0) return
  performance.mark(name)
  ;(window as unknown as { __budgetMapDrawn?: Record<string, number> }).__budgetMapDrawn ??= {}
  ;(window as unknown as { __budgetMapDrawn: Record<string, number> }).__budgetMapDrawn[variant] = performance.now()
}
