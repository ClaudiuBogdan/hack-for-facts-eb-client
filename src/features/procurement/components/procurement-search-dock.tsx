import { useEffect, useState } from 'react'
import { Trans } from '@lingui/react/macro'
import { t } from '@lingui/core/macro'
import { useNavigate } from '@tanstack/react-router'
import { Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { cleanProcurementHubSearch } from '@/schemas/procurement-hub'
import {
  procurementFieldClassName,
  procurementSectionClassName,
  procurementSectionDescriptionClassName,
  procurementSectionTitleClassName,
} from '../lib/procurement-theme'

type Props = {
  /**
   * `inline` — PNRR-style header search (no card chrome).
   * `card` — bordered section used as a standalone body block.
   */
  readonly variant?: 'inline' | 'card'
  readonly className?: string
  /** URL `q` when the hub owns the dock (draft until Enter). */
  readonly value?: string
  /** Commit writes unified hub `q` and switches to list (F2). */
  readonly onCommitQuery?: (q: string | undefined) => void
}

/**
 * Hub search entry — commits into `/procurement?view=list&q=…` (F2).
 * Enter commits; not debounced (route change would yank the reader mid-word).
 */
export function ProcurementSearchDock({
  variant = 'card',
  className,
  value,
  onCommitQuery,
}: Props) {
  const navigate = useNavigate()
  const [draft, setDraft] = useState(value ?? '')

  useEffect(() => {
    setDraft(value ?? '')
  }, [value])

  const commit = () => {
    const q = draft.trim() || undefined
    if (onCommitQuery) {
      onCommitQuery(q)
      return
    }
    void navigate({
      to: '/procurement',
      search: (previous) =>
        cleanProcurementHubSearch({
          ...previous,
          q,
          view: 'list',
        }),
    })
  }

  const form = (
    <form
      role="search"
      className={cn(variant === 'inline' ? 'w-full max-w-[520px]' : 'mt-4', className)}
      onSubmit={(event) => {
        event.preventDefault()
        commit()
      }}
    >
      <div className="relative min-w-0">
        <Search
          aria-hidden
          className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--pnrr-muted)]"
        />
        <input
          id="procurement-hub-search"
          type="search"
          inputMode="search"
          autoComplete="off"
          className={cn(
            procurementFieldClassName,
            'h-12 w-full px-11 text-base font-bold placeholder:font-normal',
          )}
          placeholder={t`e.g. hospital, 4267117, road repairs`}
          aria-label={t`Search procurement records`}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
        />
      </div>
      {variant === 'card' ? (
        <p className="mt-2 text-sm text-[var(--pnrr-muted)]">
          <Trans>Press Enter to search</Trans>
        </p>
      ) : null}
    </form>
  )

  if (variant === 'inline') {
    return form
  }

  return (
    <section className={cn(procurementSectionClassName, 'p-5 sm:p-6')}>
      <h2 className={procurementSectionTitleClassName}>
        <Trans>Search public procurement</Trans>
      </h2>
      <p className={procurementSectionDescriptionClassName}>
        <Trans>
          Find procedures, contracts and direct acquisitions by title, number,
          CUI or party name.
        </Trans>
      </p>
      {form}
    </section>
  )
}
