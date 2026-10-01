import { t } from '@lingui/core/macro'
import { formatNgoDate, formatNgoNumber, formatNgoShare } from '@/features/ngos/hub/ngo-format'
import { REGISTRY_STATUS_VALUE, totalResidents } from '@/features/ngos/hub/registry-figures'
import type { NgoRegistryCategoryKey, NgoRegistrySummary } from '@/features/ngos/hub/registry-summary-types'
import type { RegistryRecord } from '@/features/ngos/registry/api'
import {
  activeFilters,
  categoryLabel,
  CATEGORY_KEYS,
  countyLabel,
  numberYear,
  statusKeyOf,
  statusLabel,
  type GroupAxis,
  type GroupRow,
  type RegistryQuery,
  type RegistryRead,
} from './registry.model'

/**
 * The registry counted whole (`scripts/count-ngo-registry.mjs`): every entry
 * by county, locality, legal form, status, public utility, registry-number
 * year and admitted CUI. The API cannot count or group, so these counts
 * answer any selection its filters make except a name or a registry number
 * — those are read from the API and counted from their own rows. Either way
 * a selection comes to the page as a {@link Tally}: the same figures and
 * breakdowns, whichever source counted it.
 */

export interface RegistryCounts {
  readonly snapshotId: string
  /** `YYYY-MM-DD`. */
  readonly capturedAt: string
  /** Rows in the export, repeats included. */
  readonly entries: number
  /** Rows dropped as field-for-field repeats of another. */
  readonly repeated: number
  /** The registry's own spellings: the API's `county.eq` matches them exactly. */
  readonly counties: readonly string[]
  readonly localities: readonly string[]
  readonly categories: readonly string[]
  /** The registry's status values (`Inregistrat`, `Radiat`…). */
  readonly statuses: readonly string[]
  /** Eight integers a cell: county, locality, form, status, public utility, year, CUI admitted, entries (-1 where blank). */
  readonly cells: readonly number[]
}

const STRIDE = 8
const [COUNTY, LOCALITY, FORM, STATUS, UTILITY, YEAR, CUI, ENTRIES] = [0, 1, 2, 3, 4, 5, 6, 7] as const
/** An axis's missing value: no county, no locality, a number without a year. */
const NONE = '\u0000'

// ────────────────────────────────────────────────────────────── the tally ──

/** One axis of a selection: each value's entries, the unknown under {@link NONE}. */
type Split = ReadonlyMap<string, number>

/** A selection counted: its entries, and every axis split, whichever source counted it. */
export interface Tally {
  /** The export the counts were made on (`YYYY-MM-DD`); `null` for a selection counted from its own read. */
  readonly capturedAt: string | null
  readonly total: number
  readonly withCui: number
  readonly by: Readonly<Record<GroupAxis, Split>>
}

function add(map: Map<string, number>, key: string, count: number) {
  map.set(key, (map.get(key) ?? 0) + count)
}

function emptySplits(): Record<GroupAxis, Map<string, number>> {
  return { judet: new Map(), localitate: new Map(), forma: new Map(), stare: new Map(), an: new Map() }
}

/**
 * The selection as the counts hold it; `null` where they cannot say — a
 * name or a registry number (the counts keep neither), or a county the
 * registry does not spell that way.
 */
export function tallyOfCounts(counts: RegistryCounts, query: RegistryQuery): Tally | null {
  if (query.q !== null || query.registryNumber !== null) return null
  const county = query.county === null ? null : counts.counties.indexOf(query.county)
  if (county === -1) return null
  const form = query.category === null ? null : counts.categories.indexOf(query.category)
  const status = query.status === null ? null : counts.statuses.indexOf(REGISTRY_STATUS_VALUE[query.status])
  if (form === -1 || status === -1) return null
  const utility = query.publicUtility === null ? null : query.publicUtility ? 1 : 0
  const by = emptySplits()
  let total = 0
  let withCui = 0
  const { cells } = counts
  for (let at = 0; at < cells.length; at += STRIDE) {
    if (county !== null && cells[at + COUNTY] !== county) continue
    if (form !== null && cells[at + FORM] !== form) continue
    if (status !== null && cells[at + STATUS] !== status) continue
    if (utility !== null && cells[at + UTILITY] !== utility) continue
    const entries = cells[at + ENTRIES] ?? 0
    const place = cells[at + COUNTY] ?? -1
    const town = cells[at + LOCALITY] ?? -1
    const year = cells[at + YEAR] ?? -1
    total += entries
    if (cells[at + CUI] === 1) withCui += entries
    add(by.judet, place < 0 ? NONE : (counts.counties[place] ?? NONE), entries)
    add(by.localitate, town < 0 ? NONE : (counts.localities[town] ?? NONE), entries)
    add(by.forma, counts.categories[cells[at + FORM] ?? -1] ?? NONE, entries)
    add(by.stare, counts.statuses[cells[at + STATUS] ?? -1] ?? NONE, entries)
    add(by.an, year < 0 ? NONE : String(year), entries)
  }
  return { capturedAt: counts.capturedAt, total, withCui, by }
}

