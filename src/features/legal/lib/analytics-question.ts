import type { LegalAnalyticsArgs, LegalAnalyticsLens, LegalAnalyticsOrder } from '@/schemas/legal-analytics'

/**
 * The analysis page's question, read from and written to the address with Romanian keys (the default view
 * carries none), and its mapping onto the API's arguments. Values are kept as the layer names them (type keys,
 * lineage names): the server validates them against the published layer, and an address the layer cannot answer
 * comes back as a 400 the page states.
 */

export const LENSES = ['felul', 'emitent', 'tip', 'dinamica', 'legaturi', 'tema', 'domeniu'] as const
export type Lens = (typeof LENSES)[number]
/** The lenses that are columns of the insights layer (rank, series, grid). */
export const DATA_LENSES = ['felul', 'emitent', 'tip', 'dinamica'] as const
export type DataLens = (typeof DATA_LENSES)[number]
/** Lenses the first build does not serve yet: they say „în curând". */
export const SOON_LENSES: readonly Lens[] = ['tema', 'domeniu']

export const LENS_LABEL: Readonly<Record<Lens, string>> = {
  felul: 'Felul actului',
  emitent: 'Emitent',
  tip: 'Tip',
  dinamica: 'Dinamică',
  legaturi: 'Legături',
  tema: 'Temă',
  domeniu: 'Domeniu',
}

export const FORMS = ['clasament', 'timp', 'grila'] as const
export type Form = (typeof FORMS)[number]
export const ORDERS = ['modificari', 'decizii', 'versiuni', 'citari', 'an'] as const
export type Order = (typeof ORDERS)[number]

export type Question = {
  readonly populatie: 'flux' | 'stoc'
  readonly vedere: Lens
  /** The Felul lens by kind rather than by group. */
  readonly fin: boolean
  readonly forma: Form
  readonly cu: DataLens
  readonly an: { readonly from: number; readonly to: number } | null
  readonly tip: readonly string[]
  readonly emitent: string | null
  readonly familie: string | null
  readonly felul: string | null
  readonly dinamica: number | null
  readonly ordine: Order
}

export const DEFAULT_QUESTION: Question = {
  populatie: 'flux',
  vedere: 'felul',
  fin: false,
  forma: 'clasament',
  cu: 'tip',
  an: null,
  tip: [],
  emitent: null,
  familie: null,
  felul: null,
  dinamica: null,
  ordine: 'modificari',
}

const text = (v: unknown): string => (typeof v === 'number' ? String(v) : typeof v === 'string' ? v : '')
function oneOf<T extends string>(v: unknown, list: readonly T[], fallback: T): T {
  const s = text(v)
  return (list as readonly string[]).includes(s) ? (s as T) : fallback
}
const KEY = /^[a-z0-9_-]{1,64}$/u

/** Every key the address carries is read; an unreadable one falls back to its default. */
export function readQuestion(search: Record<string, unknown>): Question {
  const an = /^(\d{4})(?:-(\d{4}))?$/u.exec(text(search['an']))
  const from = an ? Number(an[1]) : null
  const to = an ? Number(an[2] ?? an[1]) : null
  const tip = [...new Set(text(search['tip']).split(',').filter((s) => KEY.test(s)))].sort().slice(0, 25)
  const emitent = text(search['emitent']).trim()
  const familie = text(search['familie'])
  const felul = text(search['felul'])
  const dinamica = text(search['dinamica'])
  const cu = oneOf(search['cu'], DATA_LENSES, 'tip')
  return {
    populatie: oneOf(search['populatie'], ['flux', 'stoc'] as const, 'flux'),
    vedere: oneOf(search['vedere'], LENSES, 'felul'),
    fin: text(search['fin']) === '1',
    forma: oneOf(search['forma'], FORMS, 'clasament'),
    cu,
    an: from !== null && to !== null && from <= to ? { from, to } : null,
    tip,
    // Kept whatever its length: the layer names joint issuers at length, and the server checks the name.
    emitent: emitent !== '' ? emitent : null,
    familie: KEY.test(familie) ? familie : null,
    felul: KEY.test(felul) ? felul : null,
    dinamica: /^[0-3]$/u.test(dinamica) ? Number(dinamica) : null,
    ordine: oneOf(search['ordine'], ORDERS, 'modificari'),
  }
}

