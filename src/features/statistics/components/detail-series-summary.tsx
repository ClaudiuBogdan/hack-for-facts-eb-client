import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { cn } from '@/lib/utils'
import { activeNumberLocale } from '../lib/format'
import { formatHubPeriod } from '../lib/hub-format'
import type { SeriesStats } from '../lib/series-stats'
import { describeValueStatus } from '../lib/value-status'
import { statisticsTheme } from '../lib/statistics-theme'

type Props = {
  readonly stats: SeriesStats
  /** The unit as a word („persoane", „%", „număr"); empty renders nothing. */
  readonly unitWord: string
  /** Rendered beside the figure when this page, not the server, chose the axes. */
  readonly matchChip?: 'representative' | null
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

/** A published value, in the active locale, at the precision INS published. */
function formatValue(value: number): string {
  return new Intl.NumberFormat(activeNumberLocale(), {
    maximumFractionDigits: 2,
  }).format(value)
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
 * Tier 0 — the latest value LARGE, and beside it the facts that give it scale.
 *
 * „10" alone says nothing: the same 10 is the lowest a series has ever gone or
 * an unremarkable year. The extremes, the mean and the count answer that in
 * the quiet tier, on the same baseline, so a reader never has to open anything
 * to know whether the headline number is news.
 *
 * The unit is the row's FIRST fact rather than a heading over it: given its
 * own column it is one more thing the series is, and it is stated once instead
 * of repeated after every figure („5 număr · 50 număr · 31,3 număr").
 */
export function DetailSeriesSummary({
  stats,
  unitWord,
  matchChip,
  absent,
  valueStatus,
}: Props) {
  const unit = unitWord.trim()

  if (absent) {
    return (
      <div className="space-y-1" data-testid="series-summary">
        <p className={statisticsTheme.sectionLabel}>
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
    <div
      className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4"
      data-testid="series-summary"
    >
      <div className="min-w-0">
        <p className={statisticsTheme.sectionLabel}>
          <Trans>Ultima valoare</Trans>
        </p>
        {/* The figure and its unit are ONE span: a flex gap between them lets
            them land on different lines, and „21.646.220" over „persoane" is
            two facts where there was one. The literal space matters too —
            adjacent text nodes with none are spoken as „10număr". */}
        <p className="mt-1.5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span
            className={statisticsTheme.heroValue}
            data-testid="series-latest-value"
          >
            {stats.latest === null ? '—' : formatValue(stats.latest.value)}
            {unit ? (
              <>
                {' '}
                <span className={cn(statisticsTheme.heroUnit, 'ml-0.5')}>
                  {unit}
                </span>
              </>
            ) : null}
          </span>
          {stats.latest ? (
            <span className="text-sm tabular-nums text-muted-foreground">
              {/* The dot lives INSIDE the period's span, so it travels with
                  what it separates instead of ending a wrapped line. Below
                  `sm` a long figure fills the line and the period drops to its
                  own, where a separator has nothing left to separate. */}
              <span
                aria-hidden
                className="mr-3 hidden text-muted-foreground/50 sm:inline"
              >
                ·
              </span>
              {formatHubPeriod(stats.latest.period)}
            </span>
          ) : null}
          {matchChip === 'representative' ? (
            <span className={statisticsTheme.warningChip}>
              <Trans>selecție reprezentativă</Trans>
            </span>
          ) : null}
          {valueStatus ? (
            <span className={statisticsTheme.provenanceChip}>
              <Trans>stare:</Trans> {valueStatus}
            </span>
          ) : null}
        </p>
      </div>

      {stats.latest ? (
        <dl className="flex flex-wrap items-end gap-x-6 gap-y-2">
          {unit ? <Fact label={t`unitate`} value={unit} /> : null}
          <Fact
            label={t`minim`}
            value={stats.trough ? formatValue(stats.trough.value) : '—'}
            period={stats.trough ? formatHubPeriod(stats.trough.period) : null}
          />
          <Fact
            label={t`maxim`}
            value={stats.peak ? formatValue(stats.peak.value) : '—'}
            period={stats.peak ? formatHubPeriod(stats.peak.period) : null}
          />
          <Fact
            label={t`medie`}
            value={stats.mean === null ? '—' : formatDerived(stats.mean)}
          />
          <Fact label={t`observații`} value={String(stats.count)} />
        </dl>
      ) : null}
    </div>
  )
}

/**
 * One fact: its name, its number, and the period that number belongs to.
 *
 * The dot between the value and its period is a real node, never
 * `before:content-['·']` — and it sits inside the period's span so it travels
 * with what it separates. It is `aria-hidden`: „5 dot 2021" is worse for a
 * screen reader than the run of two numbers the dot exists to break up.
 */
function Fact({
  label,
  value,
  period,
}: {
  readonly label: string
  readonly value: string
  readonly period?: string | null
}) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium tabular-nums">
        {value}
        {period ? (
          <span className="ml-1.5 font-normal text-muted-foreground">
            <span aria-hidden className="mr-1.5 text-muted-foreground/50">
              ·
            </span>
            {period}
          </span>
        ) : null}
      </dd>
    </div>
  )
}
