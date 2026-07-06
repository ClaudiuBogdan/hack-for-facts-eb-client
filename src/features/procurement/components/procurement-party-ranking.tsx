import { Link } from '@tanstack/react-router'
import { Trans } from '@lingui/react/macro'
import { t } from '@lingui/core/macro'
import { cn } from '@/lib/utils'
import type { TopPartyRow } from '@/schemas/procurement'
import { formatFlowCount, formatRon } from '../lib/formatting'
import { partyLabel, partyProfileLink, type PartyKind } from '../lib/party-links'
import {
  procurementMarkClassName,
  procurementMarkTrackClassName,
  procurementSectionClassName,
  procurementSectionDescriptionClassName,
  procurementSectionHeaderClassName,
  procurementSectionTitleClassName,
  procurementUnderlineLinkClassName,
} from '../lib/procurement-theme'

type Props = {
  readonly title: string
  readonly description?: string
  readonly rows: readonly TopPartyRow[]
  readonly kind: PartyKind
  /** Deep link into search prefiltered on the party facet. */
  readonly seeAllParam: 'authority_cui' | 'supplier_cui'
  readonly className?: string
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
        {rows.length === 0 ? (
          <p className="text-sm text-[var(--pnrr-muted)]">
            <Trans>No ranking data available.</Trans>
          </p>
        ) : (
          <ol className="space-y-4">
            {rows.map((row, index) => {
              const party = kind === 'authority' ? row.authority : row.supplier
              const count = Number(row.flowCount) || 0
              const width = maxCount > 0 ? Math.max((count / maxCount) * 100, 2) : 0
              const profile = partyProfileLink(party, kind)
              const label = partyLabel(party)
              const amount =
                row.amountRonSum !== null
                  ? formatRon(row.amountRonSum, 'compact')
                  : null

              return (
                <li key={party?.cui ?? `${label}-${index}`} className="min-w-0">
                  <div className="flex items-baseline justify-between gap-3">
                    {profile ? (
                      <Link
                        to={profile.to}
                        params={profile.params}
                        className="min-w-0 truncate text-sm font-semibold text-[var(--pnrr-fg)] underline-offset-2 hover:underline"
                      >
                        {label}
                      </Link>
                    ) : (
                      <span className="min-w-0 truncate text-sm font-semibold text-[var(--pnrr-fg)]">
                        {label}
                      </span>
                    )}
                    <span className="shrink-0 text-sm font-bold tabular-nums text-[var(--pnrr-fg)]">
                      {formatFlowCount(row.flowCount)}
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
                      <td className="py-1 pr-2">{partyLabel(party)}</td>
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
      </div>
    </section>
  )
}
