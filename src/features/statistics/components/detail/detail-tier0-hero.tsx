import { Trans } from '@lingui/react/macro'
import type { StatisticsLatestValue } from '@/schemas/statistics'
import { formatObservationValue } from '../../lib/format'
import { statisticsTheme } from '../../lib/statistics-theme'
import { describeValueStatus } from '../../lib/value-status'
import { tileUnit } from '../../lib/territory-groups'
import { hubUnitWord } from '../../lib/units'
import { formatHubPeriod } from '../../lib/period'

type Props = {
  readonly latest: StatisticsLatestValue
}

/**
 * Tier 0 — the number above the chart: the latest resolved value, LARGE, with
 * its unit and period; absence renders as words, never as 0. Which cell it is
 * the rail says, each coordinate the page chose marked „implicit" — the
 * figure does not repeat it.
 *
 * Three tiers and no more (DESIGN.md §Design Principles 1): the label says
 * what the figure is, the figure is the only large type in the band, and the
 * period and quality flags sit in the quiet tier beside it. The label renders
 * in the absent case too — a band that opens with an apology and no heading
 * reads as a failure rather than as a state.
 */
export function DetailTier0Hero({ latest }: Props) {
  const ambiguous = latest.matchStrategy === 'AMBIGUOUS_GEOGRAPHY'
  const formatted =
    latest.hasData && !ambiguous && latest.value !== null
      ? formatObservationValue(latest.value)
      : null

  if (formatted === null) {
    return (
      <div className="space-y-1">
        <p className={statisticsTheme.sectionLabel}>
          <Trans>Ultima valoare</Trans>
        </p>
        <p className="text-sm text-muted-foreground">
          {ambiguous ? (
            <Trans>
              Mai multe serii INS corespund selecției. Alege o serie din sursă.
            </Trans>
          ) : (
            <Trans>Fără o valoare recentă pentru selecția curentă.</Trans>
          )}
        </p>
        {!ambiguous && latest.hasData ? (
          <p className="text-sm text-muted-foreground">
            {latest.period ? formatHubPeriod(latest.period) : null}
            {latest.valueStatus
              ? ` · ${describeValueStatus(latest.valueStatus)}`
              : null}
          </p>
        ) : null}
      </div>
    )
  }

  // The unit as a Romanian word where the API's symbol is a code
  // („persons", „percent"); otherwise the unit's own name.
  const unit = tileUnit(latest)
  const unitWord = hubUnitWord(unit, latest.unitNameRo ?? latest.unitSymbol)

  return (
    <div>
      <p className={statisticsTheme.sectionLabel}>
        <Trans>Ultima valoare</Trans>
      </p>
      <p className="mt-1.5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className={statisticsTheme.heroValue}>
          {formatted}
          {unitWord ? (
            <span className={statisticsTheme.heroUnit}>{unitWord}</span>
          ) : null}
        </span>
        <span className="text-sm tabular-nums text-muted-foreground">
          {latest.period ? formatHubPeriod(latest.period) : null}
        </span>
        {latest.valueStatus ? (
          <span className={statisticsTheme.provenanceChip}>
            <Trans>stare:</Trans> {latest.valueStatus}
          </span>
        ) : null}
      </p>
    </div>
  )
}
