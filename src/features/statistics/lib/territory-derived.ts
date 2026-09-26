import { msg, t } from '@lingui/core/macro'
import { i18n, type MessageDescriptor } from '@lingui/core'
import { activeNumberLocale } from './format'

/**
 * Indicators normalized by population for one locality — the definitions
 * and the arithmetic behind the territory page's „Indicatori raportați la
 * populație" (docs/design/statistics/design.md §6ah).
 *
 * The method, each rule for a reason:
 * - The population is by DOMICILE, always: the only annual series INS
 *   publishes for a locality, and the basis of its own county rates — the
 *   birth rate computed here for a county equals INS's POP202A.
 * - Events and annual averages over year t divide by the population on
 *   1 July of t (POP108D); stocks at 31 December t by 1 January t+1 (POP107D).
 * - Births, deaths and domicile moves read a three-year window for EVERY
 *   place: Σ events / Σ populations, a rate per year, never a mean of rates.
 *   Under 20 events in the window the rate is flagged; under 3 only the
 *   counts show. Migration is screened on arrivals + departures.
 * - The year is fixed by INS's latest release (Romania's data) before the
 *   place is read: a place missing that cell says so, never falls back.
 * - The locality, its county and Romania use the same formula, window and
 *   year: aggregate ratios, never a mean of the localities' rates.
 */

export type DerivedScope = 'place' | 'county' | 'country'

type Pin = { readonly dimensionIndex: number; readonly memberCode: string }
/** One matrix, pinned to the member the figure reads (Total, or a named subset). */
export type DerivedRead = { readonly code: string; readonly pins: readonly Pin[] }

const read = (code: string, pins: readonly Pin[] = []): DerivedRead => ({ code, pins })
const TOTAL_AGE_SEX: readonly Pin[] = [
  { dimensionIndex: 0, memberCode: '1' },
  { dimensionIndex: 1, memberCode: '105' },
]
const OWNERSHIP_TOTAL: readonly Pin[] = [{ dimensionIndex: 0, memberCode: '7388' }]
/** Population by domicile on 1 January. */
const POP_JAN = read('POP107D', TOTAL_AGE_SEX)
/** Population by domicile on 1 July. */
const POP_JUL = read('POP108D', TOTAL_AGE_SEX)

export type DerivedGroup = 'demografie' | 'economie' | 'locuire' | 'servicii' | 'turism'

export const DERIVED_GROUP_LABELS: Record<DerivedGroup, MessageDescriptor> = {
  demografie: msg`Demografie`,
  economie: msg`Economie`,
  locuire: msg`Locuire`,
  servicii: msg`Servicii publice`,
  turism: msg`Turism`,
}

type Denominator =
  | { readonly kind: 'population-jul' }
  | { readonly kind: 'population-jan-next' }
  | { readonly kind: 'matrix'; readonly read: DerivedRead; readonly label: MessageDescriptor }

export interface DerivedIndicator {
  readonly id: string
  readonly group: DerivedGroup
  readonly label: MessageDescriptor
  /** The unit beside the figure: „‰", „m²/locuitor", „%". */
  readonly unit: MessageDescriptor
  /** What the figure counts, under it. */
  readonly caption: MessageDescriptor
  /**
   * Event counts read over the three-year window and are screened for small
   * numbers: `numerator` screens the events themselves, `gross` arrivals plus
   * departures (a zero balance of 500 in and 500 out is not a rare event).
   */
  readonly events?: 'numerator' | 'gross'
  readonly plus: readonly DerivedRead[]
  readonly minus?: readonly DerivedRead[]
  /** The components, for the receipt. */
  readonly parts: readonly MessageDescriptor[]
  readonly denominator: Denominator
  /** The multiplier; a daily rate's depends on the year's days. */
  readonly factor: number | ((year: number) => number)
  /** Published for municipalities and towns only. */
  readonly towns?: boolean
  /** Shown only where the place has data (tourism): absent data is not absent tourism. */
  readonly contextual?: boolean
  /** Why the county and Romania are no reference (they would dilute it with rural population). */
  readonly noReferences?: MessageDescriptor
  /** The formula, over the INS matrix codes; its multipliers are written the reader's way. */
  readonly formula: MessageDescriptor
  readonly caveat: MessageDescriptor
  /** One short line a tile shows, when it changes how the figure reads. */
  readonly note?: MessageDescriptor
  /** A year the series was recalculated from: the line starts there. */
  readonly breakYear?: number
  /** A legal target, drawn and named where there is no reference. */
  readonly norm?: { readonly value: number; readonly label: MessageDescriptor }
  /**
   * What a locality's ABSENT cell means — INS Tempo omits cells rather than
   * publish them empty: `zero` for a count table that never publishes a zero
   * (POP201D: none among 3,172 cells). Unset: missing. For a county or
   * Romania an absent cell is always missing. Missing service volumes do
   * not establish infrastructure coverage.
   */
  readonly absent?: 'zero'
}

