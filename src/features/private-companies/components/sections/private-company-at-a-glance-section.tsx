import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import type { PrivateCompanyProfile } from '@/schemas/private-company'
import {
  formatInteger,
  formatRonAmount,
  getLatestFinancialYear,
} from '../../lib/formatting'
import { PrivateCompanyTabEmpty } from '../private-company-tab-empty'
import { PrivateCompanySection } from './private-company-section'

type Props = {
  readonly profile: PrivateCompanyProfile
}

export function PrivateCompanyAtAGlanceSection({ profile }: Props) {
  const latestYear = getLatestFinancialYear(profile.financials)

  return (
    <PrivateCompanySection
      title={<Trans>At a glance</Trans>}
      description={
        <Trans>
          Latest ANAF bilant indicators and fiscal status. Values are never
          shown as zero when data is missing.
        </Trans>
      }
    >
      {!profile.fiscal.anafFound ? (
        <PrivateCompanyTabEmpty
          title={t`No ANAF fiscal record`}
          description={t`This CUI is not in the ANAF public registry. Turnover, employees, and bilant history are not available.`}
        />
      ) : !latestYear ? (
        <div className="space-y-2">
          <PrivateCompanyTabEmpty
            title={t`No bilant data`}
            description={t`ANAF does not return financial statements for this company in the loaded snapshot.`}
          />
          <p className="text-xs text-muted-foreground">
            <Trans>ANAF query date: {profile.fiscal.asOfDate}</Trans>
          </p>
        </div>
      ) : (
        <>
          <p className="text-xs text-muted-foreground">
            <Trans>ANAF bilant · as of {profile.fiscal.asOfDate}</Trans>
          </p>
          <dl className="grid gap-3 sm:grid-cols-2">
            <div className="border border-border p-3">
              <dt className="text-xs text-muted-foreground">
                <Trans>Turnover ({latestYear.fiscalYear})</Trans>
              </dt>
              <dd className="mt-1 text-lg font-semibold tabular-nums">
                {formatRonAmount(latestYear.turnover)}
              </dd>
            </div>
            <div className="border border-border p-3">
              <dt className="text-xs text-muted-foreground">
                <Trans>Net result ({latestYear.fiscalYear})</Trans>
              </dt>
              <dd className="mt-1 text-lg font-semibold tabular-nums">
                {latestYear.netProfit !== null
                  ? formatRonAmount(latestYear.netProfit)
                  : latestYear.netLoss !== null
                    ? `−${formatRonAmount(latestYear.netLoss)}`
                    : '—'}
              </dd>
            </div>
            <div className="border border-border p-3">
              <dt className="text-xs text-muted-foreground">
                <Trans>Employees ({latestYear.fiscalYear})</Trans>
              </dt>
              <dd className="mt-1 text-lg font-semibold tabular-nums">
                {formatInteger(latestYear.employees)}
              </dd>
            </div>
            <div className="border border-border p-3">
              <dt className="text-xs text-muted-foreground">
                <Trans>Fiscal status</Trans>
              </dt>
              <dd className="mt-1 space-y-1 text-sm font-medium">
                <p>
                  {profile.fiscal.vatPayer === true ? (
                    <Trans>VAT registered</Trans>
                  ) : profile.fiscal.vatPayer === false ? (
                    <Trans>Not a VAT payer</Trans>
                  ) : (
                    <Trans>VAT status unknown</Trans>
                  )}
                </p>
                {profile.fiscal.inactive === true ? (
                  <p className="text-amber-800 dark:text-amber-200">
                    <Trans>Fiscally inactive</Trans>
                  </p>
                ) : profile.fiscal.inactive === false ? (
                  <p>
                    <Trans>Not fiscally inactive</Trans>
                  </p>
                ) : null}
              </dd>
            </div>
          </dl>
        </>
      )}
    </PrivateCompanySection>
  )
}
