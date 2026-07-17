import { Link } from '@tanstack/react-router'
import { Trans } from '@lingui/react/macro'
import { t } from '@lingui/core/macro'
import { cn } from '@/lib/utils'
import type { CategoryRow } from '@/schemas/procurement'
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
  readonly rows: readonly CategoryRow[]
  readonly title?: string
  readonly description?: string
  readonly className?: string
}

/**
 * CPV division breakdown as a ranked single-series bar list (replaces the
 * conic-gradient donut — 8+ slices are unreadable and the hex palette broke
 * dark mode). Bar length = record count; nominal categories share one mark
 * hue. Rows link to the category page; a semantic table rides in `<details>`.
 */
export function ProcurementCategoryBars({
  rows,
  title,
  description,
  className,
}: Props) {
  const totalCount = rows.reduce(
    (sum, row) => sum + (Number(row.flowCount) || 0),
    0,
  )
  const maxCount = rows.reduce(
    (max, row) => Math.max(max, Number(row.flowCount) || 0),
    0,
  )

  return (
    <section className={cn(procurementSectionClassName, className)}>
      <div className={procurementSectionHeaderClassName}>
        <h2 className={procurementSectionTitleClassName}>
          {title ?? t`Spending categories`}
        </h2>
        <p className={procurementSectionDescriptionClassName}>
          {description ??
            t`CPV divisions ranked by number of records — counts lead, amounts follow where coverage allows.`}
        </p>
      </div>
      <div className="p-5 sm:p-6">
        {rows.length === 0 ? (
          <p className="text-sm text-[var(--pnrr-muted)]">
            <Trans>No category data available.</Trans>
          </p>
        ) : (
          <ol className="space-y-4">
            {rows.map((row, index) => {
              const count = Number(row.flowCount) || 0
              const width = maxCount > 0 ? Math.max((count / maxCount) * 100, 2) : 0
              const share =
                totalCount > 0 ? Math.round((count / totalCount) * 100) : 0
              const label = row.bucketKind === 'other'
                ? t`Other CPV divisions`
                : row.bucketKind === 'unknown'
                  ? t`Unknown CPV division`
                  : row.cpvDivisionLabelRo ??
                    row.cpvDivisionLabelEn ??
                    row.cpvDivisionCode ??
                    t`Unknown CPV division`
              const code = row.cpvDivisionCode

              return (
                <li key={code ?? `row-${index}`} className="min-w-0">
                  <div className="flex items-baseline justify-between gap-3">
                    {code ? (
                      <Link
                        to="/procurement/categories/$code"
                        params={{ code }}
                        className="min-w-0 truncate text-sm font-semibold text-[var(--pnrr-fg)] underline-offset-2 hover:underline"
                      >
                        {code} · {label}
                      </Link>
                    ) : (
                      <span className="min-w-0 truncate text-sm font-semibold text-[var(--pnrr-fg)]">
                        {label}
                      </span>
                    )}
                    <span className="shrink-0 text-sm font-bold tabular-nums text-[var(--pnrr-fg)]">
                      {share}%
                    </span>
                  </div>
                  <div
                    className={cn('mt-1.5 h-5 w-full', procurementMarkTrackClassName)}
                    role="img"
                    aria-label={t`${label}: ${formatFlowCount(row.flowCount)} records (${share}%)`}
                  >
                    <div
                      className={cn('h-full rounded-r-[4px]', procurementMarkClassName)}
                      style={{ width: `${width}%` }}
                    />
                  </div>
                </li>
              )
            })}
          </ol>
        )}

        {rows.length > 0 ? (
          <details className="mt-4">
            <summary className="cursor-pointer text-sm font-semibold text-[var(--pnrr-muted)]">
              <Trans>View as table</Trans>
            </summary>
            <table className="mt-2 w-full text-sm">
              <thead>
                <tr className="border-b-2 border-[var(--pnrr-border)] text-left">
                  <th className="py-1 pr-2 font-bold">
                    <Trans>CPV division</Trans>
                  </th>
                  <th className="py-1 pr-2 text-right font-bold">
                    <Trans>Records</Trans>
                  </th>
                  <th className="py-1 text-right font-bold">
                    <Trans>RON total</Trans>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr
                    key={row.cpvDivisionCode ?? index}
                    className="border-b border-[var(--pnrr-border)]/30"
                  >
                    <td className="py-1 pr-2">
                      {row.cpvDivisionCode ? `${row.cpvDivisionCode} · ` : ''}
                      {row.bucketKind === 'other'
                        ? t`Other CPV divisions`
                        : row.bucketKind === 'unknown'
                          ? t`Unknown CPV division`
                          : row.cpvDivisionLabelRo ??
                            row.cpvDivisionLabelEn ??
                            row.cpvDivisionCode ??
                            t`Unknown CPV division`}
                    </td>
                    <td className="py-1 pr-2 text-right tabular-nums">
                      {formatFlowCount(row.flowCount)}
                    </td>
                    <td className="py-1 text-right tabular-nums">
                      {row.amountRonSum !== null
                        ? formatRon(row.amountRonSum, 'compact')
                        : t`unavailable`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        ) : null}
      </div>
    </section>
  )
}
