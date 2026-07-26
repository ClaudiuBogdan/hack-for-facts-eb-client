/**
 * Pure presentation rules for the stenogram surfaces.
 *
 * Everything here answers one of two honesty questions the reader must never
 * have to guess at:
 *   - HOW MUCH of this sitting can I actually read? (`availability`)
 *   - HOW PRECISELY does this link locate what I am looking at? (`sourceUrlKind`)
 *
 * Kept pure and free of React so the copy can be asserted directly. All strings
 * go through Lingui; the vitest alias resolves the macro to the source text.
 */
import { t } from '@lingui/core/macro'
import type {
  ParliamentStenogramAvailability,
  ParliamentStenogramSegmentKind,
  ParliamentStenogramSession,
} from '@/schemas/parliament'

/** The GraphQL chamber token → the printed assembly name. */
export function stenogramChamberLabel(chamber: string | undefined): string {
  if (chamber === 'comun') return t`Ședință comună`
  if (chamber === 'senat') return t`Senat`
  if (chamber === 'camera_deputatilor') return t`Camera Deputaților`
  return t`Plen`
}

/** Short badge form, for dense rows where the full name would wrap. */
export function stenogramChamberShortLabel(chamber: string | undefined): string {
  if (chamber === 'comun') return t`Comună`
  if (chamber === 'senat') return t`Senat`
  if (chamber === 'camera_deputatilor') return t`Camera`
  return t`Plen`
}

export function stenogramAvailabilityLabel(
  availability: ParliamentStenogramAvailability,
): string {
  switch (availability) {
    case 'COMPLETE':
      return t`Transcriere completă`
    case 'PARTIAL':
      return t`Transcriere parțială`
    case 'SOURCE_ONLY':
      return t`Doar linkul oficial`
  }
}

/**
 * What the availability MEANS for this reader, right now. SOURCE_ONLY is the
 * one that has to be unmistakable: the sitting is real and we hold its official
 * address, but no reading is served — so the page must hand over the source
 * link instead of rendering an empty document.
 */
export function stenogramAvailabilityDescription(
  availability: ParliamentStenogramAvailability,
): string {
  switch (availability) {
    case 'COMPLETE':
      return t`Textul integral al ședinței, în ordinea din stenograma oficială.`
    case 'PARTIAL':
      return t`Textul ședinței este disponibil, dar sursa nu a tipărit numele vorbitorilor pentru toate blocurile.`
    case 'SOURCE_ONLY':
      return t`Pentru această ședință avem doar înregistrarea sursei și adresa ei oficială — textul dezbaterii nu este servit aici. Nu înseamnă că ședința nu a avut loc sau că nu s-a vorbit în ea.`
  }
}

/** `true` when the availability promises served reading text. */
export function yieldsReading(
  availability: ParliamentStenogramAvailability,
): boolean {
  return availability !== 'SOURCE_ONLY'
}

/** A source URL that deep-links exactly what it is attached to. */
export function isExactSource(sourceUrlKind: string | undefined): boolean {
  return sourceUrlKind === 'exact'
}

/**
 * The caveat printed next to a non-exact source link. Never printed for
 * `exact` — an unnecessary caveat teaches readers to ignore the necessary ones.
 */
export function sourcePrecisionNote(
  sourceUrlKind: string | undefined,
): string | undefined {
  if (sourceUrlKind === 'lossy_root') {
    return t`Linkul deschide rădăcina ședinței la sursă, nu poziția exactă a acestei luări de cuvânt — stenogramele Senatului nu conțin ancore pentru fiecare intervenție.`
  }
  if (sourceUrlKind === 'raw_response') {
    return t`Linkul duce la înregistrarea capturii pe care o păstrăm, nu la o pagină publicată de instituție.`
  }
  return undefined
}

