import { msg } from '@lingui/core/macro'
import type { MessageDescriptor } from '@lingui/core'
import { asPrinted, compactParts, formatAmount, formatPercent, joinParts, percentAsPrinted } from './budget-map-format'
import type { NumberLocale } from './national-facts'

/**
 * The maps the landing's budget map offers, and what their colours mean.
 * Pure: switching maps recomputes values → scale → fills, legend and labels
 * from the measure; nothing is kept between switches.
 *
 * Words are `msg` descriptors resolved at render (this module is evaluated once
 * per process and answers every locale). The decisions behind the colours are
 * in `docs/design/landing/design.md` §Budget map.
 */

/** The year every map shows: the last whole year of execution. */
export const BUDGET_YEAR = '2025'

export type MeasureId = 'balance' | 'income' | 'expenses'

export interface BudgetFigures {
  readonly income: number | null
  readonly expenses: number | null
}

export interface MeasureClass {
  readonly color: string
  /** The class's bounds, in the measure's unit; null at an open end. It holds `from`, not `to`. */
  readonly from: number | null
  readonly to: number | null
}

/** A measure's colours for one set of values: the classes on the legend's bar, and where a value falls. */
export interface MeasureScale {
  readonly classes: readonly MeasureClass[]
  readonly classOf: (value: number | null) => number | null
}

export interface Measure {
  readonly id: MeasureId
  /** The picker's, the legend's and the tooltip's name for it. */
  readonly title: MessageDescriptor
  /** What it is, in one line, under its name in the picker. */
  readonly description: MessageDescriptor
  /** The picker's heading it sits under, once there are several. */
  readonly group: MessageDescriptor
  /** What the legend bar's two ends mean, where the colours part at a middle (deficit and surplus). */
  readonly ends?: { readonly below: MessageDescriptor; readonly above: MessageDescriptor }
  /** Its colours, one end to the other: the picker's preview of the map. */
  readonly ramp: readonly string[]
  /** The figure the colour is drawn from, or null where there is none. */
  readonly value: (figures: BudgetFigures | undefined) => number | null
  /** The figure with its unit, as a map label and the tooltip print it. */
  readonly format: (value: number | null, locale: NumberLocale) => string
  /** A boundary between two colours, as the legend prints it under the join: short, the unit said once above. */
  readonly tick: (value: number, locale: NumberLocale) => string
  /** The colours for these values (percentile measures need all of them). */
  readonly scale: (values: readonly (number | null)[]) => MeasureScale
}

export const NO_DATA_COLOR = '#a8a29e'

/** ColorBrewer RdBu, 7 classes: deficit red, surplus blue, the middle neutral. */
const DIVERGING = ['#b2182b', '#ef8a62', '#fddbc7', '#e7e5e4', '#d1e5f0', '#67a9cf', '#2166ac'] as const
/** In percent of income. */
const BALANCE_EDGES = [-20, -10, -3, 3, 10, 20] as const

/**
 * The totals on RdBu's blue arm (income: money in, as a surplus is) and red
 * arm (expenses: money out, as a deficit is), in five classes cut at
 * percentiles: half the primării share one light tint and each class above is
 * clearly stronger, to the top 3% in the arm's deep end. Interpolated in Lab
 * along RdBu's anchors (`d3-interpolate`).
 */
const INCOME_RAMP = ['#e8f2f7', '#b2d5e7', '#599fca', '#256aae', '#0b3d73'] as const
const EXPENSES_RAMP = ['#fdede3', '#fac0a4', '#de725a', '#b6232e', '#7a0f24'] as const
/** Where the totals' classes part: the bottom half, to 75%, to 90%, to 97%, the top 3%. */
const TOTAL_PERCENTILES = [0.5, 0.75, 0.9, 0.97] as const

/** The class of `value` among ascending `edges`: 0 below the first, `edges.length` from the last up. */
export function classAmong(edges: readonly number[], value: number | null): number | null {
  if (value === null) return null
  let k = 0
  while (k < edges.length && value >= edges[k]!) k += 1
  return k
}

/** The values at these shares of the way through the values present, ascending. */
export function percentileEdges(values: readonly (number | null)[], shares: readonly number[]): readonly number[] {
  const sorted = values.filter((value): value is number => value !== null).sort((a, b) => a - b)
  if (sorted.length === 0) return []
  return shares.map((share) => sorted[Math.min(sorted.length - 1, Math.floor(share * sorted.length))]!)
}

function classesBetween(edges: readonly number[], colors: readonly string[]): MeasureClass[] {
  return colors.map((color, i) => ({ color, from: i === 0 ? null : edges[i - 1]!, to: i === edges.length ? null : edges[i]! }))
}

