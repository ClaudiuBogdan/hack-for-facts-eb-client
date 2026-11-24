import { useNavigate, useSearch } from '@tanstack/react-router'
import { LEGAL_FIXTURE } from './analytics.fixture'

/**
 * The analysis page's question, read from and written to the address with Romanian keys (G7): the default view
 * carries none. Everything the page shows is counted here from the fixture's cube, so a filter repaints every
 * figure, bar, series and grid cell.
 */

export const FX = LEGAL_FIXTURE
const D = FX.dims

// ───────────────────────────────────────────────────────── labels ──

export const TYPE_LABEL: Readonly<Record<string, string>> = {
  hotarare: 'hotărâri',
  ordin: 'ordine',
  decizie: 'decizii',
  decret: 'decrete',
  unknown: 'tip nerecunoscut',
  lege: 'legi',
  'ordonanta-urgenta': 'ordonanțe de urgență',
  rectificare: 'rectificări',
  ordonanta: 'ordonanțe',
  circulara: 'circulare',
  norma: 'norme',
  regulament: 'regulamente',
  instructiuni: 'instrucțiuni',
  'decret-lege': 'decrete-lege',
  protocol: 'protocoale',
  sentinta: 'sentințe',
  metodologie: 'metodologii',
  procedura: 'proceduri',
  cod: 'coduri',
}

export const GROUP_LABEL: Readonly<Record<string, string>> = {
  'rule-making': 'stabilesc reguli',
  individual: 'acte individuale',
  'budget-property-organisation': 'buget, bunuri și organizare',
  procedure: 'procedură',
  court: 'decizii ale instanțelor',
  'reports-notices': 'rapoarte și comunicări',
  other: 'neîncadrate',
}
export const GROUP_ORDER = ['rule-making', 'individual', 'budget-property-organisation', 'procedure', 'court', 'reports-notices', 'other'] as const

export const KIND_LABEL: Readonly<Record<string, string>> = {
  amendment: 'modificări',
  appointments: 'numiri și eliberări din funcție',
  other: 'neîncadrate',
  court: 'decizii ale instanțelor',
  application_rules: 'norme de aplicare',
  budget: 'buget și alocări',
  promulgation: 'promulgări',
  reports_notices: 'rapoarte și comunicări',
  new_rules: 'reguli noi',
  authorisation: 'autorizări și licențe',
  property: 'bunuri',
  organisation: 'organizarea instituțiilor',
  ordinance_approval: 'aprobarea sau respingerea ordonanțelor',
  ratification: 'ratificări și aprobări de tratate',
  decorations: 'decorații',
  correction: 'rectificări',
  chamber_procedure: 'procedura camerelor',
  periodic_parameters: 'parametri periodici',
  international_agreement: 'acorduri internaționale',
  repeal: 'abrogări',
  sanctions: 'sancțiuni',
  citizenship: 'cetățenie',
  pardons: 'grațieri',
}

export const DYN_LABEL = ['fără versiuni consolidate', '1–2 versiuni', '3–9 versiuni', '10 sau mai multe'] as const

/** The type bands of the stacked charts and the map's colour toggle. */
export const BAND_LABEL = ['legi și ordonanțe', 'hotărâri', 'ordine', 'decizii', 'decrete', 'altele'] as const
const BAND_OF: Readonly<Record<string, number>> = { lege: 0, ordonanta: 0, 'ordonanta-urgenta': 0, 'decret-lege': 0, hotarare: 1, ordin: 2, decizie: 3, decret: 4 }
export const bandOfType = (typeIndex: number) => BAND_OF[D.types[typeIndex] ?? ''] ?? 5

/** Stock („legislația așa cum este"): base acts only; amending and procedure acts live in the consolidated text. */
const NOT_IN_STOCK = new Set(['amendment', 'repeal', 'correction', 'promulgation', 'ordinance_approval', 'chamber_procedure'])
export const STOCK_KIND = D.kinds.map((k) => !NOT_IN_STOCK.has(k.key))

