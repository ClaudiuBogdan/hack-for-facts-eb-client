import { Trans } from '@lingui/react/macro'
import type { StatisticsLatestValue } from '@/schemas/statistics'
import { formatObservationValue } from '../lib/format'
import { statisticsTheme } from '../lib/statistics-theme'

type Props = {
  readonly latest: StatisticsLatestValue
  readonly matchChip: 'representative' | 'total' | null
}

/**
 * Tier 0 — the number above the chart: the latest resolved value, LARGE, with
 * its unit and period. The match-strategy chip flags a heuristic pick;
 * absence renders as words, never as 0.
 */
export function DetailTier0Hero({ latest, matchChip }: Props) {
  const formatted = formatObservationValue(latest.value)

  if (formatted === null) {
    return (
      <p className="text-sm text-muted-foreground">
        <Trans>Fără o valoare recentă pentru selecția curentă.</Trans>
      </p>
    )
  }

  return (
    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
      <span className="text-4xl font-semibold tabular-nums tracking-tight">
        {formatted}
        {latest.unitSymbol ? (
          <span className="ml-1.5 text-lg font-normal text-muted-foreground">
            {latest.unitSymbol}
          </span>
        ) : null}
      </span>
      <span className="text-sm text-muted-foreground">{latest.period}</span>
      {matchChip === 'representative' ? (
        <span className="rounded-sm bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-950 dark:text-amber-300">
          <Trans>selecție reprezentativă</Trans>
        </span>
      ) : null}
      {latest.valueStatus ? (
        <span className={statisticsTheme.provenanceChip}>
          <Trans>stare:</Trans> {latest.valueStatus}
        </span>
      ) : null}
    </div>
  )
}