const daysIn = (year: number) => (new Date(Date.UTC(year, 1, 29)).getUTCMonth() === 1 ? 366 : 365)

export const DERIVED_INDICATORS: readonly DerivedIndicator[] = [
  {
    id: 'nascuti',
    group: 'demografie',
    label: msg`Născuți-vii`,
    unit: msg`‰`,
    caption: msg`la 1.000 locuitori pe an`,
    events: 'numerator',
    absent: 'zero',
    plus: [read('POP201D')],
    parts: [msg`născuți-vii`],
    denominator: { kind: 'population-jul' },
    factor: 1000,
    formula: msg`Σ POP201D / Σ POP108D × 1.000`,
    caveat: msg`Rata brută depinde de structura pe vârste a localității.`,
  },
  {
    id: 'decese',
    group: 'demografie',
    label: msg`Decese`,
    unit: msg`‰`,
    caption: msg`la 1.000 locuitori pe an`,
    events: 'numerator',
    absent: 'zero',
    plus: [read('POP206D')],
    parts: [msg`decedați`],
    denominator: { kind: 'population-jul' },
    factor: 1000,
    formula: msg`Σ POP206D / Σ POP108D × 1.000`,
    caveat: msg`O localitate mai îmbătrânită are mai multe decese fără ca îngrijirea să fie mai slabă.`,
  },
  {
    id: 'sold-domiciliu',
    group: 'demografie',
    label: msg`Soldul schimbărilor de domiciliu`,
    unit: msg`‰`,
    caption: msg`la 1.000 locuitori pe an`,
    events: 'gross',
    absent: 'zero',
    plus: [read('POP307A')],
    minus: [read('POP308A')],
    parts: [msg`stabiliri de domiciliu`, msg`plecări cu domiciliul`],
    denominator: { kind: 'population-jul' },
    factor: 1000,
    formula: msg`(Σ POP307A − Σ POP308A) / Σ POP108D × 1.000`,
    caveat: msg`Mutări de domiciliu, interne și internaționale. Cine pleacă fără să-și schimbe domiciliul nu apare.`,
  },
  {
    id: 'salariati',
    group: 'economie',
    label: msg`Salariați la locul de muncă`,
    unit: msg`‰`,
    caption: msg`la 1.000 locuitori`,
    plus: [read('FOM104D')],
    parts: [msg`salariați, medie anuală`],
    denominator: { kind: 'population-jul' },
    factor: 1000,
    formula: msg`FOM104D / POP108D × 1.000`,
    note: msg`numărați unde lucrează, nu unde locuiesc`,
    caveat: msg`Salariații sunt numărați unde lucrează, nu unde locuiesc; poate depăși 1.000. Nu e o rată de ocupare.`,
  },
  {
    id: 'locuinte',
    group: 'locuire',
    label: msg`Locuințe existente`,
    unit: msg`‰`,
    caption: msg`la 1.000 locuitori`,
    plus: [read('LOC101B', OWNERSHIP_TOTAL)],
    parts: [msg`locuințe la 31 decembrie`],
    denominator: { kind: 'population-jan-next' },
    factor: 1000,
    formula: msg`LOC101B (31 dec.) / POP107D (1 ian. anul următor) × 1.000`,
    note: msg`serie recalculată după Recensământul 2021`,
    caveat: msg`Include locuințele goale și secundare. Recalculat după Recensământul 2021: seria se rupe în 2021.`,
    breakYear: 2021,
  },
  {
    id: 'suprafata',
    group: 'locuire',
    label: msg`Suprafață locuibilă`,
    unit: msg`m²/locuitor`,
    caption: msg`m² arie desfășurată pe locuitor`,
    plus: [read('LOC103B', OWNERSHIP_TOTAL)],
    parts: [msg`m² locuibili la 31 decembrie`],
    denominator: { kind: 'population-jan-next' },
    factor: 1,
    formula: msg`LOC103B (31 dec.) / POP107D (1 ian. anul următor)`,
    caveat: msg`Nu spune cum e împărțit între gospodării. Recalculat după Recensământul 2021: seria se rupe în 2021.`,
    breakYear: 2021,
  },
  {
    id: 'locuinte-noi',
    group: 'locuire',
    label: msg`Locuințe terminate`,
    unit: msg`‰`,
    caption: msg`în cursul anului, la 1.000 locuitori`,
    plus: [read('LOC104B', [{ dimensionIndex: 0, memberCode: '7982' }])],
    parts: [msg`locuințe terminate`],
    denominator: { kind: 'population-jul' },
    factor: 1000,
    formula: msg`LOC104B / POP108D × 1.000`,
    caveat: msg`Construcția vine în salturi și nu e, în cea mai mare parte, o lucrare a primăriei.`,
  },
  {
    id: 'apa',
    group: 'servicii',
    label: msg`Apă potabilă pentru uz casnic`,
    unit: msg`l/locuitor/zi`,
    caption: msg`litri pe zi, pe locuitor`,
    plus: [read('GOS108A', [{ dimensionIndex: 0, memberCode: '7416' }])],
    parts: [msg`mii m³ distribuiți pentru uz casnic`],
    denominator: { kind: 'population-jul' },
    factor: (year) => 1_000_000 / daysIn(year),
    formula: msg`GOS108A „uz casnic" (mii m³) × 10⁶ / zilele anului / POP108D`,
    note: msg`împărțită la toți locuitorii, nu doar la cei racordați`,
    caveat: msg`Împărțită la toți locuitorii, nu doar la cei racordați: amestecă acoperirea rețelei cu consumul.`,
  },
  {
    id: 'spatii-verzi',
    group: 'servicii',
    label: msg`Spații verzi`,
    unit: msg`m²/locuitor`,
    caption: msg`m² pe locuitor`,
    plus: [read('GOS103A')],
    parts: [msg`hectare de spații verzi`],
    denominator: { kind: 'population-jan-next' },
    factor: 10_000,
    towns: true,
    noReferences: msg`Județul și țara includ populația rurală, fără spații verzi raportate: nu sunt un reper.`,
    formula: msg`GOS103A (ha) × 10.000 / POP107D (1 ian. anul următor)`,
    caveat: msg`Doar municipii și orașe. Inventarul nu spune cât de accesibile sau îngrijite sunt.`,
    norm: { value: 26, label: msg`ținta legală: 26 m²/locuitor, termen 2013 (OUG 114/2007)` },
  },
  {
    id: 'strazi',
    group: 'servicii',
    label: msg`Străzi modernizate`,
    unit: msg`%`,
    caption: msg`din lungimea străzilor orășenești`,
    plus: [read('GOS105A')],
    parts: [msg`km de străzi modernizate`],
    denominator: { kind: 'matrix', read: read('GOS104A'), label: msg`km de străzi orășenești (GOS104A)` },
    factor: 100,
    towns: true,
    formula: msg`GOS105A / GOS104A × 100`,
    caveat: msg`Doar municipii și orașe. O pondere din rețea, nu pe locuitor.`,
  },
  {
    id: 'locuri-cazare',
    group: 'turism',
    label: msg`Locuri de cazare turistică`,
    unit: msg`‰`,
    caption: msg`la 1.000 locuitori`,
    plus: [read('TUR102C', [{ dimensionIndex: 0, memberCode: '9148' }])],
    parts: [msg`locuri la 31 iulie`],
    denominator: { kind: 'population-jul' },
    factor: 1000,
    contextual: true,
    formula: msg`TUR102C (31 iul.) / POP108D × 1.000`,
    caveat: msg`Capacitate, nu ocupare. Doar unde există structuri de primire raportate.`,
  },
  {
    id: 'innoptari',
    group: 'turism',
    label: msg`Înnoptări turistice`,
    unit: msg`pe locuitor`,
    caption: msg`înnoptări pe an, pe locuitor`,
    plus: [read('TUR105E', [{ dimensionIndex: 0, memberCode: '9148' }])],
    parts: [msg`înnoptări`],
    denominator: { kind: 'population-jul' },
    factor: 1,
    contextual: true,
    formula: msg`TUR105E / POP108D`,
    caveat: msg`Pe populația după domiciliu, nu pe cea rezidentă a indicatorului european. Fără vizitatorii de o zi. Lipsa datelor nu înseamnă lipsa turismului.`,
  },
]

