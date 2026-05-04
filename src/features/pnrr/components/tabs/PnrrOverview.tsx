import { useMemo, useState, useCallback, type ReactNode } from 'react'
import { Trans } from '@lingui/react/macro'
import { t } from '@lingui/core/macro'
import { formatNumber, cn } from '@/lib/utils'
import { usePnrrCurrency } from '../../lib/usePnrrCurrency'
import { formatPnrrCurrency } from '../../lib/formatting'
import { formatPnrrCompactCurrencyDisplayParts } from '../pnrr-compact-currency-display'
import type { PnrrProject, PnrrAggregates } from '@/schemas/pnrr'
import type { usePnrrFilterState } from '../../hooks/usePnrrFilterState'
import { PNRR_COMPONENTS } from '../../data/component-definitions'
import { PnrrEmblematicProjects } from '../PnrrEmblematicProjects'
import { PnrrProjectDrawer } from '../table/PnrrProjectDrawer'
import { PnrrMapPreview } from '../PnrrMapPreview'
import { PnrrProjectsPreview } from '../PnrrProjectsPreview'
import { PnrrContentSkeleton } from '../PnrrSkeleton'
import { PnrrProgressHistogram } from '../charts/PnrrProgressHistogram'
import { PnrrFundingBar } from '../charts/PnrrFundingBar'
import { ChevronDown, ChevronUp, Info } from 'lucide-react'
import {
  Tooltip as ShadcnTooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

export type PnrrOverviewMetricStats = Pick<
  PnrrAggregates,
  | 'rawTotalValue'
  | 'deduplicatedTotalValue'
  | 'rawProjectCount'
  | 'completedCount'
  | 'completedValue'
  | 'loanTotal'
  | 'loanPercent'
  | 'missingFinProgressCount'
  | 'missingFinProgressPercent'
>

export function PnrrOverview({
  projects,
  aggregates,
  filterState,
  cachedStats,
  isLoadingFullData = false,
}: {
  readonly projects: readonly PnrrProject[]
  readonly aggregates: PnrrAggregates
  readonly filterState: ReturnType<typeof usePnrrFilterState>
  readonly cachedStats?: PnrrOverviewMetricStats | null
  readonly isLoadingFullData?: boolean
}) {
  const currency = usePnrrCurrency()
  const isShowingCachedStats = isLoadingFullData && cachedStats != null
  const metricStats = isShowingCachedStats ? cachedStats : aggregates
  const absorptionRate =
    metricStats.rawTotalValue > 0
      ? (metricStats.completedValue / metricStats.rawTotalValue) * 100
      : 0

  const topComponents = useMemo(
    () =>
      Object.entries(aggregates.componentStats)
        .map(([code, stats]) => ({
          code,
          name: PNRR_COMPONENTS[code]?.nameRo ?? code,
          prefix: PNRR_COMPONENTS[code]?.code ?? code,
          color: PNRR_COMPONENTS[code]?.color ?? '#94a3b8',
          value: stats.value,
          count: stats.count,
        }))
        .sort((a, b) => b.value - a.value),
    [aggregates.componentStats],
  )

  const topCounties = useMemo(
    () =>
      Object.entries(aggregates.countyStats)
        .map(([county, stats]) => ({
          county,
          value: stats.value,
          count: stats.count,
        }))
        .sort((a, b) => b.value - a.value),
    [aggregates.countyStats],
  )

  const selectedProject = useMemo(() => {
    if (
      filterState.search.panel !== 'project' ||
      !filterState.search.panelProjectId
    ) {
      return null
    }

    return (
      projects.find(
        (project) => project.id === filterState.search.panelProjectId,
      ) ?? null
    )
  }, [filterState.search.panel, filterState.search.panelProjectId, projects])

  const componentItems = useMemo(
    () =>
      topComponents.map((c) => ({
        id: c.code,
        label: c.name,
        prefix: c.prefix,
        value: formatPnrrCurrency(c.value, currency),
        pct: (c.value / aggregates.rawTotalValue) * 100,
        count: c.count,
        color: c.color,
      })),
    [topComponents, aggregates.rawTotalValue, currency],
  )

  const countyItems = useMemo(
    () =>
      topCounties.map((c) => ({
        id: c.county,
        label: c.county,
        value: formatPnrrCurrency(c.value, currency),
        pct: (c.value / aggregates.rawTotalValue) * 100,
        count: c.count,
      })),
    [topCounties, aggregates.rawTotalValue, currency],
  )

  const beneficiaryItems = useMemo(
    () =>
      aggregates.topBeneficiaries.slice(0, 10).map((b) => ({
        id: b.beneficiary,
        itemKey: `${b.beneficiary}\u0000${b.cui ?? ''}`,
        label: b.beneficiary,
        value: formatPnrrCurrency(b.value, currency),
        pct: (b.value / aggregates.rawTotalValue) * 100,
        count: b.count,
      })),
    [aggregates.topBeneficiaries, aggregates.rawTotalValue, currency],
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
            label={t`Valoarea proiectelor listate`}
            value={formatPnrrCurrency(metricStats.rawTotalValue, currency)}
            valueParts={formatPnrrCompactCurrencyDisplayParts(metricStats.rawTotalValue, currency)}
            sublabel={t`${formatPnrrCurrency(metricStats.deduplicatedTotalValue, currency, 'standard')} estimat după eliminarea posibilelor duplicate`}
          />

          <InsightCard
            label={t`Ponderea valorii proiectelor marcate finalizate`}
            value={`${formatNumber(absorptionRate)}%`}
            sublabel={t`${formatNumber(metricStats.completedCount)} proiecte marcate finalizate din ${formatNumber(metricStats.rawProjectCount)}`}
            progress={absorptionRate}
          />

          <InsightCard
            label={t`Finanțare din componenta de împrumut`}
            value={formatPnrrCurrency(metricStats.loanTotal, currency)}
            valueParts={formatPnrrCompactCurrencyDisplayParts(metricStats.loanTotal, currency)}
            sublabel={t`${formatNumber(metricStats.loanPercent)}% din valoarea proiectelor listate`}
          />

          <InsightCard
            label={t`Date financiare nepublicate în set`}
            value={`${formatNumber(metricStats.missingFinProgressPercent)}%`}
            sublabel={t`${formatNumber(metricStats.missingFinProgressCount)} proiecte fără progres financiar publicat`}
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
          infoTooltip={t`Procentul arată ponderea valorii proiectelor listate din componentă în valoarea proiectelor afișate. Nu este alocarea oficială PNRR. Click pe un rând pentru filtrare.`}
        />

        <RankedListCard
          title={t`Top Counties`}
          items={countyItems}
          onClick={handleCountyClick}
          neutral
          expandable
          limit={5}
          expandLabel={t`Show all counties`}
          collapseLabel={t`Show less`}
          infoTooltip={t`Procentul arată ponderea valorii proiectelor listate din județ în valoarea proiectelor afișate. Proiectele naționale pot distorsiona comparațiile locale.`}
        />
      </section>

      {/* Map + Projects Preview */}
      <section className="grid min-w-0 grid-cols-1 items-stretch gap-6 lg:grid-cols-5">
        <div className="flex min-w-0 flex-col lg:col-span-3">
          <PnrrMapPreview projects={projects} filterState={filterState} />
        </div>
        <div className="flex min-w-0 flex-col lg:col-span-2">
          <PnrrProjectsPreview projects={projects} filterState={filterState} />
        </div>
      </section>

      {/* Top 10 Beneficiaries */}
      <section>
        <RankedListCard
          title={t`Top 10 Beneficiaries`}
          items={beneficiaryItems}
          onClick={handleBeneficiaryClick}
          neutral
        />
      </section>

      {/* Financing Source + Progress Difference */}
      <section className="grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-2">
        <PnrrProgressHistogram projects={projects} />
        <PnrrFundingBar aggregates={aggregates} />
      </section>

      {/* Emblematic Projects */}
      <section className="space-y-6">
        <div className="flex items-center gap-4">
          <span className="h-12 w-1.5 bg-[var(--pnrr-blue)]" />
          <h2 className="text-2xl font-black uppercase tracking-tight text-[var(--pnrr-fg)] md:text-3xl">
            <Trans>Emblematic Projects</Trans>
          </h2>
        </div>

        <PnrrEmblematicProjects
          projects={projects}
          onProjectClick={(project) => filterState.openProjectPanel(project.id)}
        />

        <div className="flex flex-wrap gap-8">
          <CtaLink
            label={t`All projects`}
            onClick={() => handleCtaNavigation('projects')}
          />

          <CtaLink
            label={t`Semnale de risc`}
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
