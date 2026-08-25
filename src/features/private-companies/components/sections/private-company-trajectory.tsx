import { Trans } from '@lingui/react/macro'
import type { PrivateCompanyProfile } from '@/schemas/private-company'
import {
  formatRonAmount,
  formatSignedInteger,
  formatSignedRonCompact,
} from '../../lib/formatting'

type Props = {
  readonly profile: PrivateCompanyProfile
}

/**
 * Year-on-year movement, as computed by the server. The arithmetic is
 * deliberately not repeated here: a client-side `netProfit - netLoss`
 * propagates null where the authoritative value treats a missing side as zero,
 * and ANAF writes `net_profit = 0` rather than null in a loss year — so a naive
 * derivation drops the loss on essentially every loss row.
 */
export function PrivateCompanyTrajectory({ profile }: Props) {
  const trajectory = profile.financialTrajectory
  if (!trajectory || trajectory.fromYear === null || trajectory.toYear === null) {
    return null
  }

  const rows = [
    {
      key: 'turnover',
      label: <Trans>Turnover</Trans>,
      delta: trajectory.turnoverDelta,
      display: formatSignedRonCompact(trajectory.turnoverDelta),
      title: trajectory.turnoverDelta,
    },
    {
      key: 'netResult',
      label: <Trans>Net result</Trans>,
      delta: trajectory.netResultDelta,
      display: formatSignedRonCompact(trajectory.netResultDelta),
      title: trajectory.netResultDelta,
    },
    {
      key: 'employees',
      label: <Trans>Employees</Trans>,
      delta: trajectory.employeesDelta,
      display: formatSignedInteger(trajectory.employeesDelta),
      title: null,
    },
  ].filter((row) => row.display !== '—')

  if (rows.length === 0) {
    return null
  }

  return (
    <section className="space-y-3">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <Trans>
          Change {trajectory.fromYear} → {trajectory.toYear}
        </Trans>
      </h2>
      <dl className="grid grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-3">
        {rows.map((row) => (
          <div key={row.key} className="min-w-0">
            <dt className="text-sm text-muted-foreground">{row.label}</dt>
            {row.delta === 0 ? (
              <dd className="mt-1 text-base text-muted-foreground">
                <Trans>No change</Trans>
              </dd>
            ) : (
              <dd
                className="mt-1 text-base font-semibold tabular-nums text-foreground"
                title={row.title !== null ? formatRonAmount(row.title) : undefined}
              >
                {row.display}
              </dd>
            )}
          </div>
        ))}
      </dl>
    </section>
  )
}
