import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import type { PrivateCompanyProfile } from '@/schemas/private-company'
import { getPrivateCompanySourceReferences } from '../lib/profile-display'

type Props = {
  readonly profile: PrivateCompanyProfile
}

export function PrivateCompanySourceFooter({ profile }: Props) {
  const sources = getPrivateCompanySourceReferences(profile)

  if (sources.length === 0) {
    return null
  }

  return (
    <footer
      aria-label={t`Data sources`}
      className="mt-8 border-t border-[var(--company-border)] pt-4 text-xs leading-relaxed text-[var(--company-muted)]"
    >
      <p className="font-bold uppercase tracking-widest text-[var(--company-fg)]">
        <Trans>Sources</Trans>
      </p>
      <ul className="mt-2 space-y-1">
        {sources.map((source) => (
          <li key={source.id}>
            <span className="font-semibold text-[var(--company-fg)]">
              {source.name}
            </span>
            <span>
              {' '}
              · <Trans>snapshot</Trans> {source.snapshotDate}
            </span>
            {source.label ? <span> · {source.label}</span> : null}
          </li>
        ))}
      </ul>
      <p className="mt-2">
        <Trans>
          Data is shown from loaded public snapshots and may differ from live
          registries.
        </Trans>
      </p>
    </footer>
  )
}
