import { plural, t } from '@lingui/core/macro'
import { countyNameRo } from '@/lib/territory-counties'
import type { RegistryRecord, RegistrySnapshot } from './api'
import { formatNgoDate, formatNgoNumber } from '@/features/ngos/hub/ngo-format'
import { REGISTRY_STATUS_VALUE } from '@/features/ngos/hub/registry-figures'
import type { NgoRegistryCategoryKey, NgoRegistryStatusKey, NgoRegistrySummary } from '@/features/ngos/hub/registry-summary-types'

/**
 * The registry page's model, pure: the query and its address (the route's
 * own keys, so every link the hub already makes keeps working), the question
 * as a sentence, the read of the records, the axes a selection splits on,
 * the caveats, the ready questions and the omnibox's suggestions. What a
 * selection counts to — its figures and its breakdowns — is
 * `counts.ts`.
 *
 * What the API gives (dev-chronos-api, 2026-09-30): `ngoRegistryRecords`
 * with six filters (`name.contains`, `county.eq`, `category.eq`,
 * `status.eq`, `registryNumber.eq`, `publicUtility.eq`), 1–100 rows a page,
 * a cursor, no count, no sort, no group-by; rows in the export's order,
 * which is the registration date descending.
 */

// ───────────────────────────────────────────────────────────── the query ──

export interface RegistryQuery {
  /** `null` is every status: the registry, not the living organisations. */
  readonly status: NgoRegistryStatusKey | null
  /** The county as the registry spells it (`CLUJ`, `BUCURESTI`): the filter matches it exactly. */
  readonly county: string | null
  readonly category: NgoRegistryCategoryKey | null
  readonly publicUtility: boolean | null
  /** Words in the name; the registry's `contains`, diacritics ignored. */
  readonly q: string | null
  /** `3446/A/2026`, looked up exactly. */
  readonly registryNumber: string | null
}

export const EMPTY_QUERY: RegistryQuery = { status: null, county: null, category: null, publicUtility: null, q: null, registryNumber: null }

export const STATUS_ORDER: readonly (NgoRegistryStatusKey | null)[] = [null, 'registered', 'dissolved', 'inLiquidation', 'deregistered']

export const CATEGORY_KEYS: readonly NgoRegistryCategoryKey[] = ['association', 'foundation', 'federation', 'religious_association', 'foreign_legal_person']

const STATUS_KEY_OF_VALUE = new Map<string, NgoRegistryStatusKey>(
  (Object.entries(REGISTRY_STATUS_VALUE) as [NgoRegistryStatusKey, string][]).map(([key, value]) => [value.toLowerCase(), key]),
)

/** A registry number as the registry writes it: `3446/A/2026` (A–E: the registry's parts, by legal form). */
const REGISTRY_NUMBER = /^\d{1,6}\s*\/\s*[a-e]\s*\/\s*\d{4}$/i

export function isRegistryNumber(text: string): boolean {
  return REGISTRY_NUMBER.test(text.trim())
}

function fold(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/gu, '').toUpperCase().trim()
}

/** A county's name folded for matching: no diacritics, capitals, a hyphen as a space („Satu-Mare" is „SATU MARE"). */
function foldCounty(text: string): string {
  return fold(text).replace(/[-\s]+/gu, ' ')
}

/**
 * A county as typed — its code, its name, the registry's spelling, with or
 * without diacritics or hyphens — as the registry spells it; `null` for one
 * the registry does not spell, which the address then reports as unread
 * rather than filtering on it to nothing.
 */
export function countyOf(input: string, counties: NgoRegistrySummary['counties']): string | null {
  const wanted = foldCounty(input)
  if (wanted === '') return null
  const found = counties.find(
    (county) => county.code === wanted || foldCounty(county.source) === wanted || foldCounty(countyNameRo(county.code) ?? '') === wanted,
  )
  return found ? found.source : null
}

/** A county's name for the page („Cluj", „București"), from the registry's spelling; an unknown spelling is shown as it came. */
export function countyLabel(source: string, counties: NgoRegistrySummary['counties']): string {
  const found = counties.find((county) => county.source === source)
  return (found ? countyNameRo(found.code) : undefined) ?? source
}

export interface UnreadParam {
  readonly param: string
  readonly value: string
}