// ────────────────────────────────────────────────────────── query ──

export const LENSES = ['tema', 'domeniu', 'felul', 'emitent', 'tip', 'dinamica'] as const
export type Lens = (typeof LENSES)[number]
export const LENS_LABEL: Readonly<Record<Lens, string>> = {
  tema: 'Temă',
  domeniu: 'Domeniu',
  felul: 'Felul actului',
  emitent: 'Emitent',
  tip: 'Tip',
  dinamica: 'Dinamică',
}
/** Lenses with data in this prototype; the rest say „în curând". */
export const LENS_READY: Readonly<Record<Lens, boolean>> = { tema: true, domeniu: false, felul: true, emitent: true, tip: true, dinamica: true }

export const FORMS = ['clasament', 'timp', 'grila'] as const
export type Form = (typeof FORMS)[number]
export const ORDERS = ['modificari', 'decizii', 'versiuni', 'an'] as const
export type Order = (typeof ORDERS)[number]

export type Query = {
  readonly populatie: 'flux' | 'stoc'
  readonly vedere: Lens
  readonly forma: Form
  readonly cu: Lens
  readonly an: { readonly from: number; readonly to: number } | null
  readonly tip: readonly number[]
  readonly emitent: number | null
  readonly felul: string | null
  readonly dinamica: number | null
  readonly tema: number | null
  readonly ordine: Order
}

export const YEAR_MIN = 1990
export const YEAR_MAX = Math.max(...D.years)

export const DEFAULT_QUERY: Query = {
  populatie: 'flux',
  vedere: 'felul',
  forma: 'clasament',
  cu: 'tip',
  an: null,
  tip: [],
  emitent: null,
  felul: null,
  dinamica: null,
  tema: null,
  ordine: 'modificari',
}

const str = (v: unknown) => (typeof v === 'number' ? String(v) : typeof v === 'string' ? v : '')
function oneOf<T extends string>(v: unknown, list: readonly T[], fallback: T): T {
  const s = str(v)
  return (list as readonly string[]).includes(s) ? (s as T) : fallback
}
const intIn = (v: unknown, max: number): number | null => {
  const n = Number(str(v))
  return Number.isInteger(n) && n >= 0 && n < max ? n : null
}

/** Every key the address carries is read; an unreadable one falls back to its default (G7). */
export function readQuery(search: Record<string, unknown>): Query {
  const anText = str(search.an)
  const m = /^(\d{4})(?:-(\d{4}))?$/u.exec(anText)
  const an = m ? { from: Number(m[1]), to: Number(m[2] ?? m[1]) } : null
  const tip = str(search.tip)
    .split(',')
    .map((s) => D.types.indexOf(s))
    .filter((i) => i >= 0)
  const felul = str(search.felul)
  const em = str(search.emitent)
  const emitent = em ? D.issuers.findIndex((x) => slug(x.name) === em) : -1
  return {
    populatie: oneOf(search.populatie, ['flux', 'stoc'] as const, 'flux'),
    vedere: oneOf(search.vedere, LENSES, 'felul'),
    forma: oneOf(search.forma, FORMS, 'clasament'),
    cu: oneOf(search.cu, LENSES, 'tip'),
    an: an && an.from <= an.to ? an : null,
    tip,
    emitent: emitent >= 0 ? emitent : null,
    felul: felul && (felul in GROUP_LABEL || felul in KIND_LABEL) ? felul : null,
    dinamica: intIn(search.dinamica, 4),
    tema: intIn(search.tema, 64),
    ordine: oneOf(search.ordine, ORDERS, 'modificari'),
  }
}

export const slug = (s: string) =>
  s
    .normalize('NFKD')
    .replace(/[̀-ͯ]/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, '-')
    .replace(/^-|-$/gu, '')