/**
 * The eight tiles, in order: first one per question — births (the demand to
 * come for nurseries and schools), the domicile balance (whether people move
 * in or out), employees where they work (a job centre or a dormitory, and the
 * payroll tax base), green space against its legal target (a municipal duty
 * with a benchmark; a commune reports none, so living space instead) — then
 * the rest of the eight.
 */
export const DERIVED_TILES = {
  town: ['nascuti', 'sold-domiciliu', 'salariati', 'spatii-verzi', 'decese', 'locuinte', 'suprafata', 'apa'],
  commune: ['nascuti', 'sold-domiciliu', 'salariati', 'suprafata', 'decese', 'locuinte', 'apa', 'locuinte-noi'],
} as const

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

export const derivedReadKey = (r: DerivedRead) =>
  `${r.code}:${r.pins.map((p) => `${p.dimensionIndex}=${p.memberCode}`).join(',')}`

/** Every matrix the indicators read, each once, populations included. */
export const DERIVED_READS: readonly DerivedRead[] = (() => {
  const byKey = new Map<string, DerivedRead>()
  const add = (r: DerivedRead) => byKey.set(derivedReadKey(r), r)
  add(POP_JAN)
  add(POP_JUL)
  for (const def of DERIVED_INDICATORS) {
    def.plus.forEach(add)
    def.minus?.forEach(add)
    if (def.denominator.kind === 'matrix') add(def.denominator.read)
  }
  return [...byKey.values()]
})()

