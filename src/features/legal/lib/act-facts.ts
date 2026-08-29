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
