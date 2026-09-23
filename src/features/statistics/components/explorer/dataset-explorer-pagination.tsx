import { ChevronLeft, ChevronRight } from 'lucide-react'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { EXPLORER_PAGE_SIZE } from '../../lib/explorer-filter'

type Props = {
  readonly page: number
  readonly totalCount: number
  readonly hasNextPage: boolean
  readonly onPageChange: (page: number) => void
}

/**
 * Prev/next pager over `?pagina=`, as the results band's footer strip — the
 * count heads the band, the pager closes it, and the rows sit between them.
 *
 * Deliberately not the shared `Pagination` component: that one ships hardcoded
 * English copy and a page-size selector the explorer does not offer.
 */
export function DatasetExplorerPagination({
  page,
  totalCount,
  hasNextPage,
  onPageChange,
}: Props) {
  const totalPages = Math.max(1, Math.ceil(totalCount / EXPLORER_PAGE_SIZE))
  if (totalPages <= 1) return null
  const atStart = page <= 1
  const atEnd = !hasNextPage

  return (
    <nav
      className="flex flex-col items-center justify-between gap-3 border-t border-border/70 px-4 py-2.5 sm:flex-row"
      aria-label={t`Paginare seturi de date`}
    >
      <p className="text-xs tabular-nums text-muted-foreground" aria-live="polite">
        <Trans>
          Pagina {page} din {totalPages}
        </Trans>
      </p>
      {/* An end button is `aria-disabled`, never `disabled`: the reader who
          pressed „Următoarea" onto the last page is still standing on it, and
          a button that turns `disabled` under the focus drops that focus to
          the body. It looks inert, ignores the pointer, and its click is a
          no-op from the keyboard. */}
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-disabled={atStart || undefined}
          className={cn(atStart && 'pointer-events-none opacity-50')}
          onClick={() => {
            if (!atStart) onPageChange(page - 1)
          }}
        >
          <ChevronLeft className="h-4 w-4" aria-hidden />
          <Trans>Anterioară</Trans>
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-disabled={atEnd || undefined}
          className={cn(atEnd && 'pointer-events-none opacity-50')}
          onClick={() => {
            if (!atEnd) onPageChange(page + 1)
          }}
        >
          <Trans>Următoarea</Trans>
          <ChevronRight className="h-4 w-4" aria-hidden />
        </Button>
      </div>
    </nav>
  )
}