/** The address of a question: only what differs from the default (a choice set back to it leaves the URL). */
export function searchOf(q: Query): Record<string, string | undefined> {
  return {
    populatie: q.populatie === 'flux' ? undefined : q.populatie,
    vedere: q.vedere === 'felul' ? undefined : q.vedere,
    forma: q.forma === 'clasament' ? undefined : q.forma,
    cu: q.forma === 'grila' && q.cu !== 'tip' ? q.cu : undefined,
    an: q.an ? (q.an.from === q.an.to ? String(q.an.from) : `${q.an.from}-${q.an.to}`) : undefined,
    tip: q.tip.length ? q.tip.map((i) => D.types[i]).join(',') : undefined,
    emitent: q.emitent === null ? undefined : slug(D.issuers[q.emitent]?.name ?? ''),
    felul: q.felul ?? undefined,
    dinamica: q.dinamica === null ? undefined : String(q.dinamica),
    tema: q.tema === null ? undefined : String(q.tema),
    ordine: q.ordine === 'modificari' ? undefined : q.ordine,
  }
}

/** The question and the way to change it: every control writes the address. */
export function useQuery(): readonly [Query, (next: Query) => void] {
  const search = useSearch({ strict: false }) as Record<string, unknown>
  const navigate = useNavigate()
  const query = readQuery(search)
  const move = (next: Query) =>
    void navigate({
      to: '.',
      // Numbers are written as strings the router keeps: every value here is text.
      search: (previous: Record<string, unknown>) => {
        const out: Record<string, unknown> = { ...previous }
        for (const [k, v] of Object.entries(searchOf(next))) {
          if (v === undefined) delete out[k]
          else out[k] = v
        }
        return out
      },
      resetScroll: false,
    })
  return [query, move] as const
}

// ─────────────────────────────────────────────────────────── cube ──

export type CubeRow = { readonly y: number; readonly t: number; readonly k: number; readonly i: number; readonly d: number; readonly u: number; readonly n: number }

export const CUBE: readonly CubeRow[] = (() => {
  const out: CubeRow[] = []
  const c = FX.cube
  for (let j = 0; j + 6 < c.length; j += 7) {
    out.push({ y: D.years[c[j]!]!, t: c[j + 1]!, k: c[j + 2]!, i: c[j + 3]!, d: c[j + 4]!, u: c[j + 5]!, n: c[j + 6]! })
  }
  return out
})()

export const groupOfKind = (k: number) => D.kinds[k]?.group ?? 'other'

/** Whether a cube row is in the question, leaving out one dimension when a breakdown must not filter itself. */
export function inQuery(r: CubeRow, q: Query, skip?: 'tip' | 'emitent' | 'felul' | 'dinamica' | 'an'): boolean {
  if (q.populatie === 'stoc' && !STOCK_KIND[r.k]) return false
  if (skip !== 'an' && q.an && (r.y < q.an.from || r.y > q.an.to)) return false
  if (skip !== 'tip' && q.tip.length && !q.tip.includes(r.t)) return false
  if (skip !== 'emitent' && q.emitent !== null && r.i !== q.emitent) return false
  if (skip !== 'felul' && q.felul !== null) {
    const kind = D.kinds[r.k]?.key
    if (q.felul !== kind && q.felul !== groupOfKind(r.k)) return false
  }
  if (skip !== 'dinamica' && q.dinamica !== null && r.d !== q.dinamica) return false
  return true
}

/** The lens value a cube row falls under (`tema` and `domeniu` have no cube dimension yet). */
export function valueOf(r: CubeRow, lens: Lens, fine = false): string {
  switch (lens) {
    case 'felul':
      return fine ? (D.kinds[r.k]?.key ?? 'other') : groupOfKind(r.k)
    case 'tip':
      return D.types[r.t] ?? ''
    case 'emitent':
      return String(r.i)
    case 'dinamica':
      return String(r.d)
    default:
      return ''
  }
}

export function labelOf(lens: Lens, value: string, fine = false): string {
  switch (lens) {
    case 'felul':
      return (fine ? KIND_LABEL[value] : GROUP_LABEL[value]) ?? value
    case 'tip':
      return TYPE_LABEL[value] ?? value
    case 'emitent':
      return D.issuers[Number(value)]?.name ?? value
    case 'dinamica':
      return DYN_LABEL[Number(value)] ?? value
    default:
      return value
  }
}

