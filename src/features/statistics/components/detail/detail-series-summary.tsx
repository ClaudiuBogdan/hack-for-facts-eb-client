import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { activeNumberLocale, groupWireValue } from '../../lib/format'
import { formatHubPeriod } from '../../lib/period'
import type { SeriesPoint, SeriesStats } from '../../lib/series-stats'
import { describeValueStatus } from '../../lib/value-status'
import { statisticsTheme } from '../../lib/statistics-theme'
import { FactTile, LatestValueTile, PeriodPhrase } from './fact-tile'

type Props = {
  readonly stats: SeriesStats
  /** The unit as a word („persoane", „%", „număr"); empty renders nothing. */
  readonly unitWord: string
  /**
   * Set when the latest PUBLISHED cell carries no readable value.
   *
   * It overrides the figure, and deliberately: `summarizeSeries` skips
   * unreadable values, so its „latest" is the last READABLE one. Printing that
   * under „Ultima valoare" while INS's actual latest cell is confidential
   * would present a stale number as current. The page says the cell is
   * unavailable instead, with its period and quality flag — absence is never
   * rendered as a figure, and never as 0.
   */
  readonly absent?: {
    readonly period: string | null
    readonly valueStatus: string | null
  } | null
  /**
   * The INS quality flag on the latest cell, when it carries one.
   *
   * A provisional or estimated figure says so beside itself — a reader
   * quoting „10" must be able to see that INS has not settled it. This is
   * separate from `absent`: a value can be perfectly readable AND flagged.
   */
  readonly valueStatus?: string | null
}

/**
 * A published value, grouped in the active locale and at the precision INS
 * published — off the wire string, so „0.125" never prints as „0,13".
 */
function formatValue(point: SeriesPoint): string {
  return groupWireValue(point.raw, activeNumberLocale())
}

/**
 * A DERIVED figure — a mean — at a precision the source justifies.
 *
 * Two decimals are right for a value INS published and wrong for one we
 * computed: a population mean reads „22.511.356,94", claiming a hundredth of a
 * person across 35 observations. Past a thousand the decimals are noise.
 */
function formatDerived(value: number): string {
  return new Intl.NumberFormat(activeNumberLocale(), {
    maximumFractionDigits: Math.abs(value) >= 1000 ? 0 : 2,
  }).format(value)
}

/**
 * Tier 0 — the latest value first, and beside it the facts that give it
 * scale, all four as the same tile: a name, a number, and the period the
 * number belongs to.
 *
 * „10" alone says nothing: the same 10 is the lowest a series has ever gone or
 * an unremarkable year. The extremes and the mean answer that at the same
 * size as the figure, so a reader never has to open anything to know whether
 * the headline number is news. The latest value's tile leads, and carries the
 * chart's line colour in a dot before its name: it is the point the chart
 * ends on.
 *
 * The unit is said ONCE, beside the latest value. It used to be the facts'
 * first column as well, and the chart's caption a third time in INS's own
 * spelling („6 număr … unitate număr … Numar"). Periods read as words — „în
 * 2024" — not behind a „·" that a reader has to decode and a screen reader
 * skips.
 */
export function DetailSeriesSummary({
  stats,
  unitWord,
  absent,
  valueStatus,
}: Props) {
  if (absent) {
    return (
      <div className="space-y-1" data-testid="series-summary">
        <p className={statisticsTheme.figureLabel}>
          <Trans>Ultima valoare</Trans>
        </p>
        <p className="text-sm text-muted-foreground">
          <Trans>Fără o valoare recentă pentru selecția curentă.</Trans>
        </p>
        {absent.period || absent.valueStatus ? (
          <p className="text-sm text-muted-foreground">
            {absent.period ? formatHubPeriod(absent.period) : null}
            {absent.valueStatus
              ? `${absent.period ? ' · ' : ''}${describeValueStatus(absent.valueStatus)}`
              : null}
          </p>
        ) : null}
      </div>
    )
  }

  return (
    <div className="@container" data-testid="series-summary">
      <dl className={statisticsTheme.factGrid}>
        <LatestValueTile
          value={stats.latest === null ? '—' : formatValue(stats.latest)}
          unit={unitWord}
          period={stats.latest ? formatHubPeriod(stats.latest.period) : null}
          valueStatus={valueStatus ?? null}
          valueTestId="series-latest-value"
        />
        {stats.latest ? (
          <>
            <FactTile
              label={t`minim`}
              value={stats.trough ? formatValue(stats.trough) : '—'}
              caption={
                stats.trough ? (
                  <PeriodPhrase period={formatHubPeriod(stats.trough.period)} />
                ) : null
              }
            />
            <FactTile
              label={t`maxim`}
              value={stats.peak ? formatValue(stats.peak) : '—'}
              caption={
                stats.peak ? (
                  <PeriodPhrase period={formatHubPeriod(stats.peak.period)} />
                ) : null
              }
            />
            <FactTile
              label={t`medie`}
              value={stats.mean === null ? '—' : formatDerived(stats.mean)}
            />
          </>
        ) : null}
      </dl>
    </div>
  )
}
