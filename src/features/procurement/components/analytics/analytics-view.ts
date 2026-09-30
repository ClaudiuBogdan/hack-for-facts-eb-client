import { i18n } from '@lingui/core'
import { t } from '@lingui/core/macro'
import { monthText } from '../../lib/home-format'
import { clippedBucket, cpvPrefix, POPULATIONS, searchOf, unreadParams, type AnalyticsSearch, type AxisId, type Query } from '../../lib/analytics-model'
import type { Ranking } from '../../api/procurement-analytics-api'
import { QUESTIONS } from '../../lib/analytics-questions'
import { COUNTY_POPULATION, type Answer } from '../../hooks/use-procurement-analytics'
import {
  beforeComparableNote,
  changeText,
  countText,
  degradedNote,
  keyLabel,
  kindSplitNote,
  moneyText,
  percentText,
  recordsCount,
  residentsText,
  unknownLabel,
  type Namer,
} from '../../lib/analytics-text'

/**
 * The analytics page's view helpers, pure: the figures, a filter's chip, the
 * link to share, the caveats, the ranked rows and where each opens, a
 * bucket's label. The components draw them.
 */

// ──────────────────────────────────────────────────────────── figures ──

export interface Figure {
  /** Which number it is: its trend reads the years' counts or money. */
  readonly key: 'records' | 'money' | 'firms' | 'top5'
  readonly label: string
  readonly value: string
  readonly change: string | null
  readonly muted?: boolean
}

export function figuresOf(query: Query, answer: Answer): readonly Figure[] | null {
  const now = answer.figures.data?.now ?? null
  if (!now) return null
  const before = answer.figures.data?.before ?? null
  const population = POPULATIONS[query.tip]
  const concentration = answer.concentration.data
  const byValue = query.masura !== 'numar' && population.money !== 'none'
  const figures: Figure[] = [
    {
      key: 'records',
      label: population.id === 'directe' ? t`Achiziții` : population.id === 'contracte' ? t`Contracte` : t`Acorduri-cadru`,
      value: now.records !== null ? countText(now.records) : '—',
      change: changeText(now.records, before?.records ?? null),
    },
  ]
  if (population.money === 'clean') figures.push({ key: 'money', label: t`Lei, fără TVA`, value: now.money !== null ? moneyText(now.money) : '—', change: changeText(now.money, before?.money ?? null) })
  if (population.money === 'provisional') figures.push({ key: 'money', label: t`Lei, provizoriu`, value: now.money !== null ? moneyText(now.money) : '—', change: null, muted: true })
  if (!query.filters.furnizor) {
    figures.push({ key: 'firms', label: t`Firme`, value: concentration?.firms != null ? countText(concentration.firms) : '…', change: null })
    figures.push({ key: 'top5', label: byValue ? t`Top 5 firme, din lei` : t`Top 5 firme`, value: concentration?.top5 != null ? percentText(concentration.top5, 0) : '…', change: null })
  }
  return figures
}

export function filterChipLabel(axis: AxisId, level: string, value: string, namer: Namer): string {
  const name = keyLabel(axis, level, axis === 'cpv' ? value.padEnd(8, '0') : value, namer)
  if (axis === 'cumparator') return name
  if (axis === 'furnizor') return name
  if (axis === 'cpv') return name
  if (axis === 'loc') return level === 'judet' ? t`instituții din ${name}` : t`instituții din ${name}`
  if (axis === 'loc_firma') return t`firme din ${name}`
  return name
}

/** „Procedures" a contract row carries, by SEAP's own words (the scope takes them as they are). */
export const PROCEDURES = [
  'Licitatie deschisa',
  'Procedura simplificata',
  'Negociere fara publicare prealabila',
  'Norme proprii (Anexa 2)',
  'Licitatie restransa',
  'Procedura competitiva cu negociere',
  'Licitatie deschisa accelerata',
]