export type Ranked = { readonly key: string; readonly label: string; readonly n: number; readonly share: number }

/** Counts per lens value over the question, largest first, with each value's share of the selection. */
export function rank(q: Query, lens: Lens, fine = false): { readonly rows: readonly Ranked[]; readonly total: number } {
  const by = new Map<string, number>()
  let total = 0
  for (const r of CUBE) {
    if (!inQuery(r, q)) continue
    total += r.n
    const v = valueOf(r, lens, fine)
    by.set(v, (by.get(v) ?? 0) + r.n)
  }
  const rows = [...by.entries()]
    .map(([key, n]) => ({ key, label: labelOf(lens, key, fine), n, share: total ? n / total : 0 }))
    .sort((a, b) => b.n - a.n)
  return { rows, total }
}

/** Acts per year and lens value (the top `top` values, the rest as „altele"), over the question's years. */
export function series(q: Query, lens: Lens, top = 5) {
  const ranked = rank(q, lens).rows.slice(0, top).map((r) => r.key)
  const from = q.an?.from ?? YEAR_MIN
  const to = q.an?.to ?? YEAR_MAX
  const years = Array.from({ length: to - from + 1 }, (_, j) => from + j)
  const table = new Map(years.map((y) => [y, new Array<number>(ranked.length + 1).fill(0)]))
  let unknownYear = 0
  for (const r of CUBE) {
    if (!inQuery(r, q, 'an')) continue
    if (r.y === 0) {
      unknownYear += r.n
      continue
    }
    const row = table.get(r.y)
    if (!row) continue
    const ix = ranked.indexOf(valueOf(r, lens))
    row[ix >= 0 ? ix : ranked.length]! += r.n
  }
  return {
    keys: [...ranked, 'altele'],
    labels: [...ranked.map((k) => labelOf(lens, k)), 'altele'],
    years: years.map((y) => ({ year: y, values: table.get(y)! })),
    unknownYear,
  }
}

/** A two-lens grid: rows by `lens`, columns by `cu` (top 6 + „altele"). */
export function grid(q: Query, lens: Lens, cu: Lens) {
  const rows = rank(q, lens).rows.slice(0, 10)
  const cols = rank(q, cu).rows.slice(0, 6)
  const colKeys = cols.map((c) => c.key)
  const cells = rows.map(() => new Array<number>(cols.length + 1).fill(0))
  for (const r of CUBE) {
    if (!inQuery(r, q)) continue
    const ri = rows.findIndex((x) => x.key === valueOf(r, lens))
    if (ri < 0) continue
    const ci = colKeys.indexOf(valueOf(r, cu))
    cells[ri]![ci >= 0 ? ci : cols.length]! += r.n
  }
  return { rows, cols: [...cols.map((c) => c.label), 'altele'], cells }
}

/** The figures of the selection: acts, how many have text (can be placed on the map), the rule-making share. */
export function figures(q: Query) {
  let total = 0
  let withText = 0
  let rules = 0
  let all = 0
  for (const r of CUBE) {
    if (q.populatie === 'stoc' ? STOCK_KIND[r.k] : true) all += r.n
    if (!inQuery(r, q)) continue
    total += r.n
    if (r.u) withText += r.n
    if (groupOfKind(r.k) === 'rule-making') rules += r.n
  }
  return { total, withText, rules, all }
}

export function isFiltered(q: Query): boolean {
  return q.an !== null || q.tip.length > 0 || q.emitent !== null || q.felul !== null || q.dinamica !== null || q.tema !== null
}

export const fmt = (n: number) => n.toLocaleString('ro-RO')
export const pct = (x: number, digits = 1) => `${(x * 100).toLocaleString('ro-RO', { minimumFractionDigits: digits, maximumFractionDigits: digits })}%`
