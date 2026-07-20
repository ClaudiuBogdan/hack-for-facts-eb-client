import { Link } from '@tanstack/react-router'
import { Trans } from '@lingui/react/macro'
import { t } from '@lingui/core/macro'
import { cn } from '@/lib/utils'
import type { TopPartyRow } from '@/schemas/procurement'
import { formatFlowCount, formatRon, formatScopeShare } from '../lib/formatting'
import { partyLabel, partyProcurementLink, type PartyKind } from '../lib/party-links'
import {
  procurementMarkClassName,
  procurementMarkTrackClassName,
  procurementSectionClassName,
  procurementSectionDescriptionClassName,
  procurementSectionHeaderClassName,
  procurementSectionTitleClassName,
  procurementUnderlineLinkClassName,
} from '../lib/procurement-theme'

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
  /** Deep link into search prefiltered on the party facet. */
  readonly seeAllParam: 'authority_cui' | 'supplier_cui'
  readonly className?: string
  /** Explicit matrix limitation for a scoped request; distinct from no rows. */
  readonly unavailableReason?: string
}

/**
 * Ranked party list as single-series CSS bars — count-first metric (bar
 * length = flow count), RON sum as secondary text. One mark hue for every
 * bar (nominal categories; identity is the row label, never a color). Each
 * row links to the party's profile; a semantic table rides in `<details>`.
 */
export function ProcurementPartyRanking({
  title,
  description,
  rows,
  kind,
  seeAllParam,
  className,
  unavailableReason,
}: Props) {
  const maxCount = rows.reduce(
    (max, row) => Math.max(max, Number(row.flowCount) || 0),
    0,
  )

  return (
    <section className={cn(procurementSectionClassName, className)}>
      <div className={procurementSectionHeaderClassName}>
        <h2 className={procurementSectionTitleClassName}>{title}</h2>
        {description ? (
          <p className={procurementSectionDescriptionClassName}>{description}</p>
        ) : null}
      </div>
      <div className="p-5 sm:p-6">
        {unavailableReason ? (
          <p className="border-l-4 border-amber-500 pl-3 text-sm leading-6 text-[var(--pnrr-muted)]">
            {unavailableReason}
          </p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-[var(--pnrr-muted)]">
            <Trans>No ranking data available.</Trans>
          </p>
        ) : (
          <ol className="space-y-4">
            {rows.map((row, index) => {
              const party = kind === 'authority' ? row.authority : row.supplier
              const count = Number(row.flowCount) || 0
              const width = maxCount > 0 ? Math.max((count / maxCount) * 100, 2) : 0
              const profile = partyProcurementLink(party, kind)
              const label = rankingLabel(row, kind)
              const cui = party?.cui?.trim() || null
              const showCui = cui !== null && label !== cui
              const amount =
                row.amountRonSum !== null
                  ? formatRon(row.amountRonSum, 'compact')
                  : null

              return (
                <li key={party?.cui ?? `${label}-${index}`} className="min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    {profile ? (
                      <Link
                        to={profile.to}
                        params={profile.params}
                        className="min-w-0 text-[var(--pnrr-fg)] underline-offset-2 hover:underline"
                      >
                        <span className="block truncate text-sm font-semibold">
                          {label}
                        </span>
                        {showCui ? (
                          <span className="mt-0.5 block truncate text-xs font-normal text-[var(--pnrr-muted)]">
                            <Trans>CUI: {cui}</Trans>
                          </span>
                        ) : null}
                      </Link>
                    ) : (
                      <span className="min-w-0 text-[var(--pnrr-fg)]">
                        <span className="block truncate text-sm font-semibold">
                          {label}
                        </span>
                        {showCui ? (
                          <span className="mt-0.5 block truncate text-xs font-normal text-[var(--pnrr-muted)]">
                            <Trans>CUI: {cui}</Trans>
                          </span>
                        ) : null}
                      </span>
                    )}
                    <span className="shrink-0 text-sm font-bold tabular-nums text-[var(--pnrr-fg)]">
                      <Trans>{formatFlowCount(row.flowCount)} records</Trans>
                    </span>
                  </div>
                  <div
                    className={cn('mt-1.5 h-5 w-full', procurementMarkTrackClassName)}
                    role="img"
                    aria-label={t`${label}: ${formatFlowCount(row.flowCount)} records`}
                  >
                    <div
                      className={cn('h-full rounded-r-[4px]', procurementMarkClassName)}
                      style={{ width: `${width}%` }}
                    />
                  </div>
                  {amount ? (
                    <p className="mt-1 text-xs text-[var(--pnrr-muted)]">
                      <Trans>RON total: {amount}</Trans>
                      {Number(row.amountMissingCount) > 0 ? (
                        <>
                          {' · '}
                          <Trans>
                            {formatFlowCount(row.amountMissingCount)} records
                            without a usable amount
                          </Trans>
                        </>
                      ) : null}
                    </p>
                  ) : null}
                  {row.shareOfScope !== null ? (
                    <p className="mt-1 text-xs text-[var(--pnrr-muted)]">
                      <Trans>
                        Share of scope: {formatScopeShare(row.shareOfScope)}
                      </Trans>
                    </p>
                  ) : null}
                </li>
              )
            })}
          </ol>
        )}

        {rows.length > 0 && !unavailableReason ? (
          <details className="mt-4">
            <summary className="cursor-pointer text-sm font-semibold text-[var(--pnrr-muted)]">
              <Trans>View as table</Trans>
            </summary>
            <table className="mt-2 w-full text-sm">
              <thead>
                <tr className="border-b-2 border-[var(--pnrr-border)] text-left">
                  <th className="py-1 pr-2 font-bold">{title}</th>
                  <th className="py-1 pr-2 text-right font-bold">
                    <Trans>Records</Trans>
                  </th>
                  <th className="py-1 text-right font-bold">
                    <Trans>RON total</Trans>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => {
                  const party = kind === 'authority' ? row.authority : row.supplier
                  return (
                    <tr key={party?.cui ?? index} className="border-b border-[var(--pnrr-border)]/30">
                      <td className="py-1 pr-2">
                        <span className="block">{rankingLabel(row, kind)}</span>
                        {party?.cui && rankingLabel(row, kind) !== party.cui ? (
                          <span className="block text-xs text-[var(--pnrr-muted)]">
                            <Trans>CUI: {party.cui}</Trans>
                          </span>
                        ) : null}
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
                  )
                })}
              </tbody>
            </table>
          </details>
        ) : null}

        {!unavailableReason ? (
          <div className="mt-4">
            <Link
              to="/procurement/search"
              search={{}}
              className={procurementUnderlineLinkClassName}
            >
              {seeAllParam === 'authority_cui' ? (
                <Trans>Search by authority</Trans>
              ) : (
                <Trans>Search by supplier</Trans>
              )}
            </Link>
          </div>
        ) : null}
      </div>
    </section>
  )
}
