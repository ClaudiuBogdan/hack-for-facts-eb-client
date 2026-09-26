/**
 * The UAT map's figures, read from the public GraphQL API: each series' total
 * for the latest year Romania has, counted with the territory page's own
 * arithmetic (`computeDerived`, `derivedYear`, one year) — so an absent cell
 * reads as the page reads it and a negative INS input is left out.
 * A missing water cell remains missing, without inferring network coverage.
 * A missing completed-housing cell also remains missing, never an inferred zero.
 */
import { msg } from '@lingui/core/macro'
import {
  DERIVED_FIRST_YEAR,
  DERIVED_INDICATORS,
  DERIVED_READS,
  computeDerived,
  derivedReadKey,
  derivedYear,
  type DerivedIndicator,
  type DerivedRead,
  type DerivedResult,
  type DerivedScopeData,
} from '../../src/features/statistics/lib/territory-derived'
import type {
  UatMapFigures,
  UatMapMissing,
  UatMapPart,
  UatMapPartId,
  UatMapSeries,
  UatMapSeriesId,
  UatMapValues,
} from '../../src/features/statistics/lib/uat-map-snapshot'
import { publishedNumber } from '../../src/features/statistics/lib/value-status'

const readOf = (code: string): DerivedRead => {
  const found = DERIVED_READS.find((r) => r.code === code)
  if (!found) throw new Error(`No read for ${code}`)
  return found
}
const POP_JAN = readOf('POP107D')
const POP_JUL = readOf('POP108D')
const defOf = (id: string): DerivedIndicator => {
  const found = DERIVED_INDICATORS.find((def) => def.id === id)
  if (!found) throw new Error(`No indicator ${id}`)
  return found
}

/**
 * Births less deaths over the births' own denominator: the difference of the
 * two rates the territory page shows, screened on births + deaths (a village
 * of 2 births and 40 deaths has a rate).
 */
const NATURAL_INCREASE: DerivedIndicator = {
  ...defOf('nascuti'),
  id: 'spor-natural',
  label: msg`Spor natural`,
  events: 'gross',
  plus: [readOf('POP201D')],
  minus: [readOf('POP206D')],
  parts: [msg`născuți-vii`, msg`decedați`],
  formula: msg`(POP201D − POP206D) / POP108D × 1.000`,
}

const QUERY = `query UatMapRead($code: String!, $filter: InsObservationFilterInput, $limit: Int, $offset: Int) {
  insObservations(datasetCode: $code, filter: $filter, limit: $limit, offset: $offset) {
    nodes { value value_status time_period { year } territory { code siruta_code } }
  }
}`

type Node = {
  readonly value: string | null
  readonly value_status: string | null
  readonly time_period: { readonly year: number }
  readonly territory: { readonly code: string | null; readonly siruta_code: string | null } | null
}

const PAGE = 1000

async function post(api: string, variables: Record<string, unknown>): Promise<readonly Node[]> {
  for (let attempt = 1; ; attempt += 1) {
    try {
      const response = await fetch(api, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ query: QUERY, variables, operationName: 'UatMapRead' }),
        signal: AbortSignal.timeout(120_000),
      })
      const body = (await response.json()) as { data?: { insObservations?: { nodes: Node[] } }; errors?: unknown }
      if (!response.ok || body.errors || !body.data?.insObservations) throw new Error(`${response.status} ${JSON.stringify(body.errors ?? body).slice(0, 300)}`)
      return body.data.insObservations.nodes
    } catch (error) {
      if (attempt >= 4) throw error
      await new Promise((resolve) => setTimeout(resolve, 1500 * attempt))
    }
  }
}

/** A scope's reads as they are gathered, before they are handed over as `DerivedScopeData`. */
type Gathered = { series: Map<string, Map<number, number | null>>; flags: Map<string, Map<number, string>> }