/** The address of a question: only what differs from the default. */
export function searchOfQuestion(q: Question): Record<string, string | undefined> {
  return {
    populatie: q.populatie === 'flux' ? undefined : q.populatie,
    vedere: q.vedere === 'felul' ? undefined : q.vedere,
    fin: q.fin ? '1' : undefined,
    forma: q.forma === 'clasament' ? undefined : q.forma,
    cu: q.forma === 'grila' && q.cu !== 'tip' ? q.cu : undefined,
    an: q.an ? (q.an.from === q.an.to ? String(q.an.from) : `${String(q.an.from)}-${String(q.an.to)}`) : undefined,
    tip: q.tip.length ? q.tip.join(',') : undefined,
    emitent: q.emitent ?? undefined,
    familie: q.familie ?? undefined,
    felul: q.felul ?? undefined,
    dinamica: q.dinamica === null ? undefined : String(q.dinamica),
    ordine: q.ordine === 'modificari' ? undefined : q.ordine,
  }
}

export function isFiltered(q: Question): boolean {
  return q.an !== null || q.tip.length > 0 || q.emitent !== null || q.familie !== null || q.felul !== null || q.dinamica !== null
}

/** The API's filter arguments of a question (absent = the API's default), in the server's canonical order. */
export function filterArgs(q: Question): LegalAnalyticsArgs {
  return {
    ...(q.populatie === 'stoc' && { population: 'stock' as const }),
    ...(q.an && { from: q.an.from, to: q.an.to }),
    ...(q.tip.length > 0 && { type: q.tip }),
    ...(q.emitent !== null && { issuer: q.emitent }),
    ...(q.familie !== null && { family: q.familie }),
    ...(q.felul !== null && { felul: q.felul }),
    ...(q.dinamica !== null && { versions: q.dinamica }),
  }
}

export function apiLens(lens: DataLens, fine = false): LegalAnalyticsLens {
  switch (lens) {
    case 'felul':
      return fine ? 'kind' : 'felul'
    case 'emitent':
      return 'issuer'
    case 'tip':
      return 'type'
    case 'dinamica':
      return 'versions'
  }
}

/** The other lens a grid crosses its rows with: the question's own, or the first other data lens. */
export function gridColumns(q: Question): DataLens {
  const vedere = isDataLens(q.vedere) ? q.vedere : 'felul'
  const other = DATA_LENSES.filter((lens) => lens !== vedere)
  return other.includes(q.cu) ? q.cu : (other[0] ?? 'tip')
}

/**
 * The answer a question's chart reads, as the page and the route loader both ask it (one query, one cache
 * entry): a ranking's breakdown, a series, or a grid. The Felul axis keeps the level the reader chose (groups or
 * kinds) in every form. `null` for a view with no aggregate chart (links, the soon lenses).
 */
export function chartRead(
  q: Question,
): readonly ['breakdown' | 'series' | 'grid', LegalAnalyticsArgs] | null {
  if (!isDataLens(q.vedere)) return null
  const base = filterArgs(q)
  const lens = apiLens(q.vedere, q.vedere === 'felul' && q.fin)
  if (q.forma === 'timp') return ['series', { ...base, lens }]
  if (q.forma === 'grila') {
    const cu = gridColumns(q)
    return ['grid', { ...base, lens, by: apiLens(cu, cu === 'felul' && q.fin) }]
  }
  return ['breakdown', { ...base, lens, ...(q.vedere === 'emitent' && { limit: 50 }) }]
}

export const API_ORDER: Readonly<Record<Order, LegalAnalyticsOrder>> = {
  modificari: 'amended',
  decizii: 'court',
  versiuni: 'versions',
  citari: 'cited',
  an: 'year',
}

export const isDataLens = (lens: Lens): lens is DataLens => (DATA_LENSES as readonly string[]).includes(lens)
