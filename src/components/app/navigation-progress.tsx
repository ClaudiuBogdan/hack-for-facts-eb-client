import { useEffect, useState } from 'react'
import { useRouterState } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'
import { cn } from '@/lib/utils'

/**
 * A navigation quicker than this shows nothing: the page simply changes. A
 * click should be answered well inside the ~200ms a reader waits before
 * clicking again, and the route's own pending skeleton (router
 * `defaultPendingMs: 200`) takes over from there where there is one.
 */
export const NAVIGATION_PROGRESS_DELAY_MS = 120
/** How long the finished bar takes to fill the width and fade. */
const FINISH_MS = 450

type Phase = 'idle' | 'loading' | 'finishing'

/**
 * Only the scale moves, and its transition lives in the class so reduced
 * motion can drop it: the bar then stands still at its width and goes when
 * the page arrives — the report without the flourish.
 */
const PHASE_CLASS: Record<Phase, string> = {
  idle: 'opacity-0',
  // Fast at first, then crawling: it never reaches the end on its own, so a
  // slow page does not look finished.
  loading:
    'opacity-100 [transition:transform_10s_cubic-bezier(0.08,0.8,0.2,1),opacity_150ms_ease-out]',
  finishing:
    'opacity-0 [transition:transform_200ms_ease-out,opacity_250ms_ease-in_200ms]',
}
const PHASE_SCALE: Record<Phase, number> = { idle: 0, loading: 0.9, finishing: 1 }

/**
 * The app-wide answer to a click: a 4px bar across the top while the router
 * is between pages. A client-side navigation changes the address at once but
 * keeps the previous page until the next one's code has arrived — up to 4s
 * on a slow 3G link, measured — and without this the click looked ignored.
 * The router is pending from the address change until the new page has
 * rendered, the route's pending skeleton included.
 */
export function NavigationProgress() {
  const pending = useRouterState({ select: (state) => state.status === 'pending' })
  const [phase, setPhase] = useState<Phase>('idle')

  useEffect(() => {
    if (pending) {
      // A bar still filling for the last page starts again from nothing,
      // rather than shrinking back from full.
      setPhase((current) => (current === 'finishing' ? 'idle' : current))
      const timer = window.setTimeout(() => setPhase('loading'), NAVIGATION_PROGRESS_DELAY_MS)
      return () => window.clearTimeout(timer)
    }
    setPhase((current) => (current === 'loading' ? 'finishing' : current))
    return undefined
  }, [pending])

  useEffect(() => {
    if (phase !== 'finishing') return undefined
    const timer = window.setTimeout(() => setPhase('idle'), FINISH_MS)
    return () => window.clearTimeout(timer)
  }, [phase])

  return (
    <>
      <div
        aria-hidden="true"
        data-nav-progress={phase}
        className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-1"
      >
        <div
          className={cn('h-full origin-left bg-primary motion-reduce:[transition:none]', PHASE_CLASS[phase])}
          style={{ transform: `scaleX(${PHASE_SCALE[phase]})` }}
        />
      </div>
      {/* What a screen reader hears instead: a progress bar that appears is
          not announced, a status whose text changes is — so it is always
          mounted, and only its words come and go. */}
      <p role="status" className="sr-only">
        {phase === 'loading' ? t`Se încarcă pagina` : ''}
      </p>
    </>
  )
}
