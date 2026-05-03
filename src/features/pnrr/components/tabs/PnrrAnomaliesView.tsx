import { useState, useEffect } from 'react'
import { Trans } from '@lingui/react/macro'
import { t } from '@lingui/core/macro'
import { usePnrrCurrency } from '../../lib/usePnrrCurrency'
import { formatPnrrCurrency } from '../../lib/formatting'
import type {
  PnrrProject,
  PnrrAggregates,
  AnomalyType,
  DataQualitySignalType,
} from '@/schemas/pnrr'
import type { usePnrrFilterState } from '../../hooks/usePnrrFilterState'
import { PnrrAnomalyRibbon } from '../PnrrAnomalyRibbon'
import { PnrrAnomalyInfoPanel } from '../PnrrAnomalyInfoPanel'
import { PnrrQuickInvestigation } from '../PnrrQuickInvestigation'
import { PnrrProjectTable } from '../table/PnrrProjectTable'
import {
  BookOpen,
  AlertTriangle,
  Search,
  X,
  Database,
  ShieldAlert,
} from 'lucide-react'

const SEARCH_DEBOUNCE_MS = 300

type SelectedSignal =
  | { readonly kind: 'risk'; readonly type: AnomalyType }
  | { readonly kind: 'data-quality'; readonly type: DataQualitySignalType }

