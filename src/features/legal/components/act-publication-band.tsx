import { useLingui } from '@lingui/react'
import { t } from '@lingui/core/macro'
import { Plural, Trans } from '@lingui/react/macro'
import { ExternalLink, FileText, FileX2 } from 'lucide-react'
import type { LegalActDetail } from '@/schemas/legal'
import { formatLegalDate } from '../lib/legal-format'
import { legalGazettePartLabel } from '../lib/legal-vocabulary'
import { LEGISLATION_ACCENT } from '../lib/legislation-theme'
import { ActAccordionItem } from './act-accordion'

type Props = {
  readonly act: LegalActDetail
}

const OUT_LINK_CLASS =
  'inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--pnrr-fg)] underline underline-offset-2 hover:text-[var(--pnrr-muted)]'

/**
 * Rung 3 — the proof of publication.
 *
 * Publication is what makes an act produce effects, so this band answers *which
 * issue of the Monitorul Oficial* carried it, and links the official PDF where
 * one exists.
 *
 * The exit to the consolidated text no longer lives here — it is the header's
 * primary action, above the fold, because burying the page's whole purpose
 * 1.200px down was the single worst thing about the old layout.
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
 */
export function ActPublicationBand({ act }: Props) {
  const { i18n } = useLingui()

  const publications = act.gazettePublications

  if (publications.length === 0) return null

  return (
    <ActAccordionItem
      id="act-publication-heading"
      title={t`Unde a fost publicat`}
      meta={
        <Plural
          value={publications.length}
          one="# publicare"
          few="# publicări"
          other="# de publicări"
        />
      }
      description={t`De la data apariției în Monitorul Oficial, un act produce efecte.`}
      footnote={
        <Trans>
          Marcajul se referă doar la existența PDF-ului oficial pe
          monitoruloficial.ro, nu la disponibilitatea textului la noi.
        </Trans>
      }
    >
      <div className="flex flex-col gap-4 px-5 py-5 sm:px-6">
        {publications.map((publication, index) => {
          const hasPdf = publication.pdfUrl !== null
          const isUncertain =
            publication.resolution !== null && publication.resolution !== 'unique'

          return (
            <div
              // Unmatched rows carry no issue id, so the index disambiguates
              // rather than every one of them colliding on the same key.
              key={publication.moIssueId ?? `unmatched-${index}`}
              className="border-l-4 pl-4"
              style={{ borderLeftColor: LEGISLATION_ACCENT }}
            >
              <div className="text-base font-bold tabular-nums text-[var(--pnrr-fg)]">
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
              </div>

              {publication.issueDate ? (
                <div className="mt-0.5 text-sm text-[var(--pnrr-muted)]">
                  {formatLegalDate(publication.issueDate, i18n.locale)}
                </div>
              ) : null}

              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
                {hasPdf ? (
                  <a
                    href={publication.pdfUrl ?? undefined}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={OUT_LINK_CLASS}
                  >
                    <FileText className="h-4 w-4" aria-hidden />
                    <Trans>PDF oficial</Trans>
                    <ExternalLink className="h-3 w-3" aria-hidden />
                  </a>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-sm text-[var(--pnrr-muted)]">
                    <FileX2 className="h-4 w-4" aria-hidden />
                    <Trans>doar coordonate de publicare</Trans>
                  </span>
                )}

                {isUncertain ? (
                  <span className="text-xs text-[var(--pnrr-warning-fg)]">
                    <Trans>potrivire probabilă cu acest număr</Trans>
                  </span>
                ) : null}
              </div>
            </div>
          )
        })}
      </div>
    </ActAccordionItem>
  )
}
