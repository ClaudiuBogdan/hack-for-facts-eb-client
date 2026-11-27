import { useLingui } from '@lingui/react'
import { t } from '@lingui/core/macro'
import { Plural, Trans } from '@lingui/react/macro'
import { ExternalLink, FileText, FileX2 } from 'lucide-react'
import type { LegalActDetail } from '@/schemas/legal'
import { formatLegalDate } from '../lib/legal-format'
import { legalGazettePartLabel } from '../lib/legal-vocabulary'
import { cn } from '@/lib/utils'
import { ActAccordionItem } from './act-accordion'
import { ACT_LINK, ACT_RECORD_LINE } from './reader/act-page-grid'

type Props = {
  readonly act: LegalActDetail
}

/** It leaves the site: the site's blue, and the external-link mark. */
const OUT_LINK_CLASS = cn(ACT_LINK, 'inline-flex items-center gap-1.5')

/**
 * Rung 3 — the proof of publication.
 *
 * Publication is what makes an act produce effects, so this band answers *which
 * issue of the Monitorul Oficial* carried it, and links the official PDF where
 * one exists.
 *
 * The exit to the consolidated text no longer lives here — it sits in the
 * summary card's footer (user decision 2026-08-12; the header button that
 * preceded it is gone too, since the page now serves the text itself).
 *
 * Copy guardrail, inherited from the landing page and just as binding here: the
 * PDF marker means **an official PDF exists on monitoruloficial.ro**, never that
 * we hold its text. This one survives full text landing in the product — holding
 * the Portal's consolidated text says nothing about holding the gazette scan.
 *
 * `resolution` is surfaced when the act↔issue join is not `unique`, because a
 * clustered match is a guess about which issue published this act. When there is
 * no match at all the band is absent and `ActProvenanceNotes` says so — a block
 * with no content does not render (`docs/design/legal/act-detail.md` §2).
 *
 * Each publication is a line of the record: its date at the left, the issue and
 * its PDF at the right.
 */
export function ActPublicationBand({ act }: Props) {
  const { i18n } = useLingui()

  const publications = act.gazettePublications

  if (publications.length === 0) return null

  return (
    <ActAccordionItem
      id="act-publication-heading"
      title={t`Unde a fost publicat`}
      // One of the rows a reader most often needs: open from the first render
      // (owner, 26 November 2026, the act page's redesign).
      defaultOpen
      meta={
        <Plural
          value={publications.length}
          one="# publicare"
          few="# publicări"
          other="# de publicări"
        />
      }
      // Publication is the proof the act exists, not the day it takes effect: an act can name a later date
      // (review astra-client-2, B7: the same claim was taken out of the hub's gazette section).
      description={t`Apariția în Monitorul Oficial dovedește publicarea actului. Data de la care actul produce efecte e cea stabilită în act sau prin lege.`}
      footnote={
        <Trans>
          Marcajul se referă doar la existența PDF-ului oficial pe
          monitoruloficial.ro, nu la disponibilitatea textului la noi.
        </Trans>
      }
    >
      <ul className="divide-y">
        {publications.map((publication, index) => {
          const hasPdf = publication.pdfUrl !== null
          const isUncertain =
            publication.resolution !== null && publication.resolution !== 'unique'

          return (
            <li
              // Unmatched rows carry no issue id, so the index disambiguates
              // rather than every one of them colliding on the same key.
              key={publication.moIssueId ?? `unmatched-${index}`}
              className={ACT_RECORD_LINE}
            >
              {/* The cell stays when there is no date, so the issue keeps its column. */}
              <span className="tabular-nums text-muted-foreground">
                {publication.issueDate
                  ? formatLegalDate(publication.issueDate, i18n.locale)
                  : null}
              </span>

              <span className="min-w-0">
                <span className="block font-medium tabular-nums">
                  {publication.partCode
                    ? legalGazettePartLabel(publication.partCode)
                    : t`Monitorul Oficial`}
                  {publication.issueNumber !== null ? (
                    <>
                      {' '}
                      <Trans>nr. {publication.issueNumber}</Trans>
                    </>
                  ) : null}
                  {publication.issueYear !== null ? `/${publication.issueYear}` : null}
                </span>

                <span className="mt-0.5 flex flex-wrap items-center gap-x-4 gap-y-1">
                  {hasPdf ? (
                    <a
                      href={publication.pdfUrl ?? undefined}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={OUT_LINK_CLASS}
                    >
                      <FileText className="size-4" aria-hidden />
                      <Trans>PDF oficial</Trans>
                      <ExternalLink className="size-3" aria-hidden />
                    </a>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                      <FileX2 className="size-4" aria-hidden />
                      <Trans>doar coordonate de publicare</Trans>
                    </span>
                  )}

                  {isUncertain ? (
                    <span className="text-xs text-muted-foreground">
                      <Trans>potrivire probabilă cu acest număr</Trans>
                    </span>
                  ) : null}
                </span>
              </span>
            </li>
          )
        })}
      </ul>
    </ActAccordionItem>
  )
}
