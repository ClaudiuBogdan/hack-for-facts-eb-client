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
  const ambiguous = latest.matchStrategy === 'AMBIGUOUS_GEOGRAPHY'
  const formatted =
    latest.hasData && !ambiguous && latest.value !== null
      ? formatObservationValue(latest.value)
      : null

  if (formatted === null) {
    return (
      <div className="space-y-1 text-sm text-muted-foreground">
        <p>
          {ambiguous ? (
            <Trans>
              Mai multe serii INS corespund selecției. Alege o serie din sursă.
            </Trans>
          ) : (
            <Trans>Fără o valoare recentă pentru selecția curentă.</Trans>
          )}
        </p>
        {!ambiguous && latest.hasData ? (
          <p>
            {latest.period}
            {latest.valueStatus ? (
              <span className="ml-2">
                <Trans>stare:</Trans> {latest.valueStatus}
              </span>
            ) : null}
          </p>
        ) : null}
      </div>
    )
  }

  return (
    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
      <span className={statisticsTheme.heroValue}>
        {formatted}
        {latest.unitSymbol ? (
          <span className={statisticsTheme.heroUnit}>{latest.unitSymbol}</span>
        ) : null}
      </span>
      <span className="text-sm text-muted-foreground">{latest.period}</span>
      {matchChip === 'representative' ? (
        <span className={statisticsTheme.warningChip}>
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
