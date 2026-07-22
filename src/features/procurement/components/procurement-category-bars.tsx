import { useState } from 'react'
import { Link, useSearch } from '@tanstack/react-router'
import { Trans } from '@lingui/react/macro'
import { t } from '@lingui/core/macro'
import { ChevronDown, ChevronUp, ListOrdered, Table2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import type { CategoryRow } from '@/schemas/procurement'
import {
  cleanProcurementHubSearch,
  type ProcurementRankDim,
} from '@/schemas/procurement-hub'
import { formatFlowCount, formatRon } from '../lib/formatting'
import {
  procurementMarkClassName,
  procurementMarkTrackClassName,
  procurementOutlineButtonClassName,
  procurementSectionClassName,
  procurementSectionDescriptionClassName,
  procurementSectionHeaderClassName,
  procurementSectionTitleClassName,
} from '../lib/procurement-theme'

/**
 * Overview CPV glance deep-links to Rankings. Other surfaces keep a local sheet.
 * CPV code labels + top-100 depth are live on the Rankings hub (cpvLevel=code).
 */

const CARD_LIMIT = 5

function categoryLabel(row: CategoryRow): string {
  if (row.bucketKind === 'other') return t`Other CPV divisions`
  if (row.bucketKind === 'unknown') return t`Unknown CPV division`
  return (
    row.cpvDivisionLabelRo ??
    row.cpvDivisionLabelEn ??
    row.cpvDivisionCode ??
    t`Unknown CPV division`
  )
}

type Props = {
  readonly rows: readonly CategoryRow[]
  readonly title?: string
  readonly description?: string
  readonly className?: string
  /** Deep-link to hub Rankings for CPV. */
  readonly rankingsDim?: ProcurementRankDim
}

/**
 * CPV division breakdown — count-first bars, show 5 + more/less.
 * Overview uses Rankings deep-link; other surfaces keep a sheet.
 */
export function ProcurementCategoryBars({
  rows,
  title,
  description,
  className,
  rankingsDim,
}: Props) {
  const [expanded, setExpanded] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)
  const currentSearch = useSearch({ strict: false })
  const totalCount = rows.reduce(
    (sum, row) => sum + (Number(row.flowCount) || 0),
    0,
  )
  const maxCount = rows.reduce(
    (max, row) => Math.max(max, Number(row.flowCount) || 0),
    0,
  )
  const hasMore = rows.length > CARD_LIMIT
  const displayRows =
    expanded || !hasMore ? rows : rows.slice(0, CARD_LIMIT)

  return (
    <section className={cn(procurementSectionClassName, className)}>
      <div
        className={cn(
          procurementSectionHeaderClassName,
          'flex items-start justify-between gap-3',
        )}
      >
        <div className="min-w-0">
          <h2 className={procurementSectionTitleClassName}>
            {title ?? t`Spending categories`}
          </h2>
          <p className={procurementSectionDescriptionClassName}>
            {description ?? t`By number of records.`}
          </p>
        </div>
        {rows.length > 0 ? (
          rankingsDim ? (
            <Button
              type="button"
              variant="outline"
              size="icon"
              className={cn(procurementOutlineButtonClassName, 'h-8 w-8 shrink-0')}
              asChild
            >
              <Link
                to="/procurement"
                search={cleanProcurementHubSearch({
                  ...(currentSearch as Record<string, unknown>),
                  view: 'rankings',
                  rankDim: rankingsDim,
                })}
                aria-label={t`See full rankings`}
                title={t`See full rankings`}
              >
                <ListOrdered className="h-4 w-4" aria-hidden />
              </Link>
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="icon"
              className={cn(procurementOutlineButtonClassName, 'h-8 w-8 shrink-0')}
              onClick={() => setSheetOpen(true)}
              aria-label={t`Open ranking table`}
              title={t`Open ranking table`}
            >
              <Table2 className="h-4 w-4" aria-hidden />
            </Button>
          )
        ) : null}
      </div>

      <div className="flex flex-col p-5 sm:p-6">
        {rows.length === 0 ? (
          <p className="text-sm text-[var(--pnrr-muted)]">
            <Trans>No category data available.</Trans>
          </p>
        ) : (
          <ol
            className={cn(
              'space-y-3',
              expanded && hasMore && 'sm:max-h-[28rem] sm:overflow-y-auto',
            )}
          >
            {displayRows.map((row, index) => {
              const count = Number(row.flowCount) || 0
              const width =
                maxCount > 0 ? Math.max((count / maxCount) * 100, 2) : 0
              const share =
                totalCount > 0 ? Math.round((count / totalCount) * 100) : 0
              const label = categoryLabel(row)
              const code = row.cpvDivisionCode
              const countLabel = formatFlowCount(row.flowCount)
              const titleHint = code ? `${code} · ${label}` : label

              const name = (
                <span className="min-w-0 truncate text-sm font-semibold text-[var(--pnrr-fg)]">
                  {label}
                </span>
              )

              return (
                <li key={code ?? `row-${index}`} className="min-w-0">
                  <div className="flex items-baseline gap-2.5">
                    <span className="w-5 shrink-0 text-xs font-semibold tabular-nums text-[var(--pnrr-muted)]">
                      {index + 1}
                    </span>
                    <div className="flex min-w-0 flex-1 items-baseline justify-between gap-3">
                      {code ? (
                        <Link
                          to="/procurement/categories/$code"
                          params={{ code }}
                          className="min-w-0 truncate underline-offset-2 hover:underline"
                          title={titleHint}
                        >
                          {name}
                        </Link>
                      ) : (
                        <span className="min-w-0 truncate" title={titleHint}>
                          {name}
                        </span>
                      )}
                      <span className="shrink-0 text-right text-sm tabular-nums">
                        <span className="font-bold text-[var(--pnrr-fg)]">
                          {share}%
                        </span>
                        <span className="mx-1.5 text-[var(--pnrr-muted)]" aria-hidden>
                          ·
                        </span>
                        <span className="text-[var(--pnrr-muted)]">
                          {countLabel}
                        </span>
                      </span>
                    </div>
                  </div>
                  <div
                    className={cn(
                      'ml-7 mt-1.5 h-1.5 w-[calc(100%-1.75rem)]',
                      procurementMarkTrackClassName,
                    )}
                    role="img"
                    aria-label={t`${label}: ${countLabel} records (${share}%)`}
                  >
                    <div
                      className={cn(
                        'h-full rounded-r-[4px]',
                        procurementMarkClassName,
                      )}
                      style={{ width: `${width}%` }}
                    />
                  </div>
                </li>
              )
            })}
          </ol>
        )}

        {hasMore ? (
          <div className="mt-auto border-t-2 border-[var(--pnrr-border)] pt-0">
            <button
              type="button"
              onClick={() => setExpanded((value) => !value)}
              className="mt-3 flex min-h-9 w-full items-center justify-center gap-2 text-sm font-semibold text-[var(--pnrr-muted)] transition-colors hover:text-[var(--pnrr-fg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pnrr-blue)]"
            >
              {expanded ? (
                <>
                  <Trans>Show less</Trans>
                  <ChevronUp className="h-3.5 w-3.5" aria-hidden />
                </>
              ) : (
                <>
                  <Trans>Show more</Trans>
                  <ChevronDown className="h-3.5 w-3.5" aria-hidden />
                </>
              )}
            </button>
          </div>
        ) : null}
      </div>

      {!rankingsDim ? (
        <CategoryRankingSheet
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          title={title ?? t`Spending categories`}
          rows={rows}
        />
      ) : null}
    </section>
  )
}