/** A selection read whole from the API, counted from its own rows (repeats already dropped); `lastYear` is the export's. */
export function tallyOfRows(rows: readonly RegistryRecord[], lastYear: number): Tally {
  const by = emptySplits()
  let withCui = 0
  for (const row of rows) {
    // The CUI the platform admits, by any reviewed method — not only one the registry declares.
    if (row.organizationCui) withCui += 1
    add(by.judet, row.county === null || row.county === 'NEDETERMINAT' ? NONE : row.county, 1)
    add(by.localitate, row.locality ?? NONE, 1)
    add(by.forma, row.category, 1)
    add(by.stare, row.sourceRegistryStatus, 1)
    add(by.an, numberYear(row.registryNumber, lastYear)?.toString() ?? NONE, 1)
  }
  return { capturedAt: null, total: rows.length, withCui, by }
}

// ───────────────────────────────────────────────────────── the breakdown ──

/** How many of the selection an axis value holds; zero where it holds none. */
export function entriesOf(tally: Tally, axis: GroupAxis, key: string): number {
  return tally.by[axis].get(key) ?? 0
}

/** Values an axis splits the selection into, the unknown left out; a town under several spellings once (`code`: the selection's county). */
export function valuesOn(tally: Tally, axis: GroupAxis, code: string | null = null): number {
  const values = new Set<string>()
  for (const [key, count] of tally.by[axis]) if (key !== NONE && count > 0) values.add(axis === 'localitate' ? foldName(townLabel(key, code)) : key)
  return values.size
}

/** The selection's entries the axis cannot place: no county, no locality, no year in the number. */
export function unplacedOn(tally: Tally, axis: GroupAxis): number {
  return tally.by[axis].get(NONE) ?? 0
}

/** The registry-number years, oldest to newest, the gaps kept as zeros; the unplaced left out. */
export function yearPoints(tally: Tally): readonly { readonly year: number; readonly count: number }[] {
  const years = [...tally.by.an.keys()].filter((key) => key !== NONE).map(Number)
  if (years.length === 0) return []
  const from = Math.min(...years)
  const to = Math.max(...years)
  return Array.from({ length: to - from + 1 }, (_, index) => ({ year: from + index, count: entriesOf(tally, 'an', String(from + index)) }))
}

/**
 * The selection on one axis, largest first (years in their order), the
 * unknown last and named: rank, name, entries, share of the selection.
 */
export function groupRows(tally: Tally, axis: GroupAxis, counties: NgoRegistrySummary['counties'], county: string | null = null): readonly GroupRow[] {
  const code = countyCode(county, counties)
  const label = (key: string): string => {
    if (key === NONE)
      return axis === 'an' ? t`Fără an în număr` : axis === 'judet' ? t`Fără județ` : axis === 'localitate' ? t`Fără localitate` : t`Nespecificat`
    if (axis === 'judet') return countyLabel(key, counties)
    if (axis === 'localitate') return townLabel(key, code)
    if (axis === 'forma') return CATEGORY_KEYS.includes(key as NgoRegistryCategoryKey) ? categoryLabel(key as NgoRegistryCategoryKey) : key
    if (axis === 'stare') {
      const status = statusKeyOf(key)
      return status ? statusLabel(status) : key
    }
    return key
  }
  const merged = new Map<string, { key: string; label: string; count: number; largest: number }>()
  for (const [key, count] of tally.by[axis]) {
    if (count === 0) continue
    // One town under several spellings („ALBA IULIA", „ALBA IULIA - AB") is one row, named as its largest spelling.
    const name = label(key)
    const merge = axis === 'localitate' && key !== NONE ? `town:${foldName(name)}` : key
    const found = merged.get(merge)
    if (!found) merged.set(merge, { key, label: name, count, largest: count })
    else merged.set(merge, { ...found, count: found.count + count, ...(count > found.largest ? { key, label: name, largest: count } : {}) })
  }
  const entries = [...merged.values()].map(({ key, label: name, count }) => ({ key, label: name, count, share: tally.total > 0 ? count / tally.total : 0 }))
  const known = entries.filter((entry) => entry.key !== NONE)
  const rest = entries.filter((entry) => entry.key === NONE)
  if (axis === 'an') known.sort((a, b) => a.key.localeCompare(b.key))
  else known.sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'ro'))
  return [...known, ...rest]
}

