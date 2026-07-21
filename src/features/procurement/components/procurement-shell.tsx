import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Trans } from '@lingui/react/macro'
import { t } from '@lingui/core/macro'
import { Activity, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useOptionalSidebar } from '@/components/ui/sidebar'
import { useIsMobile } from '@/hooks/use-mobile'
import { cn } from '@/lib/utils'
import type { ProcurementLandingFilters } from '@/schemas/procurement-overview'
import type { ProcurementHubView } from '@/schemas/procurement-hub'
import { useProcurementLanding } from '../hooks/use-procurement-data'
import { formatFlowCount, formatRon } from '../lib/formatting'
import {
  procurementHeaderDescriptionClassName,
  procurementHeaderHeroClassName,
  procurementHeaderStatClassName,
  procurementHeaderStatLabelClassName,
  procurementHeaderStatValueClassName,
  procurementHeaderTitleClassName,
  procurementHeaderTitleStyle,
} from '../lib/procurement-theme'
import { ProcurementInfoSheet } from './procurement-info-sheet'
import { ProcurementTabNav, type ProcurementTab } from './procurement-tab-nav'

type Props = {
  readonly activeTab: ProcurementTab
  readonly children: ReactNode
  readonly actions?: ReactNode
  readonly landingFilters?: ProcurementLandingFilters
  /** Search + active filters rendered under the stats/actions row (overview). */
  readonly toolbar?: ReactNode
  /** Compact sticky bar under the chrome when the full header scrolls away. */
  readonly stickyFilters?: ReactNode
  readonly enableStickyChrome?: boolean
  /** Preserve all hub URL params when switching Overview ↔ List (F2). */
  readonly onTabChange?: (view: ProcurementHubView) => void
}