/** The first year read: two before the first year the trends show. */
export const DERIVED_FIRST_YEAR = 2008

/**
 * year → value; null is a cell published without a number, or flagged as
 * having none (`publishedNumber`); an absent year is absent.
 */
export type DerivedSeries = ReadonlyMap<number, number | null>
/** One scope's reads, by `derivedReadKey`. */
export interface DerivedScopeData {
  readonly series: ReadonlyMap<string, DerivedSeries>
  /** The flag INS put on a cell that still has a number („p", „e"), by read, then year. */
  readonly flags: ReadonlyMap<string, ReadonlyMap<number, string>>
}
export type TerritoryDerivedData = Readonly<Record<DerivedScope, DerivedScopeData>>

// ---------------------------------------------------------------------------
// The arithmetic
// ---------------------------------------------------------------------------

/** Events across the window under which the rate is flagged „Număr mic de evenimente". */
export const SMALL_EVENTS = 20
/** Events across the window under which no rate is shown, only the counts. */
export const COUNTS_ONLY_EVENTS = 3

export type DerivedWindow = 1 | 3
/** The window the page reads events over. */
export const DERIVED_WINDOW: DerivedWindow = 3

export interface DerivedResult {
  readonly value: number | null
  /** The years the figure covers: one, or the window. */
  readonly years: readonly [number, number]
  readonly pooled: boolean
  /** 3–19 events across the window. */
  readonly small: boolean
  /** The years with a cell read as zero, absent from a table that never publishes one. */
  readonly imputedYears: number
  /** The INS flags on the cells the figure reads, each once: a provisional input makes a provisional figure. */
  readonly flags: readonly string[]
  /** Why there is no value, in the reader's words. */
  readonly missing: string | null
  /** The components, each summed over the window, in `parts` order. */
  readonly parts: readonly number[]
  readonly denominatorValue: number | null
  /** The events the small-number screen reads; null for stocks and averages. */
  readonly events: number | null
}

