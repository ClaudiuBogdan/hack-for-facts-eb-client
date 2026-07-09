import { useState } from 'react'
import { Trans } from '@lingui/react/macro'
import { t } from '@lingui/core/macro'
import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { CoverageRibbonFromGate } from '@/components/shared/procurement-data/coverage-ribbon'
import { RequestDatasetAction } from '@/components/shared/procurement-data/request-dataset-action'
import { ShareFilteredView } from '@/components/shared/procurement-data/share-filtered-view'
import { procurementDataStatus } from '@/schemas/procurement'
import type { ProcurementSearchState } from '@/schemas/procurement-search'
import { useProcurementSearch } from '../hooks/use-procurement-data'
import { useProcurementFilterState } from '../hooks/use-procurement-filter-state'
import { isProcurementMock } from '../api/procurement-api'
import {
  buildProcurementSearchCsv,
  buildProcurementSearchFilename,
  downloadProcurementCsv,
} from '../lib/export'
import { grainLabelEn } from '../lib/enum-labels'
import { formatFlowCount } from '../lib/formatting'
import {
  procurementOutlineButtonClassName,
  procurementSectionClassName,
} from '../lib/procurement-theme'
import { PROCUREMENT_DATASET_ID } from '../lib/mock-mode'
import { ProcurementDebouncedSearchInput } from './procurement-debounced-search-input'
import {
  ProcurementActiveFilters,
  ProcurementFilterSheet,
  ProcurementFilterTriggerButton,
} from './procurement-filter-sheet'
import { ProcurementGrainTabs } from './procurement-grain-tabs'
import { ProcurementPagination } from './procurement-pagination'
import { ProcurementRecordList } from './procurement-record-card'
import { ProcurementSortSelect } from './procurement-sort-select'
import { ProcurementErrorState } from './procurement-error-state'
import { ProcurementSearchSkeleton } from './procurement-skeletons'

type Props = {
  readonly search: ProcurementSearchState
}

/** The search tab: grain tabs, query, filters, results, pagination. */
export function ProcurementSearchContent({ search }: Props) {
  const filters = useProcurementFilterState(search)
  const query = useProcurementSearch(search)
  const [sheetOpen, setSheetOpen] = useState(false)

  const page = query.data
  const gate = page?.gate
  const status = isProcurementMock()
    ? 'mock'
    : gate
      ? procurementDataStatus(gate)
      : 'unverified'
  const valueSortAllowed = gate?.spendRankingsAllowed ?? false

  const onExport = () => {
    if (!page) return
    const csv = buildProcurementSearchCsv(page.records, search)
    downloadProcurementCsv(
      csv,
      buildProcurementSearchFilename(search.grain, gate?.dataAsOf ?? null),
    )
  }

  return (
    <div className="space-y-5">
      <ProcurementGrainTabs grain={search.grain} onGrainChange={filters.setGrain} />

      {/* Auto-applies after a 300 ms debounce; the form only preserves the
          `search` role and Enter-to-commit-now, it never submits. */}
      <form role="search" onSubmit={(event) => event.preventDefault()}>
        <ProcurementDebouncedSearchInput
          value={search.q}
          onCommit={filters.setQuery}
          inputId="procurement-search-query"
          placeholder={t`Search by title, number, CUI or party name`}
          ariaLabel={t`Search procurement records`}
        />
      </form>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <ProcurementFilterTriggerButton
            activeCount={filters.activeCount}
            onClick={() => setSheetOpen(true)}
          />
          <ProcurementSortSelect
            sort={search.sort}
            onSortChange={filters.setSort}
            valueSortAllowed={valueSortAllowed}
          />
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            className={cn(procurementOutlineButtonClassName, 'h-11 gap-2 px-4 normal-case tracking-normal font-semibold')}
            onClick={onExport}
            disabled={!page || page.records.length === 0}
          >
            <Download className="h-4 w-4" aria-hidden />
            <span className="hidden sm:inline">
              <Trans>Export CSV</Trans>
            </span>
          </Button>
          <ShareFilteredView />
        </div>
      </div>

      <ProcurementActiveFilters filters={filters} />

      {gate ? (
        <CoverageRibbonFromGate gate={gate} status={status} collapsible />
      ) : null}

      <p aria-live="polite" className="text-sm text-[var(--pnrr-muted)]">
        {page ? (
          page.page.total !== null ? (
            <Trans>
              {formatFlowCount(page.page.total)} results in{' '}
              {grainLabelEn(search.grain)}
            </Trans>
          ) : (
            <Trans>1000+ results in {grainLabelEn(search.grain)}</Trans>
          )
        ) : null}
      </p>

      {query.isPending ? (
        <ProcurementSearchSkeleton />
      ) : query.isError && !page ? (
        <ProcurementErrorState
          error={query.error}
          onRetry={() => void query.refetch()}
          isRetrying={query.isRefetching}
        />
      ) : page && page.records.length === 0 ? (
        <div className={cn(procurementSectionClassName, 'p-8 text-center')}>
          {filters.activeCount > 0 || search.q ? (
            <>
              <p className="text-base font-bold text-[var(--pnrr-fg)]">
                <Trans>No records match these filters</Trans>
              </p>
              <p className="mt-1 text-sm text-[var(--pnrr-muted)]">
                <Trans>Loosen or clear a filter and try again.</Trans>
              </p>
              <Button
                type="button"
                variant="outline"
                className={cn(procurementOutlineButtonClassName, 'mt-4 px-4')}
                onClick={filters.clearFilters}
              >
                <Trans>Clear filters</Trans>
              </Button>
            </>
          ) : (
            <>
              <p className="text-base font-bold text-[var(--pnrr-fg)]">
                <Trans>
                  No {grainLabelEn(search.grain)} records available
                </Trans>
              </p>
              <div className="mt-4 flex justify-center">
                <RequestDatasetAction dataset={PROCUREMENT_DATASET_ID} />
              </div>
            </>
          )}
        </div>
      ) : page ? (
        <div
          className={cn(
            'space-y-4 transition-opacity',
            query.isPlaceholderData && 'opacity-60',
          )}
        >
          <ProcurementRecordList records={page.records} />
          <ProcurementPagination
            page={search.page}
            pageSize={search.pageSize}
            total={page.page.total}
            hasRecords={page.records.length === search.pageSize}
            onPageChange={filters.setPage}
          />
        </div>
      ) : null}

      <ProcurementFilterSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        filters={filters}
      />
    </div>
  )
}
