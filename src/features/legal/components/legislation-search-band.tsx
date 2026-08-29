import { useState, type FormEvent } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  LEGISLATION_ACCENT,
  legislationExampleChipClassName,
  legislationFieldClassName,
  legislationSubmitClassName,
} from '../lib/legislation-theme'

const EXAMPLES = [
  'Codul fiscal',
  'Codul muncii',
  'OUG 57/2019',
  'Legea 98/2016',
] as const

/**
 * The front door's search box — unframed, so the input itself is the first thing
 * on the page rather than a card wrapped around one.
 *
 * It hands off to the Caută tab (`/legislation/search`), the domain's own
 * citation/name finder. The examples and the placeholder deliberately show
 * only query shapes that tab can answer — act numbers and act names, never a
 * text phrase ("salariul minim" was dropped, "concediu de creștere a
 * copilului" left the placeholder): the corpus is not phrase-searchable yet,
 * and the front door must not advertise a query the finder will refuse.
 */
export function LegislationSearchBand() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmed = query.trim()
    if (trimmed.length === 0) return
    void navigate({
      to: '/legislation/search',
      search: { q: trimmed },
    })
  }

  return (
    <form
      onSubmit={onSubmit}
      aria-label={t`Caută în legislație`}
      className="flex flex-col gap-3"
    >
      <div className="flex min-w-0 gap-0">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className={legislationFieldClassName}
          aria-label={t`Caută în legislație`}
          placeholder={t`Legea 227/2015 · Codul muncii · OUG 57/2019`}
        />
        <Button
          type="submit"
          className={legislationSubmitClassName}
          style={{ backgroundColor: LEGISLATION_ACCENT }}
        >
          <Trans>Caută</Trans>
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-[var(--pnrr-muted)]">
          <Trans>Exemple:</Trans>
        </span>
        {EXAMPLES.map((example) => (
          <button
            key={example}
            type="button"
            onClick={() => setQuery(example)}
            className={legislationExampleChipClassName}
          >
            {example}
          </button>
        ))}
      </div>

    </form>
  )
}
