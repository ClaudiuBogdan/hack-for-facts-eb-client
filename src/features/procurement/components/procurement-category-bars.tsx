import { useState } from 'react'
import { Link, useSearch } from '@tanstack/react-router'
import { Trans } from '@lingui/react/macro'
import { t } from '@lingui/core/macro'
import { ArrowUpRight, ChevronDown, ChevronUp, X } from 'lucide-react'
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
  type ProcurementHubMeasure,
  type ProcurementRankDim,
  type ProcurementRankBy,
} from '@/schemas/procurement-hub'
import { formatFlowCount, formatRon } from '../lib/formatting'
import {
  procurementMarkClassName,
  procurementSectionBodyClassName,
  procurementSectionClassName,
  procurementSectionDescriptionClassName,
  procurementSectionFooterClassName,
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

/**
 * Turns the breakdown into the page's CPV filter: each row toggles the
 * division on the surface that owns it, instead of linking away to the CPV
 * category page. The institution profile uses this so the card that already
 * shows counts and values per division IS the filter — a second, truncated
 * chip row at the top of the page said the same thing worse.
 */
export type CategorySelection = {
  /** CPV division currently filtering the page, or null when unfiltered. */
  readonly activeCode: string | null
  /** Called with the division to apply, or null to clear. */
  readonly onSelect: (code: string | null) => void
}

type Props = {
  readonly rows: readonly CategoryRow[]
  readonly title?: string
  readonly description?: string
  readonly className?: string
  /** Tighter card gutters for constrained surfaces such as map drawers. */
  readonly compact?: boolean
  /** Deep-link to hub Rankings for CPV. */
  readonly rankingsDim?: ProcurementRankDim
  /** Exact hub search for that deep-link (see party ranking). */
  readonly rankingsSearch?: Record<string, unknown>
  readonly measure?: ProcurementHubMeasure
  readonly rankedBy?: ProcurementRankBy | null
  readonly select?: CategorySelection
}

/**
 * CPV division breakdown — primary metric + secondary context to the right of
 * the name. Overview uses a Rankings deep-link; other surfaces keep a sheet.
 */
export function ProcurementCategoryBars({
  rows,
  title,
  description,
  className,
  compact = false,
  rankingsDim,
  rankingsSearch,
  measure = 'record_count',
  rankedBy,
  select,
}: Props) {
  const [expanded, setExpanded] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)
  const currentSearch = useSearch({ strict: false })
  const effectiveMeasure =
    measure === 'value_awarded' && rankedBy === 'value'
      ? 'value_awarded'
      : 'record_count'
  const hasMore = rows.length > CARD_LIMIT
  const displayRows =
    expanded || !hasMore ? rows : rows.slice(0, CARD_LIMIT)

  return (
    <section
      className={cn(procurementSectionClassName, 'flex h-full flex-col', className)}
    >
      <div
        className={cn(
          procurementSectionHeaderClassName,
          compact && 'px-4 py-4 sm:px-4 sm:py-4',
        )}
      >
        <h2 className={procurementSectionTitleClassName}>
          {title ?? t`Spending categories`}
        </h2>
        <p className={procurementSectionDescriptionClassName}>
          {select
            ? `${description ?? t`By number of records.`} ${t`Apasă o categorie pentru a filtra pagina.`}`
            : (description ?? t`By number of records.`)}
        </p>
      </div>

      <div
        className={cn(
          procurementSectionBodyClassName,
          'flex-1',
          compact && 'px-4 py-3 sm:px-4 sm:py-3',
        )}
      >
        {rows.length === 0 ? (
          <p className="text-sm text-[var(--pnrr-muted)]">
            {select?.activeCode ? (
              // Not "no data": the page is scoped to one division, so a
              // per-division breakdown of it has exactly one bucket and the
              // server serves it as stats instead.
              <Trans>
                Pagina este filtrată la o singură categorie, așa că defalcarea
                pe categorii nu se aplică aici.
              </Trans>
            ) : (
              <Trans>No category data available.</Trans>
            )}
          </p>
        ) : (
          <ol
            className={cn(
              'space-y-1',
              expanded && hasMore && 'sm:max-h-[28rem] sm:overflow-y-auto',
            )}
          >
            {displayRows.map((row, index) => {
              const label = categoryLabel(row)
              const code = row.cpvDivisionCode
              const countLabel = formatFlowCount(row.flowCount)
              const amountLabel =
                row.amountRonSum !== null
                  ? formatRon(row.amountRonSum, 'compact')
                  : null
              const primaryLabel =
                effectiveMeasure === 'value_awarded'
                  ? amountLabel ?? t`unavailable`
                  : t`${countLabel} records`
              const shareRaw =
                row.shareOfScope !== null
                  ? (Number(row.shareOfScope) || 0) * 100
                  : null
              const share = shareRaw !== null ? Math.round(shareRaw) : null
              const shareLabel =
                shareRaw !== null
                  ? share === 0 && shareRaw > 0
                    ? '<1%'
                    : `${share}%`
                  : null
              const secondaryBase =
                effectiveMeasure === 'value_awarded'
                  ? t`${countLabel} records`
                  : amountLabel
              const secondaryLabel =
                secondaryBase !== null && shareLabel !== null
                  ? `${secondaryBase} · ${shareLabel}`
                  : secondaryBase
              const titleHint = code ? `${code} · ${label}` : label
              const metricsAria =
                shareLabel === null
                  ? secondaryBase
                    ? t`${label}: ${primaryLabel}, ${secondaryBase}`
                    : t`${label}: ${primaryLabel}`
                  : secondaryBase
                    ? t`${label}: ${primaryLabel}, ${secondaryBase} (${shareLabel} of scope)`
                    : t`${label}: ${primaryLabel} (${shareLabel} of scope)`

              const isSelected = code !== null && select?.activeCode === code
              const name = (
                <span
                  className={cn(
                    'min-w-0 text-base leading-6 sm:truncate',
                    isSelected
                      ? 'font-bold text-[#1d70b8] dark:text-[#3b82f6]'
                      : 'font-semibold text-[var(--pnrr-fg)]',
                  )}
                >
                  {label}
                </span>
              )

              const rowBody = (
                <>
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="w-5 shrink-0 text-right text-sm font-semibold leading-6 tabular-nums text-[var(--pnrr-muted)]">
                      {index + 1}
                    </span>
                    {select ? (
                      <span className="min-w-0 sm:truncate" title={titleHint}>
                        {name}
                      </span>
                    ) : code ? (
                      <Link
                        to="/procurement/categories/$code"
                        params={{ code }}
                        className="min-w-0 underline-offset-2 hover:underline sm:truncate"
                        title={titleHint}
                      >
                        {name}
                      </Link>
                    ) : (
                      <span className="min-w-0 sm:truncate" title={titleHint}>
                        {name}
                      </span>
                    )}
                  </div>
                  <div
                    className="shrink-0 text-right tabular-nums"
                    aria-label={metricsAria}
                  >
                    <div className="text-sm font-bold leading-5 text-[var(--pnrr-fg)]">
                      {primaryLabel}
                    </div>
                    {secondaryLabel ? (
                      <div className="mt-0.5 text-xs leading-4 text-[var(--pnrr-muted)]">
                        {secondaryLabel}
                      </div>
                    ) : null}
                  </div>
                </>
              )

              return (
                <li key={code ?? `row-${index}`} className="relative min-w-0">
                  {/* Inline proportion fill — magnitude at a glance, no chart
                      library (PNRR RankedListCard pattern). */}
                  {shareRaw !== null && shareRaw > 0 ? (
                    <span
                      aria-hidden
                      className={cn(
                        procurementMarkClassName,
                        'pointer-events-none absolute inset-y-0 left-0 opacity-10 dark:opacity-20',
                      )}
                      style={{ width: `${shareRaw}%` }}
                    />
                  ) : null}
                  {select && code !== null ? (
                    <button
                      type="button"
                      aria-pressed={isSelected}
                      onClick={() => select.onSelect(isSelected ? null : code)}
                      title={
                        isSelected
                          ? t`Elimină filtrul ${label}`
                          : t`Filtrează după ${label}`
                      }
                      className={cn(
                        'relative flex w-full items-start justify-between gap-3 border-l-4 border-transparent px-1.5 py-1.5 text-left transition-colors hover:bg-[#f3f2f1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--pnrr-blue)] dark:hover:bg-[var(--pnrr-subtle)] sm:gap-4',
                        isSelected &&
                          'border-l-[#1d70b8] dark:border-l-[#3b82f6]',
                      )}
                    >
                      {rowBody}
                    </button>
                  ) : (
                    <div className="relative flex items-start justify-between gap-3 px-1.5 py-1.5 sm:gap-4">
                      {rowBody}
                    </div>
                  )}
                </li>
              )
            })}
          </ol>
        )}
      </div>

      {hasMore || rows.length > 0 || select?.activeCode ? (
        <div
          className={cn(
            procurementSectionFooterClassName,
            'flex flex-wrap items-center justify-between gap-x-4 gap-y-1',
            compact && 'px-4 sm:px-4',
          )}
        >
          {select?.activeCode ? (
            // A filtered card lists only the division it is filtered to, so
            // the way back has to live here — not only in the header chip.
            <button
              type="button"
              onClick={() => select.onSelect(null)}
              className="inline-flex h-8 items-center gap-1.5 text-sm font-semibold text-[var(--pnrr-fg)] underline underline-offset-2 transition-colors hover:text-[var(--pnrr-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pnrr-blue)]"
            >
              <X className="h-3.5 w-3.5" aria-hidden />
              <Trans>Toate categoriile</Trans>
            </button>
          ) : hasMore ? (
            <button
              type="button"
              onClick={() => setExpanded((value) => !value)}
              className="inline-flex h-8 items-center gap-1.5 text-sm font-semibold text-[var(--pnrr-muted)] transition-colors hover:text-[var(--pnrr-fg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pnrr-blue)]"
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
          ) : (
            <span aria-hidden />
          )}
          {rows.length > 0 ? (
            rankingsDim ? (
              <Link
                to="/procurement"
                search={cleanProcurementHubSearch({
                  ...(rankingsSearch ??
                    (currentSearch as Record<string, unknown>)),
                  view: 'rankings',
                  rankDim: rankingsDim,
                  rankBy: measure === 'value_awarded' ? 'value' : 'count',
                })}
                className="inline-flex h-8 items-center gap-1 text-sm font-semibold text-[var(--pnrr-fg)] underline-offset-2 transition-colors hover:text-[var(--pnrr-muted)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pnrr-blue)]"
              >
                <Trans>Vezi clasamentul complet</Trans>
                <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => setSheetOpen(true)}
                className="inline-flex h-8 items-center gap-1 text-sm font-semibold text-[var(--pnrr-fg)] underline-offset-2 transition-colors hover:text-[var(--pnrr-muted)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pnrr-blue)]"
              >
                <Trans>Open full table</Trans>
                <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
              </button>
            )
          ) : null}
        </div>
      ) : null}

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
