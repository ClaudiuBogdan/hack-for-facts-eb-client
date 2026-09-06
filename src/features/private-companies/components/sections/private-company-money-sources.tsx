import { Trans } from '@lingui/react/macro'
import type {
  PrivateCompanyMoneyFlow,
  PrivateCompanyMoneyYear,
  PrivateCompanyProfile,
} from '@/schemas/private-company'
import { formatRonExact, formatShare } from '../../lib/formatting'
import {
  getMoneyFlowCountLabel,
  getMoneyFlowCoverage,
  getMoneyFlowLabel,
  isReceiptFlow,
  sortMoneyFlows,
} from '../../lib/public-money-display'

type Props = {
  readonly profile: PrivateCompanyProfile
}

/**
 * What public institutions paid this company, split by the instrument that
 * carried it.
 *
 * Magnitude is carried by an inline proportion fill rather than a second,
 * compact rendering of the same number — one figure per row, exact, so it can
 * be cited. The bar is relative to the largest row here and to nothing else:
 * the amounts are never added together, because an award, a purchase and an
 * obligation are different facts.
 */
export function PrivateCompanyMoneySources({ profile }: Props) {
  const money = profile.publicMoney
  if (!money || money.byFlowType.length === 0) {
    return null
  }

  const flows = sortMoneyFlows(money.byFlowType)
  const largest = flows.reduce(
    (max, flow) => (flow.totalRon !== null && flow.totalRon > max ? flow.totalRon : max),
    0,
  )

  return (
    <section aria-labelledby="company-public-flows" className="space-y-3">
      <div>
        <h2
          id="company-public-flows"
          className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
        >
          <Trans>Received from public institutions</Trans>
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          <Trans>
            Amounts received as a supplier, by contract type, across all years.
          </Trans>
        </p>
      </div>
      <dl className="space-y-1">
        {flows.map((flow) => (
          <MoneySourceRow
            key={flow.flowType}
            flow={flow}
            largest={largest}
            byYear={money.byYear}
          />
        ))}
      </dl>
    </section>
  )
}

function MoneySourceRow({
  flow,
  largest,
  byYear,
}: {
  readonly flow: PrivateCompanyMoneyFlow
  readonly largest: number
  readonly byYear: readonly PrivateCompanyMoneyYear[]
}) {
  const coverage = getMoneyFlowCoverage(byYear, flow.flowType)
  // A within-flow ratio: amounts are never added across flow types.
  const undatedShare =
    flow.totalRon !== null && flow.totalRon > 0 && coverage.undatedRon > 0
      ? coverage.undatedRon / flow.totalRon
      : 0
  // Relative to the largest row, never to a total: the amounts are not summed.
  // A 4000x spread is common (direct acquisitions dwarf contracts), so a tiny
  // row keeps a visible stub rather than vanishing into a rendering artefact.
  const share =
    flow.totalRon !== null && largest > 0
      ? Math.min(Math.max((flow.totalRon / largest) * 100, 1), 100)
      : 0

  return (
    <div className="relative overflow-hidden rounded-md px-3 py-2.5">
      {share > 0 ? (
        <div
          className="absolute inset-y-0 left-0 bg-muted/60"
          style={{ width: `${share}%` }}
          aria-hidden
        />
      ) : null}
      <div className="relative flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <dt className="text-sm font-medium text-foreground">
          {getMoneyFlowLabel(flow.flowType)}
        </dt>
        <dd className="text-sm tabular-nums text-foreground">
          {flow.totalRon === null ? (
            <span className="text-muted-foreground">
              <Trans>Amount not available</Trans>
            </span>
          ) : (
            formatRonExact(flow.totalRon)
          )}
        </dd>
      </div>
      <p className="relative mt-0.5 text-xs tabular-nums text-muted-foreground">
        {coverage.firstYear !== null && coverage.lastYear !== null ? (
          <>
            {coverage.firstYear === coverage.lastYear
              ? coverage.firstYear
              : `${coverage.firstYear}–${coverage.lastYear}`}
            {' · '}
          </>
        ) : null}
        {getMoneyFlowCountLabel(flow.flowType, flow.count)}
        {coverage.missingYears.length > 0 ? (
          <>
            {' · '}
            {coverage.missingYears.length <= 3 ? (
              <Trans>no records in {coverage.missingYears.join(', ')}</Trans>
            ) : (
              <Trans>{coverage.missingYears.length} years with no records</Trans>
            )}
          </>
        ) : null}
        {undatedShare > 0 ? (
          <>
            {' · '}
            <Trans>{formatShare(undatedShare)} not dated</Trans>
          </>
        ) : null}
        {!isReceiptFlow(flow.flowType) ? (
          <>
            {' · '}
            <Trans>an obligation, not money paid out</Trans>
          </>
        ) : null}
      </p>
    </div>
  )
}
