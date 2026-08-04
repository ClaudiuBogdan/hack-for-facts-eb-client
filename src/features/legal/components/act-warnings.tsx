import { useLingui } from '@lingui/react'
import { Trans } from '@lingui/react/macro'
import { AlertTriangle } from 'lucide-react'
import type { LegalActDetail } from '@/schemas/legal'
import { formatLegalDate, formatLegalNumber } from '../lib/legal-format'
import { legislationAlertClassName } from '../lib/legislation-theme'

type Props = {
  readonly act: LegalActDetail
}

/**
 * The two warnings that must sit **above** the summary, not below it.
 *
 * This is the most important component on the page. The plain-language summary
 * is generated from the document we hold, and for 10.033 acts that document is
 * the text *as first published* — the Codul Fiscal's body is dated 2015-09-10
 * and has been amended 295 times since, yet its summary still states the 2015
 * VAT rates in the flat, confident register of a summary. A reader who acts on
 * that is misled by us, not by the source.
 *
 * So the warning qualifies the summary before it is read. Putting it after, or
 * in a footnote, would be a decorative apology.
 *
 * Loud is not the same as first. These used to be 2px amber boxes competing with
 * eleven equally heavy cards below them; now the tint carries the signal, one
 * accent bar carries the urgency, and being the first thing under the title
 * carries the priority.
 *
 * See `docs/design/legal/act-detail.md` §4.
 */
export function ActWarnings({ act }: Props) {
  const { i18n } = useLingui()
  const number = (value: number) => formatLegalNumber(value, i18n.locale)

  const publishedOn =
    act.canonical?.versionDate ?? act.canonical?.firstPublicationDate ?? null
  const isStale = act.amendedAfterPublication > 0
  const isContradicted = act.statusEvidence.contradictedAbrogations > 0

  if (!isStale && !isContradicted) return null

  return (
    <div className="flex flex-col gap-2">
      {isStale ? (
        <div className={legislationAlertClassName}>
          <AlertTriangle
            className="mt-0.5 h-4 w-4 shrink-0 text-[var(--pnrr-warning-fg)]"
            aria-hidden
          />
          <div className="min-w-0">
            <p className="text-sm font-bold text-[var(--pnrr-fg)]">
              <Trans>
                Acest act a fost modificat de{' '}
                {number(act.amendedAfterPublication)} ori de la publicare.
              </Trans>
            </p>
            <p className="mt-1 max-w-prose text-sm leading-6 text-[var(--pnrr-muted)]">
              {publishedOn ? (
                <Trans>
                  Rezumatul și structura de mai jos descriu actul așa cum a fost
                  publicat la {formatLegalDate(publishedOn, i18n.locale)}. Nu
                  deținem textul consolidat la zi — pentru versiunea în vigoare,
                  consultă textul oficial.
                </Trans>
              ) : (
                <Trans>
                  Rezumatul și structura de mai jos descriu actul așa cum a fost
                  publicat inițial. Nu deținem textul consolidat la zi — pentru
                  versiunea în vigoare, consultă textul oficial.
                </Trans>
              )}
            </p>
          </div>
        </div>
      ) : null}

      {isContradicted ? (
        <div className={legislationAlertClassName}>
          <AlertTriangle
            className="mt-0.5 h-4 w-4 shrink-0 text-[var(--pnrr-warning-fg)]"
            aria-hidden
          />
          <div className="min-w-0">
            <p className="text-sm font-bold text-[var(--pnrr-fg)]">
              <Trans>Sursele nu sunt de acord despre ce s-a abrogat.</Trans>
            </p>
            <p className="mt-1 max-w-prose text-sm leading-6 text-[var(--pnrr-muted)]">
              <Trans>
                Am găsit {number(act.statusEvidence.contradictedAbrogations)}{' '}
                semnale de abrogare care se contrazic între ele. Statutul afișat
                este cea mai bună interpretare a noastră, nu o certitudine.
              </Trans>
            </p>
          </div>
        </div>
      ) : null}
    </div>
  )
}