/** The address as the query, and what in it the page could not use. */
export function queryOf(
  search: Record<string, unknown>,
  counties: NgoRegistrySummary['counties'],
): { readonly query: RegistryQuery; readonly unread: readonly UnreadParam[] } {
  const unread: UnreadParam[] = []
  const text = (key: string, max = 200): string => (typeof search[key] === 'string' ? search[key].trim().slice(0, max) : '')
  const rawStatus = text('status')
  const status = rawStatus === '' ? null : (STATUS_KEY_OF_VALUE.get(rawStatus.toLowerCase()) ?? null)
  if (rawStatus !== '' && status === null) unread.push({ param: 'status', value: rawStatus })
  const rawCategory = text('category')
  const category = CATEGORY_KEYS.find((key) => key === rawCategory.toLowerCase()) ?? null
  if (rawCategory !== '' && category === null) unread.push({ param: 'category', value: rawCategory })
  const rawUtility = text('publicUtility').toLowerCase()
  const publicUtility = rawUtility === 'yes' ? true : rawUtility === 'no' ? false : null
  if (rawUtility !== '' && publicUtility === null) unread.push({ param: 'publicUtility', value: rawUtility })
  const rawCounty = text('county')
  const county = rawCounty === '' ? null : countyOf(rawCounty, counties)
  if (rawCounty !== '' && county === null) unread.push({ param: 'county', value: rawCounty })
  const q = text('q')
  const rawNumber = text('registryNumber')
  const registryNumber = rawNumber === '' ? null : isRegistryNumber(rawNumber) ? rawNumber.replace(/\s/gu, '').toUpperCase() : null
  if (rawNumber !== '' && registryNumber === null) unread.push({ param: 'registryNumber', value: rawNumber })
  return { query: { status, county, category, publicUtility, q: q === '' ? null : q, registryNumber }, unread }
}

/** The query as the route's address: only what is set, in the route's own keys. */
export function searchOf(query: RegistryQuery): Record<string, string> {
  const search: Record<string, string> = {}
  if (query.q) search.q = query.q
  if (query.county) search.county = query.county
  if (query.category) search.category = query.category
  if (query.status) search.status = REGISTRY_STATUS_VALUE[query.status]
  if (query.registryNumber) search.registryNumber = query.registryNumber
  if (query.publicUtility !== null) search.publicUtility = query.publicUtility ? 'yes' : 'no'
  return search
}

/** A selection's identity, for what belongs to one selection (a read, the table's page): its address. */
export function selectionKey(query: RegistryQuery): string {
  return JSON.stringify(searchOf(query))
}

/** The GraphQL filter the query compiles to. */
export function filterOf(query: RegistryQuery): Record<string, unknown> {
  return {
    ...(query.q ? { name: { contains: query.q } } : {}),
    ...(query.county ? { county: { eq: query.county } } : {}),
    ...(query.category ? { category: { eq: query.category } } : {}),
    ...(query.status ? { status: { eq: REGISTRY_STATUS_VALUE[query.status] } } : {}),
    ...(query.registryNumber ? { registryNumber: { eq: query.registryNumber } } : {}),
    ...(query.publicUtility === null ? {} : { publicUtility: { eq: query.publicUtility } }),
  }
}

export type FilterKey = Exclude<keyof RegistryQuery, 'status'>

const FILTER_ORDER: readonly FilterKey[] = ['category', 'publicUtility', 'county', 'q', 'registryNumber']

export function activeFilters(query: RegistryQuery): readonly FilterKey[] {
  return FILTER_ORDER.filter((key) => query[key] !== null)
}

export function filterCount(query: RegistryQuery): number {
  return activeFilters(query).length
}

export function without(query: RegistryQuery, key: FilterKey): RegistryQuery {
  return { ...query, [key]: null }
}

export function isSame(a: RegistryQuery, b: RegistryQuery): boolean {
  return JSON.stringify(searchOf(a)) === JSON.stringify(searchOf(b))
}

// ───────────────────────────────────────────────────────────── the words ──

export function statusLabel(status: NgoRegistryStatusKey | null): string {
  switch (status) {
    case 'registered':
      return t`Înregistrate`
    case 'dissolved':
      return t`Dizolvate`
    case 'inLiquidation':
      return t`În lichidare`
    case 'deregistered':
      return t`Radiate`
    default:
      return t`Toate`
  }
}

