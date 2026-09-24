import { Trans } from '@lingui/react/macro'
import { describeValueStatus } from '../lib/value-status'

type MarkerProps = {
  readonly status: string
}

/**
 * The superscript flag rendered next to a value in the table and tooltip.
 * Its meaning is text inside it, visually hidden: an `aria-label` on a
 * `<sup>` is dropped by assistive tech, which then read the bare letter.
 */
export function ValueStatusMarker({ status }: MarkerProps) {
  const description = describeValueStatus(status)

  return (
    <sup
      title={description}
      className="ml-0.5 rounded-sm bg-amber-500/15 px-1 text-[0.65rem] font-semibold text-amber-700 dark:text-amber-400"
    >
      <span aria-hidden="true">{status === '' ? '""' : status}</span>
      <span className="sr-only">{description}</span>
    </sup>
  )
}

type LegendProps = {
  readonly statuses: readonly string[]
}

/**
 * Renders only the markers that actually appear in the current result set —
 * as footnotes under the table, not a box: a bordered panel under a bordered
 * table is a card under a card.
 */
export function ValueStatusLegend({ statuses }: LegendProps) {
  if (statuses.length === 0) return null

  return (
    <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-xs text-muted-foreground">
      <p className="font-medium text-foreground/80">
        <Trans>Marcaje de calitate INS</Trans>
      </p>
      <ul className="flex flex-wrap gap-x-4 gap-y-1">
        {statuses.map((status) => (
          <li key={status === '' ? '""' : status}>
            <span className="font-semibold text-amber-700 dark:text-amber-400">
              {status === '' ? '""' : status}
            </span>{' '}
            {describeValueStatus(status)}
          </li>
        ))}
      </ul>
    </div>
  )
}
