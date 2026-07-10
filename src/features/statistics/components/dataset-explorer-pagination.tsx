import { ChevronLeft, ChevronRight } from 'lucide-react'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { Button } from '@/components/ui/button'
import { EXPLORER_PAGE_SIZE } from '../lib/explorer-filter'

type Props = {
  readonly page: number
  readonly totalCount: number
  readonly hasNextPage: boolean
  readonly onPageChange: (page: number) => void
}

/**
 * Prev/next pager over `?pagina=`. Deliberately not the shared `Pagination`
 * component: that one ships hardcoded English copy and a page-size selector the
 * explorer does not offer.
 */
export function DatasetExplorerPagination({
  page,
  totalCount,
  hasNextPage,
  onPageChange,
}: Props) {
  const totalPages = Math.max(1, Math.ceil(totalCount / EXPLORER_PAGE_SIZE))
  if (totalPages <= 1) return null

  return (
    <nav
      className="flex flex-col items-center justify-between gap-3 rounded-lg border border-border/70 px-4 py-3 sm:flex-row"
      aria-label={t`Paginare seturi de date`}
    >
      <p className="text-xs text-muted-foreground" aria-live="polite">
        <Trans>
          Pagina {page} din {totalPages}
        </Trans>
      </p>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft className="h-4 w-4" aria-hidden />
          <Trans>Anterioară</Trans>
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!hasNextPage}
          onClick={() => onPageChange(page + 1)}
        >
          <Trans>Următoarea</Trans>
          <ChevronRight className="h-4 w-4" aria-hidden />
        </Button>
      </div>
    </nav>
  )
}
