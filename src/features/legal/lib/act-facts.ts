import type { LegalActDetail, LegalActDocumentVersion, LegalActSummaryData } from '@/schemas/legal'
import { isConsolidationVersion } from './legal-versions'

/**
 * The single gazette publication the page may state as FACT.
 *
 * Only a UNIQUELY resolved act↔issue join earns a definite "publicat în"
 * claim — every other resolution renders as probable in the publication
 * band, and nothing above the band may be more certain than the band is.
 * One predicate, shared by the header's publication line and the reader's
 * masthead suppression: the `publicare` line of the text is hidden if and
 * only if the header line rendered from THIS same value is shown.
 */
export function uniqueGazettePublication(
  act: LegalActDetail,
): LegalActDetail['gazettePublications'][number] | null {
  return (
    act.gazettePublications.find(
      (pub) => pub.resolution === 'unique' && pub.issueNumber !== null,
    ) ?? null
  )
}

/** The publication the head states, and the reader's masthead hides behind: a sure gazette match, or the Portal's own line. */
export type HeadPublication = {
  readonly issueNumber: number
  readonly partCode: string | null
  readonly issueDate: string | null
  /** The issue's page on monitoruloficial.ro: only a matched issue has one, and it is never built. */
  readonly pdfUrl: string | null
}

const RO_MONTHS = ['ianuarie', 'februarie', 'martie', 'aprilie', 'mai', 'iunie', 'iulie', 'august', 'septembrie', 'octombrie', 'noiembrie', 'decembrie']

/** „MONITORUL OFICIAL nr. 1020 din 21 decembrie 2006" read as its issue and day; null for any other writing. */
export function readMastheadPublication(raw: string | null): { readonly issueNumber: number; readonly issueDate: string } | null {
  const match = /^\s*MONITORUL OFICIAL\s+nr\.\s*(\d{1,3}(?:\.\d{3})+|\d+)\s+din\s+(\d{1,2})\s+(\p{L}+)\s+(\d{4})\s*$/iu.exec(raw ?? '')
  if (match === null) return null
  const [, number = '', day = '', month = '', year = ''] = match
  const monthIndex = RO_MONTHS.indexOf(month.toLowerCase())
  if (monthIndex < 0 || Number(day) < 1 || Number(day) > 31) return null
  return { issueNumber: Number(number.replace(/\./gu, '')), issueDate: `${year}-${String(monthIndex + 1).padStart(2, '0')}-${day.padStart(2, '0')}` }
}

/**
 * What the head states under „Publicat în": the one sure gazette match; else, when the act is matched to no issue at
 * all, the Portal's own masthead line of the default text (owner, 26 November 2026), only when it names the day the
 * original form came out, so a republication's line never stands in for the first publication. An act with matches
 * that are only probable states none: the record's band says how probable.
 */
export function headPublication(act: LegalActDetail): HeadPublication | null {
  const unique = uniqueGazettePublication(act)
  if (unique !== null && unique.issueNumber !== null) {
    return { issueNumber: unique.issueNumber, partCode: unique.partCode, issueDate: unique.issueDate, pdfUrl: unique.pdfUrl }
  }
  if (act.gazettePublications.length > 0) return null
  const masthead = readMastheadPublication(act.canonical?.publicationRaw ?? null)
  if (masthead === null) return null
  const original = act.documents.some(
    (doc) => doc.versionKind === 'original' && !isConsolidationVersion(doc) && (doc.firstPublicationDate ?? doc.versionDate) === masthead.issueDate,
  )
  return original ? { issueNumber: masthead.issueNumber, partCode: null, issueDate: masthead.issueDate, pdfUrl: null } : null
}

/**
 * The Portal's page of the act as the cited publication printed it: the original form's own page (on legal_v2 each
 * form has its own, `DetaliiDocumentAfis/<id>`), only when that form came out the day the cited issue did, and only
 * when exactly one such page is named (a page is never chosen among several). A form marked as a consolidation is
 * never the text as published, whatever its kind says. On the legacy source the forms carry no page, and the act's
 * `officialTextUrl` is the canonical document's page: it stands in only while the canonical is that original. Null
 * when there is none, when it cannot be tied to the issue, or when it is no web address (Codex review, round 1).
 */
export function originalPortalUrl(act: LegalActDetail, issued: string | null): string | null {
  if (issued === null) return null
  const publishedThatDay = (doc: Pick<LegalActDocumentVersion, 'versionKind' | 'caveat' | 'portalLabelRaw' | 'portalLabelDate' | 'firstPublicationDate' | 'versionDate'>) =>
    doc.versionKind === 'original' && !isConsolidationVersion(doc) && (doc.firstPublicationDate ?? doc.versionDate) === issued
  const pages = new Set(
    act.documents
      .filter(publishedThatDay)
      .map((doc) => webAddress(doc.sourceUrl))
      .filter((url): url is string => url !== null),
  )
  if (pages.size > 1) return null
  const [own] = pages
  if (own !== undefined) return own
  if (act.dataSource === 'legal_v2' || act.canonical === null || !publishedThatDay(act.canonical)) return null
  return webAddress(act.officialTextUrl)
}

/**
 * A served address shown as a link only when it is a whole web address: `https://` or `http://` and a host, never
 * `javascript:`, a bare path, a scheme alone, or `https:/host…`, which the URL parser reads with a host but a page
 * resolves on its own site (Codex review, round 2).
 */
export function webAddress(url: string | null): string | null {
  if (url === null) return null
  const trimmed = url.trim()
  if (!/^https?:\/\//iu.test(trimmed)) return null
  try {
    const parsed = new URL(trimmed)
    return (parsed.protocol === 'https:' || parsed.protocol === 'http:') && parsed.hostname !== '' ? trimmed : null
  } catch {
    return null
  }
}

/** Empty and whitespace-only are absence, not content. */
export const cleanSummaryText = (value: string | null): string | null =>
  value !== null && value.trim() !== '' ? value : null

/**
 * Whether the summary card has anything to say — the page's gate. When
 * false the card renders nothing, and the warnings need a standalone home
 * instead of the card's footer rows. Both texts are independently
 * nullable AND independently blank-able; either one carries the card.
 */
export function hasSummaryContent(summary: LegalActSummaryData): boolean {
  return (
    cleanSummaryText(summary.plainLanguageSummary) !== null ||
    cleanSummaryText(summary.description) !== null
  )
}

/**
 * Whether this act's value of a BRIDGED field can be trusted as served. On
 * the legacy source every field is the act's own. On legal_v2 status, links,
 * anchors, timeline and summary are read from the previous corpus, and
 * `bridgedFields` names the ones it actually holds for this act — anything
 * else is UNKNOWN, and an empty list of it must not read as "none".
 */
export function bridgeCovers(
  act: Pick<LegalActDetail, 'dataSource' | 'bridgedFields'>,
  field: 'links' | 'incomingAnchors' | 'timeline',
): boolean {
  return act.dataSource !== 'legal_v2' || act.bridgedFields.includes(field)
}
