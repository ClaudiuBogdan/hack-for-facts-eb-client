import { Trans } from '@lingui/react/macro'
import { CalendarRange, Ban, Eye } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  procurementNoticeClassName,
  procurementNoticeIconClassName,
} from '../lib/procurement-theme'
import type { ProcurementSearchState } from '@/schemas/procurement-search'
import {
  statusesHiddenByDefault,
  statusesIncludedByRequest,
} from '../api/graphql/procurement-filters'
import { statusLabel } from '../lib/status-meta'
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

const NOTICE_CLASSES = procurementNoticeClassName

const ICON_CLASSES = procurementNoticeIconClassName

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
 * gets the same treatment as a narrowed window.
 *
 * The opt-in path gets its own notice: once the reader asks for refused
 * acquisitions back, the list stops reconciling with the aggregates (which
 * exclude them at the data layer), and that is precisely the moment 262B RON
 * of non-spend is most likely to be misread as spending.
 *
 * Renders nothing on other grains, or when no constraint applies.
 *
 * `className` styles the notice STACK, not an individual notice — chrome
 * overrides (border/padding/background) will not reach the `<aside>`s.
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
  const includesCancelled = statusesIncludedByRequest(
    search,
    'direct_acquisitions',
  ).includes('cancelled')
  // Quoted into both notices so the instruction can never name a filter option
  // by a label the filter sheet no longer uses (it is translated at runtime).
  const cancelledLabel = statusLabel('cancelled')

  if (bounds === null && !hidesCancelled && !includesCancelled) return null

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
              “{cancelledLabel}” in the filters to see them.
            </Trans>
          </p>
        </aside>
      ) : null}

      {includesCancelled ? (
        <aside className={NOTICE_CLASSES}>
          <Eye className={ICON_CLASSES} aria-hidden />
          <p className="min-w-0">
            <Trans>
              <strong className="text-[var(--pnrr-fg)]">
                Refused acquisitions are included in this list.
              </strong>{' '}
              These purchases did not go ahead, so the totals and charts on the
              other tabs do not count them — the list below will not add up to
              those figures. Clear the “{cancelledLabel}” status to return to
              concluded acquisitions only.
            </Trans>
          </p>
        </aside>
      ) : null}
    </div>
  )
}
