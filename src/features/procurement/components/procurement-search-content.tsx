import { useState } from 'react'
import { Trans } from '@lingui/react/macro'
import { t } from '@lingui/core/macro'
import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { RequestDatasetAction } from '@/components/shared/procurement-data/request-dataset-action'
import { ShareFilteredView } from '@/components/shared/procurement-data/share-filtered-view'
import type { ProcurementSearchState } from '@/schemas/procurement-search'
import type { ProcurementFilterState } from '../hooks/use-procurement-filter-state'
import { useProcurementSearch } from '../hooks/use-procurement-data'
import { useProcurementFilterState } from '../hooks/use-procurement-filter-state'
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
import { PROCUREMENT_DATASET_ID } from '../lib/dataset'
import { ProcurementDebouncedSearchInput } from './procurement-debounced-search-input'
import {
  ProcurementActiveFilters,
  ProcurementFilterSheet,
  ProcurementFilterTriggerButton,
} from './procurement-filter-sheet'
import { ProcurementDaWindowNotice } from './procurement-da-window-notice'
import { ProcurementGrainTabs } from './procurement-grain-tabs'
import { ProcurementPagination } from './procurement-pagination'
import { ProcurementRecordList } from './procurement-record-card'
import { ProcurementSortSelect } from './procurement-sort-select'
import { ProcurementErrorState } from './procurement-error-state'
import { ProcurementSearchSkeleton } from './procurement-skeletons'

type Props = {
  readonly search: ProcurementSearchState
  /** When provided (hub), URL writes go through the shared hub state. */
  readonly filterState?: ProcurementFilterState
  /** Hide the in-body filter trigger when the hub chrome owns the sheet. */
  readonly hideFilterChrome?: boolean
  readonly onOpenFilters?: () => void
}

/** List layout: grain tabs, query, filters, results, pagination. */
export function ProcurementSearchContent({
  search,
  filterState: externalFilters,
  hideFilterChrome = false,
  onOpenFilters,
}: Props) {
  const internalFilters = useProcurementFilterState(search)
  const filters = externalFilters ?? internalFilters
  const query = useProcurementSearch(search)
  const [sheetOpen, setSheetOpen] = useState(false)

  const page = query.data
  const onExport = () => {
    if (!page) return
    const csv = buildProcurementSearchCsv(page.records, search)
    downloadProcurementCsv(
      csv,
      buildProcurementSearchFilename(search.grain, null),
    )
  }

  const openFilters = () => {
    if (onOpenFilters) onOpenFilters()
    else setSheetOpen(true)
  }

  return (
    <div className="space-y-5">
      <ProcurementGrainTabs grain={search.grain} onGrainChange={filters.setGrain} />

      {!hideFilterChrome ? (
        <form role="search" onSubmit={(event) => event.preventDefault()}>
          <ProcurementDebouncedSearchInput
            value={search.q}
            onCommit={filters.setQuery}
            inputId="procurement-search-query"
            placeholder={t`Search by title, number, CUI or party name`}
            ariaLabel={t`Search procurement records`}
          />
        </form>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {!hideFilterChrome ? (
            <ProcurementFilterTriggerButton
              activeCount={filters.activeCount}
              onClick={openFilters}
            />
          ) : null}
          <ProcurementSortSelect
            sort={search.sort}
            onSortChange={filters.setSort}
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

      {!hideFilterChrome ? <ProcurementActiveFilters filters={filters} /> : null}

      <ProcurementDaWindowNotice search={search} />

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
            onPageSizeChange={filters.setPageSize}
          />
        </div>
      ) : null}

      {!hideFilterChrome ? (
        <ProcurementFilterSheet
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          filters={filters}
        />
      ) : null}
    </div>
  )
}