/** This page's address for a query, the months frozen where they would move: a link a journalist cites must not move with the next month. */
export function shareUrl(query: Query, answer: Answer): string {
  // The last twelve months and a year in progress move with the next month; the link carries the months they are today.
  const moving = query.period.kind === 'recent' || (query.period.kind === 'year' && answer.period !== null && !answer.period.to.endsWith('-12'))
  const period = answer.period && moving ? { kind: 'months' as const, from: answer.period.from, to: answer.period.to } : query.period
  const params = new URLSearchParams(Object.entries(searchOf({ ...query, period })).filter((entry): entry is [string, string] => entry[1] !== undefined))
  return `${window.location.origin}${window.location.pathname}${params.size > 0 ? `?${params.toString()}` : ''}`
}

/**
 * The query as one sentence (generated, never edited), its months, what the
 * records are — then what the reader must know before the figures: what the
 * address held that the page could not use, a window the population does not
 * compare across, the API's own partial verdict, the question's warning.
 */
export interface ReadoutNotes {
  /** What the address held that the page could not use. */
  readonly unread: string | null
  /** What the numbers cannot say for this window: before 2019, past the kind split, the API's partial verdict. */
  readonly warnings: readonly string[]
  /** The ready question's own warning, when the address is one. */
  readonly trap: string | null
}

// ───────────────────────────────────────────────────────────── readout ──

export function readoutNotes(query: Query, answer: Answer, search: AnalyticsSearch): ReadoutNotes {
  const unread = unreadParams(search)
  const population = POPULATIONS[query.tip]
  // A question's warning belongs to its own address, never to a default an unread address fell back to.
  const question = unread.length === 0 ? QUESTIONS.find((item) => JSON.stringify(searchOf(item.query)) === JSON.stringify(searchOf(query))) : undefined
  const split = population.kindSplitUntil
  const now = answer.figures.data?.now ?? null
  const warnings: string[] = []
  if (answer.period && answer.period.from < `${population.comparableFrom}-01`) warnings.push(beforeComparableNote(query.tip))
  if (split && answer.period && answer.period.to > split) warnings.push(kindSplitNote(query.tip))
  if (now?.answerability === 'degraded') warnings.push(degradedNote(now.undated, now.undatedMoney))
  if (now?.answerability === 'abstained') warnings.push(t`Sursa nu răspunde pentru această selecție: cifrele lipsesc, nu sunt zero.`)
  return {
    unread: unread.length > 0 ? t`Din adresă n-am putut folosi: ${unread.map((item) => `${item.param}=${item.value}`).join(', ')}. Răspunsul de mai jos nu ține seama de ele.` : null,
    warnings,
    trap: question?.trap ? i18n._(question.trap) : null,
  }
}

// ──────────────────────────────────────────────────────── ranked answer ──

export interface Row {
  readonly key: string | null
  readonly kind: 'top' | 'other' | 'unknown' | 'withheld'
  readonly label: string
  readonly sub: string | null
  /** What the row is ranked and drawn by. */
  readonly figure: number | null
  readonly figureText: string
  readonly share: number | null
  readonly secondary: string | null
}

