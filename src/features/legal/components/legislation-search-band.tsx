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
  'Codul Fiscal',
  'OUG 57/2019',
  'Legea 98/2016',
  'salariul minim',
] as const

/**
 * The front door's search box — unframed, so the input itself is the first thing
 * on the page rather than a card wrapped around one.
 *
 * It hands off to the existing global search filtered to `legal_act` rather than
 * to `/legislation/search`, which does not exist yet: the global
 * `searchEntities` query already indexes legal acts, so this works today instead
 * of being inert. Repoint it at the dedicated faceted search (with the citation
 * resolver and semantic channel) when the Caută tab lands.
 */
export function LegislationSearchBand() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmed = query.trim()
    if (trimmed.length === 0) return
    void navigate({
      to: '/experimental/search',
      search: { q: trimmed, types: ['legal_act'] },
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
          placeholder={t`Legea 227/2015 · Codul Muncii · concediu de creștere a copilului`}
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