/** Every row of one read at one level, page by page; keyed by SIRUTA (localities) or code. */
async function readAll(
  api: string,
  r: DerivedRead,
  scope: { readonly territoryLevels: readonly string[] } | { readonly territoryCodes: readonly string[] },
  years: readonly number[],
  byCode: 'siruta' | 'code',
): Promise<Map<string, Gathered>> {
  const out = new Map<string, Gathered>()
  const key = derivedReadKey(r)
  for (let offset = 0; ; offset += PAGE) {
    const nodes = await post(api, {
      code: r.code,
      filter: { ...scope, sourcePins: r.pins, period: { type: 'YEAR', selection: { dates: years.map(String) } } },
      limit: PAGE,
      offset,
    })
    for (const node of nodes) {
      const id = byCode === 'siruta' ? node.territory?.siruta_code : node.territory?.code
      if (!id) continue
      const scopeData = out.get(id) ?? { series: new Map(), flags: new Map() }
      out.set(id, scopeData)
      const series = scopeData.series.get(key) ?? new Map<number, number | null>()
      scopeData.series.set(key, series)
      const year = node.time_period.year
      if (series.has(year)) throw new Error(`${r.code}: two rows for ${id} in ${year} — a pin is missing`)
      series.set(year, publishedNumber(node.value, node.value_status))
      const status = node.value_status?.trim()
      if (status && series.get(year) !== null) {
        const flags = scopeData.flags.get(key) ?? new Map<number, string>()
        scopeData.flags.set(key, flags)
        flags.set(year, status)
      }
    }
    if (nodes.length < PAGE) break
  }
  return out
}

/** Several reads folded into one map per scope. */
function merge(target: Map<string, Gathered>, source: Map<string, Gathered>) {
  for (const [id, data] of source) {
    const into = target.get(id)
    if (!into) {
      target.set(id, data)
      continue
    }
    for (const [key, series] of data.series) into.series.set(key, series)
    for (const [key, flags] of data.flags) into.flags.set(key, flags)
  }
}

const EMPTY: DerivedScopeData = { series: new Map(), flags: new Map() }

function missingOf(result: DerivedResult): UatMapMissing {
  if (result.missing?.includes('negativ')) return 'negative'
  return 'absent'
}

/** The events a balance is made of, in `computeDerived`'s `parts` order (plus, then minus). */
const PART_IDS: Partial<Record<UatMapSeriesId, readonly UatMapPartId[]>> = {
  'spor-natural': ['births', 'deaths'],
  'sold-domiciliu': ['arrivals', 'departures'],
}

/** The count a figure is made of: plus less minus, summed as `computeDerived` gives them. */
function countOf(result: DerivedResult, def: DerivedIndicator): number | null {
  if (result.parts.length === 0) return null
  const plus = def.plus.length
  return result.parts.slice(0, plus).reduce((a, b) => a + b, 0) - result.parts.slice(plus).reduce((a, b) => a + b, 0)
}

