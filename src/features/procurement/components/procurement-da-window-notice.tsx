import { Trans } from '@lingui/react/macro'
import { CalendarRange } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ProcurementSearchState } from '@/schemas/procurement-search'
import {
  PROCUREMENT_DA_MAX_WINDOW_DAYS,
  resolveDirectAcquisitionWindow,
} from '../lib/search-dates'

function formatDay(iso: string): string {
  return new Intl.DateTimeFormat('ro-RO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${iso}T00:00:00Z`))
}

/**
 * Disclose the date window a direct-acquisitions search was bounded to.
 *
 * The server cannot serve the DA grain unbounded, so the client always sends a
 * window (see `lib/search-dates.ts`). A narrowed result set that looks like the
 * whole grain is a silent cap — this notice is what keeps it honest. Renders
 * nothing on other grains, or when the user's own filters already qualify.
 */
export function ProcurementDaWindowNotice({
  search,
  className,
}: {
  readonly search: ProcurementSearchState
  readonly className?: string
}) {
  if (search.grain !== 'direct_acquisitions') return null

  const { range, adjustment } = resolveDirectAcquisitionWindow(search)
  if (adjustment === null || !range?.gte || !range.lte) return null

  const from = formatDay(range.gte)
  const to = formatDay(range.lte)

  return (
    <aside
      className={cn(
        'flex items-start gap-2 border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-subtle)] p-3 text-sm text-[var(--pnrr-muted)]',
        className,
      )}
    >
      <CalendarRange
        className="mt-0.5 h-4 w-4 shrink-0 text-[var(--pnrr-fg)]"
        aria-hidden
      />
      <p className="min-w-0">
        {adjustment === 'default' ? (
          <Trans>
            Direct acquisitions are shown for the last 12 months (
            <strong className="text-[var(--pnrr-fg)]">
              {from} – {to}
            </strong>
            ).
          </Trans>
        ) : (
          <Trans>
            The date range was narrowed to{' '}
            <strong className="text-[var(--pnrr-fg)]">
              {from} – {to}
            </strong>
            .
          </Trans>
        )}{' '}
        <Trans>
          This grain holds tens of millions of records, so a search must be
          bounded: filter by buyer or supplier CUI to search the whole history,
          or pick a date range of up to {PROCUREMENT_DA_MAX_WINDOW_DAYS} days.
          Records with no date recorded cannot appear in a date-bounded search.
        </Trans>
      </p>
    </aside>
  )
}
