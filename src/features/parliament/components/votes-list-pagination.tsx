import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type Props = {
  readonly page: number
  readonly totalPages: number
  readonly total: number
  readonly onPageChange: (page: number) => void
  readonly className?: string
  /** Names the nav for screen readers; the bar serves more than one list. */
  readonly ariaLabel?: string
}

type PageItem = { readonly type: 'page'; readonly page: number } | { readonly type: 'ellipsis' }

function buildPageItems(current: number, total: number): PageItem[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, index) => ({
      type: 'page' as const,
      page: index + 1,
    }))
  }

  const items: PageItem[] = [{ type: 'page', page: 1 }]
  const start = Math.max(2, current - 1)
  const end = Math.min(total - 1, current + 1)

  if (start > 2) items.push({ type: 'ellipsis' })
  for (let page = start; page <= end; page += 1) {
    items.push({ type: 'page', page })
  }
  if (end < total - 1) items.push({ type: 'ellipsis' })
  items.push({ type: 'page', page: total })

  return items
}

type NavProps = {
  readonly page: number
  readonly totalPages: number
  readonly onPageChange: (page: number) => void
  readonly ariaLabel?: string
}

/**
 * The numbered pager on its own, with no count and no box around it.
 *
 * Split out of `VotesListPagination` so the list surfaces can put it on the
 * right-hand side of `ParliamentListFooter`, where the count is already
 * rendered once for the whole list — the bar used to carry its own copy, which
 * is how "N rezultate" ended up printed twice on the proiecte tab.
 */
export function ParliamentListPaginationNav({
  page,
  totalPages,
  onPageChange,
  ariaLabel = 'Paginare',
}: NavProps) {
  if (totalPages <= 1) return null

  const safePage = Math.min(Math.max(1, page), totalPages)
  const pageItems = buildPageItems(safePage, totalPages)

  return (
    <nav className="flex flex-wrap items-center gap-1" aria-label={ariaLabel}>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-9 w-9 rounded-none border-[#b1b4b6] bg-white dark:border-[var(--pnrr-border)] dark:bg-[var(--pnrr-card)]"
        onClick={() => onPageChange(1)}
        disabled={safePage <= 1}
        aria-label="Prima pagină"
      >
        <ChevronsLeft className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-9 w-9 rounded-none border-[#b1b4b6] bg-white dark:border-[var(--pnrr-border)] dark:bg-[var(--pnrr-card)]"
        onClick={() => onPageChange(safePage - 1)}
        disabled={safePage <= 1}
        aria-label="Pagina anterioară"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      {pageItems.map((item, index) =>
        item.type === 'ellipsis' ? (
          <span
            key={`ellipsis-${index}`}
            className="px-1 text-sm text-[#505a5f] dark:text-[var(--pnrr-muted)]"
          >
            …
          </span>
        ) : (
          <Button
            key={item.page}
            type="button"
            variant={item.page === safePage ? 'default' : 'outline'}
            className={cn(
              'h-9 min-w-9 rounded-none px-3 text-sm',
              item.page === safePage
                ? 'border-[#0b0c0c] bg-[#0b0c0c] text-white hover:bg-[#0b0c0c]/90'
                : 'border-[#b1b4b6] bg-white dark:border-[var(--pnrr-border)] dark:bg-[var(--pnrr-card)]',
            )}
            onClick={() => onPageChange(item.page)}
            aria-current={item.page === safePage ? 'page' : undefined}
          >
            {item.page}
          </Button>
        ),
      )}

      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-9 w-9 rounded-none border-[#b1b4b6] bg-white dark:border-[var(--pnrr-border)] dark:bg-[var(--pnrr-card)]"
        onClick={() => onPageChange(safePage + 1)}
        disabled={safePage >= totalPages}
        aria-label="Pagina următoare"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-9 w-9 rounded-none border-[#b1b4b6] bg-white dark:border-[var(--pnrr-border)] dark:bg-[var(--pnrr-card)]"
        onClick={() => onPageChange(totalPages)}
        disabled={safePage >= totalPages}
        aria-label="Ultima pagină"
      >
        <ChevronsRight className="h-4 w-4" />
      </Button>
    </nav>
  )
}

/**
 * Count and pager in one bordered bar — still used by the member initiative
 * tab, which is a panel inside a profile rather than one of the list surfaces.
 */
export function VotesListPagination({
  page,
  totalPages,
  total,
  onPageChange,
  className,
  ariaLabel = 'Paginare voturi',
}: Props) {
  const safePage = Math.min(Math.max(1, page), totalPages)

  return (
    <div
      className={cn(
        'flex flex-col gap-4 border border-[#b1b4b6] bg-[#f3f2f1] px-4 py-3 dark:border-[var(--pnrr-border)] dark:bg-[var(--pnrr-subtle)] sm:flex-row sm:items-center sm:justify-between',
        className,
      )}
    >
      <p className="text-sm text-[#0b0c0c] dark:text-[var(--pnrr-fg)]">
        <span className="font-bold">{total}</span> rezultate
        {totalPages > 1 ? (
          <span className="text-[#505a5f] dark:text-[var(--pnrr-muted)]">
            {' '}
            (pagina {safePage} din {totalPages})
          </span>
        ) : null}
      </p>

      <ParliamentListPaginationNav
        page={page}
        totalPages={totalPages}
        onPageChange={onPageChange}
        ariaLabel={ariaLabel}
      />
    </div>
  )
}