export function rowsOf(query: Query, ranking: Ranking, namer: Namer): { readonly rows: readonly Row[]; readonly total: number | null } {
  const group = query.dupa as { axis: AxisId; level: string }
  const perResident = query.masura === 'locuitor'
  const byValue = ranking.rankedBy === 'value'
  const population = POPULATIONS[query.tip]
  const buckets = ranking.buckets
  const total = buckets.reduce((sum, bucket) => sum + (byValue ? (bucket.money ?? 0) : bucket.count), 0) + (byValue ? (ranking.withheld ?? 0) : 0)
  const moneyOf = (value: number | null) => (value === null ? '—' : moneyText(value))
  const rows: Row[] = buckets
    // An empty „Restul" or unknown bucket is no row: nothing is left out.
    .filter((bucket) => bucket.kind === 'top' || bucket.count > 0)
    .map((bucket) => {
      const label = bucket.kind === 'other' ? t`Restul` : bucket.kind === 'unknown' ? unknownLabel(group.axis) : keyLabel(group.axis, group.level, bucket.key ?? '', namer)
      const sub = bucket.kind !== 'top' || !bucket.key ? null : group.axis === 'cumparator' || group.axis === 'furnizor' ? `CUI ${bucket.key}` : group.axis === 'cpv' ? `CPV ${cpvPrefix(bucket.key, group.level)}` : null
      if (perResident && !bucket.key) {
        // No county, so no residents: the total, said as a total, never beside the rates.
        const total = population.money === 'clean' ? bucket.money : bucket.count
        return { key: null, kind: bucket.kind, label, sub: null, figure: null, figureText: '—', share: null, secondary: total === null ? null : population.money === 'clean' ? t`${moneyText(total)} în total` : t`${countText(total)} în total` }
      }
      if (perResident && bucket.key) {
        const residents = COUNTY_POPULATION.get(bucket.key) ?? null
        const base = population.money === 'clean' ? bucket.money : bucket.count
        const rate = residents && base !== null ? (population.money === 'clean' ? base / residents : (base / residents) * 100_000) : null
        return {
          key: bucket.key,
          kind: bucket.kind,
          label,
          sub: residents ? residentsText(residents) : null,
          figure: rate,
          figureText: rate === null ? '—' : population.money === 'clean' ? `${countText(Math.round(rate))} lei` : countText(Math.round(rate)),
          share: null,
          secondary: population.money === 'clean' ? moneyOf(bucket.money) : countText(bucket.count),
        }
      }
      const figure = byValue ? bucket.money : bucket.count
      return {
        key: bucket.key,
        kind: bucket.kind,
        label,
        sub,
        figure,
        figureText: byValue ? moneyOf(bucket.money) : countText(bucket.count),
        share: total > 0 && figure !== null ? figure / total : null,
        // Contract money is shown only when asked for (and marked); beside a count it would read as a total.
        secondary: byValue ? recordsCount(query.tip, bucket.count) : population.money === 'clean' && bucket.money !== null ? moneyOf(bucket.money) : null,
      }
    })
  // Contract money SEAP publishes per consortium belongs to no member (nor to a member's county): its own row, sized, so the list adds up and the gap shows.
  if (byValue && ranking.withheld && ranking.withheld > 0) {
    rows.push({ key: null, kind: 'withheld', label: t`În asociere — neîmpărțit pe firme`, sub: t`SEAP publică valoarea întregii asocieri, nu partea fiecărei firme`, figure: ranking.withheld, figureText: moneyOf(ranking.withheld), share: total > 0 ? ranking.withheld / total : null, secondary: null })
  }
  const top = rows.filter((row) => row.kind === 'top')
  const rest = rows.filter((row) => row.kind !== 'top')
  if (perResident) top.sort((a, b) => (b.figure ?? -1) - (a.figure ?? -1))
  return { rows: [...top, ...rest.sort((a, b) => (b.figure ?? 0) - (a.figure ?? 0))], total }
}

export function profileLink(axis: AxisId, key: string): { readonly to: string; readonly params: Record<string, string> } | null {
  if (axis === 'cumparator') return { to: '/procurement/institutions/$cui', params: { cui: key } }
  if (axis === 'furnizor') return { to: '/procurement/suppliers/$cui', params: { cui: key } }
  return null
}

/** What of a bucket a window holds, when not all of it: „(din iunie)", „(până în mai)", „(iunie–august)". */
export function clippedText(bucket: string, window: { readonly from: string; readonly to: string } | null): string | null {
  const clipped = window ? clippedBucket(bucket, window) : null
  if (!clipped) return null
  const month = (value: string) => monthText(value).split(' ')[0]
  if (clipped.from && clipped.to) return t`(${month(clipped.from)}–${month(clipped.to)})`
  if (clipped.from) return t`(din ${month(clipped.from)})`
  return t`(până în ${month(clipped.to!)})`
}

// ────────────────────────────────────────────────────────── time answer ──

export function bucketLabel(bucket: string): string {
  if (/^\d{4}$/u.test(bucket)) return bucket
  if (/^\d{4}-Q[1-4]$/u.test(bucket)) return bucket.replace('-Q', ' T')
  return monthText(bucket)
}

/** How many filters a query holds: its axes, its title words, its value range. */
export function filterCount(query: Query): number {
  return Object.keys(query.filters).length + (query.titlu ? 1 : 0) + (query.valoare ? 1 : 0)
}
