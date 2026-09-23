import { useEffect, useId, useRef, useState } from 'react'
import { Trans } from '@lingui/react/macro'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { statisticsTheme } from '../../lib/statistics-theme'
import { PublishedText } from './published-text'

type Props = {
  readonly text: string
}

/**
 * The INS definition of the matrix: published text, kept to three lines until
 * the reader asks for the rest.
 *
 * Two things shape this component, both measured rather than assumed:
 *
 * 1. **These run long.** SOM101F's quotes Legea 76/2002 in full — 3,080
 *    characters — enough to push the figure, the chart and the controls off a
 *    phone entirely. Hence the clamp.
 * 2. **Revealing all of it must not cost the reader the page.** Expanding
 *    SOM101F inline moved the band 1,388px down at 390px wide while the
 *    scroll position stayed put: the figure, the chart and the control that
 *    undoes the tap all left the screen at once. So the opened text scrolls
 *    inside its own bounded box, and everything below it moves by at most
 *    that box's height.
 *
 * The clamp is visual — the whole string is always in the DOM, for search,
 * copy and assistive tech.
 *
 * TEMPO ships anchors inside a few definitions (CON113A's points at the
 * ESA regulation on EUR-Lex), so the text goes through `PublishedText`:
 * the anchor becomes a link and every other tag is dropped, never printed.
 */
export function DetailDefinition({ text }: Props) {
  const [expanded, setExpanded] = useState(false)
  /**
   * Whether three lines actually hide anything. A character count cannot
   * answer this: the prose column measures 585px at 1440 (≈250 characters in
   * three lines) and 348px at 390 (≈135), so any single threshold either
   * leaves phone readers with a wall of text or hands desktop readers a
   * toggle that does nothing. So it is measured, and re-measured on resize.
   * Before hydration nothing is measured and no toggle renders, which is the
   * honest state: the text is all there, clamped.
   */
  const [truncated, setTruncated] = useState(false)
  const paragraphRef = useRef<HTMLParagraphElement>(null)
  const id = useId()

  useEffect(() => {
    const paragraph = paragraphRef.current
    if (!paragraph) return
    const measure = () => {
      // Only meaningful while the clamp is on; expanded, the two are equal.
      if (!expanded)
        setTruncated(paragraph.scrollHeight > paragraph.clientHeight + 1)
    }
    measure()
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(measure)
    observer.observe(paragraph)
    return () => observer.disconnect()
  }, [expanded, text])

  const toggleable = truncated || expanded

  return (
    <div className="mt-3 space-y-1">
      <div
        className={cn(
          expanded && 'max-h-72 overflow-y-auto pr-2 md:max-h-96',
        )}
        // A scrollable region has to be reachable by keyboard; without this
        // its content is unreadable without a pointer.
        {...(expanded ? { tabIndex: 0 } : {})}
      >
        <PublishedText
          ref={paragraphRef}
          id={id}
          text={text}
          className={cn(statisticsTheme.prose, !expanded && 'line-clamp-3')}
        />
      </div>
      {toggleable ? (
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls={id}
          onClick={() => setExpanded((open) => !open)}
          // `py-1 -ml-1 px-1` is the hit area, not the decoration: a 12px line
          // of text is well under WCAG 2.2 AA's 24px minimum target (2.5.8).
          className="-ml-1 inline-flex items-center gap-1 rounded-sm px-1 py-1 text-xs font-medium text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          {expanded ? (
            <Trans>Arată mai puțin</Trans>
          ) : (
            <Trans>Citește definiția completă</Trans>
          )}
          <ChevronDown
            className={cn(
              'h-3 w-3 transition-transform',
              expanded && 'rotate-180',
            )}
            aria-hidden="true"
          />
        </button>
      ) : null}
    </div>
  )
}