const cellOf = (data: DerivedScopeData, r: DerivedRead, year: number) => data.series.get(derivedReadKey(r))?.get(year)
const flagOf = (data: DerivedScopeData, r: DerivedRead, year: number) => data.flags.get(derivedReadKey(r))?.get(year)

function denominatorOf(def: DerivedIndicator, year: number): { readonly read: DerivedRead; readonly year: number } {
  if (def.denominator.kind === 'population-jul') return { read: POP_JUL, year }
  if (def.denominator.kind === 'population-jan-next') return { read: POP_JAN, year: year + 1 }
  return { read: def.denominator.read, year }
}

/** How the receipt names the denominator of a figure for `result`. */
export function denominatorLabel(def: DerivedIndicator, result: Pick<DerivedResult, 'years' | 'pooled'>): string {
  const [from, to] = result.years
  switch (def.denominator.kind) {
    case 'population-jul':
      return result.pooled
        ? t`suma populațiilor după domiciliu la 1 iulie ${from}–${to}`
        : t`populația după domiciliu la 1 iulie ${to}`
    case 'population-jan-next': {
      const next = to + 1
      return t`populația după domiciliu la 1 ianuarie ${next}`
    }
    case 'matrix':
      return i18n._(def.denominator.label)
  }
}

type YearInputs =
  | {
      readonly kind: 'ok'
      readonly plus: readonly number[]
      readonly minus: readonly number[]
      readonly denominator: number
      readonly imputed: boolean
      readonly flags: readonly string[]
    }
  | { readonly kind: 'negative' }
  | null

function yearInputs(def: DerivedIndicator, data: DerivedScopeData, year: number, scope: DerivedScope): YearInputs {
  const denominator = denominatorOf(def, year)
  const d = cellOf(data, denominator.read, denominator.year)
  // No population, no locality that year: nothing to read as zero either.
  if (d === undefined || d === null) return null
  const flags = [flagOf(data, denominator.read, denominator.year)]
  let imputed = false
  const cell = (r: DerivedRead) => {
    const value = cellOf(data, r, year)
    if (value !== undefined) {
      flags.push(flagOf(data, r, year))
      return value
    }
    if (scope !== 'place') return undefined
    if (def.absent === 'zero') {
      imputed = true
      return 0
    }
    return undefined
  }
  const plus = def.plus.map(cell)
  const minus = (def.minus ?? []).map(cell)
  if ([...plus, ...minus].some((value) => value === undefined || value === null)) return null
  // Every input is a count, a stock or a population: INS publishes a few
  // negative stocks (LOC103B −82 m²), which are no measurement. Only a
  // balance, computed here, may be negative.
  if (d < 0 || [...plus, ...minus].some((value) => value! < 0)) return { kind: 'negative' }
  return {
    kind: 'ok',
    plus: plus as number[],
    minus: minus as number[],
    denominator: d,
    imputed,
    flags: flags.filter((flag): flag is string => flag !== undefined),
  }
}

