import { Link } from '@tanstack/react-router'
import { Trans } from '@lingui/react/macro'
import { t } from '@lingui/core/macro'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  PROCUREMENT_RANK_PAGE_SIZES,
  PROCUREMENT_RANKINGS_TOP_N,
  type ProcurementCpvLevel,
  type ProcurementHubState,
  type ProcurementRankDim,
  type ProcurementRankPageSize,
} from '@/schemas/procurement-hub'
import type { ProcurementLeaderboardRow } from '../api/procurement-leaderboard-api'
import { formatFlowCount, formatRon } from '../lib/formatting'
import {
  partyProcurementLink,
  type PartyKind,
} from '../lib/party-links'
import { rankingRowViewRecordsSearch } from '../lib/ranking-links'
import {
  procurementOutlineButtonClassName,
  procurementPaginationButtonClassName,
} from '../lib/procurement-theme'

function displayLabel(
  row: ProcurementLeaderboardRow,
  rankDim: ProcurementRankDim,
): string {
  if (row.label) return row.label
  if (row.bucketKind === 'other') {
    if (rankDim === 'buyer') return t`Other authorities`
    if (rankDim === 'supplier') return t`Other suppliers`
    return t`Other CPV`
  }
  if (rankDim === 'buyer') return t`Unknown authority`
  if (rankDim === 'supplier') return t`Unknown supplier`
  return t`Unknown CPV`
}

function formatShare(share: string | null): string | null {
  if (share === null) return null
  const value = Number(share)
  if (!Number.isFinite(value)) return null
  return `${(value * 100).toFixed(1)}%`
}

type Props = {
  readonly rows: readonly ProcurementLeaderboardRow[]
  readonly hubState: ProcurementHubState
  readonly rankDim: ProcurementRankDim
  readonly cpvLevel: ProcurementCpvLevel
  readonly rankPage: number
  readonly rankPageSize: ProcurementRankPageSize
  readonly onRankPageChange: (page: number) => void
  readonly onRankPageSizeChange: (size: ProcurementRankPageSize) => void
  readonly unavailableReason?: string
}

/**
 * Rankings table with client-simulated pagination over the top-50 payload.
 *
 * TODO(ClickHouse / server offset pagination): replace client slice over
 * topN=50 with a real paginated leaderboard query (page/pageSize → server).
 * Until then, UI pagination only windows the honest top-50 payload.
 */
