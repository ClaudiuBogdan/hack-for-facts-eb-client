import { Trans } from '@lingui/react/macro'
import { CalendarRange, Ban } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ProcurementSearchState } from '@/schemas/procurement-search'
import { statusesHiddenByDefault } from '../api/graphql/procurement-filters'
import {
  PROCUREMENT_DA_MAX_WINDOW_DAYS,
  resolveDirectAcquisitionWindow,
  type DaWindowAdjustment,
} from '../lib/search-dates'

function formatDay(iso: string): string {
  return new Intl.DateTimeFormat('ro-RO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${iso}T00:00:00Z`))
}

const NOTICE_CLASSES =
  'flex items-start gap-2 border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-subtle)] p-3 text-sm text-[var(--pnrr-muted)]'

const ICON_CLASSES = 'mt-0.5 h-4 w-4 shrink-0 text-[var(--pnrr-fg)]'

/**
 * The date-window disclosure, as its own component so `from`/`to` stay plain
 * identifiers inside `<Trans>`. lingui derives placeholder names from the
 * expression: a bare `from` yields `{from}`, but a member expression such as
 * `bounds.from` yields a positional `{0}` — which silently orphans the
 * existing translation of the same sentence. Keep them destructured.
 */
function WindowNotice({
  from,
  to,
  adjustment,
}: {
  readonly from: string
  readonly to: string
  readonly adjustment: Exclude<DaWindowAdjustment, null>
}) {
  return (
    <aside className={NOTICE_CLASSES}>
      <CalendarRange className={ICON_CLASSES} aria-hidden />
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

/**
 * Disclose every default constraint a direct-acquisitions search carries that
 * the user did not ask for. Two exist today:
 *
 *  1. the date window — the server cannot serve the DA grain unbounded, so the
 *     client always sends one (see `lib/search-dates.ts`);
 *  2. the refused-acquisition exclusion — the default list drops `cancelled`
 *     DAs (see `statusesHiddenByDefault`).
 *
 * Both narrow a result set that would otherwise read as the whole grain. A
 * silent cap is the thing this component exists to prevent, so a hidden slice
 * gets the same treatment as a narrowed window. Renders nothing on other
 * grains, or when neither constraint applies.
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
  const bounds =
    adjustment !== null && range?.gte && range.lte
      ? { from: formatDay(range.gte), to: formatDay(range.lte), adjustment }
      : null
  const hidesCancelled = statusesHiddenByDefault(
    search,
    'direct_acquisitions',
  ).includes('cancelled')

  if (bounds === null && !hidesCancelled) return null

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {bounds !== null ? (
        <WindowNotice
          from={bounds.from}
          to={bounds.to}
          adjustment={bounds.adjustment}
        />
      ) : null}

      {hidesCancelled ? (
        <aside className={NOTICE_CLASSES}>
          <Ban className={ICON_CLASSES} aria-hidden />
          <p className="min-w-0">
            <Trans>
              <strong className="text-[var(--pnrr-fg)]">
                Refused acquisitions are hidden.
              </strong>{' '}
              On e-licitatie a direct acquisition can end with the offer or the
              conditions refused — the purchase never happened, so these are not
              counted as spending. They remain published: select the status
              “Cancelled” in the filters to see them.
            </Trans>
          </p>
        </aside>
      ) : null}
    </div>
  )
}
