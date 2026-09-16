import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import type {
  PrivateCompanyCaenActivity,
  PrivateCompanyProfile,
} from '@/schemas/private-company'
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

function groupActivities(profile: PrivateCompanyProfile) {
  const observations = profile.caenActivities.filter(
    (activity) => activity.source === 'onrc' || activity.source === 'anaf',
  )
  const fiscalCaen = profile.fiscal.fiscalCaen
  // The fiscal field and the ANAF activity are two representations of one observation.
  if (
    fiscalCaen &&
    !observations.some(
      (activity) =>
        activity.source === 'anaf' &&
        activity.code === fiscalCaen.code &&
        activity.rev === fiscalCaen.rev,
    )
  ) {
    observations.push({ ...fiscalCaen, source: 'anaf', label: null })
  }

  const groups = new Map<string, Map<string, PrivateCompanyCaenActivity>>()
  for (const activity of observations) {
    const observation = {
      ...activity,
      rev: activity.rev || null,
      label: activity.rev ? activity.label : null,
    }
    const group =
      groups.get(activity.code) ?? new Map<string, PrivateCompanyCaenActivity>()
    group.set(
      JSON.stringify([observation.source, observation.rev, observation.label]),
      observation,
    )
    groups.set(activity.code, group)
  }
  return [...groups]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([code, group]) => ({
      code,
      observations: [...group.values()].sort(
        (left, right) =>
          Number(right.source === 'onrc') - Number(left.source === 'onrc') ||
          (left.rev ?? '').localeCompare(right.rev ?? '') ||
          (left.label ?? '').localeCompare(right.label ?? ''),
      ),
    }))
}

export function PrivateCompanyActivitySection({
  profile,
  variant = 'default',
}: Props) {
  const activities = groupActivities(profile)
  const sectionTitle = <Trans>Activity</Trans>
  const sectionDescription = (
    <Trans>Authorized and fiscal activity codes from ONRC and ANAF.</Trans>
  )

  return (
    <PrivateCompanySection
      title={variant === 'default' ? sectionTitle : undefined}
      description={variant === 'default' ? sectionDescription : undefined}
      variant={variant}
    >
      {activities.length === 0 ? (
        <PrivateCompanyTabEmpty
          title={t`No activity codes`}
          description={t`ONRC and ANAF did not return CAEN codes for this company in the loaded snapshots.`}
        />
      ) : (
        <PrivateCompanyTabPanel category={<Trans>CAEN activities</Trans>}>
          <ul className="divide-y-2 divide-[var(--pnrr-border)]">
            {activities.map((activity) => (
              <PrivateCompanyTabListItem
                key={activity.code}
                headline={<span className="tabular-nums">{activity.code}</span>}
                supporting={
                  <span className="block space-y-2">
                    {activity.observations.map((observation) => (
                      <span
                        key={JSON.stringify([
                          observation.source,
                          observation.rev,
                          observation.label,
                        ])}
                        className="block"
                      >
                        <strong className="font-semibold text-[var(--pnrr-fg)]">
                          {observation.source === 'onrc' ? 'ONRC' : 'ANAF'}
                        </strong>
                        {' · '}
                        {observation.rev ?? (
                          <Trans>Revision not supplied</Trans>
                        )}
                        {observation.label ? (
                          <> — {observation.label}</>
                        ) : observation.rev ? (
                          <>
                            {' '}
                            — <Trans>Label not available in nomenclature</Trans>
                          </>
                        ) : null}
                      </span>
                    ))}
                  </span>
                }
              />
            ))}
          </ul>
        </PrivateCompanyTabPanel>
      )}
    </PrivateCompanySection>
  )
}