export function computeDerived(
  def: DerivedIndicator,
  data: DerivedScopeData,
  year: number,
  window: DerivedWindow = DERIVED_WINDOW,
  /** Whose cells these are: only a locality's absent cell can mean zero. */
  scope: DerivedScope = 'place',
): DerivedResult {
  const pooled = def.events !== undefined && window === 3
  const years: [number, number] = pooled ? [year - 2, year] : [year, year]
  const span = pooled ? [year - 2, year - 1, year] : [year]
  const empty = (missing: string, extra: Partial<DerivedResult> = {}): DerivedResult => ({
    value: null,
    years,
    pooled,
    small: false,
    imputedYears: 0,
    flags: [],
    missing,
    parts: [],
    denominatorValue: null,
    events: null,
    ...extra,
  })
  const inputs = span.map((y) => yearInputs(def, data, y, scope))
  if (inputs.some((i) => i === null)) {
    return empty(pooled ? t`date lipsă în cel puțin un an din cei trei` : t`date lipsă`)
  }
  if (inputs.some((i) => i?.kind === 'negative')) return empty(t`valoare INS negativă, nefolosită`)
  const complete = inputs as Extract<YearInputs, { kind: 'ok' }>[]
  const plusSums = def.plus.map((_, i) => complete.reduce((sum, y) => sum + y.plus[i]!, 0))
  const minusSums = (def.minus ?? []).map((_, i) => complete.reduce((sum, y) => sum + y.minus[i]!, 0))
  const denominator = complete.reduce((sum, y) => sum + y.denominator, 0)
  const parts = [...plusSums, ...minusSums]
  const events =
    def.events === undefined ? null : def.events === 'gross' ? parts.reduce((a, b) => a + b, 0) : plusSums[0]!
  const imputedYears = complete.filter((y) => y.imputed).length
  const flags = [...new Set(complete.flatMap((y) => y.flags))].sort()
  if (denominator <= 0) return empty(t`populație zero`)
  if (events !== null && events < COUNTS_ONLY_EVENTS) {
    return empty(t`prea puține evenimente pentru comparație`, {
      parts,
      denominatorValue: denominator,
      events,
      imputedYears,
      flags,
    })
  }
  const numerator = plusSums.reduce((a, b) => a + b, 0) - minusSums.reduce((a, b) => a + b, 0)
  const factor = typeof def.factor === 'function' ? def.factor(year) : def.factor
  // Σ events / Σ populations is already a rate per year.
  return {
    value: (numerator / denominator) * factor,
    years,
    pooled,
    small: events !== null && events < SMALL_EVENTS,
    imputedYears,
    flags,
    missing: null,
    parts,
    denominatorValue: denominator,
    events,
  }
}

/**
 * The year an indicator reads: the latest Romania has in full over the
 * window — INS's latest release, fixed before the place is read — or the
 * year the reader chose, when Romania has it. „In full" means published:
 * Romania always has births, so an absent national cell is a year INS has
 * not released, never a zero.
 */
export function derivedYear(
  def: DerivedIndicator,
  country: DerivedScopeData,
  options: { readonly window?: DerivedWindow; readonly year?: number | null; readonly lastYear: number },
): number | null {
  const window = options.window ?? DERIVED_WINDOW
  const complete = (year: number) => computeDerived(def, country, year, window, 'country').value !== null
  if (options.year != null) return complete(options.year) ? options.year : null
  for (let year = options.lastYear; year >= DERIVED_FIRST_YEAR + 2; year -= 1) if (complete(year)) return year
  return null
}

export interface DerivedRow {
  readonly def: DerivedIndicator
  readonly year: number | null
  /** Why there is no year to read, when there is none. */
  readonly missing: string | null
  readonly results: Readonly<Record<DerivedScope, DerivedResult | null>>
  /** For a window figure, the last year alone — a window lags a fast change — with its own flags. */
  readonly lastYear: Readonly<Record<DerivedScope, DerivedResult | null>> | null
  /** The rate per year for each scope, over the same window as the figure. */
  readonly history: Readonly<Record<DerivedScope, readonly (readonly [number, number | null])[]>>
}