export async function buildUatValues(options: {
  readonly api: string
  readonly siruta: readonly string[]
  readonly lastYear: number
  readonly log: (line: string) => void
}): Promise<UatMapValues> {
  const { api, log } = options
  const DEFS: readonly (readonly [UatMapSeriesId, DerivedIndicator])[] = [
    ['spor-natural', NATURAL_INCREASE],
    ['sold-domiciliu', defOf('sold-domiciliu')],
    ['salariati', defOf('salariati')],
    ['locuinte-noi', defOf('locuinte-noi')],
    ['apa', defOf('apa')],
  ]
  const reads = [POP_JAN, POP_JUL, ...new Map(DEFS.flatMap(([, def]) => [...def.plus, ...(def.minus ?? [])]).map((r) => [derivedReadKey(r), r])).values()]

  // ── Romania first: it fixes each series' year ──────────────────────
  const allYears = Array.from({ length: options.lastYear - DERIVED_FIRST_YEAR + 1 }, (_, i) => DERIVED_FIRST_YEAR + i)
  const national = new Map<string, Gathered>()
  for (const r of reads) merge(national, await readAll(api, r, { territoryCodes: ['RO'] }, allYears, 'code'))
  const country = national.get('RO') ?? EMPTY
  const popSeries = country.series.get(derivedReadKey(POP_JAN))
  const popYear = [...(popSeries?.keys() ?? [])].filter((year) => popSeries?.get(year) != null).sort().pop()
  if (!popYear) throw new Error('Romania has no POP107D year')
  // The latest year Romania has in full: the one the territory page reads.
  const years = new Map(DEFS.map(([id, def]) => [id, derivedYear(def, country, { window: 1, lastYear: options.lastYear })] as const))
  log(`years: populatie ${popYear}, ${[...years].map(([id, year]) => `${id} ${year ?? '—'}`).join(', ')}`)

  // ── the years each read needs, then every locality and county ───────
  const need = new Map<string, Set<number>>()
  const want = (r: DerivedRead, year: number) => need.set(derivedReadKey(r), (need.get(derivedReadKey(r)) ?? new Set()).add(year))
  want(POP_JAN, popYear)
  for (const [id, def] of DEFS) {
    const year = years.get(id)
    if (year == null) continue
    for (const r of [...def.plus, ...(def.minus ?? [])]) want(r, year)
    // `computeDerived` reads a count only where the place has a population that year.
    if (def.denominator.kind === 'population-jul') want(POP_JUL, year)
    else if (def.denominator.kind === 'population-jan-next') want(POP_JAN, year + 1)
  }
  const localities = new Map<string, Gathered>()
  const counties = new Map<string, Gathered>()
  for (const r of reads) {
    const wanted = [...(need.get(derivedReadKey(r)) ?? [])].sort()
    if (wanted.length === 0) continue
    const started = Date.now()
    const lau = await readAll(api, r, { territoryLevels: ['LAU'] }, wanted, 'siruta')
    merge(localities, lau)
    merge(counties, await readAll(api, r, { territoryLevels: ['NUTS3'] }, wanted, 'code'))
    log(`${r.code} ${wanted.join(',')}: ${lau.size} localities, ${((Date.now() - started) / 1000).toFixed(1)} s`)
  }
  const unknown = [...localities.keys()].filter((siruta) => !options.siruta.includes(siruta))
  if (unknown.length > 0) log(`localities with data but no shape: ${unknown.join(', ')}`)
  const countyCodes = [...counties.keys()].sort()

  /** One figure for every UAT, its county and Romania, from one function of a scope's data. */
  const figures = (of: (data: DerivedScopeData, scope: 'place' | 'county' | 'country') => number | null, digits = 1): UatMapFigures => ({
    values: options.siruta.map((siruta) => round(of(localities.get(siruta) ?? EMPTY, 'place'), digits)),
    national: round(of(country, 'country'), digits),
    counties: Object.fromEntries(countyCodes.map((code) => [code, round(of(counties.get(code)!, 'county'), digits)])),
  })

  // ── the series ───────────────────────────────────────────────────────
  const series: UatMapSeries[] = []
  const population = (data: DerivedScopeData) => data.series.get(derivedReadKey(POP_JAN))?.get(popYear) ?? null
  series.push({ id: 'populatie', year: popYear, total: figures(population, 0), missing: {}, flags: {}, parts: [] })
  for (const [id, def] of DEFS) {
    const year = years.get(id)
    if (year == null) {
      log(`${id}: Romania has no complete year — skipped`)
      continue
    }
    const result = (data: DerivedScopeData, scope: 'place' | 'county' | 'country') => computeDerived(def, data, year, 1, scope)
    const now = options.siruta.map((siruta) => result(localities.get(siruta) ?? EMPTY, 'place'))
    series.push({
      id,
      year,
      // Water is thousand m³, kept to one decimal; every other count is whole.
      total: figures((data, scope) => countOf(result(data, scope), def), id === 'apa' ? 1 : 0),
      missing: Object.fromEntries(now.flatMap((r, index) => (countOf(r, def) === null ? [[index, missingOf(r)]] : []))),
      flags: Object.fromEntries(now.flatMap((r, index) => (r.flags.length > 0 ? [[index, r.flags.join('')]] : []))),
      parts: (PART_IDS[id] ?? []).map(
        (partId, k): UatMapPart => ({ id: partId, values: now.map((r) => (r.parts[k] === undefined ? null : Math.round(r.parts[k]!))) }),
      ),
    })
  }
  return { generatedAt: new Date().toISOString().slice(0, 10), api, siruta: options.siruta, series }
}

function round(value: number | null, digits = 1): number | null {
  if (value === null) return null
  const scale = 10 ** digits
  return Math.round(value * scale) / scale
}
