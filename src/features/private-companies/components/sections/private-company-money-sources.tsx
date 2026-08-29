import { Trans } from '@lingui/react/macro'
import type { PrivateCompanyProfile } from '@/schemas/private-company'
import { formatRonAmount, formatRonAmountCompact } from '../../lib/formatting'
import {
  getMoneyFlowCountLabel,
  getMoneyFlowLabel,
  isReceiptFlow,
  sortMoneyFlows,
} from '../../lib/public-money-display'

type Props = {
  readonly profile: PrivateCompanyProfile
}

/**
 * What this company was paid from public budgets, named by the instrument that
 * carried it rather than lumped under an umbrella term.
 *
 * Three rules hold here:
 * - Amounts are never summed across instruments. An obligation and a payment
 *   are different facts; the server spec forbids adding them.
 * - The exact figure is rendered as text, not only as a `title` tooltip — a
 *   tooltip is unreachable by touch and keyboard, and the exact amount is the
 *   artefact a reader needs in order to cite it.
 * - The period is stated. These are lifetime totals sitting directly under a
 *   year-on-year band, and without a scope line they read as current.
 */
export function PrivateCompanyMoneySources({ profile }: Props) {
  const money = profile.publicMoney
  if (!money || money.byFlowType.length === 0) {
    return null
  }

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
          <Trans>Totals across all years, never added together.</Trans>
        </p>
      </div>
      <dl className="-mx-2 space-y-1">
        {sortMoneyFlows(money.byFlowType).map((flow) => (
          <div
            key={flow.flowType}
            className="grid gap-x-4 gap-y-1 px-2 py-3 sm:grid-cols-[minmax(7.5rem,10rem)_1fr] sm:items-baseline"
          >
            <dt className="text-sm font-semibold text-foreground">
              {getMoneyFlowLabel(flow.flowType)}
            </dt>
            <dd className="min-w-0">
              {flow.totalRon === null ? (
                <span className="block text-base leading-snug text-muted-foreground">
                  <Trans>Amount not available</Trans>
                </span>
              ) : (
                <span className="block text-base tabular-nums leading-snug text-foreground">
                  {formatRonAmountCompact(flow.totalRon)}
                </span>
              )}
              <span className="mt-1 block text-sm tabular-nums leading-snug text-muted-foreground">
                {flow.totalRon !== null ? `${formatRonAmount(flow.totalRon)} · ` : ''}
                {getMoneyFlowCountLabel(flow.flowType, flow.count)}
              </span>
              {!isReceiptFlow(flow.flowType) ? (
                <span className="mt-1 block text-sm leading-snug text-muted-foreground">
                  <Trans>An obligation entered into, not money paid out.</Trans>
                </span>
              ) : null}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
