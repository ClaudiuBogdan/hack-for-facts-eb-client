import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import type { PrivateCompanyProfile } from '@/schemas/private-company'
import { PrivateCompanyTabEmpty } from '../private-company-tab-empty'
import { PrivateCompanySection } from './private-company-section'
import {
  PrivateCompanyTabListItem,
  PrivateCompanyTabPanel,
} from './private-company-tab-ui'

type Props = {
  readonly profile: PrivateCompanyProfile
  readonly variant?: 'default' | 'tab'
}

export function PrivateCompanyGovernanceSection({
  profile,
  variant = 'default',
}: Props) {
  const hasRepresentatives = profile.representatives.length > 0
  const hasEuBranches = profile.euBranches.length > 0

  const sectionTitle = <Trans>People and branches</Trans>
  const sectionDescription = (
    <Trans>
      Legal representatives from ONRC and EU branches from the open data export.
      Domestic branches and shareholders are not published in this dataset.
    </Trans>
  )

  return (
    <PrivateCompanySection
      title={variant === 'default' ? sectionTitle : undefined}
      description={variant === 'default' ? sectionDescription : undefined}
      variant={variant}
    >
      {!hasRepresentatives && !hasEuBranches ? (
        <PrivateCompanyTabEmpty
          title={t`No legal representatives or EU branches`}
          description={t`ONRC open data for this company does not list representatives or foreign branches.`}
        />
      ) : (
        <div className="space-y-4">
          {hasRepresentatives ? (
            <PrivateCompanyTabPanel
              category={<Trans>Legal representatives</Trans>}
            >
              {profile.representatives.map((representative, index) => (
                <PrivateCompanyTabListItem
                  key={`${representative.name}-${index}`}
                  headline={representative.name}
                  aside={representative.role}
                />
              ))}
            </PrivateCompanyTabPanel>
          ) : (
            <PrivateCompanyTabEmpty
              title={t`No legal representatives`}
              description={t`Representative names and roles were not returned for this company.`}
            />
          )}

          {hasEuBranches ? (
            <PrivateCompanyTabPanel category={<Trans>EU branches</Trans>}>
              {profile.euBranches.map((branch, index) => (
                <PrivateCompanyTabListItem
                  key={`${branch.name}-${index}`}
                  headline={branch.name}
                  supporting={
                    <>
                      {branch.country}
                      {branch.type ? ` · ${branch.type}` : ''}
                    </>
                  }
                />
              ))}
            </PrivateCompanyTabPanel>
          ) : (
            <PrivateCompanyTabEmpty
              title={t`No EU branches`}
              description={t`This company has no branches in other EU member states in the ONRC export.`}
            />
          )}
        </div>
      )}
    </PrivateCompanySection>
  )
}
