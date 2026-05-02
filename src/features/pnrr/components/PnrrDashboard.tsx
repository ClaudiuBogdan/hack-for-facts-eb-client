import { useMemo, useState } from 'react'
import { Trans } from '@lingui/react/macro'
import { t } from '@lingui/core/macro'
import { usePnrrData } from '../hooks/usePnrrData'
import { usePnrrFilterState } from '../hooks/usePnrrFilterState'
import { filterProjects, computeAggregates, getActiveFilterCount, PNRR_LAST_UPDATED } from '../lib/data-transform'
import { PnrrCurrencyProvider } from '../lib/PnrrCurrencyProvider'
import { PROGRESS_CATEGORY_TO_STATUS, type ProgressCategoryKey } from '../lib/filter-constants'
import { PnrrContentSkeleton } from './PnrrSkeleton'
import { PnrrHeader } from './PnrrHeader'
import { PnrrOverview } from './tabs/PnrrOverview'
import { PnrrProjectsView } from './tabs/PnrrProjectsView'
import { PnrrAnomaliesView } from './tabs/PnrrAnomaliesView'
import { PnrrBeneficiariesView } from './tabs/PnrrBeneficiariesView'
import { PnrrMapView } from './PnrrMapView'
import { PnrrFilterSheet, PnrrFilterTriggerButton } from './filters/PnrrFilterSheet'
import { PnrrInfoSheet } from './filters/PnrrInfoSheet'
import { PnrrExportButton } from './table/PnrrExportButton'
import { Button } from '@/components/ui/button'
import { AlertTriangle, Info, RefreshCw } from 'lucide-react'

export function PnrrDashboard() {
  const { data, error, isError, isLoading, isRefetching, refetch } = usePnrrData()
  const filterState = usePnrrFilterState()
  const [filterSheetOpen, setFilterSheetOpen] = useState(false)
  const [infoSheetOpen, setInfoSheetOpen] = useState(false)

  const projects = useMemo(() => data?.projects ?? [], [data?.projects])
  const view = filterState.search.view ?? 'overview'

  const filteredProjects = useMemo(
    () =>
      filterProjects(projects, {
        search: filterState.search.search,
        beneficiarySearch: filterState.search.beneficiarySearch,
        beneficiaryCui: filterState.search.beneficiaryCui,
        uatSiruta: filterState.search.uatSiruta,
        uatSirutas: filterState.search.uatSirutas,
        components: filterState.search.components,
        counties: filterState.search.counties,
        fundingSources: filterState.search.fundingSources,
        measures: filterState.search.measures,
        cris: filterState.search.cris,
        progressCategories: filterState.search.progressCategories?.map(
          (c) => PROGRESS_CATEGORY_TO_STATUS[c as ProgressCategoryKey] ?? 'unknown'
        ),
        onlyAnomalies: filterState.search.onlyAnomalies,
        excludeMicro: filterState.search.excludeMicro,
        anomalyTypes: filterState.search.anomalyTypes,
        dataQualitySignalTypes: filterState.search.dataQualitySignalTypes,
        entityTypes: filterState.search.entityTypes,
        beneficiaryTypes: filterState.search.beneficiaryTypes,
        includeNational: filterState.search.includeNational,
      }),
    [projects,
      filterState.search.search,
      filterState.search.beneficiarySearch,
      filterState.search.beneficiaryCui,
      filterState.search.uatSiruta,
      filterState.search.uatSirutas,
      filterState.search.components,
      filterState.search.counties,
      filterState.search.fundingSources,
      filterState.search.measures,
      filterState.search.cris,
      filterState.search.progressCategories,
      filterState.search.onlyAnomalies,
      filterState.search.excludeMicro,
      filterState.search.anomalyTypes,
      filterState.search.dataQualitySignalTypes,
      filterState.search.entityTypes,
      filterState.search.beneficiaryTypes,
      filterState.search.includeNational,
    ]
  )

  // Compute aggregates from filtered projects so all tabs show consistent data
  const filteredAggregates = useMemo(
    () => computeAggregates(filteredProjects),
    [filteredProjects]
  )

  const loading = isLoading
  const loadError = isError && !data ? error : null

  return (
    <PnrrCurrencyProvider>
    <div className="min-h-screen min-w-0 max-w-full" style={{ backgroundColor: 'var(--pnrr-bg)' }}>
      <PnrrHeader
        projectsCount={filteredProjects.length}
        totalValue={filteredAggregates.rawTotalValue}
        view={view}
        onViewChange={filterState.setView}
        filterState={filterState}
        isLoading={loading}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 rounded-none border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-card)] text-[var(--pnrr-fg)] hover:bg-[var(--pnrr-fg)] hover:text-[var(--pnrr-bg)]"
              onClick={() => setInfoSheetOpen(true)}
              aria-label={t`Informații despre date`}
            >
              <Info className="h-5 w-5" />
            </Button>
            <PnrrFilterTriggerButton
              activeCount={getActiveFilterCount(filterState.search)}
              onClick={() => setFilterSheetOpen(true)}
            />
            <div className="hidden sm:block">
              <PnrrExportButton projects={filteredProjects} lastUpdated={PNRR_LAST_UPDATED} />
            </div>
          </div>
        }
      />

      {/* Tab Content */}
      <main className="mx-auto min-w-0 max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {loading ? (
          <PnrrContentSkeleton />
        ) : loadError ? (
          <PnrrDataErrorState
            error={loadError}
            isRetrying={isRefetching}
            onRetry={() => {
              void refetch()
            }}
          />
        ) : (
          <>
            {view === 'overview' && (
              <PnrrOverview
                projects={filteredProjects}
                aggregates={filteredAggregates}
                filterState={filterState}
              />
            )}
            {view === 'projects' && (
              <PnrrProjectsView
                projects={filteredProjects}
                filterState={filterState}
              />
            )}
            {view === 'map' && (
              <PnrrMapView
                projects={filteredProjects}
                filterState={filterState}
              />
            )}
            {view === 'beneficiaries' && (
              <PnrrBeneficiariesView
                projects={filteredProjects}
                filterState={filterState}
              />
            )}
            {view === 'anomalies' && (
              <PnrrAnomaliesView
                projects={filteredProjects}
                aggregates={filteredAggregates}
                filterState={filterState}
              />
            )}
          </>
        )}
      </main>

      {/* Data source disclaimer */}
      <footer className="border-t-2 border-[var(--pnrr-border)] py-6" style={{ backgroundColor: 'var(--pnrr-bg)' }}>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-[var(--pnrr-muted)]">
            <Trans>Data source</Trans>:{' '}
            <a
              href="https://mfe.gov.ro/pnrr-dashboard"
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-[var(--pnrr-fg)] underline underline-offset-4 hover:text-[var(--pnrr-muted)]"
            >
              <Trans>Ministerul Investițiilor și Proiectelor Europene</Trans>
            </a>
          </p>
        </div>
      </footer>

      <PnrrInfoSheet open={infoSheetOpen} onOpenChange={setInfoSheetOpen} />
      <PnrrFilterSheet
        open={filterSheetOpen}
        onOpenChange={setFilterSheetOpen}
        projects={projects}
        filterState={filterState}
        showTrigger={false}
      />
    </div>
    </PnrrCurrencyProvider>
  )
}

