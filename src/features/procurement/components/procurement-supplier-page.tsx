import { useMemo, useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { Trans } from '@lingui/react/macro'
import { t } from '@lingui/core/macro'
import { ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { ProcurementSliceScope } from '../api/procurement-api'
import { useProcurementSupplierSlice } from '../hooks/use-procurement-data'
import { formatRon } from '../lib/formatting'
import { procurementCompactActionClassName } from '../lib/procurement-theme'
import { ProcurementEntityHeader } from './procurement-entity-header'
import { ProcurementInfoSheet } from './procurement-info-sheet'
import {
  ProcurementPartyQuickFilters,
  type PartyQuickFilterState,
} from './procurement-party-quick-filters'
import {
  ProcurementPartyPopulations,
  type PartyPopulation,
} from './procurement-party-populations'
import { ProcurementSupplierSlice } from './procurement-supplier-slice'
import { ProcurementErrorState } from './procurement-error-state'
import { ProcurementDetailSkeleton } from './procurement-skeletons'
import type { FlowAnalysisGrain } from './procurement-analysis-grain-toggle'

type Props = {
  readonly cui: string
  /** Page quick filters from the URL (`year`, `cpv`) — defaults are all-time. */
  readonly filters?: PartyQuickFilterState
  readonly className?: string
}

/**
 * Dedicated supplier profile under `/procurement/suppliers/$cui` — the buyer
 * profile's spine on the supply side: one selected population that the header
 * money, the rankings, the breakdown and the record list all follow.
 *
 * The figures are public revenue from procurement, never company turnover;
 * the eyebrow and the money label say so where the number is.
 */
export function ProcurementSupplierPage({ cui, filters = {}, className }: Props) {
  const navigate = useNavigate()
  const [infoOpen, setInfoOpen] = useState(false)
  const [activeGrain, setActiveGrain] =
    useState<FlowAnalysisGrain>('contract')

  const scopeInput: ProcurementSliceScope = useMemo(
    () => ({
      ...(filters.year
        ? { monthFrom: `${filters.year}-01`, monthTo: `${filters.year}-12` }
        : {}),
      ...(filters.cpv ? { cpvDivision: filters.cpv } : {}),
    }),
    [filters.year, filters.cpv],
  )

  // The unfiltered slice feeds the title and the chip options, so they stay
  // stable while the filtered one drives the figures.
  const baseQuery = useProcurementSupplierSlice(cui)
  const query = useProcurementSupplierSlice(cui, scopeInput)
  const slice = query.data
  const base = baseQuery.data

  const title = base?.supplierName?.trim() || t`Furnizor CUI ${cui}`

  const analytics =
    activeGrain === 'contract'
      ? slice?.analysisByGrain.contract
      : slice?.analysisByGrain.directAcquisition

  const populations: readonly PartyPopulation<FlowAnalysisGrain>[] = slice
    ? [
        {
          grain: 'contract',
          label: t`Contracte`,
          recordCount: slice.summary.contractsCount,
        },
        {
          grain: 'direct_acquisition',
          label: t`Achiziții directe`,
          recordCount: slice.summary.directAcquisitionsCount,
        },
      ]
    : []

  const valueStat = analytics?.stats.valueAwardedSum
    ? {
        value: formatRon(analytics.stats.valueAwardedSum, 'compact'),
        label: t`venit public din achiziții`,
      }
    : null

  const quickFilters = base ? (
    <ProcurementPartyQuickFilters
      filters={filters}
      firstSeen={base.summary.firstSeen}
      lastSeen={base.summary.lastSeen}
      categories={base.analysisByGrain.contract.topCategories}
      advancedSearch={{
        view: 'list',
        supplier_cui: cui,
        ...(filters.year
          ? {
              dateFrom: `${filters.year}-01-01`,
              dateTo: `${filters.year}-12-31`,
            }
          : {}),
        ...(filters.cpv ? { cpv_division: filters.cpv } : {}),
      }}
    />
  ) : null

  const tabs =
    populations.length > 0 ? (
      <ProcurementPartyPopulations
        populations={populations}
        active={activeGrain}
        onSelect={setActiveGrain}
      />
    ) : null

  const compactTabs =
    populations.length > 0 ? (
      <ProcurementPartyPopulations
        compact
        populations={populations}
        active={activeGrain}
        onSelect={setActiveGrain}
      />
    ) : null

  return (
    <div className={cn('min-h-screen min-w-0 bg-background', className)}>
      <ProcurementEntityHeader
        cui={cui}
        title={title}
        eyebrow={<Trans>Furnizor al instituțiilor publice</Trans>}
        breadcrumb={
          <>
            <Link
              to="/procurement"
              className="underline underline-offset-2 hover:text-[var(--pnrr-fg)]"
            >
              <Trans>Achiziții publice</Trans>
            </Link>
            <ChevronRight className="h-3.5 w-3.5" aria-hidden />
            <Link
              to="/procurement"
              search={{ view: 'rankings', rank_dim: 'supplier' }}
              className="underline underline-offset-2 hover:text-[var(--pnrr-fg)]"
            >
              <Trans>Furnizori</Trans>
            </Link>
          </>
        }
        actions={
          <>
            <Button
              type="button"
              variant="outline"
              asChild
              className={procurementCompactActionClassName}
            >
              <Link to="/companies/$cui" params={{ cui }}>
                <Trans>Companie</Trans>
              </Link>
            </Button>
            <Button
              type="button"
              variant="outline"
              asChild
              className={procurementCompactActionClassName}
            >
              <Link to="/procurement" search={{ view: 'list', supplier_cui: cui }}>
                <Trans>Înregistrări</Trans>
              </Link>
            </Button>
          </>
        }
        firstSeen={base?.summary.firstSeen ?? null}
        lastSeen={base?.summary.lastSeen ?? null}
        valueStat={valueStat}
        filters={quickFilters}
        tabs={tabs}
        compactTabs={compactTabs}
        onOpenMethodology={() => setInfoOpen(true)}
      />

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        {query.isPending ? (
          <ProcurementDetailSkeleton />
        ) : query.isError && !slice ? (
          <ProcurementErrorState
            error={query.error}
            onRetry={() => void query.refetch()}
            isRetrying={query.isRefetching}
          />
        ) : (
          <ProcurementSupplierSlice
            supplierCui={cui}
            scope={scopeInput}
            analysis={{ grain: activeGrain }}
            categoryFilter={{
              activeCode: filters.cpv ?? null,
              onSelect: (code: string | null) =>
                void navigate({
                  to: '.',
                  search: (prev: PartyQuickFilterState) => ({
                    ...prev,
                    cpv: code ?? undefined,
                  }),
                }),
            }}
          />
        )}
      </main>

      <ProcurementInfoSheet open={infoOpen} onOpenChange={setInfoOpen} />
    </div>
  )
}
