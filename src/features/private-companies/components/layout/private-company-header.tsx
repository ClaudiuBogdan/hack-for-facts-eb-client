import { t } from '@lingui/core/macro'
import type { PrivateCompanyProfile } from '@/schemas/private-company'
import {
  formatPrivateCompanyRegistrationDate,
  getPrivateCompanySources,
} from '../../lib/profile-display'
import { PrivateCompanySummaryList } from './private-company-summary-list'
import { PrivateCompanyStatusTags } from './private-company-status-tags'

type Props = {
  readonly profile: PrivateCompanyProfile
}

export function PrivateCompanyHeader({ profile }: Props) {
  const { onrcSource, anafSource } = getPrivateCompanySources(profile)
  const registeredOn = formatPrivateCompanyRegistrationDate(
    profile.registrationDate,
  )

  const summaryRows = [
    profile.cui
      ? {
          term: t`CUI`,
          detail: profile.cui,
        }
      : null,
    profile.codInmatriculare
      ? {
          term: t`Registration number`,
          detail: profile.codInmatriculare,
        }
      : null,
    registeredOn
      ? { term: t`Registered on`, detail: registeredOn }
      : null,
    {
      term: t`Registered office`,
      detail: profile.address.display,
      wide: true,
    },
  ].filter((row): row is NonNullable<typeof row> => row !== null)

  const sourceParts: string[] = []
  if (onrcSource) {
    sourceParts.push(
      `${t`ONRC`} ${onrcSource.snapshotDate}${onrcSource.label ? ` (${onrcSource.label})` : ''}`,
    )
  }
  if (anafSource) {
    sourceParts.push(`${t`ANAF`} ${anafSource.snapshotDate}`)
  }

  const lastUpdatedDetail =
    sourceParts.length > 0 ? sourceParts.join(' · ') : null

  const summaryRowsWithSources = [
    ...summaryRows,
    lastUpdatedDetail
      ? {
          term: t`Ultima actualizare:`,
          detail: lastUpdatedDetail,
        }
      : null,
  ].filter((row): row is NonNullable<typeof row> => row !== null)

  return (
    <header className="company-page-header pb-0">
      <h1 className="company-page-header__title" id="company-page-title">
        {profile.legalName}
      </h1>

      <div className="mt-4">
        <PrivateCompanyStatusTags profile={profile} />
      </div>

      {summaryRowsWithSources.length > 0 ? (
        <div className="mt-4">
          <PrivateCompanySummaryList
            rows={summaryRowsWithSources}
            className="company-summary-list--header"
          />
        </div>
      ) : null}
    </header>
  )
}
