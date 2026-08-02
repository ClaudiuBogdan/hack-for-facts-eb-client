import { useLingui } from '@lingui/react'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { ExternalLink, FileText, FileX2 } from 'lucide-react'
import type { LegalActDetail } from '@/schemas/legal'
import { formatLegalDate } from '../lib/legal-format'
import { legalGazettePartLabel } from '../lib/legal-vocabulary'
import { LEGISLATION_ACCENT } from '../lib/legislation-theme'
import { LegislationSection } from './legislation-section'

type Props = {
  readonly act: LegalActDetail
}

const OUT_LINK_CLASS =
  'inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--pnrr-fg)] underline underline-offset-2 hover:text-[var(--pnrr-muted)]'

/**
 * Rung 3 — the proof, and the exit to the text.
 *
 * This band discharges the page's core promise: we do not hold the law, so we
 * owe the reader an unambiguous route to it. Two routes, in order of authority:
 * the Monitorul Oficial issue (publication is what makes an act produce
 * effects) and the Portal's consolidated record.
 *
 * Copy guardrail, inherited from the landing page and just as binding here: the
 * PDF marker means **an official PDF exists**, never that we hold the text.
 *
 * `resolution` is surfaced when the act↔issue join is not `unique`, because a
 * clustered match is a guess about which issue published this act.
 */
export function ActPublicationBand({ act }: Props) {
  const { i18n } = useLingui()

  const publications = act.gazettePublications
  const hasPublications = publications.length > 0

  if (!hasPublications && act.officialTextUrl === null) return null

  return (
    <LegislationSection
      id="act-publication-heading"
      title={t`Unde a fost publicat`}
      description={t`De la data apariției în Monitorul Oficial, un act produce efecte.`}
      footnote={
        <Trans>
          Marcajul se referă doar la existența PDF-ului oficial pe
          monitoruloficial.ro, nu la disponibilitatea textului la noi.
        </Trans>
      }
    >
      <div className="flex flex-col gap-4">
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

        {!hasPublications ? (
          <p className="text-sm text-[var(--pnrr-muted)]">
            <Trans>
              Nu am putut lega acest act de un număr din Monitorul Oficial. Doar
              46,4% dintre publicări se potrivesc cu certitudine unui act din
              Portal Legislativ.
            </Trans>
          </p>
        ) : null}

        {act.officialTextUrl !== null ? (
          <div className="border-t-2 border-[var(--pnrr-border)] pt-4">
            <a
              href={act.officialTextUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={OUT_LINK_CLASS}
            >
              <Trans>Citește textul oficial pe legislatie.just.ro</Trans>
              <ExternalLink className="h-3.5 w-3.5" aria-hidden />
            </a>
            <p className="mt-1.5 text-xs text-[var(--pnrr-muted)]">
              <Trans>
                Textul integral nu este disponibil aici. Portal Legislativ este
                sursa oficială.
              </Trans>
            </p>
          </div>
        ) : null}
      </div>
    </LegislationSection>
  )
}
