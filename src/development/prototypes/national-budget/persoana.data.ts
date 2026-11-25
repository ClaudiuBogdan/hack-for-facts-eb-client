/**
 * The national budget at one person's scale: every amount the citizens' page
 * reads, divided by the resident population on 1 January of its year. The
 * reads are the page's own (the MF bulletins for the whole public purse, ANAF
 * for the state budget's domains and ministries); only the division is new.
 */
import { useNationalCatalog } from '@/features/national-budget/analytics/hooks/use-national-budget-analytics'
import { useAnafAuthorities, useAnafChapterYears, useTotalsHistory, useYearLines } from '@/features/national-budget/home/hooks/use-home-data'
import { REVENUE_PARTS, SPENDING_PARTS, TOTAL_ITEMS, anafTotal, yearTotalsOf, yearViews, type YearView } from '@/features/national-budget/home/lib/home-data'
import { authorityName, chapterName, partHint, partName } from '@/features/national-budget/home/lib/home-format'
import { formatHubNumber } from '@/features/private-companies/lib/hub-format'

/**
 * Resident population on 1 January (INS, Tempo POP105A; Eurostat `demo_gind`
 * JAN carries the same figures, read 25 November 2026). 2026 is provisional.
 * A year is divided by the population at its own 1 January.
 */
const POPULATION: Readonly<Record<number, number>> = {
  2006: 21_257_016,
  2007: 21_130_503,
  2008: 20_635_460,
  2009: 20_440_290,
  2010: 20_294_683,
  2011: 20_199_059,
  2012: 20_095_996,
  2013: 20_020_074,
  2014: 19_947_311,
  2015: 19_870_647,
  2016: 19_760_585,
  2017: 19_643_949,
  2018: 19_533_481,
  2019: 19_414_458,
  2020: 19_328_838,
  2021: 19_201_662,
  2022: 19_043_098,
  2023: 19_055_228,
  2024: 19_067_576,
  2025: 19_043_151,
  2026: 19_041_322,
}

export function populationOf(year: number): number | null {
  return POPULATION[year] ?? null
}

/** Millions with two decimals: „19,04 mil.". */
export function populationText(year: number): string | null {
  const people = populationOf(year)
  return people === null ? null : `${formatHubNumber(people / 1_000_000, { digits: 2 })} mil.`
}

/** The unit a variant speaks in: lei a year (or so far this year), or lei a month. */
export type Unit = 'year' | 'month'

/** How many months the view's amounts cover: 12, or January to the newest bulletin. */
export function monthsOf(view: YearView): number {
  return view.partial ? Number(view.month.slice(5, 7)) : 12
}

/** Lei per person (per month when asked), unrounded; null without an amount or a population. */
export function perPerson(exact: string | null | undefined, view: YearView, unit: Unit = 'year'): number | null {
  const people = populationOf(view.year)
  if (!exact || people === null) return null
  const lei = Number(exact) / people
  return unit === 'month' ? lei / monthsOf(view) : lei
}

/** „42.467 lei", whole lei. */
export function leiText(lei: number | null): string {
  return lei === null ? '—' : `${formatHubNumber(Math.round(lei))}\u00a0lei`
}

/** The figure alone, whole lei: „42.467". */
export function leiNumber(lei: number | null): string {
  return lei === null ? '—' : formatHubNumber(Math.round(lei))
}

/** „+12%" from two amounts, whole percent; null when either is missing. */
export function changeOf(now: number | null, before: number | null): string | null {
  if (now === null || before === null || before === 0) return null
  const change = (now / before - 1) * 100
  const text = formatHubNumber(Math.abs(change), { digits: Math.abs(change) < 10 ? 1 : 0 })
  return `${change >= 0 ? '+' : '−'}${text}%`
}

// ─────────────────────────────────────────────────────────────── the year ──

/** The years a reader can pick: the full years with a population, newest first, then the year in progress. */
export function usePersonYears() {
  const catalog = useNationalCatalog()
  const views = yearViews(catalog).filter((view) => populationOf(view.year) !== null)
  return [...views].reverse()
}

// ───────────────────────────────────────────────────────────── the reads ──

export type PersonLine = {
  readonly key: string
  readonly label: string
  readonly hint: string | null
  /** Lei per person in the unit asked. */
  readonly lei: number
  /** The share of the whole, 0–1. */
  readonly share: number
  readonly change: string | null
  readonly rest?: boolean
}

/** A total and its named lines, per person, ranked; „the rest" of the printed total last. */
function linesOf({
  view,
  unit,
  total,
  items,
  rest,
  now,
  before,
}: {
  readonly view: YearView
  readonly unit: Unit
  readonly total: string
  readonly items: readonly string[]
  readonly rest: { readonly label: string; readonly hint: string }
  readonly now: (itemId: string) => string | null
  readonly before: (itemId: string) => string | null
}) {
  const whole = perPerson(now(total), view, unit)
  if (whole === null) return { whole: null, lines: [] as readonly PersonLine[] }
  const previousView = { ...view, year: view.year - 1 }
  const named = items.flatMap((itemId): PersonLine[] => {
    const lei = perPerson(now(itemId), view, unit)
    if (lei === null) return []
    return [{ key: itemId, label: partName(itemId), hint: partHint(itemId), lei, share: lei / whole, change: changeOf(lei, perPerson(before(itemId), previousView, unit)) }]
  })
  named.sort((a, b) => b.lei - a.lei)
  const left = whole - named.reduce((sum, line) => sum + line.lei, 0)
  const lines = left / whole > 0.005 ? [...named, { key: 'rest', label: rest.label, hint: rest.hint, lei: left, share: left / whole, change: null, rest: true }] : named
  return { whole, lines }
}