const BALANCE_SCALE: MeasureScale = {
  classes: classesBetween(BALANCE_EDGES, DIVERGING),
  // Classified as printed (one decimal): „−3%" is in the class from −3, never in the one below it.
  classOf: (value) => classAmong(BALANCE_EDGES, value === null ? null : percentAsPrinted(value)),
}

/**
 * A scale cut at the totals' percentiles, on the edges as the legend prints
 * them (`printed`), so a colour never contradicts its words. Equal edges merge
 * (no empty class); the strongest colours are the ones kept. The figure is
 * classified as printed too: „14 mil. lei" is never coloured below the 14 mil. edge.
 */
export function percentileScale(values: readonly (number | null)[], ramp: readonly string[], printed: (value: number) => number): MeasureScale {
  const edges = [...new Set(percentileEdges(values, TOTAL_PERCENTILES).map(printed))]
  if (edges.length === 0) return { classes: [], classOf: () => null }
  return {
    classes: classesBetween(edges, ramp.slice(ramp.length - edges.length - 1)),
    classOf: (value) => classAmong(edges, value === null ? null : printed(value)),
  }
}

function totalMeasure(id: 'income' | 'expenses', fields: Pick<Measure, 'title' | 'description' | 'ramp'>): Measure {
  return {
    id,
    ...fields,
    group: msg`Buget`,
    value: (figures) => figures?.[id] ?? null,
    format: formatAmount,
    // „14 mil.": the legend's first line already says „în lei".
    tick: (value, locale) => joinParts(compactParts(value, locale), locale),
    scale: (values) => percentileScale(values, fields.ramp, asPrinted),
  }
}

export const MEASURES: readonly Measure[] = [
  {
    id: 'balance',
    title: msg`Sold bugetar`,
    description: msg`Venituri minus cheltuieli, ca procent din venituri`,
    group: msg`Buget`,
    ends: { below: msg`Deficit`, above: msg`Excedent` },
    ramp: DIVERGING,
    // In percent, as the classes are: one unit from the value to the legend.
    value: (figures) => {
      if (!figures || figures.income === null || figures.expenses === null || figures.income <= 0) return null
      return ((figures.income - figures.expenses) / figures.income) * 100
    },
    format: formatPercent,
    tick: formatPercent,
    scale: () => BALANCE_SCALE,
  },
  totalMeasure('income', { title: msg`Venituri totale`, description: msg`Tot ce a încasat primăria în ${BUDGET_YEAR}, în lei`, ramp: INCOME_RAMP }),
  totalMeasure('expenses', { title: msg`Cheltuieli totale`, description: msg`Tot ce a cheltuit primăria în ${BUDGET_YEAR}, în lei`, ramp: EXPENSES_RAMP }),
]

/** The map in the address (`?harta=`), in Romanian like the app's other values; the balance, the default, leaves it out. */
const SEARCH_VALUE: Readonly<Record<MeasureId, string | undefined>> = { balance: undefined, income: 'venituri', expenses: 'cheltuieli' }

/** The map an address asks for; anything else, or nothing, is the default (`undefined`). */
export function measureFromSearch(value: unknown): MeasureId | undefined {
  const found = (Object.entries(SEARCH_VALUE) as [MeasureId, string | undefined][]).find(([, word]) => word !== undefined && word === value)
  return found?.[0]
}

/** The address's value for a map: none for the default. */
export function searchForMeasure(id: MeasureId): string | undefined {
  return SEARCH_VALUE[id]
}

export function measureById(id: MeasureId): Measure {
  return MEASURES.find((measure) => measure.id === id) ?? MEASURES[0]!
}

/** A measure's value per UAT, aligned with `siruta`. */
export function measureValues(measure: Measure, siruta: readonly string[], figures: ReadonlyMap<string, BudgetFigures>): readonly (number | null)[] {
  return siruta.map((code) => measure.value(figures.get(code)))
}

/** How many UATs have a figure, of all of them. */
export function coverageOf(values: readonly (number | null)[]): { readonly withData: number; readonly total: number } {
  return { withData: values.filter((value) => value !== null).length, total: values.length }
}

/** Where a value sits along a legend bar of the scale's classes, 0 to 1; mid-class at an open end. */
export function positionOnScale(scale: MeasureScale, value: number | null): number | null {
  const k = scale.classOf(value)
  if (k === null || value === null) return null
  const { from, to } = scale.classes[k]!
  const within = from === null || to === null || to === from ? 0.5 : Math.min(1, Math.max(0, (value - from) / (to - from)))
  return (k + within) / scale.classes.length
}
