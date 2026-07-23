import { Trans } from '@lingui/react/macro'
import { t } from '@lingui/core/macro'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getPaginationRange } from '@/lib/pagination-range'
import { formatFlowCount } from '../lib/formatting'
import {
  procurementOutlineButtonClassName,
  procurementPaginationButtonClassName,
} from '../lib/procurement-theme'

const PROCUREMENT_LIST_PAGE_SIZES = [25, 50, 100] as const

type Props = {
  readonly page: number
  readonly pageSize: number
  /** Null = unknown / too large — degrade to prev/next + "1000+ results". */
  readonly total: number | null
  readonly hasRecords: boolean
  readonly onPageChange: (page: number) => void
  /** When set, page size lives next to pagination (not in the filter sheet). */
  readonly onPageSizeChange?: (pageSize: number) => void
  readonly pageSizeOptions?: readonly number[]
}

/**
 * Windowed page numbers with ellipses on desktop, prev/next on mobile
 * (members-pagination pattern). When the total is unknown the number range is
 * impossible — degrade honestly to prev/next. Page size is page chrome, not a
 * shared filter-panel control.
 */
export function ProcurementPagination({
  page,
  pageSize,
  total,
  hasRecords,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = PROCUREMENT_LIST_PAGE_SIZES,
}: Props) {
  const totalPages =
    total !== null ? Math.max(1, Math.ceil(total / pageSize)) : null

  const showPageNav =
    !(totalPages !== null && totalPages <= 1) &&
    !(totalPages === null && page === 1 && !hasRecords)

  if (!showPageNav && !onPageSizeChange) return null

  const canPrev = page > 1
  const canNext =
    totalPages !== null ? page < totalPages : hasRecords

  const prevButton = (
    <button
      type="button"
      className={procurementPaginationButtonClassName}
      disabled={!canPrev}
      onClick={() => onPageChange(page - 1)}
      aria-label={t`Previous page`}
    >
      <ChevronLeft className="h-4 w-4" aria-hidden />
      <span className="ml-1 hidden sm:inline">
        <Trans>Previous</Trans>
      </span>
    </button>
  )

  const nextButton = (
    <button
      type="button"
      className={procurementPaginationButtonClassName}
      disabled={!canNext}
      onClick={() => onPageChange(page + 1)}
      aria-label={t`Next page`}
    >
      <span className="mr-1 hidden sm:inline">
        <Trans>Next</Trans>
      </span>
      <ChevronRight className="h-4 w-4" aria-hidden />
    </button>
  )

  const pageSizeControl =
    onPageSizeChange !== undefined ? (
      <label className="flex items-center gap-2 text-sm text-[var(--pnrr-muted)]">
        <span>
          <Trans>Results per page</Trans>
        </span>
        <select
          className={cn(
            procurementOutlineButtonClassName,
            'h-9 border-2 border-[var(--pnrr-border)] bg-background px-2 py-1 text-sm font-semibold text-[var(--pnrr-fg)]',
          )}
          value={pageSize}
          aria-label={t`Results per page`}
          onChange={(event) => {
            const size = Number(event.target.value)
            if (pageSizeOptions.includes(size)) {
              onPageSizeChange(size)
            }
          }}
        >
          {pageSizeOptions.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
      </label>
    ) : null

  return (
    <nav
      className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
      aria-label={t`Results pagination`}
    >
      <div className="flex flex-wrap items-center gap-3">
        {pageSizeControl}
        {showPageNav ? (
          <p className="text-sm text-[var(--pnrr-muted)]">
            {total !== null ? (
              <Trans>
                {formatFlowCount(total)} results · page {page} of {totalPages}
              </Trans>
            ) : (
              <Trans>1000+ results · page {page}</Trans>
            )}
          </p>
        ) : null}
      </div>

      {showPageNav ? (
        <div className="flex items-center gap-2">
          {prevButton}

          {totalPages !== null ? (
            <div className="hidden items-center gap-2 sm:flex">
              {getPaginationRange(page, totalPages).map((entry, index) =>
                entry === 'ellipsis' ? (
                  <span
                    key={`ellipsis-${index}`}
                    className="px-1 text-sm text-[var(--pnrr-muted)]"
                    aria-hidden
                  >
                    …
                  </span>
                ) : (
                  <button
                    key={entry}
                    type="button"
                    className={cn(
                      procurementPaginationButtonClassName,
                      entry === page &&
                        'border-[#1d70b8] bg-[#1d70b8] text-white hover:bg-[#1d70b8] dark:border-[#3b82f6] dark:bg-[#3b82f6] dark:text-white',
                    )}
                    aria-current={entry === page ? 'page' : undefined}
                    onClick={() => onPageChange(entry)}
                  >
                    {entry}
                  </button>
                ),
              )}
            </div>
          ) : null}

          <span className="text-sm tabular-nums text-[var(--pnrr-muted)] sm:hidden">
            {totalPages !== null ? `${page} / ${totalPages}` : page}
          </span>

          {nextButton}
        </div>
      ) : null}
    </nav>
  )
}
