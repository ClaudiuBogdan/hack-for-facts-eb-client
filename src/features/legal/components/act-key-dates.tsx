import { useLingui } from '@lingui/react'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import type { LegalKeyDate } from '@/schemas/legal'
import { formatLegalDate } from '../lib/legal-format'
import { LEGISLATION_ACCENT } from '../lib/legislation-theme'
import { LegislationSection } from './legislation-section'

type Props = {
  readonly keyDates: readonly LegalKeyDate[]
}

/**
 * Rung 3 — when things happened, in the order they happened.
 *
 * Entries with a null `date` are **kept, not dropped**: the model routinely
 * emits one whose date lives only in the prose ("Data de 19 martie 2019 a
 * adoptării OUG nr. 17/2019"). Dropping them loses real information and
 * inventing a date would be worse, so they sort last under a plain "fără dată
 * exactă" rule.
 */
export function ActKeyDates({ keyDates }: Props) {
  const { i18n } = useLingui()

  if (keyDates.length === 0) return null

  const dated = [...keyDates]
    .filter((entry) => entry.date !== null)
    .sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''))
  const undated = keyDates.filter((entry) => entry.date === null)

  return (
    <LegislationSection
      id="act-key-dates-heading"
      title={t`Date cheie`}
      bodyClassName="p-0"
    >
      <ol className="flex flex-col">
        {dated.map((entry, index) => (
          <li
            key={`${entry.date}-${index}`}
            className="flex flex-col gap-1 border-b border-[var(--pnrr-track)] px-5 py-3 last:border-b-0 sm:flex-row sm:gap-5 sm:px-6"
          >
            <span
              className="shrink-0 text-sm font-bold tabular-nums sm:w-40"
              style={{ color: LEGISLATION_ACCENT }}
            >
              {formatLegalDate(entry.date ?? '', i18n.locale)}
            </span>
            <span className="min-w-0 text-sm leading-6 text-[var(--pnrr-fg)]">
              {entry.description}
            </span>
          </li>
        ))}

        {undated.map((entry, index) => (
          <li
            key={`undated-${index}`}
            className="flex flex-col gap-1 border-b border-[var(--pnrr-track)] px-5 py-3 last:border-b-0 sm:flex-row sm:gap-5 sm:px-6"
          >
            <span className="shrink-0 text-xs text-[var(--pnrr-muted)] sm:w-40">
              <Trans>fără dată exactă</Trans>
            </span>
            <span className="min-w-0 text-sm leading-6 text-[var(--pnrr-muted)]">
              {entry.description}
            </span>
          </li>
        ))}
      </ol>
    </LegislationSection>
  )
}
