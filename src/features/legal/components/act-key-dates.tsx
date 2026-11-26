import { useLingui } from '@lingui/react'
import { t } from '@lingui/core/macro'
import { Plural, Trans } from '@lingui/react/macro'
import type { LegalKeyDate } from '@/schemas/legal'
import { formatLegalDate } from '../lib/legal-format'
import { cn } from '@/lib/utils'
import { ActAccordionItem } from './act-accordion'
import { ACT_RECORD_LINE } from './reader/act-page-grid'

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
    <ActAccordionItem
      id="act-key-dates-heading"
      title={t`Date cheie`}
      meta={
        <Plural
          value={keyDates.length}
          one="# dată"
          few="# date"
          other="# de date"
        />
      }
    >
      <ol className="divide-y">
        {dated.map((entry, index) => (
          <li key={`${entry.date}-${index}`} className={ACT_RECORD_LINE}>
            <span className="tabular-nums text-muted-foreground">
              {formatLegalDate(entry.date ?? '', i18n.locale)}
            </span>
            <span className="min-w-0">{entry.description}</span>
          </li>
        ))}

        {undated.map((entry, index) => (
          <li
            key={`undated-${index}`}
            className={cn(ACT_RECORD_LINE, 'text-muted-foreground')}
          >
            <span>
              <Trans>fără dată exactă</Trans>
            </span>
            <span className="min-w-0">{entry.description}</span>
          </li>
        ))}
      </ol>
    </ActAccordionItem>
  )
}
