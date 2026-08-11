import type { LegalActDetail } from '@/schemas/legal'

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
