/**
 * The national budget at one person's scale: every amount the citizens' page
 * reads, divided by the resident population on 1 January of its year. The
 * reads are the page's own (the MF bulletins for the whole public purse, ANAF
 * for the state budget's domains and ministries); only the division is new.
 */
import { useQueryClient, useSuspenseQuery } from '@tanstack/react-query'

import { observationsOptions, useNationalCatalog } from '@/features/national-budget/analytics/hooks/use-national-budget-analytics'
import { useAnafAuthorities, useAnafChapterYears, useTotalsHistory, useYearLines } from '@/features/national-budget/home/hooks/use-home-data'
import { REVENUE_PARTS, SPENDING_PARTS, TOTAL_ITEMS, anafTotal, gdpOf, yearTotalsOf, yearViews, type YearView } from '@/features/national-budget/home/lib/home-data'
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

/** The word after a whole number of lei: „1 leu", „18 lei", „21 de lei". */
export function leiWord(lei: number): string {
  if (lei === 1) return 'leu'
  const tail = lei % 100
  return lei === 0 || (tail >= 1 && tail <= 19) ? 'lei' : 'de lei'
}

/** The figure alone, whole lei: „42.467". */
export function leiNumber(lei: number | null): string {
  return lei === null ? '—' : formatHubNumber(Math.round(lei))
}

