import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import type { PrivateCompanyProfile } from '@/schemas/private-company'
import { PrivateCompanyTabEmpty } from '../private-company-tab-empty'
import { PrivateCompanySection } from './private-company-section'
import {
  PrivateCompanyTabListItem,
  PrivateCompanyTabNote,
  PrivateCompanyTabPanel,
} from './private-company-tab-ui'

type Props = {
  readonly profile: PrivateCompanyProfile
  readonly variant?: 'default' | 'tab'
}

export function PrivateCompanyActivitySection({
  profile,
  variant = 'default',
}: Props) {
  const onrcActivities = profile.caenActivities.filter(
    (activity) => activity.source === 'onrc',
  )
  const fiscalCaen = profile.fiscal.fiscalCaen
  const showFiscalCaen =
    fiscalCaen !== null &&
    !onrcActivities.some(
      (activity) =>
        activity.code === fiscalCaen.code && activity.rev === fiscalCaen.rev,
    )

  const sectionTitle = <Trans>Activity</Trans>
  const sectionDescription = (
    <Trans>Authorized and fiscal activity codes from ONRC and ANAF.</Trans>
  )

  if (onrcActivities.length === 0 && !showFiscalCaen) {
    return (
      <PrivateCompanySection
        title={variant === 'default' ? sectionTitle : undefined}
        description={variant === 'default' ? sectionDescription : undefined}
        variant={variant}
      >
        <PrivateCompanyTabEmpty
          title={t`No authorized activity codes`}
          description={t`ONRC did not return CAEN codes for this company in the loaded snapshot.`}
        />
      </PrivateCompanySection>
    )
  }

  return (
    <PrivateCompanySection
      title={variant === 'default' ? sectionTitle : undefined}
      description={variant === 'default' ? sectionDescription : undefined}
      variant={variant}
    >
      <div className="space-y-4">
        {onrcActivities.length > 0 ? (
          <PrivateCompanyTabPanel
            category={<Trans>Authorized activities (ONRC)</Trans>}
          >
            {onrcActivities.map((activity) => (
              <PrivateCompanyTabListItem
                key={`${activity.code}-${activity.rev}`}
                headline={
                  activity.label ?? (
                    <Trans>Label not available in nomenclature</Trans>
                  )
                }
                supporting={
                  <span className="tabular-nums">
                    {activity.code}
                    <span className="mx-1.5 text-[var(--pnrr-muted)]">·</span>
                    {activity.rev}
                  </span>
                }
              />
            ))}
          </PrivateCompanyTabPanel>
        ) : (
          <PrivateCompanyTabEmpty
            title={t`No ONRC authorized activities`}
            description={t`Use the fiscal CAEN from ANAF below when ONRC activities are missing.`}
          />
        )}

        {showFiscalCaen && fiscalCaen ? (
          <PrivateCompanyTabPanel
            category={<Trans>Fiscal CAEN (ANAF)</Trans>}
            hint={
              <Trans>
                ANAF reports a fiscal activity code that differs from the ONRC
                authorized list.
              </Trans>
            }
          >
            <PrivateCompanyTabListItem
              headline={
                <span className="tabular-nums">
                  {fiscalCaen.code}
                  <span className="mx-1.5 font-normal text-[var(--pnrr-muted)]">
                    ·
                  </span>
                  {fiscalCaen.rev}
                </span>
              }
            />
          </PrivateCompanyTabPanel>
        ) : profile.fiscal.anafFound && fiscalCaen ? (
          <PrivateCompanyTabNote>
            <Trans>
              Fiscal CAEN from ANAF matches an authorized ONRC activity.
            </Trans>
          </PrivateCompanyTabNote>
        ) : null}
      </div>
    </PrivateCompanySection>
  )
}
