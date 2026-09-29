import { parseProcurementHubSearch, procurementHubSearchSchema, type ProcurementHubState } from '@/schemas/procurement-hub'
import { linkSearchOf, SEARCH_KEYS, type AnalyticsSearch, type AnalyticsUrlSearch } from './analytics-model'
import { allYears } from './home-links'

/**
 * The explorer's addresses (`/procurement/search`, the old
 * `/procurement/analytics`, `/procurement?view=…`, `/achizitii/cautare`) as
 * the analytics page's: the population, the parties, the category, the
 * places, the period, the title's words, the value range, the view as the
 * group-by. What the page has no filter for — the status, the value's
 * quality, the source, the value basis, the map's settings, the order and
 * the page — is left behind, and the page answers without it. A value it
 * cannot read goes on as it came, for the page to say so.
 */

/** The explorer's keys, and its legacy `tab`. */
export const EXPLORER_KEYS: ReadonlySet<string> = new Set([...Object.keys(procurementHubSearchSchema.shape), 'tab'])

/**
 * A link carries an explorer question: one of its keys, and none of the
 * analytics page's own (`cpv` is both pages' key, and means the same code) —
 * an analytics address with a stray key (`page=2`) is answered as it is.
 */
export function isExplorerSearch(raw: Readonly<Record<string, unknown>>): boolean {
  const keys = Object.keys(raw)
  if (keys.some((key) => key !== 'cpv' && SEARCH_KEYS.includes(key))) return false
  return keys.some((key) => EXPLORER_KEYS.has(key) && !SEARCH_KEYS.includes(key))
}

function tipOf(state: ProcurementHubState): string {
  if (state.grain === 'direct_acquisitions') return 'directe'
  // The framework ceilings were the explorer's value basis for the framework agreements.
  if (state.vbasis === 'ceiling') return 'acorduri'
  // A contracts list asked for the frameworks alone is the framework agreements; any other contract grain, the awards.
  const kinds = state.record_kind ?? []
  if (state.grain === 'contracts' && kinds.length === 1 && kinds[0] === 'frameworks') return 'acorduri'
  return 'contracte'
}

/** A CPV filter at the finest level the link gave, as the prefix the page reads: „45", „451", „45000000". */
function cpvOf(state: ProcurementHubState): string | undefined {
  const digits = (value: string | undefined) => value?.replace(/-\d$/u, '').replace(/\D/gu, '')
  if (state.cpv) return digits(state.cpv)
  if (state.cpv_category) return digits(state.cpv_category)?.slice(0, 5)
  if (state.cpv_class) return digits(state.cpv_class)?.slice(0, 4)
  if (state.cpv_group) return digits(state.cpv_group)?.slice(0, 3)
  if (state.cpv_division) return digits(state.cpv_division)?.slice(0, 2)
  return undefined
}

/** A year, the months between two days (one day alone runs to the end of the current year: the page stops at the data's cutoff), or every year. */
function periodOf(state: ProcurementHubState, now: Date): string | undefined {
  if (state.dateFrom || state.dateTo) {
    const from = (state.dateFrom ?? '2019-01-01').slice(0, 7)
    const to = (state.dateTo ?? `${now.getFullYear()}-12-31`).slice(0, 7)
    return `${from}..${to}`
  }
  if (state.year !== undefined) return String(state.year)
  return state.period === 'all' ? allYears(now) : undefined
}

/** The view as the group-by: the list is the records, a ranking its axis (a fixed one gives way to the page's next, see `repaired`). */
function groupOf(state: ProcurementHubState): string | undefined {
  if (state.view === 'list') return 'inregistrari'
  if (state.view !== 'rankings') return undefined
  if (state.rankDim === 'supplier') return 'firma'
  if (state.rankDim === 'cpv') {
    const levels: Record<string, string> = { division: 'categorie', group: 'grup', class: 'clasa', category: 'categorie5', code: 'cod' }
    return levels[state.cpvLevel] ?? 'categorie'
  }
  return 'institutie'
}

/**
 * The redirect's search: the explorer's question in the analytics page's
 * words, and what else the link carried (the language, the currency),
 * less the keys in `drop` (the front door's own choices).
 */
export function analyticsRedirectSearch(raw: Readonly<Record<string, unknown>>, drop: ReadonlySet<string> = new Set()): AnalyticsUrlSearch {
  const carried = Object.fromEntries(Object.entries(raw).filter(([key]) => !EXPLORER_KEYS.has(key) && !SEARCH_KEYS.includes(key) && !drop.has(key)))
  // What the link carried goes as the router parsed it (the root route validates its own keys again on arrival).
  return { ...carried, ...analyticsSearchFromExplorer(raw) } as AnalyticsUrlSearch
}

/** The analytics page's address for an explorer link, normalised as the page writes it. */
export function analyticsSearchFromExplorer(raw: Readonly<Record<string, unknown>>, now: Date = new Date()): AnalyticsUrlSearch {
  const state = parseProcurementHubSearch(raw as Record<string, unknown>)
  const search: Record<string, string> = { tip: tipOf(state) }
  const put = (key: string, value: string | number | undefined) => {
    if (value !== undefined && value !== '') search[key] = String(value)
  }
  put('cumparator', state.authority_cui)
  put('furnizor', state.supplier_cui)
  put('cpv', cpvOf(state))
  // The legacy `county` and `region` the explorer read and ignored stay behind: they never narrowed its answer.
  put('regiune', state.buyerRegion)
  put('judet', state.buyerCounty)
  put('localitate', state.buyerSiruta)
  put('regiune_firma', state.supplierRegion)
  put('judet_firma', state.supplierCounty)
  put('localitate_firma', state.supplierSiruta)
  put('perioada', periodOf(state, now))
  put('titlu', state.q?.trim())
  if (state.valueMin !== undefined || state.valueMax !== undefined) put('valoare', `${state.valueMin ?? ''}..${state.valueMax ?? ''}`)
  put('dupa', groupOf(state))
  // A ranking by count stays by count; by value, the page's own default measure.
  if (state.view === 'rankings' && raw.rankBy === 'count') put('masura', 'numar')
  if (state.view === 'rankings' && raw.rankBy === 'value') put('masura', 'lei')
  return linkSearchOf(search as AnalyticsSearch)
}