const CONNECTORS = new Set(['de', 'din', 'pe', 'la', 'cu', 'sub', 'lui'])

/** A name folded for comparing spellings: no diacritics, lower case. */
function foldName(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
}

/** „BORSEC - HR", „AGRIJ -SJ", „BALCANI ? BC", „SECTORUL 3 - BUCURESTI": the town, and the county its suffix names. */
const COUNTY_SUFFIX = /\s*[-?]\s*(\p{L}{1,2}|BUCURE[SȘŞ]TI)\s*$/iu

/**
 * A locality as people write it, from the registry's capitals and its
 * county suffixes: „SECTORUL 3 - BUCURESTI" → „Sectorul 3", „AGRIJ -SJ" →
 * „Agrij", „BAIA DE ARAMA" → „Baia de Arama". The registry's missing
 * diacritics stay missing: nothing here can know them.
 */
export function localityName(locality: string): string {
  const town = locality.replace(COUNTY_SUFFIX, '').replace(/\s+/gu, ' ').trim()
  return town
    .toLocaleLowerCase('ro')
    .split(' ')
    .map((word, index) =>
      index > 0 && CONNECTORS.has(word) ? word : word.replace(/(^|-)(\p{L})/gu, (_, dash: string, letter: string) => dash + letter.toLocaleUpperCase('ro')),
    )
    .join(' ')
}

/** The county code a registry spelling stands for (`CLUJ` → `CJ`). */
function countyCode(county: string | null, counties: NgoRegistrySummary['counties']): string | null {
  return county === null ? null : (counties.find((item) => item.source === county)?.code ?? null)
}

/**
 * A town's row label in a county's breakdown: its name, and the county its
 * suffix names where that is another county („BERCENI - PH" among Ilfov's
 * towns is „Berceni (PH)"), so two places of one name stay two rows.
 */
export function townLabel(locality: string, code: string | null): string {
  const suffix = COUNTY_SUFFIX.exec(locality)?.[1]?.toUpperCase() ?? null
  const name = localityName(locality)
  return code !== null && suffix !== null && suffix.length <= 2 && suffix !== code ? `${name} (${suffix})` : name
}

/** Whether a breakdown row is the unknown one („Fără județ"). */
export function isUnplaced(row: GroupRow): boolean {
  return row.key === NONE
}

// ──────────────────────────────────────────────────────────── the figures ──

export interface RegistryFigure {
  readonly key: string
  readonly label: string
  /** The figure written out; `null` while it is being read. */
  readonly value: string | null
  readonly note: string | null
}

function share(part: number, whole: number): string {
  return whole > 0 ? formatNgoShare(part / whole) : '—'
}

/**
 * Up to four figures that are true of the selection: its count (the whole
 * registry's counts, or a name's complete read, or „N+" past the cap);
 * then, for the country or a county, the hub's context — registered, new
 * last year, per 10,000 residents, the county's rank — and otherwise what
 * the tally says: the registered among them, where they are, how many
 * have a CUI the platform admits, the newest registry year. Nothing is estimated from part
 * of a selection.
 */