export function buildDerivedRows(
  data: TerritoryDerivedData,
  options: {
    readonly town: boolean
    /** The year the page is filtered to, or null for the latest. */
    readonly year?: number | null
    /** The newest year any read asks for. */
    readonly lastYear: number
    /** False where the county is no reference: the capital's county is the city itself. */
    readonly county?: boolean
  },
): readonly DerivedRow[] {
  const window = DERIVED_WINDOW
  const chosen = options.year ?? null
  return (
    DERIVED_INDICATORS.filter((def) => !def.towns || options.town)
      .map((def): DerivedRow => {
        const year = derivedYear(def, data.country, { window, year: chosen, lastYear: options.lastYear })
        const none = { place: [], county: [], country: [] }
        if (year === null) {
          return {
            def,
            year,
            // The page offers every year some series has: this one may end earlier.
            missing: chosen === null ? t`date lipsă` : t`fără date INS pentru ${chosen}`,
            results: { place: null, county: null, country: null },
            lastYear: null,
            history: none,
          }
        }
        const referenced = (scope: DerivedScope) =>
          scope === 'place' || (!def.noReferences && (scope === 'country' || options.county !== false))
        const at = (scope: DerivedScope) =>
          referenced(scope) ? computeDerived(def, data[scope], year, window, scope) : null
        const single = (scope: DerivedScope) =>
          referenced(scope) ? computeDerived(def, data[scope], year, 1, scope) : null
        const historyOf = (scope: DerivedScope) => {
          if (!referenced(scope)) return []
          const points: [number, number | null][] = []
          for (let y = DERIVED_FIRST_YEAR + 2; y <= year; y += 1) {
            points.push([y, computeDerived(def, data[scope], y, window, scope).value])
          }
          return points
        }
        return {
          def,
          year,
          missing: null,
          results: { place: at('place'), county: at('county'), country: at('country') },
          lastYear:
            def.events !== undefined
              ? { place: single('place'), county: single('county'), country: single('country') }
              : null,
          history: { place: historyOf('place'), county: historyOf('county'), country: historyOf('country') },
        }
      })
      // Tourism is context: a place with no reported accommodation has no row,
      // not a dash — the section says so once (`missingContext`). A year INS
      // has not published says nothing about the place: that row stays.
      .filter((row) => !row.def.contextual || row.year === null || (row.results.place?.value ?? null) !== null)
  )
}

/** The contextual indicators a place has no data for, to say once. */
export function missingContext(rows: readonly DerivedRow[]): readonly DerivedIndicator[] {
  const shown = new Set(rows.map((row) => row.def.id))
  return DERIVED_INDICATORS.filter((def) => def.contextual && !shown.has(def.id))
}

/** A municipality or a town, by the name INS gives it („MUNICIPIUL …", „ORAȘ …"). */
export function isTownName(raw: string | null): boolean {
  return raw !== null && /^(MUNICIPIUL|ORA[SŞȘ](UL)?)\s/i.test(raw.trim())
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

/** A balance is signed; everything else is a level. */
export const isBalance = (def: DerivedIndicator) => (def.minus?.length ?? 0) > 0

/** One decimal, as INS publishes its rates; a balance carries its sign, a true minus. */
export function formatDerived(value: number | null, options: { readonly signed?: boolean } = {}): string {
  if (value === null) return '—'
  return new Intl.NumberFormat(activeNumberLocale(), {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
    ...(options.signed ? { signDisplay: 'exceptZero' as const } : {}),
  })
    .format(value)
    .replace('-', '−')
}

export function formatDerivedCount(value: number): string {
  return new Intl.NumberFormat(activeNumberLocale(), { maximumFractionDigits: 0 }).format(value)
}

export function derivedYearsLabel(result: Pick<DerivedResult, 'years' | 'pooled'>): string {
  return result.pooled ? `${result.years[0]}–${result.years[1]}` : String(result.years[1])
}

/** The years a row's trend covers — from its break, where the series was recalculated. */
export function derivedTrendSpan(row: DerivedRow): readonly [number, number] | null {
  const points = row.history.place.filter(([year, v]) => v !== null && (!row.def.breakYear || year >= row.def.breakYear))
  if (points.length < 2) return null
  return [points[0]![0], points[points.length - 1]![0]]
}
