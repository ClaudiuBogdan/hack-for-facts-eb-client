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

function getMatchConfidenceLabel(
  confidence: NonNullable<PrivateCompanyProfile['geography']>['matchConfidence'],
): string {
  switch (confidence) {
    case 'safe':
      return t`High confidence`
    case 'manual-review':
      return t`Needs review`
    case 'unmatched':
      return t`Unmatched`
    default: {
      const exhaustive: never = confidence
      return exhaustive
    }
  }
}

export function PrivateCompanyLocationSection({
  profile,
  variant = 'default',
}: Props) {
  const geography = profile.geography
  const localityLine = [profile.address.locality, profile.address.county]
    .filter(Boolean)
    .join(', ')

  const sectionTitle = <Trans>Location</Trans>
  const sectionDescription = (
    <Trans>
      Registered office from ONRC and administrative location from the API. No
      client-side address matching is performed.
    </Trans>
  )

  return (
    <PrivateCompanySection
      title={variant === 'default' ? sectionTitle : undefined}
      description={variant === 'default' ? sectionDescription : undefined}
      variant={variant}
    >
      <div className="space-y-4">
        <PrivateCompanyTabPanel category={<Trans>Registered office (ONRC)</Trans>}>
          <PrivateCompanyTabListItem
            headline={profile.address.display}
            supporting={localityLine || undefined}
          />
        </PrivateCompanyTabPanel>

        {geography ? (
          <>
            <PrivateCompanyTabPanel
              category={<Trans>Administrative location (API)</Trans>}
            >
              <PrivateCompanyTabListItem
                headline={`${geography.uatName} (${geography.uatSirutaCode})`}
                supporting={geography.countyName}
                aside={getMatchConfidenceLabel(geography.matchConfidence)}
              />
            </PrivateCompanyTabPanel>
            <PrivateCompanyTabNote>
              {geography.matchConfidence !== 'safe' ? (
                <Trans>
                  Map preview is shown only when the UAT match is high
                  confidence. Treat this location as indicative until verified.
                </Trans>
              ) : (
                <Trans>
                  Map preview will be added when the location section is wired
                  to the UAT boundary layer.
                </Trans>
              )}
            </PrivateCompanyTabNote>
          </>
        ) : (
          <PrivateCompanyTabEmpty
            title={t`No resolved UAT`}
            description={t`The API did not return a matched administrative unit for this address. Only the ONRC registered office text is available.`}
          />
        )}
      </div>
    </PrivateCompanySection>
  )
}