export function figuresOf({
  query,
  summary,
  tally,
  read,
  stopped = false,
}: {
  readonly query: RegistryQuery
  /** The hub's summary, while the API serves the export it counted. */
  readonly summary: NgoRegistrySummary | null
  readonly tally: Tally | null
  readonly read: RegistryRead
  /** The read failed after some rows: what is read is a lower bound, not a count on its way. */
  readonly stopped?: boolean
}): readonly RegistryFigure[] {
  const figures: RegistryFigure[] = []
  const filters = activeFilters(query)
  const atLeast = formatNgoNumber(read.rows.length)
  const captured = tally?.capturedAt ? formatNgoDate(tally.capturedAt) : ''
  const repeated = formatNgoNumber(read.repeated)
  figures.push({
    key: 'count',
    label: t`Înregistrări`,
    value: tally ? formatNgoNumber(tally.total) : read.capped || (stopped && !read.pending) ? `${atLeast}+` : null,
    note: tally?.capturedAt
      ? t`la ${captured}`
      : tally
        ? read.repeated > 0
          ? t`${repeated} rânduri repetate scoase`
          : t`citite din registru`
        : read.capped
          ? t`cel puțin; lista continuă`
          : stopped && !read.pending
            ? t`cel puțin; citirea s-a oprit`
            : null,
  })
  if (!tally) return figures
  const registered = entriesOf(tally, 'stare', REGISTRY_STATUS_VALUE.registered)
  const registeredShare = share(registered, tally.total)
  const countyOnly = filters.length === 1 && filters[0] === 'county'
  const county = countyOnly && summary ? summary.counties.find((item) => item.source === query.county) : undefined
  if (summary && (query.status === null || query.status === 'registered') && (filters.length === 0 || county)) {
    const year = summary.year
    const previousYear = year - 1
    // The selection's own new entries, whatever its status: „Înregistrate" counts only the registered ones.
    const added = entriesOf(tally, 'an', String(year))
    const addedBefore = formatNgoNumber(entriesOf(tally, 'an', String(previousYear)))
    const residents = county ? county.residents : totalResidents(summary)
    if (query.status === null)
      figures.push({ key: 'registered', label: t`Înregistrate`, value: formatNgoNumber(registered), note: t`${registeredShare} din selecție` })
    figures.push({
      key: 'added',
      label: t`Noi în ${year}`,
      value: formatNgoNumber(added),
      note: t`${addedBefore} în ${previousYear}; după anul din numărul de registru`,
    })
    figures.push({
      key: 'density',
      label: t`La 10.000 de locuitori`,
      value: residents > 0 ? formatNgoNumber((registered / residents) * 10_000, 1) : '—',
      note: t`înregistrate; populația INS, 1 ianuarie ${year}`,
    })
    if (county) {
      const rank = [...summary.counties].sort((a, b) => b.registered - a.registered).findIndex((item) => item.source === county.source) + 1
      const counties = summary.counties.length
      figures.push({ key: 'rank', label: t`Locul între județe`, value: formatNgoNumber(rank), note: t`din ${counties}, după înregistrate` })
    } else if (query.status === 'registered') {
      figures.push({ key: 'utility', label: t`De utilitate publică`, value: formatNgoNumber(summary.publicUtility), note: t`cum le trece registrul` })
    }
    return figures.slice(0, 4)
  }
  if (tally.total === 0) return figures
  if (query.status === null)
    figures.push({ key: 'registered', label: t`Înregistrate`, value: formatNgoNumber(registered), note: t`${registeredShare} din selecție` })
  if (query.county === null) {
    const unplaced = unplacedOn(tally, 'judet')
    const unplacedText = formatNgoNumber(unplaced)
    figures.push({
      key: 'counties',
      label: t`Județe`,
      value: formatNgoNumber(valuesOn(tally, 'judet')),
      note: unplaced > 0 ? t`${unplacedText} fără județ` : null,
    })
  } else {
    const code = summary?.counties.find((item) => item.source === query.county)?.code ?? null
    figures.push({ key: 'localities', label: t`Localități`, value: formatNgoNumber(valuesOn(tally, 'localitate', code)), note: null })
  }
  const cuiShare = share(tally.withCui, tally.total)
  figures.push({ key: 'cui', label: t`Cu CUI`, value: formatNgoNumber(tally.withCui), note: t`${cuiShare}; CUI legat de platformă` })
  const years = yearPoints(tally).filter((point) => point.count > 0)
  const newest = years[years.length - 1]?.year
  const oldest = years[0]?.year
  if (newest !== undefined && oldest !== undefined)
    figures.push({ key: 'year', label: t`Cel mai nou an`, value: String(newest), note: t`din numărul de registru; cel mai vechi ${oldest}` })
  return figures.slice(0, 4)
}