/** Shared page frame for the procurement hub — PNRR header rhythm. */
export function ProcurementShell({
  activeTab,
  children,
  actions,
  landingFilters = {},
  toolbar,
  stickyFilters,
  enableStickyChrome = false,
  onTabChange,
}: Props) {
  const [infoOpen, setInfoOpen] = useState(false)
  const [hasMounted, setHasMounted] = useState(false)
  const [isCompactVisible, setIsCompactVisible] = useState(false)
  const fullHeaderRef = useRef<HTMLElement | null>(null)
  const lastScrollYRef = useRef(0)
  const mobileCompactVisibleRef = useRef(false)
  const sidebar = useOptionalSidebar()
  const isViewportMobile = useIsMobile()
  const sidebarState = sidebar?.state
  const isMobile = sidebar?.isMobile ?? isViewportMobile
  const { data, isPending } = useProcurementLanding(landingFilters)
  const hasStickyFilters = Boolean(stickyFilters)
  const hasActiveLandingFilters = Boolean(
    landingFilters.dateFrom ||
      landingFilters.dateTo ||
      landingFilters.buyerRegion ||
      landingFilters.buyerCounty,
  )

  useEffect(() => {
    if (!enableStickyChrome) return
    setHasMounted(true)
    lastScrollYRef.current = window.scrollY

    const updateCompactVisibility = () => {
      const headerBottom =
        fullHeaderRef.current?.getBoundingClientRect().bottom ??
        Number.POSITIVE_INFINITY
      const currentScrollY = window.scrollY
      if (isMobile) {
        if (currentScrollY > lastScrollYRef.current + 4) {
          mobileCompactVisibleRef.current = true
        }
        if (currentScrollY < lastScrollYRef.current - 4) {
          mobileCompactVisibleRef.current = false
        }
      }
      lastScrollYRef.current = currentScrollY
      setIsCompactVisible(
        headerBottom <= 0 && (!isMobile || mobileCompactVisibleRef.current),
      )
    }

    updateCompactVisibility()
    const visibilityInterval = window.setInterval(updateCompactVisibility, 120)
    window.addEventListener('scroll', updateCompactVisibility, { passive: true })
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
  }, [enableStickyChrome, isMobile])

  const actionsCluster = (
    <div className="flex shrink-0 items-center gap-2">
      <Button
        variant="outline"
        size="icon"
        className="h-10 w-10 rounded-none border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-card)] text-[var(--pnrr-fg)] hover:bg-[var(--pnrr-fg)] hover:text-[var(--pnrr-bg)]"
        onClick={() => setInfoOpen(true)}
        aria-label={t`About this data`}
      >
        <Info className="h-5 w-5" aria-hidden />
      </Button>
      {actions}
    </div>
  )

  return (
    <div className="min-h-screen min-w-0 bg-background">
      {enableStickyChrome && hasMounted ? (
        <div
          aria-hidden={!isCompactVisible}
          inert={!isCompactVisible ? true : undefined}
          className={cn(
            'fixed top-0 z-30 border-b-2 border-[var(--pnrr-border)] bg-[var(--pnrr-bg)]/90 backdrop-blur-md transition-[transform,opacity] duration-200 ease-out',
            isCompactVisible
              ? 'translate-y-0 opacity-100'
              : 'pointer-events-none -translate-y-full opacity-0',
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
                <Trans>Procurement</Trans>
              </button>
              <div className="min-w-0 overflow-x-auto">
                <ProcurementTabNav
                  activeTab={activeTab}
                  onTabChange={onTabChange}
                  compact
                  className="border-0"
                />
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2 max-sm:[&_button]:px-2 max-sm:[&_span]:hidden">
              {actionsCluster}
            </div>
          </div>
          {hasStickyFilters ? (
            <div
              className={cn(
                'mx-auto max-w-7xl px-4 py-1.5 sm:px-6 lg:px-8',
                hasActiveLandingFilters && 'border-t-2 border-[var(--pnrr-border)]',
              )}
            >
              {stickyFilters}
            </div>
          ) : null}
        </div>
      ) : null}

      <header
        ref={fullHeaderRef}
        className="relative border-b-2 border-[var(--pnrr-border)] bg-background"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className={procurementHeaderHeroClassName}>
            <h1
              className={procurementHeaderTitleClassName}
              style={procurementHeaderTitleStyle}
            >
              <Trans>Public procurement</Trans>
            </h1>
            <p
              className={cn(
                procurementHeaderDescriptionClassName,
                'mt-4 sm:mt-6',
              )}
            >
              <Trans>
                Tenders, contracts and direct purchases made by Romanian public
                institutions — with sources, coverage and honest limits
                disclosed for every figure.
              </Trans>
            </p>

            {/* Stats + actions — same row as PNRR (stack on mobile). */}
            <div className="mt-6 flex flex-col items-stretch justify-between gap-4 sm:flex-row sm:items-center">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                {isPending ? (
                  <>
                    <div className={procurementHeaderStatClassName}>
                      <Activity className="h-4 w-4 shrink-0" aria-hidden />
                      <Skeleton className="h-4 w-10 rounded-none" />
                      <span className={procurementHeaderStatLabelClassName}>
                        <Trans>direct acquisitions</Trans>
                      </span>
                    </div>
                    <div className={procurementHeaderStatClassName}>
                      <Skeleton className="h-4 w-10 rounded-none" />
                      <span className={procurementHeaderStatLabelClassName}>
                        <Trans>contracts</Trans>
                      </span>
                    </div>
                  </>
                ) : data ? (
                  <>
                    {data.headline.directAcquisitionsCount !== null ? (
                      <div className={procurementHeaderStatClassName}>
                        <Activity
                          className="h-4 w-4 shrink-0 text-[var(--pnrr-fg)]"
                          aria-hidden
                        />
                        <span className={procurementHeaderStatValueClassName}>
                          {formatFlowCount(
                            data.headline.directAcquisitionsCount,
                          )}
                        </span>
                        <span className={procurementHeaderStatLabelClassName}>
                          <Trans>direct acquisitions</Trans>
                        </span>
                      </div>
                    ) : null}
                    {data.headline.contractsCount !== null ? (
                      <div className={procurementHeaderStatClassName}>
                        <span className={procurementHeaderStatValueClassName}>
                          {formatFlowCount(data.headline.contractsCount)}
                        </span>
                        <span className={procurementHeaderStatLabelClassName}>
                          <Trans>contracts</Trans>
                        </span>
                      </div>
                    ) : null}
                    {data.headline.totalValueRon !== null ? (
                      <div className={procurementHeaderStatClassName}>
                        <span className={procurementHeaderStatValueClassName}>
                          {formatRon(data.headline.totalValueRon, 'compact')}
                        </span>
                        <span className={procurementHeaderStatLabelClassName}>
                          <Trans>awarded value (partial)</Trans>
                        </span>
                      </div>
                    ) : null}
                  </>
                ) : null}
              </div>
              {actionsCluster}
            </div>

            {toolbar ? <div className="mt-4 space-y-3">{toolbar}</div> : null}
          </div>

          <div className="min-w-0 overflow-hidden pt-4">
            <ProcurementTabNav
              activeTab={activeTab}
              onTabChange={onTabChange}
            />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {children}
      </main>

      <ProcurementInfoSheet open={infoOpen} onOpenChange={setInfoOpen} />
    </div>
  )
}
