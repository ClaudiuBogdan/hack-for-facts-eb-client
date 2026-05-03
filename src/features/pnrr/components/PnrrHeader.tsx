import { useEffect, useState, useRef } from 'react'
import { Trans } from '@lingui/react/macro'
import { usePnrrCurrency } from '../lib/usePnrrCurrency'
import { formatPnrrCurrency } from '../lib/formatting'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type { PnrrView } from '@/schemas/pnrr'
import { PnrrTabNav } from './PnrrTabNav'
import { PnrrActiveFilters } from './filters/PnrrActiveFilters'
import type { usePnrrFilterState } from '../hooks/usePnrrFilterState'
import { getActiveFilterCount, PNRR_LAST_UPDATED } from '../lib/data-transform'
import { useOptionalSidebar } from '@/components/ui/sidebar'
import { useIsMobile } from '@/hooks/use-mobile'
import { Activity } from 'lucide-react'

export function PnrrHeader({
  projectsCount,
  totalValue,
  view,
  onViewChange,
  actions,
  filterState,
  isLoading = false,
}: {
  readonly projectsCount: number
  readonly totalValue: number
  readonly view: PnrrView
  readonly onViewChange: (view: PnrrView) => void
  readonly actions?: React.ReactNode
  readonly filterState: ReturnType<typeof usePnrrFilterState>
  readonly isLoading?: boolean
}) {
  const [hasMounted, setHasMounted] = useState(false)
  const [isCompactVisible, setIsCompactVisible] = useState(false)
  const lastScrollYRef = useRef(0)
  const mobileCompactVisibleRef = useRef(false)
  const fullHeaderRef = useRef<HTMLElement | null>(null)
  const sidebar = useOptionalSidebar()
  const isViewportMobile = useIsMobile()
  const sidebarState = sidebar?.state
  const isMobile = sidebar?.isMobile ?? isViewportMobile
  const currency = usePnrrCurrency()
  const formattedLastUpdated = new Date(PNRR_LAST_UPDATED).toLocaleDateString(
    'ro-RO',
    {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    },
  )

  useEffect(() => {
    setHasMounted(true)
    lastScrollYRef.current = window.scrollY

    const updateCompactVisibility = () => {
      const fullHeader =
        fullHeaderRef.current ?? document.querySelector<HTMLElement>('header')
      const headerBottom =
        fullHeader?.getBoundingClientRect().bottom ?? Number.POSITIVE_INFINITY
      const currentScrollY = window.scrollY
      const isScrollingDownPage = currentScrollY > lastScrollYRef.current + 4
      const isScrollingUpPage = currentScrollY < lastScrollYRef.current - 4
      if (isMobile) {
        if (isScrollingDownPage) mobileCompactVisibleRef.current = true
        if (isScrollingUpPage) mobileCompactVisibleRef.current = false
      }
      lastScrollYRef.current = currentScrollY
      const nextShouldShow =
        headerBottom <= 0 && (!isMobile || mobileCompactVisibleRef.current)
      setIsCompactVisible(nextShouldShow)
    }

    updateCompactVisibility()
    const visibilityInterval = window.setInterval(updateCompactVisibility, 120)
    window.addEventListener('scroll', updateCompactVisibility, {
      passive: true,
    })
    document.addEventListener('scroll', updateCompactVisibility, {
      passive: true,
      capture: true,
    })
    window.addEventListener('resize', updateCompactVisibility)
    return () => {
      window.clearInterval(visibilityInterval)
      window.removeEventListener('scroll', updateCompactVisibility)
      document.removeEventListener('scroll', updateCompactVisibility, {
        capture: true,
      })
      window.removeEventListener('resize', updateCompactVisibility)
    }
  }, [isMobile])

  const hasActiveFilters = getActiveFilterCount(filterState.search) > 0

  return (
    <>
      {/* Compact sticky header */}
      {hasMounted && (
        <div
          aria-hidden={!isCompactVisible}
          inert={!isCompactVisible ? true : undefined}
          className={cn(
            'fixed top-0 z-30 border-b-2 border-[var(--pnrr-border)] bg-[var(--pnrr-bg)]/90 backdrop-blur-md transition-[transform,opacity] duration-200 ease-out',
            isCompactVisible
              ? 'translate-y-0 opacity-100'
              : '-translate-y-full opacity-0 pointer-events-none',
            isMobile && 'left-0 w-full',
            !isMobile &&
              sidebarState === 'expanded' &&
              'left-[var(--sidebar-width)] right-0 w-auto',
            !isMobile &&
              sidebarState === 'collapsed' &&
              'left-[var(--sidebar-width-icon)] right-0 w-auto',
            !isMobile && !sidebarState && 'left-0 right-0 w-auto',
          )}
        >
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-2 sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-3 overflow-hidden">
              <button
                type="button"
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className="shrink-0 text-sm font-black tracking-tight text-[var(--pnrr-fg)] transition-colors hover:text-[var(--pnrr-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pnrr-green)]/60"
              >
                <Trans>PNRR</Trans>
              </button>
              <PnrrTabNav
                view={view}
                onChange={onViewChange}
                compact
                className="border-0"
              />
            </div>
            {/* Compact actions — icon-only on mobile */}
            {actions && (
              <div className="flex shrink-0 items-center gap-2 max-sm:[&_button]:px-2 max-sm:[&_span]:hidden">
                {actions}
              </div>
            )}
          </div>
          {/* Compact active filters row */}
          <div
            className={cn(
              'mx-auto max-w-7xl px-4 py-1.5 sm:px-6 lg:px-8',
              hasActiveFilters && 'border-t-2 border-[var(--pnrr-border)]',
            )}
          >
            <PnrrActiveFilters filterState={filterState} compact />
          </div>
        </div>
      )}

      {/* Full header */}
      <header
        ref={fullHeaderRef}
        className="relative border-b-2 border-[var(--pnrr-border)]"
        style={{ backgroundColor: 'var(--pnrr-bg)' }}
      >
        <div className="mx-auto max-w-7xl px-4 pb-6 pt-10 sm:px-6 sm:pt-14 lg:px-8">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 border-2 border-[var(--pnrr-border)] px-2.5 py-1.5 text-[11px] font-black uppercase tracking-widest text-[var(--pnrr-fg)]">
            <span className="h-2.5 w-2.5 bg-[var(--pnrr-green)]" />
            <Trans>Last update {formattedLastUpdated}</Trans>
          </div>

          {/* Title */}
          <h1
            className="mt-6 text-balance font-black leading-[0.85] tracking-tight text-[var(--pnrr-fg)]"
            style={{ fontSize: 'clamp(2.5rem, 7vw, 5.5rem)' }}
          >
            <span className="block">
              <Trans>Plan</Trans>
            </span>
            <span className="block">
              <Trans>National</Trans>
            </span>
            <span
              className="block w-fit sm:max-w-[900px] lg:max-w-[1100px] bg-[var(--pnrr-fg)] px-3 py-2 sm:px-5 sm:py-3"
              style={{ color: 'var(--pnrr-bg)' }}
            >
              <span className="block">
                <Trans>Recovery</Trans>
              </span>
              <span className="block">
                <Trans>and Resilience</Trans>
              </span>
            </span>
          </h1>

          {/* Paragraph */}
          <p className="mt-4 max-w-[720px] text-base leading-relaxed text-[var(--pnrr-muted)]">
            <Trans>
              Interactive dashboard with all PNRR projects. See where the money
              goes, which projects are at risk, and how implementation is
              progressing.
            </Trans>
          </p>

          {/* Stats + Actions row */}
          <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2">
              {isLoading ? (
                <>
                  <div
                    className="inline-flex items-center gap-2 border-2 border-[var(--pnrr-border)] px-3 py-2 text-[var(--pnrr-fg)]"
                    style={{ backgroundColor: 'var(--pnrr-card)' }}
                  >
                    <Activity className="h-4 w-4 text-current" />
                    <Skeleton className="h-4 w-8 rounded-none" />
                    <span className="text-sm font-bold text-current">
                      <Trans>projects</Trans>
                    </span>
                  </div>
                  <div
                    className="inline-flex items-center gap-2 border-2 border-[var(--pnrr-border)] px-3 py-2 text-[var(--pnrr-fg)]"
                    style={{ backgroundColor: 'var(--pnrr-card)' }}
                  >
                    <Skeleton className="h-4 w-24 rounded-none" />
                    <span className="text-sm font-bold text-current">
                      <Trans>total</Trans>
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div
                    className="inline-flex items-center gap-2 border-2 border-[var(--pnrr-border)] px-3 py-2 text-[var(--pnrr-fg)]"
                    style={{ backgroundColor: 'var(--pnrr-card)' }}
                  >
                    <Activity className="h-4 w-4 text-current" />
                    <span className="text-sm font-black text-current">
                      {projectsCount.toLocaleString('ro-RO')}
                    </span>
                    <span className="text-sm font-bold text-current">
                      <Trans>projects</Trans>
                    </span>
                  </div>
                  <div
                    className="inline-flex items-center gap-2 border-2 border-[var(--pnrr-border)] px-3 py-2 text-[var(--pnrr-fg)]"
                    style={{ backgroundColor: 'var(--pnrr-card)' }}
                  >
                    <span className="text-sm font-black text-current">
                      {formatPnrrCurrency(totalValue, currency)}
                    </span>
                    <span className="text-sm font-bold text-current">
                      <Trans>total</Trans>
                    </span>
                  </div>
                </>
              )}
            </div>
            {actions && (
              <div className="flex shrink-0 items-center gap-2">{actions}</div>
            )}
          </div>
        </div>

        {/* Active filters */}
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <PnrrActiveFilters filterState={filterState} />
        </div>

        {/* Tab bar */}
        <div className="mx-auto min-w-0 max-w-7xl overflow-hidden px-4 sm:px-6 lg:px-8">
          <PnrrTabNav view={view} onChange={onViewChange} />
        </div>
      </header>
    </>
  )
}