/** „+12%" from two amounts, whole percent; null when either is missing. */
export function changeOf(now: number | null, before: number | null): string | null {
  if (now === null || before === null || before === 0) return null
  const change = (now / before - 1) * 100
  // A change that rounds to nothing is said as „0%", never „−0,0%".
  if (Math.abs(change) < 0.05) return '0%'
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

// ─────────────────────────────────────────────────────── out of a hundred ──

/** Whole lei out of 100 (or of `whole`) by the largest remainder, so they always make exactly that. */
export function outOfHundred(values: readonly number[], whole = 100): readonly number[] {
  const total = values.reduce((sum, value) => sum + Math.max(value, 0), 0) || 1
  const exact = values.map((value) => (Math.max(value, 0) / total) * whole)
  const floors = exact.map(Math.floor)
  let left = whole - floors.reduce((sum, value) => sum + value, 0)
  const order = exact.map((value, index) => ({ index, remainder: value - Math.floor(value) })).sort((a, b) => b.remainder - a.remainder)
  for (const { index } of order) {
    if (left <= 0) break
    floors[index]! += 1
    left -= 1
  }
  return floors
}

const REST_LINE = {
  spending: { label: 'Alte cheltuieli', hint: 'proiecte PNRR din împrumuturi, active financiare, rambursări, alte cheltuieli' },
  revenue: { label: 'Alte venituri', hint: 'taxe vamale, alte impozite, venituri din capital, alte sume de la UE' },
}

export type HundredLine = { readonly key: string; readonly label: string; readonly hint: string | null; readonly exact: string; readonly lei: number; readonly change: string | null; readonly rest?: boolean }

/**
 * A printed total and its named lines as lei out of every 100: the official
 * amounts (exact, for the figures), each line's whole lei of 100 (they make
 * 100 with „the rest"), and the change on the same window a year earlier.
 */
export function useHundred(view: YearView, side: 'spending' | 'revenue') {
  const total = side === 'spending' ? TOTAL_ITEMS.spending : TOTAL_ITEMS.revenue
  const items: readonly string[] = side === 'spending' ? SPENDING_PARTS : REVENUE_PARTS
  const lines = useYearLines(view, [total, ...items])
  const whole = lines.now(total)?.exact ?? null
  if (!whole) return { whole: null, before: null, lines: [] as readonly HundredLine[] }
  const named = items
    .flatMap((itemId) => {
      const exact = lines.now(itemId)?.exact
      if (!exact) return []
      const before = lines.before(itemId)?.exact
      return [{ key: itemId, label: partName(itemId), hint: partHint(itemId), exact, change: changeOf(Number(exact), before ? Number(before) : null) }]
    })
    .sort((a, b) => Number(b.exact) - Number(a.exact))
  const restExact = (Number(whole) - named.reduce((sum, line) => sum + Number(line.exact), 0)).toFixed(2)
  const withRest = Number(restExact) / Number(whole) > 0.005 ? [...named, { key: 'rest', ...REST_LINE[side], exact: restExact, change: null, rest: true }] : named
  const hundreds = outOfHundred(withRest.map((line) => Number(line.exact)))
  return {
    whole,
    before: lines.before(total)?.exact ?? null,
    lines: withRest.map((line, index): HundredLine => ({ ...line, lei: hundreds[index] ?? 0 })),
  }
}

/** The year's totals as printed, and how many lei of every 100 spent were borrowed (and came from revenue). */
export function useOfficialTotals(view: YearView) {
  const lines = useYearLines(view, [TOTAL_ITEMS.revenue, TOTAL_ITEMS.spending, TOTAL_ITEMS.balance])
  const spending = lines.now(TOTAL_ITEMS.spending)?.exact ?? null
  const revenue = lines.now(TOTAL_ITEMS.revenue)?.exact ?? null
  const balance = lines.now(TOTAL_ITEMS.balance)?.exact ?? null
  const deficit = balance !== null && Number(balance) < 0 ? (-Number(balance)).toFixed(2) : null
  const [fromRevenue, borrowed] = spending && revenue && deficit ? outOfHundred([Number(revenue), Number(deficit)]) : [100, 0]
  const at = (itemId: string) => lines.now(itemId)?.exact ?? null
  const was = (itemId: string) => lines.before(itemId)?.exact ?? null
  return {
    spending,
    revenue,
    balance,
    deficit,
    fromRevenue: fromRevenue ?? 100,
    borrowed: borrowed ?? 0,
    spendingChange: changeOf(Number(at(TOTAL_ITEMS.spending)), was(TOTAL_ITEMS.spending) ? Number(was(TOTAL_ITEMS.spending)) : null),
    revenueChange: changeOf(Number(at(TOTAL_ITEMS.revenue)), was(TOTAL_ITEMS.revenue) ? Number(was(TOTAL_ITEMS.revenue)) : null),
    deficitBefore: was(TOTAL_ITEMS.balance),
  }
}

// ───────────────────────────────────────────────────── the state budget ──

export type StateLine = { readonly key: string; readonly label: string; readonly exact: string; readonly lei: number; readonly change: string | null }

/** Rows of the state budget's payments as lei out of every 100 paid, the largest first, each with its change on the year before. */
function stateLines(rows: readonly { readonly key: string; readonly label: string; readonly exact: string }[], before: ReadonlyMap<string, string>): readonly StateLine[] {
  const sorted = [...rows].sort((a, b) => Number(b.exact) - Number(a.exact))
  const hundreds = outOfHundred(sorted.map((row) => Number(row.exact)))
  return sorted.map((row, index) => {
    const was = before.get(row.key)
    return { ...row, lei: hundreds[index] ?? 0, change: changeOf(Number(row.exact), was ? Number(was) : null) }
  })
}

/** The state budget's payments (ANAF) by functional chapter and by principal authority; only for a year ANAF covers. */
export function useStateBudget(view: YearView) {
  const chapters = useAnafChapterYears(view)
  const authorities = useAnafAuthorities(view)
  const whole = anafTotal(chapters.now)
  const wholeBefore = chapters.before ? anafTotal(chapters.before) : null
  return {
    whole,
    change: changeOf(Number(whole), wholeBefore ? Number(wholeBefore) : null),
    domains: stateLines(
      chapters.now.map((chapter) => ({ key: chapter.code, label: chapterName(chapter.code), exact: chapter.lei })),
      new Map((chapters.before ?? []).map((chapter) => [chapter.code, chapter.lei])),
    ),
    authorities: stateLines(
      authorities.now.map((row) => ({ key: row.cui, label: authorityName(row.cui, row.name), exact: row.lei })),
      new Map((authorities.before ?? []).map((row) => [row.cui, row.lei])),
    ),
  }
}

// ─────────────────────────────────────────────────── borrowing, by year ──

/**
 * Annual GDP at current prices, million lei (INS, Tempo CON111B; read from
 * Eurostat `nama_10_gdp`, B1GQ, CP_MNAC, updated 24 November 2026; 2025 is
 * provisional and is the landing page's figure). A prototype's table: the
 * live page needs this series served, with its vintage.
 */
const GDP_MILLION_LEI: Readonly<Record<number, number>> = {
  2006: 342_762.6,
  2007: 425_691.1,
  2008: 539_831.4,
  2009: 530_919.6,
  2010: 540_447.5,
  2011: 587_235.0,
  2012: 621_214.7,
  2013: 631_634.0,
  2014: 668_905.0,
  2015: 712_548.6,
  2016: 752_129.1,
  2017: 851_620.6,
  2018: 952_385.3,
  2019: 1_053_192.3,
  2020: 1_056_302.0,
  2021: 1_179_828.6,
  2022: 1_378_461.4,
  2023: 1_587_956.5,
  2024: 1_767_517.1,
  2025: 1_929_930.0,
}

export type BorrowedYear = {
  readonly year: number
  /** The year in progress: January to the newest bulletin. */
  readonly partial: boolean
  /** The deficit as printed, positive; null in a surplus or without an answer. */
  readonly deficit: string | null
  /** The deficit's share of GDP, a fraction without its sign; null where neither the share nor the GDP is printed. */
  readonly gdpShare: string | null
  /** Where the share comes from: printed in the year's bulletin, or the printed deficit over the year's GDP (INS). */
  readonly gdpShareFrom: 'printed' | 'computed' | null
  /** Whole lei of every 100 spent that were borrowed (the hero's figure for the year). */
  readonly lei: number | null
}

/**
 * Every year the page offers, oldest first, and the year in progress: the
 * deficit as printed, and its share of GDP. The share is the one the year's
 * own bulletin prints (one read for all the years); the bulletins before
 * 2019, and 2023's, print none, and neither do they print the GDP, so for
 * those years it is the printed deficit over the annual GDP below, and the
 * page says which years those are.
 */
export function useBorrowedYears(): readonly BorrowedYear[] {
  const { yearCells, complete } = useTotalsHistory()
  const catalog = useNationalCatalog()
  const client = useQueryClient()
  const views = yearViews(catalog).filter((view) => populationOf(view.year) !== null)
  const { data: shares } = useSuspenseQuery(
    observationsOptions(client, catalog.snapshots.execution, { months: views.map((view) => view.month), measures: ['GDP_SHARE'], lineItems: ['excedent(+) / deficit(-)'] }),
  )
  const first = Number(catalog.execution.coverage.firstMonth.slice(0, 4))
  // The year in progress has no finished year's totals: its own are read (the newest view is it, or the newest full year).
  const running = useOfficialTotals(views[views.length - 1]!)
  const totals = new Map(yearTotalsOf(yearCells, first, complete).map((row) => [row.year, row]))
  return views.map((view): BorrowedYear => {
    const row = view.partial ? { revenue: running.revenue, spending: running.spending, balance: running.balance } : totals.get(view.year)
    const printed = gdpOf({ catalog, shares: shares.rows.filter((entry) => entry.month === view.month), denominators: [], year: view.year }).share(TOTAL_ITEMS.balance)
    const known = row?.revenue && row.spending && row.balance !== null ? row : null
    const deficit = known ? Math.max(0, -Number(known.balance)) : null
    // The bulletin's own share where it prints one; else, for a finished year, the printed deficit over the year's GDP.
    const gdp = view.partial ? undefined : GDP_MILLION_LEI[view.year]
    const computed = printed === null && deficit !== null && gdp ? (deficit / (gdp * 1e6)).toFixed(6) : null
    return {
      year: view.year,
      partial: view.partial,
      deficit: deficit ? deficit.toFixed(2) : null,
      gdpShare: printed !== null ? printed.replace(/^-/u, '') : computed,
      gdpShareFrom: printed !== null ? 'printed' : computed !== null ? 'computed' : null,
      lei: known && deficit !== null ? (outOfHundred([Number(known.revenue), deficit])[1] ?? 0) : null,
    }
  })
}

// ──────────────────────────────────────────────── the year, month by month ──

/** The deficit from January to the end of a month, as that month's bulletin prints it; null where it prints none. */
export type MonthPoint = {
  /** 1 to 12. */
  readonly month: number
  /** Lei, positive for a deficit, negative for a surplus. */
  readonly deficit: number | null
  /** The bulletin's share of the year's GDP, a fraction, signed as `deficit`. */
  readonly gdpShare: number | null
}

export type RunningYear = { readonly year: number; readonly points: readonly MonthPoint[] }

/**
 * The newest year the bulletins cover (the year in progress, to its newest
 * month) and the year before it, whole: the consolidated budget's deficit
 * from January to each month, in lei and as the share of GDP each bulletin
 * prints. One read for both years.
 */
export function useYearSoFar(newest: YearView): { readonly now: RunningYear; readonly before: RunningYear } {
  const catalog = useNationalCatalog()
  const client = useQueryClient()
  const monthsOfYear = (year: number, count: number) => Array.from({ length: count }, (_, index) => `${year}-${String(index + 1).padStart(2, '0')}`)
  const { data } = useSuspenseQuery(
    observationsOptions(client, catalog.snapshots.execution, {
      months: [...monthsOfYear(newest.year - 1, 12), ...monthsOfYear(newest.year, monthsOf(newest))],
      components: ['general_consolidated_budget'],
      sections: ['BALANCE'],
      lineItems: ['excedent(+) / deficit(-)'],
      measures: ['AMOUNT', 'GDP_SHARE'],
    }),
  )
  const printed = new Map<string, number>()
  for (const row of data.rows) {
    if (row.disposition !== 'FACT' || row.value === null) continue
    printed.set(`${row.month} ${row.measure}`, -Number(row.value))
  }
  const yearOf = (year: number, count: number): RunningYear => ({
    year,
    points: monthsOfYear(year, count).map((month, index) => ({
      month: index + 1,
      deficit: printed.get(`${month} AMOUNT`) ?? null,
      gdpShare: printed.get(`${month} GDP_SHARE`) ?? null,
    })),
  })
  return { now: yearOf(newest.year, monthsOf(newest)), before: yearOf(newest.year - 1, 12) }
}