function CategoryRankingSheet({
  open,
  onOpenChange,
  title,
  rows,
}: {
  readonly open: boolean
  readonly onOpenChange: (open: boolean) => void
  readonly title: string
  readonly rows: readonly CategoryRow[]
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        className="flex w-full max-w-full flex-col gap-0 overflow-hidden border-l-2 border-[var(--pnrr-border)] bg-background p-0 sm:max-w-lg"
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        <SheetHeader className="border-b-2 border-[var(--pnrr-border)] p-6 pr-14 text-left">
          <SheetTitle className="text-left text-2xl font-black tracking-tight text-[var(--pnrr-fg)]">
            {title}
          </SheetTitle>
          <SheetDescription className="pt-1 text-left text-sm text-[var(--pnrr-muted)]">
            <Trans>Top {rows.length} for the current filters.</Trans>
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-[var(--pnrr-border)] text-left">
                <th className="py-2 pr-2 font-bold tabular-nums">#</th>
                <th className="py-2 pr-2 font-bold">
                  <Trans>CPV division</Trans>
                </th>
                <th className="py-2 pr-2 text-right font-bold">
                  <Trans>Records</Trans>
                </th>
                <th className="py-2 text-right font-bold">
                  <Trans>RON total</Trans>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => {
                const label = categoryLabel(row)
                const code = row.cpvDivisionCode
                return (
                  <tr
                    key={code ?? index}
                    className="border-b border-[var(--pnrr-border)]/40"
                  >
                    <td className="py-2.5 pr-2 tabular-nums text-[var(--pnrr-muted)]">
                      {index + 1}
                    </td>
                    <td className="py-2.5 pr-2">
                      {code ? (
                        <Link
                          to="/procurement/categories/$code"
                          params={{ code }}
                          className="font-semibold text-[var(--pnrr-fg)] underline-offset-2 hover:underline"
                          onClick={() => onOpenChange(false)}
                        >
                          {label}
                        </Link>
                      ) : (
                        <span className="font-semibold">{label}</span>
                      )}
                      {code ? (
                        <span className="mt-0.5 block text-xs text-[var(--pnrr-muted)]">
                          {code}
                        </span>
                      ) : null}
                    </td>
                    <td className="py-2.5 pr-2 text-right tabular-nums">
                      {formatFlowCount(row.flowCount)}
                    </td>
                    <td className="py-2.5 text-right tabular-nums">
                      {row.amountRonSum !== null
                        ? formatRon(row.amountRonSum, 'compact')
                        : t`unavailable`}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </SheetContent>
    </Sheet>
  )
}