/** The year's three totals, per person; the balance as the bulletin prints it (negative is a deficit). */
export function usePersonTotals(view: YearView, unit: Unit = 'year') {
  const lines = useYearLines(view, [TOTAL_ITEMS.revenue, TOTAL_ITEMS.spending, TOTAL_ITEMS.balance])
  const previousView = { ...view, year: view.year - 1 }
  const at = (itemId: string) => perPerson(lines.now(itemId)?.exact, view, unit)
  const was = (itemId: string) => perPerson(lines.before(itemId)?.exact, previousView, unit)
  return {
    spending: at(TOTAL_ITEMS.spending),
    revenue: at(TOTAL_ITEMS.revenue),
    balance: at(TOTAL_ITEMS.balance),
    spendingBefore: was(TOTAL_ITEMS.spending),
    revenueBefore: was(TOTAL_ITEMS.revenue),
    balanceBefore: was(TOTAL_ITEMS.balance),
    spendingExact: lines.now(TOTAL_ITEMS.spending)?.exact ?? null,
  }
}

export function usePersonSpending(view: YearView, unit: Unit = 'year') {
  const lines = useYearLines(view, [TOTAL_ITEMS.spending, ...SPENDING_PARTS])
  return linesOf({
    view,
    unit,
    total: TOTAL_ITEMS.spending,
    items: SPENDING_PARTS,
    rest: { label: 'Alte cheltuieli', hint: 'proiecte PNRR din împrumuturi, active financiare, rambursări, alte cheltuieli' },
    now: (itemId) => lines.now(itemId)?.exact ?? null,
    before: (itemId) => lines.before(itemId)?.exact ?? null,
  })
}

export function usePersonRevenue(view: YearView, unit: Unit = 'year') {
  const lines = useYearLines(view, [TOTAL_ITEMS.revenue, ...REVENUE_PARTS])
  return linesOf({
    view,
    unit,
    total: TOTAL_ITEMS.revenue,
    items: REVENUE_PARTS,
    rest: { label: 'Alte venituri', hint: 'taxe vamale, alte impozite, venituri din capital, alte sume de la UE' },
    now: (itemId) => lines.now(itemId)?.exact ?? null,
    before: (itemId) => lines.before(itemId)?.exact ?? null,
  })
}

export type PersonEntry = { readonly key: string; readonly label: string; readonly lei: number; readonly share: number; readonly change: string | null }

/** The state budget's payments by functional chapter (ANAF), per person, the largest first; `top` named and the rest summed. */
export function usePersonDomains(view: YearView, unit: Unit = 'year', top = 9) {
  const { now, before } = useAnafChapterYears(view)
  const previousView = { ...view, year: view.year - 1 }
  const whole = perPerson(anafTotal(now), view, unit)
  const wasByCode = new Map((before ?? []).map((chapter) => [chapter.code, perPerson(chapter.lei, previousView, unit)]))
  const entries = now.map((chapter): PersonEntry => {
    const lei = perPerson(chapter.lei, view, unit) ?? 0
    return { key: chapter.code, label: chapterName(chapter.code), lei, share: whole ? lei / whole : 0, change: changeOf(lei, wasByCode.get(chapter.code) ?? null) }
  })
  const shown = entries.slice(0, top)
  const left = entries.slice(top).reduce((sum, entry) => sum + entry.lei, 0)
  return {
    whole,
    entries: left > 0 ? [...shown, { key: 'rest', label: 'Alte domenii', lei: left, share: whole ? left / whole : 0, change: null }] : shown,
    count: entries.length,
  }
}

/** The principal authorities' payments (ANAF), per person, the largest first. */
export function usePersonMinistries(view: YearView, unit: Unit = 'year') {
  const { now, before } = useAnafAuthorities(view)
  const previousView = { ...view, year: view.year - 1 }
  const whole = perPerson(anafTotal(now), view, unit)
  const wasByCui = new Map((before ?? []).map((row) => [row.cui, perPerson(row.lei, previousView, unit)]))
  const entries = now.map((row): PersonEntry & { readonly cui: string } => {
    const lei = perPerson(row.lei, view, unit) ?? 0
    return { key: row.cui, cui: row.cui, label: authorityName(row.cui, row.name), lei, share: whole ? lei / whole : 0, change: changeOf(lei, wasByCui.get(row.cui) ?? null) }
  })
  return { whole, entries, count: entries.length }
}

export type PersonYearTotals = { readonly year: number; readonly spending: number | null; readonly revenue: number | null; readonly borrowed: number | null }

/** Every full year the bulletins finish, per person (a year's lei over its own population, in that year's lei). */
export function usePersonHistory(unit: Unit = 'year') {
  const { yearCells, complete } = useTotalsHistory()
  const catalog = useNationalCatalog()
  const first = Number(catalog.execution.coverage.firstMonth.slice(0, 4))
  const per = (exact: string | null, year: number) => {
    const people = populationOf(year)
    if (!exact || people === null) return null
    return Number(exact) / people / (unit === 'month' ? 12 : 1)
  }
  return yearTotalsOf(yearCells, first, complete)
    .filter((row) => populationOf(row.year) !== null)
    .map(
      (row): PersonYearTotals => ({
        year: row.year,
        spending: per(row.spending, row.year),
        revenue: per(row.revenue, row.year),
        // The bulletin prints the balance; a deficit is borrowed, so it is said as a positive amount.
        borrowed: row.balance === null ? null : Math.max(0, -(per(row.balance, row.year) ?? 0)),
      }),
    )
}

/** The newest view: the year in progress if there is one, else the newest full year. */
export function useNewestView(): YearView {
  const catalog = useNationalCatalog()
  const views = yearViews(catalog)
  return views[views.length - 1]!
}
