import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import type { PrivateCompanyProfile } from '@/schemas/private-company'
import {
  formatInteger,
  formatRonAmount,
  sortFinancialsByYearDesc,
} from '../../lib/formatting'
import { PrivateCompanyFinancialOverviewChart } from '../charts/private-company-financial-overview-chart'
import { PrivateCompanyTabEmpty } from '../private-company-tab-empty'
import { PrivateCompanySection } from './private-company-section'
import { PrivateCompanyTabPanel } from './private-company-tab-ui'

type Props = {
  readonly profile: PrivateCompanyProfile
  readonly variant?: 'default' | 'tab'
}

export function PrivateCompanyFinancialsSection({
  profile,
  variant = 'default',
}: Props) {
  const sectionTitle = <Trans>Financial history</Trans>
  const sectionDescription = (
    <Trans>
      ANAF bilant figures by fiscal year. Only years returned by the API are
      listed — gaps are not filled with zero.
    </Trans>
  )

  return (
    <PrivateCompanySection
      title={variant === 'default' ? sectionTitle : undefined}
      description={variant === 'default' ? sectionDescription : undefined}
      variant={variant}
    >
      {!profile.fiscal.anafFound ? (
        <PrivateCompanyTabEmpty
          title={t`Not in ANAF registry`}
          description={t`Financial statements are only available when the company is found in ANAF public data.`}
        />
      ) : (
        <FinancialHistoryContent profile={profile} />
      )}
    </PrivateCompanySection>
  )
}

function FinancialHistoryContent({
  profile,
}: {
  readonly profile: PrivateCompanyProfile
}) {
  const years = sortFinancialsByYearDesc(profile.financials)

  if (years.length === 0) {
    return (
      <PrivateCompanyTabEmpty
        title={t`No bilant history`}
        description={t`ANAF returned no financial statement years for this company in the loaded snapshot.`}
      />
    )
  }

  return (
    <div className="space-y-4">
      <FinancialHistoryTable years={years} />
      <PrivateCompanyFinancialOverviewChart
        profile={profile}
        showSummaryMetrics={false}
      />
    </div>
  )
}

function FinancialHistoryTable({
  years,
}: {
  readonly years: ReturnType<typeof sortFinancialsByYearDesc>
}) {
  return (
    <PrivateCompanyTabPanel
      category={<Trans>Bilant by fiscal year</Trans>}
      hint={
        <Trans>
          Only years returned by ANAF are shown. Missing years are not filled
          with zero.
        </Trans>
      }
      contentVariant="plain"
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[32rem] text-left text-sm">
          <thead className="border-b-2 border-[var(--pnrr-border)] bg-[var(--pnrr-subtle)] text-[10px] font-bold uppercase tracking-widest text-[var(--pnrr-muted)]">
            <tr>
              <th scope="col" className="px-4 py-3 sm:px-5">
                <Trans>Year</Trans>
              </th>
              <th scope="col" className="px-4 py-3 sm:px-5">
                <Trans>Turnover (I14)</Trans>
              </th>
              <th scope="col" className="px-4 py-3 sm:px-5">
                <Trans>Net profit (I19)</Trans>
              </th>
              <th scope="col" className="px-4 py-3 sm:px-5">
                <Trans>Net loss (I20)</Trans>
              </th>
              <th scope="col" className="px-4 py-3 sm:px-5">
                <Trans>Employees (I21)</Trans>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y-2 divide-[var(--pnrr-border)]">
            {years.map((year) => (
              <tr
                key={year.fiscalYear}
                className="transition-colors hover:bg-[var(--pnrr-hover)]"
              >
                <td className="px-4 py-3.5 font-bold tabular-nums text-[var(--pnrr-fg)] sm:px-5">
                  {year.fiscalYear}
                </td>
                <td className="px-4 py-3.5 tabular-nums text-[var(--pnrr-fg)] sm:px-5">
                  {formatRonAmount(year.turnover)}
                </td>
                <td className="px-4 py-3.5 tabular-nums text-emerald-700 dark:text-emerald-300 sm:px-5">
                  {formatRonAmount(year.netProfit)}
                </td>
                <td className="px-4 py-3.5 tabular-nums text-rose-700 dark:text-rose-300 sm:px-5">
                  {formatRonAmount(year.netLoss)}
                </td>
                <td className="px-4 py-3.5 tabular-nums text-[var(--pnrr-fg)] sm:px-5">
                  {formatInteger(year.employees)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PrivateCompanyTabPanel>
  )
}
