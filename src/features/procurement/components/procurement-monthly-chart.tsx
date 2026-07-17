import { Trans } from '@lingui/react/macro'
import { t } from '@lingui/core/macro'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import type { MonthlyPoint } from '@/schemas/procurement'
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
 * Monthly volume as single-series CSS columns — count is the primary metric
 * (available amounts follow in the tooltip/table). One mark hue,
 * columns grow from the baseline, per-mark tooltip, `<details>` table.
 */
export function ProcurementMonthlyChart({
  points,
  title,
  description,
  className,
}: Props) {
  const maxCount = points.reduce(
    (max, point) => Math.max(max, Number(point.flowCount) || 0),
    0,
  )
  const missingTotal = points.reduce(
    (sum, point) => sum + (Number(point.amountMissingCount) || 0),
    0,
  )
  const showAmounts = points.some((point) => point.amountRonSum !== null)

  return (
    <section className={cn(procurementSectionClassName, className)}>
      <div className={procurementSectionHeaderClassName}>
        <h2 className={procurementSectionTitleClassName}>
          {title ?? t`Monthly volume`}
        </h2>
        <p className={procurementSectionDescriptionClassName}>
          {description ?? t`Number of records per month.`}
        </p>
      </div>
      <div className="p-5 sm:p-6">
        {points.length === 0 ? (
          <p className="text-sm text-[var(--pnrr-muted)]">
            <Trans>No monthly data available.</Trans>
          </p>
        ) : (
          <>
            <div
              className="flex h-40 items-end gap-[2px]"
              role="img"
              aria-label={t`Monthly record counts`}
            >
              {points.map((point) => {
                const count = Number(point.flowCount) || 0
                const height =
                  maxCount > 0 ? Math.max((count / maxCount) * 100, 2) : 0
                return (
                  <Tooltip key={point.month}>
                    <TooltipTrigger asChild>
                      <div
                        className={cn(
                          'flex h-full flex-1 items-end',
                          procurementMarkTrackClassName,
                        )}
                        tabIndex={0}
                        aria-label={t`${formatMonth(point.month)}: ${formatFlowCount(point.flowCount)} records`}
                      >
                        <div
                          className={cn(
                            'w-full rounded-t-[4px]',
                            procurementMarkClassName,
                          )}
                          style={{ height: `${height}%` }}
                        />
                      </div>
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