export function ProcurementRankingTable({
  rows,
  hubState,
  rankDim,
  cpvLevel,
  rankPage,
  rankPageSize,
  onRankPageChange,
  onRankPageSizeChange,
  unavailableReason,
}: Props) {
  const totalRows = rows.length
  const totalPages = Math.max(1, Math.ceil(totalRows / rankPageSize))
  const clampedPage = Math.min(rankPage, totalPages)
  const startIndex = (clampedPage - 1) * rankPageSize
  const pageRows = rows.slice(startIndex, startIndex + rankPageSize)
  const partyKind: PartyKind | null =
    rankDim === 'buyer' ? 'authority' : rankDim === 'supplier' ? 'supplier' : null

  if (unavailableReason) {
    return (
      <p className="border-l-4 border-amber-500 pl-3 text-sm leading-6 text-[var(--pnrr-muted)]">
        {unavailableReason}
      </p>
    )
  }

  if (totalRows === 0) {
    return (
      <p className="text-sm text-[var(--pnrr-muted)]">
        <Trans>No ranking data available for the current filters.</Trans>
      </p>
    )
  }

  const shownCount = pageRows.length
  const maxRank = PROCUREMENT_RANKINGS_TOP_N

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto border-2 border-[var(--pnrr-border)]">
        <table className="w-full min-w-[40rem] text-sm">
          <thead>
            <tr className="border-b-2 border-[var(--pnrr-border)] bg-[var(--pnrr-bg)] text-left">
              <th className="px-3 py-2.5 font-bold tabular-nums">#</th>
              <th className="px-3 py-2.5 font-bold">
                {rankDim === 'buyer' ? (
                  <Trans>Authority</Trans>
                ) : rankDim === 'supplier' ? (
                  <Trans>Supplier</Trans>
                ) : (
                  <Trans>CPV</Trans>
                )}
              </th>
              <th className="px-3 py-2.5 text-right font-bold">
                <Trans>Records</Trans>
              </th>
              <th className="px-3 py-2.5 text-right font-bold">
                <Trans>Share of scope</Trans>
              </th>
              <th className="px-3 py-2.5 text-right font-bold">
                <Trans>Awarded value</Trans>
              </th>
              <th className="px-3 py-2.5 text-right font-bold">
                <Trans>Actions</Trans>
              </th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map((row, index) => {
              const rank = startIndex + index + 1
              const label = displayLabel(row, rankDim)
              const share = formatShare(row.shareOfScope)
              const amount =
                row.valueAwardedSum !== null
                  ? formatRon(row.valueAwardedSum, 'compact')
                  : null
              const profile =
                partyKind && row.key
                  ? partyProcurementLink(
                      { cui: row.key, name: row.label, displayName: null },
                      partyKind,
                    )
                  : null
              const listSearch = rankingRowViewRecordsSearch({
                hubState,
                rankDim,
                cpvLevel,
                rowKey: row.key,
              })

              return (
                <tr
                  key={`${row.key ?? row.bucketKind}-${rank}`}
                  className="border-b border-[var(--pnrr-border)]/40"
                >
                  <td className="px-3 py-2.5 tabular-nums text-[var(--pnrr-muted)]">
                    {rank}
                  </td>
                  <td className="px-3 py-2.5">
                    {profile ? (
                      <Link
                        to={profile.to}
                        params={profile.params}
                        className="font-semibold text-[var(--pnrr-fg)] underline-offset-2 hover:underline"
                      >
                        {label}
                      </Link>
                    ) : (
                      <span className="font-semibold text-[var(--pnrr-fg)]">
                        {label}
                      </span>
                    )}
                    {row.secondaryLabel ? (
                      <span className="mt-0.5 block text-xs text-[var(--pnrr-muted)]">
                        {partyKind
                          ? t`CUI ${row.secondaryLabel}`
                          : row.secondaryLabel}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-3 py-2.5 text-right font-bold tabular-nums">
                    {formatFlowCount(row.recordCount)}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-[var(--pnrr-muted)]">
                    {share ?? '—'}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-[var(--pnrr-muted)]">
                    {amount ?? '—'}
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    {listSearch ? (
                      <Link
                        to="/procurement"
                        search={listSearch}
                        className="text-xs font-semibold text-[var(--pnrr-blue)] underline-offset-2 hover:underline"
                      >
                        <Trans>View records</Trans>
                      </Link>
                    ) : (
                      <span className="text-xs text-[var(--pnrr-muted)]">—</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-[var(--pnrr-muted)]">
          {t`Showing ${shownCount} of ${totalRows} (up to ${maxRank} for the current filters).`}
        </p>

        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 text-sm text-[var(--pnrr-muted)]">
            <span>
              <Trans>Page size</Trans>
            </span>
            <select
              className="border-2 border-[var(--pnrr-border)] bg-background px-2 py-1 text-sm font-semibold text-[var(--pnrr-fg)]"
              value={rankPageSize}
              onChange={(event) =>
                onRankPageSizeChange(
                  Number(event.target.value) as ProcurementRankPageSize,
                )
              }
            >
              {PROCUREMENT_RANK_PAGE_SIZES.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </label>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className={cn(procurementOutlineButtonClassName, procurementPaginationButtonClassName)}
            disabled={clampedPage <= 1}
            onClick={() => onRankPageChange(clampedPage - 1)}
            aria-label={t`Previous page`}
          >
            <ChevronLeft className="h-4 w-4" aria-hidden />
          </Button>
          <span className="text-sm tabular-nums text-[var(--pnrr-muted)]">
            {clampedPage} / {totalPages}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={cn(procurementOutlineButtonClassName, procurementPaginationButtonClassName)}
            disabled={clampedPage >= totalPages}
            onClick={() => onRankPageChange(clampedPage + 1)}
            aria-label={t`Next page`}
          >
            <ChevronRight className="h-4 w-4" aria-hidden />
          </Button>
        </div>
      </div>
    </div>
  )
}
