/**
 * Presentation rules for the plenary agenda.
 *
 * The whole point of this module is to stop the UI overclaiming. An order of
 * business is a PLAN: it records what the Chamber intended to take, not what it
 * did. Every label here is chosen so a reader cannot come away believing a
 * scheduled point was reached, debated or voted.
 */
import {
  PARLIAMENT_CAMERA_GREEN,
  PARLIAMENT_RESOURCE_PURPLE,
} from './hub-theme'

/** Where a sitting's date came from, in words a reader can act on. */
export function sittingDateSourceLabel(source: string): string | undefined {
  switch (source) {
    case 'stenogram_session':
      // The sitting's own printed transcript title. Nothing to caveat.
      return undefined
    case 'ordinezi_title':
      return 'Data este cea din titlul ordinii de zi.'
    case 'weekly_agenda':
      // The planned week disagreed with the transcript on 4 of the 5 sittings
      // it dated, so this one always carries a caveat.
      return 'Data provine din programul săptămânal (planificat), nu din stenogramă.'
    case 'none':
      return 'Sursa nu a publicat o dată de încredere pentru această ședință.'
    default:
      return undefined
  }
}

/** How firmly an agenda maps onto a sitting. */
export function agendaResolutionLabel(
  status: string | undefined,
): string | undefined {
  if (status === 'candidate') return 'Corespondență probabilă'
  return undefined
}

const ITEM_KIND_LABEL: Record<string, string> = {
  administrative: 'Punct administrativ',
  debate: 'Dezbatere',
  unknown: 'Neclasificat',
}

export function agendaItemKindLabel(kind: string): string {
  return ITEM_KIND_LABEL[kind] ?? 'Neclasificat'
}

/**
 * The chamber label. Deliberately explicit: the whole surface is the Chamber of
 * Deputies, and a reader must not extrapolate to Parliament as a whole.
 */
export function agendaChamberLabel(chamber: string): string {
  switch (chamber) {
    case 'camera_deputatilor':
      return 'Camera Deputaților'
    case 'senat':
      return 'Senat'
    case 'comun':
      return 'Ședință comună'
    default:
      return chamber
  }
}

/**
 * Whether the source calls this a JOINT sitting of both chambers.
 *
 * `chamber` is `camera_deputatilor` on all 1,297 agendas, but 220 of them are
 * titled "sedinţa comună a Camerei Deputaţilor şi Senatului" — a joint sitting
 * is Senate business too, so labelling those "Camera Deputaților" is wrong and
 * the standing caveat about the Senate does not apply to them.
 *
 * This reads the source's own words rather than guessing: the phrase sits
 * immediately after "ședinț", where the corpus has only "Camerei" (994),
 * "comună" (216) and "comune" (4). "Raport comun" appears in item descriptions,
 * never in an agenda title, so it cannot be caught here.
 */
export function isJointSittingTitle(title: string | undefined): boolean {
  if (!title) return false
  return /sedin[tț][aăe]?\s+comun[aăe]/i.test(foldAgendaText(title))
}

/** Diacritic-folded lower case, so the source's mixed spellings all match. */
export function foldAgendaText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

/**
 * A joint sitting is the Chamber AND the Senate, so it gets its own colour and
 * its own words. 220 of the 1,297 agendas are joint, and the server labels all
 * of them `camera_deputatilor`.
 */
export function agendaAccent(joint: boolean): string {
  return joint ? PARLIAMENT_RESOURCE_PURPLE : PARLIAMENT_CAMERA_GREEN
}

export function agendaBodyLabel(joint: boolean): string {
  return joint
    ? 'Ședință comună · Camera Deputaților și Senatul'
    : 'Camera Deputaților'
}

/** How many of an agenda's sitting days we can open a transcript for. */
export function agendaTranscriptCount(agenda: {
  readonly sittings: readonly { readonly stenogramSessionKey?: string }[]
}): number {
  return agenda.sittings.filter(
    (sitting) => sitting.stenogramSessionKey !== undefined,
  ).length
}

/**
 * Phrases the source prints AFTER the committee/disposition text, in its own
 * words. They are the boundary this module cuts at.
 */
const AGENDA_TRAILING_PHRASES = [
  'procedura de urgenta',
  'camera decizionala',
  'prima camera sesizata',
  'se dezbate sub rezerva',
  'raport comun',
  'raport-',
]

