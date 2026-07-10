import { Trans } from '@lingui/react/macro'
import { describeValueStatus } from '../lib/value-status'


type MarkerProps = {
  readonly status: string
}

/** The superscript flag rendered next to a value in the table and tooltip. */
export function ValueStatusMarker({ status }: MarkerProps) {
  const description = describeValueStatus(status)

  return (
    <sup
      title={description}
      aria-label={description}
      className="ml-0.5 rounded-sm bg-amber-500/15 px-1 text-[0.65rem] font-semibold text-amber-700 dark:text-amber-400"
    >
      {status}
    </sup>
  )
}

type LegendProps = {
  readonly statuses: readonly string[]
}

/** Renders only the markers that actually appear in the current result set. */
export function ValueStatusLegend({ statuses }: LegendProps) {
  if (statuses.length === 0) return null

  return (
    <div className="rounded-md border border-border/70 bg-muted/30 p-3 text-xs text-muted-foreground">
      <p className="font-medium text-foreground">
        <Trans>Marcaje de calitate INS</Trans>
      </p>
      <ul className="mt-1.5 space-y-1">
        {statuses.map((status) => (
          <li key={status}>
            <span className="font-semibold text-amber-700 dark:text-amber-400">
              {status}
            </span>{' '}
            — {describeValueStatus(status)}
          </li>
        ))}
      </ul>
    </div>
  )
}
