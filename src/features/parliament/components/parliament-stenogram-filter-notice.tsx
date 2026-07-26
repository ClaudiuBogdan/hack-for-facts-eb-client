import { X } from 'lucide-react'
import { Trans } from '@lingui/react/macro'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { stenogramFilterNoticeClassName } from '../lib/stenogram-theme'

type Props = {
  /** The selected printed names, in the reader's own order. Never empty here. */
  readonly selected: readonly string[]
  /** Contributions on screen, and in the WHOLE sitting. */
  readonly visibleCount: number
  readonly totalCount: number
  /** `?interventie=` names a block this selection hides — stated, not ignored. */
  readonly linkedOutsideExcerpt?: boolean
  /** The one way back to the complete record. */
  readonly onClear: () => void
  readonly className?: string
}

/**
 * "This is an EXCERPT" — the statement that qualifies a filtered reading.
 *
 * It lives in the reader's LEFT LANE, in the same sticky stack as the agenda,
 * and not as a full-width band above the document. That is a placement decision
 * with a reason: as a band it was read once, at the top, and then scrolled away
 * — leaving several screens of transcript that look exactly like a sitting and
 * are not one. In the sticky lane the claim stays next to the text it qualifies
 * for as long as the text is on screen.
 *
 * It carries the ONE restore-full action. The toolbar above the reader offers
 * the selection itself; a second identically-labelled button there would just
 * be two ways to press the same thing.
 *
 * Deliberately NOT `print:hidden`: printing a filtered reading must print the
 * sentence that says it is one.
 */
export function ParliamentStenogramFilterNotice({
  selected,
  visibleCount,
  totalCount,
  linkedOutsideExcerpt = false,
  onClear,
  className,
}: Props) {
  const speakerList = selected.join(' · ')

  return (
    <div
      role="status"
      className={cn(stenogramFilterNoticeClassName, 'p-4 sm:p-4', className)}
    >
      <p className="font-bold">
        <Trans>Extras filtrat — nu este stenograma integrală.</Trans>
      </p>
      <p className="mt-1 line-clamp-4 break-words print:line-clamp-none">
        <Trans>
          Se afișează {visibleCount} din {totalCount} luări de cuvânt ale
          ședinței, doar de la: {speakerList}.
        </Trans>
      </p>
      <p className="mt-1">
        <Trans>
          Ordinea de zi, intervențiile celorlalți vorbitori și notările din sală
          nu sunt afișate. Textul complet și oficial rămâne stenograma integrală.
        </Trans>
      </p>
      {linkedOutsideExcerpt ? (
        <p className="mt-2 font-bold">
          <Trans>
            Intervenția din link nu aparține vorbitorilor selectați, așa că nu
            apare în acest extras.
          </Trans>
        </p>
      ) : null}
      <Button
        type="button"
        variant="outline"
        className="mt-3 h-10 w-full justify-start rounded-none border-2 print:hidden"
        onClick={() => onClear()}
      >
        <X className="mr-2 h-4 w-4 shrink-0" aria-hidden />
        <Trans>Arată stenograma integrală</Trans>
      </Button>
    </div>
  )
}