/** A row's status, as the registry says it, in the reader's words. */
export function statusWord(value: string): string {
  const key = STATUS_KEY_OF_VALUE.get(value.toLowerCase())
  switch (key) {
    case 'registered':
      return t`înregistrat`
    case 'dissolved':
      return t`dizolvat`
    case 'inLiquidation':
      return t`în lichidare`
    case 'deregistered':
      return t`radiat`
    default:
      return value
  }
}

export function statusKeyOf(value: string): NgoRegistryStatusKey | null {
  return STATUS_KEY_OF_VALUE.get(value.toLowerCase()) ?? null
}

export function categoryLabel(category: NgoRegistryCategoryKey): string {
  switch (category) {
    case 'association':
      return t`Asociații`
    case 'foundation':
      return t`Fundații`
    case 'federation':
      return t`Federații`
    case 'religious_association':
      return t`Asociații religioase`
    case 'foreign_legal_person':
      return t`Persoane juridice străine`
  }
}

/** The subject with its article, as the headline starts: „Fundațiile", „ONG-urile". */
function subjectOf(category: NgoRegistryCategoryKey | null): string {
  switch (category) {
    case 'association':
      return t`Asociațiile`
    case 'foundation':
      return t`Fundațiile`
    case 'federation':
      return t`Federațiile`
    case 'religious_association':
      return t`Asociațiile religioase`
    case 'foreign_legal_person':
      return t`Persoanele juridice străine`
    default:
      return t`ONG-urile`
  }
}

/** The status as the headline's adjective, agreed with every subject (all feminine plural). */
function statusPhrase(status: NgoRegistryStatusKey): string {
  switch (status) {
    case 'registered':
      return t`înregistrate`
    case 'dissolved':
      return t`dizolvate`
    case 'inLiquidation':
      return t`în lichidare`
    case 'deregistered':
      return t`radiate`
  }
}

interface HeadlinePart {
  readonly role: 'subject' | 'status' | FilterKey
  /** The words before this part, a space mostly. */
  readonly before: string
  readonly text: string
}

/**
 * The question as a Romanian sentence, in parts: the subject (the legal
 * form, or „ONG-urile"), the status, then each filter as a phrase —
 * „Fundațiile radiate din județul Cluj cu „kirali” în nume". With nothing
 * set: „Toate ONG-urile din registru".
 */
export function headlineParts(query: RegistryQuery, counties: NgoRegistrySummary['counties']): readonly HeadlinePart[] {
  const parts: HeadlinePart[] = []
  const others = activeFilters(query).filter((key) => key !== 'category')
  const bare = query.status === null && others.length === 0
  const bareSubject = bare && query.category === null
  const subject = subjectOf(query.category).toLocaleLowerCase('ro-RO')
  parts.push({
    role: 'subject',
    before: '',
    text: bareSubject ? t`Toate ONG-urile din registru` : bare ? t`Toate ${subject} din registru` : subjectOf(query.category),
  })
  if (query.status !== null) parts.push({ role: 'status', before: ' ', text: statusPhrase(query.status) })
  if (query.publicUtility !== null)
    parts.push({ role: 'publicUtility', before: ' ', text: query.publicUtility ? t`de utilitate publică` : t`fără utilitate publică declarată` })
  if (query.county !== null) {
    const name = countyLabel(query.county, counties)
    parts.push({ role: 'county', before: ' ', text: name === 'București' ? t`din București` : t`din județul ${name}` })
  }
  if (query.q !== null) {
    const words = query.q
    parts.push({ role: 'q', before: ' ', text: t`cu „${words}” în nume` })
  }
  if (query.registryNumber !== null) {
    const number = query.registryNumber
    parts.push({ role: 'registryNumber', before: ' ', text: t`cu numărul ${number}` })
  }
  return parts
}

export function headline(query: RegistryQuery, counties: NgoRegistrySummary['counties']): string {
  return headlineParts(query, counties)
    .map((part) => part.before + part.text)
    .join('')
}

/** A filter's value in a few words, for the panel's picked state and the chips. */
export function filterLabel(query: RegistryQuery, key: FilterKey, counties: NgoRegistrySummary['counties']): string {
  switch (key) {
    case 'category':
      return query.category ? categoryLabel(query.category) : ''
    case 'publicUtility':
      return query.publicUtility === null ? '' : query.publicUtility ? t`De utilitate publică` : t`Fără utilitate publică`
    case 'county':
      return query.county ? countyLabel(query.county, counties) : ''
    case 'q': {
      const words = query.q ?? ''
      return t`nume: „${words}”`
    }
    case 'registryNumber':
      return query.registryNumber ?? ''
  }
}

