import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { Trans } from '@lingui/react/macro'
import { t } from '@lingui/core/macro'
import { formatNumber, cn } from '@/lib/utils'
import { usePnrrCurrency } from '../../lib/usePnrrCurrency'
import { formatPnrrCurrency } from '../../lib/formatting'
import { formatPnrrCompactCurrencyDisplayParts } from '../pnrr-compact-currency-display'
import type { PnrrAggregates } from '@/schemas/pnrr'
import type { usePnrrFilterState } from '../../hooks/usePnrrFilterState'
import { PnrrEmblematicProjects } from '../PnrrEmblematicProjects'
import { PnrrProjectDrawer } from '../table/PnrrProjectDrawer'
import { PnrrProjectsPreview } from '../PnrrProjectsPreview'
import { PnrrContentSkeleton } from '../PnrrSkeleton'
import { PnrrFundingBar } from '../charts/PnrrFundingBar'
import { ChevronDown, ChevronUp, Info } from 'lucide-react'
import {
  Tooltip as ShadcnTooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { hasPnrrDataFilters } from '../../lib/data-transform'
import { usePnrrProjectDetail } from '../../hooks/usePnrrData'
import type { PnrrWorkerOverviewModel } from '../../workers/pnrr-worker-types'

const PnrrMapPreview = lazy(() =>
  import('../PnrrMapPreview').then((module) => ({
    default: module.PnrrMapPreview,
  })),
)

const PnrrProgressHistogram = lazy(() =>
  import('../charts/PnrrProgressHistogram').then((module) => ({
    default: module.PnrrProgressHistogram,
  })),
)

export type PnrrOverviewMetricStats = Pick<
  PnrrAggregates,
  | 'rawTotalValue'
  | 'deduplicatedTotalValue'
  | 'projectCount'
  | 'projectRecordCount'
  | 'completedCount'
  | 'completedValue'
  | 'loanTotal'
  | 'loanPercent'
  | 'missingFinProgressCount'
  | 'missingFinProgressPercent'
>

export function PnrrOverview({
  aggregates,
  filterState,
  cachedStats,
  isLoadingFullData = false,
  overview = null,
  officialAllocatedTotalEur = null,
}: {
  readonly aggregates: PnrrAggregates
  readonly filterState: ReturnType<typeof usePnrrFilterState>
  readonly cachedStats?: PnrrOverviewMetricStats | null
  readonly isLoadingFullData?: boolean
  readonly overview?: PnrrWorkerOverviewModel | null
  readonly officialAllocatedTotalEur?: number | null
}) {
  const currency = usePnrrCurrency()
  const isShowingCachedStats = isLoadingFullData && cachedStats != null
  const metricStats = isShowingCachedStats ? cachedStats : aggregates
  const absorptionRate =
    metricStats.rawTotalValue > 0
      ? (metricStats.completedValue / metricStats.rawTotalValue) * 100
      : 0
  const hasScopedFilters = hasPnrrDataFilters(filterState.search)
  const isUsingOfficialAllocation =
    !hasScopedFilters &&
    typeof officialAllocatedTotalEur === 'number' &&
    officialAllocatedTotalEur > 0
  const headlineTotalValue = isUsingOfficialAllocation
    ? officialAllocatedTotalEur
    : metricStats.rawTotalValue

  const selectedProjectId =
    filterState.search.panel === 'project'
      ? filterState.search.panelProjectId
      : null
  const { data: selectedProjectResult } = usePnrrProjectDetail(selectedProjectId)
  const selectedProject = selectedProjectResult?.project ?? null

  const componentItems = useMemo(
    () =>
      (overview?.topComponents ?? []).map((c) => ({
        id: c.id,
        label: c.label,
        prefix: c.prefix,
        value: formatPnrrCurrency(c.valueEur, currency),
        pct: c.pct,
        count: c.count,
        color: c.color,
      })),
    [currency, overview?.topComponents],
  )

  const countyItems = useMemo(
    () =>
      (overview?.topCounties ?? []).map((c) => ({
        id: c.id,
        label: c.label,
        value: formatPnrrCurrency(c.valueEur, currency),
        pct: c.pct,
        count: c.count,
      })),
    [currency, overview?.topCounties],
  )

  const hasOfficialPaymentData = (overview?.topBeneficiaries ?? []).some(
    (item) => typeof item.secondaryValueEur === 'number',
  )

  const beneficiaryItems = useMemo(
    () =>
      (overview?.topBeneficiaries ?? []).map((beneficiary) => ({
        id: beneficiary.id,
        itemKey: beneficiary.itemKey ?? beneficiary.id,
        label: beneficiary.label,
        value: formatPnrrCurrency(beneficiary.valueEur, currency),
        count: beneficiary.count,
        pct: beneficiary.pct,
        secondaryValue:
          typeof beneficiary.secondaryValueEur === 'number'
            ? formatPnrrCurrency(beneficiary.secondaryValueEur, currency)
            : undefined,
      })),
    [currency, overview?.topBeneficiaries],
  )

  const handleComponentClick = useCallback(
    (id: string) => {
      filterState.setComponents([id])
      filterState.setView('projects')
    },
    [filterState],
  )

  const handleCountyClick = useCallback(
    (id: string) => {
      filterState.setCounties([id])
      filterState.setView('projects')
    },
    [filterState],
  )

  const handleBeneficiaryClick = useCallback(
    (id: string) => {
      filterState.setSearch(id)
      filterState.setView('projects')
    },
    [filterState],
  )

  const handleCtaNavigation = useCallback(
    (nextView: 'projects' | 'anomalies') => {
      filterState.setView(nextView)
      window.requestAnimationFrame(() => {
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
      })
    },
    [filterState],
  )

  return (
    <div className="space-y-10">
      {/* Key Metrics */}
      <section>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <InsightCard
            label={
              isUsingOfficialAllocation
                ? t`Total PNRR allocation`
                : t`Listed project value`
            }
            value={formatPnrrCurrency(headlineTotalValue, currency)}
            valueParts={formatPnrrCompactCurrencyDisplayParts(headlineTotalValue, currency)}
            sublabel={
              isUsingOfficialAllocation
                ? t`${formatPnrrCurrency(metricStats.rawTotalValue, currency)} listed value in ${formatNumber(metricStats.projectRecordCount)} records`
                : t`${formatNumber(metricStats.projectRecordCount)} records in the official dataset`
            }
          />

          <InsightCard
            label={t`Share of value of projects marked as completed`}
            value={`${formatNumber(absorptionRate)}%`}
            sublabel={t`${formatNumber(metricStats.completedCount)} projects marked as completed from ${formatNumber(metricStats.projectCount)}`}
            progress={absorptionRate}
          />

          <InsightCard
            label={t`Funding from the loan component`}
            value={formatPnrrCurrency(metricStats.loanTotal, currency)}
            valueParts={formatPnrrCompactCurrencyDisplayParts(metricStats.loanTotal, currency)}
            sublabel={t`${formatNumber(metricStats.loanPercent)}% of listed project value`}
          />

          <InsightCard
            label={t`Financial data not published in dataset`}
            value={`${formatNumber(metricStats.missingFinProgressPercent)}%`}
            sublabel={t`${formatNumber(metricStats.missingFinProgressCount)} projects without published financial progress`}
          />
        </div>
      </section>

      {isShowingCachedStats ? (
        <>
          <PnrrFullDataLoadingStatus />
          <PnrrContentSkeleton hideMetricCards />
        </>
      ) : (
        <>

      {/* Two Column Layout: Components + Counties */}
      <section className="grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-2">
        <RankedListCard
          title={t`Top Components`}
          items={componentItems}
          onClick={handleComponentClick}
          expandable
          limit={5}
          expandLabel={t`Show all components`}
          collapseLabel={t`Show less`}
          infoTooltip={t`The percentage shows the share of listed project value from the component in the displayed project value. It is not the official PNRR allocation. Click on a row to filter.`}
        />

        <RankedListCard
          title={t`Top counties: listed value`}
          items={countyItems}
          onClick={handleCountyClick}
          neutral
          expandable
          limit={5}
          expandLabel={t`Show all counties`}
          collapseLabel={t`Show less`}
          infoTooltip={t`The percentage shows the share of listed project value from the county in the displayed project value. National projects can distort local comparisons.`}
        />
      </section>

      {/* Map + Projects Preview */}
      <DeferredOverviewSection
        className="grid min-w-0 grid-cols-1 items-stretch gap-6 lg:grid-cols-5"
        minHeight={520}
      >
        <div className="flex min-w-0 flex-col lg:col-span-3">
          <Suspense fallback={<PnrrDeferredCardFallback minHeight={420} />}>
            {overview && (
              <PnrrMapPreview model={overview.mapPreview} filterState={filterState} />
            )}
          </Suspense>
        </div>
        <div className="flex min-w-0 flex-col lg:col-span-2">
          {overview && (
            <PnrrProjectsPreview
              projects={overview.projectPreviewRows}
              projectCount={aggregates.projectCount}
              filterState={filterState}
            />
          )}
        </div>
      </DeferredOverviewSection>

      {/* Top 10 Beneficiaries */}
      <section>
        <BeneficiaryValueCard
          title={
            hasOfficialPaymentData
              ? t`Top beneficiaries by reported amounts received (Top 100)`
              : t`Top beneficiaries by listed project value (Top 100)`
          }
          items={beneficiaryItems}
          onClick={handleBeneficiaryClick}
          primaryValueLabel={hasOfficialPaymentData ? t`received` : undefined}
          secondaryValueLabel={
            hasOfficialPaymentData ? t`Listed budget` : undefined
          }
        />
      </section>

      {/* Financing Source + Progress Difference */}
      <DeferredOverviewSection
        className="grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-2"
        minHeight={380}
      >
        <Suspense fallback={<PnrrDeferredCardFallback minHeight={360} />}>
          {overview && <PnrrProgressHistogram model={overview.histogram} />}
        </Suspense>
        <PnrrFundingBar aggregates={aggregates} />
      </DeferredOverviewSection>

      {/* Emblematic Projects */}
      <section className="space-y-6">
        <div className="flex items-center gap-4">
          <span className="h-12 w-1.5 bg-[var(--pnrr-blue)]" />
          <h2 className="text-2xl font-black uppercase tracking-tight text-[var(--pnrr-fg)] md:text-3xl">
            <Trans>Emblematic Projects</Trans>
          </h2>
        </div>

        <PnrrEmblematicProjects
          projects={overview?.emblematicProjectRows ?? []}
          onProjectClick={(project) => filterState.openProjectPanel(project.id)}
        />

        <div className="flex flex-wrap gap-8">
          <CtaLink
            label={t`All projects`}
            onClick={() => handleCtaNavigation('projects')}
          />

          <CtaLink
            label={t`Risk signals`}
            onClick={() => handleCtaNavigation('anomalies')}
          />
        </div>
      </section>

      <PnrrProjectDrawer
        project={selectedProject}
        onClose={filterState.closePanel}
      />
        </>
      )}
    </div>
  )
}

function DeferredOverviewSection({
  children,
  className,
  minHeight,
}: {
  readonly children: ReactNode
  readonly className: string
  readonly minHeight: number
}) {
  const containerRef = useRef<HTMLElement | null>(null)
  const [shouldRender, setShouldRender] = useState(() => typeof window === 'undefined')

  useEffect(() => {
    if (shouldRender) return

    if (!('IntersectionObserver' in window)) {
      setShouldRender(true)
      return
    }

    let observer: IntersectionObserver
    try {
      observer = new IntersectionObserver(
        (entries) => {
          if (entries.some((entry) => entry.isIntersecting)) {
            setShouldRender(true)
            observer.disconnect()
          }
        },
        { rootMargin: '160px 0px' },
      )
    } catch {
      setShouldRender(true)
      return
    }

    const container = containerRef.current
    if (container) {
      observer.observe(container)
    }

    return () => observer.disconnect()
  }, [shouldRender])

  return (
    <section
      ref={containerRef}
      className={className}
      style={shouldRender ? undefined : { minHeight }}
    >
      {shouldRender ? children : null}
    </section>
  )
}

function PnrrDeferredCardFallback({
  minHeight,
}: {
  readonly minHeight: number
}) {
  return (
    <div
      aria-hidden="true"
      className="border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-card)]"
      style={{ minHeight }}
    />
  )
}

function PnrrFullDataLoadingStatus() {
  return (
    <section
      role="status"
      aria-live="polite"
      className="border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-card)] p-4 sm:p-5"
    >
      <p className="text-xs font-black uppercase tracking-widest text-[var(--pnrr-muted)]">
        <Trans>
          Loading the full PNRR dataset for maps, charts, and project lists.
        </Trans>
      </p>
      <div className="mt-3 h-2 overflow-hidden border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-bg)]">
        <div className="h-full w-2/3 animate-pulse bg-[var(--pnrr-fg)]" />
      </div>
    </section>
  )
}

function BeneficiaryValueCard({
  title,
  items,
  onClick,
  primaryValueLabel,
  secondaryValueLabel,
}: {
  readonly title: string
  readonly items: readonly {
    readonly id: string
    readonly itemKey: string
    readonly label: string
    readonly value: string
    readonly count: number
    readonly pct: number
    readonly secondaryValue?: string
  }[]
  readonly onClick: (id: string) => void
  readonly primaryValueLabel?: string
  readonly secondaryValueLabel?: string
}) {
  const [isExpanded, setIsExpanded] = useState(false)
  const displayItems = isExpanded ? items : items.slice(0, 10)
  const hasMore = items.length > 10

  if (items.length === 0) return null

  return (
    <div
      className="flex max-w-full flex-col overflow-hidden border-2 border-[var(--pnrr-border)]"
      style={{ backgroundColor: 'var(--pnrr-card)' }}
    >
      <div className="flex min-h-14 items-center border-b-2 border-[var(--pnrr-border)] px-5 py-4">
        <div className="min-w-0">
          <h3 className="text-base font-semibold leading-none text-[var(--pnrr-fg)]">
            {title}
          </h3>
        </div>
      </div>

      <div
        className={cn(
          'divide-y divide-[var(--pnrr-border)]/20',
          isExpanded && 'sm:max-h-[620px] sm:overflow-y-auto sm:scrollbar-thin',
        )}
      >
        {displayItems.map((item, index) => (
          <button
            key={item.itemKey}
            type="button"
            onClick={() => onClick(item.id)}
            className="group relative grid w-full grid-cols-[40px_minmax(0,1fr)] gap-x-3 gap-y-1.5 px-5 py-3 text-left transition-colors hover:bg-[var(--pnrr-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pnrr-green)]/60 focus-visible:ring-inset sm:grid-cols-[40px_minmax(0,1fr)_minmax(210px,auto)] sm:items-center"
          >
            <div
              className="absolute inset-y-0 left-0 bg-[rgba(111,111,111,0.06)] transition-all"
              style={{ width: `${Math.min(item.pct * 2.5, 100)}%` }}
              aria-hidden="true"
            />

            <span className="relative z-10 flex h-7 w-7 items-center justify-center bg-[var(--pnrr-subtle)] text-xs font-semibold tabular-nums text-[var(--pnrr-muted)]">
              {index + 1}
            </span>
            <span className="relative z-10 min-w-0 truncate text-base font-semibold leading-snug text-[var(--pnrr-fg)]">
              {item.label}
            </span>
            <div className="relative z-10 col-start-2 min-w-0 text-left sm:col-start-auto sm:text-right">
              <span
                className="block whitespace-nowrap text-base font-semibold tabular-nums text-[var(--pnrr-fg)] sm:text-lg"
                aria-label={
                  primaryValueLabel
                    ? `${primaryValueLabel}: ${item.value}`
                    : item.value
                }
              >
                {item.value}
              </span>
              {item.secondaryValue && secondaryValueLabel ? (
                <span className="mt-1 block text-xs font-semibold tabular-nums text-[var(--pnrr-muted)]">
                  <span className="whitespace-nowrap">
                    {secondaryValueLabel} {item.secondaryValue}
                  </span>
                  {item.count > 0 && (
                    <>
                      <span className="mx-1.5 text-[var(--pnrr-muted)]/70">
                        ·
                      </span>
                      <span className="whitespace-nowrap">
                        {formatNumber(item.count)} <Trans>projects</Trans>
                      </span>
                    </>
                  )}
                </span>
              ) : item.count > 0 ? (
                <span className="mt-1 block whitespace-nowrap text-xs font-semibold tabular-nums text-[var(--pnrr-muted)]">
                  {formatNumber(item.count)} <Trans>projects</Trans>
                </span>
              ) : (
                null
              )}
            </div>
          </button>
        ))}
      </div>

      {hasMore && (
        <div className="mt-auto border-t-2 border-[var(--pnrr-border)]">
          <button
            type="button"
            onClick={() => setIsExpanded((value) => !value)}
            className="flex min-h-10 w-full items-center justify-center gap-2 px-5 py-2 text-sm font-semibold text-[var(--pnrr-muted)] transition-colors hover:bg-[var(--pnrr-hover)] hover:text-[var(--pnrr-fg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pnrr-green)]/60 focus-visible:ring-inset"
          >
            {isExpanded ? <Trans>Show less</Trans> : <Trans>Show all</Trans>}
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>
        </div>
      )}
    </div>
  )
}

/* ──────────────────────────────────────────────────────────────── */
/*  RankedListCard – compact leaderboard with background-fill bar   */
/* ──────────────────────────────────────────────────────────────── */

function RankedListCard({
  title,
  items,
  onClick,
  neutral = false,
  expandable = false,
  limit = 5,
  expandLabel,
  collapseLabel,
  infoTooltip,
  headerAction,
}: {
  readonly title: string
  readonly items: readonly {
    readonly id: string
    readonly itemKey?: string
    readonly label: string
    readonly prefix?: string
    readonly value: string
    readonly pct: number
    readonly count: number
    readonly color?: string
  }[]
  readonly onClick: (id: string) => void
  readonly neutral?: boolean
  readonly expandable?: boolean
  readonly limit?: number
  readonly expandLabel?: string
  readonly collapseLabel?: string
  readonly infoTooltip?: string
  readonly headerAction?: ReactNode
}) {
  const [isExpanded, setIsExpanded] = useState(false)
  const displayItems = expandable && !isExpanded ? items.slice(0, limit) : items
  const hasMore = expandable && items.length > limit

  return (
    <div
      className="flex h-full max-w-full flex-col overflow-hidden border-2 border-[var(--pnrr-border)]"
      style={{ backgroundColor: 'var(--pnrr-card)' }}
    >
      {/* Header */}
      <div className="flex min-h-14 flex-col gap-3 border-b-2 border-[var(--pnrr-border)] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-base font-semibold leading-none text-[var(--pnrr-fg)]">
          {title}
        </h3>
        {(headerAction || infoTooltip) && (
          <div className="flex w-full items-center justify-end gap-2 sm:w-auto">
            {headerAction}
            {infoTooltip && (
              <TooltipProvider delayDuration={200}>
                <ShadcnTooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className="inline-flex h-7 w-7 shrink-0 items-center justify-center text-[var(--pnrr-muted)] transition-colors hover:text-[var(--pnrr-fg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pnrr-green)]/60"
                      aria-label={t`Information`}
                    >
                      <Info className="h-4 w-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent
                    side="top"
                    align="end"
                    className="max-w-[280px] bg-[var(--pnrr-card)] text-[var(--pnrr-fg)] border-2 border-[var(--pnrr-border)]"
                  >
                    <p className="text-xs leading-relaxed">{infoTooltip}</p>
                  </TooltipContent>
                </ShadcnTooltip>
              </TooltipProvider>
            )}
          </div>
        )}
      </div>

      {/* Rows */}
      <div
        className={cn(
          'divide-y divide-[var(--pnrr-border)]/20',
          expandable &&
            isExpanded &&
            'sm:max-h-[372px] sm:overflow-y-auto sm:scrollbar-thin',
        )}
      >
        {displayItems.map((item, i) => (
          <button
            key={item.itemKey ?? item.id}
            onClick={() => onClick(item.id)}
            className={cn(
              'group relative grid w-full gap-x-3 gap-y-1.5 px-5 py-3 text-left transition-colors hover:bg-[var(--pnrr-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pnrr-green)]/60 focus-visible:ring-inset sm:items-center',
              neutral
                ? 'grid-cols-[40px_minmax(0,1fr)] sm:grid-cols-[40px_minmax(0,1fr)_minmax(110px,auto)_minmax(140px,auto)]'
                : 'grid-cols-[72px_minmax(0,1fr)] sm:grid-cols-[88px_minmax(0,1fr)_minmax(110px,auto)_minmax(140px,auto)]',
            )}
          >
            {/* Background proportion fill */}
            <div
              className="absolute inset-y-0 left-0 transition-all"
              style={{
                width: `${Math.min(item.pct * 2.5, 100)}%`,
                backgroundColor: neutral
                  ? 'rgba(111,111,111,0.06)'
                  : `${item.color}12`,
              }}
              aria-hidden="true"
            />

            {/* Rank + prefix */}
            <div
              className={cn(
                'relative z-10 flex shrink-0 items-center gap-1.5',
                neutral ? 'w-10' : 'w-[72px] sm:w-[88px]',
              )}
            >
              <span className="flex h-7 w-7 items-center justify-center bg-[var(--pnrr-subtle)] text-xs font-semibold tabular-nums text-[var(--pnrr-muted)]">
                {i + 1}
              </span>
              {item.prefix && item.color && (
                <span
                  className="flex h-7 shrink-0 items-center border bg-[var(--pnrr-card)] px-2 text-xs font-semibold tabular-nums"
                  style={{
                    borderColor: item.color + '45',
                    color: item.color,
                  }}
                >
                  {item.prefix}
                </span>
              )}
            </div>

            {/* Label */}
            {neutral ? (
              <span className="relative z-10 min-w-0 truncate text-base font-semibold leading-snug text-[var(--pnrr-fg)]">
                {item.label}
              </span>
            ) : (
              <TooltipProvider delayDuration={200}>
                <ShadcnTooltip>
                  <TooltipTrigger asChild>
                    <span className="relative z-10 min-w-0 truncate text-base font-semibold leading-snug text-[var(--pnrr-fg)]">
                      {item.label}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent
                    side="top"
                    align="start"
                    className="max-w-[280px] border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-card)] text-[var(--pnrr-fg)]"
                  >
                    <p className="text-xs font-semibold leading-relaxed">
                      {item.label}
                    </p>
                  </TooltipContent>
                </ShadcnTooltip>
              </TooltipProvider>
            )}

            {/* Count + Pct — right-aligned, before value */}
            <div className="relative z-10 col-start-2 flex min-w-0 items-baseline gap-2 text-left sm:col-start-auto sm:flex-col sm:items-end sm:gap-0 sm:text-right">
              <span className="whitespace-nowrap text-sm font-medium text-[var(--pnrr-muted)]">
                {formatNumber(item.count)} <Trans>projects</Trans>
              </span>
              <span
                className={cn(
                  'text-xs font-semibold tabular-nums',
                  neutral
                    ? 'text-[var(--pnrr-muted)]'
                    : 'text-[var(--pnrr-fg)]/90',
                )}
              >
                {formatNumber(item.pct)}%
              </span>
            </div>

            {/* Value — rightmost */}
            <span className="relative z-10 col-start-2 text-left text-base font-semibold tabular-nums text-[var(--pnrr-fg)] sm:col-start-auto sm:text-right sm:text-lg">
              {item.value}
            </span>
          </button>
        ))}
      </div>

      {/* Expand / Collapse footer */}
      {hasMore && (
        <div
          className="mt-auto border-t-2 border-[var(--pnrr-border)]"
          style={{ backgroundColor: 'var(--pnrr-card)' }}
        >
          <button
            type="button"
            onClick={() => setIsExpanded((v) => !v)}
            className="flex min-h-10 w-full items-center justify-center gap-2 px-5 py-2 text-sm font-semibold text-[var(--pnrr-muted)] transition-colors hover:bg-[var(--pnrr-hover)] hover:text-[var(--pnrr-fg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pnrr-green)]/60 focus-visible:ring-inset"
          >
            {isExpanded ? (
              <>
                {collapseLabel ?? t`Show less`}
                <ChevronUp className="h-3.5 w-3.5" />
              </>
            ) : (
              <>
                {expandLabel ?? t`Show all`}
                <ChevronDown className="h-3.5 w-3.5" />
              </>
            )}
          </button>
        </div>
      )}
    </div>
  )
}

/* ──────────────────────────────────────────────────────────────── */
/*  InsightCard – clean, minimal, no colored accents               */
/* ──────────────────────────────────────────────────────────────── */

function InsightCard({
  label,
  value,
  valueParts,
  sublabel,
  progress,
}: {
  readonly label: string
  readonly value: string
  readonly valueParts?: {
    readonly amount: string
    readonly unit: string | null
  }
  readonly sublabel: string
  readonly progress?: number
}) {
  const formattedValue = valueParts ?? { amount: value, unit: null }

  return (
    <div
      className="min-w-0 overflow-hidden border-2 border-[var(--pnrr-border)] p-5"
      style={{ backgroundColor: 'var(--pnrr-card)' }}
    >
      <div className="min-w-0 space-y-4">
        <p className="text-xs font-bold uppercase tracking-widest text-[var(--pnrr-muted)]">
          {label}
        </p>
        <p className="max-w-full text-4xl font-black leading-none tracking-tight text-[var(--pnrr-fg)] lg:text-[2.75rem]">
          <span>{formattedValue.amount}</span>
          {formattedValue.unit ? (
            <>
              {' '}
              <span className="inline-block whitespace-nowrap">
                {formattedValue.unit}
              </span>
            </>
          ) : null}
        </p>
        {progress !== undefined && (
          <div className="w-full max-w-[200px]">
            <div className="h-2 w-full bg-[var(--pnrr-track)]">
              <div
                className="h-full bg-[var(--pnrr-fg)] transition-all"
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>
          </div>
        )}
        <p className="break-words text-sm leading-relaxed text-[var(--pnrr-muted)]">
          {sublabel}
        </p>
      </div>
    </div>
  )
}

/* ──────────────────────────────────────────────────────────────── */
/*  CtaLink – minimal text-only navigation                         */
/* ──────────────────────────────────────────────────────────────── */

function CtaLink({
  label,
  onClick,
}: {
  readonly label: string
  readonly onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="group inline-flex items-center gap-4 border-b-2 border-[var(--pnrr-border)] pb-1 text-sm font-black uppercase tracking-wide text-[var(--pnrr-fg)] transition-colors hover:border-[var(--pnrr-blue)] hover:text-[var(--pnrr-blue)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pnrr-blue)]"
    >
      {label}
      <span className="transition-transform group-hover:translate-x-1">→</span>
    </button>
  )
}