function PnrrDataErrorState({
  error,
  isRetrying,
  onRetry,
}: {
  readonly error: unknown
  readonly isRetrying: boolean
  readonly onRetry: () => void
}) {
  const errorMessage =
    error instanceof Error ? error.message : t`Eroare la încărcarea datelor`

  return (
    <section
      className="border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-card)] p-8"
      style={{ borderRadius: '6px' }}
    >
      <div className="mx-auto flex max-w-xl flex-col items-center text-center">
        <div className="border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-bg)] p-4">
          <AlertTriangle className="h-8 w-8 text-[var(--pnrr-orange)]" />
        </div>
        <h2 className="mt-4 text-xl font-black text-[var(--pnrr-fg)]">
          <Trans>Nu am putut încărca datele PNRR</Trans>
        </h2>
        <p className="mt-2 text-sm text-[var(--pnrr-muted)]">
          <Trans>Verifică conexiunea și încearcă din nou.</Trans>
        </p>
        <p className="mt-3 max-w-full break-words border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-bg)] px-3 py-2 text-xs text-[var(--pnrr-muted)]">
          {errorMessage}
        </p>
        <Button
          type="button"
          onClick={onRetry}
          disabled={isRetrying}
          className="mt-5 h-10 rounded-none border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-fg)] px-4 text-sm font-black uppercase tracking-wide text-[var(--pnrr-bg)] hover:bg-[var(--pnrr-card)] hover:text-[var(--pnrr-fg)]"
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${isRetrying ? 'animate-spin' : ''}`} />
          <Trans>Reîncearcă</Trans>
        </Button>
      </div>
    </section>
  )
}