export function countText(count: number): string {
  return plural(count, { one: '# înregistrare', few: '# înregistrări', other: '# de înregistrări' })
}

// ───────────────────────────────────────────────────────────── the read ──

/** What the page has read of the selection so far. */
export interface RegistryRead {
  /** Rows read, repeated rows dropped. */
  readonly rows: readonly RegistryRecord[]
  /** Rows dropped as repeats of another row, field for field. */
  readonly repeated: number
  /** Every page of the selection is read: the rows are the whole selection. */
  readonly complete: boolean
  /** Uncounted and wider than the cap: the read stopped counting with more to read (the table's pages still come). */
  readonly capped: boolean
  /** Nothing read yet. */
  readonly pending: boolean
  readonly snapshot: RegistrySnapshot | null
}

/** Why the whole registry's counts do not answer a selection they could: not loaded, or made on another export. */
export type CountsGap = 'failed' | 'otherExport' | null

/** Pages of 100 the page reads before it stops counting: 2,000 rows, about three seconds on the dev API. */
export const READ_CAP_PAGES = 20
export const PAGE_SIZE = 100
/** Rows a table page shows. */
export const TABLE_PAGE = 25

/**
 * Rows repeated field for field (104 in the export) as one, judged by the
 * same fields as `scripts/count-ngo-registry.mjs`, so a read and the counts
 * agree on what a repeat is.
 */
export function distinctRows(rows: readonly RegistryRecord[]): { readonly rows: readonly RegistryRecord[]; readonly repeated: number } {
  const seen = new Set<string>()
  const kept: RegistryRecord[] = []
  for (const row of rows) {
    const key = JSON.stringify([
      row.registryNumber,
      row.name,
      row.nameWithheld,
      row.category,
      row.legalForm,
      row.court,
      row.sourceRegistryStatus,
      row.sourceRegistrationDate,
      row.county,
      row.locality,
      row.sourceCui,
      row.linkedOrganizationCui,
      row.isBranch,
      row.sourceReportsPublicUtility,
    ])
    if (seen.has(key)) continue
    seen.add(key)
    kept.push(row)
  }
  return { rows: kept, repeated: rows.length - kept.length }
}

/** The oldest registry numbers still in the registry are from 1990, before it was set up in 2000. */
const FIRST_NUMBER_YEAR = 1990

/**
 * The year in a registry number (`3446/A/2026`): the year the entry was
 * given, which the registration date does not keep. A year before 1990 or
 * after the export (`1005`, `3009`: typing slips) is no year.
 */
export function numberYear(registryNumber: string, lastYear: number): number | null {
  const match = /\/(\d{4})$/u.exec(registryNumber.trim())
  const year = match?.[1] ? Number(match[1]) : null
  return year !== null && year >= FIRST_NUMBER_YEAR && year <= lastYear ? year : null
}

// ───────────────────────────────────────────────────────── the answers ──

export type GroupAxis = 'judet' | 'localitate' | 'forma' | 'stare' | 'an'

export interface GroupRow {
  readonly key: string
  readonly label: string
  readonly count: number
  /** Of the selection, 0 to 1. */
  readonly share: number
}

/** The axes a selection can be broken down on: the ones its filters do not fix. */
export function groupAxes(query: RegistryQuery): readonly GroupAxis[] {
  const axes: GroupAxis[] = []
  if (query.county === null) axes.push('judet')
  else axes.push('localitate')
  if (query.category === null) axes.push('forma')
  if (query.status === null) axes.push('stare')
  axes.push('an')
  return axes
}

export function groupLabel(axis: GroupAxis): string {
  switch (axis) {
    case 'judet':
      return t`Pe județe`
    case 'localitate':
      return t`Pe localități`
    case 'forma':
      return t`Pe forme`
    case 'stare':
      return t`Pe stări`
    case 'an':
      return t`Pe ani`
  }
}

