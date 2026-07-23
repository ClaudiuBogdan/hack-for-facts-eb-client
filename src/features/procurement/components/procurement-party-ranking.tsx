import { useState } from 'react'
import { Link, useSearch } from '@tanstack/react-router'
import { Trans } from '@lingui/react/macro'
import { t } from '@lingui/core/macro'
import { ArrowUpRight, ChevronDown, ChevronUp, Table2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import type { TopPartyRow } from '@/schemas/procurement'
import {
  cleanProcurementHubSearch,
  type ProcurementHubMeasure,
  type ProcurementRankDim,
  type ProcurementRankBy,
} from '@/schemas/procurement-hub'
import { formatFlowCount, formatRon } from '../lib/formatting'
import {
  partyLabel,
  partyPairSearchLink,
  partyProcurementLink,
  type AnalysisFlowGrain,
  type PartyKind,
  type PartyPairScope,
} from '../lib/party-links'
import {
  procurementOutlineButtonClassName,
  procurementSectionBodyClassName,
  procurementSectionClassName,
  procurementSectionDescriptionClassName,
  procurementSectionFooterClassName,
  procurementSectionHeaderClassName,
  procurementSectionTitleClassName,
} from '../lib/procurement-theme'

/**
 * Overview glance card deep-links to Rankings. Slice / territory / CPV pages
 * keep a local sheet table (no hub Rankings context).
 *
 * Value-sorted, top-100 leaderboards are live on the Rankings hub (rankBy).
 * Server offset pagination beyond that is not served yet — stays API-honest.
 */

const CARD_LIMIT = 5

function rankingLabel(row: TopPartyRow, kind: PartyKind): string {
  if (row.bucketKind === 'other') {
    return kind === 'authority' ? t`Other authorities` : t`Other suppliers`
  }
  if (row.bucketKind === 'unknown') {
    return kind === 'authority' ? t`Unknown authority` : t`Unknown supplier`
  }
  return partyLabel(kind === 'authority' ? row.authority : row.supplier)
}

type Props = {
  readonly title: string
  readonly description?: string
  readonly rows: readonly TopPartyRow[]
  readonly kind: PartyKind
  readonly className?: string
  /** Explicit matrix limitation for a scoped request; distinct from no rows. */
  readonly unavailableReason?: string
  /**
   * When set (institution/supplier slice), row links open pair Search sorted
   * by value instead of the counterpart party page.
   */
  readonly pairScope?: PartyPairScope
  /** Analysis grain for pair Search when `pairScope` is set. */
  readonly grain?: AnalysisFlowGrain
  /** Deep-link to hub Rankings for this dimension (Overview cards). */
  readonly rankingsDim?: ProcurementRankDim
  /** Requested overview metric. Defaults to count on reused slice cards. */
  readonly measure?: ProcurementHubMeasure
  /** Basis the server actually served after answerability gates. */
  readonly rankedBy?: ProcurementRankBy | null
}

/**
 * Ranked party list — primary metric + secondary context to the right of the
 * name. Overview uses a Rankings deep-link; other surfaces keep a sheet of the
 * same API rows.
 */
export function ProcurementPartyRanking({
  title,
  description,
  rows,
  kind,
  className,
  unavailableReason,
  pairScope,
  grain = 'direct_acquisition',
  rankingsDim,
  measure = 'record_count',
  rankedBy,
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
    <section className={cn(procurementSectionClassName, className)}>
      <div
        className={cn(
          procurementSectionHeaderClassName,
          'flex items-start justify-between gap-3',
        )}
      >
        <div className="min-w-0 pr-1">
          <h2 className={procurementSectionTitleClassName}>{title}</h2>
          {description ? (
            <p className={procurementSectionDescriptionClassName}>
              {description}
            </p>
          ) : null}
        </div>
        {rows.length > 0 && !unavailableReason ? (
          rankingsDim ? (
            <Button
              type="button"
              variant="outline"
              size="icon"
              className={cn(
                procurementOutlineButtonClassName,
                'mt-0.5 h-8 w-8 shrink-0',
              )}
              asChild
            >
              <Link
                to="/procurement"
                search={cleanProcurementHubSearch({
                  ...(currentSearch as Record<string, unknown>),
                  view: 'rankings',
                  rankDim: rankingsDim,
                  rankBy:
                    measure === 'value_awarded' ? 'value' : 'count',
                })}
                aria-label={t`See full rankings`}
                title={t`See full rankings`}
              >
                <ArrowUpRight className="h-4 w-4" aria-hidden />
              </Link>
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="icon"
              className={cn(
                procurementOutlineButtonClassName,
                'mt-0.5 h-8 w-8 shrink-0',
              )}
              onClick={() => setSheetOpen(true)}
              aria-label={t`Open ranking table`}
              title={t`Open ranking table`}
            >
              <Table2 className="h-4 w-4" aria-hidden />
            </Button>
          )
        ) : null}
      </div>

      <div className={procurementSectionBodyClassName}>
        {unavailableReason ? (
          <p className="border-l-4 border-amber-500 pl-3 text-sm leading-6 text-[var(--pnrr-muted)]">
            {unavailableReason}
          </p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-[var(--pnrr-muted)]">
            <Trans>No ranking data available.</Trans>
          </p>
        ) : (
          <ol
            className={cn(
              'space-y-3',
              expanded && hasMore && 'sm:max-h-[28rem] sm:overflow-y-auto',
            )}
          >
            {displayRows.map((row, index) => (
              <PartyRankingRow
                key={
                  (kind === 'authority'
                    ? row.authority?.cui
                    : row.supplier?.cui) ?? `${rankingLabel(row, kind)}-${index}`
                }
                rank={index + 1}
                row={row}
                kind={kind}
                measure={effectiveMeasure}
                pairScope={pairScope}
                grain={grain}
              />
            ))}
          </ol>
        )}
      </div>

      {hasMore && !unavailableReason ? (
        <div className={procurementSectionFooterClassName}>
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            className="flex h-8 w-full items-center justify-center gap-1.5 text-sm font-semibold text-[var(--pnrr-muted)] transition-colors hover:text-[var(--pnrr-fg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pnrr-blue)]"
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

      {!rankingsDim ? (
        <PartyRankingSheet
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          title={title}
          rows={rows}
          kind={kind}
          pairScope={pairScope}
          grain={grain}
        />
      ) : null}
    </section>
  )
}

function resolvePartyRowLink(
  row: TopPartyRow,
  kind: PartyKind,
  pairScope: PartyPairScope | undefined,
  grain: AnalysisFlowGrain,
):
  | { readonly mode: 'pair'; readonly link: NonNullable<ReturnType<typeof partyPairSearchLink>> }
  | { readonly mode: 'party'; readonly link: NonNullable<ReturnType<typeof partyProcurementLink>> }
  | null {
  const party = kind === 'authority' ? row.authority : row.supplier
  if (pairScope) {
    const pair = partyPairSearchLink({
      pairScope,
      counterpart: party,
      counterpartKind: kind,
      grain,
    })
    if (pair) return { mode: 'pair', link: pair }
  }
  const profile = partyProcurementLink(party, kind)
  if (profile) return { mode: 'party', link: profile }
  return null
}

function PartyRankingRow({
  rank,
  row,
  kind,
  measure,
  pairScope,
  grain,
}: {
  readonly rank: number
  readonly row: TopPartyRow
  readonly kind: PartyKind
  readonly measure: ProcurementHubMeasure
  readonly pairScope?: PartyPairScope
  readonly grain: AnalysisFlowGrain
}) {
  const party = kind === 'authority' ? row.authority : row.supplier
  const destination = resolvePartyRowLink(row, kind, pairScope, grain)
  const label = rankingLabel(row, kind)
  const cui = party?.cui?.trim() || null
  const amount =
    row.amountRonSum !== null ? formatRon(row.amountRonSum, 'compact') : null
  const countLabel = formatFlowCount(row.flowCount)
  const primaryLabel =
    measure === 'value_awarded'
      ? amount ?? t`unavailable`
      : t`${countLabel} records`
  const secondaryLabel =
    measure === 'value_awarded'
      ? t`${countLabel} records`
      : amount
  const titleHint =
    pairScope && cui
      ? t`${label} — shared records by value`
      : cui && label !== cui
        ? `${label} · CUI ${cui}`
        : label
  const metricsAria =
    measure === 'value_awarded'
      ? amount
        ? t`${label}: ${amount}, ${countLabel} records`
        : t`${label}: awarded value unavailable, ${countLabel} records`
      : amount
        ? t`${label}: ${countLabel} records, ${amount}`
        : t`${label}: ${countLabel} records`

  const name = (
    <span className="min-w-0 text-sm font-semibold leading-5 text-[var(--pnrr-fg)] sm:truncate">
      {label}
    </span>
  )

  return (
    <li className="min-w-0">
      <div className="flex items-start gap-2.5">
        <span className="w-5 shrink-0 pt-0.5 text-xs font-semibold tabular-nums text-[var(--pnrr-muted)]">
          {rank}
        </span>
        <div className="flex min-w-0 flex-1 items-start justify-between gap-4">
          {destination?.mode === 'pair' ? (
            <Link
              to={destination.link.to}
              search={destination.link.search}
              className="min-w-0 underline-offset-2 hover:underline sm:truncate"
              title={titleHint}
            >
              {name}
            </Link>
          ) : destination?.mode === 'party' ? (
            <Link
              to={destination.link.to}
              params={destination.link.params}
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
        </div>
      </div>
    </li>
  )
}

function PartyRankingSheet({
  open,
  onOpenChange,
  title,
  rows,
  kind,
  pairScope,
  grain,
}: {
  readonly open: boolean
  readonly onOpenChange: (open: boolean) => void
  readonly title: string
  readonly rows: readonly TopPartyRow[]
  readonly kind: PartyKind
  readonly pairScope?: PartyPairScope
  readonly grain: AnalysisFlowGrain
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
                  {kind === 'authority' ? (
                    <Trans>Authority</Trans>
                  ) : (
                    <Trans>Supplier</Trans>
                  )}
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
                const party =
                  kind === 'authority' ? row.authority : row.supplier
                const destination = resolvePartyRowLink(
                  row,
                  kind,
                  pairScope,
                  grain,
                )
                const label = rankingLabel(row, kind)
                return (
                  <tr
                    key={party?.cui ?? index}
                    className="border-b border-[var(--pnrr-border)]/40"
                  >
                    <td className="py-2.5 pr-2 tabular-nums text-[var(--pnrr-muted)]">
                      {index + 1}
                    </td>
                    <td className="py-2.5 pr-2">
                      {destination?.mode === 'pair' ? (
                        <Link
                          to={destination.link.to}
                          search={destination.link.search}
                          className="font-semibold text-[var(--pnrr-fg)] underline-offset-2 hover:underline"
                          onClick={() => onOpenChange(false)}
                        >
                          {label}
                        </Link>
                      ) : destination?.mode === 'party' ? (
                        <Link
                          to={destination.link.to}
                          params={destination.link.params}
                          className="font-semibold text-[var(--pnrr-fg)] underline-offset-2 hover:underline"
                          onClick={() => onOpenChange(false)}
                        >
                          {label}
                        </Link>
                      ) : (
                        <span className="font-semibold">{label}</span>
                      )}
                      {party?.cui && label !== party.cui ? (
                        <span className="mt-0.5 block text-xs text-[var(--pnrr-muted)]">
                          {party.cui}
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
