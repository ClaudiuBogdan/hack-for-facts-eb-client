import { t } from '@lingui/core/macro'
import type { ReactNode } from 'react'
import { Trans } from '@lingui/react/macro'
import { cn } from '@/lib/utils'
import type { PrivateCompanyProfile } from '@/schemas/private-company'
import {
  getCompanyStatusDisplayLabel,
  getCompanyStatusTone,
  type CompanyStatusTone,
} from '../../lib/company-status-display'

type StatusTag = {
  readonly key: string
  readonly prefix: string
  readonly value: ReactNode
  readonly tone?:
    | CompanyStatusTone
    | 'positive'
    | 'warning'
    | 'negative'
    | 'outline'
}

type Props = {
  readonly profile: PrivateCompanyProfile
}

function labeledBadge(tag: StatusTag) {
  const toneClass =
    tag.tone === 'positive'
      ? 'company-tag--positive'
      : tag.tone === 'warning'
        ? 'company-tag--warning'
        : tag.tone === 'negative'
          ? 'company-tag--negative'
          : tag.tone === 'outline'
            ? 'company-tag--outline'
            : 'company-tag--neutral'

  return (
    <span className={cn('company-tag company-tag--pnrr', toneClass)}>
      <span className="company-tag__prefix">{tag.prefix}</span>
      <span className="company-tag__value">{tag.value}</span>
    </span>
  )
}

export function PrivateCompanyStatusTags({ profile }: Props) {
  const tags: StatusTag[] = []

  if (profile.status) {
    tags.push({
      key: 'status',
      prefix: t`Status`,
      value: getCompanyStatusDisplayLabel(profile.status),
      tone: getCompanyStatusTone(profile.status),
    })
  }
  if (profile.legalForm) {
    tags.push({
      key: 'form',
      prefix: t`Form`,
      value: profile.legalForm,
      tone: 'outline',
    })
  }
  if (profile.fiscal.vatPayer === true) {
    tags.push({
      key: 'vat',
      prefix: t`VAT`,
      value: <Trans>Registered</Trans>,
      tone: 'outline',
    })
  }
  if (profile.fiscal.inactive === true) {
    tags.push({
      key: 'inactive',
      prefix: t`Fiscal`,
      value: <Trans>Inactive</Trans>,
      tone: 'warning',
    })
  }
  if (!profile.fiscal.anafFound) {
    tags.push({
      key: 'anaf',
      prefix: t`ANAF`,
      value: <Trans>Not found</Trans>,
      tone: 'negative',
    })
  }

  if (tags.length === 0) {
    return null
  }

  return (
    <ul
      className="company-page-header__badges m-0 flex list-none flex-wrap gap-2 p-0"
      aria-label={t`Company status`}
    >
      {tags.map((tag) => (
        <li key={tag.key} className="leading-none">
          {labeledBadge(tag)}
        </li>
      ))}
    </ul>
  )
}