/** Label for the outbound official-source link. */
export function sourceLinkLabel(
  sourceSystem: string | undefined,
  sourceUrlKind: string | undefined,
  sourceUrl?: string,
): string {
  let host = sourceSystem === 'senat_stenogram' ? 'senat.ro' : 'cdep.ro'
  if (!sourceSystem && sourceUrl) {
    try {
      const hostname = new URL(sourceUrl).hostname.toLowerCase()
      if (hostname === 'senat.ro' || hostname.endsWith('.senat.ro')) {
        host = 'senat.ro'
      }
    } catch {
      // The server validates public source URLs. Keep the conservative CDEP
      // label if a malformed legacy ref reaches this presentation helper.
    }
  }
  if (sourceUrlKind === 'raw_response') return t`Vezi captura sursă (${host})`
  if (sourceUrlKind === 'lossy_root') return t`Deschide ședința la sursă (${host})`
  return t`Vezi în stenograma oficială (${host})`
}

/** The official system a capture came from, in words. */
export function sourceSystemLabel(sourceSystem: string | undefined): string {
  if (sourceSystem === 'senat_stenogram') return t`Stenogramele Senatului`
  if (sourceSystem === 'cdep_stenogram') return t`Stenogramele Camerei Deputaților`
  return t`Sursă oficială`
}

/**
 * WHERE the sitting date came from. A date we cannot vouch for is never shown
 * as a date, and a date parsed out of the printed title is labelled as such
 * rather than passed off as a source field.
 */
export function sessionDateProvenanceNote(
  sessionDateSource: string,
): string | undefined {
  if (sessionDateSource === 'stenogram_title') {
    return t`Data este citită din titlul tipărit al stenogramei.`
  }
  if (sessionDateSource === 'session_date') {
    return t`Data provine din câmpul de dată al sursei.`
  }
  if (sessionDateSource === 'none') {
    return t`Sursa nu conține o dată de ședință în care să putem avea încredere; data nu este dedusă.`
  }
  return undefined
}

/** Long, locale-aware sitting date, or the honest absence. */
export function formatSittingDate(
  sessionDate: string | undefined,
  locale: string,
): string {
  if (!sessionDate) return t`Dată indisponibilă`
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${sessionDate}T00:00:00Z`))
}

/** Compact sitting date for dense rows. */
export function formatSittingDateShort(
  sessionDate: string | undefined,
  locale: string,
): string {
  if (!sessionDate) return t`Fără dată`
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${sessionDate}T00:00:00Z`))
}

/**
 * The sitting's display title. Prefers the printed title; falls back to the
 * date, and finally to a neutral label — never to the raw session key, which is
 * an internal identifier and reads as noise.
 */
export function sessionDisplayTitle(
  session: Pick<
    ParliamentStenogramSession,
    'title' | 'sessionDate' | 'chamber'
  >,
  locale: string,
): string {
  const title = session.title?.trim()
  if (title) return title
  if (session.sessionDate) {
    const chamber = stenogramChamberLabel(session.chamber)
    const day = formatSittingDate(session.sessionDate, locale)
    return t`Ședința ${chamber} din ${day}`
  }
  return t`Ședință fără titlu în sursă`
}

/** The printed time span of the sitting, when the source recorded one. */
export function sessionTimeSpan(
  session: Pick<ParliamentStenogramSession, 'startTimeText' | 'endTimeText'>,
): string | undefined {
  const { startTimeText: start, endTimeText: end } = session
  if (start && end) return `${start} – ${end}`
  return start ?? end
}

export function segmentKindLabel(
  kind: ParliamentStenogramSegmentKind,
): string {
  switch (kind) {
    case 'SPEECH':
      return t`Luare de cuvânt`
    case 'AGENDA_HEADING':
      return t`Punct pe ordinea de zi`
    case 'VOTE_RESULT':
      return t`Rezultat de vot`
    case 'CONTEXT':
      return t`Consemnare`
  }
}

/**
 * "1.234" / "peste 10.000" — the capped-total presentation. The server caps the
 * count at 10 000, so anything beyond it is reported as a floor, never as a
 * number we do not have.
 */
export function formatStenogramTotal(
  total: number,
  estimated: boolean,
  locale: string,
): string {
  const formatted = new Intl.NumberFormat(locale).format(total)
  return estimated ? t`peste ${formatted}` : formatted
}