/** The query a breakdown row narrows to, where the address can say it. */
export function drilled(query: RegistryQuery, axis: GroupAxis, key: string): RegistryQuery | null {
  if (axis === 'judet') return { ...query, county: key }
  if (axis === 'forma') return CATEGORY_KEYS.includes(key as NgoRegistryCategoryKey) ? { ...query, category: key as NgoRegistryCategoryKey } : null
  if (axis === 'stare') {
    const status = statusKeyOf(key)
    return status ? { ...query, status } : null
  }
  // No locality or year filter in the API: the row stays a figure.
  return null
}

// ─────────────────────────────────────────────────────────── the notes ──

export interface RegistryNotes {
  /** What is off: an unread address, a late export, counts that did not load or belong to another export, a read past the cap. */
  readonly alerts: readonly string[]
  /** What a reader should know before the numbers. */
  readonly facts: readonly string[]
}

export function notesOf({
  query,
  unread,
  snapshot,
  summary,
  summaryMatches,
  read,
  countsGap,
  trap,
}: {
  readonly query: RegistryQuery
  readonly unread: readonly UnreadParam[]
  readonly snapshot: RegistrySnapshot | null
  readonly summary: NgoRegistrySummary
  /** The live export is the one the summary counted; when not, no summary figure is shown, here either. */
  readonly summaryMatches: boolean | null
  readonly read: RegistryRead
  readonly countsGap: CountsGap
  readonly trap: string | null
}): RegistryNotes {
  const alerts: string[] = []
  const facts: string[] = []
  if (unread.length > 0) {
    const list = unread.map((item) => `${item.param}=${item.value}`).join(', ')
    alerts.push(t`Din adresă n-am putut folosi: ${list}. Lista de mai jos nu ține seama de ele.`)
  }
  if (snapshot?.isCurrent && snapshot.refreshOverdue) {
    const captured = formatNgoDate(snapshot.capturedAt.slice(0, 10))
    alerts.push(t`Un export nou al registrului întârzie: datele sunt din ${captured}.`)
  }
  if (summaryMatches === false) alerts.push(t`Cifrele de context au fost calculate pe alt export decât cel citit acum; nu le arătăm.`)
  if (countsGap === 'failed') alerts.push(t`Numărătoarea întregului registru nu s-a încărcat: selecția e numărată din rândurile citite.`)
  if (countsGap === 'otherExport') alerts.push(t`Numărătoarea întregului registru e a altui export: selecția e numărată din rândurile citite.`)
  if (read.capped) {
    const atLeast = formatNgoNumber(read.rows.length)
    alerts.push(t`Selecția are cel puțin ${atLeast} de înregistrări: cifrele ei nu se calculează. Restrânge-o pentru un răspuns exact.`)
  }
  if (trap) alerts.push(trap)
  facts.push(t`„Înregistrat” înseamnă că organizația e în registru, nu că mai funcționează: registrul nu știe asta.`)
  if (snapshot && snapshot.nationalCompleteness !== 'verified') facts.push(t`Completitudinea la nivel național a exportului nu a fost verificată independent.`)
  // The summary's figures are of the export it counted: said only while that is the export read.
  if (summaryMatches !== false) {
    const repeated = formatNgoNumber(summary.repeated)
    facts.push(t`${repeated} rânduri se repetă în export câmp cu câmp; sunt numărate o dată.`)
    if (query.county === null) {
      const unplaced = formatNgoNumber(summary.noCounty)
      facts.push(t`${unplaced} intrări înregistrate nu au județ în registru; un filtru pe județ nu le găsește.`)
    }
  } else {
    facts.push(t`Rândurile repetate câmp cu câmp sunt numărate o dată.`)
  }
  facts.push(
    t`Data din registru se schimbă când intrarea se modifică; anul din numărul de registru rămâne. Lista vine în ordinea datei, cea mai recentă întâi.`,
  )
  if (query.q !== null) facts.push(t`Căutarea în nume ignoră diacriticele și găsește cuvintele oriunde în nume.`)
  if (query.publicUtility !== null) facts.push(t`Utilitatea publică este cea declarată în export, nu verificată la Secretariatul General al Guvernului.`)
  return { alerts, facts }
}

// ─────────────────────────────────────────────────────── the questions ──

interface RegistryQuestion {
  readonly id: string
  readonly text: string
  readonly query: RegistryQuery
  /** What the data cannot say for it. */
  readonly trap: string | null
}