/**
 * Recover the real text from a field the extractor concatenated.
 *
 * The source separates a point's parts with block markup; the extraction joined
 * the text nodes with nothing between them, so a committee arrives welded to
 * every flag that followed it — "Comisia pentru administraţie publicăProcedură
 * de urgenţăCameră decizionalăSe dezbate sub rezerva depunerii raportului". It
 * also splits on the full stop, which leaves 24,733 of 80,186 Senate
 * dispositions ending in a severed date ("Adoptat de Senat -2" for 2.06.2026).
 *
 * Cutting at the source's OWN flag vocabulary recovers the prefix rather than
 * discarding the field: 3.5% of rapporteur strings and 2.2% of dispositions are
 * welded, and this returns the committee for all of them. A severed date tail is
 * dropped outright — a partial date is worse than none, and the flags it ran
 * into are already rendered as their own badges.
 */
export function cleanAgendaSourceText(
  value: string | undefined,
): string | undefined {
  if (!value) return undefined
  const folded = foldAgendaText(value)
  let cut = value.length
  for (const phrase of AGENDA_TRAILING_PHRASES) {
    const at = folded.indexOf(phrase)
    // Position 0 included: a value that BEGINS with a flag names no committee
    // at all, and all 16 such rows in the corpus are pure flag text
    // ("Cameră decizională", "Procedură de urgenţăPrima Cameră sesizată…").
    if (at >= 0 && at < cut) cut = at
  }
  const trimmed = value
    .slice(0, cut)
    // A date the extractor severed at the full stop: "… -2" of "-2.06.2026".
    .replace(/[\s-]+\d{1,2}$/, '')
    .replace(/[\s,;:–—-]+$/, '')
    .trim()
  return trimmed.length > 1 ? trimmed : undefined
}

// ── dates ─────────────────────────────────────────────────────────────────────

const MONTHS_RO = [
  'ianuarie',
  'februarie',
  'martie',
  'aprilie',
  'mai',
  'iunie',
  'iulie',
  'august',
  'septembrie',
  'octombrie',
  'noiembrie',
  'decembrie',
]

type DayParts = { readonly day: number; readonly month: number; readonly year: number }

/**
 * Read an ISO date as calendar parts, WITHOUT going through local time.
 *
 * The previous page ran these date-only values through a date+time formatter,
 * which printed "27 iulie 2026 la 03:00" — a sitting time the source never
 * published, invented out of a timezone offset.
 */
function readDay(iso: string): DayParts | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso)
  if (!match) return undefined
  const [, year, month, day] = match
  return { day: Number(day), month: Number(month) - 1, year: Number(year) }
}

/** "24 iunie 2026" — a calendar day, never a time. */
export function formatAgendaDay(iso: string): string {
  const parts = readDay(iso)
  if (!parts) return iso
  return `${String(parts.day)} ${MONTHS_RO[parts.month] ?? ''} ${String(parts.year)}`
}

/**
 * The span an agenda covers, printed the way the source titles it.
 *
 * A single agenda routinely plans a whole sitting week, so the span — not any
 * one day — is what identifies it: "27 – 31 iulie 2026". Repeated parts are
 * said once.
 */
export function formatAgendaDayRange(
  from: string | undefined,
  to: string | undefined,
): string | undefined {
  if (!from) return undefined
  const start = readDay(from)
  if (!start) return undefined
  const end = to ? readDay(to) : undefined
  if (!end || (end.day === start.day && end.month === start.month && end.year === start.year)) {
    return formatAgendaDay(from)
  }
  if (start.year !== end.year) {
    return `${formatAgendaDay(from)} – ${formatAgendaDay(to ?? '')}`
  }
  if (start.month !== end.month) {
    return `${String(start.day)} ${MONTHS_RO[start.month] ?? ''} – ${formatAgendaDay(to ?? '')}`
  }
  return `${String(start.day)} – ${formatAgendaDay(to ?? '')}`
}

/** Month abbreviations, for the compact day chips in a dossier header. */
const MONTHS_RO_SHORT = [
  'ian.',
  'feb.',
  'mart.',
  'apr.',
  'mai',
  'iun.',
  'iul.',
  'aug.',
  'sept.',
  'oct.',
  'nov.',
  'dec.',
]

/**
 * "27 iul." — a day without its year, for a row of chips that already sits
 * under a heading carrying the year.
 */
export function formatAgendaDayShort(iso: string): string {
  const parts = readDay(iso)
  if (!parts) return iso
  return `${String(parts.day)} ${MONTHS_RO_SHORT[parts.month] ?? ''}`
}

export type AgendaSpan = {
  readonly from?: string
  readonly to?: string
  readonly datedDays: number
  readonly undatedDays: number
}

/**
 * The dated span of an agenda's sittings, plus how many days carry no date.
 *
 * Undated days are counted separately rather than folded in: an undated sitting
 * is a different statement, not a later one.
 */
