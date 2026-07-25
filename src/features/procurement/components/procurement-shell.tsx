import { useState, type ReactNode } from 'react'
import { Trans } from '@lingui/react/macro'
import { t } from '@lingui/core/macro'
import { Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type { ProcurementLandingFilters } from '@/schemas/procurement-overview'
import type { ProcurementHubView } from '@/schemas/procurement-hub'
import { useProcurementLanding } from '../hooks/use-procurement-data'
import {
  stickyCompactBarPositionClassName,
  useStickyCompactHeader,
} from '../hooks/use-sticky-compact-header'
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
  const {
    headerRef: fullHeaderRef,
    isCompactVisible,
    hasMounted,
    isMobile,
    sidebarState,
  } = useStickyCompactHeader({ enabled: enableStickyChrome })
  const { data, isPending } = useProcurementLanding(landingFilters)
  const hasStickyFilters = Boolean(stickyFilters)
  const hasActiveLandingFilters = Boolean(
    landingFilters.dateFrom ||
      landingFilters.dateTo ||
      landingFilters.buyerRegion ||
      landingFilters.buyerCounty,
  )

  const actionsCluster = (
    <div className="flex shrink-0 items-center gap-2">
      {/* Quiet utility — the filter trigger next to it stays the primary action. */}
      <Button
        variant="ghost"
        size="icon"
        className="h-10 w-10 rounded-none text-[var(--pnrr-muted)] hover:bg-[var(--pnrr-subtle)] hover:text-[var(--pnrr-fg)]"
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
            stickyCompactBarPositionClassName({ isMobile, sidebarState }),
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
