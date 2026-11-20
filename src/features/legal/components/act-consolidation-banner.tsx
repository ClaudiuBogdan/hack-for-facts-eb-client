import { useLingui } from '@lingui/react'
import { Trans } from '@lingui/react/macro'
import { AlertTriangle, ExternalLink } from 'lucide-react'
import { formatLegalDate } from '../lib/legal-format'
import { portalConsolidationNote, type ShownVersion } from '../lib/legal-versions'
import { legislationAlertClassName } from '../lib/legislation-theme'

type Props = {
  /** The consolidation whose text is on screen. */
  readonly version: ShownVersion
}

/**
 * The consolidation label the legal review requires wherever a Portal
 * consolidation's text is shown (LEG-X3AV), in the review's own wording.
 *
 * A Portal consolidation is unofficial and informative, and the Portal's note
 * ("consolidarea din …") is a SOURCE date — not the date a reader asks about,
 * so the page never calls it "the text in force at" any date. The quoted note
 * is the Portal's own (`portalConsolidationNote`); with neither label nor date
 * filled the sentence is dropped rather than quoting nothing. The link is the
 * form's own Portal page.
 *
 * It sits OUTSIDE `#reader-content`: the article holds only the law's text,
 * so find-in-page, copy and citation never pick the label up as law.
 */
export function ActConsolidationBanner({ version }: Props) {
  const { i18n } = useLingui()
  const note = portalConsolidationNote(version, (value) => formatLegalDate(value, i18n.locale))

  return (
    <div className={`${legislationAlertClassName} mb-6`} role="note">
      <AlertTriangle
        className="mt-0.5 h-4 w-4 shrink-0 text-[var(--pnrr-warning-fg)]"
        aria-hidden
      />
      <div className="flex flex-col gap-2 text-sm leading-6 text-[var(--pnrr-fg)]">
        <p>
          <Trans>Formă consolidată neoficială, cu caracter informativ.</Trans>
          {note !== null && (
            <>
              {' '}
              <Trans>Portalul Legislativ indică „{note}”.</Trans>
            </>
          )}{' '}
          <Trans>
            Pentru a stabili dispozițiile aplicabile la o dată, consultați în
            Monitorul Oficial actul, republicările, actele modificatoare și
            dispozițiile tranzitorii relevante.
          </Trans>
        </p>
        {version.sourceUrl !== null && (
          <p>
            <a
              href={version.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-semibold underline underline-offset-2"
            >
              <Trans>Forma consolidată pe Portalul Legislativ</Trans>
              <ExternalLink className="size-3" aria-hidden />
            </a>
          </p>
        )}
      </div>
    </div>
  )
}