export function questions(): readonly RegistryQuestion[] {
  return [
    {
      id: 'utilitate',
      text: t`ONG-urile de utilitate publică`,
      query: { ...EMPTY_QUERY, status: 'registered', publicUtility: true },
      trap: t`Registrul spune că o organizație e de utilitate publică; hotărârea de guvern nu e în export.`,
    },
    { id: 'lichidare', text: t`Organizațiile în lichidare`, query: { ...EMPTY_QUERY, status: 'inLiquidation' }, trap: null },
    {
      id: 'radiate-b',
      text: t`ONG-urile radiate din București`,
      query: { ...EMPTY_QUERY, status: 'deregistered', county: 'BUCURESTI' },
      trap: t`Radierea închide intrarea; data din registru e a ultimei modificări, nu neapărat a radierii.`,
    },
    {
      id: 'fundatii-cj',
      text: t`Fundațiile înregistrate din Cluj`,
      query: { ...EMPTY_QUERY, status: 'registered', category: 'foundation', county: 'CLUJ' },
      trap: null,
    },
    { id: 'federatii', text: t`Federațiile din registru`, query: { ...EMPTY_QUERY, category: 'federation' }, trap: null },
    { id: 'religioase', text: t`Asociațiile religioase`, query: { ...EMPTY_QUERY, category: 'religious_association' }, trap: null },
    { id: 'straine', text: t`Persoanele juridice străine`, query: { ...EMPTY_QUERY, category: 'foreign_legal_person' }, trap: null },
    {
      id: 'banci',
      text: t`Băncile pentru alimente`,
      query: { ...EMPTY_QUERY, q: 'banca pentru alimente' },
      trap: t`Doar numele care conțin cuvintele; o organizație numită altfel nu apare.`,
    },
    { id: 'adi', text: t`Asociațiile de dezvoltare intercomunitară`, query: { ...EMPTY_QUERY, q: 'dezvoltare intercomunitar' }, trap: null },
    { id: 'dizolvate-fundatii', text: t`Fundațiile dizolvate`, query: { ...EMPTY_QUERY, status: 'dissolved', category: 'foundation' }, trap: null },
  ]
}

export function questionOf(query: RegistryQuery): RegistryQuestion | null {
  return questions().find((question) => isSame(question.query, query)) ?? null
}

// ─────────────────────────────────────────────────────── the omnibox ──

interface Suggestion {
  readonly key: string
  readonly group: 'county' | 'form' | 'status' | 'utility' | 'name' | 'number'
  readonly label: string
  readonly query: RegistryQuery
}

/** What a few typed letters can mean: a county, a legal form, a status, public utility, words in a name, a registry number. */
export function suggestionsOf(term: string, query: RegistryQuery, counties: NgoRegistrySummary['counties']): readonly Suggestion[] {
  const typed = term.trim()
  if (typed.length < 2) return []
  const wanted = fold(typed)
  const found: Suggestion[] = []
  if (isRegistryNumber(typed)) {
    const number = typed.replace(/\s/gu, '').toUpperCase()
    found.push({ key: 'number', group: 'number', label: t`Numărul de registru ${number}`, query: { ...query, registryNumber: number } })
  }
  for (const county of counties) {
    const name = countyNameRo(county.code) ?? county.source
    if (fold(name).startsWith(wanted) || county.code === wanted)
      found.push({
        key: `county-${county.code}`,
        group: 'county',
        label: name === 'București' ? t`ONG-urile din București` : t`ONG-urile din județul ${name}`,
        query: { ...query, county: county.source },
      })
    if (found.filter((item) => item.group === 'county').length >= 4) break
  }
  for (const category of CATEGORY_KEYS) {
    const label = categoryLabel(category)
    if (fold(label).includes(wanted)) found.push({ key: `form-${category}`, group: 'form', label, query: { ...query, category } })
  }
  for (const status of STATUS_ORDER) {
    if (status === null) continue
    const label = statusLabel(status)
    if (fold(label).includes(wanted)) found.push({ key: `status-${status}`, group: 'status', label, query: { ...query, status } })
  }
  if (fold(t`utilitate publică`).includes(wanted) || wanted.startsWith('UTIL'))
    found.push({ key: 'utility', group: 'utility', label: t`De utilitate publică`, query: { ...query, publicUtility: true } })
  if (typed.length >= 3 && !isRegistryNumber(typed))
    found.push({ key: 'name', group: 'name', label: t`Numele conține „${typed}”`, query: { ...query, q: typed.slice(0, 200) } })
  return found
}
