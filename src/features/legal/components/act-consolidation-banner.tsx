import { useId, useState } from 'react'
import { useLingui } from '@lingui/react'
import { Trans } from '@lingui/react/macro'
import { ArrowUpRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatLegalDate } from '../lib/legal-format'
import { portalConsolidationNote, type ShownVersion } from '../lib/legal-versions'
import { ACT_LINK, ACT_MORE } from './reader/act-page-grid'

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
 * Set as the box's small print (owner, 26 November 2026, the act page's
 * redesign), folded: what the form is and the Portal's own dated note ALWAYS
 * stay in sight (the data owner's rule: the date the text reflects is what a
 * reader sets against the date they ask about); only the guidance sentence and
 * the Portal link open under „Detalii".
 *
 * It sits OUTSIDE `#reader-content`: the article holds only the law's text,
 * so find-in-page, copy and citation never pick the label up as law.
 */
export function ActConsolidationBanner({ version }: Props) {
  const { i18n } = useLingui()
  const [open, setOpen] = useState(false)
  const details = useId()
  const note = portalConsolidationNote(version, (value) => formatLegalDate(value, i18n.locale))

  return (
    <div role="note" className="border-l-2 border-status-partial-fg pl-4 text-sm leading-6 min-[88rem]:pl-3 min-[88rem]:leading-5">
      <p className="font-medium text-foreground">
        <Trans>Formă consolidată neoficială, cu caracter informativ.</Trans>
      </p>
      {note !== null && (
        <p className="mt-1 text-muted-foreground">
          <Trans>Portalul Legislativ indică „{note}”.</Trans>
        </p>
      )}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-controls={details}
        className={cn(ACT_MORE, 'mt-1 inline-flex min-h-11 items-center text-xs sm:min-h-8 print:hidden')}
      >
        {open ? <Trans>Mai puțin</Trans> : <Trans>Detalii</Trans>}
      </button>
      {/* Folded by a class, not the `hidden` attribute: on paper the guidance is always printed, as before the fold. */}
      <div id={details} className={cn('pb-0.5 text-xs leading-5 text-muted-foreground', !open && 'hidden print:block')}>
        <p>
          <Trans>
            Pentru a stabili dispozițiile aplicabile la o dată, consultați în
            Monitorul Oficial actul, republicările, actele modificatoare și
            dispozițiile tranzitorii relevante.
          </Trans>
        </p>
        {version.sourceUrl !== null && (
          <p className="mt-1.5">
            {/* Inline, so the arrow stays with the last word when the link wraps in a narrow column. */}
            <a href={version.sourceUrl} target="_blank" rel="noopener noreferrer" className={cn(ACT_LINK, 'text-xs')}>
              <Trans>Forma consolidată pe Portalul Legislativ</Trans>
              <ArrowUpRight className="ml-1 inline size-3.5 align-[-2px]" aria-hidden />
            </a>
          </p>
        )}
      </div>
    </div>
  )
}