export function agendaSpan(
  sittings: readonly { readonly date?: string }[],
): AgendaSpan {
  const dates = sittings
    .map((sitting) => sitting.date)
    .filter((date): date is string => date !== undefined)
    .sort((left, right) => left.localeCompare(right))
  return {
    ...(dates[0] ? { from: dates[0] } : {}),
    ...(dates.length > 0 ? { to: dates[dates.length - 1] } : {}),
    datedDays: dates.length,
    undatedDays: sittings.length - dates.length,
  }
}

/**
 * Groups an agenda's sittings into dated and undated.
 *
 * An undated sitting is NOT "sorts last" — it is a different statement, and it
 * gets its own visible bucket rather than a silent position at the bottom of a
 * chronology.
 */
export function partitionByDate<T extends { readonly date?: string }>(
  rows: readonly T[],
): { readonly dated: readonly T[]; readonly undated: readonly T[] } {
  const dated: T[] = []
  const undated: T[] = []
  for (const row of rows) {
    if (row.date === undefined) undated.push(row)
    else dated.push(row)
  }
  return {
    dated: [...dated].sort((a, b) => (a.date ?? '').localeCompare(b.date ?? '')),
    undated,
  }
}

// ── list filters ──────────────────────────────────────────────────────────────

/**
 * The years the archive covers, newest first.
 *
 * Fixed rather than derived from the loaded page: the list is paginated, so the
 * options would otherwise change as the reader moves through it. 2001 is the
 * first year the source publishes.
 */
export const AGENDA_FIRST_YEAR = 2001

export function agendaYearOptions(now: Date): readonly number[] {
  const latest = Math.max(now.getUTCFullYear(), AGENDA_FIRST_YEAR)
  const years: number[] = []
  for (let year = latest; year >= AGENDA_FIRST_YEAR; year -= 1) years.push(year)
  return years
}

export type ParliamentAgendaSearch = {
  readonly pagina?: number
  readonly an?: number
  readonly q?: string
}

/** Tolerant parse: a hand-edited param drops the filter instead of throwing. */
export function parseAgendaSearch(
  search: Record<string, unknown>,
): ParliamentAgendaSearch {
  const page = Number(search.pagina)
  const year = Number(search.an)
  const query = typeof search.q === 'string' ? search.q.trim() : ''
  return {
    ...(Number.isInteger(page) && page > 1 ? { pagina: page } : {}),
    ...(Number.isInteger(year) &&
    year >= AGENDA_FIRST_YEAR &&
    year <= AGENDA_FIRST_YEAR + 200
      ? { an: year }
      : {}),
    ...(query ? { q: query } : {}),
  }
}

/** How many facets are narrowing the list — the count beside "Filtre active". */
export function getActiveAgendaFilterCount(
  search: ParliamentAgendaSearch,
): number {
  return (search.an ? 1 : 0) + (search.q ? 1 : 0)
}

// ── agenda points ─────────────────────────────────────────────────────────────

/**
 * The ways into a long order of business.
 *
 * An agenda runs to a median of 81 points and up to 613, so the flags the source
 * prints against each point double as navigation: "which of these are urgent" is
 * a question scrolling cannot answer.
 */
export type AgendaItemFilter = 'toate' | 'urgenta' | 'decizionala' | 'rezerva'

export const AGENDA_ITEM_FILTERS: readonly AgendaItemFilter[] = [
  'toate',
  'urgenta',
  'decizionala',
  'rezerva',
]

export const AGENDA_ITEM_FILTER_LABELS: Readonly<
  Record<AgendaItemFilter, string>
> = {
  toate: 'Toate',
  urgenta: 'Urgență',
  decizionala: 'Decizională',
  rezerva: 'Sub rezervă',
}

type FlaggedItem = {
  readonly procedureUrgency: boolean
  readonly decisionalChamber: boolean
  readonly debateReservation: boolean
}

export function matchesAgendaItemFilter(
  item: FlaggedItem,
  filter: AgendaItemFilter,
): boolean {
  switch (filter) {
    case 'urgenta':
      return item.procedureUrgency
    case 'decizionala':
      return item.decisionalChamber
    case 'rezerva':
      return item.debateReservation
    default:
      return true
  }
}

export function countAgendaItemFilters(
  items: readonly FlaggedItem[],
): Readonly<Record<AgendaItemFilter, number>> {
  return {
    toate: items.length,
    urgenta: items.filter((item) => item.procedureUrgency).length,
    decizionala: items.filter((item) => item.decisionalChamber).length,
    rezerva: items.filter((item) => item.debateReservation).length,
  }
}
