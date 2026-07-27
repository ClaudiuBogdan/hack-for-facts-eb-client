import { useEffect, useState } from 'react'
import { ArrowUp } from 'lucide-react'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  stenogramScrollTopClassName,
  stenogramScrollTopCompactClassName,
} from '../lib/stenogram-theme'

type Props = {
  /**
   * The element focus is returned to — the reader's own heading, so a keyboard
   * or screen-reader user lands at the top of the DOCUMENT, not at the top of
   * the page chrome. It must carry `tabIndex={-1}`.
   */
  readonly targetId: string
  /** How far the reader must have scrolled before the button appears. */
  readonly appearAfterPx?: number
  /**
   * Arrow only, no label — the form it takes at the foot of the intervention
   * rail, where the column is narrower than the words would be. The accessible
   * name is unchanged, so nothing is lost to a screen reader.
   */
  readonly compact?: boolean
  readonly className?: string
}

/**
 * A sitting can print several thousand blocks, and the browser's own way back
 * to the top (Home, or a long swipe) is not discoverable on a touch device
 * halfway down a six-hour debate. Hence a button — but an IN-FLOW one, placed
 * by its caller in the reader's left lane rather than floating over the corner
 * of the page: it must never cover the transcript, the intervention rail or the
 * app's own bottom fixtures. It is still ABSENT until the reader is well past
 * the first screen, so it does not offer to undo a scroll nobody made.
 */
const DEFAULT_APPEAR_AFTER_PX = 800

export function ParliamentStenogramScrollTop({
  targetId,
  appearAfterPx = DEFAULT_APPEAR_AFTER_PX,
  compact = false,
  className,
}: Props) {
  // SSR renders NOTHING: the server has no scroll position, and a button that
  // shipped visible in the HTML would flash on every first paint.
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // One passive listener, coalesced into an animation frame. The "already
    // scheduled" flag is separate from the frame id on purpose: clearing the id
    // inside the callback would race with the assignment that stores it.
    let frame = 0
    let scheduled = false
    const read = () => {
      scheduled = false
      setVisible(window.scrollY > appearAfterPx)
    }
    const schedule = () => {
      if (scheduled) return
      scheduled = true
      frame = window.requestAnimationFrame(read)
    }

    read()
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    return () => {
      if (frame !== 0) window.cancelAnimationFrame(frame)
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
    }
  }, [appearAfterPx])

  // Unmounted rather than hidden: an invisible button that still takes a tab
  // stop is worse than no button at all.
  if (!visible) return null

  const handleClick = () => {
    const reducedMotion =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    window.scrollTo({ top: 0, behavior: reducedMotion ? 'auto' : 'smooth' })
    // Focus follows the scroll, not the other way round: `preventScroll` keeps
    // the smooth movement above from being cut short by the focus jump.
    document.getElementById(targetId)?.focus({ preventScroll: true })
  }

  return (
    <Button
      type="button"
      variant={compact ? 'ghost' : 'outline'}
      onClick={handleClick}
      aria-label={t`Înapoi la începutul stenogramei`}
      className={cn(
        compact
          ? stenogramScrollTopCompactClassName
          : stenogramScrollTopClassName,
        className,
      )}
    >
      <ArrowUp
        // Bolder in the compact form: it is the only mark of its kind in a
        // column of hairline bars, and a 1.5px arrow among them reads as one
        // more tick rather than as the control it is.
        strokeWidth={compact ? 2.75 : 2}
        className={cn(compact ? 'size-5' : 'mr-2 h-4 w-4', 'shrink-0')}
        aria-hidden
      />
      {compact ? null : <Trans>Înapoi sus</Trans>}
    </Button>
  )
}
