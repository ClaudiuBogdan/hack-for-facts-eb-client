import { Trans } from '@lingui/react/macro'
import { t } from '@lingui/core/macro'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import type { MonthlyPoint } from '@/schemas/procurement'
import type { ProcurementHubMeasure } from '@/schemas/procurement-hub'
import { formatFlowCount, formatRon } from '../lib/formatting'
import {
  procurementMarkClassName,
  procurementMarkTrackClassName,
  procurementSectionClassName,
  procurementSectionDescriptionClassName,
  procurementSectionHeaderClassName,
  procurementSectionTitleClassName,
} from '../lib/procurement-theme'

type Props = {
  readonly points: readonly MonthlyPoint[]
  readonly title?: string
  readonly description?: string
  readonly className?: string
  /** Tighter card gutters for constrained surfaces such as map drawers. */
  readonly compact?: boolean
  readonly measure?: ProcurementHubMeasure
  /**
   * Name of the money series when it is not the default awarded value
   * (value-basis wave: estimated / ceiling / call-off / adjusted money).
   */
  readonly valueLabel?: string
  /**
   * Turns the columns into a period picker: clicking a month scopes the page
   * to it, clicking it again clears. The series itself must stay on the
   * surrounding period, or selecting a month would leave one column and no
   * way to reach its neighbour.
   */
  readonly select?: {
    readonly activeMonth: string | null
    readonly onSelect: (month: string | null) => void
  }
}

function formatMonth(month: string): string {
  const [year, m] = month.split('-')
  return new Intl.DateTimeFormat('ro-RO', {
    month: 'short',
    year: '2-digit',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(Number(year), Number(m) - 1, 1)))
}

/**
 * Monthly count or awarded-value series as CSS columns. The alternate metric
 * remains available in tooltips/table for context. One mark hue, columns grow
 * from the baseline, per-mark tooltip, `<details>` table.
 */