export function PnrrAnomaliesView({
  projects,
  aggregates,
  filterState,
}: {
  readonly projects: readonly PnrrProject[]
  readonly aggregates: PnrrAggregates
  readonly filterState: ReturnType<typeof usePnrrFilterState>
}) {
  const currency = usePnrrCurrency()
  const infoPanelOpen = filterState.search.panel === 'anomaly-info'
  const selectedSignal: SelectedSignal | undefined =
    filterState.search.panelSignalKind && filterState.search.panelSignalType
      ? {
          kind: filterState.search.panelSignalKind,
          type: filterState.search.panelSignalType as
            | AnomalyType
            | DataQualitySignalType,
        } as SelectedSignal
      : undefined

  const globalSearch = filterState.search.search ?? ''
  const [inputValue, setInputValue] = useState(globalSearch)

  // Sync input with global state when changed externally (e.g. clear filters)
  useEffect(() => {
    setInputValue(globalSearch)
  }, [globalSearch])

  // Debounce global state update so typing stays responsive
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (inputValue !== globalSearch) {
        filterState.setSearch(inputValue || undefined)
      }
    }, SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(timeout)
  }, [inputValue, globalSearch, filterState])

  const riskProjects = projects.filter((p) => p.anomalies.length > 0)
  const riskValue = riskProjects.reduce((sum, p) => sum + p.valueEur, 0)
  const dataQualityProjects = projects.filter(
    (p) => p.dataQualitySignals.length > 0,
  )
  const dataQualityValue = dataQualityProjects.reduce(
    (sum, p) => sum + p.valueEur,
    0,
  )

  const activeAnomalyTypes = filterState.search.anomalyTypes
  const activeDataQualitySignalTypes = filterState.search.dataQualitySignalTypes
  const hasRiskFilter = (activeAnomalyTypes?.length ?? 0) > 0
  const hasDataQualityFilter = (activeDataQualitySignalTypes?.length ?? 0) > 0
  const hasSignalFilter = hasRiskFilter || hasDataQualityFilter
  const displayedSignalProjects = projects.filter((p) => {
    if (!hasSignalFilter) {
      return p.anomalies.length > 0 || p.dataQualitySignals.length > 0
    }

    const matchesRisk =
      hasRiskFilter &&
      activeAnomalyTypes!.some((at) => p.anomalies.includes(at as AnomalyType))
    const matchesDataQuality =
      hasDataQualityFilter &&
      activeDataQualitySignalTypes!.some((type) =>
        p.dataQualitySignals.includes(type as DataQualitySignalType),
      )

    return matchesRisk || matchesDataQuality
  })

  const openInfoForType = (type: AnomalyType) => {
    filterState.openAnomalyInfoPanel({ kind: 'risk', type })
  }

  const openInfoForDataQualityType = (type: DataQualitySignalType) => {
    filterState.openAnomalyInfoPanel({ kind: 'data-quality', type })
  }

  return (
    <div className="space-y-4">
      <section className="border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-card)] px-5 py-5 sm:px-6">
        <div className="grid gap-6 lg:grid-cols-[minmax(360px,0.48fr)_2px_1fr] lg:items-center">
          <div>
            <h1 className="max-w-[520px] text-4xl font-black uppercase leading-[0.96] tracking-wide text-black sm:text-5xl">
              <span className="block max-w-[500px]">
                <Trans>Investigation Center</Trans>
              </span>
            </h1>
            <div className="mt-5 grid max-w-[460px] gap-2 text-base text-[var(--pnrr-fg)]">
              <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-sm bg-black text-white">
                  <ShieldAlert className="h-4 w-4" />
                </span>
                <span>
                  {riskProjects.length.toLocaleString('ro-RO')}{' '}
                  <Trans>projects with risks</Trans>
                </span>
                <span className="tabular-nums">
                  {formatPnrrCurrency(riskValue, currency, 'compact')}
                </span>
              </div>
              <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-sm bg-black text-white">
                  <Database className="h-4 w-4" />
                </span>
                <span>
                  {dataQualityProjects.length.toLocaleString('ro-RO')}{' '}
                  <Trans>data issues</Trans>
                </span>
                <span className="tabular-nums">
                  {formatPnrrCurrency(dataQualityValue, currency, 'compact')}
                </span>
              </div>
            </div>
          </div>

          <div className="hidden h-full min-h-[150px] bg-[var(--pnrr-border)] lg:block" />

          <div className="flex min-w-0 flex-col gap-5">
            <PnrrQuickInvestigation filterState={filterState} />
            <div className="flex justify-end">
              <button
                className="inline-flex h-10 items-center gap-3 border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-card)] px-4 text-sm font-black uppercase tracking-wide text-[var(--pnrr-fg)] transition-colors hover:bg-[var(--pnrr-fg)] hover:text-[var(--pnrr-bg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pnrr-blue)]"
                onClick={() => filterState.openAnomalyInfoPanel()}
              >
                <BookOpen className="h-5 w-5" />
                <Trans>Guide</Trans>
              </button>
            </div>
          </div>
        </div>
      </section>

      <PnrrAnomalyRibbon
        aggregates={aggregates}
        filterState={filterState}
        onInfoClick={openInfoForType}
        onDataQualityInfoClick={openInfoForDataQualityType}
      />

      {aggregates.missingFinProgressPercent > 0 && (
        <div className="flex items-center gap-3 border-2 border-[var(--pnrr-border)] bg-[#fff4e4] px-4 py-2.5">
          <AlertTriangle className="h-5 w-5 shrink-0 text-[#a43b13]" />
          <p className="text-sm font-black uppercase tracking-wide text-[#a43b13]">
            <Trans>
              {aggregates.missingFinProgressPercent.toFixed(0)}% of projects
              have no financial data. Risk signals based on financial progress
              may be underestimated.
            </Trans>
          </p>
        </div>
      )}

      {/* Investigation Table */}
      <section className="space-y-2">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Search */}
          <div className="relative w-full sm:max-w-[405px]">
            <Search className="absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-black" />
            <input
              type="text"
              placeholder={t`Search project...`}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="h-10 w-full border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-card)] px-12 py-2 text-sm text-[var(--pnrr-fg)] placeholder:text-[var(--pnrr-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pnrr-blue)]"
            />

            {inputValue && (
              <button
                type="button"
                onClick={() => filterState.setSearch(undefined)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--pnrr-muted)] transition-colors hover:text-[var(--pnrr-fg)]"
                aria-label={t`Clear search`}
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <span className="flex h-9 items-center border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-card)] px-6 text-sm text-[var(--pnrr-fg)]">
            {displayedSignalProjects.length.toLocaleString('ro-RO')}{' '}
            <Trans>results</Trans>
          </span>
        </div>
        <PnrrProjectTable
          projects={displayedSignalProjects}
          filterState={filterState}
        />
      </section>

      {/* Info side panel */}
      <PnrrAnomalyInfoPanel
        open={infoPanelOpen}
        onOpenChange={(open) => {
          if (open) {
            filterState.openAnomalyInfoPanel()
          } else {
            filterState.closePanel()
          }
        }}
        aggregates={aggregates}
        selectedSignal={selectedSignal}
      />
    </div>
  )
}
