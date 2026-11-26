import type { LegalActDetail, LegalActSummaryData } from '@/schemas/legal'

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

/**
 * The Portal's page of the act as it was published: its original form's page (on legal_v2 each form has its own,
 * `DetaliiDocumentAfis/<id>`). On the legacy source the forms carry no page, and the act's `officialTextUrl` is the
 * canonical document's page, which is the original there all but always: it stands in only while the canonical is
 * the original. Never the default text's page when that is a consolidation: it is another text than the one
 * published. Null when there is none, or when it is no web address.
 */
export function originalPortalUrl(act: LegalActDetail): string | null {
  const own = act.documents.find((doc) => doc.versionKind === 'original' && doc.sourceUrl !== null)?.sourceUrl ?? null
  const url = own ?? (act.canonical?.versionKind === 'original' ? act.officialTextUrl : null)
  return webAddress(url)
}

/** A served address shown as a link only when it is a web page (`https:` or `http:`): never `javascript:` or a bare path. */
export function webAddress(url: string | null): string | null {
  return url !== null && /^https?:\/\//iu.test(url.trim()) ? url.trim() : null
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