export function ProcurementMonthlyChart({
  points,
  title,
  description,
  className,
  compact = false,
  measure = 'record_count',
  valueLabel,
  select,
}: Props) {
  const moneyName = valueLabel ?? t`Awarded value`
  const maxMetric = points.reduce(
    (max, point) =>
      Math.max(
        max,
        Number(
          measure === 'value_awarded'
            ? point.amountRonSum ?? '0'
            : point.flowCount,
        ) || 0,
      ),
    0,
  )
  const missingTotal = points.reduce(
    (sum, point) => sum + (Number(point.amountMissingCount) || 0),
    0,
  )
  const showAmounts = points.some((point) => point.amountRonSum !== null)
  const valueUnavailable = measure === 'value_awarded' && !showAmounts

  return (
    <section className={cn(procurementSectionClassName, className)}>
      <div
        className={cn(
          procurementSectionHeaderClassName,
          compact && 'px-4 py-4 sm:px-4 sm:py-4',
        )}
      >
        <h2 className={procurementSectionTitleClassName}>
          {title ?? t`Monthly volume`}
        </h2>
        <p className={procurementSectionDescriptionClassName}>
          {description ?? t`Number of records per month.`}
        </p>
      </div>
      <div
        className={cn(
          'p-5 sm:p-6',
          compact && 'px-4 py-3 sm:px-4 sm:py-3',
        )}
      >
        {points.length === 0 ? (
          <p className="text-sm text-[var(--pnrr-muted)]">
            <Trans>No monthly data available.</Trans>
          </p>
        ) : valueUnavailable ? (
          <p className="border-l-4 border-amber-500 pl-3 text-sm leading-6 text-[var(--pnrr-muted)]">
            <Trans>
              {moneyName} is unavailable for this scope. Select record count
              to view the monthly volume.
            </Trans>
          </p>
        ) : (
          <>
            <div
              className="flex h-40 items-end gap-[2px]"
              role="img"
              aria-label={
                measure === 'value_awarded'
                  ? t`Monthly ${moneyName.toLocaleLowerCase()} in RON`
                  : t`Monthly record counts`
              }
            >
              {points.map((point) => {
                const count = Number(point.flowCount) || 0
                const amount = Number(point.amountRonSum ?? '0') || 0
                const metric = measure === 'value_awarded' ? amount : count
                const height =
                  maxMetric > 0 ? Math.max((metric / maxMetric) * 100, 2) : 0
                const amountLabel =
                  point.amountRonSum !== null
                    ? formatRon(point.amountRonSum, 'compact')
                    : t`unavailable`
                const isSelected = select?.activeMonth === point.month
                const metricLabel =
                  measure === 'value_awarded'
                    ? t`${formatMonth(point.month)}: ${amountLabel}`
                    : t`${formatMonth(point.month)}: ${formatFlowCount(point.flowCount)} records`
                const column = (
                  <div
                    className={cn(
                      'w-full rounded-t-[4px] transition-opacity',
                      procurementMarkClassName,
                      // A selection dims the rest rather than recolouring the
                      // pick: one mark hue, and the state stays legible in
                      // greyscale via the track fill below.
                      select?.activeMonth && !isSelected && 'opacity-40',
                    )}
                    style={{ height: `${height}%` }}
                  />
                )
                return (
                  <Tooltip key={point.month}>
                    <TooltipTrigger asChild>
                      {select ? (
                        <button
                          type="button"
                          aria-pressed={isSelected}
                          aria-label={metricLabel}
                          onClick={() =>
                            select.onSelect(isSelected ? null : point.month)
                          }
                          className={cn(
                            'flex h-full flex-1 items-end transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--pnrr-blue)]',
                            isSelected
                              ? 'bg-[#1d70b8]/15 dark:bg-[#3b82f6]/25'
                              : cn(
                                  procurementMarkTrackClassName,
                                  'hover:bg-[#dfe3e6] dark:hover:bg-[var(--pnrr-subtle)]',
                                ),
                          )}
                        >
                          {column}
                        </button>
                      ) : (
                        <div
                          className={cn(
                            'flex h-full flex-1 items-end',
                            procurementMarkTrackClassName,
                          )}
                          tabIndex={0}
                          aria-label={metricLabel}
                        >
                          {column}
                        </div>
                      )}
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="font-semibold">{formatMonth(point.month)}</p>
                      <p>
                        <Trans>
                          {formatFlowCount(point.flowCount)} records
                        </Trans>
                      </p>
                      {showAmounts && point.amountRonSum !== null ? (
                        <p>{formatRon(point.amountRonSum, 'compact')}</p>
                      ) : null}
                    </TooltipContent>
                  </Tooltip>
                )
              })}
            </div>
            <div className="mt-1 flex justify-between text-xs text-[var(--pnrr-muted)]">
              <span>{formatMonth(points[0].month)}</span>
              <span>{formatMonth(points[points.length - 1].month)}</span>
            </div>
            {missingTotal > 0 ? (
              <p className="mt-2 text-xs text-[var(--pnrr-muted)]">
                <Trans>
                  {formatFlowCount(missingTotal)} records in this window have
                  no usable amount — counts stay authoritative, sums do not.
                </Trans>
              </p>
            ) : null}

            <details className="mt-4">
              <summary className="cursor-pointer text-sm font-semibold text-[var(--pnrr-muted)]">
                <Trans>View as table</Trans>
              </summary>
              <table className="mt-2 w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-[var(--pnrr-border)] text-left">
                    <th className="py-1 pr-2 font-bold">
                      <Trans>Month</Trans>
                    </th>
                    <th className="py-1 pr-2 text-right font-bold">
                      <Trans>Records</Trans>
                    </th>
                    {showAmounts ? (
                      <th className="py-1 text-right font-bold">
                        <Trans>RON total</Trans>
                      </th>
                    ) : null}
                  </tr>
                </thead>
                <tbody>
                  {points.map((point) => (
                    <tr
                      key={point.month}
                      className="border-b border-[var(--pnrr-border)]/30"
                    >
                      <td className="py-1 pr-2">{formatMonth(point.month)}</td>
                      <td className="py-1 pr-2 text-right tabular-nums">
                        {formatFlowCount(point.flowCount)}
                      </td>
                      {showAmounts ? (
                        <td className="py-1 text-right tabular-nums">
                          {point.amountRonSum !== null
                            ? formatRon(point.amountRonSum, 'compact')
                            : t`unavailable`}
                        </td>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </details>
          </>
        )}
      </div>
    </section>
  )
}
