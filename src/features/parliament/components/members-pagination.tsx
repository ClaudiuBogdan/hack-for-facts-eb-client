import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getPaginationRange } from '@/lib/pagination-range'
import { parliamentPaginationButtonClassName } from '../lib/table-theme'

type Props = {
  readonly page: number
  readonly totalPages: number
  readonly total: number
  readonly onPageChange: (page: number) => void
}

/** PNRR-style pagination for the members directory */
export function MembersPagination({
  page,
  totalPages,
  total,
  onPageChange,
}: Props) {
  if (totalPages <= 1 && total === 0) {
    return null
  }

  const safePage = Math.min(Math.max(1, page), totalPages)

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2 text-sm text-[var(--pnrr-muted)]">
        <span>
          <span className="font-bold text-[var(--pnrr-fg)]">
            {total.toLocaleString('ro-RO')}
          </span>{' '}
          membri
        </span>
        {totalPages > 1 ? (
          <>
            <span aria-hidden>·</span>
            <span>
              {safePage} / {totalPages}
            </span>
          </>
        ) : null}
      </div>

      {totalPages > 1 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 sm:justify-end">
          <div className="flex items-center gap-1 sm:hidden">
            <button
              type="button"
              disabled={safePage <= 1}
              onClick={() => onPageChange(safePage - 1)}
              className={cn(parliamentPaginationButtonClassName, 'h-8 w-8')}
              aria-label="Pagina anterioară"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="px-2 text-xs tabular-nums text-[var(--pnrr-muted)]">
              {safePage} / {totalPages}
            </span>
            <button
              type="button"
              disabled={safePage >= totalPages}
              onClick={() => onPageChange(safePage + 1)}
              className={cn(parliamentPaginationButtonClassName, 'h-8 w-8')}
              aria-label="Pagina următoare"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="hidden items-center gap-1 sm:flex">
            <button
              type="button"
              disabled={safePage <= 1}
              onClick={() => onPageChange(safePage - 1)}
              className={cn(parliamentPaginationButtonClassName, 'gap-1 px-3 text-xs font-bold')}
              aria-label="Pagina anterioară"
            >
              <ChevronLeft className="h-4 w-4" />
              Anterior
            </button>

            <div className="flex items-center gap-1">
              {getPaginationRange(safePage, totalPages).map((item, index) =>
                item === 'ellipsis' ? (
                  <span
                    key={`ellipsis-${index}`}
                    className="shrink-0 px-1.5 text-xs text-[var(--pnrr-muted)]"
                  >
                    …
                  </span>
                ) : (
                  <button
                    key={item}
                    type="button"
                    onClick={() => onPageChange(item)}
                    className={cn(
                      'h-8 w-8 shrink-0 border-2 text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pnrr-blue)]',
                      item === safePage
                        ? 'border-[var(--pnrr-fg)] bg-[var(--pnrr-fg)] text-[var(--pnrr-bg)]'
                        : 'border-[var(--pnrr-border)] bg-[var(--pnrr-card)] text-[var(--pnrr-fg)] hover:bg-[var(--pnrr-fg)] hover:text-[var(--pnrr-bg)]',
                    )}
                    aria-current={item === safePage ? 'page' : undefined}
                  >
                    {item}
                  </button>
                ),
              )}
            </div>

            <button
              type="button"
              disabled={safePage >= totalPages}
              onClick={() => onPageChange(safePage + 1)}
              className={cn(parliamentPaginationButtonClassName, 'gap-1 px-3 text-xs font-bold')}
              aria-label="Pagina următoare"
            >
              Următor
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
