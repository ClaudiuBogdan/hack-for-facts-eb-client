import { t } from '@lingui/core/macro'
import type { CompanyAnalysisReleaseRef, CompanyAnalysisSource } from '@/schemas/company-analytics'
import { isRegistryPublished, type CompanyRegistryEnvelope } from '@/schemas/private-company-registry'
import { civilDateText } from './company-analytics-text'

/**
 * The ONRC edition an analysis release was exported from (`release.source`),
 * as the page cites it and as the name picker checks it against the
 * companies directory's own pin.
 */

/** The release's ONRC edition in a few words: its number and ONRC's publication date, as the civil date it is. */
export function sourceEditionText(release: CompanyAnalysisReleaseRef, locale: 'ro' | 'en'): string {
  const { editionId, sourcePublishedAt } = release.source
  return sourcePublishedAt ? t`ediția ONRC ${editionId}, publicată de ONRC pe ${civilDateText(sourcePublishedAt, locale)}` : t`ediția ONRC ${editionId}, cu data publicării necunoscută`
}

/**
 * The directory's pinned edition is the analysis release's own — the same
 * published edition and publication — so the directory's names may stand
 * for the analysis's companies. Anything else (another edition or
 * publication, an unpublished directory, no pin yet) is not.
 */
export function directoryReadsSource(directory: CompanyRegistryEnvelope | null, source: CompanyAnalysisSource | null): boolean {
  return directory !== null && source !== null && isRegistryPublished(directory) && directory.editionId === source.editionId && directory.publicationEpoch === source.publicationEpoch
}
